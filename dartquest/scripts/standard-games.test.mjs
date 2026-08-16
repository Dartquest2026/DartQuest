import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createDart, createX01Match, throwX01Dart, undoX01 } from '../src/features/standardGames/x01Engine.js'

const hit = (match, segment, multiplier = 1) => throwX01Dart(match, createDart(segment, multiplier))

test('501 subtracts structured darts and switches after three darts', () => {
  let match = createX01Match({ names: ['Ada', 'Ben'] })
  match = hit(match, 20, 3)
  match = hit(match, 20, 2)
  match = hit(match, 5)
  assert.equal(match.players[0].score, 396)
  assert.equal(match.currentPlayerIndex, 1)
  assert.equal(match.players[0].visits, 1)
  assert.equal(match.players[0].highestVisit, 105)
})

test('miss counts as a dart without changing score', () => {
  let match = createX01Match({ names: ['Ada'] })
  match = throwX01Dart(match, createDart('miss'))
  assert.equal(match.players[0].score, 501)
  assert.equal(match.players[0].dartsThrown, 1)
  assert.equal(match.currentVisit[0].miss, true)
})

test('exact double checkout wins while single checkout busts', () => {
  let winning = createX01Match({ names: ['Ada'], startScore: 40 })
  winning = hit(winning, 20, 2)
  assert.equal(winning.winnerIndex, 0)

  let bust = createX01Match({ names: ['Ada', 'Ben'], startScore: 40 })
  bust = hit(bust, 20, 1)
  bust = hit(bust, 20, 1)
  assert.equal(bust.winnerIndex, null)
  assert.equal(bust.players[0].score, 40)
  assert.equal(bust.currentPlayerIndex, 1)
  assert.match(bust.notice, /Bust/)
})

test('overscore and remaining one restore visit-start score', () => {
  let over = createX01Match({ names: ['Ada', 'Ben'], startScore: 30 })
  over = hit(over, 20, 2)
  assert.equal(over.players[0].score, 30)
  let one = createX01Match({ names: ['Ada', 'Ben'], startScore: 32 })
  one = hit(one, 15, 2)
  one = hit(one, 1)
  assert.equal(one.players[0].score, 32)
  assert.equal(one.currentPlayerIndex, 1)
})

test('undo restores normal dart, bust, turn and winner state', () => {
  const initial = createX01Match({ names: ['Ada', 'Ben'], startScore: 40 })
  const normal = hit(initial, 10)
  assert.deepEqual(undoX01(normal).players, initial.players)
  const bust = hit(normal, 20, 2)
  const beforeBust = undoX01(bust)
  assert.equal(beforeBust.currentPlayerIndex, 0)
  assert.equal(beforeBust.players[0].score, 30)
  const winner = hit(createX01Match({ names: ['Ada'], startScore: 40 }), 20, 2)
  assert.equal(undoX01(winner).winnerIndex, null)
})

test('setup rejects empty names and more than four players', () => {
  assert.throws(() => createX01Match({ names: [''] }))
  assert.throws(() => createX01Match({ names: ['1', '2', '3', '4', '5'] }))
})

test('singleplayer and multiplayer entries open the shared 501 game', async () => {
  const [singleplayer, multiplayer] = await Promise.all([
    readFile(new URL('../src/features/singleplayer/Singleplayer.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/multiplayer/Multiplayer.jsx', import.meta.url), 'utf8'),
  ])
  assert.match(singleplayer, /<StandardGame/)
  assert.match(multiplayer, /selectedMode === 'standard'/)
  assert.match(multiplayer, /<StandardGame/)
})

test('shared game exposes setup, pause, confirmations and winner actions', async () => {
  const game = await readFile(new URL('../src/features/standardGames/StandardGame.jsx', import.meta.url), 'utf8')
  assert.match(game, /501 STARTEN/)
  assert.match(game, /WEITERSPIELEN/)
  assert.match(game, /EINSTELLUNGEN/)
  assert.match(game, /SPIEL NEU STARTEN/)
  assert.match(game, /SPIEL VERLASSEN/)
  assert.match(game, /role="alertdialog"/)
  assert.match(game, /GLEICHE EINSTELLUNGEN/)
  assert.doesNotMatch(game, /supabase|onProfileRewards|rewardXP|rewardCoins/i)
})
