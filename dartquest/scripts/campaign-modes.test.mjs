import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyVisit, canCheckoutWithDarts, CHECKOUT_FINISH_VALUES, checkoutAttemptsForFinish, createAiVisit, createChallengeRivalMatch, createRivalMatch, currentLegStats, DARTBOARD_HIT_VALUES, findCheckoutRoute, getAvailableCheckoutDartCounts, getMinimumCheckoutDarts, isValidCheckoutAttempt, playerMatchStats, rivalAverageForLevel, rivalMatchResult, shouldRequestCheckoutConfirmation, undoPlayerRound } from '../src/features/campaignModes/rivalEngine.js'
import { checkoutDartOptions, checkoutRewards, checkoutStarsForDarts } from '../src/features/campaignModes/checkoutRules.js'
import { openFiveCardPack, RARITIES } from '../src/features/cards/cardCatalog.js'
import { BOGEY_NUMBERS, CHECKOUT_TABLE, checkoutRoutes, getCheckoutAdvice, setupSuggestion } from '../src/features/checkout/checkoutGuide.js'
import { isBogeyNumber, isCheckoutScore } from '../src/features/checkout/checkoutGuide.js'
import { buildVisitRows } from '../src/features/campaignModes/rivalHistory.js'
import { aggregateCheckoutStats, calculateCheckoutRate, formatCheckoutStats } from '../src/features/campaignModes/checkoutStatistics.js'

