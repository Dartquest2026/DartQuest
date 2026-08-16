export const SUPPORT_EMAIL = String(import.meta.env?.VITE_SUPPORT_EMAIL ?? '').trim()

export function isValidOptionalEmail(email) {
  const value = String(email ?? '').trim()
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function getPlatformSummary(navigatorObject = navigator) {
  const ua = String(navigatorObject?.userAgent ?? '')
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Unbekannter Browser'
  const platform = navigatorObject?.userAgentData?.platform || navigatorObject?.platform || 'Unbekannte Plattform'
  return `${browser} · ${platform}`
}

export function createSupportMessage({ topic, message, replyEmail, appVersion, platform }) {
  return [
    `Thema: ${topic}`,
    '',
    String(message).trim(),
    '',
    `Rückantwort: ${String(replyEmail).trim() || 'nicht angegeben'}`,
    `DartQuest-Version: ${appVersion}`,
    `Plattform: ${platform}`,
  ].join('\n')
}

export function createMailtoUrl(recipient, subject, body) {
  if (!String(recipient ?? '').trim()) return null
  return `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
