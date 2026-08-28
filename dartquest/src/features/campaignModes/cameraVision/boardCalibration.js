import { BOARD_MODEL_RADII, NORMALIZED_BOARD_SIZE, NORMALIZED_CENTER, SEGMENT_BOUNDARY_ANGLES, STEEL_BOARD_MM, normalizedBoardPoint, normalizedRadius } from './boardGeometry.js'
import { findHomography, findHomographyRansac, invertHomography, projectPoint, reprojectionError } from './boardHomography.js'

const DOUBLE_MIDDLE_TO_PHYSICAL_BOARD = ((STEEL_BOARD_MM.doubleInnerRadius + STEEL_BOARD_MM.doubleOuterRadius) / 2) / 225.5

function ellipsePoint(board, angle, scale) {
  const ex = Math.cos(angle) * board.rx * scale, ey = Math.sin(angle) * board.ry * scale, cosine = Math.cos(board.rotation), sine = Math.sin(board.rotation)
  return { x: board.x + ex * cosine - ey * sine, y: board.y + ex * sine + ey * cosine }
}

function edgeMap(imageData) {
  const { data, width, height } = imageData, gray = new Uint8Array(width * height), edge = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) gray[p] = (data[i] * 3 + data[i + 1] * 6 + data[i + 2]) / 10
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) { const p = y * width + x; edge[p] = Math.min(255, Math.abs(gray[p+1]-gray[p-1]) + Math.abs(gray[p+width]-gray[p-width])) }
  return edge
}

function refineIntersection(board, angle, edge, width, height) {
  let best = null
  for (let angular = -2; angular <= 2; angular += 1) for (let radial = -.025; radial <= .025; radial += .01) {
    const point = ellipsePoint(board, angle + angular * Math.PI / 180, DOUBLE_MIDDLE_TO_PHYSICAL_BOARD + radial)
    const x = Math.round(point.x), y = Math.round(point.y); if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) continue
    const strength = edge[y * width + x] / 255
    if (!best || strength > best.confidence) best = { ...point, confidence: strength }
  }
  return best
}

function validateGeometry(imageData, inverse) {
  if (!inverse) return 0
  const edge = edgeMap(imageData), radii = [BOARD_MODEL_RADII.outerBull, BOARD_MODEL_RADII.tripleInner, BOARD_MODEL_RADII.tripleOuter, BOARD_MODEL_RADII.doubleInner, BOARD_MODEL_RADII.doubleOuter]
  let score = 0, samples = 0
  for (const radius of radii) for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 18) {
    const source = projectPoint(inverse, { x: NORMALIZED_CENTER + Math.cos(angle) * radius, y: NORMALIZED_CENTER + Math.sin(angle) * radius })
    const x = Math.round(source?.x), y = Math.round(source?.y); if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) continue
    score += edge[y * imageData.width + x] / 255; samples += 1
  }
  return samples ? Math.min(1, score / samples * 2.2) : 0
}

function keypointsFromMatches(matches) {
  const targets = [-Math.PI/2, 0, Math.PI/2, Math.PI]
  const names = ['top', 'right', 'bottom', 'left'], result = {}, confidence = {}
  if (!matches.length) return { keypoints: { top: null, right: null, bottom: null, left: null }, keypointConfidence: { top: 0, right: 0, bottom: 0, left: 0 } }
  targets.forEach((targetAngle, index) => {
    const match = matches.reduce((best, item) => Math.abs(Math.atan2(Math.sin(item.targetAngle-targetAngle), Math.cos(item.targetAngle-targetAngle))) < Math.abs(Math.atan2(Math.sin(best.targetAngle-targetAngle), Math.cos(best.targetAngle-targetAngle))) ? item : best, matches[0])
    result[names[index]] = match?.source ?? null; confidence[names[index]] = match?.confidence ?? 0
  })
  return { keypoints: result, keypointConfidence: confidence }
}

