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
 const phases=[['An die Oche stellen',2,'bell'],['Ausrichten und fokussieren',3,'click'],['Arm heben',2,'click'],['Arm zurückführen',1,'wood'],['Pfeil werfen',1,'bell'],['Nächsten Pfeil nehmen',2,'click']]
 const steps=Array.from({length:3},(_,dart)=>phases.map(([label,value,tone],i)=>({...newMetronomeStep(dart*6+i),label:`Pfeil ${dart+1} · ${label}`,value,tone}))).flat()
 steps.push(...[['Zum Board gehen',5],['Pfeile herausziehen',4],['Zurück hinter die Oche',5]].map(([label,value],i)=>({...newMetronomeStep(18+i),label,value,tone:'bell'})))
 return normalizeMetronome({name:'Drei Pfeile · Wurfroutine',steps,loop:true,loopGap:3})
}
const storageKey=(userId,free)=>`dartquest-metronome-${free?'free-board':userId??'guest'}-v1`
export function loadMetronome(userId,free=false) {try{return normalizeMetronome(JSON.parse(localStorage.getItem(storageKey(userId,free))))}catch{return normalizeMetronome(null)}}
export function saveMetronome(userId,free,config) {localStorage.setItem(storageKey(userId,free),JSON.stringify(normalizeMetronome(config)))}
