import assert from 'node:assert/strict'
import path from 'node:path'
import {build} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from '@playwright/test'
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import Chart from './TrainingTimeline.jsx';import './CustomTraining.css';const root=createRoot(document.getElementById('root'));const old={id:'old',game:'favorite-double',minutes:15,created_at:'2026-11-01T12:00:00Z',payload:{game:'favorite-double',entries:[{points:32,count:1,double:16}]}};const current={...old,id:'new',created_at:'2026-11-08T12:00:00Z',payload:{game:'favorite-double',entries:[{points:96,count:3,double:16}],visitVersion:1,visits:[{successful:1,failed:1},{successful:0,failed:1},{successful:0,failed:1}]}};const friend={...current,id:'friend',payload:{game:'favorite-double',entries:[{points:95,count:1}],visitVersion:1,visits:[{successful:1,failed:0},{successful:0,failed:1},{successful:0,failed:1}]}};root.render(React.createElement('main',{className:'custom-training'},React.createElement(Chart,{game:'favorite-double',minutes:15,rows:[old,current],compareRows:[friend],compareName:'Alex'})));`
const built=await build({configFile:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'mixed-stats',resolveId(id){if(id.endsWith('__mixed_stats__.jsx'))return id},load(id){if(id.endsWith('__mixed_stats__.jsx'))return entry}},react()],build:{write:false,minify:false,lib:{entry:path.resolve('src/features/training/__mixed_stats__.jsx'),name:'QA',formats:['iife']}}})
const output=(Array.isArray(built)?built[0]:built).output
const browser=await chromium.launch({channel:'chrome',headless:true})
try {for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setContent('<style>body{margin:0;background:#0b1118}</style><div id="root"></div>')
 for(const item of output.filter(o=>o.type==='asset'&&o.fileName.endsWith('.css')))await page.addStyleTag({content:item.source})
 await page.addScriptTag({content:output.find(o=>o.type==='chunk').code});const chart=page.getByRole('region',{name:'Trainingsverlauf'});await chart.waitFor()
 assert.ok((await chart.locator('.timeline-legend').innerText()).includes('Aufnahmen insgesamt'))
 assert.equal(await chart.locator('.bulls-chart-column').first().locator('.timeline-bars > i').count(),2)
 assert.equal(await chart.locator('.bulls-chart-column').last().locator('.timeline-bars > i').count(),3)
 assert.equal(await chart.locator('.timeline-visit-value').innerText(),'4')
 assert.equal(await chart.locator('.friend-record-bars > button').count(),3)
 await chart.locator('.bulls-chart-column').last().click();await page.getByRole('dialog').getByRole('heading',{name:'AUFNAHMEBILANZ'}).waitFor();assert.equal(await page.getByRole('dialog').getByLabel('Aufnahmebilanz').locator('.statistics-grid > div').first().locator('strong').innerText(),'4');await page.getByRole('button',{name:'SCHLIESSEN',exact:true}).click()
 await page.getByRole('button',{name:/Alex: Aufnahmen insgesamt/}).click();assert.equal(await page.getByRole('dialog').getByLabel('Aufnahmebilanz').locator('.statistics-grid > div').first().locator('strong').innerText(),'3');await page.getByRole('button',{name:'SCHLIESSEN',exact:true}).click()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[])
 if(process.argv.includes('--preview')&&width===390)console.log('QA_IMAGE:'+(await chart.locator('.bulls-chart-card').screenshot({type:'jpeg',quality:50})).toString('base64'))
 console.log(width+'px: third favorite-double visit bar, exact count, shared count axis, friend comparison and legacy omission passed');await page.close()
}} finally {await browser.close()}
