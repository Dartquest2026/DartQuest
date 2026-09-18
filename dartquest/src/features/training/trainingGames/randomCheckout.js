import {getMinimumCheckoutDarts,isReachableCheckout} from './checkoutMath.js'

export const RANDOM_CHECKOUT_DEFAULTS=Object.freeze({from:2,to:60,maxVisits:1,goalType:'time',minutes:10,targetCheckoutCount:20})

export function normalizeRandomConfig(config={}){
  const from=Math.max(2,Math.min(170,Math.round(Number(config.from)||2)))
  const to=Math.max(from,Math.min(170,Math.round(Number(config.to)||60)))
  return {from,to,maxVisits:[1,2,3].includes(Number(config.maxVisits))?Number(config.maxVisits):1,goalType:config.goalType==='checkoutCount'?'checkoutCount':'time',minutes:[10,15,20].includes(Number(config.minutes))?Number(config.minutes):10,targetCheckoutCount:Math.max(1,Math.min(200,Math.round(Number(config.targetCheckoutCount)||20)))}
}

export const isCheckoutPossibleWithinDarts=(score,maxDarts)=>isReachableCheckout(score,maxDarts)

export function getCheckoutPool(config){const c=normalizeRandomConfig(config),allowed=c.maxVisits*3;return Array.from({length:c.to-c.from+1},(_,i)=>c.from+i).filter(target=>isCheckoutPossibleWithinDarts(target,allowed))}
export function generateCheckoutTarget(config,previous=null,random=Math.random){const pool=getCheckoutPool(config);const choices=pool.length>1?pool.filter(target=>target!==previous):pool;return choices[Math.floor(random()*choices.length)]??null}

export function createRandomCheckoutState(config={},random=Math.random){const c=normalizeRandomConfig(config);return{config:c,goalType:c.goalType,durationMinutes:c.goalType==='time'?c.minutes:null,targetCheckoutCount:c.goalType==='checkoutCount'?c.targetCheckoutCount:null,currentTarget:generateCheckoutTarget(c,null,random),currentVisit:1,attempts:[],totalTasks:0,successes:0,failures:0,perfectCheckouts:0,successRate:0,perfectRate:0,totalDartsOnSuccess:0,highestSuccessfulCheckout:0,complete:false}}

function finishAttempt(state,success,dartsUsed,random){
  const allowedDarts=state.config.maxVisits*3
  const used=Math.max(1,Math.min(allowedDarts,Number(dartsUsed)||allowedDarts))
  const minimumDarts=getMinimumCheckoutDarts(state.currentTarget,allowedDarts)
  const perfect=Boolean(success&&used===minimumDarts)
  const attempt={target:state.currentTarget,success:Boolean(success),dartsUsed:used,totalDartsUsed:used,allowedDarts,minimumDarts,perfect,timestamp:new Date().toISOString(),order:state.attempts.length+1,position:state.attempts.length+1}
  const attempts=[...state.attempts,attempt]
  const complete=state.config.goalType==='checkoutCount'&&attempts.length>=state.config.targetCheckoutCount
  const successes=state.successes+Number(success),failures=state.failures+Number(!success),perfectCheckouts=state.perfectCheckouts+Number(perfect)
  return {...state,currentTarget:complete?state.currentTarget:generateCheckoutTarget(state.config,state.currentTarget,random),currentVisit:1,attempts,totalTasks:attempts.length,successes,failures,perfectCheckouts,successRate:successes/attempts.length*100,perfectRate:perfectCheckouts/attempts.length*100,totalDartsOnSuccess:state.totalDartsOnSuccess+(success?used:0),highestSuccessfulCheckout:Math.max(state.highestSuccessfulCheckout,success?state.currentTarget:0),complete}
}

export function getRandomCheckoutDartOptions(state){
  const minimum=getMinimumCheckoutDarts(state.currentTarget,state.config.maxVisits*3)
  const alreadyUsed=(state.currentVisit-1)*3
  return [1,2,3].filter(darts=>alreadyUsed+darts>=minimum&&alreadyUsed+darts<=state.config.maxVisits*3)
}

export function recordRandomCheckout(state,{success,dartsUsed},random=Math.random){if(state.complete||state.currentTarget==null)return state;const total=(state.currentVisit-1)*3+Math.max(1,Math.min(3,Number(dartsUsed)||3));return finishAttempt(state,Boolean(success),success?total:state.config.maxVisits*3,random)}

export function advanceRandomCheckoutVisit(state,random=Math.random){if(state.complete)return state;if(state.currentVisit<state.config.maxVisits)return{...state,currentVisit:state.currentVisit+1};return finishAttempt(state,false,state.config.maxVisits*3,random)}

export function randomCheckoutSummary(state){const totalTasks=state.attempts.length;return{goalType:state.config.goalType,durationMinutes:state.config.goalType==='time'?state.config.minutes:null,targetCheckoutCount:state.config.goalType==='checkoutCount'?state.config.targetCheckoutCount:null,totalTasks,successes:state.successes,failures:state.failures,perfectCheckouts:state.perfectCheckouts,successRate:totalTasks?state.successes/totalTasks*100:0,perfectRate:totalTasks?state.perfectCheckouts/totalTasks*100:0}}

export function aggregateCheckoutNumbers(sessions){const result={};for(const session of sessions)for(const attempt of session.attempts??[]){const row=result[attempt.target]??{target:attempt.target,attempts:0,successes:0,failures:0,totalDartsOnSuccessfulCheckouts:0,perfectCheckouts:0,bestDarts:null,lastPlayedAt:null};row.attempts+=1;row.successes+=Number(attempt.success);row.failures+=Number(!attempt.success);row.perfectCheckouts+=Number(attempt.perfect);if(attempt.success){row.totalDartsOnSuccessfulCheckouts+=attempt.dartsUsed;row.bestDarts=row.bestDarts==null?attempt.dartsUsed:Math.min(row.bestDarts,attempt.dartsUsed)}row.lastPlayedAt=attempt.timestamp;result[attempt.target]=row}return result}
