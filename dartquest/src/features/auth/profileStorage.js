import { supabase } from '../../lib/supabase'

export const PROFILE_STORAGE_KEY = 'dartquest-profiles'
export const PROFILE_CACHE_KEY = 'dartquest-supabase-profile-cache'

function readProfileCache() {
  try {
    const profiles = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY))
    return Array.isArray(profiles) ? profiles : []
  } catch {
    return []
  }
}

function cacheProfile(profile) {
  const profiles = readProfileCache().filter((item) => item.id !== profile.id)
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify([...profiles, profile]))
}

function mapProfile(row, user) {
  return {
    id: row.id,
    name: row.profile_name,
    email: user?.email ?? null,
    createdAt: row.created_at,
    xp: Number(row.xp) || 0,
    coins: Number(row.coins) || 0,
    playerLevel: Number(row.player_level) || 1,
  }
}

function authErrorMessage(error, context = 'login') {
  const message = String(error?.message ?? '').toLowerCase()
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Diese E-Mail-Adresse ist bereits registriert.'
  }
  if (message.includes('invalid login credentials')) {
    return 'E-Mail oder Passwort ist falsch.'
  }
  if (message.includes('invalid') && message.includes('email')) {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.'
  }
  if (message.includes('password') && (message.includes('short') || message.includes('least'))) {
    return 'Das Passwort ist zu kurz.'
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Netzwerkfehler. Bitte prüfe deine Internetverbindung.'
  }
  return context === 'profile'
    ? 'Das Profil konnte nicht geladen werden.'
    : 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.'
}

async function createMissingProfile(user, profileName) {
  const cleanName = String(profileName ?? '').trim()
  if (!cleanName) throw new Error('Das Profil konnte nicht geladen werden.')

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      profile_name: cleanName,
      xp: 0,
      coins: 0,
      player_level: 1,
    })
    .select()
    .single()

  if (error) throw new Error(authErrorMessage(error, 'profile'))
  return data
}

export async function loadSupabaseProfile(user, fallbackName) {
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, created_at, profile_name, xp, coins, player_level')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new Error(authErrorMessage(error, 'profile'))

  const row = data ?? await createMissingProfile(
    user,
    fallbackName ?? user.user_metadata?.profile_name,
  )
  const profile = mapProfile(row, user)
  cacheProfile(profile)
  return profile
}

export async function registerProfile(name, email, password) {
  const profileName = name.trim()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { profile_name: profileName } },
  })

  if (error) throw new Error(authErrorMessage(error, 'register'))

  if (!data.session) {
    return { profile: null, confirmationRequired: true }
  }

  return {
    profile: await loadSupabaseProfile(data.user, profileName),
    confirmationRequired: false,
  }
}

export async function loginProfile(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw new Error(authErrorMessage(error))
  return loadSupabaseProfile(data.user)
}

export async function getSessionProfile() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(authErrorMessage(error))
  return data.session ? loadSupabaseProfile(data.session.user) : null
}

export function subscribeToAuthChanges(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(async () => {
      try {
        callback(session ? await loadSupabaseProfile(session.user) : null)
      } catch (error) {
        callback(null, error)
      }
    }, 0)
  })
  return () => data.subscription.unsubscribe()
}

export async function logoutProfile() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(authErrorMessage(error))
}

export async function resetProfileProgressFields(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ xp: 0, coins: 0, player_level: 1 })
    .eq('id', profileId)
    .select()
    .single()
  if (error) throw new Error(authErrorMessage(error, 'profile'))
  cacheProfile(mapProfile(data))
}

// Nur für die noch lokale Rangliste; enthält niemals Passwortdaten oder Sessions.
export function getProfiles() {
  return readProfileCache()
}

export function getProfileStorageScope(profileId) {
  return profileId ? `profile-${profileId}` : 'legacy'
}
