import { BOARD_MODEL_RADII, NORMALIZED_CENTER } from './boardGeometry.js'
import { invertHomography, projectPoint } from './boardHomography.js'

const TAU = Math.PI * 2
const RADII = Object.fromEntries(Object.entries(BOARD_MODEL_RADII).map(([key, value]) => [key, value / BOARD_MODEL_RADII.doubleOuter]))
const MID_DOUBLE = (RADII.doubleInner + 1) / 2
const MID_TRIPLE = (RADII.tripleInner + RADII.tripleOuter) / 2
const mean = (values) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)
export const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? Infinity

export function prepareFrame(frame) {
  const { width, height, data } = frame, color = new Int8Array(width * height), gray = new Uint8Array(width * height)
  for (let i = 0; i < color.length; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    gray[i] = .299 * r + .587 * g + .114 * b
    // Deliberately bounded colour proposal, not a classifier for arbitrary board colours.
    if (r > 45 && r > g * 1.3 && r > b * 1.25) color[i] = 1
    else if (g > 35 && g > r * 1.12 && g > b * 1.08) color[i] = -1
  }
  return { width, height, color, gray }
}
function sample(map, frame, x, y) {
  x = Math.round(x); y = Math.round(y)
  return x >= 0 && y >= 0 && x < frame.width && y < frame.height ? map[y * frame.width + x] : 0
}
function at(frame, map, h, x, y) { const p = projectPoint(h, { x, y }); return p ? sample(map, frame, p.x, p.y) : 0 }
function ringPoint(angle, radius) { return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius } }

export function findBullCandidates(frame) {
  const { color, width, height } = frame, seen = new Uint8Array(color.length), candidates = []
  for (let start = 0; start < color.length; start++) {
    if (seen[start] || color[start] !== 1) continue
    const queue = [start]; seen[start] = 1
    let sx = 0, sy = 0, minX = width, minY = height, maxX = 0, maxY = 0
    for (let i = 0; i < queue.length; i++) {
      const pos = queue[i], x = pos % width, y = Math.floor(pos / width)
      sx += x; sy += y; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const n = ny * width + nx
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && !seen[n] && color[n] === 1) { seen[n] = 1; queue.push(n) }
      }
    }
    const area = queue.length, rx = (maxX - minX + 1) / 2, ry = (maxY - minY + 1) / 2
    if (area < 5 || area > width * height * .004 || Math.min(rx, ry) / Math.max(rx, ry) < .4 || area / (4 * rx * ry) < .45) continue
    const x = sx / area, y = sy / area
    let green = 0
    for (let i = 0; i < 32; i++) { const angle = i * TAU / 32; green += sample(color, frame, x + Math.cos(angle) * rx * 1.75, y + Math.sin(angle) * ry * 1.75) === -1 ? 1 : 0 }
    if (green / 32 >= .55) candidates.push({ x, y, radius: Math.sqrt(area / Math.PI), green: green / 32 })
  }
  return candidates.sort((a, b) => b.green - a.green).slice(0, 6)
}

