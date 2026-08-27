export function getNextStandardLevelId(completedLevelId, totalLevels, successfulAttempt) {
  if (!successfulAttempt || !Number.isInteger(completedLevelId) || !Number.isInteger(totalLevels)) return null
  const nextLevelId = completedLevelId + 1
  return nextLevelId <= totalLevels ? nextLevelId : null
}
