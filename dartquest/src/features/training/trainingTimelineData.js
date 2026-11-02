import { formatElapsed, routeMetrics, summary, DEFAULT_ROUTE } from './customTrainingRules.js'
const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
const run = row => ({ ...row.payload, game: row.game })
const count = value => number(value).toLocaleString('de-DE', { maximumFractionDigits: 1 })
export function timelineSeries(game, route = DEFAULT_ROUTE) {
  if (game === 'around-the-clock') return [
    { id: 'misses', label: 'Fehlwürfe', color: '#f18a96', lower: true, value: row => number(row.payload.misses), format: count },
    { id: 'time', label: 'Spielzeit', color: '#91bafa', lower: true, value: row => number(row.payload.elapsedMs), format: formatElapsed },
  ]
  if (game === 'double-route') return route.map((target,index) => ({ id: `double-${target}`, label: `D${target}`, color: ['#8be8b7','#91bafa','#edc389'][index], value: row => routeMetrics(run(row)).find(r => r.target === target)?.hits ?? 0, format: count }))
  return [
    { id: 'points', label: 'Gesamtpunkte', color: '#8be8b7', value: row => summary(run(row)).points, format: count },
    { id: 'longest', label: game === 'favorite-double' ? 'Längste Doppelserie' : 'Längste Combo', color: '#91bafa', value: row => summary(run(row)).longest, format: count },
  ]
}
export function trainingTimeline(rows, game, route) {
  const ordered = [...rows].sort((a,b) => new Date(a.created_at) - new Date(b.created_at) || a.id.localeCompare(b.id))
  const series = timelineSeries(game, route).map(metric => ({ ...metric,
    maximum: Math.max(1, ...ordered.map(metric.value)),
    record: ordered.reduce((best,row) => !best || (metric.lower ? metric.value(row) < metric.value(best) : metric.value(row) > metric.value(best)) ? row : best, null),
  }))
  if (game === 'double-route') {
    const commonMaximum = Math.max(...series.map(s => s.maximum))
    series.forEach(s => { s.maximum = commonMaximum })
  }
  return { recent: ordered.slice(-10), series }
}
