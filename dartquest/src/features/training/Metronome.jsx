import MetronomeQuickCapture from './MetronomeQuickCapture'
import MetronomeSlots from './MetronomeSlots'
import {useEffect,useMemo,useRef,useState} from 'react'
import {MAX_METRONOME_STEPS,METRONOME_TONES,newMetronomeStep,normalizeMetronome,compileMetronome,metronomePosition,dartMetronomePreset,loadMetronome,saveMetronome} from './metronomeModel'
import {createMetronomePlayer} from './metronomePlayer'
import './Metronome.css'
const seconds=value=>value.toLocaleString('de-DE',{maximumFractionDigits:1})
function Step({step,index,first,last,disabled,copyDisabled,onChange,onMove,onCopy,onRemove,onPreview}) {
 return <article className="metronome-step"><div className="metronome-step-heading"><b>{index+1}</b><input aria-label={`Name Abschnitt ${index+1}`} maxLength={60} value={step.label} onChange={e=>onChange({label:e.target.value})}/><button aria-label={`Abschnitt ${index+1} entfernen`} disabled={disabled} onClick={onRemove}>×</button></div><div className="metronome-step-timing"><label>{first?'Abstand bei Wiederholung':'Abstand zum vorherigen Ton'}<div className="metronome-time-input"><input aria-label={`Zeitwert Abschnitt ${index+1}`} type="number" min={step.unit==='bpm'?1:.1} max={step.unit==='bpm'?300:600} step={step.unit==='bpm'?1:.1} value={step.value} onChange={e=>onChange({value:e.target.value})}/><select aria-label={`Zeiteinheit Abschnitt ${index+1}`} value={step.unit} onChange={e=>onChange({unit:e.target.value,value:step.unit==='bpm'?Number((60/Number(step.value||60)).toFixed(1)):Math.round(60/Number(step.value||1))})}><option value="seconds">Sekunden</option><option value="bpm">BPM</option></select></div></label><label>Töne in diesem Abschnitt<input aria-label={`Tonanzahl Abschnitt ${index+1}`} type="number" min={1} max={100} step={1} value={step.beats} onChange={e=>onChange({beats:e.target.value})}/></label></div>{first&&<p className="metronome-first-note">Der erste Ton kommt sofort bei 0:00. Der Abstand gilt hier nur für weitere Töne.</p>}<div className="metronome-tone-row" role="group" aria-label={`Ton Abschnitt ${index+1}`}>{METRONOME_TONES.map(tone=><button key={tone.id} aria-pressed={step.tone===tone.id} onClick={()=>{onChange({tone:tone.id});onPreview(tone.id,step.volume??75)}}>{tone.label}</button>)}</div><div className="metronome-volume"><label>Lautstärke <output>{step.volume??75} %</output><input aria-label={`Lautstärke Abschnitt ${index+1}`} type="range" min={0} max={100} step={5} value={step.volume??75} onChange={e=>onChange({volume:Number(e.target.value)})}/></label><button aria-label={`Hörprobe Abschnitt ${index+1}`} onClick={()=>onPreview(step.tone,step.volume??75)}>▶ HÖRPROBE</button></div><div className="metronome-step-tools"><button disabled={first} aria-label={`Abschnitt ${index+1} nach oben`} onClick={()=>onMove(-1)}>↑</button><button disabled={last} aria-label={`Abschnitt ${index+1} nach unten`} onClick={()=>onMove(1)}>↓</button><button disabled={copyDisabled} onClick={onCopy}>Duplizieren</button></div></article>
}

