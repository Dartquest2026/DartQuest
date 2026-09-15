import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { unzipSync, strFromU8 } from 'fflate'
import { readFile, mkdir } from 'node:fs/promises'
const server=await createServer({server:{port:5179,strictPort:true,host:'127.0.0.1'}})
await server.listen()
let browser
try {
  browser=await chromium.launch({channel:'chrome',headless:true})
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true})
  const errors=[]; page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(()=>{
    navigator.mediaDevices.getUserMedia=async()=>{
      const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720
      const ctx=canvas.getContext('2d')
      const draw=()=>{ctx.fillStyle='#228844';ctx.fillRect(0,0,1280,720)}
      draw();setInterval(draw,100)
      const stream=canvas.captureStream(10),track=stream.getVideoTracks()[0]
      track.getSettings=()=>({width:1280,height:720,facingMode:'environment',zoom:1,deviceId:'test-camera'})
      return stream
    }
  })
  await page.goto('http://127.0.0.1:5179/scripts/fixtures/camera-dataset.html')
  await page.getByText('● Kamera aktiv',{exact:true}).waitFor()
  // Put a bright red overlay above the video; exported pixels must stay green.
  await page.locator('.camera-detection-canvas').evaluate(c=>{c.style.background='red';c.style.opacity='.6'})
  await page.getByRole('button',{name:'KI DATEN · ENTWICKLUNG'}).click()
  const capture=page.getByRole('button',{name:'AUFNEHMEN',exact:true})
  await capture.click(); await page.getByAltText('Aufnahmevorschau ohne DartQuest-Overlay').waitFor()
  await page.getByRole('button',{name:'VERWERFEN',exact:true}).click()
  await page.getByText('DATENSATZ · 0 Bilder', {exact:false}).waitFor()
  for(const name of ['BOARD LEER','1 DART','2 DARTS','3 DARTS']){
    await page.getByRole('button',{name,exact:true}).click();await capture.click()
    await page.getByRole('button',{name:'SPEICHERN',exact:true}).click()
    await page.getByText('Aufnahme gespeichert.',{exact:true}).waitFor()
  }
  await page.getByText('DATENSATZ · 4 Bilder',{exact:false}).waitFor()
  await page.reload();await page.getByText('● Kamera aktiv',{exact:true}).waitFor()
  await page.getByRole('button',{name:'KI DATEN · ENTWICKLUNG'}).click()
  await page.getByText('DATENSATZ · 4 Bilder',{exact:false}).waitFor()
  await page.getByRole('button',{name:'EXPORT DATENSATZ',exact:true}).click()
  const link=page.getByRole('link',{name:/ZIP HERUNTERLADEN/});await link.waitFor()
  const downloadPromise=page.waitForEvent('download');await link.click();const download=await downloadPromise
  const files=unzipSync(new Uint8Array(await readFile(await download.path())))
  const manifest=JSON.parse(strFromU8(files['metadata.json']))
  assert.equal(manifest.images.length,4)
  for(const m of manifest.images){assert.equal(m.videoWidth,1280);assert.equal(m.videoHeight,720);assert.ok(files[m.imagePath])}
  const pixels=await page.evaluate(async()=>{
    const {datasetStore}=await import('/src/features/campaignModes/cameraDataset/datasetStore.js')
    const list=await datasetStore.list(),blob=await datasetStore.getImage(list[0].id),bmp=await createImageBitmap(blob)
    const c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;const ctx=c.getContext('2d');ctx.drawImage(bmp,0,0)
    return [...ctx.getImageData(640,360,1,1).data]
  })
  assert.ok(pixels[1]>110&&pixels[0]<60,`Raw green video expected: ${pixels}`)
  await page.getByText('DATENSATZ · 4 Bilder',{exact:false}).click()
  await page.locator('.dataset-records button').first().click()
  await page.getByRole('button',{name:'DIESE AUFNAHME LÖSCHEN'}).click()
  await page.getByText('DATENSATZ · 3 Bilder',{exact:false}).waitFor()
  await capture.click()
  await page.evaluate(async()=>{
    const {datasetStore}=await import('/src/features/campaignModes/cameraDataset/datasetStore.js')
    window.originalDatasetSave=datasetStore.save
    datasetStore.save=async()=>{throw new DOMException('full','QuotaExceededError')}
  })
  await page.getByRole('button',{name:'SPEICHERN',exact:true}).click()
  await page.getByText(/Speicher voll\. Vorschau bleibt erhalten/).waitFor()
  await page.getByAltText('Aufnahmevorschau ohne DartQuest-Overlay').waitFor()
  await page.evaluate(async()=>{const {datasetStore}=await import('/src/features/campaignModes/cameraDataset/datasetStore.js');datasetStore.save=window.originalDatasetSave})
  await page.getByRole('button',{name:'VERWERFEN',exact:true}).click()
  await page.getByText('DATENSATZ · 3 Bilder',{exact:false}).waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await mkdir('test-results', {recursive:true}); await page.screenshot({path:'test-results/camera-dataset.png',fullPage:true})
  assert.deepEqual(errors,[])
  console.log('PASS: camera start, raw capture, 0/1/2/3 categories, preview, discard, save, counters, reload, ZIP, pixel exclusion, delete, mobile overflow')
}finally{await browser?.close();await server.close()}

