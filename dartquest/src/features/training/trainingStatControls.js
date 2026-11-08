import { trainingStorage } from './freeTrainingSession'
import { supabase } from '../../lib/supabase'
const markerKey = userId => `dartquest-training-reset-markers-${userId ?? 'guest'}`
const customKey = userId => `dartquest-custom-training-${userId ?? 'guest'}-history`
const standardKey = userId => `dartquest-training-sessions-${userId ?? 'guest'}`
function read(key, fallback) { try { return JSON.parse(trainingStorage().getItem(key)) ?? fallback } catch { return fallback } }
const gameOf = (row, category) => category === 'custom' ? row.game : row.plan?.[0]?.id
export async function applyTrainingResets(userId, category, local, remote) {
  const { data, error } = await supabase.from('training_stat_resets').select('game,reset_at').eq('user_id',userId).eq('category',category)
  if (error) throw new Error('Statistik-Stand konnte nicht abgeglichen werden.')
  const seen = read(markerKey(userId), {})
  const resets = new Map((data ?? []).map(row => [row.game, Date.parse(row.reset_at)]))
  const safeLocal = local.filter(row => {
    const game = gameOf(row,category), cutoff = resets.get(game)
    return !cutoff || (seen[`${category}:${game}`] === cutoff && Date.parse(row.created_at) > cutoff)
  })
  const safeRemote = remote.filter(row => !resets.get(gameOf(row,category)) || Date.parse(row.created_at) > resets.get(gameOf(row,category)))
  resets.forEach((time,game) => { seen[`${category}:${game}`] = time })
  trainingStorage().setItem(markerKey(userId), JSON.stringify(seen))
  return [...new Map([...safeLocal,...safeRemote].map(row => [row.id,row])).values()].sort((a,b) => b.created_at.localeCompare(a.created_at))
}
export async function resetTrainingStatistics(userId, category, game) {
  let resetAt = new Date().toISOString()
  if (userId) {
    const { data,error } = await supabase.rpc('reset_training_statistics',{p_category:category,p_game:game})
    if (error) throw new Error('Statistik konnte nicht zurückgesetzt werden. Bitte prüfe deine Verbindung.')
    resetAt = data
  }
  const key = category === 'custom' ? customKey(userId) : standardKey(userId)
  trainingStorage().setItem(key,JSON.stringify(read(key,[]).filter(row => gameOf(row,category) !== game)))
  const seen = read(markerKey(userId),{})
  seen[`${category}:${game}`] = Date.parse(resetAt)
  trainingStorage().setItem(markerKey(userId),JSON.stringify(seen))
  window.dispatchEvent(new Event('dartquest-training-statistics-reset'))
}
export async function loadTrainingSharing(userId, game) {
  const {data,error} = await supabase.from('training_friend_sharing').select('enabled').eq('user_id',userId).eq('game',game).maybeSingle()
  if(error) throw new Error('Freigabe konnte nicht geladen werden.')
  return Boolean(data?.enabled)
}
export async function setTrainingSharing(userId, game, enabled) {
  const {error} = await supabase.from('training_friend_sharing').upsert({user_id:userId,game,enabled},{onConflict:'user_id,game'})
  if(error) throw new Error('Freigabe konnte nicht gespeichert werden.')
}
export async function loadFriendTraining(friendId, game) {
  const rows=[]
  for(let offset=0;;offset+=500){
    const {data,error} = await supabase.rpc('get_friend_training_history',{p_friend:friendId,p_game:game,p_offset:offset})
    if(error) throw new Error('Freundesvergleich konnte nicht geladen werden. Prüfe deine Verbindung und eure Freundschaft.')
    if(!data.sharing) return {sharing:false,rows:[]}
    rows.push(...data.rows)
    if(data.rows.length<500) return {sharing:true,rows}
  }
}
export function filterComparisonRows(rows, game, minutes, route, includeBull) {
  return rows.filter(row => row.game === game && (game === 'around-the-clock' ? Boolean(row.payload.includeBull) === includeBull : row.minutes === minutes) && (game !== 'double-route' || !route || JSON.stringify(row.payload.route) === JSON.stringify(route)))
}
