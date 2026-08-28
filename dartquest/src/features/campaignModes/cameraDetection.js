export function getContainedVideoRect(videoWidth, videoHeight, stageWidth, stageHeight) {
  if (!videoWidth || !videoHeight || !stageWidth || !stageHeight) return { x: 0, y: 0, width: stageWidth, height: stageHeight, scale: 1 }
  const scale = Math.min(stageWidth / videoWidth, stageHeight / videoHeight)
  const width = videoWidth * scale
  const height = videoHeight * scale
  return { x: (stageWidth - width) / 2, y: (stageHeight - height) / 2, width, height, scale }
}

export function isInTwentySector(point, board) {
  if (!point || !board) return false
  const angle = Math.atan2((point.y - board.y) / board.ry, (point.x - board.x) / board.rx)
  return Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2))) <= Math.PI / 20
}

export function detectBoard(imageData, previous = null) {
  const { data, width, height } = imageData
  const gray = new Uint8Array(width * height)
  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) gray[pixel] = (data[index] * 3 + data[index + 1] * 6 + data[index + 2]) / 10
  const minRadius = Math.round(Math.min(width, height) * .2)
  const maxRadius = Math.round(Math.min(width, height) * .49)
  const centerX = previous?.x ?? width / 2
  const centerY = previous?.y ?? height / 2
  let best = null
  for (let radius = minRadius; radius <= maxRadius; radius += 5) for (let y = centerY - 18; y <= centerY + 18; y += 9) for (let x = centerX - 18; x <= centerX + 18; x += 9) {
    let edge = 0; let samples = 0
    for (let degree = 0; degree < 360; degree += 8) {
      const angle = degree * Math.PI / 180
      const ix = Math.round(x + Math.cos(angle) * (radius - 3)), iy = Math.round(y + Math.sin(angle) * (radius - 3))
      const ox = Math.round(x + Math.cos(angle) * (radius + 3)), oy = Math.round(y + Math.sin(angle) * (radius + 3))
      if (ix < 0 || ox < 0 || iy < 0 || oy < 0 || ix >= width || ox >= width || iy >= height || oy >= height) continue
      edge += Math.abs(gray[iy * width + ix] - gray[oy * width + ox]); samples += 1
    }
    const centered = 1 - Math.min(1, Math.hypot(x - width / 2, y - height / 2) / (Math.min(width, height) * .55))
    const score = samples ? edge / samples / 80 * .75 + centered * .25 : 0
    if (!best || score > best.confidence) best = { x, y, rx: radius, ry: radius, confidence: Math.min(1, score) }
  }
  return best?.confidence >= .36 ? best : null
}

export function findFrameChange(reference, current, board) {
  if (!reference || reference.length !== current.length || !board) return null
  const width = board.frameWidth
  let weight = 0; let weightedX = 0; let weightedY = 0
  for (let y = Math.max(0, Math.floor(board.y - board.ry)); y < Math.min(current.length / width, Math.ceil(board.y + board.ry)); y += 2) for (let x = Math.max(0, Math.floor(board.x - board.rx)); x < Math.min(width, Math.ceil(board.x + board.rx)); x += 2) {
    const dx = (x - board.x) / board.rx, dy = (y - board.y) / board.ry
    if (dx * dx + dy * dy > 1) continue
    const index = Math.floor(y) * width + Math.floor(x), difference = Math.abs(current[index] - reference[index])
    if (difference < 38) continue
    weight += difference; weightedX += x * difference; weightedY += y * difference
  }
  return weight > 18000 ? { x: weightedX / weight, y: weightedY / weight, strength: weight } : null
}
