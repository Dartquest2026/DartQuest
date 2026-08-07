export const worldMaps = {
  1: {
    name: 'Anfängerwald',
    theme: 'forest',

    positions: [
      { id: 1, x: 12, y: 8 },
      { id: 2, x: 38, y: 14 },
      { id: 3, x: 68, y: 22 },
      { id: 4, x: 73, y: 38 },
      { id: 5, x: 48, y: 48 },
      { id: 6, x: 18, y: 57 },
      { id: 7, x: 24, y: 72 },
      { id: 8, x: 48, y: 79 },
      { id: 9, x: 70, y: 72 },
      { id: 10, x: 82, y: 88 },
    ],
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