export function calibrateBoard(imageData, coarseBoard) {
  if (coarseBoard?.x == null || !coarseBoard?.spiderLines) return { state: 'SEARCHING', normalizedBoardSize: NORMALIZED_BOARD_SIZE }
  const edge = edgeMap(imageData), matches = []
  for (let index = 0; index < 20; index += 1) {
    const sourceAngle = (coarseBoard.spiderPhase ?? 0) + index * Math.PI / 10
    const source = refineIntersection(coarseBoard, sourceAngle, edge, imageData.width, imageData.height)
    const targetAngle = SEGMENT_BOUNDARY_ANGLES[index]
    if (source?.confidence >= .16) matches.push({ source, target: normalizedBoardPoint(targetAngle), targetAngle, confidence: Math.min(1, source.confidence * .65 + (coarseBoard.spiderConfidence ?? 0) * .35) })
  }
  const keys = keypointsFromMatches(matches)
  if (matches.length < 4) return { state: 'COARSE_FOUND', ...keys, matchCount: matches.length, normalizedBoardSize: NORMALIZED_BOARD_SIZE }
  const estimate = findHomographyRansac(matches), inverse = invertHomography(estimate.matrix), geometryValidationScore = validateGeometry(imageData, inverse)
  const bullTarget = estimate.matrix ? projectPoint(estimate.matrix, { x: coarseBoard.bullX ?? coarseBoard.x, y: coarseBoard.bullY ?? coarseBoard.y }) : null
  const bullCenterError = bullTarget ? Math.hypot(bullTarget.x - NORMALIZED_CENTER, bullTarget.y - NORMALIZED_CENTER) : Infinity
  const normalizedCircleError = estimate.error / Math.max(1, normalizedRadius(STEEL_BOARD_MM.doubleOuterRadius)) * 100
  const condition = estimate.error <= 5 && geometryValidationScore >= .28 && bullCenterError <= 30 ? 'GOOD' : estimate.error <= 10 && geometryValidationScore >= .16 ? 'WEAK' : 'BAD'
  return { state: condition === 'GOOD' ? 'CALIBRATED' : condition === 'WEAK' ? 'HOMOGRAPHY_VALID' : 'KEYPOINTS_FOUND', bull: { x: coarseBoard.bullX, y: coarseBoard.bullY, confidence: coarseBoard.bullConfidence }, ...keys, matches, homography: estimate.matrix, inverseHomography: inverse, reprojectionError: estimate.error, orientationAngle: coarseBoard.boardOrientation ?? 0, trackingConfidence: coarseBoard.confidence, normalizedBoardSize: NORMALIZED_BOARD_SIZE, matchCount: matches.length, inlierCount: estimate.inliers.length, usedRansac: estimate.usedRansac, geometryValidationScore, normalizedCircleError, bullCenterError, condition }
}

export function calibrationFromManualKeypoints(points) {
  if (points.length !== 4) return null
  const targetAngles = [-Math.PI/2, 0, Math.PI/2, Math.PI], matches = points.map((source, index) => ({ source, target: normalizedBoardPoint(targetAngles[index]), targetAngle: targetAngles[index], confidence: 1 }))
  const homography = findHomography(matches), inverseHomography = invertHomography(homography)
  return { state: 'CALIBRATED', keypoints: { top: points[0], right: points[1], bottom: points[2], left: points[3] }, keypointConfidence: { top: 1, right: 1, bottom: 1, left: 1 }, matches, homography, inverseHomography, reprojectionError: reprojectionError(homography, matches), orientationAngle: 0, trackingConfidence: 1, normalizedBoardSize: NORMALIZED_BOARD_SIZE, matchCount: 4, inlierCount: 4, usedRansac: false, geometryValidationScore: 1, normalizedCircleError: 0, bullCenterError: 0, condition: 'GOOD', manual: true }
}

export function renderNormalizedBoard(canvas, imageData, inverseHomography, displaySize = 140) {
  if (!canvas || !inverseHomography) return
  canvas.width = displaySize; canvas.height = displaySize
  const context = canvas.getContext('2d'), output = context.createImageData(displaySize, displaySize), scale = NORMALIZED_BOARD_SIZE / displaySize
  for (let y = 0; y < displaySize; y += 1) for (let x = 0; x < displaySize; x += 1) {
    const source = projectPoint(inverseHomography, { x: x * scale, y: y * scale }), sx = Math.round(source?.x), sy = Math.round(source?.y), target = (y * displaySize + x) * 4
    if (sx >= 0 && sy >= 0 && sx < imageData.width && sy < imageData.height) { const origin = (sy * imageData.width + sx) * 4; output.data[target] = imageData.data[origin]; output.data[target+1] = imageData.data[origin+1]; output.data[target+2] = imageData.data[origin+2]; output.data[target+3] = 255 }
  }
  context.putImageData(output, 0, 0)
}
