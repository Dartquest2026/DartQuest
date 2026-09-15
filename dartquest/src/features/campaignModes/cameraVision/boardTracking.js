import { projectPoint } from './boardHomography.js'
import { prepareFrame, validateBoard, median } from './boardLocator.js'

export function createTrackingReference(image, result) {
  const frame = prepareFrame(image), patches = []
  // Ring/segment intersections provide two-dimensional texture; no dart feature selection.
  for (let i = 0; i < 20; i++) for (const radius of [.61, .975]) {
    const angle = -Math.PI / 2 - Math.PI / 20 + i * Math.PI / 10
    const p = projectPoint(result.unitTransform, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
    const x = Math.round(p.x), y = Math.round(p.y)
    if (x < 9 || y < 9 || x >= frame.width - 9 || y >= frame.height - 9) continue
    const pixels = []
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pixels.push(frame.gray[(y + dy) * frame.width + x + dx])
    if (Math.max(...pixels) - Math.min(...pixels) > 45) patches.push({ x, y, pixels })
  }
  return { result, patches, width: frame.width, height: frame.height }
}
export function trackBoard(reference, image) {
  if (!reference || reference.width !== image.width || reference.height !== image.height) return { valid: false, moved: true, error: null }
  const frame = prepareFrame(image), shifts = []
  for (const patch of reference.patches) {
    let best = { error: Infinity, dx: 0, dy: 0 }
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      let error = 0, k = 0
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) error += Math.abs(frame.gray[(patch.y + dy + y) * frame.width + patch.x + dx + x] - patch.pixels[k++])
      error = error / 25 + Math.hypot(dx, dy) * .05
      if (error < best.error) best = { error, dx, dy }
    }
    if (best.error < 28) shifts.push(best)
  }
  const error = median(shifts.map((p) => p.error)), shift = median(shifts.map((p) => Math.hypot(p.dx, p.dy)))
  const validation = validateBoard(frame, reference.result.unitTransform)
  const moved = shifts.length < Math.max(14, reference.patches.length * .6) || shift >= 1 || error > 18
  return { ...validation, valid: validation.valid && !moved, moved, error: Number.isFinite(error) ? error : null, shift: Number.isFinite(shift) ? shift : null, trackedLandmarks: shifts.length }
}

// Stable detections are required before showing an overlay. Never average across a movement.
export function updateLocatorState(previous, result, timestamp) {
  const old = previous ?? { state: 'SEARCHING', streak: 0, result: null, everFound: false }
  if (!result.valid) return { state: old.everFound ? 'LOST' : result.center ? 'UNCERTAIN' : 'SEARCHING', streak: 0, result: null, candidate: null, everFound: old.everFound, timestamp, diagnostic: result }
  const prior = old.candidate ?? old.result
  let distance = Infinity
  if (prior?.unitTransform) {
    distance = Math.max(...[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].map((p) => {
      const a = projectPoint(prior.unitTransform, p), b = projectPoint(result.unitTransform, p)
      return Math.hypot(a.x - b.x, a.y - b.y)
    }))
  }
  const streak = distance < 2 ? old.streak + 1 : 1
  if (streak < 2) return { state: 'UNCERTAIN', streak, candidate: result, result: null, everFound: old.everFound, timestamp, diagnostic: result }
  // Preserve the exact transform on repeated agreeing detections; tracking validates it separately.
  return { state: 'TRACKING', streak, candidate: result, result: old.result && distance < 1 ? old.result : result, everFound: true, timestamp, diagnostic: result }
}
