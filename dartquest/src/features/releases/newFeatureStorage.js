import { CURRENT_RELEASE } from './releaseManifest.js'

export const NEW_FEATURE_STORAGE_KEY = 'dartquest-new-features-v1'

function scope(profileId) { return profileId ? `profile:${profileId}` : 'guest:device' }

export function readSeenFeatures(profileId, storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(NEW_FEATURE_STORAGE_KEY) || '{}')
    const values = parsed?.[CURRENT_RELEASE]?.[scope(profileId)]
    return new Set(Array.isArray(values) ? values.filter((id) => typeof id === 'string') : [])
  } catch { return new Set() }
}

export function writeSeenFeatures(profileId, featureIds, storage = localStorage) {
  let parsed
  try { parsed = JSON.parse(storage.getItem(NEW_FEATURE_STORAGE_KEY) || '{}') || {} } catch { parsed = {} }
  parsed[CURRENT_RELEASE] = { ...(parsed[CURRENT_RELEASE] || {}), [scope(profileId)]: [...new Set(featureIds)] }
  storage.setItem(NEW_FEATURE_STORAGE_KEY, JSON.stringify(parsed))
}

export function markFeatureSeen(profileId, featureId, storage = localStorage) {
  const seen = readSeenFeatures(profileId, storage)
  seen.add(featureId)
  writeSeenFeatures(profileId, seen, storage)
  return seen
}

export function resetSeenFeaturesForTester(profileId, storage = localStorage) {
  writeSeenFeatures(profileId, [], storage)
}
