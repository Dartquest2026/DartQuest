import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { standardProgressRows } from '../src/features/campaign/standardProgress.js'

function results(count, stars = 1) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [index + 1, { stars }]))
}

test('unterschiedliche abgeschlossene Standard-Level zählen genau einmal', () => {
  assert.equal(standardProgressRows(results(10)).length, 10)
  assert.equal(standardProgressRows(results(35)).length, 35)
  assert.equal(standardProgressRows(results(100)).length, 100)

  const repeated = results(35)
  repeated[10] = { stars: 4, darts: 7 }
  repeated[10] = { stars: 4, darts: 6 }
  assert.equal(standardProgressRows(repeated).length, 35)
})

test('Beststerne werden als Rohwerte für die Rangliste synchronisiert', () => {
  const progress = results(10, 3)
  for (const level of [1, 2, 3, 4]) progress[level].stars = 4
  const rows = standardProgressRows(progress)
  assert.equal(rows.reduce((sum, row) => sum + row.stars, 0), 34)
  assert.equal((34 / (10 * 4)) * 100, 85)
})

test('ungültige und nicht abgeschlossene lokale Ergebnisse werden nicht übertragen', () => {
  assert.deepEqual(standardProgressRows({ 1: { stars: 0 }, 2: { stars: 5 }, x: { stars: 3 }, 3: { stars: 2 } }), [
    { level_id: 3, stars: 2, best_darts: null, first_completed_at: null },
  ])
})

test('Supabase-RPC schützt Besitz und Rangliste aggregiert level_id eindeutig', () => {
  const syncMigration = readFileSync(new URL('../supabase/migrations/20260828000000_sync_standard_campaign_progress.sql', import.meta.url), 'utf8')
  const leaderboardMigration = readFileSync(new URL('../supabase/migrations/20260827000000_leaderboard_campaign_tabs.sql', import.meta.url), 'utf8')

  assert.match(syncMigration, /current_user_id uuid := \(select auth\.uid\(\)\)/)
  assert.match(syncMigration, /on conflict \(user_id, difficulty, level_id\) do update/)
  assert.match(syncMigration, /stars = greatest/)
  assert.match(syncMigration, /revoke all[\s\S]*from public, anon/)
  assert.match(leaderboardMigration, /group by progress\.user_id, progress\.level_id/)
  assert.match(leaderboardMigration, /count\(\*\)::bigint as levels, sum\(progress\.stars\)::bigint as stars/)
})
