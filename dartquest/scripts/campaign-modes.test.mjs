import test from 'node:test'
import assert from 'node:assert/strict'
import { applyVisit, createAiVisit, createRivalMatch, playerMatchStats, rivalAverageForLevel, undoPlayerRound } from '../src/features/campaignModes/rivalEngine.js'

test('Rivalen-Average folgt der Levelkurve', () => {
  assert.equal(rivalAverageForLevel(1), 25)
  assert.equal(rivalAverageForLevel(4), 37.5)
  assert.equal(rivalAverageForLevel(8), 47.5)
})

test('Bust lässt den Restscore stehen und wechselt den Spieler', () => {
  const match = createRivalMatch('Daniel', 1, 40)
  const bust = applyVisit(match, 39, false)
  assert.equal(bust.players[0].score, 40)
  assert.equal(bust.active, 1)
  assert.equal(bust.visits[0].bust, true)
})

test('Double-Out gewinnt Legs und First-to-3 das Match', () => {
  let match = createRivalMatch('Daniel', 1, 40)
  for (let leg = 0; leg < 3; leg += 1) {
    if (match.active === 1) match = applyVisit(match, 0)
    match = applyVisit(match, 40, true)
  }
  assert.equal(match.players[0].legs, 3)
  assert.equal(match.winner, 0)
})

test('Undo setzt Spielerzug samt folgendem KI-Zug zurück', () => {
  const start = createRivalMatch('Daniel', 1)
  const player = applyVisit(start, 60)
  const ai = applyVisit(player, 45)
  const restored = undoPlayerRound(ai)
  assert.equal(restored.players[0].score, 501)
  assert.equal(restored.players[1].score, 501)
  assert.equal(restored.active, 0)
})

test('KI-Aufnahme bleibt gültig und schwankt mit Zufall', () => {
  const match = { ...createRivalMatch('Daniel', 5), active: 1 }
  const low = createAiVisit(match, () => 0.1)
  const high = createAiVisit(match, () => 0.9)
  assert.ok(low.points >= 0 && low.points <= 180)
  assert.notEqual(low.points, high.points)
})

test('Statistik verwendet echte Punkte und Checkout-Darts', () => {
  let match = createRivalMatch('Daniel', 1, 40)
  match = applyVisit(match, 40, true, 2)
  const stats = playerMatchStats(match.players[0])
  assert.equal(stats.darts, 2)
  assert.equal(stats.visits, 1)
  assert.equal(stats.average, 60)
  assert.equal(stats.bestCheckout, 40)
  assert.equal(stats.checkoutRate, 100)
})
