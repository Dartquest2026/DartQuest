import test from 'node:test'
import assert from 'node:assert/strict'
import { trainingTimeline } from '../src/features/training/trainingTimelineData.js'
const row=(id,game,payload)=>({id:String(id),game,minutes:15,created_at:new Date(Date.UTC(2026,0,id+1)).toISOString(),payload:{game,...payload}})
test('five single visits score higher but have a shorter combo than a three-visit series',()=>{
 const game='t20-combo'
 const rows=[row(0,game,{entries:Array.from({length:5},()=>({points:100,count:1}))}),row(1,game,{entries:[{points:240,count:3}]})]
 const {series}=trainingTimeline(rows,game)
 assert.deepEqual(series.map(s=>s.value(rows[0])),[500,1])
 assert.deepEqual(series.map(s=>s.value(rows[1])),[240,3])
 assert.deepEqual(series.map(s=>s.record.id),['0','1'])
 assert.deepEqual(series.map(s=>s.maximum),[500,3])
})
test('both triple games and favorite double use their actual stored series',()=>{
 for(const game of ['triple-20-19-18-combo','favorite-double']){
 const record=row(0,game,{entries:[{points:128,count:4,double:16}]})
 const {series}=trainingTimeline([record],game)
 assert.deepEqual(series.map(s=>s.value(record)),[128,4])
 }
})
test('clock records minimize misses and time separately while bar height follows magnitude',()=>{
 const game='around-the-clock',slow=row(0,game,{misses:5,elapsedMs:1200000}),fast=row(1,game,{misses:20,elapsedMs:300000})
 const {series}=trainingTimeline([slow,fast],game)
 assert.deepEqual(series.map(s=>s.record.id),['0','1'])
 assert.deepEqual(series.map(s=>s.maximum),[20,1200000])
 assert.equal(series[0].value(slow)/series[0].maximum,.25)
 assert.equal(series[1].value(slow)/series[1].maximum,1)
 assert.equal(series[1].format(series[1].value(slow)),'20:00')
})
test('each double-route target has its own bar, with one shared hit scale',()=>{
 const game='double-route',record=row(0,game,{route:[16,8,4],routeThrows:[{target:16,hit:true},{target:8,hit:false},{target:4,hit:true},{target:16,hit:true}]})
 const {series}=trainingTimeline([record],game,[16,8,4])
 assert.deepEqual(series.map(s=>s.value(record)),[2,0,1])
 assert.deepEqual(series.map(s=>s.maximum),[2,2,2])
})
test('ten chronological units retain older records and scale anchors without mutating the source',()=>{
 const game='t20-combo',rows=Array.from({length:15},(_,i)=>row(i,game,{entries:[{points:i===0?1000:100,count:i===0?10:1}]})).reverse()
 const {recent,series}=trainingTimeline(rows,game)
 assert.deepEqual(recent.map(r=>r.id),Array.from({length:10},(_,i)=>String(i+5)))
 assert.equal(series[0].record.id,'0');assert.equal(series[0].maximum,1000);assert.equal(rows[0].id,'14')
})
test('empty and zero histories have finite positive scales and zero remains a valid clock record',()=>{
 const game='around-the-clock'
 assert.ok(trainingTimeline([],game).series.every(s=>s.maximum>0&&s.record===null))
 const record=row(0,game,{misses:0,elapsedMs:0})
 const {series}=trainingTimeline([record],game)
 assert.ok(series.every(s=>s.maximum===1&&s.value(s.record)===0))
})
