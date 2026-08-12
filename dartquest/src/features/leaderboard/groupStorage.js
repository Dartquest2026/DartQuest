export const GROUP_STORAGE_KEY = 'dartquest-groups'
export const MAX_GROUPS_PER_PROFILE = 5

function readGroups() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY))
    const groups = Array.isArray(parsed?.groups) ? parsed.groups : []
    const usedCodes = new Set()
    let migrated = false

    const migratedGroups = groups.map((group) => {
      const currentCode = String(group.inviteCode ?? '')
      if (/^\d{6}$/.test(currentCode) && !usedCodes.has(currentCode)) {
        usedCodes.add(currentCode)
        return group
      }

      const inviteCode = createInviteCode([], usedCodes)
      usedCodes.add(inviteCode)
      migrated = true
      return { ...group, inviteCode }
    })

    if (migrated) writeGroups(migratedGroups)
    return migratedGroups
  } catch {
    return []
  }
}

function writeGroups(groups) {
  // Lokaler Adapter: kann später durch dieselbe Schnittstelle eines Backends ersetzt werden.
  localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify({ groups }))
}

export function createInviteCode(groups, additionalCodes = new Set()) {
  let code
  do {
    const random = crypto.getRandomValues(new Uint32Array(1))[0]
    code = String(random % 1000000).padStart(6, '0')
  } while (
    additionalCodes.has(code) ||
    groups.some((group) => String(group.inviteCode) === code)
  )
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
  const normalizedCode = String(inviteCode).replace(/\D/g, '').slice(0, 6)
  const groupIndex = groups.findIndex((group) => group.inviteCode === normalizedCode)
  if (groupIndex < 0) throw new Error('Keine Gruppe mit diesem Code gefunden.')
  if (groups[groupIndex].members.some((member) => member.profileId === profileId)) {
    throw new Error('Du bist bereits Mitglied dieser Gruppe.')
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

export function deleteGroup(groupId, ownerProfileId) {
  const groups = readGroups()
  const group = groups.find((item) => item.id === groupId)
  if (!group || group.ownerProfileId !== ownerProfileId) return false
  writeGroups(groups.filter((item) => item.id !== groupId))
  return true
}

export function leaveGroup(groupId, profileId) {
  const groups = readGroups()
  const index = groups.findIndex((item) => item.id === groupId)
  if (index < 0 || groups[index].ownerProfileId === profileId) return false
  groups[index] = {
    ...groups[index],
    members: groups[index].members.filter((member) => member.profileId !== profileId),
  }
  writeGroups(groups)
  return true
}

export function getOwnedGroups(profileId) {
  return readGroups().filter((group) => group.ownerProfileId === profileId)
}

export function removeProfileFromGroups(profileId) {
  const groups = readGroups()
  if (groups.some((group) => group.ownerProfileId === profileId)) return false

  writeGroups(groups.map((group) => ({
    ...group,
    members: group.members.filter((member) => member.profileId !== profileId),
  })))
  return true
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
