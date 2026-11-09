export const METRONOME_TONES = [{id:'click',label:'Klick',frequency:1050,type:'sine',length:.06},{id:'wood',label:'Holz',frequency:420,type:'triangle',length:.09},{id:'bell',label:'Glocke',frequency:660,type:'sine',length:.24}]
export const MAX_METRONOME_STEPS=100
export const newMetronomeStep = (index=0) => ({id:globalThis.crypto?.randomUUID?.()??`step-${Date.now()}-${index}-${Math.random()}`,label:index===0?'An die Oche stellen':`Abschnitt ${index+1}`,unit:'seconds',value:index===0?1:3,beats:1,tone:'click',volume:75})
const bounded=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback
export function normalizeMetronome(value) {
 const steps=(Array.isArray(value?.steps)&&value.steps.length?value.steps:[newMetronomeStep()]).slice(0,MAX_METRONOME_STEPS).map((step,index)=>({id:`step-${index}`,label:String(step.label??`Abschnitt ${index+1}`).slice(0,60),unit:step.unit==='bpm'?'bpm':'seconds',value:bounded(step.value,step.unit==='bpm'?1:.1,step.unit==='bpm'?300:600,3),beats:Math.round(bounded(step.beats,1,100,1)),volume:Math.round(bounded(step.volume??75,0,100,75)),tone:METRONOME_TONES.some(t=>t.id===step.tone)?step.tone:'click'}))
 return {version:1,name:String(value?.name??'Mein Wurfrhythmus').slice(0,60),loop:value?.loop!==false,loopGap:bounded(value?.loopGap,.1,600,3),steps}
}
export const stepInterval = step => step.unit==='bpm'?60/step.value:step.value
export function compileMetronome(value) {
 const config=normalizeMetronome(value),events=[];let time=0
 config.steps.forEach((step,index)=>{for(let beat=0;beat<step.beats;beat++){if(index>0||beat>0)time+=stepInterval(step);events.push({at:time,step:index,beat:beat+1,label:step.label,tone:step.tone,volume:step.volume})}})
 return {events,duration:time+config.loopGap,loop:config.loop}
}
export function metronomePosition(sequence,elapsed) {
 const seconds=Math.max(0,elapsed),cycle=sequence.loop?Math.floor(seconds/sequence.duration):0,local=sequence.loop?seconds%sequence.duration:seconds
 let index=0;for(let i=1;i<sequence.events.length&&sequence.events[i].at<=local;i++)index=i
 const event=sequence.events[index],next=sequence.events[index+1]
 return {event,cycle:cycle+1,next:next??(sequence.loop?sequence.events[0]:null),remaining:next?next.at-local:Math.max(0,sequence.duration-local),done:!sequence.loop&&local>=sequence.duration}
}
export function dartMetronomePreset() {
 // Technique sequence informed by Winmau's set-up analysis and Phoenix Darts' throwing guide.
 // Timing and volume are editable practice suggestions, not a prescribed throwing speed.
 const rows=[
  ['Start · Hinter der Oche stehen',2,'bell',90],
  ['Zur Oche gehen',2,'click',65],
  ['Füße ausrichten · Stabil stehen',2,'wood',60],
  ['Blick zum Board heben',1.5,'click',55],
  ['Zielpunkt auswählen und fokussieren',2,'click',55],
  ['Ruhig durchatmen · Schultern locker',2,'wood',45],
 ]
 for(let dart=1;dart<=3;dart++)rows.push(
  [`Pfeil ${dart} · ${dart===1?'Ersten Pfeil greifen':'Nächsten Pfeil nehmen'}`,1.5,'click',60],
  [`Pfeil ${dart} · Griff locker prüfen`,1,'wood',45],
  [`Pfeil ${dart} · Zielpunkt fokussieren`,1.5,'click',55],
  [`Pfeil ${dart} · Arm heben`,1.2,'click',65],
  [`Pfeil ${dart} · Arm ruhig zurückziehen`,.8,'wood',55],
  [`Pfeil ${dart} · Werfen und Arm nachführen`,.5,'bell',90],
  [`Pfeil ${dart} · Arm entspannt senken`,.8,'wood',45],
  [`Pfeil ${dart} · Ruhig durchatmen`,1.5,'click',45],
 )
 rows.push(
  ['Drei Pfeile geworfen · Treffer ansehen',1.5,'bell',75],
  ['Zum Board gehen',1,'click',65],
  ['Pfeile herausziehen',4,'wood',60],
  ['Vom Board zur Oche zurückgehen',3,'click',65],
  ['Wieder hinter der Oche aufstellen',4,'wood',55],
  ['Schultern und Wurfarm lockern',1.5,'wood',45],
  ['Ruhig durchatmen',1.5,'click',45],
  ['Fertig · Bereit für die nächste Runde',2,'bell',85],
 )
 const steps=rows.map(([label,value,tone,volume],index)=>({...newMetronomeStep(index),label,value,tone,volume}))
 return normalizeMetronome({name:'Standardvorlage',steps,loop:true,loopGap:2})
}