function MetronomeTimeline({config, sequence, selected, onSelect, onChange, onAppend, onPreview}) {
 const sections = []
 for (const event of sequence.events) {
  if (event.beat === 1) sections.push({start:event.at, end:event.at})
  else sections[event.step].end = event.at
 }
 const time = value => value.toLocaleString('de-DE', {maximumFractionDigits:3})
 return <section className="metronome-timeline" aria-label="Zeitleiste">
  <h2>Zeitleiste</h2>
  <ol>
   {config.steps.map((step,index) => {
    const {start,end} = sections[index]
    const gap = index ? start - sections[index-1].end : 0
    const expanded = selected === step.id
    const tone = METRONOME_TONES.find(tone => tone.id === step.tone)?.label
    return <li key={step.id}>
     {index > 0 && <div className="metronome-timeline-gap" style={{minHeight: Math.min(100, 22 + gap * 8)}}>+ {time(gap)} s</div>}
     <button className="metronome-timeline-point" aria-expanded={expanded} onClick={() => onSelect(expanded ? null : step.id)}>
      <span className="metronome-timeline-time">{time(start)} s</span>
      <span><strong>{step.label || `Abschnitt ${index+1}`}</strong>
       <small>{tone} · {step.volume ?? 75} %{end > start && ` · ${step.beats} Töne bis ${time(end)} s`}</small></span>
      <span aria-hidden="true">{expanded ? '−' : '+'}</span>
     </button>
     {expanded && <Step step={step} index={index} first={index===0} last={index===config.steps.length-1}
      disabled={config.steps.length===1} copyDisabled={config.steps.length>=MAX_METRONOME_STEPS}
      onChange={values => onChange(old => ({...old,steps:old.steps.map(item => item.id===step.id ? {...item,...values} : item)}))}
      onRemove={() => {onSelect(null);onChange(old => ({...old,steps:old.steps.filter(item => item.id!==step.id)}))}}
      onMove={direction => onChange(old => {
       const steps = [...old.steps]
       const destination = index + direction
       ;[steps[index],steps[destination]] = [steps[destination],steps[index]]
       return {...old,steps}
      })}
      onCopy={() => {
       const copy = {...step,id:newMetronomeStep().id}
       onChange(old => ({...old,steps:[...old.steps.slice(0,index+1),copy,...old.steps.slice(index+1)]}))
       onSelect(copy.id)
      }} onPreview={onPreview}/>}
    </li>
   })}
  </ol>
  <button className="metronome-add" disabled={config.steps.length>=MAX_METRONOME_STEPS} onClick={onAppend}>＋ Punkt hinzufügen <small>{config.steps.length} / 100</small></button>
  <div className="metronome-timeline-end"><label>{config.loop?'Abstand zur nächsten Runde':'Abstand bis zum Ende'}<div><input aria-label="Abstand bis Rundenende" type="number" min={0} max={600} step={.1} value={config.loopGap} onChange={e=>onChange(old=>({...old,loopGap:e.target.value}))}/> Sekunden</div></label><small>0 s = keine zusätzliche Pause</small></div>
 </section>
}

