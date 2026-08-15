import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../supabase/migrations/20260818000000_campaign_progress.sql', import.meta.url), 'utf8')
const storage = await readFile(new URL('../src/features/campaign/campaignStorage.js', import.meta.url), 'utf8')
const campaign = await readFile(new URL('../src/features/campaign/Campaign.jsx', import.meta.url), 'utf8')

test('Client sends only the five allowed completion parameters', () => {
  const rpcCall = storage.match(/supabase\.rpc\('complete_campaign_level',\s*\{([\s\S]*?)\}\)/)
  assert.ok(rpcCall)
  const parameters = [...rpcCall[1].matchAll(/\b(p_[a-z_]+)\s*:/g)].map((match) => match[1]).sort()
  assert.deepEqual(parameters, ['p_best_darts', 'p_completion_id', 'p_difficulty', 'p_level_id', 'p_stars'])
  assert.doesNotMatch(storage, /p_reward_(xp|coins)/)
})

test('Browser has no legacy merge RPC or direct campaign DML', () => {
  assert.doesNotMatch(storage + campaign, /merge_campaign_progress|mergeCampaignProgress/)
  assert.doesNotMatch(storage, /from\('campaign_progress'\)\.\s*(insert|update|delete)/)
  assert.match(storage, /rpc\('reset_own_campaign_progress'/)
})

test('Migration exposes progress read-only and restricts RPC execution', () => {
  assert.match(migration, /grant select on public\.campaign_progress to authenticated;/)
  assert.match(migration, /revoke insert, update, delete on public\.campaign_progress from authenticated;/)
  assert.match(migration, /revoke all on function public\.complete_campaign_level[\s\S]*?from public, anon;/)
  assert.match(migration, /revoke all on function public\.reset_own_campaign_progress[\s\S]*?from public, anon;/)
  assert.doesNotMatch(migration, /grant execute on function private\.import_campaign_progress[\s\S]*?to authenticated;/)
})

test('Completion is serialized and progress is monotonic', () => {
  assert.match(migration, /where profile\.id = current_user_id\s+for update;/)
  assert.match(migration, /stars = greatest\(/)
  assert.match(migration, /else least\(public\.campaign_progress\.best_darts, excluded\.best_darts\)/)
  assert.match(migration, /if previous_stars is null or p_stars > previous_stars then/)
  assert.match(migration, /if not coalesce\(prior_xp_awarded, false\) then/)
  assert.match(migration, /on conflict \(user_id, completion_id\) do nothing/)
  assert.match(migration, /primary key \(user_id, difficulty, level_id\)/)
})

test('Server enforces normal and boss unlock rules', () => {
  assert.match(migration, /progress\.level_id = p_level_id - 1/)
  assert.match(migration, /Dieses Level ist noch gesperrt/)
  assert.match(migration, /world_normal_count <> 9/)
  assert.match(migration, /world_star_count < configured_required_stars/)
  assert.match(migration, /Dieses Boss-Level ist noch gesperrt/)
})

test('RLS isolates users and clients have no mutation policy', () => {
  assert.match(migration, /using \(user_id = \(select auth\.uid\(\)\)\)/)
  assert.doesNotMatch(migration, /create policy [^\n]*_(insert|update|delete)_own/)
  assert.match(migration, /revoke all on public\.campaign_progress from public, anon, authenticated/)
})

test('Reset has no user id parameter and covers the own campaign domain', () => {
  const reset = migration.match(/create or replace function public\.reset_own_campaign_progress\(([\s\S]*?)\)\s*returns void([\s\S]*?)\$\$;/)
  assert.ok(reset)
  assert.doesNotMatch(reset[1], /user_id/)
  assert.match(reset[2], /current_user_id uuid := \(select auth\.uid\(\)\)/)
  for (const table of ['private.campaign_completion_events', 'private.campaign_level_reward_state', 'private.campaign_progress_imports', 'public.campaign_progress']) {
    assert.ok(reset[2].includes(`delete from ${table}`))
  }
})
