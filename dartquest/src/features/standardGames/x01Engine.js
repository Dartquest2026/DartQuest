export const X01_VERSION = 1

export function createDart(segment, multiplier = 1) {
  if (segment === 'miss') return { segment: 0, multiplier: 0, points: 0, miss: true, label: 'Miss' }
  if (segment === 'bull') {
    const safeMultiplier = multiplier === 2 ? 2 : 1
    return { segment: 25, multiplier: safeMultiplier, points: 25 * safeMultiplier, miss: false, label: safeMultiplier === 2 ? 'Double Bull' : 'Bull' }
  }
  const safeSegment = Number(segment)
  const safeMultiplier = Number(multiplier)
  if (!Number.isInteger(safeSegment) || safeSegment < 1 || safeSegment > 20 || ![1, 2, 3].includes(safeMultiplier)) throw new Error('Ungültiger Dart.')
  return { segment: safeSegment, multiplier: safeMultiplier, points: safeSegment * safeMultiplier, miss: false, label: `${safeMultiplier === 1 ? 'S' : safeMultiplier === 2 ? 'D' : 'T'}${safeSegment}` }
}

export function createX01Match({ names, startPlayerIndex = 0, startScore = 501 }) {
  const cleanNames = names.map((name) => String(name).trim())
  if (cleanNames.length < 1 || cleanNames.length > 4 || cleanNames.some((name) => !name)) throw new Error('Es werden ein bis vier Spielernamen benötigt.')
  if (!Number.isInteger(startPlayerIndex) || startPlayerIndex < 0 || startPlayerIndex >= cleanNames.length) throw new Error('Ungültiger Startspieler.')
  return {
    version: X01_VERSION, mode: '501', checkout: 'double-out', startScore,
    players: cleanNames.map((name, id) => ({ id, name, score: startScore, dartsThrown: 0, visits: 0, totalScored: 0, highestVisit: 0, checkoutDarts: null })),
    currentPlayerIndex: startPlayerIndex, startPlayerIndex, visitStartScore: startScore,
    currentVisit: [], history: [], winnerIndex: null, notice: `${cleanNames[startPlayerIndex]} beginnt.`,
  }
}

function snapshot(match) {
  return structuredClone(Object.fromEntries(Object.entries(match).filter(([key]) => key !== 'history')))
}

function settleVisit(match, players, playerIndex, visitScore, notice) {
  const player = players[playerIndex]
  players[playerIndex] = { ...player, visits: player.visits + 1, totalScored: player.totalScored + visitScore, highestVisit: Math.max(player.highestVisit, visitScore) }
  const next = (playerIndex + 1) % players.length
  return { ...match, players, currentPlayerIndex: next, visitStartScore: players[next].score, currentVisit: [], notice: notice ?? `${players[next].name} ist am Zug.` }
}

export function throwX01Dart(match, dart) {
  if (match.winnerIndex != null) return match
  const playerIndex = match.currentPlayerIndex
  const player = match.players[playerIndex]
  const history = [...match.history, snapshot(match)]
  const players = match.players.map((item) => ({ ...item }))
  const thrownPlayer = { ...player, dartsThrown: player.dartsThrown + 1 }
  players[playerIndex] = thrownPlayer
  const visit = [...match.currentVisit, dart]
  const nextScore = player.score - dart.points
  const bust = nextScore < 0 || nextScore === 1 || (nextScore === 0 && dart.multiplier !== 2)

  if (bust) {
    players[playerIndex] = { ...thrownPlayer, score: match.visitStartScore }
    return { ...settleVisit(match, players, playerIndex, 0, `Bust – ${player.name} bleibt bei ${match.visitStartScore}.`), history }
  }

  players[playerIndex] = { ...thrownPlayer, score: nextScore }
  if (nextScore === 0) {
    const visitScore = match.visitStartScore
    players[playerIndex] = { ...players[playerIndex], visits: player.visits + 1, totalScored: player.totalScored + visitScore, highestVisit: Math.max(player.highestVisit, visitScore), checkoutDarts: visit.length }
    return { ...match, players, currentVisit: visit, history, winnerIndex: playerIndex, notice: `${player.name} gewinnt!` }
  }
  if (visit.length === 3) {
    const visitScore = match.visitStartScore - nextScore
    return { ...settleVisit(match, players, playerIndex, visitScore), history }
  }
  return { ...match, players, currentVisit: visit, history, notice: `${player.name}: Dart ${visit.length + 1} von 3.` }
}

export function undoX01(match) {
  if (!match.history.length) return match
  const previous = match.history.at(-1)
  return { ...previous, history: match.history.slice(0, -1), notice: 'Letzter Dart zurückgenommen.' }
}

export function playerAverage(player) {
  return player.dartsThrown ? (player.totalScored / player.dartsThrown) * 3 : 0
}
