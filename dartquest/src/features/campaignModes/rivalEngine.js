export function rivalAverageForLevel(level) {
  if (level === 1) return 25
  if (level === 2) return 30
  if (level === 3) return 35
  return 37.5 + (level - 4) * 2.5
}

export function createRivalMatch(playerName, level, startScore = 501, firstTo = 3) {
  return {
    level, targetAverage: rivalAverageForLevel(level), startScore, firstTo,
    players: [playerName || 'Spieler', `Rivale ${level}`].map((name) => ({ name, score: startScore, legs: 0, dartsThrown: 0, visits: 0, totalScored: 0, highestVisit: 0, checkouts: 0, checkoutAttempts: 0, bestCheckout: 0 })),
    active: 0, startingPlayer: 0, history: [], visits: [], legVisits: [], legResults: [], winner: null,
  }
}

export function createChallengeRivalMatch(playerName, challenge) {
  const startScore = challenge?.startScore ?? 101
  const level = challenge?.level ?? 1
  const match = createRivalMatch(playerName, level, startScore, 1)
  return {
    ...match,
    challengeId: challenge?.id ?? null,
    targetAverage: challenge?.targetAverage ?? rivalAverageForLevel(level),
    players: [
      { ...match.players[0], name: playerName || 'Spieler' },
      { ...match.players[1], name: challenge?.opponent || 'Herausforderer' },
    ],
  }
}

function plainSnapshot(match) {
  return structuredClone({ ...match, history: [] })
}

export function applyVisit(match, points, validCheckout = false, dartsUsed = 3, doubleAttempts = 0) {
  if (match.winner != null || !Number.isInteger(points) || points < 0 || points > 180) return match
  const history = [...match.history, plainSnapshot(match)]
  const players = match.players.map((player) => ({ ...player }))
  const player = players[match.active]
  const before = player.score
  const remainder = before - points
  const checkoutAttempt = remainder === 0
  const checkoutDarts = Math.max(1, Math.min(3, dartsUsed))
  const checkoutValid = checkoutAttempt && validCheckout && isValidCheckoutAttempt(points, checkoutDarts)
  const actualDoubleAttempts = Math.max(checkoutValid ? 1 : 0, Math.min(checkoutDarts, Number.isInteger(doubleAttempts) ? doubleAttempts : 0))
  const bust = remainder < 0 || remainder === 1 || (checkoutAttempt && !checkoutValid)
  if (!bust) player.score = remainder
  const safeDarts = checkoutValid ? checkoutDarts : 3
  player.dartsThrown += safeDarts
  player.visits += 1
  player.totalScored += bust ? 0 : points
  player.highestVisit = Math.max(player.highestVisit, bust ? 0 : points)
  player.checkoutAttempts = (player.checkoutAttempts ?? 0) + actualDoubleAttempts
  if (checkoutValid) { player.checkouts += 1; player.bestCheckout = Math.max(player.bestCheckout, points) }
  const visit = { player: match.active, points, darts: safeDarts, bust, checkout: checkoutValid, doubleAttempts: actualDoubleAttempts }
  const visits = [...match.visits, visit]
  const legVisits = [...(match.legVisits ?? []), visit]

  if (checkoutValid) {
    player.legs += 1
    const legResults = [...(match.legResults ?? []), createLegResult(match, players, legVisits, match.active)]
    if (player.legs >= (match.firstTo ?? 3)) return { ...match, players, visits, legVisits, legResults, history, winner: match.active }
    const startingPlayer = match.startingPlayer === 0 ? 1 : 0
    players.forEach((item) => { item.score = match.startScore })
    return { ...match, players, visits, legVisits: [], legResults, history, active: startingPlayer, startingPlayer }
  }
  return { ...match, players, visits, legVisits, history, active: match.active === 0 ? 1 : 0 }
}

export function undoPlayerRound(match) {
  if (!match.history.length) return match
  let index = match.history.length - 1
  while (index > 0 && match.history[index].active !== 0) index -= 1
  const restored = match.history[index]
  return { ...restored, history: match.history.slice(0, index) }
}

export const CHECKOUT_FINISH_VALUES = Object.freeze(Array.from({ length: 20 }, (_, index) => (index + 1) * 2).concat(50))
export const DARTBOARD_HIT_VALUES = Object.freeze([...new Set([
  0,
  ...Array.from({ length: 20 }, (_, index) => index + 1),
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 2),
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 3),
  25,
  50,
])])

