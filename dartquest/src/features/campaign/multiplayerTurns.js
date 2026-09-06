export const CAMPAIGN_PLAYER_COLORS = Object.freeze([
  '#42e695',
  '#4da3ff',
  '#ffd34c',
  '#bd7cff',
])

export function getCampaignPlayers(players = [], playerCount = 1) {
  const requestedCount = Math.max(1, Math.min(4, Number(playerCount) || 1))
  const active = Array.isArray(players) ? players.filter((player) => player?.active !== false).slice(0, requestedCount) : []
  return Array.from({ length: requestedCount }, (_, index) => ({
    id: active[index]?.id ?? index,
    name: String(active[index]?.name ?? '').trim() || `Spieler ${active[index]?.id ?? index + 1}`,
    color: active[index]?.color
      ?? CAMPAIGN_PLAYER_COLORS[Math.max(0, Math.min(3, Number(active[index]?.id ?? index + 1) - 1))],
  }))
}

export function nextCampaignPlayerIndex(activePlayerIndex, playerCount) {
  return (activePlayerIndex + 1) % Math.max(1, playerCount)
}

export function shouldRotateCampaignTurn(previousAttempt, nextAttempt) {
  return nextAttempt.totalDarts > previousAttempt.totalDarts && nextAttempt.totalDarts % 3 === 0
}
