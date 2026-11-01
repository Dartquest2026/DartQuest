export const CUSTOM_GAMES = [
  { id: 'bulls-warm-up', title: 'Bulls Warm-Up', description: 'Single Bull und Doppelbull auf Zeit.' },
  { id: 't20-combo', title: 'T20 Combo', description: 'Triple 20 mit dem ersten Dart – wie lange hält deine Serie?' },
  { id: 'triple-20-19-18-combo', title: 'Combo Triple 20, Triple 19, Triple 18', description: '20, 19 und 18 in Reihenfolge treffen – mindestens ein Triple pro Aufnahme.' },
  { id: 'favorite-double', title: 'Favoriten Doppel', description: 'Dein Lieblingsdoppel mit dem ersten Dart treffen und die Serie fortsetzen.' },
  { id: 'double-route', title: 'Doppelweg', description: 'Drei Doppel in fester Reihenfolge – ein Punkt pro Treffer.' },
]
export const DOUBLE_ROUTES = [[20, 10, 5], [16, 8, 4], [12, 6, 3], [4, 2, 1]]
export const DEFAULT_ROUTE = DOUBLE_ROUTES[1]
export const routeLabel = route => route.map(n => `D${n}`).join(' → ')
export const isComboGame = game => ['t20-combo', 'triple-20-19-18-combo'].includes(game)
export const isSeriesGame = game => isComboGame(game) || game === 'favorite-double'
export const pointsLabel = points => `${points} ${points === 1 ? 'Punkt' : 'Punkte'}`
export const DURATIONS = [5, 10, 15]
export const remainingSeconds = (endAt, now = Date.now()) => Math.max(0, Math.ceil((endAt - now) / 1000))
export const hasOpenEntry = run => isSeriesGame(run.game) && ((run.score ?? '') !== '' || run.choosing)
const tripleVisitScores = new Set()
for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) {
  if ([a, b, c].includes(3)) tripleVisitScores.add(20 * a + 19 * b + 18 * c)
}
const tripleSeriesScores = [new Set([0])]
function reachableTripleScores(count) {
  while (tripleSeriesScores.length <= count) {
    const next = new Set()
    for (const total of tripleSeriesScores.at(-1)) for (const visit of tripleVisitScores) next.add(total + visit)
    tripleSeriesScores.push(next)
  }
  return tripleSeriesScores[count]
}
export function validCombo(points, count, game = 't20-combo') {
  if (game === 'triple-20-19-18-combo') return Number.isInteger(points) && Number.isInteger(count) && count >= 1 && count <= 20 && reachableTripleScores(count).has(points)
  return Number.isInteger(points) && Number.isInteger(count) && count >= 1 && count <= 20 && points >= 60 * count && points <= 180 * count
}
export function favoriteDoubleEntry(points, target) {
  if (!Number.isInteger(target) || target < 1 || target > 20 || !Number.isInteger(points) || points <= 0 || points > 99999 || points % (2 * target) !== 0) return null
  return { points, count: points / (2 * target), double: target }
}
export function seriesDistribution(entries) {
  const counts = new Map()
  for (const entry of entries) counts.set(entry.count, (counts.get(entry.count) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => a[0] - b[0])
}
export function routeMetrics(run) {
  return (run.route ?? DEFAULT_ROUTE).map(target => {
    const throws = (run.routeThrows ?? []).filter(dart => dart.target === target)
    return { target, attempts: throws.length, hits: throws.filter(dart => dart.hit).length }
  })
}
export function recordRouteThrow(run, hit, now = Date.now()) {
  if (run.phase !== 'playing' || remainingSeconds(run.endAt, now) === 0) return run
  const throws = run.routeThrows ?? [], route = run.route ?? DEFAULT_ROUTE
  return { ...run, routeThrows: [...throws, { target: route[throws.length % route.length], hit: Boolean(hit) }] }
}
export function summary(run) {
  const entries = run.entries ?? []
  return {
    points: run.game === 'bulls-warm-up' ? run.doubleBull * 50 + run.singleBull * 25 : run.game === 'double-route' ? (run.routeThrows ?? []).filter(dart => dart.hit).length : entries.reduce((n, e) => n + e.points, 0),
    longest: Math.max(0, ...entries.map(e => e.count)),
    bestSeries: Math.max(0, ...entries.map(e => e.points)),
    seriesCount: entries.length,
  }
}
export function bestResults(rows, game, minutes, excludeId, route) {
  const values = rows.filter(r => r.game === game && r.minutes === minutes && r.id !== excludeId && (!route || JSON.stringify(r.payload?.route ?? r.route) === JSON.stringify(route))).map(r => summary(r.payload ?? r))
  return { points: Math.max(0, ...values.map(r => r.points)), longest: Math.max(0, ...values.map(r => r.longest)), bestSeries: Math.max(0, ...values.map(r => r.bestSeries)) }
}
