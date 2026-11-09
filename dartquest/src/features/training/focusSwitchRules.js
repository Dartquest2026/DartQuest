import {FOCUS_CHECKOUT_ROUTES} from './focusCheckoutRoutes.js'
import { beginTimedFinalEntry, remainingSeconds } from './customTrainingRules.js'
import { isPaused, rememberVisit } from './trainingVisits.js'
export const FOCUS_GAME = 'focus-switch'
export const focusVariant = size => size === 3 ? 'Dreier-Folge' : 'Zweier-Folge'
export function focusFieldPoints(label) {
 if(label==='SB')return 25
 if(label==='DB')return 50
 if(!/^[SDT]([1-9]|1[0-9]|20)$/.test(label))return undefined
 return Number(label.slice(1))*({S:1,D:2,T:3}[label[0]])
}
export function createFocusTask(size=2, previous=null, random=Math.random) {
 size=size===3?3:2
 const pick=list=>list[Math.min(list.length-1,Math.max(0,Math.floor(random()*list.length)))]
 // A 25% chance after normal tasks, never back-to-back: about one in five overall.
 if(previous?.kind!=='single'&&random()<.25){
  const available=Array.from({length:11},(_,i)=>'S'+(i+10)),fields=[]
  for(let i=0;i<size;i++){const field=pick(available);fields.push(field);available.splice(available.indexOf(field),1)}
  return {kind:'single',fields,rest:fields.reduce((sum,field)=>sum+focusFieldPoints(field),0)}
 }
 const candidates=FOCUS_CHECKOUT_ROUTES.filter(task=>task.fields.length===size&&task.fields.join('|')!==previous?.fields.join('|'))
 const rests=[...new Set(candidates.map(task=>task.rest))]
 const rest=pick(rests),task=pick(candidates.filter(task=>task.rest===rest))
 return {kind:'checkout',rest:task.rest,fields:[...task.fields]}
}
export function normalizeFocusRun(run) {
 if(run?.game!==FOCUS_GAME||!['playing','final-entry'].includes(run.phase))return run
 const single=run.focusTask?.kind==='single'&&run.focusTask.fields?.length===(run.focusSize===3?3:2)&&new Set(run.focusTask.fields).size===run.focusTask.fields.length&&run.focusTask.fields.every(field=>/^S(1[0-9]|20)$/.test(field))&&run.focusTask.rest===run.focusTask.fields.reduce((sum,field)=>sum+focusFieldPoints(field),0)
 const supported=single||FOCUS_CHECKOUT_ROUTES.some(task=>task.fields.length===(run.focusSize===3?3:2)&&task.rest===run.focusTask?.rest&&task.fields.join('|')===run.focusTask?.fields?.join('|'))
 return {...run,visitBlockedUntil:null,focusTask:supported?run.focusTask:createFocusTask(run.focusSize)}
}
export function focusStats(run) {
 const size=run.focusSize===3?3:2, attempts=run.focusAttempts??[]
 const counts=Array.from({length:size+1},(_,n)=>attempts.filter(a=>a.hits===n).length)
 return {size,total:attempts.length,counts,complete:counts[size],accuracy:attempts.length?counts[size]/attempts.length*100:0}
}
export function enterFocusResult(run,hits,now=Date.now(),random=Math.random) {
 if(run?.game!==FOCUS_GAME||isPaused(run))return run
 const size=run.focusSize===3?3:2
 if(!Number.isInteger(hits)||hits<0||hits>size)return run
 let current=run
 if(current.phase==='playing'&&remainingSeconds(current.endAt,now)===0)current={...beginTimedFinalEntry(current,now),finalVisitBase:current.visits.length}
 if(!['playing','final-entry'].includes(current.phase)||(current.phase==='final-entry'&&current.visits.length>current.finalVisitBase))return run
 const task=current.focusTask
 if(!task)return run
 const attempt={...task,fields:[...task.fields],hits}
 return rememberVisit(run,{...current,focusAttempts:[...(current.focusAttempts??[]),attempt],visits:[...current.visits,{successful:hits===size?1:0,failed:hits===size?0:1}],focusTask:createFocusTask(size,task,random),visitBlockedUntil:null})
}
