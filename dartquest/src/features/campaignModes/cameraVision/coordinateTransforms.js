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

export function createVideoDisplayTransform(videoWidth, videoHeight, displayWidth, displayHeight) {
  return { ...containedRect(videoWidth, videoHeight, displayWidth, displayHeight), videoWidth, videoHeight, displayWidth, displayHeight, objectFit: 'contain', objectPosition: '50% 50%' }
}
