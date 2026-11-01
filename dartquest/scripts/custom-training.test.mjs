import test from 'node:test'
import assert from 'node:assert/strict'
import { DURATIONS, remainingSeconds, summary, validCombo, bestResults, hasOpenEntry } from '../src/features/training/customTrainingRules.js'

test('all durations use an absolute deadline across background gaps',()=>{
 assert.deepEqual(DURATIONS,[5,10,15])
 for(const minutes of DURATIONS){const start=100000,end=start+minutes*60000; assert.equal(remainingSeconds(end,start),minutes*60);assert.equal(remainingSeconds(end,start+61000),minutes*60-61);assert.equal(remainingSeconds(end,end+9999),0)}
})
test('bull counts produce exactly 1550 points for 15 double and 32 single bulls',()=>assert.equal(summary({game:'bulls-warm-up',doubleBull:15,singleBull:32}).points,1550))
test('T20 accepts a 285-point three-visit combo and 20 successful visits',()=>{
 assert.equal(validCombo(285,3),true);assert.equal(validCombo(3600,20),true);assert.equal(validCombo(100,1),true)
 for(const [p,c] of [[285,1],[59,1],[100,0],[100,21],[181,1],[119,2],[100.5,1],[180,1.5]])assert.equal(validCombo(p,c),false)
})
test('T20 metrics keep longest series, largest points and total separate',()=>assert.deepEqual(summary({game:'t20-combo',entries:[{points:285,count:3},{points:600,count:4},{points:100,count:1}]}),{points:985,longest:4,bestSeries:600,seriesCount:3}))
test('records are separated by game and duration and exclude the current session',()=>{
 const rows=[{id:'a',game:'t20-combo',minutes:5,payload:{game:'t20-combo',entries:[{points:285,count:3}]}},{id:'b',game:'t20-combo',minutes:15,payload:{game:'t20-combo',entries:[{points:3600,count:20}]}},{id:'c',game:'t20-combo',minutes:5,payload:{game:'t20-combo',entries:[{points:600,count:4}]}}]
 assert.deepEqual(bestResults(rows,'t20-combo',5,'c'),{points:285,longest:3,bestSeries:285})
})
test('an open entry or combo chooser delays finalization; an empty keypad does not',()=>{
 assert.ok(hasOpenEntry({game:'t20-combo',score:'285',choosing:false}));assert.ok(hasOpenEntry({game:'t20-combo',score:'',choosing:true}));assert.equal(Boolean(hasOpenEntry({game:'t20-combo',score:'',choosing:false})),false);assert.equal(Boolean(hasOpenEntry({game:'bulls-warm-up',score:'100'})),false)
})
