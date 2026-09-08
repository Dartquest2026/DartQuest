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

test('progression advances several fields inside one visit for each ring', () => {
  for (const ring of ['single','double','triple']) {
    const task = createTrainingTask(`round-${ring}s`)
    let progress = createTrainingProgress([task])
    for (let dart=1; dart<=3; dart+=1) {
      const outcome = recordTrainingEvent(progress,[task],{result:ring})
      progress = outcome.progress
      assert.equal(outcome.fieldComplete,true)
      assert.equal(outcome.visitComplete,dart===3)
      assert.equal(getTrainingTarget(task,progress.taskStates[0]),`${ring[0].toUpperCase()}${dart+1}`)
      assert.equal(outcome.event.target,`${ring[0].toUpperCase()}${dart}`)
    }
  }
})

test('three hits per field survive misses, wrong rings and visit boundaries', () => {
  const task=createTrainingTask('round-singles',{configuration:{hitsPerTarget:3}})
  let progress=createTrainingProgress([task])
  for (const result of ['single','miss','double','triple','single']) progress=recordTrainingEvent(progress,[task],{result}).progress
  assert.equal(getTrainingTarget(task,progress.taskStates[0]),'S1')
  assert.equal(progress.taskStates[0].hitsOnTarget,2)
  assert.equal(progress.taskStates[0].score,2)
  progress=recordTrainingEvent(progress,[task],{result:'single'}).progress
  assert.equal(getTrainingTarget(task,progress.taskStates[0]),'S2')
  assert.equal(progress.taskStates[0].hitsOnTarget,0)
})

test('clock follows board order and each ring hit counts once', () => {
  const task=createTrainingTask('around-board-order',{configuration:{hitsPerTarget:2}})
  let progress=createTrainingProgress([task])
  progress=recordTrainingEvent(progress,[task],{result:'triple'}).progress
  assert.equal(progress.taskStates[0].hitsOnTarget,1)
  assert.equal(getTrainingTarget(task,progress.taskStates[0]),'1')
  progress=recordTrainingEvent(progress,[task],{result:'double'}).progress
  assert.equal(getTrainingTarget(task,progress.taskStates[0]),'18')
})

test('progression is unlimited by misses and ends exactly on the last required hit', () => {
  for (const id of ['round-singles','round-doubles','round-triples','around-board-order']) {
    const task=createTrainingTask(id,{configuration:{hitsPerTarget:3}})
    const result=task.configuration.ring==='segment'?'triple':task.configuration.ring
    let progress=createTrainingProgress([task])
    for(let i=0;i<70;i+=1) progress=recordTrainingEvent(progress,[task],{result:'miss'}).progress
    assert.equal(progress.finished,false)
    assert.equal(progress.taskStates[0].targetIndex,0)
    assert.equal(getTrainingTaskEventCount(task),null)
    for(let i=0;i<59;i+=1) progress=recordTrainingEvent(progress,[task],{result}).progress
    assert.equal(progress.finished,false)
    progress=recordTrainingEvent(progress,[task],{result}).progress
    assert.equal(progress.finished,true)
    assert.equal(progress.taskStates[0].targetIndex,20)
    assert.equal(getTrainingTarget(task,progress.taskStates[0]),null)
    assert.equal(progress.taskStates[0].score,getTrainingTaskMaxScore(task))
    assert.equal(recordTrainingEvent(progress,[task],{result}).progress,progress)
  }
})

test('hits-per-field configuration is bounded and max score uses matching rings', () => {
  for (const [value,expected] of [[undefined,1],[0,1],[-2,1],[3,3],[21,20],['4',4]]) {
    const task=createTrainingTask('round-singles',{configuration:{hitsPerTarget:value}})
    assert.equal(task.configuration.hitsPerTarget,expected)
    assert.equal(getTrainingTaskMaxScore(task),20*expected)
  }
  assert.equal(getTrainingTaskMaxScore(createTrainingTask('round-doubles')),40)
  assert.equal(getTrainingTaskMaxScore(createTrainingTask('round-triples')),60)
  assert.equal(getTrainingTaskMaxScore(createTrainingTask('around-board-order')),60)
  const task=createTrainingTask('round-singles',{scored:false})
  const next=recordTrainingEvent(createTrainingProgress([task]),[task],{result:'single'}).progress
  assert.equal(next.taskStates[0].targetIndex,1)
  assert.equal(next.taskStates[0].score,0)
})

