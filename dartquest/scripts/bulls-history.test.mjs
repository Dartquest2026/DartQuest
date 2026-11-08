import test from 'node:test'
import assert from 'node:assert/strict'
import { bullsHistory } from '../src/features/training/bullsHistory.js'
const row=(i,single,double)=>({id:String(i),created_at:new Date(Date.UTC(2026,0,i+1)).toISOString(),payload:{singleBull:single,doubleBull:double}})
test('latest ten units stay chronological and independent records survive outside the visible range',()=>{
 const rows=Array.from({length:15},(_,i)=>row(i,i===0?80:i,i===1?60:i))
 const view=bullsHistory(rows.reverse())
 assert.deepEqual(view.recent.map(r=>r.id),Array.from({length:10},(_,i)=>String(i+5)))
 assert.equal(view.singleRecord.id,'0');assert.equal(view.doubleRecord.id,'1');assert.equal(view.scoreRecord.id,'1')
 assert.equal(view.points(view.scoreRecord),3025);assert.ok(view.ceiling>=80)
 assert.equal(rows[0].id,'14')
})
test('empty history and all-zero runs have a finite nonzero axis',()=>{
 assert.deepEqual(bullsHistory([]).recent,[])
 assert.equal(bullsHistory([]).scoreRecord,null)
 const view=bullsHistory([row(0,0,0)])
 assert.equal(view.singleRecord.id,'0');assert.ok(view.ceiling>0)
})
test('a higher red count never stacks onto the green count',()=>{
 const view=bullsHistory([row(0,3,18)])
 assert.equal(view.ceiling,20)
 assert.equal(view.points(view.recent[0]),975)
})

test('record guides use exact values and separate equal or neighboring labels',async()=>{
 const {bullsRecordGuides}=await import('../src/features/training/bullsHistory.js')
 const guides=bullsRecordGuides(33,15,40)
 assert.equal(guides[0].value,33)
 assert.ok(Math.abs(guides[0].top-17.5)<1e-9)
 assert.equal(guides[1].top,62.5)
 assert.deepEqual(guides.map(g=>g.offset),[0,0])
 for(const [single,double] of [[33,33],[33,32],[0,0]]){
  const pair=bullsRecordGuides(single,double,40)
  const positions=pair.map(g=>g.top*1.86+g.offset)
  assert.ok(Math.abs(positions[0]-positions[1])>=20)
  assert.equal(pair[0].top,(1-single/40)*100)
  assert.equal(pair[1].top,(1-double/40)*100)
 }
})

test('bull chart scale includes recorded visits without inventing totals for legacy results',()=>{
 const legacy={id:'old',created_at:'2026-11-01',game:'bulls-warm-up',payload:{singleBull:10,doubleBull:0}}
 const current={...legacy,id:'new',created_at:'2026-11-08',payload:{singleBull:10,doubleBull:0,visitVersion:1,visits:Array.from({length:30},(_,i)=>({singleBull:i<10?1:0,doubleBull:0}))}}
 assert.ok(bullsHistory([legacy,current]).ceiling>=30);assert.ok(bullsHistory([legacy]).ceiling<30)
})
