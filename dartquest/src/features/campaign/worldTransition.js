export function getAutomaticWorldTransition({
  level,
  successfulAttempt,
  firstCompletion,
  previousUnlockedLevel,
  unlockedLevel,
  totalLevels,
  totalWorlds,
}) {
  const sourceWorld = Math.ceil((level?.id ?? 0) / 10)
  const targetWorld = Math.ceil((unlockedLevel ?? 0) / 10)

  if (
    level?.boss !== true
    || successfulAttempt !== true
    || firstCompletion !== true
    || !Number.isInteger(unlockedLevel)
    || unlockedLevel <= previousUnlockedLevel
    || unlockedLevel > totalLevels
    || targetWorld <= sourceWorld
    || targetWorld > totalWorlds
  ) {
    return null
  }

  return { targetLevelId: unlockedLevel, targetWorld }
}
