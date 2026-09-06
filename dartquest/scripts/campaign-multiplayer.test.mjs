import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { difficultyLevels } from '../src/features/campaign/data/levels.js'
import { CAMPAIGN_PLAYER_COLORS, getCampaignPlayers, nextCampaignPlayerIndex, shouldRotateCampaignTurn } from '../src/features/campaign/multiplayerTurns.js'
import { createLevelAttempt, fillCurrentVisitWithMisses, nextVisit, registerTargetHit } from '../src/features/campaign/utils/levelAttempt.js'

test('two to four players use fixed names, fallbacks, colors and circular rotation', () => {
  assert.deepEqual(CAMPAIGN_PLAYER_COLORS, ['#42e695', '#4da3ff', '#ffd34c', '#bd7cff'])
  assert.deepEqual(getCampaignPlayers([{ name: 'Daniel' }, { name: 'Melissa' }], 2).map((player) => player.name), ['Daniel', 'Melissa'])
  assert.deepEqual(getCampaignPlayers([{ name: 'Daniel' }], 4).map((player) => player.name), ['Daniel', 'Spieler 2', 'Spieler 3', 'Spieler 4'])
  assert.deepEqual([2, 3, 4].map((count) => Array.from({ length: count + 1 }, (_, index) => nextCampaignPlayerIndex(index % count, count))), [
    [1, 0, 1], [1, 2, 0, 1], [1, 2, 3, 0, 1],
  ])
})

test('three darts and long-press completion rotate, partial visits do not', () => {
  let attempt = { ...createLevelAttempt(difficultyLevels[1][0]), playerId: 0 }
  const one = nextVisit(attempt)
  assert.equal(shouldRotateCampaignTurn(attempt, one), false)
  const full = fillCurrentVisitWithMisses(one)
  assert.equal(full.totalDarts, 3)
  assert.equal(shouldRotateCampaignTurn(one, full), true)
  assert.deepEqual(full.hitHistory.map((dart) => dart.playerId), [0, 0, 0])
})

test('co-op target hits remain shared while each dart keeps its player identity', () => {
  const level = { targets: [{ id: 'S20', label: 'S20', requiredHits: 2 }], orderedTargets: false }
  let attempt = { ...createLevelAttempt(level), playerId: 'daniel' }
  attempt = registerTargetHit(attempt, 'S20')
  attempt = { ...attempt, playerId: 'melissa' }
  attempt = registerTargetHit(attempt, 'S20')
  assert.equal(attempt.hitCounters.S20, 2)
  assert.deepEqual(attempt.hitHistory.map((dart) => dart.playerId), ['daniel', 'melissa'])
})

test('multiplayer uses the same gameplay tree without the former info card', () => {
  const modal = readFileSync(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/features/campaign/LevelModal.css', import.meta.url), 'utf8')
  assert.equal(Object.values(difficultyLevels).flat().length, 500)
  assert.doesNotMatch(modal, /className="level-modal-multiplayer"/)
  assert.match(modal, /<HitCounter/)
  assert.match(modal, /<NumericCampaignInput/)
  assert.match(modal, /level-active-player/)
  assert.match(css, /\.level-modal\.is-multiplayer:not\(\.is-boss-level\)/)
  assert.match(css, /\.level-modal\.is-boss-level \.level-active-player/)
})
