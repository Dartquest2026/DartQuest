begin;

create schema if not exists private;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  invite_code text not null unique check (invite_code ~ '^[0-9]{6}$'),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists groups_owner_id_idx on public.groups (owner_id);
create index if not exists group_members_user_id_idx on public.group_members (user_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create or replace function private.is_group_member(requested_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = requested_group_id
      and gm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_group_owner(requested_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = requested_group_id
      and g.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.is_group_member(uuid) from public, anon;
revoke all on function private.is_group_owner(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.is_group_owner(uuid) to authenticated;

create policy "groups_select_owner_or_member"
on public.groups for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_group_member(id))
);

create policy "groups_update_owner"
on public.groups for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "groups_delete_owner"
on public.groups for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "group_members_select_group_participants"
on public.group_members for select to authenticated
using (
  (select private.is_group_owner(group_id))
  or (select private.is_group_member(group_id))
);

create policy "group_members_delete_self_or_owner"
on public.group_members for delete to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_group_owner(group_id))
);

create or replace function public.create_group(group_name text)
returns table (
  id uuid,
  name text,
  invite_code text,
  owner_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  clean_name text := pg_catalog.btrim(group_name);
  generated_code text;
  created_group public.groups%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;

  if clean_name is null or pg_catalog.char_length(clean_name) not between 2 and 60 then
    raise exception using errcode = '22023', message = 'Der Gruppenname muss zwischen 2 und 60 Zeichen lang sein.';
  end if;

  if (
    select pg_catalog.count(*)
    from public.group_members gm
    where gm.user_id = current_user_id
  ) >= 5 then
    raise exception using errcode = 'P0001', message = 'Du kannst maximal 5 Gruppen haben.';
  end if;

  for attempt in 1..32 loop
    generated_code := pg_catalog.lpad(
      pg_catalog.floor(pg_catalog.random() * 1000000)::integer::text,
      6,
      '0'
    );

    begin
      insert into public.groups (name, invite_code, owner_id)
      values (clean_name, generated_code, current_user_id)
      returning * into created_group;
      exit;
    exception
      when unique_violation then
        created_group.id := null;
    end;
  end loop;

  if created_group.id is null then
    raise exception using errcode = 'P0001', message = 'Es konnte kein freier Gruppencode erzeugt werden.';
  end if;

  insert into public.group_members (group_id, user_id)
  values (created_group.id, current_user_id);

  return query
  select
    created_group.id,
    created_group.name,
    created_group.invite_code,
    created_group.owner_id,
    created_group.created_at;
end;
$$;

create or replace function public.join_group_by_invite_code(code text)
returns table (
  id uuid,
  name text,
  invite_code text,
  owner_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested_group public.groups%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;

  if code is null or code !~ '^[0-9]{6}$' then
    raise exception using errcode = '22023', message = 'Der Gruppencode muss aus exakt 6 Ziffern bestehen.';
  end if;

  select g.*
  into requested_group
  from public.groups g
  where g.invite_code = code;

  if requested_group.id is null then
    raise exception using errcode = 'P0001', message = 'Keine Gruppe mit diesem Code gefunden.';
  end if;

  if exists (
    select 1
    from public.group_members gm
    where gm.group_id = requested_group.id
      and gm.user_id = current_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'Du bist bereits Mitglied dieser Gruppe.';
  end if;

  if (
    select pg_catalog.count(*)
    from public.group_members gm
    where gm.user_id = current_user_id
  ) >= 5 then
    raise exception using errcode = 'P0001', message = 'Du kannst maximal 5 Gruppen haben.';
  end if;

  insert into public.group_members (group_id, user_id)
  values (requested_group.id, current_user_id);

  return query
  select
    requested_group.id,
    requested_group.name,
    requested_group.invite_code,
    requested_group.owner_id,
    requested_group.created_at;
end;
$$;

revoke all on function public.create_group(text) from public, anon;
revoke all on function public.join_group_by_invite_code(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_invite_code(text) to authenticated;

-- Existing profile RLS stays active. This policy only exposes profiles to users
-- who share a group; it does not publish the complete profiles table.
create policy "profiles_select_shared_group_members"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.group_members target_membership
    join public.group_members caller_membership
      on caller_membership.group_id = target_membership.group_id
    where target_membership.user_id = profiles.id
      and caller_membership.user_id = (select auth.uid())
  )
);

revoke insert on public.groups from authenticated;
revoke insert on public.group_members from authenticated;
grant select, update, delete on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;

commit;
