export function runningElapsedMs(accumulatedMs, runningSince, now = Date.now()) { return Math.max(0, accumulatedMs + (runningSince == null ? 0 : now - runningSince)) }
export function timerSnapshot(targetMs, elapsedMs) {
  const remainingMs = Math.max(0, targetMs - elapsedMs)
  const overtimeMs = Math.max(0, elapsedMs - targetMs)
  return { remainingMs, overtimeMs, overtime: elapsedMs >= targetMs, progress: Math.max(0, Math.min(1, remainingMs / targetMs)) }
}

export function getTimeChallengeTone(remainingSeconds, overtime = false) {
  if (overtime || remainingSeconds <= 0) return 'is-overtime'
  if (remainingSeconds <= 10) return 'is-last-seconds'
  if (remainingSeconds <= 30) return 'is-critical'
  if (remainingSeconds <= 60) return 'is-warning'
  return 'is-normal'
}
