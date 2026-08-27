export function percentage(numerator, denominator) {
  return denominator > 0 ? (numerator / denominator) * 100 : null
}

export function formatDecimal(value) {
  return value == null ? '–' : value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function starsSummary(player) {
  if (!player.completedLevels) return '–'
  const maximum = player.completedLevels * 4
  return `★ ${player.earnedStars ?? 0} / ${maximum} · ${formatDecimal(percentage(player.earnedStars ?? 0, maximum))} %`
}
