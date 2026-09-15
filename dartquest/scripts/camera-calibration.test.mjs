import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calibrateFourPoints, cameraGeometryCompatible, restoreCalibration } from '../src/features/campaignModes/cameraVision/manualBoardCalibration.js'
import { MANUAL_BOARD_POINTS, createBoardOverlayGeometry, BOARD_REGIONS, DART_ORDER } from '../src/features/campaignModes/cameraVision/boardGeometry.js'
import { projectPoint } from '../src/features/campaignModes/cameraVision/boardHomography.js'
import { createVideoDisplayTransform, clientPointToVideoPoint, videoPointToDisplayPoint } from '../src/features/campaignModes/cameraVision/coordinateTransforms.js'
const geometry = { width: 1920, height: 1080, deviceId: 'rear-camera', facingMode: 'environment', zoom: 1, orientation: 0, resizeMode: 'none' }
const models = [
  ['frontal', [1.4,0,500,0,1.4,150,0,0,1]],
  ['from left', [1.4,.1,500,.1,1.4,150,.001,0,1]],
  ['from above', [1.4,.1,500,0,1.4,150,0,.001,1]],
]
for (const [name, matrix] of models) test(`Four points recover full board: ${name}`, () => {
  const points = MANUAL_BOARD_POINTS.map(({ target }) => projectPoint(matrix, target))
  const result = calibrateFourPoints(points, geometry, { displayWidth: 390, displayHeight: 500 })
  assert.ok(result)
  const model = createBoardOverlayGeometry()
  for (const point of [model.center, ...model.rings.flatMap((r) => r.points), ...model.boundaries.flat()]) {
    const expected = projectPoint(matrix, point), actual = projectPoint(result.inverseHomography, point)
    assert.ok(Math.hypot(expected.x - actual.x, expected.y - actual.y) < 1e-5)
  }
  const stored = JSON.stringify(result)
  assert.deepEqual(restoreCalibration(stored, geometry), result)
  assert.equal(restoreCalibration(stored, { ...geometry, zoom: 2 }), null)
  assert.equal(restoreCalibration(stored, { ...geometry, orientation: 90 }), null)
  assert.equal(restoreCalibration(stored, { ...geometry, width: 1080, height: 1920 }), null)
  assert.equal(restoreCalibration(stored, { ...geometry, deviceId: 'front' }), null)
  assert.equal(JSON.stringify(result), stored)
})
test('Invalid, crossed, duplicate and corrupt references are rejected', () => {
  assert.equal(calibrateFourPoints([{x:1,y:1},{x:2,y:2},{x:3,y:3},{x:4,y:4}], geometry), null)
  const points = MANUAL_BOARD_POINTS.map(({target}) => projectPoint(models[0][1], target))
  assert.equal(calibrateFourPoints([points[0],points[2],points[1],points[3]], geometry), null)
  assert.equal(calibrateFourPoints([points[0],points[0],points[2],points[3]], geometry), null)
  assert.equal(calibrateFourPoints([{x:NaN,y:3},...points.slice(1)], geometry), null)
  assert.equal(restoreCalibration('{broken', geometry), null)
  assert.equal(restoreCalibration('null', geometry), null)
  assert.equal(cameraGeometryCompatible(geometry, {...geometry, zoom:2}), false)
})
test('Touch/video round trip accounts for letterbox, cover crop, CSS scale and resize', () => {
  for (const [vw,vh] of [[1920,1080],[1080,1920]]) for (const [dw,dh] of [[390,500],[700,260]]) for (const fit of ['contain','cover']) {
    const transform = createVideoDisplayTransform(vw,vh,dw,dh,fit)
    const source = {x:vw*.48,y:vh*.51}, display = videoPointToDisplayPoint(source,transform)
    const bounds = {left:31,top:67,width:dw*1.3,height:dh*.8}
    const result = clientPointToVideoPoint({x:31+display.x*1.3,y:67+display.y*.8},bounds,transform)
    assert.ok(Math.hypot(result.x-source.x,result.y-source.y)<1e-8)
  }
  const t = createVideoDisplayTransform(1920,1080,390,500)
  assert.equal(clientPointToVideoPoint({x:10,y:10},{left:0,top:0,width:390,height:500},t),null)
})
test('Board model contains six regions, six rings and twenty correctly ordered sectors', () => {
  assert.deepEqual(DART_ORDER,[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5])
  assert.equal(BOARD_REGIONS.length,6)
  const model = createBoardOverlayGeometry()
  assert.equal(model.rings.length,6); assert.equal(model.boundaries.length,20)
  assert.equal(model.labels[5].number,6)
})
test('Live view shares the overlay between legacy and worker-based locator without dart analysis', () => {
  const source = readFileSync(new URL('../src/features/campaignModes/components/CameraPreview.jsx', import.meta.url),'utf8')
  assert.doesNotMatch(source,/detectBoard|trackBoard|smoothBoard|calibrateBoard|detectNewDart|getImageData/)
  assert.match(source,/calibration\.inverseHomography/)
  assert.match(source,/new BoardLocatorController/)
  assert.match(source,/mode: 'preview'/)
  assert.match(source,/mode: 'confirmed'/)
})
