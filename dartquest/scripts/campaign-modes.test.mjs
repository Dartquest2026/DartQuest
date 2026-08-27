import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyVisit, canCheckoutWithDarts, CHECKOUT_FINISH_VALUES, createAiVisit, createChallengeRivalMatch, createRivalMatch, currentLegStats, DARTBOARD_HIT_VALUES, findCheckoutRoute, getAvailableCheckoutDartCounts, getMinimumCheckoutDarts, isValidCheckoutAttempt, playerMatchStats, rivalAverageForLevel, rivalMatchResult, shouldRequestCheckoutConfirmation, undoPlayerRound } from '../src/features/campaignModes/rivalEngine.js'
import { checkoutDartOptions, checkoutRewards, checkoutStarsForDarts } from '../src/features/campaignModes/checkoutRules.js'
import { openFiveCardPack, RARITIES } from '../src/features/cards/cardCatalog.js'
import { BOGEY_NUMBERS, CHECKOUT_TABLE, checkoutRoutes, getCheckoutAdvice, setupSuggestion } from '../src/features/checkout/checkoutGuide.js'

test('Rivalen-Average folgt der Levelkurve', () => {
  assert.equal(rivalAverageForLevel(1), 25)
  assert.equal(rivalAverageForLevel(4), 37.5)
  assert.equal(rivalAverageForLevel(8), 47.5)
})

test('Checkout-Dartanzahlen folgen echten Double-Out-Routen', () => {
  const cases = [
    [2, 1, [1, 2, 3]],
    [3, 2, [2, 3]],
    [40, 1, [1, 2, 3]],
    [41, 2, [2, 3]],
    [50, 1, [1, 2, 3]],
    [52, 2, [2, 3]],
    [99, 3, [3]],
    [100, 2, [2, 3]],
    [110, 2, [2, 3]],
    [111, 3, [3]],
    [130, 3, [3]],
    [141, 3, [3]],
    [158, 3, [3]],
    [170, 3, [3]],
    [159, null, []],
    [160, 3, [3]],
    [161, 3, [3]],
    [162, null, []],
    [163, null, []],
    [164, 3, [3]],
    [165, null, []],
    [166, null, []],
    [167, 3, [3]],
    [168, null, []],
    [169, null, []],
    [171, null, []],
  ]

  for (const [score, minimum, available] of cases) {
    assert.equal(getMinimumCheckoutDarts(score), minimum, `Minimum bei ${score}`)
    assert.deepEqual(getAvailableCheckoutDartCounts(score), available, `Tasten bei ${score}`)
    for (const darts of [1, 2, 3]) assert.equal(canCheckoutWithDarts(score, darts), available.includes(darts), `${score} mit ${darts} Darts`)
  }
})

test('jede Checkout-Markierung von 2 bis 170 besitzt eine echte Boardroute mit gültigem Abschluss', () => {
  const finishValues = new Set(CHECKOUT_FINISH_VALUES)
  const hitValues = new Set(DARTBOARD_HIT_VALUES)
  const bogeys = new Set([159, 162, 163, 165, 166, 168, 169])

  for (let score = 2; score <= 170; score += 1) {
    const available = getAvailableCheckoutDartCounts(score)
    assert.equal(available.includes(1), finishValues.has(score), `Ein-Dart-Markierung bei ${score}`)
    if (bogeys.has(score)) assert.deepEqual(available, [], `Bogey ${score}`)

    for (const darts of [1, 2, 3]) {
      const route = findCheckoutRoute(score, darts)
      assert.equal(route !== null, available.includes(darts), `${score} mit ${darts} Darts`)
      if (!route) continue
      assert.equal(route.length, darts)
      assert.equal(route.reduce((sum, hit) => sum + hit, 0), score)
      assert.ok(route.slice(0, -1).every((hit) => hitValues.has(hit)), `Ungültiger Eröffnungsdart bei ${score}`)
      assert.ok(finishValues.has(route.at(-1)), `Ungültiger Abschlussdart bei ${score}`)
    }
  }
})

