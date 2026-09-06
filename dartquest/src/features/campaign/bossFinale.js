export function isMultiPhaseBoss(level) {
  return level?.boss === true && Array.isArray(level.bossPhases) && level.bossPhases.some((phase) => phase.type === 'rival501')
}

export function calculateBossFinaleStars(targetDarts) {
  if (targetDarts === 6) return 4
  if (targetDarts <= 9) return 3
  if (targetDarts <= 12) return 2
  return 1
}

export function createBossFinaleResult(phaseOneResult, rivalResult) {
  if (!phaseOneResult || rivalResult?.won !== true) return null
  const targetDarts = phaseOneResult.totalDarts
  return {
    ...phaseOneResult,
    success: true,
    stars: calculateBossFinaleStars(targetDarts),
    darts: targetDarts,
    totalDarts: targetDarts,
    targetDarts,
    targetMisses: Math.max(0, targetDarts - 6),
    targetVisits: phaseOneResult.visits,
    rival501: rivalResult,
  }
}
