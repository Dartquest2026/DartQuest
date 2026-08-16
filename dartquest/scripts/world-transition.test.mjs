import assert from 'node:assert/strict'
import test from 'node:test'
import { getAutomaticWorldTransition } from '../src/features/campaign/worldTransition.js'

const firstSavedBoss = {
  level: { id: 10, boss: true },
  successfulAttempt: true,
  firstCompletion: true,
  previousUnlockedLevel: 10,
  unlockedLevel: 11,
  totalLevels: 100,
  totalWorlds: 10,
}

test('first successful boss completion targets the actually unlocked next level', () => {
  assert.deepEqual(getAutomaticWorldTransition(firstSavedBoss), {
    targetLevelId: 11,
    targetWorld: 2,
  })
})

test('normal levels, failures and boss replays never trigger a world transition', () => {
  assert.equal(getAutomaticWorldTransition({ ...firstSavedBoss, level: { id: 9, boss: false } }), null)
  assert.equal(getAutomaticWorldTransition({ ...firstSavedBoss, successfulAttempt: false }), null)
  assert.equal(getAutomaticWorldTransition({ ...firstSavedBoss, firstCompletion: false }), null)
  assert.equal(getAutomaticWorldTransition({ ...firstSavedBoss, previousUnlockedLevel: 11 }), null)
})

test('final boss and invalid targets do not trigger a world transition', () => {
  assert.equal(getAutomaticWorldTransition({
    ...firstSavedBoss,
    level: { id: 100, boss: true },
    previousUnlockedLevel: 100,
    unlockedLevel: 100,
  }), null)
  assert.equal(getAutomaticWorldTransition({ ...firstSavedBoss, unlockedLevel: 101 }), null)
})
