const VERSION = 1

const key = (id) => `dartquest-cards-v${VERSION}-${id || 'local'}`

export function loadCards(profileId) {
  try {
    const data = JSON.parse(localStorage.getItem(key(profileId)))
    return data && typeof data === 'object'
      ? { inventory: {}, unopened: 0, rewardIds: [], lastObtainedAt: {}, ...data }
      : { inventory: {}, unopened: 0, rewardIds: [], lastObtainedAt: {} }
  } catch {
    return { inventory: {}, unopened: 0, rewardIds: [], lastObtainedAt: {} }
  }
}

export function saveCards(profileId, data) {
  localStorage.setItem(key(profileId), JSON.stringify({ ...data, version: VERSION, updatedAt: new Date().toISOString() }))
}

export function addCards(profileId, state, cards) {
  const inventory = { ...state.inventory }
  const lastObtainedAt = { ...(state.lastObtainedAt || {}) }
  const openedAt = new Date().toISOString()
  cards.forEach((card, index) => {
    inventory[card.id] = (inventory[card.id] || 0) + 1
    lastObtainedAt[card.id] = `${openedAt}-${String(index).padStart(2, '0')}`
  })
  const next = { ...state, inventory, lastObtainedAt }
  saveCards(profileId, next)
  return next
}

export function grantFreePack(profileId, rewardId) {
  const state = loadCards(profileId)
  if (state.rewardIds.includes(rewardId)) return false
  saveCards(profileId, { ...state, unopened: state.unopened + 1, rewardIds: [...state.rewardIds, rewardId] })
  return true
}