export default function Metronome({userId,freeTraining=false,onBack}) {
 const [config,setConfig]=useState(()=>loadMetronome(userId,freeTraining)),[live,setLive]=useState(false),[running,setRunning]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saveError,setSaveError]=useState(''),[position,setPosition]=useState(null)
 const [quick,setQuick]=useState(false)
 const [selected,setSelected]=useState(null)
 const player=useRef(null),preview=useRef(null),request=useRef(0)
 useEffect(()=>{let active=true;void Promise.resolve().then(()=>{try{saveMetronome(userId,freeTraining,config);if(active)setSaveError('')}catch{if(active)setSaveError('Speichern auf diesem Gerät nicht möglich. Dein Ablauf bleibt bis zum Verlassen geöffnet.')}});return()=>{active=false}},[config,userId,freeTraining])
 useEffect(()=>()=>{request.current++;player.current?.dispose();preview.current?.dispose()},[])
 const sequence=useMemo(()=>compileMetronome(config),[config]),current=position??metronomePosition(sequence,0)

 function change(next){if(typeof next!=='function')setSelected(null);setConfig(old=>typeof next==='function'?next(old):next)}
 function stop(){player.current?.stop();setRunning(false);setError('')}
 function edit(){request.current++;setBusy(false);stop();player.current?.dispose();player.current=null;setPosition(null);setLive(false)}
 async function start(){if(busy)return;const ticket=++request.current;setBusy(true);setError('');preview.current?.dispose();preview.current=null
  if(!player.current){const normalized=normalizeMetronome(config);setConfig(normalized);player.current=createMetronomePlayer(compileMetronome(normalized),{onPosition:setPosition,onDone:()=>setRunning(false),onError:message=>{setError(message);setRunning(false)}})}
  const started=await player.current.start();if(ticket!==request.current)return;setRunning(started);setLive(true);setBusy(false)
 }
 function hear(tone,volume){preview.current??=createMetronomePlayer(compileMetronome(config));void preview.current.preview(tone,volume)}
 function append(){if(config.steps.length>=MAX_METRONOME_STEPS)return;const added=newMetronomeStep(config.steps.length);change(old=>({...old,steps:[...old.steps,added]}));setSelected(added.id)}
 const nextLabel=current.next?.label||'Ablauf beendet'
 if(quick)return <MetronomeQuickCapture onCancel={()=>setQuick(false)} onComplete={captured=>{setConfig(captured);setSelected(null);setPosition(null);setQuick(false)}}/>
 return <main className={`custom-training training-builder metronome-screen${live?' is-live':''}`}><header className="training-page-header"><button aria-label={live?'Ablauf bearbeiten':'Zurück zum Trainingsplan'} onClick={()=>live?edit():onBack()}>‹</button><div><span>DEIN TRAININGSRHYTHMUS</span><h1>Metronom</h1></div></header>{error&&<p role="alert" className="metronome-error">{error}</p>}{live?<><section className="metronome-live-card"><span>{running?'LÄUFT':current.done?'BEENDET':'PAUSIERT'} · RUNDE {current.cycle}</span><div className="metronome-beat-dot" key={`${current.cycle}-${current.event.step}-${current.event.beat}`} data-running={running}/><small>ABSCHNITT {current.event.step+1} / {config.steps.length}{config.steps[current.event.step].beats>1?` · TON ${current.event.beat} / ${config.steps[current.event.step].beats}`:''}</small><h2 aria-live="polite" aria-atomic="true">{current.event.label||`Abschnitt ${current.event.step+1}`}</h2><div className="metronome-next"><span>{current.next?'NÄCHSTER TON IN':'ABLAUF ENDET IN'}</span><strong role="timer">{seconds(current.remaining)} <small>s</small></strong><p>{nextLabel}</p></div></section><div className="metronome-play-controls">{running?<button className="metronome-primary" onClick={()=>{player.current.pause();setRunning(false)}}>PAUSE</button>:<button className="metronome-primary" disabled={busy} onClick={()=>{if(current.done)stop();void start()}}>{busy?'STARTET …':current.done?'NEU STARTEN':'FORTSETZEN'}</button>}<button onClick={stop}>STOPP · ANFANG</button><button onClick={edit}>ABLAUF BEARBEITEN</button></div></>:<><div className="metronome-intro"><p>Baue deinen Ablauf: erster Ton sofort, danach die Abstände selbst bestimmen. Jeder Abschnitt kann ein anderes Tempo und einen anderen Ton haben.</p><label>Name deines Ablaufs<input value={config.name} maxLength={60} onChange={e=>change({...config,name:e.target.value})}/></label><button className="metronome-quick-launch" onClick={()=>{request.current++;preview.current?.dispose();preview.current=null;player.current?.dispose();player.current=null;setQuick(true)}}><strong>◉ SCHNELLANALYSE</strong><span>Rhythmus tippen statt Zeiten eingeben</span></button><div className="metronome-preset-actions"><button onClick={()=>change(dartMetronomePreset())}>STANDARDVORLAGE</button><button onClick={()=>change(normalizeMetronome(null))}>LEER BEGINNEN</button></div></div><MetronomeTimeline config={config} sequence={sequence} selected={selected} onSelect={setSelected} onChange={change} onAppend={append} onPreview={hear}/><MetronomeSlots userId={userId} freeTraining={freeTraining} config={config} onLoad={change}/><section className="metronome-loop"><label><input type="checkbox" checked={config.loop} onChange={e=>change({...config,loop:e.target.checked})}/> Ablauf als Schleife wiederholen</label><p>{sequence.events.length} Töne · {seconds(sequence.duration)} Sekunden pro Runde</p></section><p className="metronome-save-note" role="status">{saveError||'Dein Entwurf wird automatisch auf diesem Gerät gespeichert. Für die Auswahl im Training auf einem der drei Plätze speichern.'}</p><div className="metronome-start-dock"><button className="metronome-primary" disabled={busy} onClick={start}>{busy?'STARTET …':'METRONOM STARTEN'}</button></div></>}</main>
}
