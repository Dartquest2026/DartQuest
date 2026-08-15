begin;

create schema if not exists private;

create table public.campaign_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty smallint not null,
  level_id integer not null,
  stars smallint not null,
  best_darts integer,
  first_completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, difficulty, level_id),
  constraint campaign_progress_difficulty_check check (difficulty between 1 and 5),
  constraint campaign_progress_level_id_check check (level_id > 0),
  constraint campaign_progress_stars_check check (stars between 1 and 4),
  constraint campaign_progress_best_darts_check check (best_darts is null or best_darts > 0)
);

alter table public.campaign_progress enable row level security;

create policy "campaign_progress_select_own"
on public.campaign_progress for select to authenticated
using (user_id = (select auth.uid()));

revoke all on public.campaign_progress from public, anon, authenticated;
grant select on public.campaign_progress to authenticated;
revoke insert, update, delete on public.campaign_progress from authenticated;

create or replace function private.set_campaign_progress_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_campaign_progress_updated_at() from public, anon, authenticated;

create trigger campaign_progress_set_updated_at
before update on public.campaign_progress
for each row execute function private.set_campaign_progress_updated_at();

-- Diese Tabelle ist für Clients weder sichtbar noch beschreibbar. Das Vorhandensein
-- einer aktivierten Zeile definiert zugleich, ob ein Level grundsätzlich zulässig ist.
create table private.campaign_level_config (
  difficulty smallint not null,
  level_id integer not null,
  reward_xp bigint not null,
  reward_coins bigint not null,
  is_boss boolean not null,
  required_world_stars smallint,
  is_enabled boolean not null default true,
  primary key (difficulty, level_id),
  constraint campaign_level_config_difficulty_check check (difficulty between 1 and 5),
  constraint campaign_level_config_level_check check (level_id between 1 and 100),
  constraint campaign_level_config_xp_check check (reward_xp between 0 and 1000),
  constraint campaign_level_config_coins_check check (reward_coins between 0 and 500),
  constraint campaign_level_config_boss_check check (
    (is_boss and level_id % 10 = 0 and required_world_stars between 0 and 36)
    or
    (not is_boss and level_id % 10 <> 0 and required_world_stars is null)
  )
);

revoke all on private.campaign_level_config from public, anon, authenticated;

