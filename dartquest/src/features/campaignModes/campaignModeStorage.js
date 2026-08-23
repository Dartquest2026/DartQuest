const VERSION = 1

function key(profileId, campaign) {
  return `dartquest-${campaign}-campaign-v${VERSION}-${profileId || 'local'}`
}

export function loadCampaignProgress(profileId, campaign) {
  try {
    const value = JSON.parse(localStorage.getItem(key(profileId, campaign)))
    return value && typeof value === 'object' ? value : { levels: {} }
  } catch {
    return { levels: {} }
  }
}

export function saveCampaignProgress(profileId, campaign, progress) {
  localStorage.setItem(key(profileId, campaign), JSON.stringify({ ...progress, version: VERSION, updatedAt: new Date().toISOString() }))
}

export function isCampaignLevelUnlocked(progress, level) {
  return level === 1 || Boolean(progress?.levels?.[level - 1]?.completed)
}

