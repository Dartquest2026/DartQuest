begin;

-- Accountgebundene Projektion lokaler Bestwerte; vergibt keine Rewards.
create or replace function public.sync_standard_campaign_progress(
  p_difficulty smallint,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  synced_count integer;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;
  if p_difficulty is null or p_difficulty not between 1 and 5
    or p_rows is null or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) > 500 then
    raise exception using errcode = '22023', message = 'Ungültige Kampagnen-Fortschrittsdaten.';
  end if;

  with parsed as (
    select row.level_id, row.stars, row.best_darts, row.first_completed_at
    from jsonb_to_recordset(p_rows) as row (
      level_id integer,
      stars smallint,
      best_darts integer,
      first_completed_at timestamptz
    )
    join private.campaign_level_config as config
      on config.difficulty = p_difficulty
     and config.level_id = row.level_id
     and config.is_enabled
    where row.stars between 1 and 4
      and (row.best_darts is null or row.best_darts > 0)
  ),
  best_rows as (
    select parsed.level_id, max(parsed.stars)::smallint as stars,
      min(parsed.best_darts) as best_darts,
      min(parsed.first_completed_at) as first_completed_at
    from parsed
    group by parsed.level_id
  ),
  synced as (
    insert into public.campaign_progress (
      user_id, difficulty, level_id, stars, best_darts, first_completed_at
    )
    select current_user_id, p_difficulty, best.level_id, best.stars,
      best.best_darts, coalesce(best.first_completed_at, now())
    from best_rows as best
    on conflict (user_id, difficulty, level_id) do update
    set stars = greatest(public.campaign_progress.stars, excluded.stars),
        best_darts = case
          when public.campaign_progress.best_darts is null then excluded.best_darts
          when excluded.best_darts is null then public.campaign_progress.best_darts
          else least(public.campaign_progress.best_darts, excluded.best_darts)
        end,
        first_completed_at = least(public.campaign_progress.first_completed_at, excluded.first_completed_at)
    returning 1
  )
  select count(*)::integer into synced_count from synced;

  return synced_count;
end;
$$;

revoke all on function public.sync_standard_campaign_progress(smallint, jsonb)
from public, anon;
grant execute on function public.sync_standard_campaign_progress(smallint, jsonb)
to authenticated;

do $$
begin
  if has_function_privilege('anon', 'public.sync_standard_campaign_progress(smallint,jsonb)', 'EXECUTE') then
    raise exception 'anon darf Standard-Kampagnenfortschritt nicht synchronisieren.';
  end if;
end;
$$;

commit;
