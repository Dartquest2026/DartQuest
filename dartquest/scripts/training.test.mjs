import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { calculateTrainingTaskScore, createTrainingProgress, fillTrainingVisitWithMisses, recordTrainingEvent, summarizeTrainingPlayer } from '../src/features/training/trainingEngine.js'
import { createTrainingTask, getTrainingTaskEventCount, getTrainingTaskMaxScore, getTrainingTarget, TRAINING_TEMPLATES } from '../src/features/training/trainingTemplates.js'

test('MVP library contains all 15 data-driven training templates', () => {
  assert.equal(TRAINING_TEMPLATES.length, 15)
  assert.deepEqual(TRAINING_TEMPLATES.map((item) => item.id), ['segment-custom','segment-20','segment-19','33-darts-20','33-darts-19','33-darts-bull','round-singles','round-doubles','round-triples','around-board-order','20-19-18','bull-training','highscore','three-dart-checkouts','catch-40'])
})

test('central score and maximum calculations cover segment, bull, highscore and checkout', () => {
  const segment = createTrainingTask('segment-20')
  const bull = createTrainingTask('33-darts-bull')
  const highscore = createTrainingTask('highscore')
  const checkout = createTrainingTask('catch-40')
  assert.deepEqual(['miss','single','double','triple'].map((result) => calculateTrainingTaskScore(segment,{result})), [0,1,2,3])
  assert.deepEqual(['miss','bull','bullseye'].map((result) => calculateTrainingTaskScore(bull,{result})), [0,1,2])
  assert.equal(getTrainingTaskMaxScore(segment), 90)
  assert.equal(getTrainingTaskMaxScore(bull), 66)
  assert.equal(getTrainingTaskMaxScore(highscore), 1260)
  assert.equal(getTrainingTaskMaxScore(checkout), 120)
  assert.equal(calculateTrainingTaskScore(checkout,{result:'checkout',darts:2}),3)
})

test('configuration is bounded and maximum follows the customized task', () => {
  const task = createTrainingTask('segment-custom',{configuration:{target:99,rounds:2,dartsPerRound:3,scoring:{miss:-2,single:2,double:4,triple:6}}})
  assert.equal(task.configuration.target,20)
  assert.equal(getTrainingTaskEventCount(task),6)
  assert.equal(getTrainingTaskMaxScore(task),36)
})

test('round-the-board uses stable target order and advances after configured darts', () => {
  const task = createTrainingTask('round-doubles')
  assert.equal(getTrainingTarget(task,0),'D1')
  assert.equal(getTrainingTarget(task,2),'D1')
  assert.equal(getTrainingTarget(task,3),'D2')
})

test('long-press fill records only the remaining darts of a visit', () => {
  const tasks = [createTrainingTask('segment-20',{configuration:{rounds:1}})]
  let progress = createTrainingProgress(tasks)
  progress = recordTrainingEvent(progress,tasks,{result:'triple'}).progress
  const outcome = fillTrainingVisitWithMisses(progress,tasks)
  assert.equal(outcome.progress.taskStates[0].events.length,3)
  assert.deepEqual(outcome.progress.taskStates[0].events.map((item) => item.points),[3,0,0])
  assert.equal(outcome.progress.finished,true)
})

test('multiplayer progress remains independent while turns can be interleaved', () => {
  const tasks = [createTrainingTask('segment-20',{configuration:{rounds:1}}),createTrainingTask('bull-training',{configuration:{rounds:1}})]
  let daniel = createTrainingProgress(tasks)
  let melissa = createTrainingProgress(tasks)
  for (let index=0; index<3; index+=1) daniel=recordTrainingEvent(daniel,tasks,{result:'triple'}).progress
  melissa=recordTrainingEvent(melissa,tasks,{result:'single'}).progress
  assert.equal(daniel.currentTaskIndex,1)
  assert.equal(melissa.currentTaskIndex,0)
  assert.equal(daniel.taskStates[0].score,9)
  assert.equal(melissa.taskStates[0].score,1)
})

test('unscored warm-up style task does not distort totals', () => {
  const tasks=[createTrainingTask('bull-training',{scored:false,configuration:{rounds:1}}),createTrainingTask('segment-20',{configuration:{rounds:1}})]
  let progress=createTrainingProgress(tasks)
  for(let index=0;index<3;index+=1) progress=recordTrainingEvent(progress,tasks,{result:'bullseye'}).progress
  for(let index=0;index<3;index+=1) progress=recordTrainingEvent(progress,tasks,{result:'single'}).progress
  const summary=summarizeTrainingPlayer({id:1,name:'Daniel'},progress,tasks)
  assert.deepEqual([summary.totalScore,summary.maxScore],[3,9])
  assert.equal(summary.tasks[0].percentage,null)
})

test('navigation, shared miss interaction and secure persistence are wired', () => {
  const solo=readFileSync(new URL('../src/features/singleplayer/Singleplayer.jsx',import.meta.url),'utf8')
  const multi=readFileSync(new URL('../src/features/multiplayer/Multiplayer.jsx',import.meta.url),'utf8')
  const training=readFileSync(new URL('../src/features/training/Training.jsx',import.meta.url),'utf8')
  const migration=readFileSync(new URL('../supabase/migrations/20260907062651_training_sessions.sql',import.meta.url),'utf8')
  assert.match(solo,/setTrainingOpen\(true\)/)
  assert.match(multi,/setSelectedMode\('training'\)/)
  assert.match(training,/useMissHold/)
  assert.match(migration,/enable row level security/)
  assert.match(migration,/using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(migration,/with check \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(migration,/training_sessions_user_created_idx/)
})

test('active training fits the responsive portrait viewport matrix', () => {
  const css=readFileSync(new URL('../src/features/training/Training.css',import.meta.url),'utf8')
  assert.match(css,/height:100dvh/)
  for(const inset of ['top','right','bottom','left']) assert.match(css,new RegExp(`env\\(safe-area-inset-${inset}\\)`))
  assert.match(css,/--training-board-size:clamp\(190px,min\(42dvh,calc\(100vw - 48px\)\),350px\)/)
  const viewports=[{w:375,h:667,safe:26},{w:390,h:844,safe:81},{w:393,h:852,safe:81},{w:430,h:932,safe:93},{w:360,h:800,safe:48}]
  for(const {w,h,safe} of viewports){
    const compact=h<=700
    const board=Math.min(350,Math.max(190,Math.min(h*.42,w-48)))
    const main=h-safe-44
    const target=(compact?38:44)+board+(compact?48:54)+(compact?44:48)+(compact?88:94)
    const checkout=(compact?38:44)+board+(compact?48:54)+(compact?126:144)
    assert.ok(target<=main,`${w}x${h} target ${target}/${main}`)
    assert.ok(checkout<=main,`${w}x${h} checkout ${checkout}/${main}`)
  }
})
