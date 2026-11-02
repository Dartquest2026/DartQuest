export const CUSTOM_GAMES = [
  { id: 'bulls-warm-up', title: 'Bulls Warm-Up', description: 'Single Bull und Doppelbull auf Zeit.' },
  { id: 't20-combo', title: 'T20 Combo', description: 'Triple 20 mit dem ersten Dart – wie lange hält deine Serie?' },
  { id: 'triple-20-19-18-combo', title: 'Combo Triple 20, Triple 19, Triple 18', description: '20, 19 und 18 in Reihenfolge treffen – mindestens ein Triple pro Aufnahme.' },
  { id: 'favorite-double', title: 'Favoriten Doppel', description: 'Dein Lieblingsdoppel mit dem ersten Dart treffen und die Serie fortsetzen.' },
  { id: 'double-route', title: 'Doppelweg', description: 'Drei Doppel in fester Reihenfolge – ein Punkt pro Treffer.' },
  { id: 'around-the-clock', title: 'Around the Clock', description: '1 bis 20, optional mit Bull. Nur Fehlwürfe zählen und die Zeit vergleichen.' },
]
export const DOUBLE_ROUTES = [[20, 10, 5], [16, 8, 4], [12, 6, 3], [4, 2, 1]]
export const DEFAULT_ROUTE = DOUBLE_ROUTES[1]
export const routeLabel = route => route.map(n => `D${n}`).join(' → ')
export const isComboGame = game => ['t20-combo', 'triple-20-19-18-combo'].includes(game)
export const isSeriesGame = game => isComboGame(game) || game === 'favorite-double'
export const pointsLabel = points => `${points} ${points === 1 ? 'Punkt' : 'Punkte'}`
export const DURATIONS = [5, 10, 15]
export const isAroundClock = game => game === 'around-the-clock'
export const aroundVariant = includeBull => includeBull ? '1–20 + Bull' : '1–20 ohne Bull'
export const formatElapsed = ms => { const seconds = Math.floor(Math.max(0, ms) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }
export const elapsedClockMs = (run, now = Date.now()) => run.elapsedMs ?? Math.max(0, now - run.startedAt)
export function aroundClockStats(run) {
  const hits = run.includeBull ? 21 : 20, misses = run.misses ?? 0
  return { hits, misses, darts: hits + misses, accuracy: hits / (hits + misses) * 100, elapsedMs: elapsedClockMs(run) }
}
export function recordAroundMiss(run) {
  if (!isAroundClock(run.game) || run.phase !== 'playing' || (run.misses ?? 0) >= 999999) return run
  return { ...run, misses: (run.misses ?? 0) + 1 }
}
export function finishAroundClock(run, now = Date.now()) {
  if (!isAroundClock(run.game) || run.phase !== 'playing') return run
  return { ...run, elapsedMs: elapsedClockMs(run, now), finishedAt: now, phase: 'saving', completed: true }
}
export function aroundClockBest(rows, includeBull, excludeId) {
  const matches = rows.filter(row => row.game === 'around-the-clock' && row.id !== excludeId && Boolean((row.payload ?? row).includeBull) === includeBull).sort((a,b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  const values = matches.map(row => aroundClockStats(row.payload ?? row))
  return { misses: values.length ? Math.min(...values.map(row => row.misses)) : null, elapsedMs: values.length ? Math.min(...values.map(row => row.elapsedMs)) : null, previous: values[0] ?? null }
}
export const remainingSeconds = (endAt, now = Date.now()) => Math.max(0, Math.ceil((endAt - now) / 1000))
export const hasOpenEntry = run => isSeriesGame(run.game) && ((run.score ?? '') !== '' || run.choosing || (run.favoriteComboCount ?? 0) > 0)
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
export function favoritePendingCount(run) {
  if (run?.game !== 'favorite-double') return 0
  return run.favoriteComboCount ?? favoriteDoubleEntry(Number(run.score), run.favoriteDouble ?? 16)?.count ?? 0
}
export function recordFavoriteSingle(run, now = Date.now()) {
  if (favoritePendingCount(run) || (run.phase === 'final-entry' ? finalEntryUsed(run) >= 3 : run.phase !== 'playing' || remainingSeconds(run.endAt, now) === 0)) return run
  const target = run.favoriteDouble ?? 16
  return { ...run, entries: [...run.entries, favoriteDoubleEntry(target * 2, target)], favoriteComboCount: 0, score: '', choosing: false }
}
export function changeFavoriteCombo(run, delta, now = Date.now()) {
  if (run.phase === 'final-entry' ? delta > 0 && finalEntryUsed(run) >= 3 : run.phase !== 'playing' || (delta > 0 && remainingSeconds(run.endAt, now) === 0)) return run
  const count = Math.max(0, Math.min(Math.floor(99999 / ((run.favoriteDouble ?? 16) * 2)), favoritePendingCount(run) + delta))
  return { ...run, favoriteComboCount: count, score: '' }
}
export function saveFavoriteCombo(run) {
  const target = run.favoriteDouble ?? 16
  const entry = favoriteDoubleEntry(favoritePendingCount(run) * target * 2, target)
  if (!['playing','final-entry'].includes(run.phase) || !entry) return run
  return { ...run, entries: [...run.entries, entry], favoriteComboCount: 0, score: '', choosing: false }
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
  if (run.phase === 'final-entry' ? finalEntryUsed(run) >= 3 : run.phase !== 'playing' || remainingSeconds(run.endAt, now) === 0) return run
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

export function beginBullsFinalEntry(run, now = Date.now()) {
  if (run.game !== 'bulls-warm-up' || run.phase !== 'playing' || remainingSeconds(run.endAt,now) > 0) return run
  return { ...run, phase: 'bulls-final', bullsFinalBase: { doubleBull: run.doubleBull, singleBull: run.singleBull } }
}
export function bullsFinalHits(run) {
  if (!run?.bullsFinalBase) return 0
  return (run.doubleBull - run.bullsFinalBase.doubleBull) + (run.singleBull - run.bullsFinalBase.singleBull)
}
export function changeBullCount(run, field, delta, now = Date.now()) {
  if (run.game !== 'bulls-warm-up' || !['doubleBull','singleBull'].includes(field) || ![-1,1].includes(delta)) return run
  const current = beginBullsFinalEntry(run,now)
  if (current.phase === 'playing') return { ...current, [field]: Math.max(0, current[field]+delta) }
  if (current.phase !== 'bulls-final' || !current.bullsFinalBase) return current
  if ((delta > 0 && bullsFinalHits(current) >= 3) || (delta < 0 && current[field] <= current.bullsFinalBase[field])) return current
  return { ...current, [field]: current[field]+delta }
}
export function finishBullsFinalEntry(run) {
  if (run.game !== 'bulls-warm-up' || run.phase !== 'bulls-final' || !run.bullsFinalBase || bullsFinalHits(run) < 0 || bullsFinalHits(run) > 3) return run
  return { ...run, phase: 'saving', completed: true }
}

export function beginTimedFinalEntry(run, now = Date.now()) {
  if (run.game === 'bulls-warm-up') return beginBullsFinalEntry(run,now)
  if (isAroundClock(run.game) || run.phase !== 'playing' || remainingSeconds(run.endAt,now)>0) return run
  return { ...run, phase:'final-entry', finalEntryBase:{ entries:(run.entries??[]).length, routeThrows:(run.routeThrows??[]).length, favoriteHits:(run.entries??[]).reduce((n,e)=>n+e.count,0)+favoritePendingCount(run) } }
}
export function finalEntryUsed(run) {
  if(run?.phase!=='final-entry'||!run.finalEntryBase)return 0
  if(run.game==='double-route')return (run.routeThrows??[]).length-run.finalEntryBase.routeThrows
  if(run.game==='favorite-double')return Math.max(0,(run.entries??[]).reduce((n,e)=>n+e.count,0)+favoritePendingCount(run)-run.finalEntryBase.favoriteHits)
  return (run.entries??[]).length-run.finalEntryBase.entries
}
export function canEnterTrainingScore(run) {
  return run.phase==='playing' || (run.phase==='final-entry' && finalEntryUsed(run)<1)
}
export function recordTrainingCombo(run,points,count) {
  if(!canEnterTrainingScore(run)||!validCombo(points,count,run.game))return run
  return {...run,entries:[...run.entries,{points,count}],score:'',choosing:false}
}
export function finishTimedFinalEntry(run) {
  if(run.phase!=='final-entry'||hasOpenEntry(run))return run
  return {...run,phase:'saving',completed:true}
}

export function favoriteSessionCounts(run) {
  const entries = run?.entries ?? []
  return { singles: entries.filter(entry => entry.count === 1).length, combos: entries.filter(entry => entry.count >= 2).length }
}

export const FAVORITE_DOUBLES = Object.freeze([20,18,16,12,10,8,6,4,2,1])
export function favoritePlayedDoubles(run) {
  const doubles = [...new Set((run.entries??[]).map(entry=>entry.double).filter(target=>Number.isInteger(target)&&target>=1&&target<=20))]
  if(!doubles.length && Number.isInteger(run.favoriteDouble)) doubles.push(run.favoriteDouble)
  return doubles
}
export function favoriteBestCombo(run) {
  return (run.entries??[]).filter(entry=>entry.count>=2).reduce((best,entry)=>!best||entry.points>best.points?entry:best,null)
}
export function favoriteDoubleContext(run) {
  const doubles=favoritePlayedDoubles(run)
  return doubles.length ? `Gespielt: ${doubles.map(target=>`D${target}`).join(' · ')}` : 'Gespieltes Doppel nicht erfasst'
}
export function favoriteComboContext(run) {
  const combo=favoriteBestCombo(run)
  return combo ? `D${combo.double} · ${combo.count} Treffer hintereinander` : 'Noch keine Combo ab 2 Treffern'
}
