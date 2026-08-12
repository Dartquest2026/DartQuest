export const PROFILE_STORAGE_KEY = 'dartquest-profiles'

const HASH_ITERATIONS = 120000

function emptyStore() {
  return { profiles: [], activeProfileId: null }
}

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY))
    return {
      profiles: Array.isArray(parsed?.profiles) ? parsed.profiles : [],
      activeProfileId: parsed?.activeProfileId ?? null,
    }
  } catch {
    return emptyStore()
  }
}

function writeStore(store) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(store))
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function hashPassword(password, salt) {
  // Lokales MVP: PBKDF2 schützt vor Klartextspeicherung, ersetzt aber kein Backend-Login.
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: HASH_ITERATIONS },
    material,
    256,
  )
  return bytesToBase64(new Uint8Array(bits))
}

export function getProfiles() {
  return readStore().profiles
}

export function getActiveProfile() {
  const store = readStore()
  return store.profiles.find((profile) => profile.id === store.activeProfileId) ?? null
}

export async function createProfile(name, password) {
  const cleanName = name.trim()
  const store = readStore()
  const duplicate = store.profiles.some(
    (profile) => profile.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase(),
  )

  if (duplicate) throw new Error('Dieser Profilname existiert bereits.')

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const profile = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: cleanName,
    passwordHash: await hashPassword(password, salt),
    passwordSalt: bytesToBase64(salt),
    createdAt: new Date().toISOString(),
    xp: 0,
    coins: 0,
  }

  writeStore({
    profiles: [...store.profiles, profile],
    activeProfileId: profile.id,
  })
  return profile
}

export async function authenticateProfile(nameOrId, password) {
  const store = readStore()
  const lookup = String(nameOrId).trim().toLocaleLowerCase()
  const profile = store.profiles.find(
    (item) => item.id === nameOrId || item.name.toLocaleLowerCase() === lookup,
  )

  if (!profile) return null

  const hash = await hashPassword(password, base64ToBytes(profile.passwordSalt))
  if (hash !== profile.passwordHash) return null

  writeStore({ ...store, activeProfileId: profile.id })
  return profile
}

export function logoutProfile() {
  const store = readStore()
  writeStore({ ...store, activeProfileId: null })
}

export function resetProfileProgressFields(profileId) {
  const store = readStore()
  writeStore({
    ...store,
    profiles: store.profiles.map((profile) =>
      profile.id === profileId
        ? { ...profile, xp: 0, coins: 0 }
        : profile,
    ),
  })
}

export function getProfileStorageScope(profileId) {
  return profileId ? `profile-${profileId}` : 'legacy'
}
