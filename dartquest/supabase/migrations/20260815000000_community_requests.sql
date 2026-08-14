begin;

create table public.community_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null,
  group_id uuid references public.groups(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint community_requests_different_users check (sender_id <> receiver_id),
  constraint community_requests_type_check check (request_type in ('friend', 'group_invite')),
  constraint community_requests_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  constraint community_requests_group_shape_check check (
    (request_type = 'friend' and group_id is null)
    or (request_type = 'group_invite' and group_id is not null)
  )
);

create table public.friendships (
  user_id_a uuid not null references public.profiles(id) on delete cascade,
  user_id_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id_a, user_id_b),
  constraint friendships_normalized_users check (user_id_a < user_id_b)
);

create index community_requests_receiver_pending_idx
on public.community_requests (receiver_id, created_at desc)
where status = 'pending';

create index community_requests_sender_id_idx on public.community_requests (sender_id);
create index community_requests_group_id_idx on public.community_requests (group_id) where group_id is not null;
create index friendships_user_id_b_idx on public.friendships (user_id_b);

create unique index community_requests_unique_pending_friend_idx
on public.community_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
where request_type = 'friend' and status = 'pending';

create unique index community_requests_unique_pending_group_invite_idx
on public.community_requests (group_id, receiver_id)
where request_type = 'group_invite' and status = 'pending';

alter table public.community_requests enable row level security;
alter table public.friendships enable row level security;

create policy "community_requests_select_participant"
on public.community_requests for select to authenticated
using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));

create policy "friendships_select_participant"
on public.friendships for select to authenticated
using (user_id_a = (select auth.uid()) or user_id_b = (select auth.uid()));

revoke all on public.community_requests from public, anon, authenticated;
revoke all on public.friendships from public, anon, authenticated;
grant select on public.community_requests, public.friendships to authenticated;

