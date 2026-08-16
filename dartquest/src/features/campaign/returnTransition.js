export const RETURN_TRANSITION_PHASES = Object.freeze({
  idle: 'idle',
  fadingOutGame: 'fading-out-game',
  switchingView: 'switching-view',
  fadingInMap: 'fading-in-map',
  complete: 'complete',
})

export function getReturnTransitionTiming(animationMode, prefersReducedMotion = false) {
  if (animationMode === 'off' || prefersReducedMotion) return { switchAt: 0, revealAt: 0, completeAt: 0 }
  if (animationMode === 'reduced') return { switchAt: 55, revealAt: 70, completeAt: 150 }
  return { switchAt: 240, revealAt: 290, completeAt: 620 }
}
