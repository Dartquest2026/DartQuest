export const LEGACY_INPUT_HINT_PREFIX = 'dartquest_seen_input_mode_hint_difficulty_'
export const PROFILE_INPUT_HINT_PREFIX = 'dartquest_seen_input_mode_hint_profile_'

export function getInputModeHintKey(profileId, difficulty) {
  return `${PROFILE_INPUT_HINT_PREFIX}${profileId}_difficulty_${difficulty}`
}

export function hasConfirmedInputModeHint(profileId, difficulty, storage = localStorage) {
  const profileKey = getInputModeHintKey(profileId, difficulty)
  if (storage.getItem(profileKey) === 'true') return true

  const legacyKey = `${LEGACY_INPUT_HINT_PREFIX}${difficulty}`
  if (storage.getItem(legacyKey) === 'true') {
    storage.setItem(profileKey, 'true')
    storage.removeItem(legacyKey)
    return true
  }
  return false
}

export function confirmInputModeHint(profileId, difficulty, storage = localStorage) {
  storage.setItem(getInputModeHintKey(profileId, difficulty), 'true')
}

export function getTutorialFlagKeys(profileId, storage = localStorage) {
  const profilePrefix = `${PROFILE_INPUT_HINT_PREFIX}${profileId}_difficulty_`
  return Object.keys(storage).filter((key) => key.startsWith(profilePrefix))
}

export function resetTutorialFlags(profileId, storage = localStorage) {
  const keys = getTutorialFlagKeys(profileId, storage)
  keys.forEach((key) => storage.removeItem(key))
  return keys
}
