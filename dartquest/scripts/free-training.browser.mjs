import assert from 'node:assert/strict'
import path from 'node:path'
import {build} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from '@playwright/test'
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import App from '../../app/App.jsx';createRoot(document.getElementById('root')).render(React.createElement(App));`
const mock=`window.cloudCalls=[];export const supabase={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc(...args){window.cloudCalls.push(args);throw Error('Cloud access forbidden')},from(...args){window.cloudCalls.push(args);throw Error('Cloud access forbidden')}};`
const built=await build({configFile:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'free-qa',enforce:'pre',resolveId(id){if(id.endsWith('__free_qa__.jsx'))return id;if(/(^|\/)lib\/supabase(?:\.js)?$/.test(id))return '\0qa-cloud'},load(id){if(id.endsWith('__free_qa__.jsx'))return entry;if(id==='\0qa-cloud')return mock}},react()],build:{write:false,minify:false,lib:{entry:path.resolve('src/features/training/__free_qa__.jsx'),name:'QA',formats:['iife']}}})
const output=(Array.isArray(built)?built[0]:built).output
const browser=await chromium.launch({channel:'chrome',headless:true})
try {for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setContent('<div id="root"></div>')
 await page.evaluate(()=>{crypto.randomUUID ??= () => 'qa-'+Math.random().toString(36).slice(2);const data=new Map([['dartquest-custom-training-guest-history','[]'],['qa-account','preserved']]);window.persisted=data;Object.defineProperty(window,'localStorage',{value:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}})})
 for(const asset of output.filter(o=>o.type==='asset'&&o.fileName.endsWith('.css')))await page.addStyleTag({content:String(asset.source)})
 await page.addScriptTag({content:output.find(o=>o.type==='chunk').code})
 await page.getByRole('button',{name:'Training',exact:true}).click()
 assert.equal(await page.getByLabel('E-Mail',{exact:true}).count(),0)
 await page.getByLabel('Trainingscode').fill('0000');await page.getByRole('button',{name:'TRAINING ÖFFNEN'}).click();await page.getByRole('alert').waitFor()
 await page.getByLabel('Trainingscode').fill('1910');await page.getByRole('button',{name:'TRAINING ÖFFNEN'}).click()
 await page.getByRole('heading',{name:'Dein Trainingsplan'}).waitFor()
 assert.equal(await page.locator('.bottom-nav').count(),0)
 await page.getByRole('button',{name:'Statistik: Bulls Warm-Up',exact:true}).click()
 assert.equal(await page.getByText('Für Freunde sichtbar').count(),0)
 assert.equal(await page.getByText('Melde dich an, um Trainings mit Freunden zu vergleichen.').count(),0)
 await page.getByRole('button',{name:'Zurück',exact:true}).click()
 await page.locator('.training-template-toggle').filter({hasText:'Around the Clock'}).click()
 await page.getByRole('button',{name:'HINZUFÜGEN',exact:true}).click();await page.getByRole('button',{name:'TRAINING STARTEN',exact:true}).click();await page.getByRole('button',{name:'STARTEN',exact:true}).click()
 try { await page.locator('.custom-around-miss').click({timeout:5000}) } catch(e) {console.log(await page.locator('body').innerText());throw e}
 await page.getByRole('button',{name:'SPIEL BEENDET',exact:true}).click()
 await page.getByRole('heading',{name:'Wer hat trainiert?'}).waitFor()
 assert.equal(await page.getByLabel('Name (optional)',{exact:true}).getAttribute('placeholder'),'Dein Name')
 if(width===320){await page.getByLabel('Name (optional)',{exact:true}).fill('Testspieler');await page.getByRole('button',{name:'ERGEBNIS SPEICHERN',exact:true}).click()}
 else await page.getByRole('button',{name:'ÜBERSPRINGEN',exact:true}).click()
 await page.locator('.custom-result h2').filter({hasText:'1 Fehlwürfe'}).waitFor()
 assert.equal(await page.getByRole('heading',{name:'Wer hat trainiert?'}).count(),0)
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dartquest-free-board-dartquest-custom-training-guest-history')))
 assert.equal(saved.length,1);assert.equal(saved[0].payload.trainingName,width===320?'Testspieler':'')
 assert.deepEqual(await page.evaluate(()=>window.cloudCalls),[])
 assert.equal(await page.evaluate(()=>localStorage.getItem('dartquest-custom-training-guest-history')),'[]')
 assert.equal(await page.evaluate(()=>localStorage.getItem('qa-account')),'preserved')
 await page.getByRole('button',{name:'Zurück',exact:true}).click()
 await page.getByRole('button',{name:'Zurück',exact:true}).click()
 await page.getByRole('button',{name:'Training',exact:true}).click();await page.getByLabel('Trainingscode').fill('1910');await page.getByRole('button',{name:'TRAINING ÖFFNEN'}).click()
 await page.getByRole('button',{name:'Statistik: Around the Clock',exact:true}).click()
 await page.getByRole('heading',{name:'ALLE DURCHLÄUFE'}).waitFor()
 assert.equal(await page.locator('.custom-history article').count(),1)
 await page.locator('.bulls-chart-column').first().click()
 await page.getByRole('button',{name:'SCHLIESSEN',exact:true}).click()
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')))
 await page.getByRole('button',{name:'Training',exact:true}).waitFor()
 assert.deepEqual(errors,[])
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 console.log('Free training: code, plan, result, optional names, neutral placeholder, isolation and persistent re-entry passed at '+width+'px')
 await page.close()
}} finally {await browser.close()}
