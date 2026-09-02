const TAU = Math.PI * 2

export function getContainedVideoRect(videoWidth, videoHeight, stageWidth, stageHeight) {
  if (!videoWidth || !videoHeight || !stageWidth || !stageHeight) return { x: 0, y: 0, width: stageWidth, height: stageHeight, scale: 1 }
  const scale = Math.min(stageWidth / videoWidth, stageHeight / videoHeight)
  const width = videoWidth * scale, height = videoHeight * scale
  return { x: (stageWidth - width) / 2, y: (stageHeight - height) / 2, width, height, scale }
}

export function normalizeBoardPoint(point, board) {
  if (!point || !board?.rx || !board?.ry) return null
  const dx = point.x - board.x, dy = point.y - board.y
  const rotation = board.rotation ?? 0
  const cosine = Math.cos(-rotation), sine = Math.sin(-rotation)
  return { x: (dx * cosine - dy * sine) / board.rx, y: (dx * sine + dy * cosine) / board.ry }
}

export function isInTwentySector(point, board, twentyRotation = 0) {
  const normalized = normalizeBoardPoint(point, board)
  if (!normalized) return false
  const angle = Math.atan2(normalized.y, normalized.x) - twentyRotation
  return Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2))) <= Math.PI / 20
}

function grayscaleAndEdges(imageData) {
  const { data, width, height } = imageData, gray = new Uint8Array(width * height), edge = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) gray[p] = (data[i] * 3 + data[i + 1] * 6 + data[i + 2]) / 10
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const p = y * width + x
    edge[p] = Math.min(255, Math.abs(gray[p + 1] - gray[p - 1]) + Math.abs(gray[p + width] - gray[p - width]))
  }
  return { gray, edge }
}

function ellipsePoint(candidate, angle, scale = 1) {
  const ex = Math.cos(angle) * candidate.rx * scale, ey = Math.sin(angle) * candidate.ry * scale
  const cosine = Math.cos(candidate.rotation), sine = Math.sin(candidate.rotation)
  return { x: candidate.x + ex * cosine - ey * sine, y: candidate.y + ex * sine + ey * cosine }
}

function sample(edge, width, height, point) {
  const x = Math.round(point.x), y = Math.round(point.y)
  return x >= 0 && y >= 0 && x < width && y < height ? edge[y * width + x] : 0
}

function scoreCandidate(candidate, edge, width, height) {
  let outer = 0, outerSamples = 0, radial = 0, radialSamples = 0, strongOuter = 0
  const angularProfile = []
  for (let degree = 0; degree < 360; degree += 10) {
    const angle = degree * Math.PI / 180
    const value = sample(edge, width, height, ellipsePoint(candidate, angle))
    outer += value; outerSamples += 1; strongOuter += value > 32 ? 1 : 0
    let spoke = 0
    for (const radius of [.16, .3, .45, .62, .74]) spoke += sample(edge, width, height, ellipsePoint(candidate, angle, radius))
    radial += spoke; radialSamples += 5; angularProfile.push(spoke)
  }
  const mean = angularProfile.reduce((sum, value) => sum + value, 0) / angularProfile.length
  const structureVariance = Math.sqrt(angularProfile.reduce((sum, value) => sum + (value - mean) ** 2, 0) / angularProfile.length)
  let concentric = 0
  for (const radius of [.025, .07, .43, .47, .71, .76]) for (let degree = 0; degree < 360; degree += 30) concentric += sample(edge, width, height, ellipsePoint(candidate, degree * Math.PI / 180, radius))
  const outerScore = Math.min(1, outer / outerSamples / 95)
  const closure = strongOuter / outerSamples
  const structure = Math.min(1, radial / radialSamples / 70)
  const rings = Math.min(1, concentric / 72 / 65)
  const variance = Math.min(1, structureVariance / 160)
  const size = Math.min(1, candidate.rx / (Math.min(width, height) * .34))
  const centerBias = 1 - Math.min(1, Math.hypot(candidate.x - width / 2, candidate.y - height / 2) / Math.hypot(width / 2, height / 2))
  const preliminaryScore = Math.min(1, outerScore * .3 + closure * .18 + structure * .19 + rings * .13 + variance * .08 + size * .07 + centerBias * .05)
  return { edgeStrength: outerScore, contourCoverage: closure, circularity: candidate.ry / candidate.rx, internalRadialStructureScore: structure, concentricRingScore: rings, geometryScore: Math.min(1, size * .55 + centerBias * .25 + closure * .2), preliminaryScore }
}

