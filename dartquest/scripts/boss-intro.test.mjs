import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getBossIntroContent } from '../src/features/campaign/bossIntro.js'
import { getBossPresentation } from '../src/features/campaign/bossPresentation.js'
import { getLevelsByDifficulty } from '../src/features/campaign/data/levels.js'

test('boss intro uses existing level data', () => {
  assert.deepEqual(getBossIntroContent({ id: 20, world: 2, title: 'Boss – Präzision', task: 'Treffe D20', targetHits: 3 }, 'Anfänger II'), {
    levelId: 20,
    world: 2,
    worldLabel: 'Anfänger II',
    bossName: 'Präzision',
    task: 'Treffe D20',
    target: '3 erforderliche Treffer',
  })
})

test('missing boss name and target use neutral fallbacks', () => {
  const content = getBossIntroContent({ id: 30, title: '', task: '', targetHits: null })
  assert.equal(content.bossName, 'Boss der Welt 3')
  assert.equal(content.worldLabel, 'Welt 3')
  assert.equal(content.target, null)
  assert.match(content.task, /Boss-Aufgabe/)
})

test('every existing boss resolves to its stable world presentation', () => {
  for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
    const bosses = getLevelsByDifficulty(difficulty).filter((level) => level.boss)
    assert.equal(bosses.length, 10)
    bosses.forEach((boss) => assert.equal(getBossPresentation(boss).id, `world-${Math.ceil(boss.id / 10)}`))
  }
})

test('world variants differ and unknown ids use the safe default', () => {
  const first = getBossPresentation(10)
  const second = getBossPresentation(20)
  assert.notEqual(first.theme, second.theme)
  assert.notEqual(first.symbol, second.symbol)
  assert.equal(getBossPresentation(999).id, 'default')
})

test('transition is presentation-only and completes through one guard', async () => {
  const transition = await readFile(new URL('../src/features/campaign/components/LevelEnterTransition.jsx', import.meta.url), 'utf8')
  assert.match(transition, /completed\.current/)
  assert.match(transition, /INTRO ÜBERSPRINGEN/)
  assert.match(transition, /popstate/)
  assert.match(transition, /vibrate\(getBossHapticPattern/)
  assert.match(transition, /isBoss \? getBossPresentation/)
  assert.doesNotMatch(transition, /onProfileRewards|localStorage|supabase|rewardXP|rewardCoins|\.rpc\(/i)
})

test('campaign keeps unlock and multi-click guards before creating the transition', async () => {
  const campaign = await readFile(new URL('../src/features/campaign/Campaign.jsx', import.meta.url), 'utf8')
  const startBlock = campaign.match(/function startSelectedLevel\(\)[\s\S]*?function finishLevelEnter/)?.[0] ?? ''
  assert.match(startBlock, /isLevelUnlocked/)
  assert.match(startBlock, /levelEnterLocked\.current/)
  assert.match(startBlock, /setLevelEnterTransition/)
  assert.doesNotMatch(startBlock, /setSelectedLevel/)
})

test('gameplay attempt is mounted only after the intro completes', async () => {
  const campaign = await readFile(new URL('../src/features/campaign/Campaign.jsx', import.meta.url), 'utf8')
  assert.match(campaign, /function finishLevelEnter\(\)[\s\S]*setSelectedLevel\(level\)/)
})
