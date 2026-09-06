import test from 'node:test'
import assert from 'node:assert/strict'

import { difficultyLevels } from '../src/features/campaign/data/levels.js'
import { createLevelAttempt, isAttemptComplete, registerTargetHit } from '../src/features/campaign/utils/levelAttempt.js'
import { calculateBossFinaleStars, createBossFinaleResult, isMultiPhaseBoss } from '../src/features/campaign/bossFinale.js'
import { applyVisit, createAiVisit, createRivalMatch, rivalMatchResult } from '../src/features/campaignModes/rivalEngine.js'

const level = difficultyLevels[1].find((entry) => entry.id === 100)

test('Beginner 100 is one two-phase boss with the exact ordered singles', () => {
  assert.equal(isMultiPhaseBoss(level), true)
  assert.deepEqual(level.sequence, ['S20', 'S10', 'S5', 'S16', 'S8', 'S4'])
  assert.deepEqual(level.bossPhases, [
    { type: 'targets' },
    { type: 'rival501', startScore: 501, firstTo: 1, rivalLevel: 3, targetAverage: 35 },
  ])
  let attempt = createLevelAttempt(level)
  for (const target of level.sequence) attempt = registerTargetHit(attempt, target)
  assert.equal(isAttemptComplete(attempt), true)
  assert.equal(attempt.totalDarts, 6)
})

test('finale stars only use phase-one darts and require a 501 win', () => {
  assert.deepEqual([6, 7, 9, 10, 12, 13].map(calculateBossFinaleStars), [4, 3, 3, 2, 2, 1])
  const phaseOne = { success: true, totalDarts: 8, visits: 3, xp: level.rewardXP, coins: level.rewardCoins }
  assert.equal(createBossFinaleResult(phaseOne, { won: false }), null)
  assert.deepEqual(createBossFinaleResult(phaseOne, { won: true, average: 42.3 }), {
    ...phaseOne, stars: 3, darts: 8, targetDarts: 8, targetMisses: 2, targetVisits: 3,
    rival501: { won: true, average: 42.3 },
  })
})

test('shared rival engine resolves First-to-1 win and loss correctly', () => {
  const base = createRivalMatch('Spieler', 3, 501, 1)
  const humanCheckout = { ...base, players: [{ ...base.players[0], score: 40 }, base.players[1]] }
  const won = applyVisit(humanCheckout, 40, true, 1)
  assert.equal(won.winner, 0)
  assert.equal(rivalMatchResult(won).won, true)

  const aiCheckout = { ...base, active: 1, players: [base.players[0], { ...base.players[1], score: 40 }] }
  const lost = applyVisit(aiCheckout, 40, true, 1)
  assert.equal(lost.winner, 1)
  assert.equal(rivalMatchResult(lost).won, false)
})

test('level-3 rival AI varies naturally around a 35 three-dart average', () => {
  const match = createRivalMatch('Spieler', 3, 501, 1)
  let seed = 123456789
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296)
  const visits = Array.from({ length: 2000 }, () => createAiVisit(match, random).points)
  const mean = visits.reduce((sum, points) => sum + points, 0) / visits.length
  assert.ok(new Set(visits).size > 20)
  assert.ok(mean > 33 && mean < 37, `mean was ${mean}`)
})