function radialLandmarks(frame, bull) {
  const expected = bull.radius / RADII.innerBull, points = []
  for (let i = 0; i < 96; i++) {
    const angle = i * TAU / 96, dx = Math.cos(angle), dy = Math.sin(angle), runs = []
    let start = null, last = 0
    for (let r = Math.max(8, expected * .25); r <= Math.min(Math.hypot(frame.width, frame.height), expected * 1.8); r += .75) {
      const x = bull.x + dx * r, y = bull.y + dy * r
      if (x < 1 || y < 1 || x >= frame.width - 1 || y >= frame.height - 1) break
      if (sample(frame.color, frame, x, y)) { if (start === null) start = r; last = r }
      else if (start !== null && r - last > 1.5) { runs.push({ r: (start + last) / 2, width: last - start + .75 }); start = null }
    }
    let best = null
    for (const outer of runs) for (const inner of runs) {
      const ratio = inner.r / outer.r
      if (ratio < .52 || ratio > .72 || outer.r < expected * .5 || outer.width / outer.r > .12 || inner.width / inner.r > .16) continue
      const cost = Math.abs(ratio - MID_TRIPLE / MID_DOUBLE) + .1 * Math.abs(Math.log(outer.width / inner.width))
      if (!best || cost < best.cost) best = { cost, outer, inner }
    }
    if (best) points.push({ x: bull.x + dx * best.outer.r, y: bull.y + dy * best.outer.r, inner: { x: bull.x + dx * best.inner.r, y: bull.y + dy * best.inner.r }, angle })
  }
  return points
}
function leastSquares(rows, values) {
  const n = rows[0].length, matrix = Array.from({ length: n }, () => Array(n + 1).fill(0))
  rows.forEach((row, k) => { for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) matrix[i][j] += row[i] * row[j]; matrix[i][n] += row[i] * values[k] } })
  for (let i = 0; i < n; i++) {
    let pivot = i
    for (let j = i + 1; j < n; j++) if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j
    if (Math.abs(matrix[pivot][i]) < 1e-9) return null
    ;[matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]]
    const divisor = matrix[i][i]
    for (let k = i; k <= n; k++) matrix[i][k] /= divisor
    for (let j = 0; j < n; j++) if (j !== i) { const factor = matrix[j][i]; for (let k = i; k <= n; k++) matrix[j][k] -= factor * matrix[i][k] }
  }
  return matrix.map((row) => row[n])
}
// Fit an outer conic around the observed bull (projected plane origin).
// z'Qz + 2v'z = 1; M = Q + vv'. M's positive square root rectifies the plane.
function fitBoard(points, bull) {
  const scale = median(points.map((p) => Math.hypot(p.x - bull.x, p.y - bull.y)))
  let inliers = points, fit
  for (let pass = 0; pass < 3; pass++) {
    if (inliers.length < 40) return null
    const rows = inliers.map((p) => { const x = (p.x - bull.x) / scale, y = (p.y - bull.y) / scale; return [x * x, 2 * x * y, y * y, 2 * x, 2 * y] })
    fit = leastSquares(rows, rows.map(() => 1))
    if (!fit) return null
    const [a, b, c, d, e] = fit
    inliers = points.filter((p) => {
      const x = (p.x - bull.x) / scale, y = (p.y - bull.y) / scale
      return Math.abs(a * x * x + 2 * b * x * y + c * y * y + 2 * d * x + 2 * e * y - 1) < .07
    })
  }
  const [a, b, c, d, e] = fit, qdet = a * c - b * b
  const m00 = a + d * d, m01 = b + d * e, m11 = c + e * e, det = m00 * m11 - m01 * m01
  if (qdet <= 0 || det <= 0 || a <= 0 || c <= 0 || inliers.length < 60) return null
  const s = Math.sqrt(det), t = Math.sqrt(m00 + m11 + 2 * s)
  const root00 = (m00 + s) / t, root01 = m01 / t, root11 = (m11 + s) / t
  const rootDet = root00 * root11 - root01 * root01
  const ax = root11 / rootDet / MID_DOUBLE, ay = -root01 / rootDet / MID_DOUBLE, by = root00 / rootDet / MID_DOUBLE
  const gx = d * ax + e * ay, gy = d * ay + e * by
  if (Math.hypot(gx, gy) > .35) return null
  const unitTransform = [scale * ax + bull.x * gx, scale * ay + bull.x * gy, bull.x, scale * ay + bull.y * gx, scale * by + bull.y * gy, bull.y, gx, gy, 1]
  const ex = -(c * d - b * e) / qdet, ey = -(-b * d + a * e) / qdet
  const eigenDelta = Math.hypot(a - c, 2 * b), factor = 1 - d * ex - e * ey
  const ellipse = { center: { x: bull.x + ex * scale, y: bull.y + ey * scale }, rx: scale * Math.sqrt(factor / ((a + c - eigenDelta) / 2)), ry: scale * Math.sqrt(factor / ((a + c + eigenDelta) / 2)), rotation: .5 * Math.atan2(2 * b, a - c) + Math.PI / 2, ring: 'doubleMiddle' }
  return { unitTransform, inliers, ellipse }
}
function rotateTransform(h, angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  return [h[0] * c + h[1] * s, -h[0] * s + h[1] * c, h[2], h[3] * c + h[4] * s, -h[3] * s + h[4] * c, h[5], h[6] * c + h[7] * s, -h[6] * s + h[7] * c, h[8]]
}
function orientationEvidence(frame, h, angle) {
  let color = 0, boundaries = 0
  const supported = []
  for (let i = 0; i < 20; i++) {
    const center = -Math.PI / 2 + angle + i * Math.PI / 10, boundary = center - Math.PI / 20
    for (const radius of [MID_TRIPLE, MID_DOUBLE]) {
      const p = ringPoint(center, radius)
      color += at(frame, frame.color, h, p.x, p.y) === (i % 2 ? -1 : 1) ? 1 : 0
    }
    const contrast = mean([.3, .45, .75, .87].map((radius) => {
      const left = ringPoint(boundary - .035, radius), right = ringPoint(boundary + .035, radius)
      return Math.abs(at(frame, frame.gray, h, left.x, left.y) - at(frame, frame.gray, h, right.x, right.y)) / 255
    }))
    boundaries += contrast
    if (contrast > .2) supported.push(i)
  }
  return { color: color / 40, wires: boundaries / 20, supported, score: color / 40 * .4 + boundaries / 20 * .6 }
}
export function validateBoard(frame, h) {
  let bullRed = 0, bullGreen = 0, triple = 0, double = 0, offRing = 0, visible = 0
  for (let i = 0; i < 96; i++) {
    const angle = i * TAU / 96 + .017
    const sampleRadius = (radius) => { const p = ringPoint(angle, radius); return at(frame, frame.color, h, p.x, p.y) }
    bullRed += sampleRadius(RADII.innerBull * .5) === 1 ? 1 : 0
    bullGreen += sampleRadius((RADII.innerBull + RADII.outerBull) / 2) === -1 ? 1 : 0
    triple += sampleRadius(MID_TRIPLE) !== 0 ? 1 : 0
    double += sampleRadius(MID_DOUBLE) !== 0 ? 1 : 0
    for (const radius of [RADII.tripleInner - .03, RADII.tripleOuter + .03, RADII.doubleInner - .03, 1.03]) offRing += sampleRadius(radius) !== 0 ? 1 : 0
    const p = projectPoint(h, ringPoint(angle, 1))
    if (p && p.x >= 0 && p.y >= 0 && p.x < frame.width && p.y < frame.height) visible++
  }
  const orientation = orientationEvidence(frame, h, 0)
  const metrics = { bull: Math.min(bullRed, bullGreen) / 96, triple: triple / 96, double: double / 96, offRing: offRing / 384, visible: visible / 96, sectorColor: orientation.color, wires: orientation.wires, wireCount: orientation.supported.length }
  const valid = metrics.bull >= .6 && metrics.triple >= .72 && metrics.double >= .72 && metrics.offRing < .18 && metrics.visible >= .95 && metrics.sectorColor >= .75 && metrics.wireCount >= 14
  const score = Math.min(metrics.bull, metrics.triple, metrics.double, metrics.sectorColor, metrics.wireCount / 20, 1 - metrics.offRing)
  return { valid, score, confidence: valid ? score >= .85 ? 'HIGH' : 'MEDIUM' : 'LOW', metrics }
}
export function createBoardTransform(unitTransform, sourceSize, videoSize = sourceSize) {
  const r = BOARD_MODEL_RADII.doubleOuter, c = NORMALIZED_CENTER, h = unitTransform
  const sx = videoSize.width / sourceSize.width, sy = videoSize.height / sourceSize.height
  const inverseHomography = [h[0] / r * sx, h[1] / r * sx, (h[2] - c * (h[0] + h[1]) / r) * sx, h[3] / r * sy, h[4] / r * sy, (h[5] - c * (h[3] + h[4]) / r) * sy, h[6] / r, h[7] / r, h[8] - c * (h[6] + h[7]) / r]
  return { homography: invertHomography(inverseHomography), inverseHomography, sourceSize: videoSize, calibrationMode: 'AUTO_POC' }
}
export function detectBoard(image, timestamp = 0) {
  const frame = prepareFrame(image), candidates = findBullCandidates(frame)
  let best = null
  for (const bull of candidates) {
    const points = radialLandmarks(frame, bull), fit = fitBoard(points, bull)
    if (!fit) continue
    let orientation = null
    for (let step = -36; step <= 36; step++) {
      const angle = step * Math.PI / 360, evidence = orientationEvidence(frame, fit.unitTransform, angle)
      if (!orientation || evidence.score > orientation.score) orientation = { ...evidence, angle }
    }
    const unitTransform = rotateTransform(fit.unitTransform, orientation.angle), validation = validateBoard(frame, unitTransform)
    const top = projectPoint(unitTransform, { x: 0, y: -1 })
    const rotation = Math.atan2(top.x - bull.x, bull.y - top.y)
    const result = { ...validation, center: { x: bull.x, y: bull.y }, bullCenter: { x: bull.x, y: bull.y }, boardEllipse: fit.ellipse, rotation, orientationAssumption: '20_NEAR_IMAGE_UP', unitTransform, transform: createBoardTransform(unitTransform, frame), landmarks: fit.inliers.map(({ x, y }) => ({ x, y, kind: 'doubleMiddle' })), timestamp, sourceSize: { width: frame.width, height: frame.height } }
    if (!best || result.score > best.score) best = result
  }
  return best ?? { valid: false, confidence: 'LOW', score: 0, timestamp, reason: candidates.length ? 'RING_GEOMETRY_NOT_VALIDATED' : 'NO_BULL_ANCHOR', landmarks: [] }
}
