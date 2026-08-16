export const SETTINGS_STORAGE_KEY = 'dartquest-settings-v1'
export const INPUT_MODE_STORAGE_KEY = 'dartquest-gameplay-input-mode'

export const DEFAULT_SETTINGS = Object.freeze({
  sound: true,
  animations: 'full',
  haptics: true,
  inputMode: 'counter',
})

const ANIMATION_MODES = new Set(['full', 'reduced', 'off'])

export function normalizeSettings(value = {}) {
  return {
    sound: typeof value.sound === 'boolean' ? value.sound : DEFAULT_SETTINGS.sound,
    animations: ANIMATION_MODES.has(value.animations) ? value.animations : DEFAULT_SETTINGS.animations,
    haptics: typeof value.haptics === 'boolean' ? value.haptics : DEFAULT_SETTINGS.haptics,
    inputMode: value.inputMode === 'quick' ? 'quick' : 'counter',
  }
}

export function loadSettings(storage = localStorage) {
  let stored
  try { stored = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) || '{}') }
  catch { stored = {} }
  if (!stored.inputMode) stored.inputMode = storage.getItem(INPUT_MODE_STORAGE_KEY)
  return normalizeSettings(stored)
}

export function saveSettings(settings, storage = localStorage) {
  const normalized = normalizeSettings(settings)
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
  storage.setItem(INPUT_MODE_STORAGE_KEY, normalized.inputMode)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('dartquest:settings', { detail: normalized }))
  return normalized
}

export function applySettings(settings, root = document.documentElement, media = window.matchMedia('(prefers-reduced-motion: reduce)')) {
  const normalized = normalizeSettings(settings)
  root.dataset.animations = normalized.animations === 'full' && media.matches ? 'reduced' : normalized.animations
  return root.dataset.animations
}

export function vibrate(pattern = 20, settings = loadSettings(), navigatorObject = navigator) {
  if (!settings.haptics || typeof navigatorObject?.vibrate !== 'function') return false
  return navigatorObject.vibrate(pattern)
}