-- Zentrale, serverseitige Reward-Konfiguration. Dieser Snapshot wird durch
-- `npm run verify:campaign-rewards` bytegenau gegen alle 500 Leveldefinitionen geprüft.
-- CAMPAIGN_REWARDS_JSON_BEGIN
with reward_snapshot as (
  select $campaign_rewards${"1":{"xp":[20,20,20,20,20,20,20,20,25,80,22,22,25,25,25,25,25,28,28,90,30,30,30,30,30,32,32,35,35,100,35,35,35,38,38,42,42,45,48,110,40,40,40,40,42,45,45,48,50,120,45,45,48,48,50,52,55,55,58,140,55,55,55,58,58,60,60,65,65,150,60,60,60,65,65,68,70,70,72,170,70,70,70,75,75,75,78,78,80,190,80,80,82,82,85,85,90,90,100,250],"coins":[10,10,10,10,10,10,10,10,12,50,11,11,12,12,12,12,12,14,14,55,15,15,15,15,15,16,16,18,18,60,18,18,18,19,19,21,21,22,24,65,20,20,20,20,21,22,22,24,25,70,22,22,24,24,25,26,28,28,29,80,28,28,28,29,29,30,30,32,32,90,30,30,30,32,32,34,35,35,36,100,35,35,35,38,38,38,39,39,40,110,40,40,41,41,42,42,45,45,50,150],"boss":[10,20,30,40,50,60,70,80,90,100],"bossStars":9},"2":{"xp":[20,20,20,20,20,20,20,20,25,80,22,22,25,25,25,25,25,28,28,90,30,30,30,30,30,32,32,35,35,100,35,35,35,38,38,42,42,45,48,110,40,40,40,40,42,45,45,48,50,120,45,45,48,48,50,52,55,55,58,140,55,55,55,58,58,60,60,65,65,150,60,60,60,65,65,68,70,70,72,170,70,70,70,75,75,75,78,78,80,190,80,80,82,82,85,85,90,90,100,250],"coins":[10,10,10,10,10,10,10,10,12,50,11,11,12,12,12,12,12,14,14,55,15,15,15,15,15,16,16,18,18,60,18,18,18,19,19,21,21,22,24,65,20,20,20,20,21,22,22,24,25,70,22,22,24,24,25,26,28,28,29,80,28,28,28,29,29,30,30,32,32,90,30,30,30,32,32,34,35,35,36,100,35,35,35,38,38,38,39,39,40,110,40,40,41,41,42,42,45,45,50,150],"boss":[10,20,30,40,50,60,70,80,90,100],"bossStars":15},"3":{"xp":[35,35,35,40,40,40,40,40,45,120,45,45,45,45,45,50,50,55,55,140,50,50,50,50,50,60,60,65,70,160,55,55,60,65,70,70,75,80,85,180,65,65,65,70,70,70,75,75,80,200,70,70,70,75,75,80,80,85,90,220,80,80,85,85,90,90,95,95,100,240,85,90,90,95,95,100,100,105,110,260,95,100,100,105,105,110,115,115,120,280,110,115,120,120,125,125,130,135,150,400],"coins":[15,15,15,18,18,18,18,18,20,60,20,20,20,20,20,25,25,27,27,70,25,25,25,25,25,30,30,32,35,80,28,28,30,32,35,35,38,40,42,90,32,32,32,35,35,35,38,38,40,100,35,35,35,38,38,40,40,42,45,110,40,40,42,42,45,45,48,48,50,120,42,45,45,48,48,50,50,52,55,130,48,50,50,52,52,55,58,58,60,140,55,58,60,60,62,62,65,68,75,220],"boss":[10,20,30,40,50,60,70,80,90,100],"bossStars":20},"4":{"xp":[50,50,50,55,55,60,60,60,65,180,60,65,70,75,80,85,90,95,100,220,70,70,70,75,75,75,80,80,90,240,80,80,85,85,90,90,95,95,100,260,90,90,95,95,100,100,105,105,110,280,90,90,95,100,100,100,105,110,115,300,100,100,100,105,110,110,120,125,130,320,110,115,120,120,125,125,130,135,140,350,120,130,130,135,150,140,145,150,160,400,140,140,145,145,150,150,160,165,180,500],"coins":[25,25,25,28,28,30,30,30,32,90,30,32,35,38,40,42,45,48,50,110,35,35,35,38,38,38,40,40,45,120,40,40,42,42,45,45,48,48,50,130,45,45,48,48,50,50,52,52,55,140,45,45,48,50,50,50,52,55,58,150,50,50,50,52,55,55,60,62,65,160,55,58,60,60,62,62,65,68,70,175,60,65,65,68,75,70,72,75,80,200,70,70,72,72,75,75,80,82,90,300],"boss":[10,20,30,40,50,60,70,80,90,100],"bossStars":25},"5":{"xp":[70,70,70,75,75,80,90,90,95,250,80,80,80,85,85,90,90,95,95,280,85,90,95,100,105,110,115,120,130,320,95,95,100,100,105,105,110,110,115,340,105,105,110,110,115,115,120,120,125,380,115,115,120,120,125,125,130,130,140,420,120,125,130,130,135,140,145,150,155,450,130,135,150,145,150,155,160,170,190,500,150,155,160,180,150,155,160,170,200,600,180,180,180,190,200,220,220,250,300,1000],"coins":[35,35,35,38,38,40,45,45,48,125,40,40,40,42,42,45,45,48,48,140,42,45,48,50,52,55,58,60,65,160,48,48,50,50,52,52,55,55,58,170,52,52,55,55,58,58,60,60,62,190,58,58,60,60,62,62,65,65,70,210,60,62,65,65,68,70,72,75,78,225,65,68,75,72,75,78,80,85,95,250,75,78,80,90,75,78,80,85,100,300,90,90,90,95,100,110,110,125,150,500],"boss":[10,20,30,40,50,60,70,80,90,100],"bossStars":25}}$campaign_rewards$::jsonb as data
),
reward_source as (
  select difficulty.key::smallint as difficulty,
    xp.ordinality::integer as level_id,
    xp.value::bigint as reward_xp,
    coins.value::bigint as reward_coins,
    (xp.ordinality::integer in (
      select jsonb_array_elements_text(difficulty.value -> 'boss')::integer
    )) as is_boss,
    case when xp.ordinality::integer in (
      select jsonb_array_elements_text(difficulty.value -> 'boss')::integer
    ) then (difficulty.value ->> 'bossStars')::smallint else null end
      as required_world_stars
  from reward_snapshot
  cross join lateral jsonb_each(reward_snapshot.data) as difficulty(key, value)
  cross join lateral jsonb_array_elements_text(difficulty.value -> 'xp')
    with ordinality as xp(value, ordinality)
  join lateral jsonb_array_elements_text(difficulty.value -> 'coins')
    with ordinality as coins(value, ordinality)
    on coins.ordinality = xp.ordinality
)
insert into private.campaign_level_config (
  difficulty, level_id, reward_xp, reward_coins, is_boss, required_world_stars
)
select reward.difficulty, reward.level_id, reward.reward_xp,
  reward.reward_coins, reward.is_boss, reward.required_world_stars
