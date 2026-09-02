import { BOARD_MODEL_RADII, GROUND_TRUTH_POINTS, NORMALIZED_BOARD_SIZE, NORMALIZED_CENTER, SEGMENT_BOUNDARY_ANGLES, STEEL_BOARD_MM, normalizedBoardPoint, normalizedRadius } from './boardGeometry.js'
import { findHomographyRansac, invertHomography, projectPoint } from './boardHomography.js'

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

function edgeEnergy(edge, imageData, inverse, points, sourceScale) {
  let sum = 0, samples = 0
  for (const point of points) {
    const source = projectPoint(inverse, point), x = Math.round((source?.x ?? -1) * sourceScale.x), y = Math.round((source?.y ?? -1) * sourceScale.y)
    if (x < 1 || y < 1 || x >= imageData.width - 1 || y >= imageData.height - 1) continue
    sum += edge[y * imageData.width + x] / 255; samples += 1
  }
  return samples ? sum / samples : 0
}

function ringPoints(radius) { return Array.from({ length: 72 }, (_, index) => { const angle = index * Math.PI / 36; return { x: NORMALIZED_CENTER + Math.cos(angle) * radius, y: NORMALIZED_CENTER + Math.sin(angle) * radius } }) }
function linePoints(angle) { return Array.from({ length: 12 }, (_, index) => { const radius = BOARD_MODEL_RADII.outerBull + (BOARD_MODEL_RADII.doubleOuter - BOARD_MODEL_RADII.outerBull) * (index + 1) / 13; return { x: NORMALIZED_CENTER + Math.cos(angle) * radius, y: NORMALIZED_CENTER + Math.sin(angle) * radius } }) }
function contrastScore(expected, off) { return Math.max(0, Math.min(1, (expected - off) / Math.max(.05, expected) * 1.8)) }

export function validateBoardGeometry(imageData, inverse, sourceScale = { x: 1, y: 1 }) {
  if (!inverse) return { score: 0, ringAlignmentScore: 0, tripleAlignmentScore: 0, doubleAlignmentScore: 0, bullAlignmentScore: 0, spiderAlignmentScore: 0, expectedEnergy: 0, offEnergy: 0 }
  const edge = edgeMap(imageData), offset = 5
  const scoreRing = (radii) => {
    const expected = mean(radii.map((radius) => edgeEnergy(edge, imageData, inverse, ringPoints(radius), sourceScale)))
    const off = mean(radii.flatMap((radius) => [edgeEnergy(edge, imageData, inverse, ringPoints(radius - offset), sourceScale), edgeEnergy(edge, imageData, inverse, ringPoints(radius + offset), sourceScale)]))
    return { score: contrastScore(expected, off), expected, off }
  }
  const bull = scoreRing([BOARD_MODEL_RADII.innerBull, BOARD_MODEL_RADII.outerBull]), triple = scoreRing([BOARD_MODEL_RADII.tripleInner, BOARD_MODEL_RADII.tripleOuter]), double = scoreRing([BOARD_MODEL_RADII.doubleInner, BOARD_MODEL_RADII.doubleOuter])
  const expectedSpider = mean(SEGMENT_BOUNDARY_ANGLES.map((angle) => edgeEnergy(edge, imageData, inverse, linePoints(angle), sourceScale)))
  const offSpider = mean(SEGMENT_BOUNDARY_ANGLES.flatMap((angle) => [edgeEnergy(edge, imageData, inverse, linePoints(angle - Math.PI / 90), sourceScale), edgeEnergy(edge, imageData, inverse, linePoints(angle + Math.PI / 90), sourceScale)]))
  const spider = contrastScore(expectedSpider, offSpider), score = bull.score * .15 + triple.score * .25 + double.score * .3 + spider * .3
  return { score, ringAlignmentScore: (triple.score + double.score) / 2, tripleAlignmentScore: triple.score, doubleAlignmentScore: double.score, bullAlignmentScore: bull.score, spiderAlignmentScore: spider, expectedEnergy: mean([bull.expected, triple.expected, double.expected, expectedSpider]), offEnergy: mean([bull.off, triple.off, double.off, offSpider]) }
}