test('miss hold retains field progress and other sequence drills keep dart-based targets', () => {
  const task=createTrainingTask('round-doubles',{configuration:{hitsPerTarget:3}})
  const initial=recordTrainingEvent(createTrainingProgress([task]),[task],{result:'double'}).progress
  const outcome=fillTrainingVisitWithMisses(initial,[task])
  assert.equal(outcome.visitComplete,true)
  assert.equal(outcome.progress.taskStates[0].hitsOnTarget,1)
  assert.equal(outcome.progress.taskStates[0].events.length,3)
  assert.equal(getTrainingTarget(task,outcome.progress.taskStates[0]),'D1')
  assert.equal(initial.taskStates[0].events.length,1)
  const fixed=createTrainingTask('20-19-18')
  assert.deepEqual([0,1,2,3].map(index=>getTrainingTarget(fixed,index)),['20','19','18','20'])
  assert.equal(getTrainingTaskEventCount(fixed),21)
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

test('progression keeps per-player fields and moves to the next task on the final hit', () => {
  const tasks=[createTrainingTask('round-doubles'),createTrainingTask('round-singles')]
  let first=createTrainingProgress(tasks)
  const second=recordTrainingEvent(createTrainingProgress(tasks),tasks,{result:'double'}).progress
  for(let i=0;i<19;i+=1) first=recordTrainingEvent(first,tasks,{result:'double'}).progress
  const outcome=recordTrainingEvent(first,tasks,{result:'double'})
  assert.equal(outcome.taskComplete,true)
  assert.equal(outcome.visitComplete,true)
  assert.equal(outcome.progress.currentTaskIndex,1)
  assert.equal(getTrainingTarget(tasks[1],outcome.progress.taskStates[1]),'S1')
  assert.equal(getTrainingTarget(tasks[0],second.taskStates[0]),'D2')
  assert.equal(outcome.progress.finished,false)
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
  assert.match(css,/height:\s*100dvh/)
  for(const inset of ['top','right','bottom','left']) assert.match(css,new RegExp(`env\\(safe-area-inset-${inset}\\)`))
  assert.match(css,/max-width: 430px;\s*margin: 0 auto;/)
  assert.match(css,/\.training-hit-buttons\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/)
  const viewports=[{w:375,h:667,safe:26},{w:390,h:844,safe:81},{w:393,h:852,safe:81},{w:430,h:932,safe:93},{w:360,h:800,safe:48}, ...[1280,1440,1920].map(w=>({w,h:900,safe:14}))]
  for(const {w,h,safe} of viewports){
    const compact=h<=700
    const board=Math.min(310,w*.78,h-(compact?474:516)-safe)
    const gap=compact?3:Math.min(6,Math.max(3,h*.006))
    const main=h-safe-(compact?36:44)
    const target=(compact?32:44)+board+(compact?38:54)+(compact?40:48)+(compact?212:242)+4*gap+4
    const checkout=44+board+54+144+3*gap+4
    assert.ok(board>0 && board<=Math.min(w,430)-16)
    assert.ok(target<=main,`${w}x${h} target ${target}/${main}`)
    assert.ok(checkout<=main,`${w}x${h} checkout ${checkout}/${main}`)
  }
})

test('training builder keeps its start action above the real bottom navigation', () => {
  const training=readFileSync(new URL('../src/features/training/Training.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../src/features/training/Training.css',import.meta.url),'utf8')
  const appCss=readFileSync(new URL('../src/app/App.css',import.meta.url),'utf8')
  const navCss=readFileSync(new URL('../src/shared/styles/BottomNav.css',import.meta.url),'utf8')

  assert.match(training,/className="training-builder-scroll"[\s\S]*<\/div>\s*<button className="training-start-button"/)
  assert.match(css,/\.training-builder\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto;[\s\S]*overflow:\s*hidden;/)
  assert.match(css,/\.training-builder-scroll\s*\{[\s\S]*overflow-y:\s*auto;/)
  assert.match(css,/\.training-start-button\s*\{[\s\S]*min-height:\s*56px;[\s\S]*margin:\s*8px 0 0;/)
  assert.doesNotMatch(css,/\.training-builder\s*\{[^}]*safe-area-inset-bottom/)
  assert.match(appCss,/\.app-shell\s*>\s*:not\(\.bottom-nav\)\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-height:\s*0;/)
  assert.match(navCss,/\.bottom-nav\s*\{[\s\S]*flex:\s*0 0 auto;[\s\S]*safe-area-inset-bottom/)
})
