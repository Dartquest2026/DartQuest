import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { CURRENT_RELEASE, RELEASE_FEATURES } from '../src/features/releases/releaseManifest.js'
import { markFeatureSeen, readSeenFeatures } from '../src/features/releases/newFeatureStorage.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value }, data }
}

test('version 0.0.1 has one central package source and a complete stable manifest', async () => {
  const [pkg, vite, home] = await Promise.all([
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../vite.config.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/home/Home.jsx', import.meta.url), 'utf8'),
  ])
  assert.equal(JSON.parse(pkg).version, '0.0.1')
  assert.equal(CURRENT_RELEASE, '0.0.1')
  assert.match(vite, /packageJson\.version/)
  assert.match(home, /VITE_APP_VERSION/)
  assert.equal(new Set(RELEASE_FEATURES.map((feature) => feature.id)).size, RELEASE_FEATURES.length)
  assert.ok(RELEASE_FEATURES.every((feature) => feature.version === CURRENT_RELEASE))
})

test('seen state is feature-specific, persistent and profile-separated', () => {
  const storage = memoryStorage()
  markFeatureSeen('user-a', 'help-contact', storage)
  assert.equal(readSeenFeatures('user-a', storage).has('help-contact'), true)
  assert.equal(readSeenFeatures('user-a', storage).has('standard-games'), false)
  assert.equal(readSeenFeatures('user-b', storage).has('help-contact'), false)
  assert.equal(readSeenFeatures(null, storage).has('help-contact'), false)
  assert.equal(readSeenFeatures('user-a', storage).has('help-contact'), true)
})

test('corrupt storage is safe and future release data remains isolated', () => {
  const corrupt = memoryStorage({ 'dartquest-new-features-v1': '{kaputt' })
  assert.deepEqual([...readSeenFeatures('user-a', corrupt)], [])
  const future = memoryStorage({ 'dartquest-new-features-v1': JSON.stringify({ '0.0.2': { 'profile:user-a': ['future-id'] } }) })
  assert.deepEqual([...readSeenFeatures('user-a', future)], [])
})

test('release UI does not touch community badges, progress, rewards or Supabase', async () => {
  const files = await Promise.all([
    readFile(new URL('../src/features/releases/NewFeatures.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/releases/WhatsNew.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/releases/newFeatureStorage.js', import.meta.url), 'utf8'),
  ])
  const source = files.join('\n')
  assert.doesNotMatch(source, /pendingRequest|community|onProfileRewards|campaign_progress|supabase|coins\s*=|xp\s*=/i)
  assert.match(source, /IntersectionObserver/)
  assert.match(source, /ALLE ALS GESEHEN MARKIEREN/)
  assert.match(source, /import\.meta\.env\.DEV/)
})
