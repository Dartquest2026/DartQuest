import { visitStatistics } from './trainingVisits.js'
export function bullsHistory(rows) {
  const ordered = [...rows].sort((a,b) => new Date(a.created_at) - new Date(b.created_at) || a.id.localeCompare(b.id))
  const value = (row, field) => Number(row.payload?.[field] ?? 0)
  const record = field => ordered.reduce((best, row) => !best || value(row,field) > value(best,field) ? row : best, null)
  const points = row => value(row,'singleBull') * 25 + value(row,'doubleBull') * 50
  const scoreRecord = ordered.reduce((best,row) => !best || points(row) > points(best) ? row : best, null)
  const singleRecord = record('singleBull'), doubleRecord = record('doubleBull')
  const maximum = Math.max(1, ...ordered.flatMap(row => [value(row,'singleBull'),value(row,'doubleBull'),visitStatistics({...row.payload,game:row.game})?.total??0]))
  const step = Math.max(1, 5 * Math.ceil(maximum / 25))
  return { recent: ordered.slice(-10), singleRecord, doubleRecord, scoreRecord, points, ceiling: step * Math.ceil(maximum / step) }
}

export function bullsRecordGuides(single, double, ceiling) {
  const guides = [
    { kind: 'single', label: 'Single Bull', value: single, top: (1 - single / ceiling) * 100, offset: 0 },
    { kind: 'double', label: 'Doppelbull', value: double, top: (1 - double / ceiling) * 100, offset: 0 },
  ]
  // The plot is 186px high. Separate nearby labels, keeping the guide lines
  // at the exact record heights and joining displaced labels with a leader.
  if (Math.abs(guides[0].top - guides[1].top) * 1.86 < 20) {
    const upper = guides[0].top <= guides[1].top ? 0 : 1
    guides[upper].offset = -10
    guides[1-upper].offset = 10
  }
  return guides
}
