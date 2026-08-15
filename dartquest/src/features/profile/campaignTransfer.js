import { difficultyLevels } from '../campaign/data/levels.js'

const CODE_PREFIX = 'DQ1-'
const FORMAT_VERSION = 1
const MAX_CODE_LENGTH = 120000
const MAX_RECORDS = 500
const STORAGE_PREFIX = 'dartquest-campaign-progress-singleplayer-difficulty-'
const ACCOUNT_HASH_CONTEXT = 'dartquest-transfer-account-v1:'

function bytesToBase64Url(bytes) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Der Transfercode enthält ungültige Zeichen.')
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  let binary
  try {
    binary = atob(padded)
  } catch {
    throw new Error('Der Transfercode konnte nicht gelesen werden.')
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function digest(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
}

async function accountBinding(accountId) {
  if (!accountId) throw new Error('Für den Transfer ist ein angemeldetes Profil erforderlich.')
  return bytesToBase64Url((await digest(ACCOUNT_HASH_CONTEXT + accountId)).slice(0, 12))
}

function storageKey(difficulty) {
  return `${STORAGE_PREFIX}${difficulty}`
}

function validTimestamp(value) {
  if (value == null || value === '') return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function readLocalProgress(difficulty, storage) {
  try {
    const parsed = JSON.parse(storage.getItem(storageKey(difficulty)))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function exportRecords(difficulty, storage) {
  const progress = readLocalProgress(difficulty, storage)
  const levelCount = difficultyLevels[difficulty].length
  return Object.entries(progress.results ?? {})
    .map(([levelId, result]) => {
      const level = Number(levelId)
      const stars = Number(result?.stars)
      const darts = result?.darts == null ? null : Number(result.darts)
      if (!Number.isInteger(level) || level < 1 || level > levelCount) return null
      if (!Number.isInteger(stars) || stars < 1 || stars > 4) return null
      if (darts != null && (!Number.isInteger(darts) || darts <= 0)) return null
      return [level, stars, darts, validTimestamp(result?.completedAt)]
    })
    .filter(Boolean)
    .sort((left, right) => left[0] - right[0])
}

export async function createCampaignTransferCode(accountId, storage = localStorage) {
  const payload = {
    v: FORMAT_VERSION,
    a: await accountBinding(accountId),
    d: Object.fromEntries(
      Object.keys(difficultyLevels).map((difficulty) => [
        difficulty,
        exportRecords(Number(difficulty), storage),
      ]),
    ),
  }
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
  const encodedPayload = bytesToBase64Url(payloadBytes)
  const checksum = bytesToBase64Url((await digest(payloadBytes)).slice(0, 12))
  return `${CODE_PREFIX}${encodedPayload}.${checksum}`
}

function validateRecord(record, difficulty) {
  if (!Array.isArray(record) || record.length !== 4) throw new Error('Der Transfercode enthält ungültige Leveldaten.')
  const [level, stars, darts, completedAt] = record
  const levelCount = difficultyLevels[difficulty].length
  if (!Number.isInteger(level) || level < 1 || level > levelCount) throw new Error('Der Transfercode enthält eine ungültige Levelnummer.')
  if (!Number.isInteger(stars) || stars < 1 || stars > 4) throw new Error('Der Transfercode enthält eine ungültige Sternezahl.')
  if (darts != null && (!Number.isInteger(darts) || darts <= 0)) throw new Error('Der Transfercode enthält einen ungültigen Darts-Bestwert.')
  if (completedAt != null && validTimestamp(completedAt) == null) throw new Error('Der Transfercode enthält einen ungültigen Abschlusszeitpunkt.')
  return { level, stars, darts, completedAt: validTimestamp(completedAt) }
}

async function decodeCode(code, accountId) {
  const normalized = String(code ?? '').trim()
  if (!normalized.startsWith(CODE_PREFIX)) throw new Error('Unbekanntes Transfercode-Format.')
  if (normalized.length > MAX_CODE_LENGTH) throw new Error('Der Transfercode ist zu groß.')
  const parts = normalized.slice(CODE_PREFIX.length).split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Der Transfercode ist unvollständig.')
  const payloadBytes = base64UrlToBytes(parts[0])
  const expectedChecksum = bytesToBase64Url((await digest(payloadBytes)).slice(0, 12))
  if (expectedChecksum !== parts[1]) throw new Error('Der Transfercode ist beschädigt oder wurde falsch kopiert.')

  let payload
  try {
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payloadBytes))
  } catch {
    throw new Error('Der Transfercode enthält keine gültigen Daten.')
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.v !== FORMAT_VERSION) {
    throw new Error('Diese Transfercode-Version wird nicht unterstützt.')
  }
  if (payload.a !== await accountBinding(accountId)) {
    throw new Error('Dieser Transfercode gehört zu einem anderen Account.')
  }
  if (!payload.d || typeof payload.d !== 'object' || Array.isArray(payload.d)) {
    throw new Error('Der Transfercode enthält keinen Kampagnenfortschritt.')
  }
  const allowedKeys = new Set(Object.keys(difficultyLevels))
  if (Object.keys(payload.d).some((key) => !allowedKeys.has(key))) {
    throw new Error('Der Transfercode enthält einen ungültigen Schwierigkeitsgrad.')
  }

  let recordCount = 0
  const difficulties = {}
  for (const difficulty of Object.keys(difficultyLevels).map(Number)) {
    const records = payload.d[difficulty] ?? []
    if (!Array.isArray(records)) throw new Error('Der Transfercode enthält ungültige Fortschrittsdaten.')
    recordCount += records.length
    if (recordCount > MAX_RECORDS) throw new Error('Der Transfercode enthält zu viele Leveldaten.')
    const seen = new Set()
    difficulties[difficulty] = records.map((record) => {
      const validated = validateRecord(record, difficulty)
      if (seen.has(validated.level)) throw new Error('Ein Level ist im Transfercode mehrfach enthalten.')
      seen.add(validated.level)
      return validated
    })
  }
  return difficulties
}

function earlierTimestamp(current, imported) {
  const currentValue = validTimestamp(current)
  if (!currentValue) return imported
  if (!imported) return currentValue
  return Date.parse(currentValue) <= Date.parse(imported) ? currentValue : imported
}

function mergeDifficulty(difficulty, imported, storage, write) {
  const current = readLocalProgress(difficulty, storage)
  const results = { ...(current.results ?? {}) }
  let added = 0
  let improved = 0

  for (const record of imported) {
    const existing = results[record.level]
    const existingStars = Number(existing?.stars) || 0
    const existingDarts = existing?.darts == null ? null : Number(existing.darts)
    const stars = Math.max(existingStars, record.stars)
    const darts = existingDarts == null
      ? record.darts
      : record.darts == null
        ? existingDarts
        : Math.min(existingDarts, record.darts)
    const completedAt = earlierTimestamp(existing?.completedAt, record.completedAt)
    if (!existing || existingStars < 1) added += 1
    else if (
      stars > existingStars
      || (darts != null && (existingDarts == null || darts < existingDarts))
      || completedAt !== validTimestamp(existing?.completedAt)
    ) improved += 1
    results[record.level] = {
      ...(existing ?? {}),
      success: true,
      stars,
      darts,
      totalDarts: darts,
      completedAt,
    }
  }

  const highestCompleted = Object.entries(results).reduce((highest, [levelId, result]) => (
    Number(result?.stars) >= 1 ? Math.max(highest, Number(levelId) || 0) : highest
  ), 0)
  const merged = {
    ...current,
    unlockedLevel: Math.min(Math.max(highestCompleted + 1, 1), difficultyLevels[difficulty].length),
    results,
    xp: Number(current.xp) || 0,
    coins: Number(current.coins) || 0,
  }
  if (write) storage.setItem(storageKey(difficulty), JSON.stringify(merged))
  return { added, improved }
}

export async function previewCampaignTransfer(code, accountId, storage = localStorage) {
  const difficulties = await decodeCode(code, accountId)
  const summary = Object.entries(difficulties).reduce((total, [difficulty, records]) => {
    const result = mergeDifficulty(Number(difficulty), records, storage, false)
    return { added: total.added + result.added, improved: total.improved + result.improved }
  }, { added: 0, improved: 0 })
  return { difficulties, ...summary }
}

export function importCampaignTransfer(preview, storage = localStorage) {
  if (!preview?.difficulties) throw new Error('Der Transfercode muss zuerst geprüft werden.')
  const summary = Object.entries(preview.difficulties).reduce((total, [difficulty, records]) => {
    const result = mergeDifficulty(Number(difficulty), records, storage, true)
    return { added: total.added + result.added, improved: total.improved + result.improved }
  }, { added: 0, improved: 0 })
  window.dispatchEvent(new CustomEvent('dartquest:campaign-progress-imported'))
  return summary
}

export const campaignTransferLimits = {
  maxCodeLength: MAX_CODE_LENGTH,
  maxRecords: MAX_RECORDS,
}
