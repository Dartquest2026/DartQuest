export function getRemainingSeconds(endTime, now = Date.now()) {
  if (!Number.isFinite(endTime)) return 0
  return Math.max(0, Math.ceil((endTime - now) / 1000))
}

export function formatCountdown(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

export function getCountdownTone(seconds) {
  if (seconds <= 10) return 'is-critical'
  if (seconds <= 30) return 'is-urgent'
  if (seconds <= 60) return 'is-warning'
  return ''
}
