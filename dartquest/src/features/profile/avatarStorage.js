import { supabase } from '../../lib/supabase'

const MAX_SOURCE_SIZE = 5 * 1024 * 1024
const AVATAR_SIZE = 512

export function getAvatarUrl(path, cacheKey = '') {
  if (!path) return null
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return cacheKey ? `${data.publicUrl}?v=${encodeURIComponent(cacheKey)}` : data.publicUrl
}

async function resizeToWebp(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Bitte wähle eine Bilddatei aus.')
  if (file.size > MAX_SOURCE_SIZE) throw new Error('Das Bild darf maximal 5 MB groß sein.')
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE; canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
  if (!blob) throw new Error('Das Bild konnte nicht verarbeitet werden.')
  return blob
}

export async function uploadOwnAvatar(file, userId) {
  const blob = await resizeToWebp(file)
  const path = `${userId}/avatar.webp`
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: true })
  if (uploadError) throw new Error('Das Profilbild konnte nicht hochgeladen werden.')
  const { error: profileError } = await supabase.rpc('set_own_avatar_path', { new_avatar_path: path })
  if (profileError) throw new Error('Das Profilbild konnte nicht gespeichert werden.')
  return path
}

export async function removeOwnAvatar(path) {
  if (path) {
    const { error } = await supabase.storage.from('avatars').remove([path])
    if (error) throw new Error('Das Profilbild konnte nicht entfernt werden.')
  }
  const { error } = await supabase.rpc('set_own_avatar_path', { new_avatar_path: null })
  if (error) throw new Error('Das Profilbild konnte nicht entfernt werden.')
}

export async function deleteOwnAccount(password, email) {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) {
    console.error('[delete-account] Passwort-Reauthentifizierung fehlgeschlagen', {
      status: authError.status,
      code: authError.code,
      message: authError.message,
    })
    throw new Error('Dein Passwort konnte nicht bestätigt werden.')
  }

  const { data, error } = await supabase.functions.invoke('delete-account', { body: {} })
  if (error) {
    let payload = data && typeof data === 'object' ? data : null
    const status = error.context?.status ?? error.status ?? null
    try {
      if (!payload && error.context?.clone) payload = await error.context.clone().json()
      else if (!payload && error.context?.json) payload = await error.context.json()
    } catch { /* The gateway did not return JSON. */ }

    console.error('[delete-account] Edge Function fehlgeschlagen', {
      status,
      type: error.name,
      code: payload?.code ?? error.code,
      message: payload?.error ?? payload?.message ?? error.message,
    })

    if (status === 404 || payload?.code === 'NOT_FOUND') {
      throw new Error('Der Löschdienst ist momentan nicht verfügbar. Die Edge Function ist nicht deployed.')
    }
    if (status === 409) {
      throw new Error(payload?.error || payload?.message || 'Du besitzt noch eine Gruppe. Lösche oder übertrage sie zuerst.')
    }
    if (status === 401 || status === 403) {
      throw new Error('Deine Sitzung konnte vom Löschdienst nicht bestätigt werden. Bitte melde dich erneut an.')
    }
    if (!status) throw new Error('Der Löschdienst ist momentan nicht erreichbar.')
    throw new Error(payload?.error || payload?.message || 'Der Löschdienst konnte das Konto nicht löschen.')
  }
  if (!data?.success) {
    console.error('[delete-account] Unerwartete Function-Antwort', { success: data?.success, error: data?.error, message: data?.message })
    throw new Error(data?.error || data?.message || 'Der Löschdienst hat unerwartet geantwortet.')
  }
  const accountLocalKeys = Object.keys(localStorage).filter((key) =>
    key === 'dartquest-supabase-profile-cache' ||
    key === 'dartquest-singleplayer-difficulty' ||
    key === 'dartquest-daily-challenge' ||
    key === 'dartquest-multiplayer-saves' ||
    key.startsWith('dartquest-campaign-progress-')
  )
  accountLocalKeys.forEach((key) => localStorage.removeItem(key))
  await supabase.auth.signOut({ scope: 'local' })
}
