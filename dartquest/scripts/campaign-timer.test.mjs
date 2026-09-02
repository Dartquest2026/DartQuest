import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { difficultyLevels } from '../src/features/campaign/data/levels.js'
import { formatCountdown, getCountdownTone, getRemainingSeconds } from '../src/features/campaign/campaignTimer.js'
import { createLevelAttempt } from '../src/features/campaign/utils/levelAttempt.js'
import { createTimedTaskResult, pauseTimedAttempt, resumeTimedAttempt } from '../src/features/campaign/timedTaskAttempt.js'

test('alle textbasierten Zeitlimits sind strukturiert migriert', () => {
  const timed = Object.entries(difficultyLevels).flatMap(([difficulty, levels]) => levels.filter((level) => level.timeLimitSeconds).map((level) => [Number(difficulty), level.id, level.timeLimitSeconds]))
  assert.deepEqual(timed, [[4,68,420],[4,69,360],[4,70,300],[4,97,300]])
  for (const id of [68,69,70,97]) {
    const level = difficultyLevels[4].find((entry) => entry.id === id)
    assert.equal(level.taskType, 'timed')
    assert.equal(level.targets.length, 20)
    assert.equal(level.orderedTargets, true)
  }
})

test('Countdown basiert driftfrei auf Endzeit und aktueller Echtzeit', () => {
  const end = 1_000_000
  assert.equal(getRemainingSeconds(end, end - 420_000), 420)
  assert.equal(getRemainingSeconds(end, end - 399_001), 400)
  assert.equal(getRemainingSeconds(end, end + 20_000), 0)
  assert.equal(formatCountdown(420), '07:00')
  assert.equal(formatCountdown(-1), '00:00')
})

test('Timer-Warnstufen besitzen stabile Grenzen', () => {
  assert.equal(getCountdownTone(61), '')
  assert.equal(getCountdownTone(60), 'is-warning')
  assert.equal(getCountdownTone(30), 'is-urgent')
  assert.equal(getCountdownTone(10), 'is-critical')
  assert.equal(getCountdownTone(0), 'is-critical')
})

test('lange Sequenzen behalten Paging und markieren nur das aktive Board-Target', () => {
  const modal = readFileSync(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
  const counter = readFileSync(new URL('../src/features/campaign/components/HitCounter.jsx', import.meta.url), 'utf8')
  const board = readFileSync(new URL('../src/features/campaign/components/Dartboard.jsx', import.meta.url), 'utf8')
  assert.match(modal, /Triff alle Singlefelder von 1 bis 20\./)
  assert.match(counter, /targetPageSize = 6/)
  assert.match(counter, /activeTargetId=\{attempt\.ordered \? expectedTarget : null\}/)
  assert.match(board, /activeTargetId && target\.id !== activeTargetId/)
  assert.doesNotMatch(counter, /Als Nächstes:/)
})

test('Timer-Level verwenden die zentrale Ansicht ohne Dartboard-Eingabe', () => {
  const modal = readFileSync(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
  const game = readFileSync(new URL('../src/features/campaign/components/TimedTaskGame.jsx', import.meta.url), 'utf8')
  assert.match(modal, /timedLevel \? \(/)
  assert.match(modal, /<TimedTaskGame/)
  assert.doesNotMatch(game, /<Dartboard|<HitCounter|<NumericCampaignInput/)
  for (const action of ['START', 'STOPP', 'WEITER', 'FERTIG']) assert.match(game, new RegExp(action))
})

test('mehrfache Pausen schließen Pausenzeit driftfrei aus', () => {
  let end = resumeTimedAttempt(420_000, 0)
  let rest = pauseTimedAttempt(end, 45_000)
  assert.equal(rest, 375_000)
  end = resumeTimedAttempt(rest, 345_000)
  rest = pauseTimedAttempt(end, 390_000)
  assert.equal(rest, 330_000)
  end = resumeTimedAttempt(rest, 690_000)
  rest = pauseTimedAttempt(end, 710_000)
  assert.equal(rest, 310_000)
})

test('Timer-Ergebnis speichert Limit, aktive Zeit und Restzeit', () => {
  const result = createTimedTaskResult({ timeLimitSeconds:420, rewardXP:10, rewardCoins:2 }, 221_000, 500_000, 0)
  assert.equal(result.elapsedTimeSeconds, 199)
  assert.equal(result.remainingTimeSeconds, 221)
  assert.equal(result.success, true)
  assert.equal(result.taskType, 'timed')
})