from reward_source as reward;
-- CAMPAIGN_REWARDS_JSON_END

-- Eine Completion-ID macht technische Retries idempotent. Die zusätzliche
-- Reward-State-Tabelle macht auch neue IDs für dasselbe Level unvergütet.
create table private.campaign_completion_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  completion_id uuid not null,
  difficulty smallint not null,
  level_id integer not null,
  awarded_xp bigint not null check (awarded_xp between 0 and 1000),
  awarded_coins bigint not null check (awarded_coins between 0 and 500),
  created_at timestamptz not null default now(),
  primary key (user_id, completion_id),
  foreign key (difficulty, level_id)
    references private.campaign_level_config(difficulty, level_id)
);

create table private.campaign_level_reward_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty smallint not null,
  level_id integer not null,
  xp_awarded boolean not null default false,
  highest_coin_stars smallint not null check (highest_coin_stars between 1 and 4),
  updated_at timestamptz not null default now(),
  primary key (user_id, difficulty, level_id),
  foreign key (difficulty, level_id)
    references private.campaign_level_config(difficulty, level_id)
);

create table private.campaign_progress_imports (
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty smallint not null check (difficulty between 1 and 5),
  imported_at timestamptz not null default now(),
  primary key (user_id, difficulty)
);

revoke all on private.campaign_completion_events from public, anon, authenticated;
revoke all on private.campaign_level_reward_state from public, anon, authenticated;
revoke all on private.campaign_progress_imports from public, anon, authenticated;

