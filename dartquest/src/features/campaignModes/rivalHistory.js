export function buildVisitRows(visits, startScore = 501) {
  const rows = []
  const state = [{ rest: startScore, darts: 0 }, { rest: startScore, darts: 0 }]
  for (const visit of visits) {
    const side = visit.player === 0 ? 'human' : 'ai'
    const playerState = state[visit.player]
    playerState.darts += visit.darts ?? 3
    if (!visit.bust) playerState.rest = visit.rest ?? Math.max(0, playerState.rest - visit.points)
    let row = rows.at(-1)
    if (!row || row[side]) {
      row = { key: rows.length, darts: (rows.length + 1) * 3 }
      rows.push(row)
    }
    row[side] = { ...visit, rest: visit.rest ?? playerState.rest, cumulativeDarts: playerState.darts }
  }
  return rows
}
