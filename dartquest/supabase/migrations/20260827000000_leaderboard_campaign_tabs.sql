begin;

-- Checkout- und Rivalenwerte werden absichtlich nicht direkt vom Client geschrieben.
-- Ein spaeterer, validierter Ergebnisprozess darf diese Projektionen pflegen.
create table public.checkout_campaign_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  checkout_level smallint not null,
  stars smallint not null,
  best_darts smallint,
  first_completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, checkout_level),
  constraint checkout_campaign_progress_level_check check (checkout_level between 1 and 169),
  constraint checkout_campaign_progress_stars_check check (stars between 1 and 4),
  constraint checkout_campaign_progress_darts_check check (best_darts is null or best_darts > 0)
);

create table public.rival_campaign_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_levels integer not null default 0,
  best_average numeric(7, 3),
  score_180_count bigint not null default 0,
  score_140_count bigint not null default 0,
  score_100_count bigint not null default 0,
  checkout_darts bigint not null default 0,
  successful_checkouts bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint rival_campaign_stats_levels_check check (completed_levels >= 0),
  constraint rival_campaign_stats_average_check check (best_average is null or best_average between 0 and 180),
  constraint rival_campaign_stats_counters_check check (
    score_180_count >= 0 and score_140_count >= 0 and score_100_count >= 0
    and checkout_darts >= 0 and successful_checkouts >= 0
    and successful_checkouts <= checkout_darts
  )
);

alter table public.checkout_campaign_progress enable row level security;
alter table public.rival_campaign_stats enable row level security;

create policy "checkout_campaign_progress_select_own"
on public.checkout_campaign_progress for select to authenticated
using ((select auth.uid()) = user_id);

create policy "rival_campaign_stats_select_own"
on public.rival_campaign_stats for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.checkout_campaign_progress from public, anon, authenticated;
revoke all on public.rival_campaign_stats from public, anon, authenticated;
grant select on public.checkout_campaign_progress to authenticated;
grant select on public.rival_campaign_stats to authenticated;
grant select, insert, update on public.checkout_campaign_progress to service_role;
grant select, insert, update on public.rival_campaign_stats to service_role;

create or replace function public.get_campaign_leaderboard(
  leaderboard_mode text default 'xp',
  page_size integer default 50,
  page_offset integer default 0
)
returns table (
  rank bigint,
  id uuid,
  profile_name text,
  xp bigint,
  player_level integer,
  avatar_path text,
  completed_levels bigint,
  earned_stars bigint,
  best_average numeric,
  score_180_count bigint,
  score_140_count bigint,
  score_100_count bigint,
  checkout_darts bigint,
  successful_checkouts bigint,
  global_checkout_darts numeric,
  global_successful_checkouts numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  current_user_id uuid := (select auth.uid());
  safe_mode text := lower(coalesce(leaderboard_mode, 'xp'));
  safe_page_size integer := least(greatest(coalesce(page_size, 50), 1), 101);
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;
  if safe_mode not in ('xp', 'standard', 'checkout', 'rivals') then
    raise exception using errcode = '22023', message = 'Ungueltiger Ranglisten-Modus.';
  end if;

  return query
  with standard_best as (
    select progress.user_id, progress.level_id, max(progress.stars)::bigint as stars
    from public.campaign_progress progress
    group by progress.user_id, progress.level_id
  ),
  standard as (
    select progress.user_id, count(*)::bigint as levels, sum(progress.stars)::bigint as stars
    from standard_best progress
    group by progress.user_id
  ),
  checkout as (
    select progress.user_id, count(*)::bigint as levels, sum(progress.stars)::bigint as stars
    from public.checkout_campaign_progress progress
    group by progress.user_id
  ),
  all_players as (
    select p.id, p.profile_name, coalesce(p.xp, 0)::bigint as xp,
      coalesce(p.player_level, 1)::integer as player_level, p.avatar_path,
      case when safe_mode = 'standard' then standard.levels
           when safe_mode = 'checkout' then checkout.levels
           when safe_mode = 'rivals' then rivals.completed_levels::bigint end as completed_levels,
      case when safe_mode = 'standard' then standard.stars
           when safe_mode = 'checkout' then checkout.stars end as earned_stars,
      rivals.best_average, rivals.score_180_count, rivals.score_140_count,
      rivals.score_100_count, rivals.checkout_darts, rivals.successful_checkouts,
      sum(coalesce(rivals.checkout_darts, 0)) over ()::numeric as global_checkout_darts,
      sum(coalesce(rivals.successful_checkouts, 0)) over ()::numeric as global_successful_checkouts
    from public.profiles p
    left join standard on standard.user_id = p.id
    left join checkout on checkout.user_id = p.id
    left join public.rival_campaign_stats rivals on rivals.user_id = p.id
  ),
  ordered as (
    select all_players.*,
      row_number() over (order by
        case when safe_mode = 'xp' then xp end desc nulls last,
        case when safe_mode = 'xp' then player_level end desc nulls last,
        case when safe_mode in ('standard', 'checkout', 'rivals') then completed_levels end desc nulls last,
        case when safe_mode in ('standard', 'checkout') then earned_stars::numeric / nullif(completed_levels * 4, 0) end desc nulls last,
        case when safe_mode in ('standard', 'checkout') then earned_stars end desc nulls last,
        case when safe_mode = 'rivals' then best_average end desc nulls last,
        case when safe_mode = 'rivals' then successful_checkouts::numeric / nullif(checkout_darts, 0) end desc nulls last,
        xp desc, id asc
      ) as calculated_rank
    from all_players
  )
  select ordered.calculated_rank, ordered.id, ordered.profile_name, ordered.xp,
    ordered.player_level, ordered.avatar_path, ordered.completed_levels,
    ordered.earned_stars, ordered.best_average, ordered.score_180_count,
    ordered.score_140_count, ordered.score_100_count, ordered.checkout_darts,
    ordered.successful_checkouts, ordered.global_checkout_darts,
    ordered.global_successful_checkouts
  from ordered
  order by ordered.calculated_rank
  offset safe_offset limit safe_page_size;
end;
$$;

revoke all on function public.get_campaign_leaderboard(text, integer, integer) from public, anon;
grant execute on function public.get_campaign_leaderboard(text, integer, integer) to authenticated;

do $$
begin
  if has_table_privilege('authenticated', 'public.checkout_campaign_progress', 'INSERT')
    or has_table_privilege('authenticated', 'public.checkout_campaign_progress', 'UPDATE')
    or has_table_privilege('authenticated', 'public.rival_campaign_stats', 'INSERT')
    or has_table_privilege('authenticated', 'public.rival_campaign_stats', 'UPDATE') then
    raise exception 'Kampagnen-Ranglistenwerte duerfen nicht direkt vom Client geschrieben werden.';
  end if;
  if has_function_privilege('anon', 'public.get_campaign_leaderboard(text,integer,integer)', 'EXECUTE') then
    raise exception 'anon darf die Kampagnen-Rangliste nicht ausfuehren.';
  end if;
end;
$$;

commit;
