import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'

const mock = `
window.qa={resets:[],markers:[],ownSharing:false,friendSharing:true};
const custom=['bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock'];
window.qa.rows=custom.flatMap(game=>Array.from({length:12},(_,i)=>({id:game+i,user_id:'me',game,minutes:game==='around-the-clock'?0:15,status:'completed',created_at:new Date(Date.UTC(2026,9,i+1,19)).toISOString(),payload:{game,entries:[{points:100,count:1,double:16}],route:[16,8,4],routeThrows:[{target:16,hit:true},{target:8,hit:false},{target:4,hit:true}],includeBull:false,misses:i,elapsedMs:(i+1)*60000,singleBull:10+i,doubleBull:5+i}})));
window.qa.friendRows=window.qa.rows.map(r=>({...r,id:'friend'+r.id,payload:{...r.payload,singleBull:40,doubleBull:20}}));
window.qa.standard=['201','bull-finisher','random-checkouts'].map(game=>({id:game,user_id:'me',mode:'solo',created_at:'2026-11-01T19:00:00Z',plan:[{id:game}],player_results:[{rawData:{attempts:[]}}]}));
export const supabase={async rpc(name,args){
 if(name==='get_friends')return {data:[{id:'friend',profile_name:'Alex',xp:0,player_level:1},...Array.from({length:12},(_,i)=>({id:'friend-'+i,profile_name:'Freund '+(i+1)+' mit langem Namen',xp:0,player_level:1}))]};
 if(name==='get_friend_training_history')return {data:{sharing:window.qa.friendSharing,rows:window.qa.friendSharing?window.qa.friendRows.filter(r=>r.game===args.p_game):[]}};
 if(name==='reset_training_statistics'){window.qa.resets.push(args);if(args.p_category==='custom')window.qa.rows=window.qa.rows.filter(r=>r.game!==args.p_game);else window.qa.standard=window.qa.standard.filter(r=>r.plan[0].id!==args.p_game);const reset_at=new Date().toISOString();window.qa.markers.push({game:args.p_game,category:args.p_category,reset_at});return {data:reset_at};}
 return {error:{message:'Unexpected RPC: '+name}};
},from(table){const filters=[];return {select(){return this},eq(key,value){filters.push([key,value]);return this},order(){return this},range(){return this},limit(){return this},async maybeSingle(){return {data:{enabled:window.qa.ownSharing}}},async upsert(row){window.qa.ownSharing=row.enabled;return {error:null}},then(resolve){let data=table==='training_stat_resets'?window.qa.markers:table==='training_sessions'?window.qa.standard:window.qa.rows;resolve({data:data.filter(row=>filters.every(([key,value])=>row[key]===value)),error:null})}}}};
`
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import Custom from './CustomTrainingStatistics.jsx';import Stats from '../statistics/Statistics.jsx';const root=createRoot(document.getElementById('root'));window.openStats=(game,standard=false)=>root.render(standard?React.createElement(Stats,{key:'standard',activeProfile:{id:'me'},onBack(){}}):React.createElement(Custom,{key:game,activeProfile:{id:'me'},initialGame:game,initialMinutes:15,onBack(){}}));`
const built=await build({configFile:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'statistics-qa',enforce:'pre',resolveId(id){if(id.endsWith('__statistics_qa__.jsx'))return id;if(/(^|\/)lib\/supabase(?:\.js)?$/.test(id))return '\0qa-supabase'},load(id){if(id.endsWith('__statistics_qa__.jsx'))return entry;if(id==='\0qa-supabase')return mock}},react()],build:{write:false,minify:false,lib:{entry:path.resolve('src/features/training/__statistics_qa__.jsx'),name:'QA',formats:['iife']}}})
const output=(Array.isArray(built)?built[0]:built).output
const js=output.find(item=>item.type==='chunk').code
const css=output.filter(item=>item.type==='asset'&&item.fileName.endsWith('.css')).map(item=>item.source).join('\n')+'\n'+readFileSync('src/features/training/CustomTraining.css','utf8')
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.setContent(`<style>body{margin:0}${css}</style><div id="root"></div>`)
  await page.evaluate(()=>{const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}})})
  await page.addScriptTag({content:js})
  for(const game of ['bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock']){
   await page.evaluate(game=>window.openStats(game),game)
   const select=page.getByLabel('FREUND EINBLENDEN')
   await select.waitFor();await page.waitForFunction(()=>!document.querySelector('.training-friend-trigger').disabled)
   assert.equal(await page.getByRole('checkbox').isChecked(),false)
   assert.equal(await page.locator('.training-page-header input[type=checkbox]').count(),1)
   assert.equal(await page.locator('.training-friend-panel input[type=checkbox]').count(),0)
   assert.ok(await page.locator('.training-friend-panel').evaluate(el=>Math.abs(el.getBoundingClientRect().bottom-document.querySelector('.bulls-chart-card').getBoundingClientRect().top)<2))
   await select.click()
   const picker=page.getByRole('dialog',{name:'Mit wem vergleichen?'})
   await picker.waitFor()
   assert.equal(await picker.locator('.training-friend-options > button').count(),14)
   assert.ok(!(await picker.evaluate(el=>getComputedStyle(el).backgroundColor)).includes('255, 255, 255'))
   await picker.getByRole('button',{name:'Freund 12 mit langem Namen'}).scrollIntoViewIfNeeded()
   await page.keyboard.press('Escape')
   assert.equal(await picker.isVisible(),false)
   await select.click()
   if(process.argv.includes('--picker-preview')&&width===390&&game==='bulls-warm-up')console.log('QA_IMAGE:'+(await page.screenshot({type:'jpeg',quality:40})).toString('base64'))
   await picker.getByRole('button',{name:'Alex',exact:true}).click()
   await page.locator('.timeline-friend-overlay').waitFor()
   await select.click()
   assert.equal(await picker.getByRole('button',{name:'Alex',exact:true}).getAttribute('aria-pressed'),'true')
   await picker.getByRole('button',{name:'SCHLIESSEN',exact:true}).click()
   assert.equal(await page.locator('.timeline-friend-overlay polyline').count(),game==='double-route'?3:2)
   if(process.argv.includes('--preview')&&width===390&&game==='bulls-warm-up'){await page.evaluate(()=>window.scrollTo(0,0));console.log('QA_IMAGE:'+(await page.screenshot({type:'jpeg',quality:40})).toString('base64'))}
   await page.getByRole('checkbox').check();await page.waitForFunction(()=>window.qa.ownSharing===true)
   await page.getByRole('checkbox').uncheck();await page.waitForFunction(()=>window.qa.ownSharing===false)
   const before=await page.evaluate(()=>window.qa.resets.length)
   await page.getByRole('button',{name:'Statistik zurücksetzen',exact:true}).click()
   await page.getByRole('button',{name:'ABBRECHEN',exact:true}).click()
   assert.equal(await page.evaluate(()=>window.qa.resets.length),before)
   await page.getByRole('button',{name:'Statistik zurücksetzen',exact:true}).click()
   await page.getByRole('button',{name:'JA, STATISTIK LÖSCHEN',exact:true}).click()
   await page.waitForFunction(count=>window.qa.resets.length===count,before+1)
   await page.waitForFunction(game=>!window.qa.rows.some(r=>r.game===game),game)
   await page.getByRole('status').filter({hasText:'wurde zurückgesetzt'}).waitFor()
   assert.equal(await page.locator('.bulls-chart-column').count(),0)
   await page.locator('.timeline-friend-overlay').waitFor() // friend's statistics remain
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  }
  await page.evaluate(()=>window.openStats(null,true))
  await page.getByRole('button',{name:/Standardtraining/}).click()
  for(const title of ['201','BULL FINISHER','RANDOM CHECKOUTS']){
   await page.getByRole('button').filter({has:page.getByText(title,{exact:true})}).click()
   await page.getByRole('button',{name:'Statistik zurücksetzen',exact:true}).click()
   await page.getByRole('button',{name:'JA, STATISTIK LÖSCHEN',exact:true}).click()
   await page.getByRole('status').filter({hasText:'wurde zurückgesetzt'}).waitFor()
   await page.locator('.training-page-header > button').click()
  }
  assert.equal(await page.evaluate(()=>window.qa.standard.length),0)
  assert.deepEqual(errors,[])
  console.log(width+'px: all nine reset controls, cancellation, friend overlays and sharing verified.')
  await page.close()
 }
} finally { await browser.close() }