-- Serverseitig abgeleitete Rewards verhindern frei wählbare Beträge und Mehrfachvergütung.
-- Vollständiger Cheat-Schutz erfordert jedoch serverseitig verifizierte Spielresultate.
create or replace function public.complete_campaign_level(
  p_completion_id uuid,
  p_difficulty smallint,
  p_level_id integer,
  p_stars smallint,
  p_best_darts integer
)
returns table (
  progress_user_id uuid,
  progress_difficulty smallint,
  progress_level_id integer,
  progress_stars smallint,
  progress_best_darts integer,
  progress_first_completed_at timestamptz,
  progress_updated_at timestamptz,
  profile_xp bigint,
  profile_coins bigint,
  profile_player_level bigint,
  reward_applied boolean,
  awarded_xp bigint,
  awarded_coins bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  configured_xp bigint;
  configured_coins bigint;
  configured_is_boss boolean;
  configured_required_stars smallint;
  previous_stars smallint;
  prior_xp_awarded boolean;
  xp_to_award bigint := 0;
  coins_to_award bigint := 0;
  current_xp bigint;
  current_coins bigint;
  current_player_level bigint;
  event_insert_count integer;
  predecessor_count integer;
  world_normal_count integer;
  world_star_count integer;
  event_difficulty smallint;
  event_level_id integer;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;

  if p_completion_id is null
    or p_difficulty is null
    or p_level_id is null
    or p_stars is null or p_stars not between 1 and 4
    or (p_best_darts is not null and p_best_darts <= 0) then
    raise exception using errcode = '22023', message = 'Ungültige Kampagnen-Abschlussdaten.';
  end if;

  select config.reward_xp, config.reward_coins, config.is_boss, config.required_world_stars
  into configured_xp, configured_coins, configured_is_boss, configured_required_stars
  from private.campaign_level_config as config
  where config.difficulty = p_difficulty
    and config.level_id = p_level_id
    and config.is_enabled;

  if not found then
    raise exception using errcode = '22023', message = 'Unbekanntes oder deaktiviertes Kampagnenlevel.';
  end if;

  select coalesce(profile.xp, 0), coalesce(profile.coins, 0), coalesce(profile.player_level, 1)
  into current_xp, current_coins, current_player_level
  from public.profiles as profile
  where profile.id = current_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profil nicht gefunden.';
  end if;

  select progress.stars
  into previous_stars
  from public.campaign_progress as progress
  where progress.user_id = current_user_id
    and progress.difficulty = p_difficulty
    and progress.level_id = p_level_id
  for update;

  -- Bereits abgeschlossene Level dürfen zur Bestwertverbesserung wiederholt werden.
  -- Für einen Erstabschluss wird die Freischaltung ausschließlich aus Serverdaten geprüft.
  if previous_stars is null and p_level_id > 1 then
    if configured_is_boss then
      select count(*), coalesce(sum(progress.stars), 0)
      into world_normal_count, world_star_count
      from public.campaign_progress as progress
      join private.campaign_level_config as normal_config
        on normal_config.difficulty = progress.difficulty
       and normal_config.level_id = progress.level_id
       and normal_config.is_enabled
       and not normal_config.is_boss
      where progress.user_id = current_user_id
        and progress.difficulty = p_difficulty
        and progress.level_id between p_level_id - 9 and p_level_id - 1;

      if world_normal_count <> 9 or world_star_count < configured_required_stars then
        raise exception using errcode = '42501', message = 'Dieses Boss-Level ist noch gesperrt.';
      end if;
    else
      select count(*)
      into predecessor_count
      from public.campaign_progress as progress
      where progress.user_id = current_user_id
        and progress.difficulty = p_difficulty
        and progress.level_id = p_level_id - 1;

      if predecessor_count = 0 then
        raise exception using errcode = '42501', message = 'Dieses Level ist noch gesperrt.';
      end if;
    end if;
  end if;

  insert into private.campaign_completion_events (
    user_id, completion_id, difficulty, level_id, awarded_xp, awarded_coins
  ) values (
    current_user_id, p_completion_id, p_difficulty, p_level_id, 0, 0
  )
  on conflict (user_id, completion_id) do nothing;

  get diagnostics event_insert_count = row_count;

  if event_insert_count = 0 then
    select event.difficulty, event.level_id, event.awarded_xp, event.awarded_coins
    into event_difficulty, event_level_id, xp_to_award, coins_to_award
    from private.campaign_completion_events as event
    where event.user_id = current_user_id
      and event.completion_id = p_completion_id;

    if event_difficulty <> p_difficulty or event_level_id <> p_level_id then
      raise exception using errcode = '22023', message = 'Completion-ID wurde bereits für ein anderes Level verwendet.';
    end if;
  else
    select state.xp_awarded
    into prior_xp_awarded
    from private.campaign_level_reward_state as state
    where state.user_id = current_user_id
      and state.difficulty = p_difficulty
      and state.level_id = p_level_id
    for update;

    if not coalesce(prior_xp_awarded, false) then
      xp_to_award := configured_xp;
    end if;

    if previous_stars is null or p_stars > previous_stars then
      coins_to_award := configured_coins;
    end if;

    insert into public.campaign_progress (
      user_id, difficulty, level_id, stars, best_darts
    ) values (
      current_user_id, p_difficulty, p_level_id, p_stars, p_best_darts
    )
    on conflict (user_id, difficulty, level_id) do update
    set stars = greatest(public.campaign_progress.stars, excluded.stars),
        best_darts = case
          when public.campaign_progress.best_darts is null then excluded.best_darts
          when excluded.best_darts is null then public.campaign_progress.best_darts
          else least(public.campaign_progress.best_darts, excluded.best_darts)
        end;

    insert into private.campaign_level_reward_state (
      user_id, difficulty, level_id, xp_awarded, highest_coin_stars
    ) values (
      current_user_id, p_difficulty, p_level_id, true, p_stars
    )
    on conflict (user_id, difficulty, level_id) do update
    set xp_awarded = private.campaign_level_reward_state.xp_awarded or excluded.xp_awarded,
        highest_coin_stars = greatest(
          private.campaign_level_reward_state.highest_coin_stars,
          excluded.highest_coin_stars
        ),
        updated_at = now();

    update private.campaign_completion_events as event
    set awarded_xp = xp_to_award,
        awarded_coins = coins_to_award
    where event.user_id = current_user_id
      and event.completion_id = p_completion_id;

    update public.profiles as profile
    set xp = coalesce(profile.xp, 0) + xp_to_award,
        coins = coalesce(profile.coins, 0) + coins_to_award,
        player_level = floor((coalesce(profile.xp, 0) + xp_to_award) / 500.0)::bigint + 1
    where profile.id = current_user_id
    returning profile.xp, profile.coins, profile.player_level
    into current_xp, current_coins, current_player_level;
  end if;

  return query
  select
    progress.user_id,
    progress.difficulty,
    progress.level_id,
    progress.stars,
    progress.best_darts,
    progress.first_completed_at,
    progress.updated_at,
    current_xp,
    current_coins,
    current_player_level,
    xp_to_award > 0 or coins_to_award > 0,
    xp_to_award,
    coins_to_award
  from public.campaign_progress as progress
  where progress.user_id = current_user_id
    and progress.difficulty = p_difficulty
    and progress.level_id = p_level_id;
end;
$$;

revoke all on function public.complete_campaign_level(uuid, smallint, integer, smallint, integer)
from public, anon;
grant execute on function public.complete_campaign_level(uuid, smallint, integer, smallint, integer)
to authenticated;

-- Der Profil-Reset setzt XP und Coins weiterhin separat über den bestehenden
-- Profilpfad zurück. Diese RPC löscht ausschließlich den Campaign-Bereich atomar.
create or replace function public.reset_own_campaign_progress(
  p_difficulty smallint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentifizierung erforderlich.';
  end if;

  if p_difficulty is not null and p_difficulty not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Ungültiger Schwierigkeitsgrad.';
  end if;

  delete from private.campaign_completion_events as event
  where event.user_id = current_user_id
    and (p_difficulty is null or event.difficulty = p_difficulty);

  delete from private.campaign_level_reward_state as state
  where state.user_id = current_user_id
    and (p_difficulty is null or state.difficulty = p_difficulty);

  delete from private.campaign_progress_imports as import_marker
  where import_marker.user_id = current_user_id
    and (p_difficulty is null or import_marker.difficulty = p_difficulty);

  delete from public.campaign_progress as progress
  where progress.user_id = current_user_id
    and (p_difficulty is null or progress.difficulty = p_difficulty);
end;
$$;

revoke all on function public.reset_own_campaign_progress(smallint)
from public, anon;
grant execute on function public.reset_own_campaign_progress(smallint)
to authenticated;

-- Nur für einen vertrauenswürdigen Backend-/Admin-Prozess (service_role).
-- Pro User und Schwierigkeit ist genau ein Import möglich. Er vergibt nie Rewards;
-- importierte Level werden gleichzeitig als bereits vergütet markiert.
create or replace function private.import_campaign_progress(
  p_user_id uuid,
  p_difficulty smallint,
  p_rows jsonb
)
returns setof public.campaign_progress
language plpgsql
set search_path = ''
as $$
declare
  import_marker_count integer;
begin
  if p_user_id is null
    or p_difficulty is null or p_difficulty not between 1 and 5
    or p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'Ungültige Importdaten.';
  end if;

  insert into private.campaign_progress_imports (user_id, difficulty)
  values (p_user_id, p_difficulty)
  on conflict (user_id, difficulty) do nothing;

  get diagnostics import_marker_count = row_count;
  if import_marker_count = 0 then
    raise exception using errcode = '23505', message = 'Kampagnenfortschritt wurde bereits importiert.';
  end if;

  with valid_rows as (
    select
      imported.level_id,
      imported.stars,
      imported.best_darts,
      coalesce(imported.first_completed_at, now()) as first_completed_at
    from jsonb_to_recordset(p_rows) as imported (
      level_id integer,
      stars smallint,
      best_darts integer,
      first_completed_at timestamptz
    )
    join private.campaign_level_config as config
      on config.difficulty = p_difficulty
     and config.level_id = imported.level_id
     and config.is_enabled
    where imported.stars between 1 and 4
      and (imported.best_darts is null or imported.best_darts > 0)
  ),
  merged as (
    insert into public.campaign_progress (
      user_id, difficulty, level_id, stars, best_darts, first_completed_at
    )
    select
      p_user_id, p_difficulty, row.level_id, row.stars, row.best_darts, row.first_completed_at
    from valid_rows as row
    on conflict (user_id, difficulty, level_id) do update
    set stars = greatest(public.campaign_progress.stars, excluded.stars),
        best_darts = case
          when public.campaign_progress.best_darts is null then excluded.best_darts
          when excluded.best_darts is null then public.campaign_progress.best_darts
          else least(public.campaign_progress.best_darts, excluded.best_darts)
        end,
        first_completed_at = least(
          public.campaign_progress.first_completed_at,
          excluded.first_completed_at
        )
    returning level_id, stars
  )
  insert into private.campaign_level_reward_state (
    user_id, difficulty, level_id, xp_awarded, highest_coin_stars
  )
  select p_user_id, p_difficulty, merged.level_id, true, merged.stars
  from merged
  on conflict (user_id, difficulty, level_id) do update
  set xp_awarded = true,
      highest_coin_stars = greatest(
        private.campaign_level_reward_state.highest_coin_stars,
        excluded.highest_coin_stars
      ),
      updated_at = now();

  return query
  select progress.*
  from public.campaign_progress as progress
  where progress.user_id = p_user_id
    and progress.difficulty = p_difficulty
  order by progress.level_id;
end;
$$;

revoke all on function private.import_campaign_progress(uuid, smallint, jsonb)
from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.campaign_level_config to service_role;
grant select, insert on private.campaign_progress_imports to service_role;
grant select, insert, update on private.campaign_level_reward_state to service_role;
grant select, insert, update on public.campaign_progress to service_role;
grant execute on function private.import_campaign_progress(uuid, smallint, jsonb)
to service_role;

-- Strukturelle Sicherheitsprüfungen, die bereits beim Anwenden der Migration
-- fehlschlagen, falls die Privilegien oder Serverkonfiguration abweichen.
do $$
begin
  if (select count(*) from private.campaign_level_config) <> 500 then
    raise exception 'Reward-Konfiguration muss genau 500 Level enthalten.';
  end if;

  if has_table_privilege('authenticated', 'public.campaign_progress', 'INSERT')
    or has_table_privilege('authenticated', 'public.campaign_progress', 'UPDATE')
    or has_table_privilege('authenticated', 'public.campaign_progress', 'DELETE') then
    raise exception 'authenticated darf campaign_progress nicht verändern.';
  end if;

  if not has_table_privilege('authenticated', 'public.campaign_progress', 'SELECT') then
    raise exception 'authenticated benötigt SELECT auf campaign_progress.';
  end if;

  if has_function_privilege(
    'anon',
    'public.complete_campaign_level(uuid,smallint,integer,smallint,integer)',
    'EXECUTE'
  ) then
    raise exception 'anon darf complete_campaign_level nicht ausführen.';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.import_campaign_progress(uuid,smallint,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'authenticated darf den Import nicht ausführen.';
  end if;

  if has_function_privilege(
    'anon',
    'public.reset_own_campaign_progress(smallint)',
    'EXECUTE'
  ) then
    raise exception 'anon darf reset_own_campaign_progress nicht ausführen.';
  end if;
end;
$$;

-- Sicherheitstest-Matrix für die lokale/CI-Supabase-Testinstanz:
-- 1. RPC-Aufruf mit p_reward_xp oder p_reward_coins scheitert wegen unbekannter Parameter.
-- 2. Neue completion_id für dasselbe (User, Schwierigkeit, Level) erhöht XP nicht erneut.
-- 3. INSERT/UPDATE/DELETE auf public.campaign_progress als authenticated schlagen fehl.
-- 4. Erstabschluss ohne Vorgänger bzw. ohne Boss-Sterneanforderung wird abgelehnt.
-- 5. Sterne steigen nur via greatest(); best_darts sinkt nur via least() und wird nie null.
-- 6. anon kann weder complete_campaign_level noch den privaten Import ausführen.
-- 7. User A kann wegen RLS keine Fortschrittsdaten von User B lesen; direkte Änderungen
--    sind für beide User vollständig entzogen.
-- 8. Import verändert public.profiles nicht und markiert importierte Level als vergütet.
-- 9. Nach Anwendung Supabase Database Advisors ausführen; kein kritischer Befund zulässig.

commit;

