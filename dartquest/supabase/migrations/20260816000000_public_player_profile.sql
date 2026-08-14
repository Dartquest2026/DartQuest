begin;

create or replace function public.get_public_player_profile(profile_id uuid)
returns table (
  id uuid,
  profile_name text,
  xp bigint,
  player_level integer,
  friendship_status text,
  pending_request_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;

  if profile_id is null then
    raise exception using errcode = '22023', message = 'Ungültiges Spielerprofil.';
  end if;

  return query
  select
    p.id,
    p.profile_name,
    coalesce(p.xp, 0)::bigint,
    coalesce(p.player_level, 1)::integer,
    case
      when p.id = current_user_id then 'self'
      when f.user_id_a is not null then 'friends'
      when incoming.id is not null then 'incoming_pending'
      when outgoing.id is not null then 'outgoing_pending'
      else 'none'
    end,
    coalesce(incoming.id, outgoing.id)
  from public.profiles p
  left join public.friendships f
    on f.user_id_a = least(current_user_id, p.id)
   and f.user_id_b = greatest(current_user_id, p.id)
  left join lateral (
    select r.id
    from public.community_requests r
    where r.sender_id = p.id
      and r.receiver_id = current_user_id
      and r.request_type = 'friend'
      and r.status = 'pending'
    limit 1
  ) incoming on true
  left join lateral (
    select r.id
    from public.community_requests r
    where r.sender_id = current_user_id
      and r.receiver_id = p.id
      and r.request_type = 'friend'
      and r.status = 'pending'
    limit 1
  ) outgoing on true
  where p.id = profile_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'Spielerprofil nicht gefunden.';
  end if;
end;
$$;

revoke all on function public.get_public_player_profile(uuid) from public, anon;
grant execute on function public.get_public_player_profile(uuid) to authenticated;

commit;
