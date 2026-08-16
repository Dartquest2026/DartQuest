const DEFAULT_BOSS_PRESENTATION = Object.freeze({
  id: 'default', theme: 'standard', primary: '#e9b85f', secondary: '#42e695', effect: 'radial', symbol: '◆', motion: 0.55, soundKey: null, hapticKey: 'soft',
})

export const BOSS_PRESENTATIONS = Object.freeze({
  1: { id: 'world-1', theme: 'precision', primary: '#ffd35b', secondary: '#42e695', effect: 'target', symbol: '◎', motion: 0.45, soundKey: null, hapticKey: 'soft' },
  2: { id: 'world-2', theme: 'segments', primary: '#55d8ff', secondary: '#7b8cff', effect: 'segments', symbol: '◈', motion: 0.7, soundKey: null, hapticKey: 'double' },
  3: { id: 'world-3', theme: 'impulse', primary: '#ffcf4f', secondary: '#ff754f', effect: 'impulse', symbol: 'ϟ', motion: 0.75, soundKey: null, hapticKey: 'sharp' },
  4: { id: 'world-4', theme: 'embers', primary: '#ff8a45', secondary: '#ffd05c', effect: 'rising', symbol: '▲', motion: 0.65, soundKey: null, hapticKey: 'double' },
  5: { id: 'world-5', theme: 'energy', primary: '#b06cff', secondary: '#4ee8d1', effect: 'radial', symbol: '✦', motion: 0.6, soundKey: null, hapticKey: 'soft' },
  6: { id: 'world-6', theme: 'shadow', primary: '#9d8cff', secondary: '#586b87', effect: 'shadow', symbol: '◐', motion: 0.35, soundKey: null, hapticKey: 'soft' },
  7: { id: 'world-7', theme: 'circuit', primary: '#3ce6b0', secondary: '#32a6ff', effect: 'segments', symbol: '⬡', motion: 0.58, soundKey: null, hapticKey: 'double' },
  8: { id: 'world-8', theme: 'prism', primary: '#ff6faf', secondary: '#7c8cff', effect: 'prism', symbol: '◇', motion: 0.62, soundKey: null, hapticKey: 'soft' },
  9: { id: 'world-9', theme: 'core', primary: '#ff5e58', secondary: '#ffbd45', effect: 'impulse', symbol: '◆', motion: 0.78, soundKey: null, hapticKey: 'sharp' },
  10: { id: 'world-10', theme: 'final', primary: '#fff0a1', secondary: '#e04f66', effect: 'final', symbol: '♛', motion: 0.82, soundKey: null, hapticKey: 'final' },
})

export function getBossWorldId(levelOrId) {
  const levelId = Number(typeof levelOrId === 'object' ? levelOrId?.id : levelOrId)
  return Number.isFinite(levelId) && levelId > 0 ? Math.ceil(levelId / 10) : null
}

export function getBossPresentation(levelOrId) {
  return BOSS_PRESENTATIONS[getBossWorldId(levelOrId)] ?? DEFAULT_BOSS_PRESENTATION
}

export function getBossPresentationStyle(presentation) {
  const selected = presentation ?? DEFAULT_BOSS_PRESENTATION
  return {
    '--boss-primary': selected.primary,
    '--boss-secondary': selected.secondary,
    '--boss-motion': selected.motion,
  }
}

export function getBossHapticPattern(hapticKey) {
  return { soft: 18, double: [18, 45, 18], sharp: 28, final: [24, 55, 34] }[hapticKey] ?? 18
}
