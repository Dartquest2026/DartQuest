import { supabase } from '../../lib/supabase'

export const GLOBAL_LEADERBOARD_PAGE_SIZE = 50

export async function loadGlobalLeaderboardPage(cursor = null) {
  const { data, error } = await supabase.rpc('get_global_leaderboard', {
    page_size: GLOBAL_LEADERBOARD_PAGE_SIZE + 1,
    cursor_xp: cursor?.xp ?? null,
    cursor_player_level: cursor?.playerLevel ?? null,
    cursor_id: cursor?.profileId ?? null,
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
    profileId: row.id,
    name: row.profile_name,
    xp: Number(row.xp) || 0,
    playerLevel: Number(row.player_level) || 1,
    avatarPath: row.avatar_path ?? null,
  }))
  const lastPlayer = players.at(-1)

  return {
    players,
    hasMore,
    nextCursor: hasMore && lastPlayer ? lastPlayer : null,
  }
}
