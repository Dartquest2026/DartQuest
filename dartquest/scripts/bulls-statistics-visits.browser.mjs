import assert from 'node:assert/strict'
import path from 'node:path'
import {build} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from '@playwright/test'
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import Stats from './CustomTrainingStatistics.jsx';const root=createRoot(document.getElementById('root'));window.openStats=(count=2)=>{const rows=Array.from({length:count},(_,i)=>({id:String(i),game:'bulls-warm-up',minutes:15,created_at:new Date(Date.UTC(2026,10,i+1)).toISOString(),payload:{game:'bulls-warm-up',singleBull:10,doubleBull:0,...(i===0?{}:{visitVersion:1,visits:Array.from({length:30},(_,n)=>({singleBull:n<10?1:0,doubleBull:0}))})}}));localStorage.setItem('dartquest-custom-training-guest-history',JSON.stringify(rows));root.render(React.createElement(Stats,{key:count,initialGame:'bulls-warm-up',onBack(){}}))};`
const built=await build({configFile:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'mixed-stats',resolveId(id){if(id.endsWith('__mixed_stats__.jsx'))return id},load(id){if(id.endsWith('__mixed_stats__.jsx'))return entry}},react()],build:{write:false,minify:false,lib:{entry:path.resolve('src/features/training/__mixed_stats__.jsx'),name:'QA',formats:['iife']}}})
const output=(Array.isArray(built)?built[0]:built).output
const browser=await chromium.launch({channel:'chrome',headless:true})
try {for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setContent('<style>body{margin:0;background:#0b1118}</style><div id="root"></div>')
 await page.evaluate(()=>{const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}})})
 for(const asset of output.filter(item=>item.type==='asset'&&item.fileName.endsWith('.css')))await page.addStyleTag({content:asset.source})
 await page.addScriptTag({content:output.find(item=>item.type==='chunk').code})
 for(const count of [2,12]){
 await page.evaluate(count=>window.openStats(count),count)
 const chart=page.getByRole('region',{name:'Bulls Warm-Up Verlauf',exact:true});await chart.waitFor()
 assert.equal(await chart.locator('.bulls-chart-column').count(),Math.min(count,10))
 assert.equal(await chart.locator('.bulls-visits-bar').count(),count===2?1:10)
 assert.equal(await chart.locator('.bulls-visits-bar > span').last().innerText(),'30')
 assert.equal(await chart.locator('.bulls-visits-bar').last().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(237, 195, 137)')
 assert.equal(await chart.locator('.bulls-visits-legend').evaluate(el=>getComputedStyle(el).color),'rgb(237, 195, 137)')
 assert.equal(await chart.locator('.bulls-latest-balance > strong').innerText(),'250 Punkte · 30 Aufnahmen')
 assert.equal(await chart.locator('.bulls-latest-balance > b').innerText(),'Trefferquote: 11,11 %')
 await chart.locator('.bulls-chart-column').last().click();await page.getByRole('dialog').getByText('11,11 %',{exact:true}).waitFor();await page.getByRole('button',{name:'SCHLIESSEN',exact:true}).click()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 if(process.argv.includes('--preview')&&width===390&&count===2)console.log('QA_IMAGE:'+(await chart.locator('.bulls-chart-card').screenshot({type:'jpeg',quality:50})).toString('base64'))
 }
 assert.deepEqual(errors,[]);console.log(width+'px: gold visit bars, exact totals, 11.11% hit rate, legacy omission and ten-session view passed');await page.close()
}} finally {await browser.close()}
