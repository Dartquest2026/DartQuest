import { resetProfileProgressFields } from '../auth/profileStorage.js'

const PERSONAL_PROGRESS_KEYS = [
  'dartquest-singleplayer-difficulty',
  'dartquest-daily-challenge',
]

const SINGLEPLAYER_CAMPAIGN_PREFIX =
  'dartquest-campaign-progress-singleplayer-'

export function getPersonalProgressKeys() {
  return Object.keys(localStorage).filter(
    (key) =>
      PERSONAL_PROGRESS_KEYS.includes(key) ||
      key.startsWith(SINGLEPLAYER_CAMPAIGN_PREFIX),
  )
}

export function resetCurrentProfileProgress(profileId) {
  const removedKeys = getPersonalProgressKeys()
  removedKeys.forEach((key) => localStorage.removeItem(key))
  resetProfileProgressFields(profileId)
  return removedKeys
}
