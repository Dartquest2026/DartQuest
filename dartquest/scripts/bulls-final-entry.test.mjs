import test from 'node:test'
import assert from 'node:assert/strict'
import { beginBullsFinalEntry, bullsFinalHits, changeBullCount, finishBullsFinalEntry } from '../src/features/training/customTrainingRules.js'
const run=()=>({id:'bull',game:'bulls-warm-up',phase:'playing',endAt:1000,doubleBull:10,singleBull:20})
test('bulls timeout opens a last-entry phase instead of saving automatically',()=>{
 assert.equal(beginBullsFinalEntry(run(),999).phase,'playing')
 const final=beginBullsFinalEntry(run(),1000)
 assert.equal(final.phase,'bulls-final');assert.deepEqual(final.bullsFinalBase,{doubleBull:10,singleBull:20})
 assert.equal(bullsFinalHits(final),0);assert.equal(beginBullsFinalEntry(final,2000),final)
})
test('at most three additional hits are shared between both bull counters',()=>{
 for(let doubles=0;doubles<=3;doubles++){
  let final=beginBullsFinalEntry(run(),1000)
  for(let i=0;i<3;i++)final=changeBullCount(final,i<doubles?'doubleBull':'singleBull',1,2000)
  assert.equal(bullsFinalHits(final),3)
  assert.equal(changeBullCount(final,'singleBull',1,2000),final);assert.equal(changeBullCount(final,'doubleBull',1,2000),final)
  assert.equal(finishBullsFinalEntry(final).phase,'saving')
 }
})
test('minus can correct pending darts without subtracting from the pre-timeout baseline',()=>{
 let final=beginBullsFinalEntry(run(),1000)
 assert.equal(changeBullCount(final,'singleBull',-1,2000),final)
 final=changeBullCount(final,'doubleBull',1,2000)
 final=changeBullCount(final,'doubleBull',-1,2000)
 assert.equal(final.doubleBull,10);assert.equal(bullsFinalHits(final),0)
 for(let i=0;i<3;i++)final=changeBullCount(final,'singleBull',1,2000)
 assert.equal(final.singleBull,23)
})
test('a tap exactly at timeout counts against the three-dart limit; resume cannot reset it',()=>{
 let final=changeBullCount(run(),'doubleBull',1,1000)
 assert.equal(final.phase,'bulls-final');assert.equal(bullsFinalHits(final),1)
 final=JSON.parse(JSON.stringify(final))
 final=changeBullCount(final,'singleBull',1,5000)
 final=changeBullCount(final,'singleBull',1,5000)
 assert.equal(bullsFinalHits(final),3);assert.equal(changeBullCount(final,'singleBull',1,5000),final)
})
test('zero final hits can be confirmed, and no edits are accepted after confirmation',()=>{
 const final=beginBullsFinalEntry(run(),1000),saved=finishBullsFinalEntry(final)
 assert.equal(saved.phase,'saving');assert.equal(saved.doubleBull,10)
 assert.equal(changeBullCount(saved,'singleBull',1,2000),saved)
 assert.equal(finishBullsFinalEntry(saved),saved)
 assert.equal(finishBullsFinalEntry(run()).phase,'playing')
})
test('ordinary bull taps work before timeout and other games are unaffected',()=>{
 const before=changeBullCount(run(),'singleBull',1,999);assert.equal(before.phase,'playing');assert.equal(before.singleBull,21)
 const other={...run(),game:'t20-combo'};assert.equal(beginBullsFinalEntry(other,2000),other);assert.equal(changeBullCount(other,'singleBull',1,2000),other)
})
