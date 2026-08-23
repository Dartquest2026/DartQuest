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
    active: 0, startingPlayer: 0, history: [], visits: [], legVisits: [], winner: null,
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

export function applyVisit(match, points, validCheckout = false, dartsUsed = 3) {
  if (match.winner != null || !Number.isInteger(points) || points < 0 || points > 180) return match
  const history = [...match.history, plainSnapshot(match)]
  const players = match.players.map((player) => ({ ...player }))
  const player = players[match.active]
  const before = player.score
  const remainder = before - points
  const checkoutAttempt = remainder === 0
  const checkoutDarts = Math.max(1, Math.min(3, dartsUsed))
  const checkoutValid = checkoutAttempt && validCheckout && isValidCheckoutAttempt(points, checkoutDarts)
  const bust = remainder < 0 || remainder === 1 || (checkoutAttempt && !checkoutValid)
  if (!bust) player.score = remainder
  const safeDarts = checkoutValid ? checkoutDarts : 3
  player.dartsThrown += safeDarts
  player.visits += 1
  player.totalScored += bust ? 0 : points
  player.highestVisit = Math.max(player.highestVisit, bust ? 0 : points)
  if (checkoutAttempt) player.checkoutAttempts += 1
  if (checkoutValid) { player.checkouts += 1; player.bestCheckout = Math.max(player.bestCheckout, points) }
  const visits = [...match.visits, { player: match.active, points, darts: safeDarts, bust, checkout: checkoutValid }]
  const legVisits = [...(match.legVisits ?? []), { player: match.active, points, darts: safeDarts, bust, checkout: checkoutValid }]

  if (checkoutValid) {
    player.legs += 1
    if (player.legs >= (match.firstTo ?? 3)) return { ...match, players, visits, legVisits, history, winner: match.active }
    const startingPlayer = match.startingPlayer === 0 ? 1 : 0
    players.forEach((item) => { item.score = match.startScore })
    return { ...match, players, visits, legVisits: [], history, active: startingPlayer, startingPlayer }
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

const DOUBLES = Array.from({ length: 20 }, (_, index) => (index + 1) * 2).concat(50)

export function canCheckout(score) {
  return score >= 2 && score <= 170 && score !== 169 && score !== 168 && score !== 166 && score !== 165 && score !== 163 && score !== 162 && score !== 159
}

export function checkoutDartOptions(score) {
  if (!canCheckout(score)) return []
  const values = new Set([0, 25, 50])
  for (let value = 1; value <= 20; value += 1) {
    values.add(value)
    values.add(value * 2)
    values.add(value * 3)
  }
  const options = []
  if (DOUBLES.includes(score)) options.push(1)
  if ([...values].some((first) => DOUBLES.includes(score - first))) options.push(2)
  if ([...values].some((first) => [...values].some((second) => DOUBLES.includes(score - first - second)))) options.push(3)
  return options
}

export function createAiVisit(match, random = Math.random) {
  const score = match.players[1].score
  const center = match.targetAverage
  const checkoutChance = Math.max(0.06, Math.min(0.48, (center - 12) / 110))
  if (score <= 50 && DOUBLES.includes(score) && random() < checkoutChance) {
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
    checkoutRate: player.checkoutAttempts ? (player.checkouts / player.checkoutAttempts) * 100 : null,
  }
}

export function isValidCheckoutAttempt(score, dartsUsed) {
  return checkoutDartOptions(score).includes(dartsUsed)
}