test('Kamera-Testmodus ist separat geroutet und schreibt keine Rivalenfortschritte', () => {
  const modes = readFileSync(new URL('../src/features/campaignModes/CampaignModes.jsx', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../src/app/App.jsx', import.meta.url), 'utf8')
  const rival = readFileSync(new URL('../src/features/campaignModes/RivalCampaign.jsx', import.meta.url), 'utf8')
  const camera = readFileSync(new URL('../src/features/campaignModes/components/CameraPreview.jsx', import.meta.url), 'utf8')
  assert.match(modes, /cameraTest.*Testversion Kamera/)
  assert.match(app, /activePage === 'cameraTestCampaign'/)
  assert.match(app, /<RivalCampaign activeProfile=\{activeProfile\} onBack=.* cameraTest \/>/)
  assert.match(rival, /if \(cameraTest\) return/)
  assert.match(camera, /facingMode: \{ ideal: 'environment' \}/)
  assert.match(camera, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/)
  assert.match(camera, /autoPlay playsInline muted/)
})

test('Rivalen-Average folgt der Levelkurve', () => {
  assert.equal(rivalAverageForLevel(1), 25)
  assert.equal(rivalAverageForLevel(4), 37.5)
  assert.equal(rivalAverageForLevel(8), 47.5)
})

test('Rivalen-Historie koppelt Score, kumulierte Darts und Rest je Aufnahme', () => {
  let match = createRivalMatch('Daniel', 1)
  match = applyVisit(match, 55)
  match = applyVisit(match, 60)
  match = applyVisit(match, 55)
  const rows = buildVisitRows(match.legVisits, 501)
  assert.deepEqual(rows.map((row) => row.darts), [3, 6])
  assert.deepEqual(rows.map((row) => row.human && [row.human.points, row.human.cumulativeDarts, row.human.rest]), [[55, 3, 446], [55, 6, 391]])
  assert.deepEqual([rows[0].ai.points, rows[0].ai.cumulativeDarts, rows[0].ai.rest], [60, 3, 441])
  const restored = undoPlayerRound(match)
  assert.equal(buildVisitRows(restored.legVisits, 501).length, 1)
  assert.equal(restored.players[0].score, 446)
})

test('Checkout-Status unterscheidet Finish, Bogey und normalen Rest', () => {
  for (const score of [80, 141, 170]) assert.equal(isCheckoutScore(score), true)
  for (const score of [159, 162, 163, 165, 166, 168, 169]) {
    assert.equal(isBogeyNumber(score), true)
    assert.equal(isCheckoutScore(score), false)
  }
  assert.equal(isCheckoutScore(171), false)
})

test('Live-Averages stehen in den Scorekarten und nicht unter der Historie', () => {
  const source = readFileSync(new URL('../src/features/campaignModes/RivalCampaign.jsx', import.meta.url), 'utf8')
  assert.match(source, /rival-player-average[^\n]*humanLegStats\.average/)
  assert.match(source, /rival-player-average[^\n]*aiLegStats\.average/)
  assert.doesNotMatch(source, /<footer><span>Ø/)
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

test('Rivalen- und Challenge-Long-Press bestätigt genau einmal ohne Dartanzahl-Modal', () => {
  const source = readFileSync(new URL('../src/features/campaignModes/RivalCampaign.jsx', import.meta.url), 'utf8')
  const longPressHandler = source.match(/function requestCheckoutByLongPress\(dartsUsed\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''

  assert.match(longPressHandler, /recordedCheckoutDarts\(match\) \+ checkoutAttemptsForFinish\(points, dartsUsed\)/)
  assert.match(longPressHandler, /storeResult\(next\)/)
  assert.match(longPressHandler, /setCheckoutPrompt\(null\)/)
  assert.doesNotMatch(longPressHandler, /setCheckoutPrompt\(\{/)
})

test('Long-Press-Dartanzahlen validieren Checkout und Challenge-Abschluss exakt einmal', () => {
  for (const [score, darts, valid] of [[40, 1, true], [80, 2, true], [80, 3, true], [141, 3, true], [141, 2, false]]) {
    assert.equal(isValidCheckoutAttempt(score, darts), valid, `${score} mit ${darts} Darts`)
  }

  const challenge = createChallengeRivalMatch('Daniel', { id: 'long-press-once', startScore: 80 })
  const finished = applyVisit(challenge, 80, true, 3, 1)
  assert.equal(finished.players[0].legs, 1)
  assert.equal(finished.visits.length, 1)
  assert.equal(finished.legResults.length, 1)
  assert.equal(finished.legResults[0].darts, 3)
  assert.equal(finished.legResults[0].average, 80)
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
    assert.equal(next.players[0].checkoutDarts, 0)
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

test('Undo entfernt Checkout-Rohwerte vollständig aus dem Match-State', () => {
  const start = createRivalMatch('Daniel', 1, 40, 1)
  const finished = applyVisit(start, 40, true, 1, 5)
  const restored = undoPlayerRound(finished)
  const result = rivalMatchResult(restored)
  assert.equal(result.successfulCheckouts, 0)
  assert.equal(result.checkoutDarts, 0)
  assert.deepEqual(restored.currentLegCheckoutDarts, [0, 0])
  assert.equal(result.checkoutRate, null)
  assert.deepEqual(result.legs, [])
})

test('KI-Aufnahme bleibt gültig und schwankt mit Zufall', () => {
  const match = { ...createRivalMatch('Daniel', 5), active: 1 }
  const low = createAiVisit(match, () => 0.1)
  const high = createAiVisit(match, () => 0.9)
  assert.ok(low.points >= 0 && low.points <= 180)
  assert.notEqual(low.points, high.points)
})

test('40 mit zwei Gesamtdarts zählt Miss und Treffer als zwei Checkout-Darts', () => {
  let match = createRivalMatch('Daniel', 1, 40)
  match = applyVisit(match, 40, true, 2)
  const stats = playerMatchStats(match.players[0])
  assert.equal(stats.darts, 2)
  assert.equal(stats.visits, 1)
  assert.equal(stats.average, 60)
  assert.equal(stats.bestCheckout, 40)
  assert.equal(stats.checkoutRate, 50)
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

test('zufällige Herausforderung speichert 1 Checkout bei 3 Checkout-Darts als 33,3 Prozent', () => {
  const challenge = createChallengeRivalMatch('Daniel', { id: 'checkout-raw-values', startScore: 40 })
  const finished = applyVisit(challenge, 40, true, 1, 3)
  const result = rivalMatchResult(finished)

  assert.equal(result.successfulCheckouts, 1)
  assert.equal(result.checkoutDarts, 3)
  assert.ok(Math.abs(result.checkoutRate - (1 / 3) * 100) < 0.001)
  assert.deepEqual(result.legs[0], {
    number: 1,
    winner: 0,
    average: 120,
    checkoutDarts: 3,
    checkoutDartsReliable: true,
    successfulCheckouts: 1,
    darts: 1,
    remaining: null,
  })
  assert.equal(formatCheckoutStats(result.successfulCheckouts, result.checkoutDarts), '33,3 % (1/3)')
  assert.equal(formatCheckoutStats(result.legs[0].successfulCheckouts, result.legs[0].checkoutDarts), '33,3 % (1/3)')
})

test('gewonnenes Leg speichert Average, echte Checkout-Darts und benötigte Darts', () => {
  const finished = applyVisit(createRivalMatch('Daniel', 1, 52, 1), 52, true, 2, 4)
  const result = rivalMatchResult(finished)
  assert.equal(result.won, true)
  assert.equal(result.checkoutRate, 25)
  assert.deepEqual(result.legs, [{ number: 1, winner: 0, average: 78, checkoutDarts: 4, checkoutDartsReliable: true, successfulCheckouts: 1, darts: 2, remaining: null }])
})

test('Checkout-Darts sind unabhängig von den finalen Aufnahmedarts und dürfen größer als drei sein', () => {
  const finished = applyVisit(createRivalMatch('Daniel', 1, 40, 1), 40, true, 1, 5)
  const result = rivalMatchResult(finished)
  assert.equal(result.darts, 1)
  assert.equal(result.checkoutDarts, 5)
  assert.equal(result.legs[0].checkoutDarts, 5)
  assert.equal(result.checkoutRate, 20)
})

test('kumulierte Checkout-Darts eines Legs werden beim Treffer nicht doppelt gezählt', () => {
  let match = createRivalMatch('Daniel', 1, 40, 1)
  match = applyVisit(match, 40, false, 3, 3)
  match = applyVisit(match, 0)
  match = applyVisit(match, 40, true, 2, 5)
  const result = rivalMatchResult(match)
  assert.equal(result.checkoutDarts, 5)
  assert.equal(result.successfulCheckouts, 1)
  assert.equal(result.checkoutRate, 20)
})

test('verlorenes Leg speichert null erfolgreiche Checkouts und den Restscore', () => {
  let match = createRivalMatch('Daniel', 1, 40, 1)
  match = applyVisit(match, 0, false, 3, 3)
  match = applyVisit(match, 40, true, 1, 1)
  const result = rivalMatchResult(match)
  assert.equal(result.won, false)
  assert.equal(result.checkoutRate, 0)
  assert.deepEqual(result.legs[0], { number: 1, winner: 1, average: 0, checkoutDarts: 3, checkoutDartsReliable: true, successfulCheckouts: 0, darts: null, remaining: 40 })
})

test('Match-Checkoutquote verwendet Summen aller Doppel-Darts', () => {
  let match = createRivalMatch('Daniel', 1, 40, 2)
  match = applyVisit(match, 40, true, 2, 4)
  match = applyVisit(match, 40, true, 1, 1)
  match = applyVisit(match, 40, true, 1, 5)
  const result = rivalMatchResult(match)
  assert.equal(result.successfulCheckouts, 2)
  assert.equal(result.checkoutDarts, 9)
  assert.ok(Math.abs(result.checkoutRate - (2 / 9) * 100) < 0.001)
})

test('Checkout-Helfer berechnet und formatiert die geforderten Rohwerte zentral', () => {
  for (const [successful, darts, expected] of [[1, 1, '100 % (1/1)'], [1, 2, '50 % (1/2)'], [1, 3, '33,3 % (1/3)'], [1, 5, '20 % (1/5)'], [3, 11, '27,3 % (3/11)'], [0, 5, '0 % (0/5)'], [0, 0, '–']]) {
    assert.equal(formatCheckoutStats(successful, darts), expected)
  }
  assert.equal(calculateCheckoutRate(0, 0), null)
})

test('drei Legs werden aus Rohwerten addiert und nicht als Prozentwerte gemittelt', () => {
  const legs = [
    { successfulCheckouts: 1, checkoutDarts: 4 },
    { successfulCheckouts: 1, checkoutDarts: 2 },
    { successfulCheckouts: 1, checkoutDarts: 5 },
  ]
  assert.deepEqual(aggregateCheckoutStats(legs), { successfulCheckouts: 3, checkoutDarts: 11 })
  assert.equal(formatCheckoutStats(3, 11), '27,3 % (3/11)')
})

test('Setup-Darts werden mathematisch von echten Checkout-Versuchen getrennt', () => {
  for (const [score, darts, attempts] of [[40, 1, 1], [40, 2, 2], [40, 3, 3], [80, 2, 1], [81, 2, 1], [81, 3, 2], [100, 2, 1], [141, 3, 1], [170, 3, 1]]) {
    assert.equal(checkoutAttemptsForFinish(score, darts), attempts, `${score} mit ${darts} Gesamtdarts`)
  }
  for (const [score, darts] of [[80, 2], [81, 2], [141, 3], [170, 3]]) {
    const finished = applyVisit(createRivalMatch('Daniel', 1, score, 1), score, true, darts)
    assert.equal(formatCheckoutStats(finished.legResults[0].successfulCheckouts, finished.legResults[0].checkoutDarts), '100 % (1/1)', `${score} direkter Checkout`)
  }
})

test('81er-Finish zählt nur ausgeführte D12-Versuche und behält sie über Aufnahmen', () => {
  const direct = applyVisit(createRivalMatch('Daniel', 1, 81, 1), 81, true, 2, checkoutAttemptsForFinish(81, 2))
  assert.equal(formatCheckoutStats(direct.legResults[0].successfulCheckouts, direct.legResults[0].checkoutDarts), '100 % (1/1)')

  const missThenHit = applyVisit(createRivalMatch('Daniel', 1, 81, 1), 81, true, 3, checkoutAttemptsForFinish(81, 3))
  assert.equal(formatCheckoutStats(missThenHit.legResults[0].successfulCheckouts, missThenHit.legResults[0].checkoutDarts), '50 % (1/2)')

  let acrossVisits = createRivalMatch('Daniel', 1, 24, 1)
  acrossVisits = applyVisit(acrossVisits, 24, false, 3, 2)
  acrossVisits = applyVisit(acrossVisits, 0)
  assert.equal(acrossVisits.currentLegCheckoutDarts[0], 2)
  acrossVisits = applyVisit(acrossVisits, 24, true, 1, 3)
  assert.equal(formatCheckoutStats(acrossVisits.legResults[0].successfulCheckouts, acrossVisits.legResults[0].checkoutDarts), '33,3 % (1/3)')
})

test('First-to-3 summiert 1/1, 1/2 und 1/3 zu 50 Prozent (3/6)', () => {
  let match = createRivalMatch('Daniel', 1, 40, 3)
  for (const attempts of [1, 2, 3]) {
    if (match.active === 1) match = applyVisit(match, 0)
    match = applyVisit(match, 40, true, Math.min(3, attempts), attempts)
  }
  const result = rivalMatchResult(match)
  assert.deepEqual(result.legs.map((leg) => leg.checkoutDarts), [1, 2, 3])
  assert.equal(formatCheckoutStats(result.successfulCheckouts, result.checkoutDarts), '50 % (3/6)')
})

test('alte Rivalenergebnisse ohne Legdaten erhalten einen sicheren Fallback', () => {
  const source = readFileSync(new URL('../src/features/campaignModes/RivalCampaign.jsx', import.meta.url), 'utf8')
  assert.match(source, /Match- und Leg-Statistiken: Nicht verfügbar/)
  assert.match(source, /result\.lastMatch/)
})

test('Rivalen-Ergebnis passt auf kleine Displays ohne internen Scrollbereich', () => {
  const css = readFileSync(new URL('../src/features/campaignModes/RivalLevels.css', import.meta.url), 'utf8')
  const source = readFileSync(new URL('../src/features/campaignModes/RivalCampaign.jsx', import.meta.url), 'utf8')
  assert.match(css, /@media\(max-height:700px\)/)
  assert.match(css, /campaign-result:has\(\.rival-result-details\)\{place-items:start center/)
  assert.match(css, /inset:0 0 calc\(78px \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(css, /section:has\(\.rival-result-details\)\{width:min\(100%,390px\);max-height:100%;overflow:hidden/)
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /height:min\(88%,740px\)/)
  assert.match(css, /height:min\(96%,570px\)/)
  assert.match(css, /min-height:clamp\(44px,6\.2dvh,50px\)/)
  assert.doesNotMatch(css, /transform:\s*scale\(/)
  assert.match(source, /<dt>Checkoutquote<\/dt>/)
  assert.match(source, /formatCheckoutStats\(leg\.successfulCheckouts/)
})
