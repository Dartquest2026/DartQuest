import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Methode nicht erlaubt.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization?.startsWith('Bearer ')) {
    return json({ error: 'Authentifizierung erforderlich.' }, 401)
  }

  const token = authorization.slice('Bearer '.length)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Sitzung ist ungültig oder abgelaufen.' }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const userId = userData.user.id
  const { count, error: ownerError } = await admin.from('groups').select('id', { count: 'exact', head: true }).eq('owner_id', userId)
  if (ownerError) return json({ error: 'Kontolöschung konnte nicht geprüft werden.' }, 500)
  if ((count ?? 0) > 0) return json({ error: 'Du besitzt noch Gruppen. Lösche oder übertrage diese Gruppen zuerst.' }, 409)

  const { data: profile, error: profileError } = await admin.from('profiles').select('avatar_path').eq('id', userId).maybeSingle()
  if (profileError) return json({ error: 'Profil konnte nicht geladen werden.' }, 500)
  if (profile?.avatar_path) {
    const { error: storageError } = await admin.storage.from('avatars').remove([profile.avatar_path])
    if (storageError) {
      console.error('[delete-account] Avatar-Löschung fehlgeschlagen', {
        code: storageError.name,
        message: storageError.message,
      })
      return json({ error: 'Profilbild konnte nicht gelöscht werden. Das Konto wurde nicht verändert.' }, 500)
    }
  }

  // group_members, friendships and community_requests cascade from profiles.
  // groups.owner_id is RESTRICT; this also guards against a race after the
  // owner pre-check. Do not rely on profiles cascading from auth.users.
  const { error: profileDeleteError } = await admin.from('profiles').delete().eq('id', userId)
  if (profileDeleteError) {
    console.error('[delete-account] Profil-Löschung fehlgeschlagen', {
      code: profileDeleteError.code,
      message: profileDeleteError.message,
    })
    if (profileDeleteError.code === '23503') {
      return json({ error: 'Du besitzt noch Gruppen. Lösche oder übertrage diese Gruppen zuerst.' }, 409)
    }
    return json({ error: 'Dein Profil konnte nicht gelöscht werden. Dein Login wurde nicht verändert.' }, 500)
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    console.error('[delete-account] Auth-Löschung nach Profil-Löschung fehlgeschlagen', {
      status: authDeleteError.status,
      code: authDeleteError.code,
      message: authDeleteError.message,
    })
    return json({ error: 'Das Profil wurde gelöscht, aber der Login konnte nicht entfernt werden. Bitte kontaktiere den Support.' }, 500)
  }
  return json({ success: true }, 200)
})

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}
