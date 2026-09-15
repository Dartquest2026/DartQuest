import test from 'node:test'
import assert from 'node:assert/strict'
import { detectBoard } from '../src/features/campaignModes/cameraVision/boardLocator.js'
import { createTrackingReference,trackBoard,updateLocatorState } from '../src/features/campaignModes/cameraVision/boardTracking.js'
import { syntheticBoard } from './fixtures/synthetic-board.mjs'
import { projectPoint } from '../src/features/campaignModes/cameraVision/boardHomography.js'
const variants=[['frontal',[.65,0,160,0,.75,240,0,0,1]],['above',[.75,.12,160,0,.72,240,0,.0007,1]],['side',[.72,.08,160,.10,.80,240,.0007,0,1]],['roll',[.7,-.05,160,.05,.7,240,0,0,1]]]
for(const[name,h]of variants)test(`Locator recovers ${name} board from pixels`,()=>{
 const image=syntheticBoard({h}),r=detectBoard(image)
 assert.equal(r.valid,true,JSON.stringify(r.metrics??r));assert.ok(r.landmarks.length>=60)
 assert.ok(Math.hypot(r.center.x-h[2],r.center.y-h[5])<1)
 for(const p of [{x:0,y:-170},{x:170,y:0},{x:0,y:170},{x:-170,y:0},{x:103,y:0}]){
  const expected=projectPoint(h,p),actual=projectPoint(r.unitTransform,{x:p.x/170,y:p.y/170})
  assert.ok(Math.hypot(expected.x-actual.x,expected.y-actual.y)<3,JSON.stringify({expected,actual}))
 }
})
test('No board, bull alone, wrong rings and missing radial evidence are rejected',()=>{
 assert.equal(detectBoard({width:320,height:480,data:new Uint8ClampedArray(320*480*4)}).valid,false)
 for(const options of [{bull:false},{onlyTriple:true},{sectors:false},{occlusions:[[160,180,110]]}]) assert.equal(detectBoard(syntheticBoard(options)).valid,false,JSON.stringify(options))
})
test('Small occlusions do not collapse board localisation',()=>{
 for(const occlusions of [[[155,170,7]],[[145,170,7],[155,165,7],[165,160,7]]])assert.equal(detectBoard(syntheticBoard({occlusions})).valid,true)
})
test('Stationary reference remains fixed; displacement and zoom trigger reacquisition',()=>{
 const frame=syntheticBoard(),r=detectBoard(frame),reference=createTrackingReference(frame,r)
 assert.equal(trackBoard(reference,frame).valid,true)
 for(const h of [[.65,0,163,0,.75,242,0,0,1],[.70,0,160,0,.82,240,0,0,1]]){
  const moved=syntheticBoard({h});assert.equal(trackBoard(reference,moved).valid,false)
  const newResult=detectBoard(moved);assert.equal(newResult.valid,true)
 }
 let state=updateLocatorState(null,r,0);assert.equal(state.result,null)
 state=updateLocatorState(state,r,650);assert.equal(state.state,'TRACKING')
 for(let i=0;i<30;i++)state=updateLocatorState(state,r,1000+i*650)
 assert.deepEqual(state.result.unitTransform,r.unitTransform)
 state=updateLocatorState(state,{valid:false},22000);assert.equal(state.result,null);assert.equal(state.state,'LOST')
})
