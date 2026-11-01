import { supabase } from '../../lib/supabase'

const LOCAL_KEY = 'dartquest-training-sessions'
const ACTIVE_KEY = 'dartquest-active-training-session'

function readLocal(userId) {
  try { return JSON.parse(localStorage.getItem(`${LOCAL_KEY}-${userId ?? 'guest'}`) ?? '[]') }
  catch { return [] }
}

export async function saveTrainingSession(userId, session) {
  const sessionId = session.id ?? crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const record = { id:sessionId, user_id:userId ?? null, created_at:createdAt, mode:session.mode, plan:session.plan, player_results:session.playerResults, total_score:session.totalScore, max_score:session.maxScore, percentage:session.percentage }
  const local=[record,...readLocal(userId).filter(item=>item.id!==sessionId)].slice(0,100)
  localStorage.setItem(`${LOCAL_KEY}-${userId ?? 'guest'}`, JSON.stringify(local))
  if (!userId) return { saved:'local', record }
  const { error } = await supabase.from('training_sessions').upsert(record,{onConflict:'id'})
  return { saved:error ? 'local' : 'cloud', record, error:error?.message ?? null }
}

const activeKey=userId=>`${ACTIVE_KEY}-${userId ?? 'guest'}`

export function saveActiveTrainingSession(userId,session){
  const record={...session,version:1,updatedAt:new Date().toISOString()}
  localStorage.setItem(activeKey(userId),JSON.stringify(record))
  return record
}

export function loadActiveTrainingSession(userId){
  try{const value=JSON.parse(localStorage.getItem(activeKey(userId))??'null');return value?.version===1&&Array.isArray(value.plan)&&value.plan.length?value:null}catch{return null}
}

export function clearActiveTrainingSession(userId){localStorage.removeItem(activeKey(userId))}

export function loadLocalTrainingSessions(userId) {
  return readLocal(userId)
}

export async function loadTrainingSessions(userId) {
  const local = readLocal(userId)
  if (!userId) return local
  const { data, error } = await supabase.from('training_sessions').select('*').eq('user_id', userId).eq('mode', 'solo').order('created_at', { ascending:false }).limit(500)
  if (error) return local
  const merged = new Map([...local, ...(data ?? [])].map((row) => [row.id, row]))
  return [...merged.values()].sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)))
}
