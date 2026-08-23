export function rivalAverageForLevel(level) {
  if (level === 1) return 25
  if (level === 2) return 30
  if (level === 3) return 35
  return 37.5 + (level - 4) * 2.5
}

export function createRivalMatch(playerName, level, startScore = 501) {
  return {
    level, targetAverage: rivalAverageForLevel(level), startScore,
    players: [playerName || 'Spieler', `Rivale ${level}`].map((name) => ({ name, score: startScore, legs: 0, dartsThrown: 0, visits: 0, totalScored: 0, highestVisit: 0, checkouts: 0, checkoutAttempts: 0, bestCheckout: 0 })),
    active: 0, startingPlayer: 0, history: [], visits: [], winner: null,
  }
}

function plainSnapshot(match) {
  return structuredClone({ ...match, history: [] })
}

export function applyVisit(match, points, validCheckout = false, dartsUsed = 3) {
  if (match.winner != null || !Number.isInteger(points) || points < 0 || points > 180) return match
  const history = [...match.history, plainSnapshot(match)]
  const players = match.players.map((player) => ({ ...player }))
  const player = players[match.active]
  const before = player.score
  const remainder = before - points
  const checkoutAttempt = remainder === 0
  const bust = remainder < 0 || remainder === 1 || (checkoutAttempt && !validCheckout)
  if (!bust) player.score = remainder
  const safeDarts = checkoutAttempt && validCheckout ? Math.max(1, Math.min(3, dartsUsed)) : 3
  player.dartsThrown += safeDarts
  player.visits += 1
  player.totalScored += bust ? 0 : points
  player.highestVisit = Math.max(player.highestVisit, bust ? 0 : points)
  if (checkoutAttempt) player.checkoutAttempts += 1
  if (checkoutAttempt && validCheckout) { player.checkouts += 1; player.bestCheckout = Math.max(player.bestCheckout, points) }
  const visits = [...match.visits, { player: match.active, points, darts: safeDarts, bust, checkout: checkoutAttempt && validCheckout }]

  if (checkoutAttempt && validCheckout) {
    player.legs += 1
    if (player.legs >= 3) return { ...match, players, visits, history, winner: match.active }
    const startingPlayer = match.startingPlayer === 0 ? 1 : 0
    players.forEach((item) => { item.score = match.startScore })
    return { ...match, players, visits, history, active: startingPlayer, startingPlayer }
  }
  return { ...match, players, visits, history, active: match.active === 0 ? 1 : 0 }
}

export function undoPlayerRound(match) {
  if (!match.history.length) return match
  let index = match.history.length - 1
  while (index > 0 && match.history[index].active !== 0) index -= 1
  const restored = match.history[index]
  return { ...restored, history: match.history.slice(0, index) }
}

const DOUBLES = Array.from({ length: 20 }, (_, index) => (index + 1) * 2).concat(50)

export function canCheckout(score) {
  return score >= 2 && score <= 170 && score !== 169 && score !== 168 && score !== 166 && score !== 165 && score !== 163 && score !== 162 && score !== 159
}

export function createAiVisit(match, random = Math.random) {
  const score = match.players[1].score
  if (score <= 50 && DOUBLES.includes(score)) return { points: score, validCheckout: true, dartsUsed: 1 }
  if (score <= 170 && canCheckout(score) && random() > 0.55) return { points: score, validCheckout: true, dartsUsed: 1 + Math.floor(random() * 3) }
  const center = match.targetAverage
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
    checkoutRate: player.checkoutAttempts ? (player.checkouts / player.checkoutAttempts) * 100 : null,
  }
}
