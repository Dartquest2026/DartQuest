import { friendMetricRecords } from './timelineComparison'
export function FriendRecordBars({ rows, metrics, name, onSelect }) {
  if(!rows.length)return null
  const records=friendMetricRecords(rows,metrics)
  return <aside className="friend-record-column" aria-label={`Bestleistungen von ${name}`}><div className="friend-record-heading"><strong title={name}>{name}</strong><small>BESTWERTE</small></div><div className="friend-record-bars">{records.map(metric=><button type="button" key={metric.id} style={{'--metric-color':metric.color}} aria-label={`${name}: ${metric.label}, Bestwert ${metric.format(metric.best)}${metric.detail ? ', '+metric.detail(metric.record) : ''}. Einheit ansehen.`} onClick={()=>onSelect({...metric.record,comparisonOwner:name})}><span className="friend-record-value" style={{bottom:`calc(${metric.best/metric.maximum*100}% + 4px)`}}>{metric.format(metric.best)}</span><i style={{height:`${metric.best/metric.maximum*100}%`}}/></button>)}</div><span className="friend-record-axis-label">REKORDE</span></aside>
}
export function FriendRecordSummary({ rows, metrics, name, onSelect }) {
  if(!rows.length)return null
  const records=friendMetricRecords(rows,metrics)
  const items=records.map(metric=><button key={metric.id} onClick={()=>onSelect({...metric.record,comparisonOwner:name})}><span>{metric.label}: <strong>{metric.format(metric.best)}</strong></span>{metric.detail && <b className="record-double-context">{metric.detail(metric.record)}</b>}<time>{new Date(metric.record.created_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</time></button>)
  return <div className="friend-record-summary"><p>Rechts: persönliche Bestwerte von <strong>{name}</strong> aus allen Einheiten dieser Auswahl. Die Bestwerte können aus verschiedenen Einheiten stammen.</p>{records.some(metric=>metric.detail) ? <div className="friend-double-balance" aria-label={`Doppel-Bilanz von ${name}`}>{items}</div> : <details><summary>Bestwerte von {name} ansehen</summary>{items}</details>}</div>
}
