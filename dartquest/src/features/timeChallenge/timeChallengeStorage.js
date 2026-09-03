import { supabase } from '../../lib/supabase'
import { summarizeAttempts } from './timeChallenges'

const LOCAL_KEY = 'dartquest-time-challenge-attempts'
function localAttempts(userId) { try { return JSON.parse(localStorage.getItem(`${LOCAL_KEY}-${userId}`) ?? '[]') } catch { return [] } }
function saveLocal(userId, attempts) { localStorage.setItem(`${LOCAL_KEY}-${userId}`, JSON.stringify(attempts)) }

export async function loadTimeChallengeStats(userId) {
  const local = localAttempts(userId ?? 'guest')
  if (!userId) return summarizeAttempts(local)
  const pending = local.filter((item) => item.pendingSync)
  let unsynced = pending
  if (pending.length) {
    const rows = pending.map(({ user_id, challenge_id, target_time_ms, elapsed_time_ms, completed_at }) => ({ user_id, challenge_id, target_time_ms, elapsed_time_ms, completed_at }))
    const { error: syncError } = await supabase.from('time_challenge_attempts').insert(rows)
    if (!syncError) { saveLocal(userId, local.filter((item) => !item.pendingSync)); unsynced = [] }
  }
  const { data, error } = await supabase.from('time_challenge_attempts').select('id, challenge_id, target_time_ms, elapsed_time_ms, completed_at').eq('user_id', userId).order('completed_at', { ascending:false })
  if (error) return summarizeAttempts(local)
  return summarizeAttempts([...unsynced, ...(data ?? [])])
}

export async function saveTimeChallengeAttempt(userId, attempt) {
  const record = { user_id:userId, challenge_id:attempt.challengeId, target_time_ms:attempt.targetTimeMs, elapsed_time_ms:attempt.elapsedTimeMs, completed_at:new Date(attempt.completedAt).toISOString() }
  if (userId) {
    const { error } = await supabase.from('time_challenge_attempts').insert(record)
    if (!error) return { saved:true, record }
  }
  const pending = { ...record, id:`local-${crypto.randomUUID()}`, pendingSync:true }
  saveLocal(userId ?? 'guest', [pending, ...localAttempts(userId ?? 'guest')])
  return { saved:false, record:pending }
}
