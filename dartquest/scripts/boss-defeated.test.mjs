import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getBossUnlockMessage, shouldShowBossDefeated } from '../src/features/campaign/bossDefeated.js'

const savedBoss = { level: { id: 10, boss: true }, result: { success: true, stars: 3 }, confirmation: { saved: true, awardedXP: 80, awardedCoins: 50 } }

test('only a successfully saved boss completion starts the sequence', () => {
  assert.equal(shouldShowBossDefeated(savedBoss), true)
  assert.equal(shouldShowBossDefeated({ ...savedBoss, level: { id: 9, boss: false } }), false)
  assert.equal(shouldShowBossDefeated({ ...savedBoss, result: { success: false, stars: 0 } }), false)
  assert.equal(shouldShowBossDefeated({ ...savedBoss, confirmation: null }), false)
  assert.equal(shouldShowBossDefeated({ ...savedBoss, confirmation: { saved: true } }), false)
})

test('unlock copy reflects only the confirmed unlock result', () => {
  assert.equal(getBossUnlockMessage({ newlyUnlocked: false }), '')
  assert.equal(getBossUnlockMessage({ newlyUnlocked: true, nextLevelId: 11, newWorldName: 'Anfänger II' }), 'Neue Welt freigeschaltet: Anfänger II')
  assert.equal(getBossUnlockMessage({ newlyUnlocked: true, nextLevelId: 31 }), 'Nächstes Level freigeschaltet: Level 31')
  assert.equal(getBossUnlockMessage({ campaignCompleted: true, newlyUnlocked: false }), 'Kampagne abgeschlossen')
})

test('boss presentation contains no save, profile or reward mutation', async () => {
  const component = await readFile(new URL('../src/features/campaign/components/BossDefeatedSequence.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(component, /onProfileRewards|localStorage|supabase|\.rpc\(|\.update\(|\.insert\(/i)
  assert.match(component, /handled\.current/)
  assert.match(component, /WEITER ZUR KAMPAGNE/)
})

test('level modal starts boss presentation only after awaited completion', async () => {
  const modal = await readFile(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
  assert.match(modal, /const confirmation = await onCompleteRef\.current/)
  assert.match(modal, /shouldShowBossDefeated/)
  assert.match(modal, /profileSyncError/)
})
