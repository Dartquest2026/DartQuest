export const timeChallenges = Object.freeze([
  { id:'singles-around-clock', title:'Singles Around the Clock', short:'1–20 + Bull', field:'SINGLE-FELDER', focus:'VON 1 BIS 20 + BULL', defaultTargetTimeSeconds:420 },
  { id:'doubles-around-clock', title:'Doubles Around the Clock', short:'D1–D20', field:'DOPPEL-FELDER', focus:'VON D1 BIS D20', defaultTargetTimeSeconds:420 },
  { id:'triples-around-clock', title:'Triples Around the Clock', short:'T1–T20', field:'TRIPLE-FELDER', focus:'VON T1 BIS T20', defaultTargetTimeSeconds:420 },
])

export function getTimeChallenge(id) { return timeChallenges.find((challenge) => challenge.id === id) ?? null }
export function clampTargetTime(seconds) { return Math.max(30, Math.min(60 * 60, Math.round(seconds / 30) * 30)) }
export function formatTrainingTime(seconds, overtime = false) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${overtime ? '+' : ''}${String(Math.floor(safe / 60)).padStart(2,'0')}:${String(safe % 60).padStart(2,'0')}`
}
export function summarizeAttempts(attempts) {
  return attempts.reduce((summary, attempt) => {
    const current = summary[attempt.challenge_id] ?? { bestTimeSeconds:null, lastTimeSeconds:null, attempts:0, lastTargetTimeSeconds:null }
    const elapsed = Math.round(attempt.elapsed_time_ms / 1000)
    summary[attempt.challenge_id] = {
      bestTimeSeconds: current.bestTimeSeconds == null ? elapsed : Math.min(current.bestTimeSeconds, elapsed),
      lastTimeSeconds: current.attempts === 0 ? elapsed : current.lastTimeSeconds,
      lastTargetTimeSeconds: current.attempts === 0 ? Math.round(attempt.target_time_ms / 1000) : current.lastTargetTimeSeconds,
      attempts: current.attempts + 1,
    }
    return summary
  }, {})
}
