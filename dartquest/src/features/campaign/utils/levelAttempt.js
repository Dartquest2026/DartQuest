const FIELD_PATTERN = /(?:S|D|T)\d{1,2}|(?:S|D)?BULL/gi

function positiveInteger(value, fallback = null) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0
    ? Math.round(number)
    : fallback
}

function normalizeField(value) {
  return String(value ?? '').trim().toUpperCase()
}

function makeTarget(value, index = 0) {
  const label = String(value.label ?? value.target ?? value.id ?? `Ziel ${index + 1}`)
  const targetType = value.targetType ?? 'field'
  const number = positiveInteger(value.number)

  return {
    id: String(value.id ?? `${targetType}:${number ?? normalizeField(label)}`),
    label,
    requiredHits: positiveInteger(value.requiredHits ?? value.hits, 1),
    targetType,
    number,
  }
}

function mergeTargets(sequence) {
  const targets = []

  sequence.forEach((entry) => {
    const existing = targets.find((target) => target.id === entry.id)
    if (existing) existing.requiredHits += 1
    else targets.push({ ...entry, requiredHits: 1 })
  })

  return targets
}

function fieldsFromText(text) {
  return [...text.matchAll(FIELD_PATTERN)].map((match) => normalizeField(match[0]))
}

function expandNumberRange(text) {
  const range = text.match(/([SDT])(\d+)\s+bis\s+\1?(\d+)/i)
  if (!range) return null

  const start = Number(range[2])
  const end = Number(range[3])
  const step = start <= end ? 1 : -1
  const fields = []

  for (let number = start; number !== end + step; number += step) {
    fields.push(`${range[1].toUpperCase()}${number}`)
  }

  return fields
}

function parseExplicitTargets(level) {
  if (!Array.isArray(level.targets) || level.targets.length === 0) return null

  const targets = level.targets.map(makeTarget)
  const ordered = level.orderedTargets === true || Array.isArray(level.sequence)
  const sequence = Array.isArray(level.sequence)
    ? level.sequence.map((entry) => {
        const id = typeof entry === 'object' ? makeTarget(entry).id : String(entry)
        return targets.find((target) => target.id === id)?.id ?? id
      })
    : ordered
      ? targets.flatMap((target) => Array(target.requiredHits).fill(target.id))
      : []

  return { targets, ordered, sequence }
}

export function parseLevelTargets(level = {}) {
  level = level ?? {}
  const explicit = parseExplicitTargets(level)
  if (explicit) return explicit

  const text = String(level.task ?? '')
    .replace(/\s+mit(?: maximal)?\s+\d+\s+Darts?$/i, '')
  const repetitions = positiveInteger(text.match(/Absolviert\s+(\d+)\s*[×x]\s+die Folge/i)?.[1], 1)
  const rangeFields = expandNumberRange(text)
  const ordered = level.orderedTargets === true || /\u2192|â†’|danach|der Reihe nach/i.test(text)

  if (ordered) {
    const fields = rangeFields ?? fieldsFromText(text)
    if (fields.length > 0) {
      const baseSequence = fields.map((field) => makeTarget({ id: field, label: field }))
      const sequenceEntries = Array.from({ length: repetitions }, () => baseSequence).flat()
      return {
        targets: mergeTargets(sequenceEntries),
        ordered: true,
        sequence: sequenceEntries.map((target) => target.id),
      }
    }
  }

  const countedTargets = []
  const countedPattern = /(\d+)\s*[×x]\s*((?:S|D|T)\d{1,2}|(?:S|D)?BULL)/gi
  for (const match of text.matchAll(countedPattern)) {
    countedTargets.push(makeTarget({
      id: normalizeField(match[2]),
      label: normalizeField(match[2]),
      requiredHits: Number(match[1]),
    }))
  }

  if (countedTargets.length > 0) return { targets: countedTargets, ordered: false, sequence: [] }

  const fields = fieldsFromText(text)
  if (fields.length > 0) {
    const uniqueFields = [...new Set(fields)]
    const totalHits = positiveInteger(level.targetHits, fields.length)
    const perField = uniqueFields.length === 1 ? totalHits : 1
    return {
      targets: uniqueFields.map((field) => makeTarget({ id: field, label: field, requiredHits: perField })),
      ordered: false,
      sequence: [],
    }
  }

  const wildcard = text.match(/(\d+)?\s*(Doppel|Triple|Singles?)(?:\s+deiner Wahl|\s+aus\s+([^,.]+))?/i)
  if (wildcard) {
    const type = wildcard[2].toLowerCase()
    const label = wildcard[3] ? `${wildcard[2]} ${wildcard[3]}` : wildcard[2]
    return {
      targets: [makeTarget({
        id: `group:${type}`,
        label,
        requiredHits: positiveInteger(wildcard[1], positiveInteger(level.targetHits, 1)),
        targetType: type,
      })],
      ordered: false,
      sequence: [],
    }
  }

  return {
    targets: [makeTarget({ id: 'task', label: 'Aufgabe geschafft', targetType: 'task' })],
    ordered: false,
    sequence: [],
  }
}

