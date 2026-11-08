import {TRAINING_VISITS_COLOR} from './trainingChartColors.js'
import { changeFavoriteCombo, changeBullCount, recordTrainingCombo, recordFavoriteSingle, saveFavoriteCombo, favoritePendingCount, isComboGame, beginTimedFinalEntry, remainingSeconds } from './customTrainingRules.js'
export const VISIT_IDLE_MS = 5000
export const hasVisits = run => run?.visitVersion === 1 && Array.isArray(run.visits)
export const isPaused = run => run?.pausedAt != null
export const clockNow = (run, now = Date.now()) => run?.pausedAt ?? now
export const isVisitLocked = (run, now = Date.now()) => (run?.visitBlockedUntil ?? 0) > clockNow(run,now)
function expire(run,now) { return run?.phase==='playing'&&!isPaused(run)&&run.endAt!=null&&remainingSeconds(run.endAt,now)===0 ? {...beginTimedFinalEntry(run,now),finalVisitBase:run.visits?.length} : run }
const editable = run => run && !isPaused(run) && ['playing','bulls-final','final-entry'].includes(run.phase)
const fields = ['doubleBull','singleBull','entries','routeThrows','visits','pendingVisit','visitBlockedUntil','favoriteComboCount','favoriteComboAt','score','choosing','misses']
function snapshot(run) { return Object.fromEntries(fields.map(key=>[key,run[key] ?? (['entries','routeThrows','visits'].includes(key)?[]:['pendingVisit','visitBlockedUntil','favoriteComboAt'].includes(key)?null:run[key])])) }
export function rememberVisit(run, next) { return next === run ? run : {...next,visitUndo:[...(run.visitUndo??[]),snapshot(run)].slice(-30)} }
export function undoVisit(run, now = Date.now()) {
 if(!editable(run)||!run.visitUndo?.length)return run
 const previous=run.visitUndo.at(-1)
 const next={...run,...previous,pendingVisit:previous.pendingVisit?{...previous.pendingVisit,at:now}:null,favoriteComboAt:previous.favoriteComboCount>0?now:null,visitUndo:run.visitUndo.slice(0,-1)}
 if(run.phase==='bulls-final')next.bullsFinalBase={singleBull:Math.min(run.bullsFinalBase.singleBull,next.singleBull),doubleBull:Math.min(run.bullsFinalBase.doubleBull,next.doubleBull)}
 if(run.finalVisitBase!=null)next.finalVisitBase=Math.min(run.finalVisitBase,next.visits.length)
 return next
}
export function toggleTrainingPause(run, now = Date.now()) {
 if(!run||run.phase!=='playing')return run
 if(!isPaused(run))return {...run,pausedAt:now}
 const gap=Math.max(0,now-run.pausedAt)
 return {...run,pausedAt:null,pausedMs:(run.pausedMs??0)+gap,favoriteComboAt:run.favoriteComboAt==null?null:run.favoriteComboAt+gap,visitBlockedUntil:run.visitBlockedUntil==null?null:run.visitBlockedUntil+gap,endAt:run.endAt==null?null:run.endAt+gap,pendingVisit:run.pendingVisit?{...run.pendingVisit,at:run.pendingVisit.at+gap}:null}
}
function commitPending(run) {
 const pending=run.pendingVisit
 if(!pending)return run
 const visit=run.game==='bulls-warm-up'?{singleBull:pending.singleBull??0,doubleBull:pending.doubleBull??0}:{hits:pending.hits??[]}
 const count=run.game==='bulls-warm-up'?visit.singleBull+visit.doubleBull:visit.hits.length
 const next={...run,visits:[...run.visits,visit],pendingVisit:null,...(count===3?{visitBlockedUntil:pending.at+VISIT_IDLE_MS}:{})}
 if(run.game==='double-route')next.routeThrows=[...run.routeThrows,...run.route.map(target=>({target,hit:visit.hits.includes(target)}))]
 return next
}
export function flushVisit(run, now = Date.now(), force = false) {
 if(!hasVisits(run)||isPaused(run)||!run.pendingVisit||(!force&&now-run.pendingVisit.at<VISIT_IDLE_MS))return run
 return commitPending(run)
}
export function enterBullHit(run, field, delta, now=Date.now()) {
 run=expire(run,now)
 if(!hasVisits(run))return changeBullCount(run,field,delta,now)
 if(!editable(run)||(delta>0&&isVisitLocked(run,now)))return run
 let next=flushVisit(run,now)
 if(delta<0){
  if(next.pendingVisit?.[field]>0)next={...next,[field]:next[field]-1,pendingVisit:{...next.pendingVisit,[field]:next.pendingVisit[field]-1,at:now}}
  else return run
  if(!(next.pendingVisit.singleBull+next.pendingVisit.doubleBull))next.pendingVisit=null
  return rememberVisit(run,next)
 }
 if(next.phase==='bulls-final'&&(next.visits.length>(next.finalVisitBase??next.visits.length)))return run
 const pending=next.pendingVisit??{singleBull:0,doubleBull:0,at:now}
 next={...next,[field]:next[field]+1,pendingVisit:{...pending,[field]:pending[field]+1,at:now}}
 if(next.pendingVisit.singleBull+next.pendingVisit.doubleBull===3)next=commitPending(next)
 return rememberVisit(run,next)
}
export function enterRouteHit(run,target,delta=1,now=Date.now()) {
 run=expire(run,now)
 if(!hasVisits(run)||!editable(run)||!run.route.includes(target)||(delta>0&&isVisitLocked(run,now)))return run
 let next=flushVisit(run,now)
 if(next.phase==='final-entry'&&next.visits.length>(next.finalVisitBase??next.visits.length))return run
 const pending=next.pendingVisit??{hits:[],at:now},present=pending.hits.includes(target)
 if((delta>0&&present)||(delta<0&&!present))return run
 const hits=delta>0?[...pending.hits,target]:pending.hits.filter(n=>n!==target)
 next={...next,pendingVisit:hits.length?{hits,at:now}:null}
 if(hits.length===3)next=commitPending(next)
 return rememberVisit(run,next)
}
export function emptyVisit(run,now=Date.now()) {
 run=expire(run,now)
 if(!hasVisits(run)||!editable(run)||isVisitLocked(run,now)||run.pendingVisit||run.score||run.choosing||favoritePendingCount(run))return run
 if(['bulls-final','final-entry'].includes(run.phase)&&run.visits.length>(run.finalVisitBase??run.visits.length))return run
 let next
 if(run.game==='bulls-warm-up')next={...run,visits:[...run.visits,{singleBull:0,doubleBull:0}]}
 else if(run.game==='double-route')next={...run,visits:[...run.visits,{hits:[]}],routeThrows:[...run.routeThrows,...run.route.map(target=>({target,hit:false}))]}
 else next={...run,visits:[...run.visits,{successful:0,failed:1}]}
 return rememberVisit(run,{...next,visitBlockedUntil:now+VISIT_IDLE_MS})
}
export function enterCombo(run,points,count,endedByMiss=true) {
 run=expire(run,Date.now())
 if(hasVisits(run)&&run.phase==='final-entry'&&run.visits.length>run.finalVisitBase)return run
 if(!editable(run)||isVisitLocked(run))return run
 const next=recordTrainingCombo(run,points,count)
 if(next===run||!hasVisits(run))return next
 return rememberVisit(run,{...next,visits:[...run.visits,{successful:count,failed:endedByMiss?1:0}]})
}
export function enterFavoriteSingle(run,now=Date.now()) {
 if(!editable(run)||isVisitLocked(run,now))return run
 const next=recordFavoriteSingle(run,now)
 if(next===run||!hasVisits(run))return next
 return rememberVisit(run,{...next,visits:[...run.visits,{successful:1,failed:0}],visitBlockedUntil:now+VISIT_IDLE_MS})
}
export function enterFavoriteCombo(run) {
 if(!editable(run))return run
 const next=saveFavoriteCombo(run)
 if(next===run||!hasVisits(run))return next
 const hits=favoritePendingCount(run)
 return rememberVisit(run,{...next,visits:[...run.visits,{successful:Math.ceil(hits/3),failed:hits%3===0?1:0}]})
}
export function visitStatistics(run) {
 if(!hasVisits(run))return null
 if(run.game==='around-the-clock') {
  if(!run.completed)return null
  const hits=run.includeBull?21:20,darts=hits+(run.misses??0)
  return {total:Math.ceil(darts/3),hits,darts,misses:run.misses??0,accuracy:hits/darts*100,kind:'darts',partial:true}
 }
 let total=0,successful=0,failed=0,hits=0
 for(const visit of run.visits){
  if(run.game==='bulls-warm-up'||run.game==='double-route'){
   const n=run.game==='bulls-warm-up'?(visit.singleBull+visit.doubleBull):visit.hits.length
   total++;hits+=n;if(n)successful++;else failed++
  }else{successful+=visit.successful;failed+=visit.failed;total+=visit.successful+visit.failed}
 }
 const darts=total*3,kind=isComboGame(run.game)||run.game==='favorite-double'?'visits':'darts'
 return {total,successful,failed,hits,darts,misses:kind==='darts'?darts-hits:null,accuracy:total?(kind==='darts'?hits/darts:successful/total)*100:null,kind}
}

