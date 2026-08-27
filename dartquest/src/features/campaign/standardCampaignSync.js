import { supabase } from '../../lib/supabase.js'
import { standardProgressRows } from './standardProgress.js'

export async function syncStandardCampaignProgress(difficulty, results) {
  const rows = standardProgressRows(results)
  if (!rows.length) return { syncedLevels: 0 }
  const { data, error } = await supabase.rpc('sync_standard_campaign_progress', { p_difficulty: difficulty, p_rows: rows })
  if (error) throw new Error('Der Standard-Kampagnenfortschritt konnte nicht synchronisiert werden.')
  return { syncedLevels: Number(data) || rows.length }
}
