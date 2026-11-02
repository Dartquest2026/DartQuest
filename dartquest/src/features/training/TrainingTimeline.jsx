import { FriendRecordBars, FriendRecordSummary } from './FriendRecordComparison'
import { useEffect, useRef, useState } from 'react'
import { trainingTimeline } from './trainingTimelineData'
import { CUSTOM_GAMES, routeLabel, aroundVariant, isAroundClock, pointsLabel, summary } from './customTrainingRules'
import CustomTrainingDetails from './CustomTrainingDetails'
const date = row => new Date(row.created_at).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
function SessionDialog({ row, onClose }) {
  const dialog = useRef(null)
  useEffect(() => { dialog.current.showModal() }, [])
  return <dialog ref={dialog} className="bulls-session-dialog timeline-session-dialog" onClose={onClose} aria-labelledby="timeline-session-title"><span className="bulls-eyebrow">TRAININGSEINHEIT · {isAroundClock(row.game) ? aroundVariant(row.payload.includeBull) : `${row.minutes} MINUTEN`}</span><h2 id="timeline-session-title">{CUSTOM_GAMES.find(g => g.id === row.game)?.title}</h2><time>{date(row)}</time>{row.comparisonOwner && <p>{row.comparisonOwner} · persönliche Bestleistung</p>}<div className="bulls-detail-score">{isAroundClock(row.game) ? `${row.payload.misses} Fehlwürfe` : pointsLabel(summary({...row.payload,game:row.game}).points)}</div><CustomTrainingDetails run={{...row.payload,game:row.game}} showEntries/><button autoFocus onClick={() => dialog.current.close()}>SCHLIESSEN</button></dialog>
}
export default function TrainingTimeline({ rows, game, minutes, route, includeBull, compareRows = [], compareName }) {
  const [selected, setSelected] = useState(null)
  const { recent, series: ownSeries } = trainingTimeline(rows,game,route)
  const scaleSeries = trainingTimeline([...rows,...compareRows],game,route).series
  const series = ownSeries.map((metric,i)=>({...metric,maximum:scaleSeries[i].maximum}))
  const columns = Math.max(1,recent.length)
  const clock = isAroundClock(game), shared = game === 'double-route'
  const variant = clock ? aroundVariant(includeBull) : `${minutes} MIN.`
  if (!recent.length && !compareRows.length) return <section className="bulls-chart-card"><h2>Dein Verlauf</h2><p>Nach deinem ersten Training erscheint hier dein Vergleich.</p></section>
  const axes = shared ? [series[0]] : series
  return <section className="bulls-progress training-timeline" aria-label="Trainingsverlauf">
    <div className="bulls-chart-card"><div className="bulls-chart-heading"><div><span className="bulls-eyebrow">DEIN VERLAUF · {variant}</span><h2>Deine letzten Einheiten.</h2></div><span className="bulls-chart-total">Letzte {recent.length} von {rows.length}</span></div>
      {game === 'double-route' && <p className="timeline-double-route">Doppelweg: <strong>{routeLabel(route)}</strong></p>}
      <div className="timeline-legend">{series.map(metric => <span key={metric.id} style={{'--metric-color':metric.color}}>{metric.label}{clock ? ' ↓' : ' ↑'}</span>)}</div>
      <p className="timeline-scale-hint">{shared ? 'Gemeinsame Skala: Treffer je Doppel.' : `Links: ${series[0].label} · rechts: ${series[1].label}. Eigene Skala je Wert.`}{clock ? ' Kürzer ist besser.' : ''}</p>
      <div className={`timeline-chart-area${shared ? ' is-shared' : ''}${compareRows.length ? ' has-friend-records' : ''}`}>
        <div className="timeline-axis" style={{color:series[0].color}} aria-hidden="true">{[1,.75,.5,.25,0].map(f => <span key={f} style={{top:`${(1-f)*100}%`}}>{series[0].format(series[0].maximum*f)}</span>)}</div>
        <div className={`bulls-chart-plot${compareRows.length ? ' has-friend-records' : ''}`}><div className="bulls-chart-grid" aria-hidden="true">{[0,25,50,75,100].map(top => <i key={top} style={{top:`${top}%`}}/>)}</div><div className="bulls-chart-columns" style={{gridTemplateColumns:`repeat(${columns}, minmax(0,1fr))`}}>{recent.map((row,index) => <button key={row.id} style={{gridColumn:columns-recent.length+index+1}} className="bulls-chart-column" onClick={() => setSelected(row)} aria-label={`${row.payload.trainingName ? row.payload.trainingName + ", " : ""}${date(row)}: ${series.map(m => `${m.label}: ${m.format(m.value(row))}${m.detail ? ', '+m.detail(row) : ''}`).join(', ')}. Details öffnen.`}><span className="bulls-chart-bars timeline-bars" aria-hidden="true">{series.map(metric => <i key={metric.id} style={{height:`${metric.value(row)/metric.maximum*100}%`,'--metric-color':metric.color}}/>)}</span><span className="bulls-chart-label" aria-hidden="true">{row.payload.trainingName || index+1}</span></button>)}</div><FriendRecordBars rows={compareRows} metrics={series} name={compareName} onSelect={setSelected}/></div>
        {!shared && <div className="timeline-axis is-right" style={{color:axes[1].color}} aria-hidden="true">{[1,.75,.5,.25,0].map(f => <span key={f} style={{top:`${(1-f)*100}%`}}>{axes[1].format(axes[1].maximum*f)}</span>)}</div>}
      </div><p className="bulls-chart-hint">Älter → neuer · Einheit antippen für Datum und Ergebnis.</p>
    </div>
    <FriendRecordSummary rows={compareRows} metrics={series} name={compareName} onSelect={setSelected}/>
    {recent.length > 0 && <><h2 className="bulls-record-title">DEINE REKORDE · {variant}</h2><div className="bulls-records timeline-records">{series.map(metric => <button key={metric.id} className="bulls-record timeline-record" style={{'--metric-color':metric.color}} onClick={() => setSelected(metric.record)}><span>{metric.lower ? metric.id === 'time' ? 'Schnellste Zeit' : 'Wenigste Fehlwürfe' : metric.label}</span><strong>{metric.format(metric.value(metric.record))}</strong>{metric.detail && <span className="record-double-context">{metric.detail(metric.record)}</span>}{metric.record.payload.trainingName && <span className="training-player-name">{metric.record.payload.trainingName}</span>}<time>{new Date(metric.record.created_at).toLocaleDateString('de-DE')}</time><small>Einheit ansehen ↗</small></button>)}</div>
    <p className="bulls-record-hint">Bestwerte aus allen Einheiten dieser Auswahl bleiben sichtbar. Die Skalen berücksichtigen den gesamten Verlauf; dadurch bleiben die Balkenhöhen vergleichbar.{!shared && ' Die Farben haben unterschiedliche Einheiten – ihre Höhen sind nicht direkt miteinander vergleichbar.'}</p></>}
    {selected && <SessionDialog row={selected} onClose={() => setSelected(null)}/>}
  </section>
}
