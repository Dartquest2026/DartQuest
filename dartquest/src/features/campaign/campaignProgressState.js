export function mapCampaignProgressRow(row) {
  return {
    levelId: Number(row.level_id ?? row.progress_level_id),
    stars: Number(row.stars ?? row.progress_stars),
    bestDarts: row.best_darts ?? row.progress_best_darts ?? null,
    firstCompletedAt: row.first_completed_at ?? row.progress_first_completed_at,
    updatedAt: row.updated_at ?? row.progress_updated_at,
  }
}

export function buildCampaignProgress(rows, levelCount) {
  const results = {}
  let highestCompletedLevel = 0

  for (const row of rows ?? []) {
    const progress = mapCampaignProgressRow(row)
    if (!Number.isInteger(progress.levelId) || progress.levelId < 1 || progress.levelId > levelCount) continue
    if (!Number.isInteger(progress.stars) || progress.stars < 1 || progress.stars > 4) continue
    highestCompletedLevel = Math.max(highestCompletedLevel, progress.levelId)
    results[progress.levelId] = {
      success: true,
      stars: progress.stars,
      darts: progress.bestDarts,
      totalDarts: progress.bestDarts,
      completedAt: progress.firstCompletedAt,
      updatedAt: progress.updatedAt,
    }
  }

  return {
    unlockedLevel: Math.min(Math.max(highestCompletedLevel + 1, 1), levelCount),
    results,
    xp: 0,
    coins: 0,
  }
}
