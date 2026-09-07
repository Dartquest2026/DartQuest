export const SETTINGS_STORAGE_KEY = 'dartquest-settings-v1'
export const INPUT_MODE_STORAGE_KEY = 'dartquest-gameplay-input-mode'
export const INPUT_PREFERENCES_STORAGE_KEY = 'dartquest-gameplay-input-preferences-v1'

export const DEFAULT_SETTINGS = Object.freeze({
  sound: true,
  animations: 'full',
  haptics: true,
  inputMode: 'counter',
})

const ANIMATION_MODES = new Set(['full', 'reduced', 'off'])
const INPUT_MODES = new Set(['counter', 'quick'])
const INPUT_PREFERENCE_TYPES = new Set(['target', 'score', 'checkout'])

export function getInputPreferenceType(taskType) {
  if (taskType === 'targets') return 'target'
  return INPUT_PREFERENCE_TYPES.has(taskType) ? taskType : null
}

function readInputPreferences(storage) {
  try {
    const value = JSON.parse(storage.getItem(INPUT_PREFERENCES_STORAGE_KEY) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

export function getPreferredInputMode(taskType, storage = localStorage) {
  const preferenceType = getInputPreferenceType(taskType)
  const preferred = preferenceType ? readInputPreferences(storage)[preferenceType] : null
  if (INPUT_MODES.has(preferred)) return preferred
  const legacyDefault = storage.getItem(INPUT_MODE_STORAGE_KEY)
  return INPUT_MODES.has(legacyDefault) ? legacyDefault : DEFAULT_SETTINGS.inputMode
}

export function setPreferredInputMode(taskType, mode, storage = localStorage) {
  const preferenceType = getInputPreferenceType(taskType)
  if (!preferenceType || !INPUT_MODES.has(mode)) return getPreferredInputMode(taskType, storage)
  const preferences = readInputPreferences(storage)
  preferences[preferenceType] = mode
  storage.setItem(INPUT_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  return mode
}

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
