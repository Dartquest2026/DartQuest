export function containedRect(videoWidth, videoHeight, displayWidth, displayHeight) {
  const scale = Math.min(displayWidth / videoWidth, displayHeight / videoHeight)
  const width = videoWidth * scale, height = videoHeight * scale
  return { x: (displayWidth - width) / 2, y: (displayHeight - height) / 2, width, height, scale }
}

export function videoPointToDisplayPoint(point, transform) {
  return { x: transform.x + point.x * transform.width / transform.videoWidth, y: transform.y + point.y * transform.height / transform.videoHeight }
}

export function displayPointToVideoPoint(point, transform) {
  return { x: (point.x - transform.x) * transform.videoWidth / transform.width, y: (point.y - transform.y) * transform.videoHeight / transform.height }
}

export function videoPointToNormalizedPoint(point, homography, project) { return project(homography, point) }
export function normalizedPointToVideoPoint(point, inverseHomography, project) { return project(inverseHomography, point) }

export function createVideoDisplayTransform(videoWidth, videoHeight, displayWidth, displayHeight, objectFit = 'contain') {
  const scale = (objectFit === 'cover' ? Math.max : Math.min)(displayWidth / videoWidth, displayHeight / videoHeight)
  const width = videoWidth * scale, height = videoHeight * scale
  return { x: (displayWidth - width) / 2, y: (displayHeight - height) / 2, width, height, scale, videoWidth, videoHeight, displayWidth, displayHeight, objectFit, objectPosition: '50% 50%' }
}

// Bounding rect includes CSS scaling and browser viewport zoom. Canvas uses local CSS pixels.
export function clientPointToVideoPoint(point, bounds, transform) {
  if (!bounds.width || !bounds.height || !transform.width || !transform.height) return null
  const video = displayPointToVideoPoint({ x: (point.x - bounds.left) * transform.displayWidth / bounds.width, y: (point.y - bounds.top) * transform.displayHeight / bounds.height }, transform)
  return video.x >= 0 && video.y >= 0 && video.x <= transform.videoWidth && video.y <= transform.videoHeight ? video : null
}
