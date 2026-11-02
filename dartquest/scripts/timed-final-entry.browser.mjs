import assert from 'node:assert/strict'
import path from 'node:path'
import {build} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from '@playwright/test'
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import Custom from './CustomTraining.jsx';import Training from './Training.jsx';import TimeChallenge from '../timeChallenge/TimeChallenge.jsx';import CampaignTimed from '../campaign/components/TimedTaskGame.jsx';import{createTrainingTask}from'./trainingTemplates.js';import{createRandomCheckoutState}from'./trainingGames/randomCheckout.js';const root=createRoot(document.getElementById('root'));window.openTime=()=>root.render(React.createElement(TimeChallenge,{key:'time',onBack(){}}));window.openCampaign=()=>root.render(React.createElement(CampaignTimed,{key:'campaign',level:{id:'qa-timed',timeLimitSeconds:61,targets:[{label:'D1'}]},disabled:false,onComplete(){}}));window.openCustom=(game,key)=>{localStorage.setItem('dartquest-custom-training-guest-active',JSON.stringify({id:game+key,game,minutes:15,startedAt:Date.now()-839000,endAt:Date.now()+61000,phase:'playing',doubleBull:0,singleBull:0,entries:[],score:'',favoriteDouble:16,favoriteComboCount:0,route:[16,8,4],routeThrows:[]}));root.render(React.createElement(Custom,{key,onBack(){}}))};window.openStandard=key=>{const task=createTrainingTask('random-checkouts',{configuration:{from:40,to:40,maxVisits:1,minutes:15}});localStorage.setItem('dartquest-active-training-session-guest',JSON.stringify({version:1,sessionId:key,statisticIds:[key],startedAt:new Date().toISOString(),plan:[task],taskIndex:0,players:[{id:1,name:'Spieler',color:'#8be8b7'}],states:[createRandomCheckoutState(task.configuration)],activePlayerIndex:0,seconds:0,score:'',taskStartedAt:Date.now()-1000}));root.render(React.createElement(Training,{key,onBack(){}}))};`
const built=await build({configFile:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'countdown-qa',enforce:'pre',resolveId(id){if(id.endsWith('__countdown_qa__.jsx'))return id},load(id){if(id.endsWith('__countdown_qa__.jsx'))return entry}},react()],build:{write:false,minify:false,lib:{entry:path.resolve('src/features/training/__countdown_qa__.jsx'),name:'QA',formats:['iife']}}})
const output=(Array.isArray(built)?built[0]:built).output,js=output.find(x=>x.type==='chunk').code,css=output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n')
const browser=await chromium.launch({channel:'chrome'})
try {for(const [width,height]of[[390,844],[375,600],[320,568]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.clock.install({time:new Date('2026-11-02T12:00:00Z')})
 await page.setContent(`<style>html{height:100%}body{margin:0;height:calc(100% - 64px)}#root{height:100%}${css}</style><div id="root"></div>`)
 await page.evaluate(()=>{const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});window.qaAudio={pulses:[],resumes:0};window.AudioContext=class {state='suspended';currentTime=0;sampleRate=44100;destination={};constructor(){window.qaAudio.context=this}resume(){window.qaAudio.resumes++;if(window.qaAudio.blocked)return Promise.reject(new Error('Audio blocked'));this.state='running';return Promise.resolve()}createBuffer(){return {}}createBufferSource(){return {connect(){},disconnect(){},start(){}}}createOscillator(){return {frequency:{},connect(){},disconnect(){},start(t){window.qaAudio.pulses.push(t)},stop(){}}}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}}})
 await page.addScriptTag({content:js})
 for(const game of['bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route']){
  await page.evaluate(game=>{window.qaAudio.pulses=[];window.openCustom(game,game)},game)
  await page.getByRole('button',{name:'TRAINING FORTSETZEN'}).click()
  if(game==='favorite-double'){
   assert.equal(await page.locator('.custom-favorite-play .custom-run-history').count(),0)
   for(let i=0;i<5;i++)await page.getByRole('button',{name:'EINMAL GETROFFEN',exact:true}).click()
   assert.equal(await page.locator('.favorite-session-counts > div').first().locator('strong').innerText(),'5')
   assert.equal(await page.locator('.favorite-single > strong').innerText(),'+1 TREFFER')
   assert.equal(await page.locator('.favorite-single > small').innerText(),'+32 Punkte gespeichert')
   if(process.argv.includes('--favorite-preview')&&width===390)console.log('QA_IMAGE:'+(await page.screenshot({type:'jpeg',quality:40})).toString('base64'))
   for(let i=0;i<3;i++)await page.getByRole('button',{name:/COMBO \+1/}).click()
   assert.equal(await page.locator('.favorite-session-counts > div').last().locator('strong').innerText(),'0')
   await page.getByRole('button',{name:'OK · COMBO SPEICHERN'}).click()
   assert.equal(await page.locator('.favorite-session-counts > div').last().locator('strong').innerText(),'1')
   assert.equal(await page.locator('.custom-live > strong').innerText(),'256 Punkte')
  }
  await page.clock.fastForward(1000);await page.clock.runFor(30)
  assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),1,game+' minute warning missing')
  await page.evaluate(()=>{window.qaAudio.context.state='interrupted'})
  await page.clock.fastForward(60000);await page.clock.runFor(30)
  await page.getByRole('status').filter({hasText:'LETZTE EINGABE'}).waitFor()
  assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),13,game+' end alarm missing')
  if(game.includes('combo')){
   const points=game==='t20-combo'?'180':'171'
   for(const digit of points)await page.locator('.score-numbers button').filter({hasText:new RegExp('^'+digit+'$')}).click()
   await page.locator('.score-confirm').click();const picker=page.getByRole('dialog',{name:'Wie viele Combos?'});await picker.getByRole('button',{name:'1',exact:true}).click()
   assert.equal(await page.locator('.score-numbers button').first().isDisabled(),true)
  }else if(game==='favorite-double'){
   for(let i=0;i<3;i++)await page.getByRole('button',{name:/COMBO \+1/}).click()
   await page.getByRole('button',{name:'OK · COMBO SPEICHERN'}).click()
   assert.equal(await page.getByRole('button',{name:/EINMAL GETROFFEN/}).isDisabled(),true)
   assert.equal(await page.locator('.favorite-session-counts > div').last().locator('strong').innerText(),'2')
  }else if(game==='double-route'){
   await page.getByRole('button',{name:'TREFFER · +1'}).click();await page.getByRole('button',{name:'DANEBEN',exact:true}).click();await page.getByRole('button',{name:'TREFFER · +1'}).click()
   assert.equal(await page.getByRole('button',{name:'DANEBEN',exact:true}).isDisabled(),true)
  }else await page.getByRole('button',{name:'DOPPELBULL plus'}).click()
  const layout=await page.evaluate(()=>{const m=document.querySelector('.custom-playing'),b=document.querySelector('.custom-bulls-finish').getBoundingClientRect();return {overflow:m.scrollHeight>m.clientHeight+1,bottom:b.bottom,limit:m.getBoundingClientRect().bottom}})
  assert.equal(layout.overflow,false,game+' overflows');assert.ok(layout.bottom<=layout.limit,game+' finish button hidden')
  await page.getByRole('button',{name:'FERTIG · ERGEBNIS SPEICHERN'}).click();await page.locator('.custom-result').waitFor()
  if(game==='t20-combo')assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dartquest-custom-training-guest-history')).find(r=>r.game==='t20-combo').payload.entries[0].points),180)
 }
 if(width===390){
  await page.evaluate(()=>{window.qaAudio.pulses=[];window.openCustom('t20-combo','audio-retry')})
  await page.getByRole('button',{name:'TRAINING FORTSETZEN'}).click()
  await page.evaluate(()=>{window.qaAudio.context.state='interrupted';window.qaAudio.blocked=true})
  await page.clock.fastForward(1000);await page.clock.runFor(30)
  assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),0)
  await page.evaluate(()=>{window.qaAudio.blocked=false})
  await page.locator('.score-numbers button').filter({hasText:/^1$/}).click();await page.clock.runFor(30)
  assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),1,'Warning was not retried after blocked playback')
 }
 await page.evaluate(()=>{window.qaAudio.pulses=[];window.openStandard('standard')});await page.getByRole('button',{name:/Standardtraining/}).click();await page.getByRole('button',{name:/FORTSETZEN/}).click();await page.getByRole('status').filter({hasText:'LETZTE EINGABE'}).waitFor();await page.clock.runFor(30);assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),12)
 await page.getByRole('button',{name:'1 DART',exact:true}).click();await page.clock.runFor(350)
 assert.equal(await page.getByRole('button',{name:'1 DART',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'FERTIG · ERGEBNIS SPEICHERN'}).click();await page.getByRole('heading',{name:'Training beendet'}).waitFor()
 await page.evaluate(()=>{window.qaAudio.pulses=[];window.openTime()})
 await page.locator('.time-challenge-list article button').first().click();await page.locator('.time-challenge-setup .primary').click()
 const target=(await page.locator('.time-challenge-target strong').innerText()).split(':').reduce((n,v)=>n*60+Number(v),0)
 await page.clock.fastForward((target-60)*1000);await page.clock.runFor(30);assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),1)
 await page.evaluate(()=>{window.qaAudio.context.state='interrupted'})
 await page.clock.fastForward(60000);await page.clock.runFor(30);assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),13)
 await page.evaluate(()=>{window.qaAudio.pulses=[];window.openCampaign()})
 await page.locator('.timed-task-controls .start').click()
 await page.clock.fastForward(1000);await page.clock.runFor(30);assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),1)
 await page.evaluate(()=>{window.qaAudio.context.state='interrupted'})
 await page.clock.fastForward(60000);await page.clock.runFor(30);assert.equal(await page.evaluate(()=>window.qaAudio.pulses.length),13)
 assert.deepEqual(errors,[]);console.log(`${width}×${height}: five countdown warnings/alarms, final entries (including 180) standard final checkout, Time Challenge and campaign signals verified.`);await page.close()
}}finally{await browser.close()}
