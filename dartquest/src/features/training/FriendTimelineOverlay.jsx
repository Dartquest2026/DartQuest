import { recentComparisonRows } from './timelineComparison'
export function FriendTimelineOverlay({ rows, metrics, columns, name }) {
  const recent=recentComparisonRows(rows)
  if(!recent.length)return null
  const x=i=>(columns-recent.length+i+.5)/columns*1000
  const y=(metric,row)=>200*(1-Math.min(1,metric.value(row)/metric.maximum))
  return <svg className="timeline-friend-overlay" viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label={`Gestrichelte Vergleichslinien: ${name}`}>
    {metrics.map(metric=><g key={metric.id} style={{color:metric.color}}><polyline points={recent.map((row,i)=>`${x(i)},${y(metric,row)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke"/>{recent.map((row,i)=><circle key={row.id} cx={x(i)} cy={y(metric,row)} r="1" fill="currentColor" stroke="currentColor" strokeWidth="4" vectorEffect="non-scaling-stroke"/>)}</g>)}
  </svg>
}
export function FriendTimelineSummary({ rows, metrics, name }) {
  const recent=recentComparisonRows(rows)
  if(!recent.length)return null
  return <div className="timeline-friend-summary"><p>Balken: du · gestrichelte Linien: <strong>{name}</strong>. Jeweils die letzten zehn Einheiten, neueste rechts. Gleiche Position bedeutet nicht gleicher Tag.</p><details><summary>Ergebnisse von {name} ansehen</summary>{[...recent].reverse().map(row=><article key={row.id}><time>{new Date(row.created_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</time><span>{metrics.map(m=>`${m.label}: ${m.format(m.value(row))}`).join(' · ')}</span></article>)}</details></div>
}
