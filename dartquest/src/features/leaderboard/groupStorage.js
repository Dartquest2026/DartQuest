import { supabase } from '../../lib/supabase'

export const MAX_GROUPS_PER_PROFILE = 5

function databaseError(error, fallback) {
  const message = String(error?.message ?? '').toLowerCase()
  if (error?.code === '23505' && message.includes('group_members')) {
    return new Error('Du bist bereits Mitglied dieser Gruppe.')
  }
  if (message.includes('fetch') || message.includes('network')) {
    return new Error('Netzwerkfehler. Bitte prüfe deine Internetverbindung.')
  }
  return new Error(fallback)
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Bitte melde dich erneut an.')
  return data.user
}

export function normalizeInviteCode(inviteCode) {
  return String(inviteCode ?? '')
    .trim()
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[０-９]/g, (digit) => String('０１２３４５６７８９'.indexOf(digit)))
    .replace(/\D/g, '')
}

function mapProfile(row) {
  return {
    profileId: row.id,
    name: row.profile_name,
    xp: Number(row.xp) || 0,
    coins: Number(row.coins) || 0,
    playerLevel: Number(row.player_level) || 1,
    avatarPath: row.avatar_path ?? null,
  }
}

function mapGroup(row, members = []) {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerProfileId: row.owner_id,
    createdAt: row.created_at,
    members,
  }
}

async function loadMembers(groupIds) {
  if (!groupIds.length) return new Map()
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, joined_at, profiles!group_members_user_id_fkey(id, profile_name, xp, coins, player_level, avatar_path)')
    .in('group_id', groupIds)
  if (error) throw databaseError(error, 'Die Rangliste konnte nicht geladen werden.')

  const byGroup = new Map(groupIds.map((id) => [id, []]))
  for (const membership of data ?? []) {
    if (!membership.profiles) continue
    byGroup.get(membership.group_id)?.push({
      ...mapProfile(membership.profiles),
      joinedAt: membership.joined_at,
    })
  }
  return byGroup
}

export async function getGroupsForProfile() {
  const user = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, invite_code, owner_id, created_at')
    .order('created_at', { ascending: false })
  if (error) throw databaseError(error, 'Deine Gruppen konnten nicht geladen werden.')

  const rows = data ?? []
  const members = await loadMembers(rows.map((group) => group.id))
  return rows
    .map((group) => mapGroup(group, members.get(group.id) ?? []))
    .filter((group) => group.ownerProfileId === user.id || group.members.some((member) => member.profileId === user.id))
}

export async function loadGroup(groupId) {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, invite_code, owner_id, created_at')
    .eq('id', groupId)
    .single()
  if (error) throw databaseError(error, 'Die Gruppe konnte nicht geladen werden.')
  const members = await loadMembers([groupId])
  return mapGroup(data, members.get(groupId) ?? [])
}

export async function createGroup(name) {
  const cleanName = String(name ?? '').trim()
  if (cleanName.length < 2) throw new Error('Der Gruppenname muss mindestens 2 Zeichen haben.')
  await getAuthenticatedUser()
  if ((await getGroupsForProfile()).length >= MAX_GROUPS_PER_PROFILE) {
    throw new Error('Du kannst maximal 5 Gruppen haben.')
  }

  const { data, error } = await supabase.rpc('create_group', {
    group_name: cleanName,
  })
  if (error) throw databaseError(error, error.message || 'Die Gruppe konnte nicht erstellt werden.')
  const group = data?.[0]
  if (!group) throw new Error('Die Gruppe konnte nicht erstellt werden.')
  return loadGroup(group.id)
}

export async function joinGroup(inviteCode) {
  const code = normalizeInviteCode(inviteCode)
  if (!/^\d{6}$/.test(code)) throw new Error('Keine Gruppe mit diesem Code gefunden.')
  await getAuthenticatedUser()
  if ((await getGroupsForProfile()).length >= MAX_GROUPS_PER_PROFILE) {
    throw new Error('Du kannst maximal 5 Gruppen haben.')
  }

  const { data, error } = await supabase.rpc('join_group_by_invite_code', { code })
  if (error) throw databaseError(error, error.message || 'Der Gruppe konnte nicht beigetreten werden.')
  const group = data?.[0]
  if (!group) throw new Error('Keine Gruppe mit diesem Code gefunden.')
  return loadGroup(group.id)
}

export async function deleteGroup(groupId) {
  const user = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('owner_id', user.id)
    .select('id')
    .maybeSingle()
  if (error) throw databaseError(error, 'Die Gruppe konnte nicht gelöscht werden.')
  if (!data) throw new Error('Nur der Owner darf diese Gruppe löschen.')
}

export async function leaveGroup(groupId, ownerProfileId) {
  const user = await getAuthenticatedUser()
  if (ownerProfileId === user.id) throw new Error('Als Owner musst du die Gruppe löschen.')
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)
  if (error) throw databaseError(error, 'Die Gruppe konnte nicht verlassen werden.')
}

export function getRankedMembers(group) {
  return [...group.members].sort(
    (first, second) => second.xp - first.xp || first.name.localeCompare(second.name, 'de'),
  )
}