export function findCheckoutRoute(score, dartsUsed) {
  const target = Number(score)
  if (!Number.isInteger(target) || target < 2 || target > 170 || ![1, 2, 3].includes(dartsUsed)) return null

  for (const finish of CHECKOUT_FINISH_VALUES) {
    if (dartsUsed === 1 && finish === target) return [finish]
    if (dartsUsed >= 2) {
      for (const first of DARTBOARD_HIT_VALUES) {
        if (dartsUsed === 2 && first + finish === target) return [first, finish]
        if (dartsUsed === 3) {
          for (const second of DARTBOARD_HIT_VALUES) {
            if (first + second + finish === target) return [first, second, finish]
          }
        }
      }
    }
  }
  return null
}

export function checkoutDartOptions(score) {
  return [1, 2, 3].filter((dartsUsed) => findCheckoutRoute(score, dartsUsed) !== null)
}

export function canCheckout(score) {
  return checkoutDartOptions(score).length > 0
}

export function getMinimumCheckoutDarts(score) {
  return checkoutDartOptions(score)[0] ?? null
}

export function getAvailableCheckoutDartCounts(score) {
  const minimum = getMinimumCheckoutDarts(score)
  return minimum == null ? [] : Array.from({ length: 4 - minimum }, (_, index) => minimum + index)
}

export function canCheckoutWithDarts(score, dartCount) {
  return getAvailableCheckoutDartCounts(score).includes(dartCount)
}

export function createAiVisit(match, random = Math.random) {
  const score = match.players[1].score
  const center = match.targetAverage
  const checkoutChance = Math.max(0.06, Math.min(0.48, (center - 12) / 110))
  if (score <= 50 && CHECKOUT_FINISH_VALUES.includes(score) && random() < checkoutChance) {
    return { points: score, validCheckout: true, dartsUsed: center < 35 ? 2 + Math.floor(random() * 2) : 1 + Math.floor(random() * 3) }
  }
  if (score <= 170 && canCheckout(score) && random() < checkoutChance * 0.55) {
    return { points: score, validCheckout: true, dartsUsed: center < 35 ? 3 : 1 + Math.floor(random() * 3) }
  }
  const spread = 18 + center * 0.22
  let points = Math.round(center + (random() + random() - 1) * spread)
  points = Math.max(0, Math.min(180, points))
  const remainder = score - points
  if (remainder < 2) points = Math.max(0, score - (2 + Math.floor(random() * 39)))
  return { points, validCheckout: false, dartsUsed: 3 }
}

export function playerMatchStats(player) {
  return {
    average: player.dartsThrown ? (player.totalScored / player.dartsThrown) * 3 : 0,
    darts: player.dartsThrown,
    visits: player.visits,
    highestVisit: player.highestVisit,
    bestCheckout: player.bestCheckout || null,
    checkoutAttempts: player.checkoutAttempts ?? 0,
    checkouts: player.checkouts ?? 0,
    checkoutRate: player.checkoutAttempts ? (player.checkouts / player.checkoutAttempts) * 100 : null,
  }
}

function createLegResult(match, players, visits, winner) {
  const humanVisits = visits.filter((visit) => visit.player === 0)
  const darts = humanVisits.reduce((total, visit) => total + visit.darts, 0)
  const scored = humanVisits.reduce((total, visit) => total + (visit.bust ? 0 : visit.points), 0)
  const checkoutAttempts = humanVisits.reduce((total, visit) => total + (visit.doubleAttempts ?? 0), 0)
  const checkouts = winner === 0 ? 1 : 0
  return {
    number: (match.legResults?.length ?? 0) + 1,
    winner,
    average: darts ? (scored / darts) * 3 : 0,
    checkoutAttempts,
    checkouts,
    darts: winner === 0 ? darts : null,
    remaining: winner === 1 ? players[0].score : null,
  }
}

export function rivalMatchResult(match) {
  const human = match.players[0]
  const opponent = match.players[1]
  const stats = playerMatchStats(human)
  return {
    won: match.winner === 0,
    playerLegs: human.legs,
    opponentLegs: opponent.legs,
    average: stats.average,
    checkoutAttempts: human.checkoutAttempts ?? 0,
    checkouts: human.checkouts ?? 0,
    checkoutRate: stats.checkoutRate,
    darts: stats.darts,
    visits: stats.visits,
    highestVisit: stats.highestVisit,
    bestCheckout: stats.bestCheckout,
    legs: Array.isArray(match.legResults) ? match.legResults.map((leg) => ({ ...leg })) : null,
  }
}

export function isValidCheckoutAttempt(score, dartsUsed) {
  return checkoutDartOptions(score).includes(dartsUsed)
}
