import { MANUAL_BOARD_POINTS, BOARD_MODEL_RADII, NORMALIZED_CENTER } from './boardGeometry.js'
import { findHomography, invertHomography, projectPoint } from './boardHomography.js'

export const CALIBRATION_STORAGE_KEY = 'dartquest-manual-board-v1'

export function calibrateFourPoints(points, geometry, viewport) {
  if (points?.length !== 4 || !geometry?.width || !geometry?.height) return null
  if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x > geometry.width || p.y > geometry.height)) return null
  // Reject crossed, reversed, duplicate and nearly collinear quadrilaterals.
  for (let i = 0; i < 4; i++) {
    const a = points[i], b = points[(i + 1) % 4], c = points[(i + 2) % 4]
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) < geometry.width * geometry.height * .0001) return null
  }
  // Work in unit image coordinates to keep the existing linear solver well conditioned.
  const unit = points.map((p) => ({ x: p.x / geometry.width, y: p.y / geometry.height }))
  const matrix = findHomography(unit.map((source, i) => ({ source, target: {
    x: (MANUAL_BOARD_POINTS[i].target.x - NORMALIZED_CENTER) / BOARD_MODEL_RADII.doubleOuter,
    y: (MANUAL_BOARD_POINTS[i].target.y - NORMALIZED_CENTER) / BOARD_MODEL_RADII.doubleOuter,
  } })))
  if (!matrix) return null
  const r = BOARD_MODEL_RADII.doubleOuter, c = NORMALIZED_CENTER, w = geometry.width, h = geometry.height
  const homography = [(r * matrix[0] + c * matrix[6]) / w, (r * matrix[1] + c * matrix[7]) / h, r * matrix[2] + c,
    (r * matrix[3] + c * matrix[6]) / w, (r * matrix[4] + c * matrix[7]) / h, r * matrix[5] + c,
    matrix[6] / w, matrix[7] / h, 1]
  const inverseHomography = invertHomography(homography)
  if (!inverseHomography || !homography.every(Number.isFinite)) return null
  // A projective horizon must not intersect the board (including number labels).
  const denominator = inverseHomography[6] * c + inverseHomography[7] * c + inverseHomography[8]
  if (Math.abs(denominator) <= Math.hypot(inverseHomography[6], inverseHomography[7]) * r * 1.1) return null
  if (points.some((p, i) => { const q = projectPoint(homography, p); return !q || Math.hypot(q.x - MANUAL_BOARD_POINTS[i].target.x, q.y - MANUAL_BOARD_POINTS[i].target.y) > .01 })) return null
  return { version: 1, points: points.map((p) => ({ ...p })), geometry: { ...geometry }, viewport: { ...viewport }, homography, inverseHomography }
}

export function cameraGeometryCompatible(saved, current) {
  return Boolean(saved && current && saved.deviceId === current.deviceId &&
    ['width', 'height', 'facingMode', 'orientation', 'resizeMode'].every((key) => saved[key] === current[key]) &&
    Number.isFinite(saved.zoom) && Number.isFinite(current.zoom) && Math.abs(saved.zoom - current.zoom) < .0001)
}

export function restoreCalibration(serialized, geometry) {
  try {
    const saved = JSON.parse(serialized)
    if (saved?.version !== 1 || !saved.geometry?.deviceId || !cameraGeometryCompatible(saved.geometry, geometry)) return null
    // Recompute from validated reference points; never trust persisted matrix values.
    return calibrateFourPoints(saved.points, geometry, saved.viewport)
  } catch { return null }
}
