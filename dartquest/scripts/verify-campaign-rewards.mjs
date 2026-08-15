import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  bossStarRequirements,
  difficultyLevels,
} from '../src/features/campaign/data/levels.js'

const expected = Object.entries(difficultyLevels).flatMap(
  ([difficulty, levels]) => levels.map((level) => ({
    difficulty: Number(difficulty),
    level_id: level.id,
    reward_xp: level.rewardXP,
    reward_coins: level.rewardCoins,
    is_boss: level.boss === true,
    required_world_stars: level.boss === true
      ? bossStarRequirements[difficulty]
      : null,
  })),
)

assert.equal(expected.length, 500, 'Es müssen exakt 500 Leveldefinitionen existieren.')
assert.equal(
  new Set(expected.map((row) => `${row.difficulty}:${row.level_id}`)).size,
  500,
  'difficulty und level_id müssen eindeutig sein.',
)

const migrationUrl = new URL(
  '../supabase/migrations/20260818000000_campaign_progress.sql',
  import.meta.url,
)
const migration = await readFile(migrationUrl, 'utf8')
const snapshotMatch = migration.match(
  /-- CAMPAIGN_REWARDS_JSON_BEGIN[\s\S]*?\$campaign_rewards\$(\{[\s\S]*?\})\$campaign_rewards\$::jsonb[\s\S]*?-- CAMPAIGN_REWARDS_JSON_END/,
)

assert.ok(snapshotMatch, 'Reward-Snapshot wurde in der Migration nicht gefunden.')
const snapshot = JSON.parse(snapshotMatch[1])
const actual = Object.entries(snapshot).flatMap(([difficulty, values]) => (
  values.xp.map((rewardXP, index) => ({
    difficulty: Number(difficulty),
    level_id: index + 1,
    reward_xp: rewardXP,
    reward_coins: values.coins[index],
    is_boss: values.boss.includes(index + 1),
    required_world_stars: values.boss.includes(index + 1)
      ? values.bossStars
      : null,
  }))
))
assert.deepEqual(
  actual,
  expected,
  'Reward-Konfiguration weicht von den Kampagnenleveldefinitionen ab.',
)

console.log('Campaign-Reward-Abgleich erfolgreich: 500/500 Level stimmen überein.')
