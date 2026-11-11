import {useEffect,useRef,useState} from 'react'
import {loadMetronomeSlots,compileMetronome} from './metronomeModel'
import {createMetronomePlayer} from './metronomePlayer'
export default function TrainingMetronome({userId,freeTraining=false,disabled=false}) {
 const [open,setOpen]=useState(false),[slots,setSlots]=useState([]),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const player=useRef(null),request=useRef(0)
 useEffect(()=>()=>{request.current++;player.current?.dispose()},[])
 function stop(){request.current++;player.current?.dispose();player.current=null;setName('');setBusy(false)}
 function toggle(){if(player.current){stop();return}setSlots(loadMetronomeSlots(userId,freeTraining));setError('');setOpen(true)}
 async function choose(slot){stop();setOpen(false);setError('');setName(slot.name);setBusy(true);const ticket=++request.current
  const next=createMetronomePlayer(compileMetronome({...slot,loop:true}),{onDone:()=>{if(ticket===request.current)stop()},onError:message=>{if(ticket===request.current){stop();setError(message)}}});player.current=next
  const started=await next.start();if(ticket!==request.current)return
  setBusy(false);if(!started)stop()
 }
 return <div className="training-metronome-control"><button type="button" className="training-metronome-toggle" aria-label={name?`Metronom stoppen · ${name}`:'Metronom auswählen'} aria-pressed={Boolean(name)} disabled={disabled} onClick={toggle}><span aria-hidden="true">{name?'■':'◷'}</span><span>{busy?'STARTET …':name?'METRONOM AN':'METRONOM'}</span></button>{open&&<div className="training-sheet-backdrop" onClick={()=>setOpen(false)}><section className="training-sheet metronome-game-picker" role="dialog" aria-modal="true" aria-label="Metronom auswählen" onClick={event=>event.stopPropagation()}><h2>Metronom auswählen</h2><p>Antippen startet den Ablauf als Schleife. Über den Metronom-Button im Spiel stoppst du ihn wieder.</p>{slots.map((slot,index)=>slot&&<button className="metronome-game-option" key={index} onClick={()=>void choose(slot)}><small>PLATZ {index+1}</small><strong>{slot.name}</strong><span>{slot.steps.length} Abschnitte · {compileMetronome(slot).duration.toLocaleString('de-DE',{maximumFractionDigits:1})} s pro Runde</span></button>)}{!slots.some(Boolean)&&<p>Noch kein Metronom gespeichert. Lege im Metronom-Bereich deines Trainingsplans zuerst einen Ablauf an und speichere ihn auf einem der drei Plätze.</p>}<button onClick={()=>setOpen(false)}>SCHLIESSEN</button></section></div>}{error&&<div className="training-metronome-error" role="alert">{error}<button aria-label="Metronom-Hinweis schließen" onClick={()=>setError('')}>×</button></div>}</div>
}
