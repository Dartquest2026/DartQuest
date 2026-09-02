import { loadSettings } from './settingsStorage.js'

export const HAPTIC_PATTERNS = Object.freeze({
  light: 15,
  medium: 35,
  success: Object.freeze([25, 40, 35]),
  error: Object.freeze([50, 40, 50]),
})

export function isHapticsSupported(navigatorObject = globalThis.navigator) {
  return typeof navigatorObject?.vibrate === 'function'
}

export function triggerHaptic(type, settings = loadSettings(), navigatorObject = globalThis.navigator) {
  const pattern = HAPTIC_PATTERNS[type]
  if (!pattern || !settings?.haptics || !isHapticsSupported(navigatorObject)) return false
  try {
    return navigatorObject.vibrate(pattern) !== false
  } catch {
    return false
  }
}
