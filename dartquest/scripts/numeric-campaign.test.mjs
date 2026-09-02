import test from 'node:test'
import assert from 'node:assert/strict'

import { difficultyLevels } from '../src/features/campaign/data/levels.js'
import { getMinimumCheckoutDarts } from '../src/features/campaignModes/rivalEngine.js'
import {
  applyCheckoutVisit,
  applyScoreVisit,
  checkoutStarsForTotalDarts,
  createNumericAttempt,
  numericAttemptStats,
  undoNumericVisit,
  getMinimumCampaignCheckoutDarts,
  getDartVisitPreview,
  getVisibleNumericHistory,
} from '../src/features/campaign/standardNumericAttempt.js'

test('alle geladenen Standard-Level besitzen einen expliziten Task-Typ', () => {
  for (const levels of Object.values(difficultyLevels)) {
    for (const level of levels) assert.ok(['targets', 'checkout', 'score', 'timed'].includes(level.taskType), `${level.id}: ${level.task}`)
  }
})

test('einfache Checkouts und Punkteaufgaben werden semantisch getrennt', () => {
  const all = Object.values(difficultyLevels).flat()
  assert.ok(all.find((level) => level.task === 'Checke 100')?.taskType === 'checkout')
  assert.ok(all.find((level) => level.task === 'Erziele mindestens 100 Punkte')?.taskType === 'score')
  assert.ok(all.find((level) => level.task === 'Checke 32 und danach 40')?.taskType === 'targets')
  assert.ok(all.find((level) => level.task === 'Checke 170 mit T20 → T20 → DBull')?.taskType === 'targets')
})

test('Minimum-Darts folgt den zentralen Double-Out-Routen', () => {
  for (const [score, darts] of [[2,1],[32,1],[40,1],[50,1],[52,2],[80,2],[81,2],[100,2],[101,2],[121,3],[141,3],[170,3]]) {
    assert.equal(getMinimumCheckoutDarts(score), darts, `${score}`)
  }
  for (const bogey of [169,168,166,165,163,162,159]) assert.equal(getMinimumCheckoutDarts(bogey), null)
  assert.equal(getMinimumCampaignCheckoutDarts(501), 9)
})

test('Checkout-Sterne berücksichtigen perfekte und tatsächliche Gesamtdarts', () => {
  const cases = {
    40: [[1,4],[2,3],[3,3],[4,2],[6,2],[7,1]],
    52: [[2,4],[3,3],[4,2],[6,2],[7,1]],
    100: [[2,4],[3,3],[4,2],[6,2],[7,1]],
    141: [[3,4],[4,2],[6,2],[7,1]],
    170: [[3,4],[4,2],[6,2],[7,1]],
  }
  for (const [score, entries] of Object.entries(cases)) {
    for (const [darts, stars] of entries) assert.equal(checkoutStarsForTotalDarts(Number(score), darts), stars, `${score}/${darts}`)
  }
  assert.equal(checkoutStarsForTotalDarts(100, 1), 0)
})

test('Checkout verwendet Rivalen-Bust, Restscore, Darts und Undo', () => {
  const level = { id: 1, taskType: 'checkout', checkoutScore: 100 }
  let attempt = createNumericAttempt(level)
  attempt = applyCheckoutVisit(attempt, 60)
  assert.deepEqual(numericAttemptStats(level, attempt), { rest:40,totalScore:60,totalDarts:3,visits:1,highestVisit:60,average:60,history:attempt.match.visits,complete:false })
  attempt = applyCheckoutVisit(attempt, 40, true, 2)
  assert.equal(numericAttemptStats(level, attempt).totalDarts, 5)
  assert.equal(numericAttemptStats(level, attempt).complete, true)
  attempt = undoNumericVisit(attempt)
  assert.equal(numericAttemptStats(level, attempt).rest, 40)
  assert.equal(numericAttemptStats(level, attempt).totalDarts, 3)
})

test('Punkte-Aufnahmen summieren und Undo stellt die Rohdaten wieder her', () => {
  const level = { taskType:'score', targetScore:100, comparison:'atLeast' }
  let attempt = createNumericAttempt(level)
  attempt = applyScoreVisit(attempt, 60)
  attempt = applyScoreVisit(attempt, 45)
  assert.equal(numericAttemptStats(level, attempt).complete, true)
  assert.equal(numericAttemptStats(level, attempt).totalDarts, 6)
  attempt = undoNumericVisit(attempt)
  assert.equal(numericAttemptStats(level, attempt).totalScore, 60)
  assert.equal(numericAttemptStats(level, attempt).totalDarts, 3)
})

test('nach 20 Aufnahmen bleiben intern alle Daten, sichtbar sind nur die letzten drei', () => {
  const level = { taskType:'score', targetScore:9999, comparison:'atLeast' }
  let attempt = createNumericAttempt(level)
  for (let index = 1; index <= 20; index += 1) attempt = applyScoreVisit(attempt, index)
  const history = numericAttemptStats(level, attempt).history
  assert.equal(history.length, 20)
  assert.deepEqual(getVisibleNumericHistory(history).map((visit) => visit.points), [18, 19, 20])
})

test('Pro-Dart-Vorschau erkennt Zwischenstand, Bust und Checkout ohne vorzeitige Aufnahme', () => {
  const level = { id:1, taskType:'checkout', checkoutScore:40 }
  const attempt = createNumericAttempt(level)
  assert.deepEqual(getDartVisitPreview(level, attempt, [20]), { points:20, rest:20, bust:false, checkout:false })
  assert.deepEqual(getDartVisitPreview(level, attempt, [20, 19]), { points:39, rest:40, bust:true, checkout:false })
  assert.deepEqual(getDartVisitPreview(level, attempt, [0, 40]), { points:40, rest:0, bust:false, checkout:true })
  assert.equal(numericAttemptStats(level, attempt).history.length, 0)
})
