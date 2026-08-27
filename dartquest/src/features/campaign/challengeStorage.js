const BASE_KEY = 'dartquest-campaign-challenge'

export const FIRST_CHALLENGE_MIN_LEVEL = 8
export const FIRST_CHALLENGE_MAX_LEVEL = 12
export const CHALLENGE_DISTANCE_MIN = 8
export const CHALLENGE_DISTANCE_MAX = 12

function key(profileId, difficulty) {
  return `${BASE_KEY}-${profileId || 'guest'}-${difficulty || 1}`
}

function randomInteger(min, max, random = Math.random) {
  return min + Math.floor(random() * (max - min + 1))
}

export function randomFirstChallengeLevel(random = Math.random) {
  return randomInteger(FIRST_CHALLENGE_MIN_LEVEL, FIRST_CHALLENGE_MAX_LEVEL, random)
}

export function randomChallengeDistance(random = Math.random) {
  return randomInteger(CHALLENGE_DISTANCE_MIN, CHALLENGE_DISTANCE_MAX, random)
}

export function createInitialChallengeState(random = Math.random) {
  return {
    nextAt: randomFirstChallengeLevel(random),
    pending: null,
    completed: [],
  }
}

export function saveChallenge(profileId, difficulty, state) {
  localStorage.setItem(key(profileId, difficulty), JSON.stringify(state))
  return state
}

export function loadChallenge(profileId, difficulty, random = Math.random) {
  try {
    const saved = JSON.parse(localStorage.getItem(key(profileId, difficulty)))
    if (saved && (Number.isInteger(saved.nextAt) || saved.pending)) return saved
  } catch {
    // Replace invalid storage with one new persistent schedule.
  }

  return saveChallenge(profileId, difficulty, createInitialChallengeState(random))
}

export function scheduleChallenge(profileId, difficulty, completedLevels, current) {
  if (current.pending || !Number.isInteger(current.nextAt) || completedLevels < current.nextAt) return current

  const pending = {
    id: `challenge-${Date.now()}`,
    status: 'offered',
    autoShown: false,
    triggerLevel: current.nextAt,
    startScore: difficulty === 1 ? 101 : 201,
    opponent: 'DartQuest Herausforderer',
  }
  return saveChallenge(profileId, difficulty, { ...current, pending })
}

export function checkAndCreateChallengeAfterLevel(profileId, difficulty, completedLevel) {
  const current = loadChallenge(profileId, difficulty)
  const scheduled = scheduleChallenge(profileId, difficulty, completedLevel, current)
  const shouldShowChallenge = scheduled.pending?.status === 'offered' && scheduled.pending.autoShown !== true
  if (!shouldShowChallenge) return { state: scheduled, shouldShowChallenge: false, challenge: null }

  const state = saveChallenge(profileId, difficulty, {
    ...scheduled,
    pending: { ...scheduled.pending, autoShown: true },
  })
  return { state, shouldShowChallenge: true, challenge: state.pending }
}

export function completeChallenge(profileId, difficulty, current, completedChallenge, random = Math.random) {
  const completedId = completedChallenge?.id ?? current.pending?.id
  if (!completedId || current.completed.includes(completedId)) return current

  const completedChallengeLevel =
    completedChallenge?.triggerLevel ?? current.pending?.triggerLevel ?? current.nextAt
  const nextAt = completedChallengeLevel + randomChallengeDistance(random)

  return saveChallenge(profileId, difficulty, {
    ...current,
    nextAt,
    pending: null,
    completed: [...current.completed, completedId],
  })
}