function radialRingProfile(candidate, edge, width, height) {
  const profile = []
  for (let step = 2; step <= 100; step += 2) {
    const radius = step / 100; let strength = 0
    for (let angle = 0; angle < TAU; angle += Math.PI / 18) strength += sample(edge, width, height, ellipsePoint(candidate, angle, radius))
    profile.push({ radius, strength: strength / 36 / 90 })
  }
  return profile.filter((item, index) => index > 0 && index < profile.length - 1 && item.strength > .24 && item.strength >= profile[index - 1].strength && item.strength >= profile[index + 1].strength).sort((a, b) => b.strength - a.strength).slice(0, 7).sort((a, b) => a.radius - b.radius)
}

function explainCandidate(candidate, largestRadius) {
  const reasons = []
  if (candidate.relativeRadius >= .94) reasons.push('+ largest plausible concentric candidate')
  else if (candidate.relativeRadius < .78) reasons.push('- radius too small; likely inner ring')
  if (candidate.bullAlignmentScore >= .7) reasons.push('+ bull aligned')
  else reasons.push('- weak bull alignment')
  if (candidate.ringCount >= 4) reasons.push(`+ contains ${candidate.ringCount} inner rings`)
  else reasons.push('- incomplete ring hierarchy')
  if (candidate.edgeStrength < .35) reasons.push('- weak outer contour')
  if (candidate.rx < largestRadius * .82 && candidate.concentricRingScore > .5) reasons.push('- likely triple/double ring')
  return reasons
}

export function rankOuterBoardCandidates(candidates) {
  if (!candidates.length) return []
  const largestRadius = Math.max(...candidates.map((candidate) => candidate.rx))
  return candidates.map((candidate) => {
    const relativeRadius = candidate.rx / largestRadius
    const hierarchyPenalty = relativeRadius < .82 ? .35 : relativeRadius < .9 ? .12 : 0
    const outerBoardLikelihood = Math.max(0, Math.min(1, relativeRadius * .62 + Math.min(1, candidate.ringCount / 5) * .18 + candidate.bullAlignmentScore * .1 + candidate.spiderAlignmentScore * .1 - hierarchyPenalty))
    const finalCandidateScore = Math.min(1, candidate.preliminaryScore * .35 + outerBoardLikelihood * .65)
    const result = { ...candidate, relativeRadius, outerBoardLikelihood, finalCandidateScore }
    return { ...result, reasons: explainCandidate(result, largestRadius) }
  }).sort((a, b) => b.finalCandidateScore - a.finalCandidateScore).map((candidate, index) => ({ ...candidate, candidateId: `C${index + 1}`, centerX: candidate.x, centerY: candidate.y, radiusX: candidate.rx, radiusY: candidate.ry }))
}

function candidateInside(candidate, width, height) {
  for (let angle = 0; angle < TAU; angle += Math.PI / 4) {
    const point = ellipsePoint(candidate, angle, 1.03)
    if (point.x < 2 || point.y < 2 || point.x >= width - 2 || point.y >= height - 2) return false
  }
  return candidate.ry / candidate.rx >= .52
}

function refineCenter(candidate, edge, width, height) {
  let best = candidate, bestScore = -1
  for (let y = candidate.y - 6; y <= candidate.y + 6; y += 3) for (let x = candidate.x - 6; x <= candidate.x + 6; x += 3) {
    const test = { ...candidate, x, y }; let score = 0
    for (let angle = 0; angle < TAU; angle += Math.PI / 10) score += sample(edge, width, height, ellipsePoint(test, angle, .08))
    if (score > bestScore) { bestScore = score; best = test }
  }
  return best
}

