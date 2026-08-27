import { supabase } from '../../lib/supabase'

export const GLOBAL_LEADERBOARD_PAGE_SIZE = 50

export async function loadGlobalLeaderboardPage(mode = 'xp', offset = 0) {
  const { data, error } = await supabase.rpc('get_campaign_leaderboard', {
    leaderboard_mode: mode,
    page_size: GLOBAL_LEADERBOARD_PAGE_SIZE + 1,
    page_offset: offset,
  })

  if (error) {
    const message = String(error.message ?? '').toLowerCase()
    if (message.includes('fetch') || message.includes('network')) {
      throw new Error('Netzwerkfehler. Bitte prüfe deine Internetverbindung.')
    }
    throw new Error('Die globale Rangliste konnte nicht geladen werden.')
  }

  const rows = data ?? []
  const hasMore = rows.length > GLOBAL_LEADERBOARD_PAGE_SIZE
  const players = rows.slice(0, GLOBAL_LEADERBOARD_PAGE_SIZE).map((row) => ({
    rank: Number(row.rank),
    profileId: row.id,
    name: row.profile_name,
    xp: Number(row.xp) || 0,
    playerLevel: Number(row.player_level) || 1,
    avatarPath: row.avatar_path ?? null,
    completedLevels: row.completed_levels == null ? null : Number(row.completed_levels),
    earnedStars: row.earned_stars == null ? null : Number(row.earned_stars),
    bestAverage: row.best_average == null ? null : Number(row.best_average),
    score180: row.score_180_count == null ? null : Number(row.score_180_count),
    score140: row.score_140_count == null ? null : Number(row.score_140_count),
    score100: row.score_100_count == null ? null : Number(row.score_100_count),
    checkoutDarts: row.checkout_darts == null ? null : Number(row.checkout_darts),
    successfulCheckouts: row.successful_checkouts == null ? null : Number(row.successful_checkouts),
    globalCheckoutDarts: Number(row.global_checkout_darts) || 0,
    globalSuccessfulCheckouts: Number(row.global_successful_checkouts) || 0,
  }))

  return {
    players,
    hasMore,
    nextOffset: hasMore ? offset + GLOBAL_LEADERBOARD_PAGE_SIZE : null,
  }
}
