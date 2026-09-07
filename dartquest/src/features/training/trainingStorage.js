import { supabase } from '../../lib/supabase'

const LOCAL_KEY = 'dartquest-training-sessions'

function readLocal(userId) {
  try { return JSON.parse(localStorage.getItem(`${LOCAL_KEY}-${userId ?? 'guest'}`) ?? '[]') }
  catch { return [] }
}

export async function saveTrainingSession(userId, session) {
  const sessionId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const record = { id:sessionId, user_id:userId ?? null, created_at:createdAt, mode:session.mode, plan:session.plan, player_results:session.playerResults, total_score:session.totalScore, max_score:session.maxScore, percentage:session.percentage }
  localStorage.setItem(`${LOCAL_KEY}-${userId ?? 'guest'}`, JSON.stringify([record, ...readLocal(userId)].slice(0, 100)))
  if (!userId) return { saved:'local', record }
  const { error } = await supabase.from('training_sessions').insert(record)
  return { saved:error ? 'local' : 'cloud', record, error:error?.message ?? null }
}

export function loadLocalTrainingSessions(userId) {
  return readLocal(userId)
}
