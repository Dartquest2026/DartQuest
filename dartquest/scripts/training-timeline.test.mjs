import {TRAINING_VISITS_COLOR,DOUBLE_ROUTE_COLORS} from '../src/features/training/trainingChartColors.js'
import {visitTimelineSeries} from '../src/features/training/trainingVisits.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { trainingTimeline, timelineVariant } from '../src/features/training/trainingTimelineData.js'
const row=(id,game,payload)=>({id:String(id),game,minutes:15,created_at:new Date(Date.UTC(2026,0,id+1)).toISOString(),payload:{game,...payload}})
test('T20 chart sums successful first darts independently of points and longest combo',()=>{
 const game='t20-combo'
 const rows=[row(0,game,{entries:Array.from({length:5},()=>({points:100,count:1})),visitVersion:1,visits:Array.from({length:5},()=>({successful:1,failed:1}))}),row(1,game,{entries:[{points:240,count:3}],visitVersion:1,visits:[{successful:3,failed:1}]})]
 const {series}=trainingTimeline(rows,game)
 assert.deepEqual(series.map(s=>s.value(rows[0])),[5,1,10])
 assert.deepEqual(series.map(s=>s.value(rows[1])),[3,3,4])
 assert.deepEqual(series.map(s=>s.record.id),['0','1','0'])
 assert.deepEqual(series.map(s=>s.maximum),[10,3,10])
})
test('both triple games and favorite double use their actual stored series',()=>{
 for(const game of ['triple-20-19-18-combo','favorite-double']){
 const record=row(0,game,{entries:[{points:128,count:4,double:16}]})
 const {series}=trainingTimeline([record],game)
 assert.deepEqual(series.slice(0,2).map(s=>s.value(record)),game==='favorite-double'?[4,128]:[128,4])
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
 assert.deepEqual(series.slice(0,2).map(s=>s.value(record)),[4,64])
 const singles=row(1,game,{entries:[{count:1,points:32,double:16},{count:1,points:32,double:16}]})
 assert.deepEqual(series.slice(0,2).map(s=>s.value(singles)),[2,0])
})

test('favorite and route chart records expose readable target and streak or accuracy context',()=>{
 const favorite=row(0,'favorite-double',{entries:[{double:16,count:2,points:64},{double:16,count:2,points:64}]})
 const favoriteSeries=trainingTimeline([favorite],'favorite-double').series
 assert.equal(favoriteSeries[0].detail(favorite),'Gespielt: D16')
 assert.equal(favoriteSeries[1].detail(favorite),'D16 · 2 Treffer hintereinander')
 const route=row(1,'double-route',{route:[16,8,4],routeThrows:[{target:16,hit:true},{target:8,hit:false},{target:4,hit:true},{target:16,hit:false}]})
 const series=trainingTimeline([route],'double-route',[16,8,4]).series
 assert.equal(series[0].detail(route),'D16 → D8 → D4 · D16 · 1 Treffer / 2 Würfe · 50,0 %')
 assert.equal(series[1].detail(route),'D16 → D8 → D4 · D8 · 0 Treffer / 1 Wurf · 0,0 %')
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

test('mixed double routes share one chronology without discarding hits on different targets',()=>{
 const rows=[row(0,'double-route',{route:[16,8,4],routeThrows:[{target:16,hit:true},{target:8,hit:false},{target:4,hit:true}]}),row(1,'double-route',{route:[20,10,5],routeThrows:[{target:20,hit:true},{target:10,hit:true},{target:5,hit:false},{target:20,hit:true}]})]
 const {recent,series}=trainingTimeline(rows,'double-route',null)
 assert.equal(recent.length,2);assert.deepEqual(series.map(s=>s.label),['1. Doppel','2. Doppel','3. Doppel'])
 assert.deepEqual(series.map(s=>s.value(rows[0])),[1,0,1]);assert.deepEqual(series.map(s=>s.value(rows[1])),[2,1,0])
 assert.deepEqual(timelineVariant(rows[0]),['D16','D8','D4']);assert.deepEqual(timelineVariant(rows[1]),['D20','D10','D5'])
 assert.ok(series[0].detail(rows[1]).includes('D20'))
 assert.deepEqual(timelineVariant(row(2,'favorite-double',{entries:[{double:20,count:2,points:80}]})),['D20'])
 assert.deepEqual(timelineVariant(row(3,'favorite-double',{favoriteDouble:16,entries:[]})),['D16'])
})

test('T20 missing visit totals stay unavailable instead of becoming a zero-valued record',()=>{
 const legacy=row(0,'t20-combo',{entries:[{points:95,count:1}]})
 const metric=trainingTimeline([legacy],'t20-combo').series.find(s=>s.id==='visits')
 assert.equal(metric.available(legacy),false);assert.equal(metric.record,null)
})

test('favorite double includes total visits on the same count scale as hits, including failed visits',()=>{
 const r=row(0,'favorite-double',{entries:[{count:3,points:96,double:16}],visitVersion:1,visits:[{successful:1,failed:1},{successful:0,failed:1}]})
 const {series}=trainingTimeline([r],'favorite-double');assert.deepEqual(series.map(metric=>metric.value(r)),[3,96,3]);assert.equal(series[0].maximum,series[2].maximum);assert.equal(series[2].record,r);assert.ok(series[2].detail(r).includes('D16'))
 const old=row(1,'favorite-double',{entries:[{count:2,points:64,double:16}]});assert.equal(series[2].available(old),false);assert.equal(trainingTimeline([old],'favorite-double').series[2].record,null)
})

test('visit totals share one dedicated color across every game, including the extra visit charts',()=>{
 for(const game of ['bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock'])assert.equal(visitTimelineSeries(game)[0].color,TRAINING_VISITS_COLOR)
 for(const game of ['t20-combo','favorite-double'])assert.equal(trainingTimeline([],game).series.find(metric=>metric.id==='visits').color,TRAINING_VISITS_COLOR)
 assert.ok(DOUBLE_ROUTE_COLORS.every(color=>color!==TRAINING_VISITS_COLOR))
})
