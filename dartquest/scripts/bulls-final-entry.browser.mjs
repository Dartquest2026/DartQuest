import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {build} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from '@playwright/test'
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import App from './CustomTraining.jsx';import Counter from './BullCounter.jsx';const root=createRoot(document.getElementById('root'));window.showApp=key=>root.render(React.createElement(App,{key,onBack(){}}));window.showCounter=value=>root.render(React.createElement('main',{className:'custom-training training-builder custom-playing'},React.createElement('div',{className:'custom-bulls',style:{height:'100%'}},React.createElement('section',null,React.createElement('span',null,'BULL'),React.createElement(Counter,{value}),React.createElement('div',null)))));`
const result=await build({configFile:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'bulls-qa',enforce:'pre',resolveId(id){if(id.endsWith('__bulls_qa__.jsx'))return id},load(id){if(id.endsWith('__bulls_qa__.jsx'))return entry}},react()],build:{write:false,minify:false,lib:{entry:path.resolve('src/features/training/__bulls_qa__.jsx'),name:'QA',formats:['iife']}}})
const js=(Array.isArray(result)?result[0]:result).output.find(item=>item.type==='chunk').code
const css=readFileSync('src/features/training/CustomTraining.css','utf8')
const browser=await chromium.launch({channel:'chrome',headless:true})
try{for(const [width,height]of[[390,844],[375,600],[320,480]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setContent(`<style>html{height:100%}body{margin:0;height:calc(100% - 64px)}#root{height:100%}${css}</style><div id="root"></div>`)
 await page.evaluate(()=>{const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});localStorage.setItem('dartquest-custom-training-guest-active',JSON.stringify({id:'final-bull',game:'bulls-warm-up',minutes:15,startedAt:Date.now()-901000,endAt:Date.now()-1000,phase:'playing',doubleBull:11,singleBull:10,entries:[],score:''}))})
 await page.addScriptTag({content:js});await page.evaluate(()=>window.showApp('first'))
 await page.getByRole('button',{name:'TRAINING FORTSETZEN'}).click();await page.getByRole('status').filter({hasText:'LETZTE EINGABE'}).waitFor()
 assert.equal(await page.getByRole('button',{name:'FERTIG · ERGEBNIS SPEICHERN'}).count(),1)
 await page.getByRole('button',{name:'DOPPELBULL plus',exact:true}).click();await page.getByRole('button',{name:'SINGLE BULL plus',exact:true}).click()
 await page.evaluate(()=>window.showApp('resumed'));await page.getByRole('button',{name:'TRAINING FORTSETZEN'}).click();await page.getByRole('status').filter({hasText:'2 / 3'}).waitFor()
 await page.getByRole('button',{name:'SINGLE BULL plus',exact:true}).click()
 assert.equal(await page.getByRole('button',{name:'DOPPELBULL plus',exact:true}).isDisabled(),true)
 assert.equal(await page.getByRole('button',{name:'SINGLE BULL plus',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'SINGLE BULL minus',exact:true}).click();await page.getByRole('button',{name:'DOPPELBULL plus',exact:true}).click()
 const layout=await page.evaluate(()=>{const main=document.querySelector('.custom-playing'),button=document.querySelector('.custom-bulls-finish'),r=button.getBoundingClientRect();return {overflow:main.scrollHeight>main.clientHeight+1,bottom:r.bottom,limit:main.getBoundingClientRect().bottom}})
 assert.equal(layout.overflow,false);assert.ok(layout.bottom<=layout.limit)
 await page.getByRole('button',{name:'FERTIG · ERGEBNIS SPEICHERN'}).click();await page.getByText('DEIN REKORDVERGLEICH').or(page.getByText('NEUER REKORD!')).waitFor()
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dartquest-custom-training-guest-history')))
 assert.equal(saved.length,1);assert.equal(saved[0].payload.doubleBull,13);assert.equal(saved[0].payload.singleBull,11)
 for(const value of[0,1,10,11,12,21,33,88,99,100,111,128,999]){
  await page.evaluate(value=>window.showCounter(value),value)
  await page.waitForFunction(value=>document.querySelector('.custom-bull-number text')?.textContent===String(value),value)
  const shot=await page.locator('.custom-bulls strong').screenshot()
  const offset=await page.evaluate(async encoded=>{const img=new Image();img.src='data:image/png;base64,'+encoded;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let x0=c.width,x1=0,y0=c.height,y1=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i]>185&&d[i+1]>200&&d[i+2]>205){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}}return {dx:(x0+x1+1-c.width)/2,dy:(y0+y1+1-c.height)/2}},shot.toString('base64'))
  assert.ok(Math.abs(offset.dx)<=1&&Math.abs(offset.dy)<=1,`${width}px ${value}: ${JSON.stringify(offset)}`)
 }
 assert.deepEqual(errors,[]);console.log(`${width}×${height}: final three darts, resume, corrections, saving and 13 centered counter values verified.`);await page.close()
}}finally{await browser.close()}
