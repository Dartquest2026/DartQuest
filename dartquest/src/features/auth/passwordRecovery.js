export const PASSWORD_RESET_PATH = '/reset-password'
export const MIN_PASSWORD_LENGTH = 6

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

export function getPasswordResetRedirectUrl(origin = window.location.origin) {
  const ownOrigin = new URL(origin).origin
  return new URL(PASSWORD_RESET_PATH, `${ownOrigin}/`).toString()
}

export function validateNewPassword(password, repeatedPassword) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`
  }
  if (password !== repeatedPassword) {
    return 'Die Passwörter stimmen nicht überein.'
  }
  return ''
}

export function isPasswordRecoveryLocation(location = window.location) {
  if (location.pathname !== PASSWORD_RESET_PATH) return false
  const search = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  return search.has('code') || search.has('token_hash') || search.has('error')
    || hash.has('error') || search.get('type') === 'recovery'
    || hash.get('type') === 'recovery'
}