test('Rivalen-Keypad trennt kurzen Klick und 600-ms-Long-Press', () => {
  const source = readFileSync(new URL('../src/features/campaignModes/components/CampaignGameUI.jsx', import.meta.url), 'utf8')
  assert.match(source, /setTimeout\(\(\) => \{[\s\S]*?onCheckoutLongPress\(number\)[\s\S]*?\}, 600\)/)
  assert.match(source, /is-checkout-available/)
  assert.match(source, /is-holding/)
  assert.match(source, /suppressClick/)
  assert.match(source, /Math\.hypot/)
  assert.match(source, /onContextMenu/)
  assert.match(source, /suppressNextClick/)
  assert.match(source, /setTimeout\(\(\) => \{ suppressClick\.current = false \}, 1000\)/)
})

test('Rivalen-Long-Press schliesst Checkout direkt und ohne Dialog ab', () => {
  const source = readFileSync(new URL('../src/features/campaignModes/RivalCampaign.jsx', import.meta.url), 'utf8')
  const longPressHandler = source.match(/function requestCheckoutByLongPress\(dartsUsed\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''

  assert.match(longPressHandler, /confirming\.current = true/)
  assert.match(longPressHandler, /setCheckoutPrompt\(null\)/)
  assert.match(longPressHandler, /applyVisit\(match, points, true, dartsUsed, 1\)/)
  assert.match(longPressHandler, /setMatch\(next\)/)
  assert.match(longPressHandler, /storeResult\(next\)/)
  assert.doesNotMatch(longPressHandler, /setCheckoutPrompt\(\{/)
})

test('normale Rivalen-Eingabe fragt nur bei tatsaechlich erreichtem Checkout nach', () => {
  const cases = [
    [141, 43, false],
    [141, 100, false],
    [141, 139, false],
    [141, 140, false],
    [141, 141, true],
    [66, 5, false],
    [66, 60, false],
    [66, 65, false],
    [66, 66, true],
    [170, 60, false],
    [170, 170, true],
  ]

  for (const [remaining, entered, expected] of cases) {
    assert.equal(shouldRequestCheckoutConfirmation(remaining, entered), expected, `${remaining} Rest, ${entered} Punkte`)
  }
})

test('normale Nicht-Checkout-Aufnahmen ziehen Punkte ab oder werden als Bust gewertet', () => {
  const cases = [
    [141, 43, 98, false],
    [141, 100, 41, false],
    [141, 139, 2, false],
    [141, 140, 141, true],
    [66, 5, 61, false],
    [66, 60, 6, false],
    [66, 65, 66, true],
    [170, 60, 110, false],
  ]

  for (const [remaining, entered, expectedRest, expectedBust] of cases) {
    const next = applyVisit(createRivalMatch('Daniel', 1, remaining), entered)
    assert.equal(next.players[0].score, expectedRest, `${remaining} Rest, ${entered} Punkte`)
    assert.equal(next.visits[0].bust, expectedBust, `${remaining} Rest, ${entered} Punkte Bust`)
    assert.equal(next.players[0].checkoutAttempts, 0)
  }
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

test('laufender Leg-Average verwendet nur aktuelle Punkte und tatsaechliche Darts', () => {
  let match = createRivalMatch('Daniel', 1, 501)
  assert.deepEqual(currentLegStats(match, 0), { points: 0, darts: 0, average: null })
  assert.deepEqual(currentLegStats(match, 1), { points: 0, darts: 0, average: null })
  match = applyVisit(match, 60)
  assert.deepEqual(currentLegStats(match, 0), { points: 60, darts: 3, average: 60 })
  assert.equal(currentLegStats(match, 1).average, null)
  match = applyVisit(match, 45)
  assert.equal(currentLegStats(match, 1).average, 45)
  match = applyVisit(match, 45)
  assert.deepEqual(currentLegStats(match, 0), { points: 105, darts: 6, average: 52.5 })
})

test('Leg-Average zaehlt Checkout-Darts, Bust und Undo konsistent', () => {
  let match = createRivalMatch('Daniel', 1, 160, 2)
  match = applyVisit(match, 60)
  match = applyVisit(match, 0)
  const beforeBust = match
  match = applyVisit(match, 99)
  assert.deepEqual(currentLegStats(match, 0), { points: 60, darts: 6, average: 30 })
  match = undoPlayerRound(match)
  assert.deepEqual(currentLegStats(match, 0), currentLegStats(beforeBust, 0))
  match = applyVisit({ ...match, firstTo: 1 }, 100, true, 2, 1)
  assert.deepEqual(currentLegStats(match, 0), { points: 160, darts: 5, average: 96 })
})

test('neues Leg setzt beide laufenden Leg-Averages zurueck', () => {
  let match = createRivalMatch('Daniel', 1, 40, 2)
  match = applyVisit(match, 0)
  match = applyVisit(match, 0)
  match = applyVisit(match, 40, true, 1, 1)
  assert.deepEqual(currentLegStats(match, 0), { points: 0, darts: 0, average: null })
  assert.deepEqual(currentLegStats(match, 1), { points: 0, darts: 0, average: null })
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

test('gewonnenes Leg speichert Average, echte Doppelversuche und benötigte Darts', () => {
  const finished = applyVisit(createRivalMatch('Daniel', 1, 52, 1), 52, true, 2, 2)
  const result = rivalMatchResult(finished)
  assert.equal(result.won, true)
  assert.equal(result.checkoutRate, 50)
  assert.deepEqual(result.legs, [{ number: 1, winner: 0, average: 78, checkoutAttempts: 2, checkouts: 1, darts: 2, remaining: null }])
})

test('Doppelversuche können die verwendeten Checkout-Darts nicht überschreiten', () => {
  const finished = applyVisit(createRivalMatch('Daniel', 1, 40, 1), 40, true, 1, 3)
  const result = rivalMatchResult(finished)
  assert.equal(result.darts, 1)
  assert.equal(result.checkoutAttempts, 1)
  assert.equal(result.legs[0].checkoutAttempts, 1)
})

test('verlorenes Leg speichert null erfolgreiche Checkouts und den Restscore', () => {
  let match = createRivalMatch('Daniel', 1, 40, 1)
  match = applyVisit(match, 0, false, 3, 3)
  match = applyVisit(match, 40, true, 1, 1)
  const result = rivalMatchResult(match)
  assert.equal(result.won, false)
  assert.equal(result.checkoutRate, 0)
  assert.deepEqual(result.legs[0], { number: 1, winner: 1, average: 0, checkoutAttempts: 3, checkouts: 0, darts: null, remaining: 40 })
})

test('Match-Checkoutquote verwendet Summen aller Doppel-Darts', () => {
  let match = createRivalMatch('Daniel', 1, 40, 2)
  match = applyVisit(match, 40, true, 2, 2)
  match = applyVisit(match, 40, true, 1, 1)
  match = applyVisit(match, 40, true, 1, 1)
  const result = rivalMatchResult(match)
  assert.equal(result.checkouts, 2)
  assert.equal(result.checkoutAttempts, 3)
  assert.ok(Math.abs(result.checkoutRate - (2 / 3) * 100) < 0.001)
})

test('alte Rivalenergebnisse ohne Legdaten erhalten einen sicheren Fallback', () => {
  const source = readFileSync(new URL('../src/features/campaignModes/RivalCampaign.jsx', import.meta.url), 'utf8')
  assert.match(source, /Match- und Leg-Statistiken: Nicht verfügbar/)
  assert.match(source, /result\.lastMatch/)
})

test('Rivalen-Ergebnis passt auf kleine Displays ohne internen Scrollbereich', () => {
  const css = readFileSync(new URL('../src/features/campaignModes/RivalLevels.css', import.meta.url), 'utf8')
  assert.match(css, /@media\(max-height:700px\)/)
  assert.match(css, /campaign-result:has\(\.rival-result-details\)\{place-items:start center/)
  assert.match(css, /section:has\(\.rival-result-details\)\{max-height:calc\(100dvh - 8px\);overflow:hidden/)
})
