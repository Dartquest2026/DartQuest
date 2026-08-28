const BOARD_SIZE = 160
const SCORING_EDGE = 170 / 225.5

export function normalizeBoardFrame(imageData, board, size = BOARD_SIZE) {
  const output = new Uint8Array(size * size)
  const cosine = Math.cos(board.rotation ?? 0), sine = Math.sin(board.rotation ?? 0)
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const nx = (x / (size - 1) - .5) * 2, ny = (y / (size - 1) - .5) * 2
    if (nx * nx + ny * ny > 1) continue
    const ex = nx * board.rx, ey = ny * board.ry
    const sourceX = Math.round(board.x + ex * cosine - ey * sine), sourceY = Math.round(board.y + ex * sine + ey * cosine)
    if (sourceX < 0 || sourceY < 0 || sourceX >= imageData.width || sourceY >= imageData.height) continue
    const index = (sourceY * imageData.width + sourceX) * 4
    output[y * size + x] = (imageData.data[index] * 3 + imageData.data[index + 1] * 6 + imageData.data[index + 2]) / 10
  }
  return { pixels: output, size }
}

export function detectNewDart(reference, current) {
  if (!reference || !current || reference.size !== current.size) return null
  const size = current.size, changed = new Uint8Array(size * size)
  for (let y = 8; y < size - 8; y += 1) for (let x = 8; x < size - 8; x += 1) {
    const nx = (x / (size - 1) - .5) * 2, ny = (y / (size - 1) - .5) * 2
    if (Math.hypot(nx, ny) > SCORING_EDGE) continue
    const index = y * size + x, difference = Math.abs(current.pixels[index] - reference.pixels[index])
    if (difference >= 42) changed[index] = 1
  }
  const seen = new Uint8Array(changed.length), components = []
  for (let start = 0; start < changed.length; start += 1) {
    if (!changed[start] || seen[start]) continue
    const queue = [start], points = []; seen[start] = 1
    while (queue.length) {
      const index = queue.pop(), x = index % size, y = Math.floor(index / size); points.push({ x, y })
      for (const [nextX, nextY] of [[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]]) { const next = nextY * size + nextX; if (nextX >= 0 && nextY >= 0 && nextX < size && nextY < size && changed[next] && !seen[next]) { seen[next] = 1; queue.push(next) } }
    }
    if (points.length >= 10) components.push(points)
  }
  let best = null
  for (const points of components) {
    const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length, cy = points.reduce((sum, point) => sum + point.y, 0) / points.length
    let xx = 0, yy = 0, xy = 0
    for (const point of points) { const dx = point.x - cx, dy = point.y - cy; xx += dx * dx; yy += dy * dy; xy += dx * dy }
    const angle = .5 * Math.atan2(2 * xy, xx - yy), cosine = Math.cos(angle), sine = Math.sin(angle)
    const projections = points.map((point) => ({ point, along: (point.x - cx) * cosine + (point.y - cy) * sine, across: Math.abs(-(point.x - cx) * sine + (point.y - cy) * cosine) }))
    const min = projections.reduce((a, b) => a.along < b.along ? a : b), max = projections.reduce((a, b) => a.along > b.along ? a : b)
    const length = max.along - min.along, width = projections.reduce((sum, item) => sum + item.across, 0) / projections.length * 2
    const elongation = length / Math.max(1, width), tip = radial(min.point, size) < radial(max.point, size) ? min.point : max.point
    const confidence = Math.min(1, points.length / 90) * .35 + Math.min(1, length / 35) * .35 + Math.min(1, elongation / 4) * .3
    if ((!best || confidence > best.confidence) && length >= 10 && elongation >= 1.5) best = { tip, confidence, length, elongation }
  }
  return best?.confidence >= .56 ? best : null
}

function radial(point, size) { return Math.hypot((point.x / (size - 1) - .5) * 2, (point.y / (size - 1) - .5) * 2) }

export function scoreTwentyDart(tip, size = BOARD_SIZE, orientation = 0) {
  const x = (tip.x / (size - 1) - .5) * 2, y = (tip.y / (size - 1) - .5) * 2
  const radius = Math.hypot(x, y), angle = Math.atan2(y, x) - orientation
  const topDistance = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)))
  if (topDistance > Math.PI / 20 || radius > SCORING_EDGE) return null
  const normalizedRadius = radius / SCORING_EDGE
  if (normalizedRadius <= 15.9 / 170) return { label: radius <= (6.35 / 225.5) ? 'BULL' : '25', score: radius <= (6.35 / 225.5) ? 50 : 25 }
  if (normalizedRadius >= 162 / 170) return { label: 'D20', score: 40 }
  if (normalizedRadius >= 99 / 170 && normalizedRadius <= 107 / 170) return { label: 'T20', score: 60 }
  return { label: 'S20', score: 20 }
}