function boardAnchors(candidate, edge, width, height) {
  let bull = { x: candidate.x, y: candidate.y, confidence: 0 }
  for (let y = candidate.y - 10; y <= candidate.y + 10; y += 2) for (let x = candidate.x - 10; x <= candidate.x + 10; x += 2) {
    const test = { ...candidate, x, y }; let ring = 0, symmetry = 0
    for (let angle = 0; angle < TAU; angle += Math.PI / 12) {
      ring += sample(edge, width, height, ellipsePoint(test, angle, .03)) + sample(edge, width, height, ellipsePoint(test, angle, .07))
      symmetry += Math.abs(sample(edge, width, height, ellipsePoint(test, angle, .15)) - sample(edge, width, height, ellipsePoint(test, angle + Math.PI, .15)))
    }
    const ringEnergy = ring / 48 / 255, symmetryPenalty = symmetry / 24 / 255
    const confidence = Math.max(0, Math.min(1, (ringEnergy - .08) / .48)) * Math.max(0, 1 - symmetryPenalty * 1.5)
    if (confidence > bull.confidence) bull = { x, y, confidence }
  }
  const centerWeight = bull.confidence >= .42 ? .7 : bull.confidence >= .25 ? .35 : 0
  const x = candidate.x * (1 - centerWeight) + bull.x * centerWeight, y = candidate.y * (1 - centerWeight) + bull.y * centerWeight
  const profile = []
  for (let degree = 0; degree < 360; degree += 1) {
    const angle = degree * Math.PI / 180; let strength = 0
    for (const radius of [.28, .4, .65, .78]) strength += sample(edge, width, height, ellipsePoint({ ...candidate, x, y }, angle, radius))
    profile.push(strength)
  }
  let bestPhase = 0, bestScore = -1, lineCount = 0
  for (let phase = 0; phase < 18; phase += 1) {
    let score = 0, strong = 0
    for (let line = 0; line < 20; line += 1) { const value = profile[(phase + line * 18) % 360]; score += value; if (value > 260) strong += 1 }
    if (score > bestScore) { bestScore = score; bestPhase = phase; lineCount = strong }
  }
  const imageUpAngle = Math.atan2(-Math.cos(candidate.rotation) / candidate.ry, -Math.sin(candidate.rotation) / candidate.rx)
  const spiderEnergy = bestScore / 20 / (4 * 255), spiderConfidence = lineCount / 20 * Math.min(1, spiderEnergy / .55)
  return { x, y, bullX: bull.x, bullY: bull.y, bullConfidence: bull.confidence, spiderLines: lineCount, spiderConfidence, spiderPhase: bestPhase * Math.PI / 180, boardOrientation: imageUpAngle + Math.PI / 2 }
}

function featurePoints(candidate, edge, width, height) {
  const points = []
  for (let angle = 0; angle < TAU; angle += Math.PI / 18) {
    const point = ellipsePoint(candidate, angle), strength = sample(edge, width, height, point)
    if (strength > 30) points.push({ ...point, strength })
  }
  return points.sort((a, b) => b.strength - a.strength).slice(0, 24)
}

function searchEllipse(imageData, previous, local) {
  const { width, height } = imageData, { edge } = grayscaleAndEdges(imageData)
  const minimum = Math.round(Math.min(width, height) * .2), maximum = Math.round(Math.min(width, height) * .52)
  const centers = []
  if (local && previous) {
    for (let y = previous.y - 14; y <= previous.y + 14; y += 7) for (let x = previous.x - 14; x <= previous.x + 14; x += 7) centers.push([x, y])
  } else {
    for (let y = minimum; y <= height - minimum; y += 26) for (let x = minimum; x <= width - minimum; x += 26) centers.push([x, y])
  }
  const radii = local && previous ? [previous.rx * .94, previous.rx, previous.rx * 1.06] : Array.from({ length: Math.max(1, Math.floor((maximum - minimum) / 12) + 1) }, (_, i) => minimum + i * 12)
  const ratios = local && previous ? [Math.max(.52, previous.ry / previous.rx - .05), previous.ry / previous.rx, Math.min(1, previous.ry / previous.rx + .05)] : [.56, .68, .8, .9, 1]
  const rotations = local && previous ? [previous.rotation - .08, previous.rotation, previous.rotation + .08] : [-.52, -.34, -.17, 0, .17, .34, .52]
  const coarse = []
  for (const [x, y] of centers) for (const rx of radii) for (const ratio of ratios) for (const rotation of rotations) {
    const candidate = { x, y, rx, ry: rx * ratio, rotation }
    if (!candidateInside(candidate, width, height)) continue
    const metrics = scoreCandidate(candidate, edge, width, height)
    if (metrics.preliminaryScore < (local ? .3 : .34)) continue
    coarse.push({ ...candidate, ...metrics })
    coarse.sort((a, b) => b.preliminaryScore - a.preliminaryScore)
    if (coarse.length > 80) coarse.length = 80
  }
  const spatiallyDistinct = []
  for (const candidate of coarse) {
    if (spatiallyDistinct.some((kept) => Math.abs(kept.rx - candidate.rx) < 7 && Math.hypot(kept.x - candidate.x, kept.y - candidate.y) < 12)) continue
    spatiallyDistinct.push(candidate)
    if (spatiallyDistinct.length === 5) break
  }
  if (!spatiallyDistinct.length) return null
  const detailedCandidates = spatiallyDistinct.map((candidate) => {
    const refined = refineCenter(candidate, edge, width, height)
    if (refined.ry / refined.rx > .92) refined.rotation = previous?.rotation ?? 0
    const anchors = boardAnchors(refined, edge, width, height), rings = radialRingProfile({ ...refined, ...anchors }, edge, width, height)
    const bullDistance = Math.hypot(anchors.bullX - refined.x, anchors.bullY - refined.y)
    const bullAlignmentScore = Math.max(0, 1 - bullDistance / Math.max(1, refined.rx * .12)) * anchors.bullConfidence
    return { ...refined, ...anchors, diameterPx: refined.rx * 2, areaRatioToFrame: Math.PI * refined.rx * refined.ry / (width * height), ellipseRatio: refined.ry / refined.rx, distanceFromBullCandidate: bullDistance, bullAlignmentScore, spiderAlignmentScore: anchors.spiderConfidence, rings, ringCount: rings.filter((ring) => ring.radius < .94).length }
  })
  const candidates = rankOuterBoardCandidates(detailedCandidates)
  let best = candidates[0]
  if (!best || best.finalCandidateScore < (local ? .38 : .46)) return null
  best = { ...best, confidence: best.finalCandidateScore }
  return { ...best, selectedCandidateId: best.candidateId, candidates, cx: best.x, cy: best.y, majorRadius: best.rx, minorRadius: best.ry, rotationAngle: best.rotation, features: featurePoints(best, edge, width, height), frameWidth: width, frameHeight: height }
}