function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 }

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
  const estimate = findHomographyRansac(matches), inverse = invertHomography(estimate.matrix), validation = validateBoardGeometry(imageData, inverse)
  const bullTarget = estimate.matrix ? projectPoint(estimate.matrix, { x: coarseBoard.bullX ?? coarseBoard.x, y: coarseBoard.bullY ?? coarseBoard.y }) : null
  const bullCenterError = bullTarget ? Math.hypot(bullTarget.x - NORMALIZED_CENTER, bullTarget.y - NORMALIZED_CENTER) : Infinity
  const normalizedCircleError = estimate.error / Math.max(1, normalizedRadius(STEEL_BOARD_MM.doubleOuterRadius)) * 100
  const inlierRatio = estimate.inliers.length / matches.length, keypointConfidenceAverage = mean(Object.values(keys.keypointConfidence)), geometryValidationScore = validation.score
  const condition = estimate.error <= 4 && inlierRatio >= .7 && geometryValidationScore >= .72 && keypointConfidenceAverage >= .35 && bullCenterError <= 24 ? 'GOOD' : estimate.error <= 8 && inlierRatio >= .5 && geometryValidationScore >= .52 ? 'ACCEPTABLE' : geometryValidationScore >= .42 ? 'WEAK' : 'BAD'
  return { state: condition === 'GOOD' ? 'CALIBRATED' : ['ACCEPTABLE','WEAK'].includes(condition) ? 'HOMOGRAPHY_VALID' : 'KEYPOINTS_FOUND', calibrationMode: 'AUTO', bull: { x: coarseBoard.bullX, y: coarseBoard.bullY, confidence: coarseBoard.bullConfidence }, ...keys, matches, homography: estimate.matrix, inverseHomography: inverse, reprojectionError: estimate.error, orientationAngle: coarseBoard.spiderPhase ?? 0, trackingConfidence: coarseBoard.confidence, normalizedBoardSize: NORMALIZED_BOARD_SIZE, matchCount: matches.length, inlierCount: estimate.inliers.length, inlierRatio, usedRansac: estimate.usedRansac, geometryValidationScore, geometryValidationBreakdown: validation, normalizedCircleError, bullCenterError, keypointConfidenceAverage, condition, sourceSize: { width: imageData.width, height: imageData.height } }
}

export function calibrationFromManualKeypoints(points, imageData = null, sourceSize = null) {
  if (points.length !== GROUND_TRUTH_POINTS.length) return null
  const matches = points.map((source, index) => ({ source, target: GROUND_TRUTH_POINTS[index].target, targetAngle: GROUND_TRUTH_POINTS[index].angle, confidence: 1 }))
  const estimate = findHomographyRansac(matches, 4), homography = estimate.matrix, inverseHomography = invertHomography(homography)
  const sourceScale = sourceSize && imageData ? { x: imageData.width / sourceSize.width, y: imageData.height / sourceSize.height } : { x: 1, y: 1 }
  const validation = imageData ? validateBoardGeometry(imageData, inverseHomography, sourceScale) : { score: 0 }
  const condition = estimate.error <= 4 && estimate.inliers.length / matches.length >= .75 && validation.score >= .72 ? 'GOOD' : validation.score >= .52 ? 'ACCEPTABLE' : validation.score >= .42 ? 'WEAK' : 'BAD'
  return { state: 'CALIBRATED', calibrationMode: 'MANUAL', keypoints: Object.fromEntries(points.map((point, index) => [`k${index + 1}`, point])), keypointConfidence: Object.fromEntries(points.map((_, index) => [`k${index + 1}`, 1])), matches, homography, inverseHomography, reprojectionError: estimate.error, orientationAngle: 0, orientationDelta: 0, trackingConfidence: 1, normalizedBoardSize: NORMALIZED_BOARD_SIZE, matchCount: matches.length, inlierCount: estimate.inliers.length, inlierRatio: estimate.inliers.length / matches.length, usedRansac: true, geometryValidationScore: validation.score, geometryValidationBreakdown: validation, normalizedCircleError: estimate.error / BOARD_MODEL_RADII.doubleOuter * 100, bullCenterError: null, condition, manual: true, sourceSize }
}

export function renderNormalizedBoard(canvas, imageData, inverseHomography, displaySize = 140, sourceSize = null) {
  if (!canvas || !inverseHomography) return
  canvas.width = displaySize; canvas.height = displaySize
  const context = canvas.getContext('2d'), output = context.createImageData(displaySize, displaySize), scale = NORMALIZED_BOARD_SIZE / displaySize
  for (let y = 0; y < displaySize; y += 1) for (let x = 0; x < displaySize; x += 1) {
    const source = projectPoint(inverseHomography, { x: x * scale, y: y * scale }), sx = Math.round((source?.x ?? -1) * (sourceSize ? imageData.width / sourceSize.width : 1)), sy = Math.round((source?.y ?? -1) * (sourceSize ? imageData.height / sourceSize.height : 1)), target = (y * displaySize + x) * 4
    if (sx >= 0 && sy >= 0 && sx < imageData.width && sy < imageData.height) { const origin = (sy * imageData.width + sx) * 4; output.data[target] = imageData.data[origin]; output.data[target+1] = imageData.data[origin+1]; output.data[target+2] = imageData.data[origin+2]; output.data[target+3] = 255 }
  }
  context.putImageData(output, 0, 0)
}
