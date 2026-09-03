import { applyVisit, CHECKOUT_FINISH_VALUES, createRivalMatch, DARTBOARD_HIT_VALUES, getMinimumCheckoutDarts, undoPlayerRound } from '../campaignModes/rivalEngine.js'
import { getScoreTaskStars } from './scoreTaskRating.js'

export function getMinimumCampaignCheckoutDarts(score) {
  const target = Number(score)
  if (!Number.isInteger(target) || target < 2) return null
  const singleVisitMinimum = getMinimumCheckoutDarts(target)
  if (singleVisitMinimum != null) return singleVisitMinimum
  let reachable = new Set([0])
  for (let setupDarts = 1; setupDarts <= 14; setupDarts += 1) {
    reachable = new Set([...reachable].flatMap((subtotal) => DARTBOARD_HIT_VALUES.map((hit) => subtotal + hit)).filter((subtotal) => subtotal < target))
    if (CHECKOUT_FINISH_VALUES.some((finish) => reachable.has(target - finish))) return setupDarts + 1
  }
  return null
}

export function checkoutStarsForTotalDarts(score, totalDarts) {
  const minimum = getMinimumCampaignCheckoutDarts(score)
  if (minimum == null || !Number.isInteger(totalDarts) || totalDarts < minimum) return 0
  if (totalDarts === minimum) return 4
  if (totalDarts <= 3) return 3
  if (totalDarts <= 6) return 2
  return 1
}

export function createNumericAttempt(level, startedAt = Date.now()) {
  if (level.taskType === 'checkout') {
    return { kind: 'checkout', match: createRivalMatch('Spieler', level.id, level.checkoutScore, 1), startedAt }
  }
  return { kind: 'score', visits: [], history: [], totalScore: 0, totalDarts: 0, startedAt }
}

export function applyCheckoutVisit(attempt, points, validCheckout = false, dartsUsed = 3) {
  const nextMatch = applyVisit(attempt.match, points, validCheckout, dartsUsed)
  return { ...attempt, match: nextMatch.winner == null ? { ...nextMatch, active: 0 } : nextMatch }
}

export function applyScoreVisit(attempt, points, dartsUsed = 3) {
  if (!Number.isInteger(points) || points < 0 || points > 180) return attempt
  const darts = Math.max(1, Math.min(3, dartsUsed))
  const visit = { points, darts }
  return {
    ...attempt,
    history: [...attempt.history, { visits: attempt.visits, totalScore: attempt.totalScore, totalDarts: attempt.totalDarts }],
    visits: [...attempt.visits, visit],
    totalScore: attempt.totalScore + points,
    totalDarts: attempt.totalDarts + darts,
  }
}

export function undoNumericVisit(attempt) {
  if (attempt.kind === 'checkout') return { ...attempt, match: { ...undoPlayerRound(attempt.match), active: 0 } }
  const previous = attempt.history.at(-1)
  return previous ? { ...attempt, ...previous, history: attempt.history.slice(0, -1) } : attempt
}

export function getVisibleNumericHistory(history, limit = 3) {
  return history.slice(-Math.max(0, limit))
}

export function getDartVisitPreview(level, attempt, darts) {
  const points = darts.reduce((sum, dart) => sum + dart, 0)
  const stats = numericAttemptStats(level, attempt)
  if (attempt.kind === 'checkout') {
    const rest = stats.rest - points
    const bust = rest < 0 || rest === 1
    return { points, rest: bust ? stats.rest : rest, bust, checkout: rest === 0 }
  }
  const totalScore = level.scoreGoal === 'singleVisit' || level.scoreGoal === 'repeatedVisit' ? points : stats.totalScore + points
  const scoringVisit = level.comparison === 'exact' ? points === level.targetScore : points >= level.targetScore
  const complete = level.scoreGoal === 'repeatedVisit'
    ? stats.successfulVisits + (scoringVisit ? 1 : 0) >= level.requiredScoringVisits
    : level.comparison === 'exact' ? totalScore === level.targetScore : totalScore >= level.targetScore
  return { points, rest: Math.max(0, level.targetScore - totalScore), bust: false, checkout: false, complete }
}

export function numericAttemptStats(level, attempt) {
  if (attempt.kind === 'checkout') {
    const player = attempt.match.players[0]
    const visits = attempt.match.visits.filter((visit) => visit.player === 0)
    return {
      rest: player.score,
      totalScore: level.checkoutScore - player.score,
      totalDarts: player.dartsThrown,
      visits: visits.length,
      highestVisit: player.highestVisit,
      average: player.dartsThrown ? (player.totalScored / player.dartsThrown) * 3 : 0,
      history: visits,
      complete: attempt.match.winner === 0,
    }
  }
  const successfulVisits = attempt.visits.filter((visit) => level.comparison === 'exact' ? visit.points === level.targetScore : visit.points >= level.targetScore).length
  const complete = level.scoreGoal === 'singleVisit'
    ? successfulVisits >= 1
    : level.scoreGoal === 'repeatedVisit'
      ? successfulVisits >= level.requiredScoringVisits
      : level.comparison === 'exact' ? attempt.totalScore === level.targetScore : attempt.totalScore >= level.targetScore
  const scoringBase = level.scoreGoal === 'singleVisit' || level.scoreGoal === 'repeatedVisit' ? Math.max(0, ...attempt.visits.map((visit) => visit.points)) : attempt.totalScore
  return {
    rest: Math.max(0, level.targetScore - scoringBase), totalScore: attempt.totalScore, totalDarts: attempt.totalDarts,
    visits: attempt.visits.length, highestVisit: Math.max(0, ...attempt.visits.map((visit) => visit.points)),
    average: attempt.totalDarts ? (attempt.totalScore / attempt.totalDarts) * 3 : 0, history: attempt.visits, successfulVisits, complete,
  }
}

export function createNumericAttemptResult(level, attempt, completedAt = Date.now()) {
  const stats = numericAttemptStats(level, attempt)
  const finalVisit = stats.history.at(-1)
  const stars = level.taskType === 'checkout'
    ? checkoutStarsForTotalDarts(level.checkoutScore, stats.totalDarts)
    : getScoreTaskStars({ targetScore:level.targetScore, comparison:level.comparison, totalDarts:stats.totalDarts, visits:stats.visits, scoreGoal:level.scoreGoal, requiredScoringVisits:level.requiredScoringVisits })
  return {
    success: stats.complete, stars, darts: stats.totalDarts, totalDarts: stats.totalDarts, visits: stats.visits,
    finishingDart: finalVisit?.darts ?? 3, finalVisitDarts: finalVisit?.darts ?? 3, taskType: level.taskType,
    checkoutStartScore: level.taskType === 'checkout' ? level.checkoutScore : undefined,
    highestVisit: stats.highestVisit, average: stats.average,
    startedAt: new Date(attempt.startedAt).toISOString(), completedAt: new Date(completedAt).toISOString(),
    durationMs: Math.max(0, completedAt - attempt.startedAt), xp: level.rewardXP ?? 0, coins: level.rewardCoins ?? 0,
  }
}
