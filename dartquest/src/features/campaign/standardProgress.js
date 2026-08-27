export function standardProgressRows(results = {}) {
  return Object.entries(results).flatMap(([levelId, result]) => {
    const level = Number(levelId)
    const stars = Number(result?.stars)
    if (!Number.isInteger(level) || level < 1 || !Number.isInteger(stars) || stars < 1 || stars > 4) return []
    const darts = Number(result?.darts)
    return [{ level_id: level, stars, best_darts: Number.isInteger(darts) && darts > 0 ? darts : null, first_completed_at: result?.completedAt ?? null }]
  })
}