export function detectBoard(imageData) { return searchEllipse(imageData, null, false) }
export function trackBoard(imageData, previous) { return searchEllipse(imageData, previous, true) }

export function smoothBoard(previous, next, strength = .2) {
  if (!previous) return next
  const alpha = Math.max(.12, Math.min(.48, strength))
  const blend = (a, b) => a * (1 - alpha) + b * alpha
  const result = { ...next, x: blend(previous.x, next.x), y: blend(previous.y, next.y), rx: blend(previous.rx, next.rx), ry: blend(previous.ry, next.ry), rotation: next.ry / next.rx > .92 ? previous.rotation : blend(previous.rotation, next.rotation), confidence: blend(previous.confidence, next.confidence), bullX: blend(previous.bullX ?? previous.x, next.bullX ?? next.x), bullY: blend(previous.bullY ?? previous.y, next.bullY ?? next.y), bullConfidence: blend(previous.bullConfidence ?? 0, next.bullConfidence ?? 0), boardOrientation: blend(previous.boardOrientation ?? 0, next.boardOrientation ?? 0) }
  return { ...result, cx: result.x, cy: result.y, majorRadius: result.rx, minorRadius: result.ry, rotationAngle: result.rotation }
}

export function boardDelta(previous, next) {
  if (!previous || !next) return Infinity
  return Math.hypot(next.x - previous.x, next.y - previous.y) + Math.abs(next.rx - previous.rx) + Math.abs(next.ry - previous.ry) + Math.abs(next.rotation - previous.rotation) * previous.rx
}

export function findFrameChange(reference, current, board) {
  if (!reference || reference.length !== current.length || !board) return null
  const width = board.frameWidth; let weight = 0, weightedX = 0, weightedY = 0
  for (let y = Math.max(0, Math.floor(board.y - board.rx)); y < Math.min(current.length / width, Math.ceil(board.y + board.rx)); y += 2) for (let x = Math.max(0, Math.floor(board.x - board.rx)); x < Math.min(width, Math.ceil(board.x + board.rx)); x += 2) {
    const normalized = normalizeBoardPoint({ x, y }, board)
    if (!normalized || normalized.x ** 2 + normalized.y ** 2 > 1) continue
    const index = Math.floor(y) * width + Math.floor(x), difference = Math.abs(current[index] - reference[index])
    if (difference < 38) continue
    weight += difference; weightedX += x * difference; weightedY += y * difference
  }
  return weight > 18000 ? { x: weightedX / weight, y: weightedY / weight, strength: weight } : null
}
