import { supabase } from '../../lib/supabase'

function rpcError(error, fallback) {
  const message = String(error?.message ?? '')
  if (message && !message.toLowerCase().includes('function public.')) return new Error(message)
  return new Error(fallback)
}

function mapPlayer(row) {
  return { profileId: row.id, name: row.profile_name, xp: Number(row.xp) || 0, playerLevel: Number(row.player_level) || 1, avatarPath: row.avatar_path ?? null }
}

export async function getPendingRequestCount() {
  const { data, error } = await supabase.rpc('get_pending_request_count')
  if (error) throw rpcError(error, 'Offene Anfragen konnten nicht geladen werden.')
  return Number(data) || 0
}

export async function getPendingRequests() {
  const { data, error } = await supabase.rpc('get_pending_requests')
  if (error) throw rpcError(error, 'Anfragen konnten nicht geladen werden.')
  return (data ?? []).map((row) => ({
    id: row.id, type: row.request_type, senderId: row.sender_id, senderName: row.sender_name,
    groupId: row.group_id, groupName: row.group_name, createdAt: row.created_at,
  }))
}

export async function sendFriendRequest(profileId) {
  const { error } = await supabase.rpc('send_friend_request', { receiver_profile_id: profileId })
  if (error) throw rpcError(error, 'Freundschaftsanfrage konnte nicht gesendet werden.')
}

export async function respondToFriendRequest(requestId, accept) {
  const { error } = await supabase.rpc('respond_friend_request', { request_id: requestId, accept })
  if (error) throw rpcError(error, 'Anfrage konnte nicht beantwortet werden.')
}

export async function sendGroupInvite(groupId, profileId) {
  const { error } = await supabase.rpc('send_group_invite', { group_id: groupId, receiver_profile_id: profileId })
  if (error) throw rpcError(error, 'Gruppeneinladung konnte nicht gesendet werden.')
}

export async function respondToGroupInvite(requestId, accept) {
  const { error } = await supabase.rpc('respond_group_invite', { request_id: requestId, accept })
  if (error) throw rpcError(error, 'Einladung konnte nicht beantwortet werden.')
}

export async function getFriends() {
  const { data, error } = await supabase.rpc('get_friends')
  if (error) throw rpcError(error, 'Freunde konnten nicht geladen werden.')
  return (data ?? []).map(mapPlayer)
}

export async function searchProfiles(searchText) {
  const { data, error } = await supabase.rpc('search_profiles', { search_text: searchText })
  if (error) throw rpcError(error, 'Spielersuche fehlgeschlagen.')
  return (data ?? []).map(mapPlayer)
}

export async function getPublicPlayerProfile(profileId) {
  const { data, error } = await supabase.rpc('get_public_player_profile', { profile_id: profileId })
  if (error) throw rpcError(error, 'Spielerprofil konnte nicht geladen werden.')
  const row = data?.[0]
  if (!row) throw new Error('Spielerprofil nicht gefunden.')
  return {
    ...mapPlayer(row),
    friendshipStatus: row.friendship_status,
    pendingRequestId: row.pending_request_id,
  }
}