const storageKey=(userId,free)=>`dartquest-metronome-${free?'free-board':userId??'guest'}-v1`
export function loadMetronome(userId,free=false) {try{return normalizeMetronome(JSON.parse(localStorage.getItem(storageKey(userId,free))))}catch{return normalizeMetronome(null)}}
export function saveMetronome(userId,free,config) {localStorage.setItem(storageKey(userId,free),JSON.stringify(normalizeMetronome(config)))}

const slotsKey=(userId,free)=>`dartquest-metronome-${free?'free-board':userId??'guest'}-slots-v1`
export function loadMetronomeSlots(userId,free=false) {
 try {
  const stored=localStorage.getItem(slotsKey(userId,free))
  if(stored!==null){const slots=JSON.parse(stored);return Array.from({length:3},(_,i)=>slots?.[i]?.steps?.length?normalizeMetronome(slots[i]):null)}
  // Offer the previously saved single rhythm in slot 1 without changing it.
  const previous=JSON.parse(localStorage.getItem(storageKey(userId,free)))
  const migrated=[previous?.steps?.length?normalizeMetronome(previous):null,null,null]
  try{localStorage.setItem(slotsKey(userId,free),JSON.stringify(migrated))}catch{/* Still offer the old rhythm when storage is temporarily unavailable. */}
  return migrated
 } catch { return [null,null,null] }
}
export function saveMetronomeSlot(userId,free,index,config) {
 if(!Number.isInteger(index)||index<0||index>2)throw new Error('Ungültiger Speicherplatz')
 const slots=loadMetronomeSlots(userId,free)
 slots[index]=normalizeMetronome({...config,name:String(config.name??'').trim()||`Metronom ${index+1}`})
 localStorage.setItem(slotsKey(userId,free),JSON.stringify(slots))
 return slots
}

export const METRONOME_TRAINING_GAMES=['bulls-warm-up','around-the-clock','focus-switch','double-route']

export function metronomeFromTaps(timestamps,finishedAt) {
 if(!Array.isArray(timestamps)||timestamps.length<1||timestamps.length>MAX_METRONOME_STEPS)throw new Error('Erfasse zwischen 1 und 100 Abschnitten.')
 if(timestamps.some((at,i)=>!Number.isFinite(at)||(i>0&&(at-timestamps[i-1]<100||at-timestamps[i-1]>600000))))throw new Error('Tippabstände müssen zwischen 0,1 und 600 Sekunden liegen.')
 if(!Number.isFinite(finishedAt)||finishedAt<timestamps.at(-1)||finishedAt-timestamps.at(-1)>600000)throw new Error('Die Pause nach dem letzten Tipp ist zu lang. Bitte neu aufnehmen.')
 const steps=timestamps.map((at,index)=>({...newMetronomeStep(index),label:index===0?'Start':`Abschnitt ${index+1}`,unit:'seconds',value:index===0?1:Math.round(at-timestamps[index-1])/1000,beats:1,tone:'click',volume:75}))
 return normalizeMetronome({name:'Schnellanalyse',steps,loop:true,loopGap:Math.max(.1,Math.round(finishedAt-timestamps.at(-1))/1000)})
}
