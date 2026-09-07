import { getTrainingTaskEventCount, getTrainingTaskMaxScore, getTrainingTarget } from './trainingTemplates.js'

export function calculateTrainingTaskScore(task, event) {
  if (!task.scored) return 0
  if (task.type === 'highscore') return Math.min(180, Math.max(0, Number(event.value) || 0))
  if (task.type === 'checkout') return task.configuration.scoring[event.darts ?? 'miss'] ?? 0
  return task.configuration.scoring[event.result] ?? 0
}

export function createTrainingProgress(tasks) {
  return { currentTaskIndex:0, finished:false, taskStates:tasks.map(() => ({ events:[], score:0, complete:false })) }
}

export function recordTrainingEvent(progress, tasks, input) {
  if (progress.finished) return { progress, visitComplete:false, taskComplete:false }
  const taskIndex = progress.currentTaskIndex
  const task = tasks[taskIndex]
  const current = progress.taskStates[taskIndex]
  const points = calculateTrainingTaskScore(task, input)
  const dartsPerRound = task.type === 'highscore' || task.type === 'checkout' ? 1 : task.configuration.dartsPerRound || 3
  const event = { result:input.result, value:input.value ?? null, darts:input.darts ?? null, points, dartNumber:(current.events.length % dartsPerRound) + 1, round:Math.floor(current.events.length / dartsPerRound) + 1, target:getTrainingTarget(task, current.events.length) }
  const events = [...current.events, event]
  const taskComplete = events.length >= getTrainingTaskEventCount(task)
  const taskStates = progress.taskStates.map((state,index) => index === taskIndex ? { events, score:state.score + points, complete:taskComplete } : state)
  const lastTask = taskIndex === tasks.length - 1
  return {
    progress:{ ...progress, currentTaskIndex:taskComplete && !lastTask ? taskIndex + 1 : taskIndex, finished:taskComplete && lastTask, taskStates },
    visitComplete:taskComplete || events.length % dartsPerRound === 0,
    taskComplete,
    event,
  }
}

export function fillTrainingVisitWithMisses(progress, tasks) {
  let next = progress
  let outcome = { progress, visitComplete:false, taskComplete:false }
  const task = tasks[progress.currentTaskIndex]
  const size = task.type === 'highscore' || task.type === 'checkout' ? 1 : task.configuration.dartsPerRound || 3
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
    const score = progress.taskStates[index].score
    const maxScore = getTrainingTaskMaxScore(task)
    return { taskId:task.id, taskType:task.type, title:task.title, configuration:task.configuration, score, maxScore, percentage:maxScore ? score / maxScore * 100 : null, events:progress.taskStates[index].events }
  })
  const scored = taskResults.filter((item) => item.maxScore > 0)
  const totalScore = scored.reduce((sum,item) => sum + item.score, 0)
  const maxScore = scored.reduce((sum,item) => sum + item.maxScore, 0)
  return { playerId:player.id, playerName:player.name, totalScore, maxScore, percentage:maxScore ? totalScore / maxScore * 100 : 0, tasks:taskResults }
}
