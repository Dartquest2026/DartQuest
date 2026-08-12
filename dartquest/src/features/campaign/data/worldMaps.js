const defaultPositions = [
  { id: 1, x: 12, y: 10 },
  { id: 2, x: 39, y: 11 },
  { id: 3, x: 66, y: 19 },
  { id: 4, x: 80, y: 33 },
  { id: 5, x: 65, y: 46 },
  { id: 6, x: 38, y: 48 },
  { id: 7, x: 14, y: 58 },
  { id: 8, x: 25, y: 73 },
  { id: 9, x: 56, y: 76 },
  { id: 10, x: 84, y: 88 },
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
