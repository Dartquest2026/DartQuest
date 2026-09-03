import { DARTBOARD_HIT_VALUES } from '../campaignModes/rivalEngine.js'

export function getScoreTaskMinimumDarts(targetScore, comparison = 'atLeast') {
  const target = Number(targetScore)
  if (!Number.isInteger(target) || target < 0) return null
  let reachable = new Set([0])
  for (let darts = 1; darts <= Math.max(3, Math.ceil(target / 60) + 2); darts += 1) {
    reachable = new Set([...reachable].flatMap((subtotal) => DARTBOARD_HIT_VALUES.map((hit) => subtotal + hit)))
    if ([...reachable].some((score) => comparison === 'exact' ? score === target : score >= target)) return darts
  }
  return null
}

export function getScoreTaskStars({ targetScore, comparison = 'atLeast', totalDarts, visits, scoreGoal, requiredScoringVisits = 1 }) {
  const singleTargetMinimum = getScoreTaskMinimumDarts(targetScore, comparison)
  const minimumDarts = scoreGoal === 'repeatedVisit' ? singleTargetMinimum * requiredScoringVisits : singleTargetMinimum
  if (minimumDarts == null || totalDarts < minimumDarts || visits < 1) return 0
  const minimumVisits = Math.ceil(minimumDarts / 3)
  if (totalDarts === minimumDarts && visits === minimumVisits) return 4
  if (minimumDarts % 3 !== 0) {
    if (visits === minimumVisits) return 3
    if (visits === minimumVisits + 1) return 2
    return 1
  }
  if (visits === minimumVisits) return 4
  if (visits === minimumVisits + 1) return 3
  if (visits === minimumVisits + 2) return 2
  return 1
}

export function getScoreTaskStarRules(targetScore, comparison = 'atLeast', { scoreGoal, requiredScoringVisits = 1 } = {}) {
  const singleTargetMinimum = getScoreTaskMinimumDarts(targetScore, comparison)
  const minimumDarts = scoreGoal === 'repeatedVisit' ? singleTargetMinimum * requiredScoringVisits : singleTargetMinimum
  const minimumVisits = Math.ceil(minimumDarts / 3)
  if (minimumDarts % 3 !== 0) return [
    { stars:4, text:`${minimumDarts} ${minimumDarts === 1 ? 'Dart' : 'Darts'} · Perfekt` },
    { stars:3, text:`${minimumVisits}. Aufnahme` },
    { stars:2, text:`${minimumVisits + 1}. Aufnahme` },
    { stars:1, text:`Ab der ${minimumVisits + 2}. Aufnahme` },
  ]
  return [
    { stars:4, text:`${minimumVisits === 1 ? 'Erste' : `${minimumVisits}.`} Aufnahme · Perfekt` },
    { stars:3, text:`${minimumVisits + 1}. Aufnahme` },
    { stars:2, text:`${minimumVisits + 2}. Aufnahme` },
    { stars:1, text:`Ab der ${minimumVisits + 3}. Aufnahme` },
  ]
}

export function getScoreTaskIssue(level) {
  const minimum = getScoreTaskMinimumDarts(level.targetScore, level.comparison)
  if (minimum == null) return 'Zielscore ist mit regulären Dartwerten nicht erreichbar.'
  if (level.scoreGoal !== 'cumulative' && level.targetScore > 180) return 'Zielscore übersteigt 180 Punkte pro Aufnahme.'
  if (level.dartLimit && level.targetScore > level.dartLimit * 60) return `Zielscore übersteigt ${level.dartLimit * 60} Punkte mit ${level.dartLimit} Darts.`
  if (level.dartLimit && minimum > level.dartLimit) return `Mathematisches Minimum von ${minimum} Darts überschreitet das Dartlimit.`
  return null
}
