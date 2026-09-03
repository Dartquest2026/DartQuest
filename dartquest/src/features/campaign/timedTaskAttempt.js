export function pauseTimedAttempt(endTime, now = Date.now()) {
  return Math.max(0, endTime - now)
}

export function resumeTimedAttempt(remainingMs, now = Date.now()) {
  return now + Math.max(0, remainingMs)
}

export function createTimedTaskResult(level, remainingMs, completedAt = Date.now(), startedAt = completedAt) {
  const limitMs = level.timeLimitSeconds * 1000
  const safeRemainingMs = Math.max(0, Math.min(limitMs, remainingMs))
  const elapsedMs = limitMs - safeRemainingMs
  return {
    success: true,
    completed: true,
    timed: true,
    stars: 1,
    darts: null,
    totalDarts: 0,
    visits: 0,
    taskType: 'timed',
    timeLimitSeconds: level.timeLimitSeconds,
    elapsedTimeSeconds: Math.ceil(elapsedMs / 1000),
    remainingTimeSeconds: Math.floor(safeRemainingMs / 1000),
    durationMs: elapsedMs,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date(completedAt).toISOString(),
    xp: level.rewardXP ?? 0,
    coins: level.rewardCoins ?? 0,
  }
}