create or replace function public.send_friend_request(receiver_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_request_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;
  if receiver_profile_id is null or receiver_profile_id = current_user_id then
    raise exception using errcode = '22023', message = 'Du kannst dir selbst keine Freundschaftsanfrage senden.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = receiver_profile_id) then
    raise exception using errcode = 'P0001', message = 'Spieler nicht gefunden.';
  end if;
  if exists (
    select 1 from public.friendships f
    where f.user_id_a = least(current_user_id, receiver_profile_id)
      and f.user_id_b = greatest(current_user_id, receiver_profile_id)
  ) then
    raise exception using errcode = 'P0001', message = 'Ihr seid bereits Freunde.';
  end if;

  begin
    insert into public.community_requests (sender_id, receiver_id, request_type)
    values (current_user_id, receiver_profile_id, 'friend')
    returning id into created_request_id;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'Freundschaftsanfrage bereits gesendet.';
  end;
  return created_request_id;
end;
$$;

create or replace function public.respond_friend_request(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested public.community_requests%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;
  select r.* into requested from public.community_requests r
  where r.id = request_id for update;
  if requested.id is null or requested.request_type <> 'friend' or requested.receiver_id <> current_user_id then
    raise exception using errcode = '42501', message = 'Anfrage nicht gefunden oder nicht erlaubt.';
  end if;
  if requested.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'Diese Anfrage wurde bereits beantwortet.';
  end if;
  if coalesce(accept, false) then
    insert into public.friendships (user_id_a, user_id_b)
    values (least(requested.sender_id, requested.receiver_id), greatest(requested.sender_id, requested.receiver_id))
    on conflict do nothing;
  end if;
  update public.community_requests
  set status = case when coalesce(accept, false) then 'accepted' else 'declined' end,
      responded_at = now()
  where id = requested.id;
end;
$$;

create or replace function public.send_group_invite(group_id uuid, receiver_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_request_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;
  if receiver_profile_id is null or receiver_profile_id = current_user_id then
    raise exception using errcode = '22023', message = 'Du kannst dich nicht selbst einladen.';
  end if;
  if not exists (select 1 from public.groups g where g.id = group_id and g.owner_id = current_user_id) then
    raise exception using errcode = '42501', message = 'Nur der Owner darf Spieler einladen.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = receiver_profile_id) then
    raise exception using errcode = 'P0001', message = 'Spieler nicht gefunden.';
  end if;
  if exists (select 1 from public.group_members gm where gm.group_id = send_group_invite.group_id and gm.user_id = receiver_profile_id) then
    raise exception using errcode = 'P0001', message = 'Dieser Spieler ist bereits Mitglied der Gruppe.';
  end if;
  begin
    insert into public.community_requests (sender_id, receiver_id, request_type, group_id)
    values (current_user_id, receiver_profile_id, 'group_invite', group_id)
    returning id into created_request_id;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'Gruppeneinladung bereits gesendet.';
  end;
  return created_request_id;
end;
$$;

create or replace function public.respond_group_invite(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested public.community_requests%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;
  select r.* into requested from public.community_requests r
  where r.id = request_id for update;
  if requested.id is null or requested.request_type <> 'group_invite' or requested.receiver_id <> current_user_id then
    raise exception using errcode = '42501', message = 'Anfrage nicht gefunden oder nicht erlaubt.';
  end if;
  if requested.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'Diese Anfrage wurde bereits beantwortet.';
  end if;
  if coalesce(accept, false) then
    if (select count(*) from public.group_members gm where gm.user_id = current_user_id) >= 5 then
      raise exception using errcode = 'P0001', message = 'Du kannst maximal 5 Gruppen haben.';
    end if;
    insert into public.group_members (group_id, user_id)
    values (requested.group_id, current_user_id)
    on conflict do nothing;
  end if;
  update public.community_requests
  set status = case when coalesce(accept, false) then 'accepted' else 'declined' end,
      responded_at = now()
  where id = requested.id;
end;
$$;

create or replace function public.get_pending_requests()
returns table (id uuid, request_type text, sender_id uuid, sender_name text, group_id uuid, group_name text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.request_type, r.sender_id, p.profile_name, r.group_id, g.name, r.created_at
  from public.community_requests r
  join public.profiles p on p.id = r.sender_id
  left join public.groups g on g.id = r.group_id
  where r.receiver_id = (select auth.uid()) and r.status = 'pending'
  order by r.created_at desc;
$$;

create or replace function public.get_pending_request_count()
returns bigint language sql stable security definer set search_path = ''
as $$ select count(*) from public.community_requests r where r.receiver_id = (select auth.uid()) and r.status = 'pending' $$;

create or replace function public.get_friends()
returns table (id uuid, profile_name text, xp bigint, player_level integer)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.profile_name, coalesce(p.xp, 0)::bigint, coalesce(p.player_level, 1)::integer
  from public.friendships f
  join public.profiles p on p.id = case when f.user_id_a = (select auth.uid()) then f.user_id_b else f.user_id_a end
  where f.user_id_a = (select auth.uid()) or f.user_id_b = (select auth.uid())
  order by p.profile_name;
$$;

create or replace function public.search_profiles(search_text text)
returns table (id uuid, profile_name text, xp bigint, player_level integer)
language plpgsql stable security definer set search_path = ''
as $$
declare clean_search text := pg_catalog.btrim(coalesce(search_text, ''));
begin
  if (select auth.uid()) is null then raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.'; end if;
  if pg_catalog.char_length(clean_search) < 2 then return; end if;
  return query select p.id, p.profile_name, coalesce(p.xp, 0)::bigint, coalesce(p.player_level, 1)::integer
  from public.profiles p
  where p.id <> (select auth.uid()) and p.profile_name ilike '%' || clean_search || '%'
  order by p.profile_name limit 20;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.send_group_invite(uuid, uuid) from public, anon;
revoke all on function public.respond_group_invite(uuid, boolean) from public, anon;
revoke all on function public.get_pending_requests() from public, anon;
revoke all on function public.get_pending_request_count() from public, anon;
revoke all on function public.get_friends() from public, anon;
revoke all on function public.search_profiles(text) from public, anon;

grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.send_group_invite(uuid, uuid) to authenticated;
grant execute on function public.respond_group_invite(uuid, boolean) to authenticated;
grant execute on function public.get_pending_requests() to authenticated;
grant execute on function public.get_pending_request_count() to authenticated;
grant execute on function public.get_friends() to authenticated;
grant execute on function public.search_profiles(text) to authenticated;

commit;
