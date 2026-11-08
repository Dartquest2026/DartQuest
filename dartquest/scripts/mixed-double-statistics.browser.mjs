import assert from 'node:assert/strict'
import path from 'node:path'
import {build} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from '@playwright/test'
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import Stats from './CustomTrainingStatistics.jsx';const root=createRoot(document.getElementById('root'));window.openMixed=game=>{const rows=Array.from({length:12},(_,i)=>{const target=i%2?20:16,route=i%2?[20,10,5]:[16,8,4];return{id:game+i,game,minutes:15,created_at:new Date(Date.UTC(2026,10,i+1)).toISOString(),payload:{game,visitVersion:1,route,routeThrows:route.map((target,index)=>({target,hit:index===0})),entries:game==='favorite-double'?[{double:target,count:2,points:target*4}]:[],visits:game==='favorite-double'?[{successful:1,failed:0}]:[{hits:[route[0]]}]}}});localStorage.setItem('dartquest-custom-training-guest-history',JSON.stringify(rows));root.render(React.createElement(Stats,{key:game,initialGame:game,onBack(){}}))};`
const built=await build({configFile:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'mixed-stats',resolveId(id){if(id.endsWith('__mixed_stats__.jsx'))return id},load(id){if(id.endsWith('__mixed_stats__.jsx'))return entry}},react()],build:{write:false,minify:false,lib:{entry:path.resolve('src/features/training/__mixed_stats__.jsx'),name:'QA',formats:['iife']}}})
const output=(Array.isArray(built)?built[0]:built).output
const browser=await chromium.launch({channel:'chrome',headless:true})
try {for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setContent('<style>body{margin:0;background:#0b1118}</style><div id="root"></div>')
 await page.evaluate(()=>{const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}})})
 for(const item of output.filter(o=>o.type==='asset'&&o.fileName.endsWith('.css')))await page.addStyleTag({content:item.source})
 await page.addScriptTag({content:output.find(o=>o.type==='chunk').code})
 for(const game of ['double-route','favorite-double']){
 await page.evaluate(game=>window.openMixed(game),game)
 const chart=page.getByRole('region',{name:'Trainingsverlauf',exact:true});await chart.waitFor()
 assert.equal(await page.getByLabel('Doppelweg auswählen').count(),0)
 assert.equal(await chart.locator('.bulls-chart-column').count(),10)
 assert.equal(await chart.locator('.timeline-variant-label').filter({hasText:'D20'}).count(),5)
 assert.equal(await chart.locator('.timeline-variant-label').filter({hasText:'D16'}).count(),5)
 assert.equal(await page.locator('.custom-history').last().locator(':scope > article').count(),12)
 await chart.locator('.bulls-chart-column').filter({hasText:'D20'}).first().click()
 const dialog=page.getByRole('dialog');await dialog.waitFor();assert.ok((await dialog.innerText()).includes('D20'))
 if(game==='double-route')assert.ok((await dialog.innerText()).includes('D20 → D10 → D5'))
 await page.getByRole('button',{name:'SCHLIESSEN',exact:true}).click()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 if(process.argv.includes('--preview')&&width===320&&game==='double-route')console.log('QA_IMAGE:'+(await chart.screenshot({type:'jpeg',quality:50})).toString('base64'))
 }
 assert.deepEqual(errors,[]);console.log(width+'px: mixed routes and favorite doubles in one timeline with visible labels and correct detail dialogs');await page.close()
}} finally {await browser.close()}
