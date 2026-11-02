import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {beginTimedFinalEntry,finalEntryUsed,recordTrainingCombo,canEnterTrainingScore,finishTimedFinalEntry,recordFavoriteSingle,changeFavoriteCombo,saveFavoriteCombo,recordRouteThrow} from '../src/features/training/customTrainingRules.js'
const base=game=>({id:game,game,phase:'playing',endAt:1000,entries:[],score:'',favoriteDouble:16,favoriteComboCount:0,route:[16,8,4],routeThrows:[]})
test('T20 accepts the last 180 after an empty keypad timed out, once only',()=>{
 let final=beginTimedFinalEntry(base('t20-combo'),1000)
 assert.equal(final.phase,'final-entry');assert.equal(canEnterTrainingScore(final),true)
 final=recordTrainingCombo(final,180,1)
 assert.equal(final.entries[0].points,180);assert.equal(finalEntryUsed(final),1);assert.equal(canEnterTrainingScore(final),false)
 assert.equal(recordTrainingCombo(final,180,1),final);assert.equal(finishTimedFinalEntry(final).phase,'saving')
})
test('both combo games preserve an unfinished score and require it to be saved or discarded',()=>{
 for(const [game,points] of [['t20-combo',180],['triple-20-19-18-combo',97]]){
  let final=beginTimedFinalEntry({...base(game),score:String(points),choosing:true},1000)
  assert.equal(finishTimedFinalEntry(final),final)
  final=recordTrainingCombo(final,points,1)
  assert.equal(final.entries[0].points,points);assert.equal(finishTimedFinalEntry(final).phase,'saving')
 }
})
test('a final combo can contain the entire series thrown before expiry and does not reset on resume',()=>{
 let final=beginTimedFinalEntry(base('t20-combo'),1000)
 final=JSON.parse(JSON.stringify(recordTrainingCombo(final,600,4)))
 assert.equal(final.entries[0].count,4);assert.equal(canEnterTrainingScore(final),false)
})
test('favorite double permits only three additional hits, including mixed singles and combo taps',()=>{
 let final=beginTimedFinalEntry({...base('favorite-double'),favoriteComboCount:4},1000)
 final=saveFavoriteCombo(final) // pre-timeout pending series, not extra darts
 assert.equal(finalEntryUsed(final),0)
 final=recordFavoriteSingle(final,2000)
 final=changeFavoriteCombo(final,1,2000);final=changeFavoriteCombo(final,1,2000)
 assert.equal(finalEntryUsed(final),3);assert.equal(changeFavoriteCombo(final,1,2000),final)
 assert.equal(finishTimedFinalEntry(final),final)
 final=saveFavoriteCombo(final)
 assert.equal(recordFavoriteSingle(final,2000),final);assert.equal(finishTimedFinalEntry(final).phase,'saving')
})
test('double route accepts three last hit/miss darts in order, then locks',()=>{
 let final=beginTimedFinalEntry(base('double-route'),1000)
 final=recordRouteThrow(final,true,2000);final=recordRouteThrow(final,false,2000);final=recordRouteThrow(final,true,2000)
 assert.deepEqual(final.routeThrows.map(r=>r.target),[16,8,4]);assert.equal(finalEntryUsed(final),3)
 assert.equal(recordRouteThrow(final,true,2000),final);assert.equal(finishTimedFinalEntry(final).phase,'saving')
})
test('Around the Clock has no timeout final phase',()=>{
 const run={...base('around-the-clock'),endAt:null};assert.equal(beginTimedFinalEntry(run,2000),run)
})
function audioFixture(){
 const instances=[],pulses=[]
 class Context {
  state='suspended';currentTime=0;sampleRate=44100;destination={};fail=false
  constructor(){instances.push(this)}
  resume(){if(this.fail)return Promise.reject(new Error('blocked'));this.state='running';return Promise.resolve()}
  createBuffer(){return {}}
  createBufferSource(){return {connect(){},disconnect(){},start(){}}}
  createOscillator(){return {frequency:{},connect(){},disconnect(){},start(t){pulses.push(t)},stop(){}}}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}
 }
 const source=readFileSync(new URL('../src/features/training/trainingAudio.js',import.meta.url),'utf8').replaceAll('export ','')
 const api=runInNewContext(source+'\n;({unlockTrainingAudio,playTrainingSignal})',{window:{AudioContext:Context}})
 return {...api,instances,pulses}
}
test('audio resumes interrupted contexts and schedules one warning and about three seconds of alarm',async()=>{
 const f=audioFixture();assert.equal(await f.unlockTrainingAudio(),true)
 assert.equal(await f.playTrainingSignal('minute'),true);assert.equal(f.pulses.length,1)
 f.instances[0].state='interrupted'
 assert.equal(await f.playTrainingSignal('end'),true);assert.equal(f.pulses.length,13);assert.equal(f.instances[0].state,'running')
 assert.equal(f.pulses.at(-1),2.75)
})
test('blocked audio reports failure for a later retry and closed contexts can be unlocked again',async()=>{
 const f=audioFixture();await f.unlockTrainingAudio();f.instances[0].state='suspended';f.instances[0].fail=true
 assert.equal(await f.playTrainingSignal('minute'),false);assert.equal(f.pulses.length,0)
 f.instances[0].fail=false;assert.equal(await f.playTrainingSignal('minute'),true)
 f.instances[0].state='closed';assert.equal(await f.unlockTrainingAudio(),true);assert.equal(f.instances.length,2)
})
