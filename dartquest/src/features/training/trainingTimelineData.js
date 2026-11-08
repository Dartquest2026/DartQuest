import {TRAINING_VISITS_COLOR,DOUBLE_ROUTE_COLORS} from './trainingChartColors.js'
import { visitStatistics } from './trainingVisits.js'
import { formatElapsed, routeLabel, favoriteDoubleContext, favoriteComboContext, favoritePlayedDoubles, routeMetrics, summary, DEFAULT_ROUTE } from './customTrainingRules.js'
const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
const run = row => ({ ...row.payload, game: row.game })
const count = value => number(value).toLocaleString('de-DE', { maximumFractionDigits: 1 })
function visitCountMetric() {
 return {id:'visits',label:'Aufnahmen insgesamt',color:TRAINING_VISITS_COLOR,available:row=>visitStatistics(run(row))!==null,value:row=>visitStatistics(run(row))?.total??0,format:count,detail:row=>{const stats=visitStatistics(run(row));return stats?`${stats.total} Aufnahmen · ${stats.successful} erfolgreich · ${stats.failed} ohne Ergebnis${row.game==='favorite-double'?' · '+favoriteDoubleContext(run(row)):''}`:'Aufnahmen nicht erfasst'}}
}
export function timelineSeries(game, route = null) {
  if (game === 'around-the-clock') return [
    { id: 'misses', label: 'Fehlwürfe', color: '#f18a96', lower: true, value: row => number(row.payload.misses), format: count },
    { id: 'time', label: 'Spielzeit', color: '#91bafa', lower: true, value: row => number(row.payload.elapsedMs), format: formatElapsed },
  ]
  if (game === 'favorite-double') return [
    { id:'hits', label:'Doppeltreffer insgesamt', color:'#8be8b7', value:row=>(row.payload.entries??[]).reduce((total,entry)=>total+number(entry.count),0), format:count, detail:row=>favoriteDoubleContext(run(row)) },
    { id:'combo-points', label:'Größte Combo · Punkte', color:'#91bafa', value:row=>Math.max(0,...(row.payload.entries??[]).filter(entry=>entry.count>=2).map(entry=>number(entry.points))), format:count, detail:row=>favoriteComboContext(run(row)) },
    visitCountMetric(),
  ]
  if (game === 'double-route') return [0,1,2].map(index => ({
    id: route ? `double-${route[index]}` : `route-position-${index}`, label: route ? `D${route[index]}` : `${index+1}. Doppel`, color: DOUBLE_ROUTE_COLORS[index],
    value: row => routeMetrics(run(row))[index]?.hits ?? 0, format: count,
    detail: row => { const metric=routeMetrics(run(row))[index];return `${routeLabel(row.payload.route??DEFAULT_ROUTE)} · D${metric?.target??'?'} · ${metric?.hits??0} Treffer / ${metric?.attempts??0} ${metric?.attempts===1?'Wurf':'Würfe'} · ${metric?.attempts ? (metric.hits/metric.attempts*100).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}) : '0'} %` },
  }))
  if (game === 't20-combo') return [
    { id: 't20-hits', label: 'T20 beim ersten Wurf', color: '#8be8b7', value: row => (row.payload.entries ?? []).reduce((total, entry) => total + number(entry.count), 0), format: count },
    { id: 'longest', label: 'Längste Combo', color: '#91bafa', value: row => summary(run(row)).longest, format: count },
    visitCountMetric(),
  ]
  return [
    { id: 'points', label: 'Gesamtpunkte', color: '#8be8b7', value: row => summary(run(row)).points, format: count },
    { id: 'longest', label:'Längste Combo', color: '#91bafa', value: row => summary(run(row)).longest, format: count },
  ]
}
export function trainingTimeline(rows, game, route, metrics) {
  const ordered = [...rows].sort((a,b) => new Date(a.created_at) - new Date(b.created_at) || a.id.localeCompare(b.id))
  const series = (metrics ?? timelineSeries(game, route)).map(metric => ({ ...metric,
    maximum: Math.max(1, ...ordered.filter(row=>!metric.available||metric.available(row)).map(metric.value)),
    record: ordered.filter(row=>!metric.available||metric.available(row)).reduce((best,row) => !best || (metric.lower ? metric.value(row) < metric.value(best) : metric.value(row) > metric.value(best)) ? row : best, null),
  }))
  if(['t20-combo','favorite-double'].includes(game)&&!metrics){const maximum=Math.max(series[0].maximum,series[2].maximum);series[0].maximum=maximum;series[2].maximum=maximum}
  if (game === 'double-route' && !metrics) {
    const commonMaximum = Math.max(...series.map(s => s.maximum))
    series.forEach(s => { s.maximum = commonMaximum })
  }
  return { recent: ordered.slice(-10), series }
}

export function timelineVariant(row) {
 if(row.game==='double-route')return (row.payload.route??DEFAULT_ROUTE).map(target=>`D${target}`)
 if(row.game==='favorite-double')return favoritePlayedDoubles(run(row)).map(target=>`D${target}`)
 return []
}
