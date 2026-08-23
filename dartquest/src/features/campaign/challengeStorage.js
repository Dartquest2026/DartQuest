const BASE_KEY = 'dartquest-campaign-challenge'

function key(profileId, difficulty) { return `${BASE_KEY}-${profileId || 'guest'}-${difficulty || 1}` }
function randomDistance(random = Math.random) { return 10 + Math.floor(random() * 11) }

export function loadChallenge(profileId, difficulty) {
  try {
    const saved = JSON.parse(localStorage.getItem(key(profileId, difficulty)))
    if (saved && Number.isInteger(saved.nextAt)) return saved
  } catch { /* use a fresh schedule */ }
  return { nextAt: randomDistance(), pending: null, completed: [] }
}

export function scheduleChallenge(profileId, difficulty, completedLevels, current) {
  if (current.pending || completedLevels < current.nextAt) return current
  const pending = { id: `challenge-${Date.now()}`, status: 'offered', startScore: difficulty === 1 ? 101 : 201, opponent: 'DartQuest Herausforderer' }
  const next = { ...current, pending, nextAt: completedLevels + randomDistance() }
  localStorage.setItem(key(profileId, difficulty), JSON.stringify(next))
  return next
}

export function saveChallenge(profileId, difficulty, state) {
  localStorage.setItem(key(profileId, difficulty), JSON.stringify(state))
  return state
}