export function visitTimelineSeries(game) {
 const darts=['bulls-warm-up','double-route','around-the-clock'].includes(game)
 return [
 {id:'visits-total',label:'Aufnahmen insgesamt',color:TRAINING_VISITS_COLOR,value:row=>visitStatistics({...row.payload,game:row.game}).total,format:String},
 {id:'visits-failed',label:darts?'Fehlwürfe':'Aufnahmen ohne Ergebnis',color:'#f18a96',value:row=>{const stats=visitStatistics({...row.payload,game:row.game});return darts?stats.misses:stats.failed},format:String},
 ]
}

export function favoriteComboRemaining(run,now=Date.now()) {
 return run?.favoriteComboAt==null||!favoritePendingCount(run)?0:Math.max(0,VISIT_IDLE_MS-(clockNow(run,now)-run.favoriteComboAt))
}
export function flushFavoriteCombo(run,now=Date.now()) {
 if(run?.game!=='favorite-double'||!editable(run)||run.favoriteComboAt==null||!favoritePendingCount(run)||favoriteComboRemaining(run,now)>0)return run
 const next=enterFavoriteCombo(run)
 return next===run?run:{...next,favoriteComboAt:null,visitUndo:run.visitUndo??[]}
}
export function tapFavoriteCombo(run,now=Date.now()) {
 run=expire(run,now)
 if(run?.game!=='favorite-double'||!editable(run)||isVisitLocked(run,now))return run
 const current=flushFavoriteCombo(run,now),next=changeFavoriteCombo(current,1,now)
 return next===current?current:rememberVisit(current,{...next,favoriteComboAt:now})
}
