import test from 'node:test'
import assert from 'node:assert/strict'
import { IDBFactory } from 'fake-indexeddb'
import { unzipSync, strFromU8 } from 'fflate'
import { captureVideoFrame, createCaptureMetadata, CAPTURE_CATEGORIES } from '../src/features/campaignModes/cameraDataset/captureFrame.js'
import { createDatasetStore, summarizeDataset } from '../src/features/campaignModes/cameraDataset/datasetStore.js'
import { exportDatasetPart, planExport } from '../src/features/campaignModes/cameraDataset/datasetExport.js'
const metadata = (category = 'empty_board') => createCaptureMetadata({category,videoWidth:1920,videoHeight:1080})
const record = (category) => { const blob = new Blob(['jpeg-test'],{type:'image/jpeg'}); return {metadata:{...metadata(category),byteSize:blob.size},blob} }
test('All six labels map only declared dart counts; absent device values stay unknown', () => {
  for (const category of CAPTURE_CATEGORIES) {
    const value = metadata(category.id)
    assert.equal(value.dartCount,category.dartCount); assert.equal(value.zoom,null); assert.equal(value.facingMode,null)
    assert.equal(value.calibrationActive,false); assert.ok(value.imagePath.includes(value.id))
  }
  assert.throws(() => metadata('bad'))
  const calibration = {points:[{x:1,y:2}]}
  const result = createCaptureMetadata({category:'2_darts',videoWidth:1920,videoHeight:1080,settings:{zoom:2,facingMode:'environment'},calibration})
  calibration.points[0].x = 10
  assert.equal(result.calibration.points[0].x,1); assert.equal(result.zoom,2)
})
test('Capture draws only native video at its resolution; draft has no persistence side effects', async () => {
  const video = {readyState:2,videoWidth:1920,videoHeight:1080}, calls=[]
  const canvas={getContext:()=>({drawImage:(...args)=>calls.push(args)}),toBlob:(callback,type,quality)=>{assert.equal(quality,.95);callback(new Blob(['image'],{type}))}}
  const result=await captureVideoFrame(video,{category:'1_dart'},()=>canvas)
  assert.deepEqual(calls,[[video,0,0,1920,1080]]); assert.equal(result.metadata.videoWidth,1920)
  assert.equal(result.blob.type,'image/jpeg'); assert.equal(canvas.width,0)
  await assert.rejects(captureVideoFrame({...video,paused:true},{category:'1_dart'},()=>canvas))
})
test('IndexedDB saves atomically, survives reopening, counts and deletes both records', async () => {
  const factory=new IDBFactory(), store=createDatasetStore(factory,'test'), items=CAPTURE_CATEGORIES.map((c)=>record(c.id))
  assert.deepEqual(await store.list(),[])
  for(const item of items) await store.save(item)
  const reopened=createDatasetStore(factory,'test'), list=await reopened.list()
  assert.equal(summarizeDataset(list).total,6)
  assert.deepEqual(summarizeDataset(list).categories,Object.fromEntries(CAPTURE_CATEGORIES.map((c)=>[c.id,1])))
  await assert.rejects(store.save(items[0]))
  assert.equal((await store.list()).length,6)
  assert.equal(await (await reopened.getImage(items[0].metadata.id)).text(),'jpeg-test')
  await reopened.remove(items[0].metadata.id)
  assert.equal((await store.list()).length,5);assert.equal(await store.getImage(items[0].metadata.id),undefined)
})
test('ZIP exports unique matching images and metadata; batching retains every image', async () => {
  const items=[record('empty_board'),record('1_dart'),record('2_darts'),record('3_darts')]
  const records=items.map((i)=>i.metadata), parts=planExport(records,18)
  assert.equal(parts.length,2);assert.equal(parts.flatMap((p)=>p.records).length,4)
  const blob=await exportDatasetPart(records,async(id)=>items.find((i)=>i.metadata.id===id).blob)
  const files=unzipSync(new Uint8Array(await blob.arrayBuffer())), manifest=JSON.parse(strFromU8(files['metadata.json']))
  assert.equal(manifest.images.length,4); assert.equal(Object.keys(files).length,5)
  for(const item of manifest.images) assert.equal(strFromU8(files[item.imagePath]),'jpeg-test')
  await assert.rejects(exportDatasetPart(records,async()=>null),/fehlt/)
})
