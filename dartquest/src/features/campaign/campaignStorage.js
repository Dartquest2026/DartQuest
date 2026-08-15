import { supabase } from '../../lib/supabase'
import { buildCampaignProgress, mapCampaignProgressRow } from './campaignProgressState'

export { buildCampaignProgress }

function storageError(error, fallback) {
  if (error?.message) return new Error(error.message)
  return new Error(fallback)
}

export async function loadCampaignProgress(difficulty) {
  const { data, error } = await supabase
    .from('campaign_progress')
    .select('user_id, difficulty, level_id, stars, best_darts, first_completed_at, updated_at')
    .eq('difficulty', difficulty)
    .order('level_id')

  if (error) throw storageError(error, 'Kampagnenfortschritt konnte nicht geladen werden.')
  return (data ?? []).map(mapCampaignProgressRow)
}

export async function completeCampaignLevel({
  completionId,
  difficulty,
  levelId,
  stars,
  bestDarts,
}) {
  const { data, error } = await supabase.rpc('complete_campaign_level', {
    p_completion_id: completionId,
    p_difficulty: difficulty,
    p_level_id: levelId,
    p_stars: stars,
    p_best_darts: bestDarts,
  })

  if (error) throw storageError(error, 'Levelabschluss konnte nicht gespeichert werden.')
  const row = data?.[0]
  if (!row) throw new Error('Levelabschluss wurde von Supabase nicht bestätigt.')

  return {
    progress: mapCampaignProgressRow(row),
    profile: {
      xp: Number(row.profile_xp) || 0,
      coins: Number(row.profile_coins) || 0,
      playerLevel: Number(row.profile_player_level) || 1,
    },
    rewardApplied: row.reward_applied === true,
    awardedXP: Number(row.awarded_xp) || 0,
    awardedCoins: Number(row.awarded_coins) || 0,
  }
}

export async function resetCampaignProgress(difficulty) {
  const { error } = await supabase.rpc('reset_own_campaign_progress', {
    p_difficulty: difficulty ?? null,
  })
  if (error) throw storageError(error, 'Kampagnenfortschritt konnte nicht zurückgesetzt werden.')
}
