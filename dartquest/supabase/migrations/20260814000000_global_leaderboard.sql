begin;

create index if not exists profiles_global_leaderboard_idx
on public.profiles (
  (coalesce(xp, 0)) desc,
  (coalesce(player_level, 1)) desc,
  id asc
)
include (profile_name);

create or replace function public.get_global_leaderboard(
  page_size integer default 50,
  cursor_xp bigint default null,
  cursor_player_level integer default null,
  cursor_id uuid default null
)
returns table (
  id uuid,
  profile_name text,
  xp bigint,
  player_level integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  safe_page_size integer := least(greatest(coalesce(page_size, 50), 1), 51);
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;

  if (cursor_xp is null) <> (cursor_player_level is null)
    or (cursor_xp is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'Ungültiger Ranglisten-Cursor.';
  end if;

  return query
  select
    p.id,
    p.profile_name,
    coalesce(p.xp, 0)::bigint,
    coalesce(p.player_level, 1)::integer
  from public.profiles p
  where cursor_xp is null
    or (
      coalesce(p.xp, 0) < cursor_xp
      or (coalesce(p.xp, 0) = cursor_xp and coalesce(p.player_level, 1) < cursor_player_level)
      or (
        coalesce(p.xp, 0) = cursor_xp
        and coalesce(p.player_level, 1) = cursor_player_level
        and p.id > cursor_id
      )
    )
  order by coalesce(p.xp, 0) desc, coalesce(p.player_level, 1) desc, p.id asc
  limit safe_page_size;
end;
$$;

revoke all on function public.get_global_leaderboard(integer, bigint, integer, uuid)
from public, anon;
grant execute on function public.get_global_leaderboard(integer, bigint, integer, uuid)
to authenticated;

commit;
