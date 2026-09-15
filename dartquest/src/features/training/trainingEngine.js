import { trainingStrategies, trainingVisitSize, checkoutOptions } from './trainingStrategies.js'
import { getTrainingTaskEventCount, getTrainingTaskMaxScore, getTrainingTarget, isTrainingProgression, isTrainingTargetHit } from './trainingTemplates.js'

export function calculateTrainingTaskScore(task, event) {
  if (!task.scored) return 0
  if (task.type === 'catch40') return event.result === 'checkout' ? (event.darts <= 2 || Number(event.target) === 99 && event.darts === 3 ? 3 : event.darts === 3 ? 2 : 1) : 0
  if (isTrainingProgression(task) && !isTrainingTargetHit(task, event)) return 0
  if (task.type === 'highscore') return Math.min(180, Math.max(0, Number(event.value) || 0))
  if (task.type === 'checkout') return task.configuration.scoring[event.darts ?? 'miss'] ?? 0
  return task.configuration.scoring[event.result] ?? 0
}

export function createTrainingProgress(tasks) {
  return { currentTaskIndex:0, finished:false, taskStates:tasks.map((task) => ({ events:[], score:0, complete:false, targetIndex:0, hitsOnTarget:0, ...trainingStrategies[task.type]?.initial(task.configuration), ...(task.configuration.order === "random" ? {targetOrder:shuffleTargets(task.configuration.targets)} : {}) })) }
}

export function recordTrainingEvent(progress, tasks, input) {
  if (progress.finished) return { progress, visitComplete:false, taskComplete:false }
  const taskIndex = progress.currentTaskIndex
  const task = tasks[taskIndex]
  const current = progress.taskStates[taskIndex]
  if(task.type==='checkout' && input.result!=='miss' && !checkoutOptions(Number(getTrainingTarget(task,current)),{outMode:'double',...task.configuration}).includes(input.darts)) return {progress,visitComplete:false,taskComplete:false}
  const strategy = trainingStrategies[task.type]
  if (strategy) {
    const next = strategy.record(task.configuration,current,input)
    if (!next) return {progress,visitComplete:false,taskComplete:false}
    const event = {...input,points:next.points,target:getTrainingTarget(task,current),dartNumber:current.events.length % trainingVisitSize(task,current)+1}
    const state = {...next,events:[...current.events,event]}
    const last = taskIndex === tasks.length-1
    return {progress:{...progress,currentTaskIndex:state.complete&&!last?taskIndex+1:taskIndex,finished:state.complete&&last,taskStates:progress.taskStates.map((s,i)=>i===taskIndex?state:s)},event,visitComplete:state.visitComplete||state.complete,taskComplete:state.complete}
  }
  const points = task.scored && isTrainingProgression(task) && getTrainingTarget(task,current)==='BULL' ? (isTrainingTargetHit(task,input,current) ? (input.result==='bullseye'?2:1) : 0) : calculateTrainingTaskScore(task, input)
  const dartsPerRound = task.type === 'highscore' || task.type === 'checkout' ? 1 : task.configuration.dartsPerRound || 3
  const event = { result:input.result, value:input.value ?? null, darts:input.darts ?? null, points, dartNumber:(current.events.length % dartsPerRound) + 1, round:Math.floor(current.events.length / dartsPerRound) + 1, target:getTrainingTarget(task, current) }
  const events = [...current.events, event]
  let targetIndex = current.targetIndex ?? 0
  let hitsOnTarget = current.hitsOnTarget ?? 0
  let fieldComplete = false
  if (isTrainingProgression(task) && isTrainingTargetHit(task, input, current)) {
    hitsOnTarget += 1
    if (hitsOnTarget >= task.configuration.hitsPerTarget) {
      targetIndex += 1
      hitsOnTarget = 0
      fieldComplete = true
    }
  }
  const taskComplete = isTrainingProgression(task) ? targetIndex >= task.configuration.targets.length : events.length >= getTrainingTaskEventCount(task)
  const taskStates = progress.taskStates.map((state,index) => index === taskIndex ? { ...state, events, score:state.score + points, complete:taskComplete, targetIndex, hitsOnTarget } : state)
  const lastTask = taskIndex === tasks.length - 1
  return {
    progress:{ ...progress, currentTaskIndex:taskComplete && !lastTask ? taskIndex + 1 : taskIndex, finished:taskComplete && lastTask, taskStates },
    visitComplete:taskComplete || events.length % dartsPerRound === 0,
    taskComplete,
    fieldComplete,
    event,
  }
}

export function fillTrainingVisitWithMisses(progress, tasks) {
  let next = progress
  let outcome = { progress, visitComplete:false, taskComplete:false }
  const task = tasks[progress.currentTaskIndex]
  const size = trainingVisitSize(task,progress.taskStates[progress.currentTaskIndex])
  const used = progress.taskStates[progress.currentTaskIndex].events.length % size
  const remaining = used === 0 ? size : size - used
  for (let index = 0; index < remaining && !next.finished; index += 1) {
    outcome = recordTrainingEvent(next, tasks, { result:'miss' })
    next = outcome.progress
    if (outcome.taskComplete) break
  }
  return outcome
}

export function summarizeTrainingPlayer(player, progress, tasks) {
  const taskResults = tasks.map((task,index) => {
    const state = progress.taskStates[index]
    const score = task.scored ? state.score : 0
    const maxScore = getTrainingTaskMaxScore(task)
    return { taskId:task.id, taskType:task.type, title:task.title, configuration:task.configuration, rawData:trainingRawData(task,state), score, maxScore, percentage:maxScore ? score / maxScore * 100 : null, events:progress.taskStates[index].events }
  })
  const scored = taskResults.filter((item) => item.maxScore > 0)
  const totalScore = scored.reduce((sum,item) => sum + item.score, 0)
  const maxScore = scored.reduce((sum,item) => sum + item.maxScore, 0)
  return { playerId:player.id, playerName:player.name, totalScore, maxScore, percentage:maxScore ? totalScore / maxScore * 100 : 0, tasks:taskResults }
}

function shuffleTargets(targets) {
  const bull=targets.includes(25), copy=targets.filter(v=>v!==25)
  for(let i=copy.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]}
  return bull?[...copy,25]:copy
}
function trainingRawData(task,state) {
  const {events: _events, ...raw} = state
  void _events
  return {...raw,finalScore:state.score,totalScore:state.score,totalDarts:state.dartsUsed??state.events.length,...(task.type==='jdc'?{part1Score:state.partScores[0],part2Score:state.partScores[1],part3Score:state.partScores[2]}:{})}
}
