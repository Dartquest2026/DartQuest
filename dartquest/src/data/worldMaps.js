const defaultPositions = [
  { id: 1, x: 12, y: 7 },
  { id: 2, x: 38, y: 13 },
  { id: 3, x: 68, y: 22 },
  { id: 4, x: 72, y: 36 },
  { id: 5, x: 48, y: 48 },
  { id: 6, x: 20, y: 57 },
  { id: 7, x: 24, y: 70 },
  { id: 8, x: 47, y: 78 },
  { id: 9, x: 68, y: 78 },
  { id: 10, x: 82, y: 86 },
]

export const worldMaps = {
  1: {
    name: 'Anfängerwald',
    theme: 'forest',
    positions: defaultPositions,
  },

  2: {
    name: 'Anfänger II',
    theme: 'default',
    positions: defaultPositions,
  },

  3: {
    name: 'Grundlagen',
    theme: 'default',
    positions: defaultPositions,
  },

  4: {
    name: 'Doppel',
    theme: 'default',
    positions: defaultPositions,
  },

  5: {
    name: 'Triple',
    theme: 'default',
    positions: defaultPositions,
  },

  6: {
    name: 'Scoring',
    theme: 'default',
    positions: defaultPositions,
  },

  7: {
    name: 'Checkouts',
    theme: 'default',
    positions: defaultPositions,
  },

  8: {
    name: 'Fortgeschritten',
    theme: 'default',
    positions: defaultPositions,
  },

  9: {
    name: 'Profi',
    theme: 'default',
    positions: defaultPositions,
  },

  10: {
    name: 'Meister',
    theme: 'default',
    positions: defaultPositions,
  },
}

export function getWorldPosition(worldNumber, levelId) {
  const world = worldMaps[worldNumber]

  if (!world) {
    return null
  }

  const localLevel = ((levelId - 1) % 10) + 1

  return (
    world.positions.find(
      (position) => position.id === localLevel,
    ) ?? null
  )
}