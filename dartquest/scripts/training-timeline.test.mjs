import test from 'node:test'
import assert from 'node:assert/strict'
import { trainingTimeline } from '../src/features/training/trainingTimelineData.js'
const row=(id,game,payload)=>({id:String(id),game,minutes:15,created_at:new Date(Date.UTC(2026,0,id+1)).toISOString(),payload:{game,...payload}})
test('T20 chart sums successful first darts independently of points and longest combo',()=>{
 const game='t20-combo'
 const rows=[row(0,game,{entries:Array.from({length:5},()=>({points:100,count:1}))}),row(1,game,{entries:[{points:240,count:3}]})]
 const {series}=trainingTimeline(rows,game)
 assert.deepEqual(series.map(s=>s.value(rows[0])),[5,1])
 assert.deepEqual(series.map(s=>s.value(rows[1])),[3,3])
 assert.deepEqual(series.map(s=>s.record.id),['0','1'])
 assert.deepEqual(series.map(s=>s.maximum),[5,3])
})
test('both triple games and favorite double use their actual stored series',()=>{
 for(const game of ['triple-20-19-18-combo','favorite-double']){
 const record=row(0,game,{entries:[{points:128,count:4,double:16}]})
 const {series}=trainingTimeline([record],game)
 assert.deepEqual(series.map(s=>s.value(record)),game==='favorite-double'?[4,128]:[128,4])
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
 assert.equal(series[0].record.id,'0');assert.equal(series[0].maximum,10);assert.equal(rows[0].id,'14')
})
test('empty and zero histories have finite positive scales and zero remains a valid clock record',()=>{
 const game='around-the-clock'
 assert.ok(trainingTimeline([],game).series.every(s=>s.maximum>0&&s.record===null))
 const record=row(0,game,{misses:0,elapsedMs:0})
 const {series}=trainingTimeline([record],game)
 assert.ok(series.every(s=>s.maximum===1&&s.value(s.record)===0))
})

test('favorite double compares total hits with the highest multi-hit combo points, never sums separate combos',()=>{
 const game='favorite-double',record=row(0,game,{entries:[{count:2,points:64,double:16},{count:2,points:64,double:16}]})
 const {series}=trainingTimeline([record],game)
 assert.deepEqual(series.map(s=>s.value(record)),[4,64])
 const singles=row(1,game,{entries:[{count:1,points:32,double:16},{count:1,points:32,double:16}]})
 assert.deepEqual(series.map(s=>s.value(singles)),[2,0])
})

test('favorite and route chart records expose readable target and streak or accuracy context',()=>{
 const favorite=row(0,'favorite-double',{entries:[{double:16,count:2,points:64},{double:16,count:2,points:64}]})
 const favoriteSeries=trainingTimeline([favorite],'favorite-double').series
 assert.equal(favoriteSeries[0].detail(favorite),'Gespielt: D16')
 assert.equal(favoriteSeries[1].detail(favorite),'D16 · 2 Treffer hintereinander')
 const route=row(1,'double-route',{route:[16,8,4],routeThrows:[{target:16,hit:true},{target:8,hit:false},{target:4,hit:true},{target:16,hit:false}]})
 const series=trainingTimeline([route],'double-route',[16,8,4]).series
 assert.equal(series[0].detail(route),'D16 → D8 → D4 · 1 Treffer / 2 Würfe · 50,0 %')
 assert.equal(series[1].detail(route),'D16 → D8 → D4 · 0 Treffer / 1 Wurf · 0,0 %')
})

test('T20 counts ten singles as ten, a three-combo as three and mixed combos by their sum',()=>{
 const game='t20-combo'
 const rows=[row(0,game,{entries:Array.from({length:10},()=>({points:100,count:1}))}),row(1,game,{entries:[{points:180,count:3}]}),row(2,game,{entries:[{points:180,count:2},{points:240,count:3},{points:60,count:1}]}),row(3,game,{entries:[]})]
 const {series}=trainingTimeline(rows,game)
 assert.equal(series[0].label,'T20 beim ersten Wurf')
 assert.deepEqual(rows.map(r=>series[0].value(r)),[10,3,6,0])
 assert.deepEqual(rows.map(r=>series[1].value(r)),[1,3,3,0])
 assert.equal(series[0].record.id,'0')
})
