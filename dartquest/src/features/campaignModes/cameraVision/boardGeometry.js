export const STEEL_BOARD_MM = Object.freeze({
  innerBullRadius: 6.35,
  outerBullRadius: 15.9,
  tripleInnerRadius: 99,
  tripleOuterRadius: 107,
  doubleInnerRadius: 162,
  doubleOuterRadius: 170,
  scoringRadius: 170,
})

export const NORMALIZED_BOARD_SIZE = 512
export const NORMALIZED_CENTER = NORMALIZED_BOARD_SIZE / 2
export const NORMALIZED_SCORING_RADIUS = 220

export function normalizedRadius(millimeters) {
  return millimeters / STEEL_BOARD_MM.scoringRadius * NORMALIZED_SCORING_RADIUS
}

export function normalizedBoardPoint(angle, radius = normalizedRadius((STEEL_BOARD_MM.doubleInnerRadius + STEEL_BOARD_MM.doubleOuterRadius) / 2)) {
  return { x: NORMALIZED_CENTER + Math.cos(angle) * radius, y: NORMALIZED_CENTER + Math.sin(angle) * radius }
}

export const BOARD_MODEL_RADII = Object.freeze({
  innerBull: normalizedRadius(STEEL_BOARD_MM.innerBullRadius),
  outerBull: normalizedRadius(STEEL_BOARD_MM.outerBullRadius),
  tripleInner: normalizedRadius(STEEL_BOARD_MM.tripleInnerRadius),
  tripleOuter: normalizedRadius(STEEL_BOARD_MM.tripleOuterRadius),
  doubleInner: normalizedRadius(STEEL_BOARD_MM.doubleInnerRadius),
  doubleOuter: normalizedRadius(STEEL_BOARD_MM.doubleOuterRadius),
})

export const SEGMENT_BOUNDARY_ANGLES = Object.freeze(Array.from({ length: 20 }, (_, index) => -Math.PI / 2 - Math.PI / 20 + index * Math.PI / 10))
