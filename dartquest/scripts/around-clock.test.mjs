import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {aroundClockBest,aroundClockStats,elapsedClockMs,finishAroundClock,formatElapsed,recordAroundMiss} from '../src/features/training/customTrainingRules.js'

const base = includeBull => ({id:'current',game:'around-the-clock',minutes:0,includeBull,misses:0,phase:'playing',startedAt:1000,endAt:null})
test('only misses are counted and no deadline ends an Around-the-Clock run',()=>{
 let run=base(false)
 for(let i=0;i<5;i++)run=recordAroundMiss(run)
 assert.equal(run.misses,5)
 assert.equal(run.phase,'playing')
 assert.equal(elapsedClockMs(run,601000),600000)
 assert.equal(run.endAt,null)
})
test('stopwatch measures real elapsed time, survives resume and freezes on finish',()=>{
 let run=JSON.parse(JSON.stringify(base(true)))
 assert.equal(elapsedClockMs(run,1000),0)
 assert.equal(elapsedClockMs(run,301000),300000)
 run=finishAroundClock(run,301000)
 assert.equal(run.elapsedMs,300000)
 assert.equal(elapsedClockMs(run,901000),300000)
 assert.equal(run.completed,true)
 assert.equal(run.phase,'saving')
 assert.equal(finishAroundClock(run,401000),run)
 assert.equal(recordAroundMiss(run),run)
})
test('completion without Bull means twenty hits, plus all recorded misses',()=>{
 const run={...base(false),misses:5,elapsedMs:600000}
 assert.deepEqual(aroundClockStats(run),{hits:20,misses:5,darts:25,accuracy:80,elapsedMs:600000})
 assert.equal(aroundClockStats({...run,misses:0}).accuracy,100)
})
test('completion with Bull means twenty-one hits',()=>{
 const stats=aroundClockStats({...base(true),misses:3,elapsedMs:300000})
 assert.equal(stats.hits,21);assert.equal(stats.darts,24);assert.equal(stats.accuracy,87.5)
})
test('comparisons prefer fewer misses, keep fastest time separate and split Bull variants',()=>{
 const row=(id,bull,misses,time,date)=>({id,game:'around-the-clock',created_at:date,payload:{...base(bull),misses,elapsedMs:time}})
 const rows=[row('old',false,20,300000,'2026-11-01T18:00:00Z'),row('recent',false,5,600000,'2026-11-01T19:00:00Z'),row('bull',true,0,100000,'2026-11-01T19:30:00Z'),row('current',false,0,50000,'2026-11-01T20:00:00Z')]
 const best=aroundClockBest(rows,false,'current')
 assert.equal(best.misses,5);assert.equal(best.elapsedMs,300000);assert.equal(best.previous.misses,5)
 assert.equal(aroundClockBest(rows,true,'current').misses,0)
 assert.equal(aroundClockBest([],false).misses,null)
})
test('elapsed time renders zero, five minutes, ten minutes and long runs',()=>{
 assert.equal(formatElapsed(0),'00:00');assert.equal(formatElapsed(300000),'05:00');assert.equal(formatElapsed(600000),'10:00');assert.equal(formatElapsed(5400000),'90:00')
})
test('guest storage starts without a duration, rejects unfinished runs and saves one stable result',async()=>{
 const values=new Map()
 const source=readFileSync(new URL('../src/features/training/customTrainingStorage.js',import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replaceAll('export ','')
 const storage=runInNewContext(source+'\n;({startCustomRun,saveCustomRun,loadCustomRun,completeCustomRun,localCustomHistory})',{crypto:{randomUUID:()=> 'clock-test-id'},Date,localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}})
 let run=JSON.parse(JSON.stringify(await storage.startCustomRun(null,'around-the-clock',undefined,{includeBull:true})))
 assert.equal(run.minutes,0);assert.equal(run.endAt,null);assert.equal(run.includeBull,true)
 await assert.rejects(storage.completeCustomRun(null,run),/Spiel beendet/)
 run=recordAroundMiss(run);storage.saveCustomRun(null,run)
 run=JSON.parse(JSON.stringify(storage.loadCustomRun(null)))
 assert.equal(run.misses,1)
 run=finishAroundClock(run,run.startedAt+300000)
 await storage.completeCustomRun(null,run);await storage.completeCustomRun(null,run)
 const rows=JSON.parse(JSON.stringify(storage.localCustomHistory(null)))
 assert.equal(rows.length,1);assert.equal(rows[0].payload.elapsedMs,300000);assert.equal(rows[0].created_at,new Date(run.finishedAt).toISOString())
})
