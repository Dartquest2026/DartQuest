import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyVisit, createAiVisit, createChallengeRivalMatch, createRivalMatch, isValidCheckoutAttempt, playerMatchStats, rivalAverageForLevel, undoPlayerRound } from '../src/features/campaignModes/rivalEngine.js'
import { checkoutDartOptions, checkoutRewards, checkoutStarsForDarts } from '../src/features/campaignModes/checkoutRules.js'
import { openFiveCardPack, RARITIES } from '../src/features/cards/cardCatalog.js'
import { BOGEY_NUMBERS, CHECKOUT_TABLE, checkoutRoutes, getCheckoutAdvice, setupSuggestion } from '../src/features/checkout/checkoutGuide.js'

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

test('sichtbarer Rivalenverlauf startet nach jedem Leg neu', () => {
  let match = createRivalMatch('Daniel', 1, 40)
  match = applyVisit(match, 0)
  match = applyVisit(match, 0)
  assert.equal(match.legVisits.length, 2)
  match = applyVisit(match, 40, true, 1)
  assert.equal(match.players[0].legs, 1)
  assert.deepEqual(match.legVisits, [])
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

test('Rivalen-Checkout akzeptiert nur regelkonforme Dartzahlen', () => {
  assert.equal(isValidCheckoutAttempt(180, 3), false)
  assert.equal(isValidCheckoutAttempt(170, 1), false)
  assert.equal(isValidCheckoutAttempt(170, 3), true)
  assert.equal(isValidCheckoutAttempt(40, 1), true)

  const invalidWin = applyVisit(createRivalMatch('Daniel', 1, 180), 180, true, 1)
  assert.equal(invalidWin.winner, null)
  assert.equal(invalidWin.players[0].score, 180)
  assert.equal(invalidWin.visits[0].bust, true)
})

test('Checkout-Tabelle sperrt unmögliche Dartanzahlen und Bogey-Zahlen', () => {
  assert.deepEqual(checkoutDartOptions(5), [2, 3])
  assert.equal(checkoutDartOptions(41).includes(1), false)
  assert.deepEqual(checkoutDartOptions(170), [3])
  for (const bogey of [169,168,166,165,163,162,159]) assert.deepEqual(checkoutDartOptions(bogey), [])
})

test('Checkout-Hilfe liefert gültige Standardwege und Alternativen', () => {
  assert.deepEqual(checkoutRoutes(121, 3)[0].map((field) => field.notation), ['T20', 'T11', 'D14'])
  assert.ok(checkoutRoutes(121, 3).length > 1)
  for (const route of checkoutRoutes(121, 3)) {
    assert.equal(route.reduce((sum, field) => sum + field.score, 0), 121)
    assert.ok(['double', 'bull'].includes(route.at(-1).multiplier))
  }
})

test('Checkout-Hilfe unterstützt Bull-Finishes und verfügbare Darts', () => {
  assert.deepEqual(checkoutRoutes(50, 1)[0].map((field) => field.notation), ['Bull'])
  assert.deepEqual(checkoutRoutes(170, 3)[0].map((field) => field.notation), ['T20', 'T20', 'Bull'])
  assert.deepEqual(checkoutRoutes(170, 2), [])
})

test('Checkout-Hilfe priorisiert die gelieferten 2- und 3-Dart-Tabellen', () => {
  const notation = (score, darts) => checkoutRoutes(score, darts)[0].map((field) => field.notation)
  assert.deepEqual(notation(164, 3), ['T20', 'T18', 'Bull'])
  assert.deepEqual(notation(135, 3), ['25', 'T20', 'Bull'])
  assert.deepEqual(notation(132, 3), ['Bull', 'Bull', 'D16'])
  assert.deepEqual(notation(121, 3), ['T20', 'T11', 'D14'])
  assert.deepEqual(notation(110, 3), ['T19', '13', 'D20'])
  assert.deepEqual(notation(110, 2), ['T20', 'Bull'])
  assert.deepEqual(notation(62, 2), ['T12', 'D13'])
})

test('Niedrige Checkouts beginnen nie auf Triple und stellen saubere Doppel', () => {
  const notation = (score) => checkoutRoutes(score, 3)[0].map((field) => field.notation)
  assert.deepEqual(notation(40), ['D20'])
  assert.deepEqual(notation(39), ['7', 'D16'])
  assert.deepEqual(notation(32), ['D16'])
  assert.deepEqual(notation(25), ['1', 'D12'])
  assert.deepEqual(notation(24), ['D12'])
  assert.deepEqual(notation(17), ['1', 'D8'])
  assert.deepEqual(notation(16), ['D8'])
  assert.deepEqual(notation(12), ['D6'])
  assert.deepEqual(notation(8), ['D4'])
  assert.deepEqual(notation(56), ['16', 'D20'])
  assert.deepEqual(notation(60), ['20', 'D20'])
  for (let score = 2; score <= 60; score += 1) {
    for (const route of checkoutRoutes(score, 3)) {
      if (route.length > 1) assert.equal(route[0].multiplier, 'single')
    }
  }
})

test('Vollständige Checkout-Tabelle lässt Bogey-Zahlen frei', () => {
  assert.equal(Object.keys(CHECKOUT_TABLE).length, 169)
  for (const bogey of BOGEY_NUMBERS) assert.deepEqual(CHECKOUT_TABLE[bogey], [])
})

test('Set-up-Tipps erzeugen niemals Rest 1', () => {
  for (let score = 2; score <= 230; score += 1) {
    if (checkoutRoutes(score, 3).length) continue
    const setup = setupSuggestion(score)
    if (setup) assert.notEqual(setup.remainder, 1)
  }
  assert.equal(setupSuggestion(169).field.notation, 'T20')
})

test('Checkout-Hilfe wird nach einer Aufnahme anhand des neuen Rests berechnet', () => {
  const before = getCheckoutAdvice(121, 3)
  const after = getCheckoutAdvice(64, 3)
  assert.equal(before.score, 121)
  assert.equal(after.score, 64)
  assert.notDeepEqual(before.routes[0], after.routes[0])
})

test('Checkout-Tipp besitzt mobile und bewegungsreduzierte Darstellung', () => {
  const css = readFileSync(new URL('../src/features/checkout/CheckoutTip.css', import.meta.url), 'utf8')
  assert.match(css, /@media\(max-height:700px\)/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /checkout-tip-trigger/)
})

test('Checkout-Belohnung folgt Ziel und Sternmultiplikator', () => {
  assert.deepEqual(checkoutRewards(100, 4), { xp: 45, coins: 23 })
  assert.ok(checkoutRewards(170, 3).xp > checkoutRewards(20, 3).xp)
})

test('Checkout-Sterne bewerten perfekte Dartanzahl korrekt', () => {
  assert.equal(checkoutStarsForDarts(40, 1), 4)
  assert.equal(checkoutStarsForDarts(3, 2), 4)
  assert.equal(checkoutStarsForDarts(5, 2), 4)
  assert.equal(checkoutStarsForDarts(40, 2), 3)
  assert.equal(checkoutStarsForDarts(40, 3), 2)
  assert.equal(checkoutStarsForDarts(40, 4), 1)
})

test('Fünfer-Paket enthält garantiert mindestens Selten', () => {
  const pack = openFiveCardPack(() => 0.1)
  assert.equal(pack.length, 5)
  assert.ok(pack.some((card) => RARITIES.indexOf(card.rarity) >= 2))
})

test('Beginner challenge keeps 101 First-to-1 and does not auto-checkout', () => {
  const match = { ...createChallengeRivalMatch('Daniel', { id: 'test', startScore: 101 }), active: 1 }
  assert.equal(match.startScore, 101)
  assert.equal(match.firstTo, 1)
  assert.equal(match.targetAverage, 25)

  const setup = applyVisit(match, 61)
  const missedCheckout = createAiVisit({ ...setup, active: 1 }, () => 0.9)
  assert.equal(setup.players[1].score, 40)
  assert.equal(missedCheckout.validCheckout, false)
  assert.notEqual(missedCheckout.points, 40)
})
