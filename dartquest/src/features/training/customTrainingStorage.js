import { supabase } from '../../lib/supabase'

const key = (userId, suffix) => `dartquest-custom-training-${userId ?? 'guest'}-${suffix}`
function read(userId, suffix, fallback) {
  try { return JSON.parse(localStorage.getItem(key(userId, suffix))) ?? fallback } catch { return fallback }
}
export const loadCustomRun = userId => read(userId, 'active', null)
export const saveCustomRun = (userId, run) => localStorage.setItem(key(userId, 'active'), JSON.stringify(run))
export const clearCustomRun = userId => localStorage.removeItem(key(userId, 'active'))
export const localCustomHistory = userId => read(userId, 'history', [])
function storeRecord(userId, record) {
  const rows = [record, ...localCustomHistory(userId).filter(r => r.id !== record.id)]
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
  localStorage.setItem(key(userId, 'history'), JSON.stringify(rows))
  return record
}
export async function startCustomRun(userId, game, minutes, options = {}) {
  const id = crypto.randomUUID()
  let startedAt = Date.now(), endAt = startedAt + minutes * 60000
  if (userId) {
    const { data, error } = await supabase.rpc('start_custom_training', { p_id: id, p_game: game, p_minutes: minutes })
    if (error) throw new Error('Training konnte nicht gestartet werden. Bitte prüfe deine Verbindung. ' + error.message)
    startedAt = Date.parse(data.started_at); endAt = Date.parse(data.end_at)
  }
  const run = { id, game, minutes, startedAt, endAt, doubleBull: 0, singleBull: 0, entries: [], score: '', choosing: false, phase: 'playing', favoriteDouble: 16, route: options.route ?? [16, 8, 4], routeThrows: [] }
  saveCustomRun(userId, run)
  return run
}
export async function completeCustomRun(userId, run) {
  // A stable session ID prevents duplicate results when a request is retried.
  if (userId) {
    const { data, error } = await supabase.rpc('complete_custom_training', { p_id: run.id, p_payload: run })
    if (error) throw new Error('Ergebnis bleibt gespeichert. Synchronisierung erneut versuchen. ' + error.message)
    storeRecord(userId, data)
    return data
  }
  return storeRecord(userId, { id: run.id, game: run.game, minutes: run.minutes, created_at: new Date(run.endAt).toISOString(), payload: run, status: 'completed' })
}
export async function loadCustomHistory(userId) {
  const local = localCustomHistory(userId)
  if (!userId) return { rows: local, offline: false }
  const remote = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('custom_training_sessions').select('*').eq('user_id', userId).eq('status', 'completed').order('created_at', { ascending: false }).order('id').range(offset, offset + 499)
    if (error) return { rows: local, offline: true }
    remote.push(...data)
    if (data.length < 500) break
  }
  const rows = [...new Map([...local, ...remote].map(r => [r.id, r])).values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
  localStorage.setItem(key(userId, 'history'), JSON.stringify(rows))
  return { rows, offline: false }
}
