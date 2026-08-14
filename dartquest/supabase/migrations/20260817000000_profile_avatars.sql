begin;

alter table public.profiles add column if not exists avatar_path text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_avatar_path_owner_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_avatar_path_owner_check
    check (avatar_path is null or avatar_path = id::text || '/avatar.webp');
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_owner_update"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_owner_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.set_own_avatar_path(new_avatar_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;
  if new_avatar_path is not null and new_avatar_path <> (current_user_id::text || '/avatar.webp') then
    raise exception using errcode = '22023', message = 'Ungültiger Avatar-Pfad.';
  end if;
  update public.profiles set avatar_path = new_avatar_path where id = current_user_id;
  return new_avatar_path;
end;
$$;

drop function public.get_global_leaderboard(integer, bigint, integer, uuid);
drop function public.get_friends();
drop function public.search_profiles(text);
drop function public.get_public_player_profile(uuid);

create function public.get_global_leaderboard(page_size integer default 50, cursor_xp bigint default null, cursor_player_level integer default null, cursor_id uuid default null)
returns table (id uuid, profile_name text, xp bigint, player_level integer, avatar_path text)
language plpgsql stable security definer set search_path = ''
as $$
declare current_user_id uuid := (select auth.uid()); safe_page_size integer := least(greatest(coalesce(page_size, 50), 1), 51);
begin
  if current_user_id is null then raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.'; end if;
  if (cursor_xp is null) <> (cursor_player_level is null) or (cursor_xp is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'Ungültiger Ranglisten-Cursor.';
  end if;
  return query select p.id, p.profile_name, coalesce(p.xp,0)::bigint, coalesce(p.player_level,1)::integer, p.avatar_path
  from public.profiles p where cursor_xp is null or (coalesce(p.xp,0) < cursor_xp or (coalesce(p.xp,0)=cursor_xp and coalesce(p.player_level,1)<cursor_player_level) or (coalesce(p.xp,0)=cursor_xp and coalesce(p.player_level,1)=cursor_player_level and p.id>cursor_id))
  order by coalesce(p.xp,0) desc, coalesce(p.player_level,1) desc, p.id asc limit safe_page_size;
end;
$$;

create function public.get_friends()
returns table (id uuid, profile_name text, xp bigint, player_level integer, avatar_path text)
language sql stable security definer set search_path = ''
as $$ select p.id,p.profile_name,coalesce(p.xp,0)::bigint,coalesce(p.player_level,1)::integer,p.avatar_path from public.friendships f join public.profiles p on p.id=case when f.user_id_a=(select auth.uid()) then f.user_id_b else f.user_id_a end where f.user_id_a=(select auth.uid()) or f.user_id_b=(select auth.uid()) order by p.profile_name $$;

create function public.search_profiles(search_text text)
returns table (id uuid, profile_name text, xp bigint, player_level integer, avatar_path text)
language plpgsql stable security definer set search_path = ''
as $$
declare clean_search text := pg_catalog.btrim(coalesce(search_text,''));
begin
  if (select auth.uid()) is null then raise exception using errcode='42501',message='Authentifizierung erforderlich.'; end if;
  if pg_catalog.char_length(clean_search)<2 then return; end if;
  return query select p.id,p.profile_name,coalesce(p.xp,0)::bigint,coalesce(p.player_level,1)::integer,p.avatar_path from public.profiles p where p.id<>(select auth.uid()) and p.profile_name ilike '%'||clean_search||'%' order by p.profile_name limit 20;
end;
$$;

create function public.get_public_player_profile(profile_id uuid)
returns table (id uuid, profile_name text, xp bigint, player_level integer, avatar_path text, friendship_status text, pending_request_id uuid)
language plpgsql stable security definer set search_path = ''
as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception using errcode='42501',message='Authentifizierung erforderlich.'; end if;
  return query select p.id,p.profile_name,coalesce(p.xp,0)::bigint,coalesce(p.player_level,1)::integer,p.avatar_path,
    case when p.id=current_user_id then 'self' when f.user_id_a is not null then 'friends' when incoming.id is not null then 'incoming_pending' when outgoing.id is not null then 'outgoing_pending' else 'none' end,
    coalesce(incoming.id,outgoing.id)
  from public.profiles p
  left join public.friendships f on f.user_id_a=least(current_user_id,p.id) and f.user_id_b=greatest(current_user_id,p.id)
  left join lateral (select r.id from public.community_requests r where r.sender_id=p.id and r.receiver_id=current_user_id and r.request_type='friend' and r.status='pending' limit 1) incoming on true
  left join lateral (select r.id from public.community_requests r where r.sender_id=current_user_id and r.receiver_id=p.id and r.request_type='friend' and r.status='pending' limit 1) outgoing on true
  where p.id=profile_id;
  if not found then raise exception using errcode='P0001',message='Spielerprofil nicht gefunden.'; end if;
end;
$$;

revoke all on function public.set_own_avatar_path(text) from public, anon;
grant execute on function public.set_own_avatar_path(text) to authenticated;
revoke all on function public.get_global_leaderboard(integer,bigint,integer,uuid) from public, anon;
revoke all on function public.get_friends() from public, anon;
revoke all on function public.search_profiles(text) from public, anon;
revoke all on function public.get_public_player_profile(uuid) from public, anon;
grant execute on function public.get_global_leaderboard(integer,bigint,integer,uuid) to authenticated;
grant execute on function public.get_friends() to authenticated;
grant execute on function public.search_profiles(text) to authenticated;
grant execute on function public.get_public_player_profile(uuid) to authenticated;

commit;