export function createLevelAttempt(level, startedAt = Date.now()) {
  const parsed = parseLevelTargets(level)
  return {
    ...parsed,
    hitCounters: Object.fromEntries(parsed.targets.map((target) => [target.id, 0])),
    darts: [],
    totalDarts: 0,
    sequenceIndex: 0,
    startedAt,
    playerId: null,
  }
}

export function registerDart(attempt, targetId = null) {
  if (targetId) {
    const target = attempt.targets.find((entry) => entry.id === targetId)
    const expected = attempt.sequence[attempt.sequenceIndex]
    if (!target || attempt.hitCounters[targetId] >= target.requiredHits) return attempt
    if (attempt.ordered && expected !== targetId) return attempt
  }

  return {
    ...attempt,
    hitCounters: targetId
      ? { ...attempt.hitCounters, [targetId]: attempt.hitCounters[targetId] + 1 }
      : attempt.hitCounters,
    darts: [...attempt.darts, { targetId, playerId: attempt.playerId }],
    totalDarts: attempt.totalDarts + 1,
    sequenceIndex: attempt.sequenceIndex + (targetId && attempt.ordered ? 1 : 0),
  }
}

export function undoTargetHit(attempt, targetId) {
  const index = attempt.darts.findLastIndex((dart) => dart.targetId === targetId)
  if (index < 0) return attempt

  if (attempt.ordered) {
    const lastHit = attempt.darts.findLast((dart) => dart.targetId)
    if (lastHit?.targetId !== targetId) return attempt
  }

  const darts = attempt.darts.filter((_, dartIndex) => dartIndex !== index)
  return {
    ...attempt,
    hitCounters: { ...attempt.hitCounters, [targetId]: attempt.hitCounters[targetId] - 1 },
    darts,
    totalDarts: darts.length,
    sequenceIndex: attempt.sequenceIndex - (attempt.ordered ? 1 : 0),
  }
}

export function isAttemptComplete(attempt) {
  return attempt.targets.every(
    (target) => attempt.hitCounters[target.id] >= target.requiredHits,
  ) && (!attempt.ordered || attempt.sequenceIndex >= attempt.sequence.length)
}

export function getVisitState(totalDarts) {
  return {
    visit: Math.floor(totalDarts / 3) + 1,
    dartsInCurrentVisit: totalDarts % 3,
  }
}

export function calculateLevelStars(level, totalDarts) {
  const minimumDarts = positiveInteger(level.targetHits, 1)
  if (totalDarts === minimumDarts) return 4
  if (totalDarts <= minimumDarts * 3) return 3
  if (totalDarts <= minimumDarts * 6) return 2
  return 1
}

export function createAttemptResult(level, attempt, completedAt = Date.now()) {
  const stars = calculateLevelStars(level, attempt.totalDarts)
  return {
    success: true,
    stars,
    darts: attempt.totalDarts,
    totalDarts: attempt.totalDarts,
    visits: Math.ceil(attempt.totalDarts / 3),
    hitCounters: { ...attempt.hitCounters },
    startedAt: new Date(attempt.startedAt).toISOString(),
    completedAt: new Date(completedAt).toISOString(),
    durationMs: Math.max(0, completedAt - attempt.startedAt),
    xp: level.rewardXP ?? 0,
    coins: level.rewardCoins ?? 0,
  }
}

export function createAbandonedResult(level, attempt, completedAt = Date.now()) {
  return {
    ...createAttemptResult(level, attempt, completedAt),
    success: false,
    stars: 0,
    xp: 0,
    coins: 0,
  }
}
