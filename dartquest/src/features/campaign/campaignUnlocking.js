export function isLevelCompleted(results, levelId) {
  return (results?.[levelId]?.stars ?? 0) >= 1
}

export function areAllLevelsCompleted(levels, results) {
  return levels.every((level) => isLevelCompleted(results, level.id))
}

export function isBossUnlocked({ normalLevels, results, worldStars, requiredStars }) {
  return (
    areAllLevelsCompleted(normalLevels, results) &&
    worldStars >= requiredStars
  )
}

export function isNormalLevelUnlocked(level, results) {
  if (!level) return false
  if (level.id === 1 || isLevelCompleted(results, level.id)) return true

  return isLevelCompleted(results, level.id - 1)
}
