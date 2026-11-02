import { FriendTimelineOverlay, FriendTimelineSummary } from './FriendTimelineOverlay'
import { comparisonColumns } from './timelineComparison'
import { useEffect, useRef, useState } from 'react'
import { bullsHistory, bullsRecordGuides } from './bullsHistory'

const date = row => new Date(row.created_at).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
function SessionDialog({ row, onClose, points }) {
  const dialog = useRef(null)
  useEffect(() => { dialog.current.showModal() }, [])
  return <dialog ref={dialog} className="bulls-session-dialog" onClose={onClose} aria-labelledby="bulls-session-title"><span className="bulls-eyebrow">TRAININGSEINHEIT · {row.minutes} MINUTEN</span><h2 id="bulls-session-title">Bulls Warm-Up</h2><time>{date(row)}</time><div className="bulls-detail-score">{points(row)} <small>Punkte</small></div><div className="bulls-detail-counts"><div className="bulls-single"><strong>{row.payload.singleBull}</strong><span>Single Bull · 25</span><small>{row.payload.singleBull * 25} Punkte</small></div><div className="bulls-double"><strong>{row.payload.doubleBull}</strong><span>Doppelbull · 50</span><small>{row.payload.doubleBull * 50} Punkte</small></div></div><button autoFocus onClick={() => dialog.current.close()}>SCHLIESSEN</button></dialog>
}
export default function BullsHistoryChart({ rows, minutes, compareRows = [], compareName }) {
  const [selected, setSelected] = useState(null)
  const { recent, singleRecord, doubleRecord, scoreRecord, points } = bullsHistory(rows)
  const { ceiling } = bullsHistory([...rows,...compareRows])
  const columns = comparisonColumns(recent,compareRows)
  const metrics = [
    {id:'single',label:'Single Bull',color:'#8be8b7',value:row=>row.payload.singleBull,format:String,maximum:ceiling},
    {id:'double',label:'Doppelbull',color:'#f18a96',value:row=>row.payload.doubleBull,format:String,maximum:ceiling},
  ]
  if (!recent.length && !compareRows.length) return <section className="bulls-chart-card"><h2>Dein Verlauf</h2><p>Nach deinem ersten Training erscheint hier dein Vergleich.</p></section>
  const guides = singleRecord ? bullsRecordGuides(singleRecord.payload.singleBull, doubleRecord.payload.doubleBull, ceiling) : []
  const sharedRecord = guides.length === 2 && guides[0].value === guides[1].value
  return <section className="bulls-progress" aria-label="Bulls Warm-Up Verlauf">
    <div className="bulls-chart-card"><div className="bulls-chart-heading"><div><span className="bulls-eyebrow">DEIN VERLAUF · {minutes} MIN.</span><h2>Jede Einheit zählt.</h2></div><span className="bulls-chart-total">Letzte {recent.length} von {rows.length}</span></div>
      <div className="bulls-chart-legend"><span className="bulls-single">Single Bull</span><span className="bulls-double">Doppelbull</span><small>Treffer je Einheit</small></div>
      <div className="bulls-chart-area bulls-chart-with-records"><div className="bulls-chart-axis" aria-hidden="true">{[1,.75,.5,.25,0].filter(f => guides.every(g => Math.abs((1-f)*186 - (g.top*1.86 + g.offset)) > 18)).map(f => <span key={f} style={{top:`${(1-f)*100}%`}}>{Math.round(ceiling*f)}</span>)}</div><div className="bulls-chart-plot">
        <div className="bulls-chart-grid" aria-hidden="true">{[0,25,50,75,100].map(top => <i key={top} style={{top:`${top}%`}}/>)}</div>
        <div className="bulls-chart-columns" style={{gridTemplateColumns:`repeat(${columns}, minmax(0,1fr))`}}>{recent.map((row,index) => <button className="bulls-chart-column" style={{gridColumn:columns-recent.length+index+1}} key={row.id} onClick={() => setSelected(row)} aria-label={`${date(row)}: ${row.payload.singleBull} Single Bull, ${row.payload.doubleBull} Doppelbull, ${points(row)} Punkte. Details öffnen.`}><span className="bulls-chart-bars" aria-hidden="true"><i className="bulls-single-bar" style={{height:`${row.payload.singleBull/ceiling*100}%`}}/><i className="bulls-double-bar" style={{height:`${row.payload.doubleBull/ceiling*100}%`}}/></span><span className="bulls-chart-label" aria-hidden="true">{index+1}</span></button>)}</div>
        <FriendTimelineOverlay rows={compareRows} metrics={metrics} columns={columns} name={compareName}/>
        <div className="bulls-record-guides" role="note" aria-label={guides.map(g => `Rekord ${g.label}: ${g.value} Treffer`).join('. ')}>
          {guides.map((guide,index) => <div key={guide.kind} className={`bulls-record-guide bulls-${guide.kind}`} style={{top:`${guide.top}%`}}>
            {(!sharedRecord || index === 0) && <i className={sharedRecord ? 'is-shared' : ''}/>}
            <span className="bulls-record-axis-value" style={{marginTop:guide.offset}} aria-hidden="true">{guide.value}</span>
            {guide.offset !== 0 && <svg className="bulls-record-leader" width="12" height="24" viewBox="0 0 12 24" style={{top:Math.min(0,guide.offset)-1}} aria-hidden="true"><path d={`M0 ${guide.offset < 0 ? 1 : guide.offset+1} L12 ${guide.offset < 0 ? 1-guide.offset : 1}`}/></svg>}
          </div>)}
        </div>
      </div></div><p className="bulls-chart-hint">Farbige Linien = persönliche Rekorde. Älter → neuer · Balken antippen für Details.</p>
    </div>
    <FriendTimelineSummary rows={compareRows} metrics={metrics} name={compareName}/>
    {recent.length > 0 && <><h2 className="bulls-record-title">DEINE REKORDE · ALLE {minutes}-MIN.-EINHEITEN</h2>
    <div className="bulls-records">{[['single','Single Bull',singleRecord,singleRecord.payload.singleBull,'Treffer'],['double','Doppelbull',doubleRecord,doubleRecord.payload.doubleBull,'Treffer'],['score','Gesamtpunkte',scoreRecord,points(scoreRecord),'Punkte']].map(([kind,title,row,value,unit]) => <button key={kind} className={`bulls-record bulls-${kind}`} onClick={() => setSelected(row)}><span>{title}</span><strong>{value}<small>{unit}</small></strong><time>{new Date(row.created_at).toLocaleDateString('de-DE')}</time><small>Einheit ansehen ↗</small></button>)}</div>
    <p className="bulls-record-hint">Die Rekorde bleiben sichtbar, auch wenn die Einheit nicht mehr unter den letzten zehn ist. Einzelrekorde können aus verschiedenen Einheiten stammen.</p></>}
    {selected && <SessionDialog row={selected} points={points} onClose={() => setSelected(null)}/>}
  </section>
}
