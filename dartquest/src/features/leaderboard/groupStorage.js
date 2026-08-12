export const GROUP_STORAGE_KEY = 'dartquest-groups'
export const MAX_GROUPS_PER_PROFILE = 5

function readGroups() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY))
    return Array.isArray(parsed?.groups) ? parsed.groups : []
  } catch {
    return []
  }
}

function writeGroups(groups) {
  // Lokaler Adapter: kann später durch dieselbe Schnittstelle eines Backends ersetzt werden.
  localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify({ groups }))
}

function createInviteCode(groups) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code
  do {
    const random = crypto.getRandomValues(new Uint8Array(5))
    code = `DQ-${Array.from(random, (value) => alphabet[value % alphabet.length]).join('')}`
  } while (groups.some((group) => group.inviteCode === code))
  return code
}

export function getGroupsForProfile(profileId) {
  return readGroups().filter((group) =>
    group.members.some((member) => member.profileId === profileId),
  )
}

export function createGroup(name, ownerProfileId) {
  const cleanName = name.trim()
  if (cleanName.length < 2) throw new Error('Der Gruppenname muss mindestens 2 Zeichen haben.')
  const groups = readGroups()
  if (getGroupsForProfile(ownerProfileId).length >= MAX_GROUPS_PER_PROFILE) {
    throw new Error('Du kannst maximal 5 Gruppen haben.')
  }
  const now = new Date().toISOString()
  const group = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: cleanName,
    inviteCode: createInviteCode(groups),
    ownerProfileId,
    members: [{ profileId: ownerProfileId, joinedAt: now }],
    createdAt: now,
  }
  writeGroups([...groups, group])
  return group
}

export function joinGroup(inviteCode, profileId) {
  const groups = readGroups()
  const normalizedCode = inviteCode.trim().toUpperCase()
  const groupIndex = groups.findIndex((group) => group.inviteCode === normalizedCode)
  if (groupIndex < 0) throw new Error('Einladungscode wurde nicht gefunden.')
  if (groups[groupIndex].members.some((member) => member.profileId === profileId)) {
    return groups[groupIndex]
  }
  if (getGroupsForProfile(profileId).length >= MAX_GROUPS_PER_PROFILE) {
    throw new Error('Du kannst maximal 5 Gruppen haben.')
  }
  groups[groupIndex] = {
    ...groups[groupIndex],
    members: [...groups[groupIndex].members, { profileId, joinedAt: new Date().toISOString() }],
  }
  writeGroups(groups)
  return groups[groupIndex]
}

export function getRankedMembers(group, profiles) {
  return group.members
    .map((member) => {
      const profile = profiles.find((item) => item.id === member.profileId)
      if (!profile) return null
      const xp = Number(profile.xp) || 0
      return {
        profileId: profile.id,
        name: profile.name,
        xp,
        coins: Number(profile.coins) || 0,
        stars: Number(profile.stars) || 0,
        completedLevels: Number(profile.completedLevels) || 0,
        defeatedBosses: Number(profile.defeatedBosses) || 0,
        playerLevel: Math.floor(xp / 500) + 1,
      }
    })
    .filter(Boolean)
    .sort((first, second) => second.xp - first.xp || first.name.localeCompare(second.name, 'de'))
}
