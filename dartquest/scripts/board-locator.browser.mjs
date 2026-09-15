import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { unzipSync, strFromU8 } from 'fflate'
import { syntheticBoard } from './fixtures/synthetic-board.mjs'
const zipPath=process.argv[2]
let manifest=null
mkdirSync('test-results/locator-real',{recursive:true})
if(zipPath){const files=unzipSync(readFileSync(zipPath));manifest=JSON.parse(strFromU8(files['metadata.json']));manifest.images.forEach((m,i)=>writeFileSync(`test-results/locator-real/${i}.jpg`,files[m.imagePath]))}
const server=await createServer({server:{host:'127.0.0.1',port:5182,strictPort:true}});await server.listen()
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 const frame=syntheticBoard()
 await page.addInitScript(({pixels,width,height})=>{
  window.testFrame={pixels,width,height};window.cameraOffset=0;window.cameraZoom=1;window.cameraBlank=false
  navigator.mediaDevices.getUserMedia=async()=>{
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
   const source=document.createElement('canvas');source.width=width;source.height=height
   source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),width,height),0,0)
   const ctx=canvas.getContext('2d');const draw=()=>{ctx.fillStyle='#111';ctx.fillRect(0,0,width,height);if(!window.cameraBlank)ctx.drawImage(source,window.cameraOffset,0,width*window.cameraZoom,height*window.cameraZoom)}
   draw();const timer=setInterval(draw,60),stream=canvas.captureStream(15),track=stream.getVideoTracks()[0],stop=track.stop.bind(track)
   track.stop=()=>{clearInterval(timer);stop()}
   track.getSettings=()=>({deviceId:'fixture',facingMode:'environment',zoom:window.cameraZoom})
   track.getCapabilities=()=>({zoom:{min:1,max:1.1,step:.05}})
   track.applyConstraints=async({advanced})=>{window.cameraZoom=advanced[0].zoom}
   return stream
  }
 },{pixels:[...frame.data],width:frame.width,height:frame.height})
 await page.goto('http://127.0.0.1:5182/scripts/fixtures/camera-dataset.html')
 await page.getByText(/BOARD ERKANNT/).waitFor({timeout:15000})
 await page.getByRole('button',{name:'Debug aus',exact:true}).click()
 await page.getByRole('button',{name:'FRAME EINFRIEREN'}).click()
 await page.getByText(/FRAME EINGEFROREN/).waitFor()
 await page.getByText(/BOARD ERKANNT/).waitFor()
 await page.getByRole('button',{name:'NEU ANALYSIEREN'}).click()
 await page.getByText(/BOARD ERKANNT/).waitFor()
 await page.getByRole('button',{name:'LIVE FORTSETZEN'}).click()
 await page.getByText(/BOARD ERKANNT/).waitFor()
 await page.evaluate(()=>{window.cameraOffset=5})
 await page.getByText(/BOARD BEWEGT|BOARD UNSICHER/).waitFor()
 await page.getByText(/BOARD ERKANNT/).waitFor()
 await page.getByRole('button',{name:'Vergrößern',exact:true}).click()
 await page.getByText(/BOARD GESUCHT/).waitFor()
 await page.getByText(/BOARD ERKANNT/).waitFor()
 await page.evaluate(()=>{window.cameraBlank=true})
 await page.getByText(/BOARD VERLOREN|BOARD BEWEGT/).waitFor()
 await page.evaluate(()=>{window.cameraBlank=false})
 await page.getByText(/BOARD ERKANNT/).waitFor()
 await page.getByRole('button',{name:'LEGACY · 4 PUNKTE'}).click()
 await page.getByRole('button',{name:'BOARD KALIBRIEREN',exact:true}).waitFor()
 await page.getByRole('button',{name:'AUTOMATISCH SUCHEN'}).click()
 await page.getByText(/BOARD ERKANNT/).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.screenshot({path:'test-results/locator-mobile.png',fullPage:true})
 if(manifest){
  const results=await page.evaluate(async(count)=>{
   const {detectBoard,prepareFrame,validateBoard}=await import('/src/features/campaignModes/cameraVision/boardLocator.js')
   const {createTrackingReference,trackBoard}=await import('/src/features/campaignModes/cameraVision/boardTracking.js')
   const {createBoardOverlayGeometry}=await import('/src/features/campaignModes/cameraVision/boardGeometry.js')
   const {projectPoint}=await import('/src/features/campaignModes/cameraVision/boardHomography.js')
   const results=[]
   for(let i=0;i<count;i++){
    const image=new Image();image.src=`/test-results/locator-real/${i}.jpg`;await image.decode()
    const canvas=document.createElement('canvas');canvas.width=270;canvas.height=480
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,270,480);const frame=ctx.getImageData(0,0,270,480)
    const start=performance.now(),r=detectBoard(frame),detectionMs=performance.now()-start
    const trackStart=performance.now(),track=trackBoard(createTrackingReference(frame,r),frame),trackingMs=performance.now()-trackStart
    const validation=validateBoard(prepareFrame(frame),r.unitTransform)
    ctx.strokeStyle='yellow';ctx.lineWidth=.65
    for(const points of [...createBoardOverlayGeometry().rings.map(r=>r.points),...createBoardOverlayGeometry().boundaries]){ctx.beginPath();points.forEach((p,j)=>{const q=projectPoint(r.transform.inverseHomography,p);j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke()}
    results.push({i,valid:r.valid,confidence:r.confidence,metrics:validation.metrics,center:r.center,rotation:r.rotation,detectionMs,trackingMs,trackingValid:track.valid,png:canvas.toDataURL()})
   }return results
  },manifest.images.length)
  for(const result of results){writeFileSync(`test-results/locator-real/${result.i}-overlay.png`,Buffer.from(result.png.split(',')[1],'base64'));delete result.png;assert.equal(result.valid,true);assert.equal(result.trackingValid,true)}
  writeFileSync('test-results/locator-real/results.json',JSON.stringify(results,null,2));console.log(`PASS: ${results.length} supplied dataset frames detected; timing/overlays in test-results/locator-real`)
 }
 assert.deepEqual(errors,[])
 console.log('PASS: worker startup, freeze/reanalyse/resume, motion, zoom, loss/reacquisition, legacy mode, mobile overflow')
}finally{await browser.close();await server.close()}
