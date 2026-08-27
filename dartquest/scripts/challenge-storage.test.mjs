import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  completeChallenge,
  createInitialChallengeState,
  loadChallenge,
  scheduleChallenge,
} from '../src/features/campaign/challengeStorage.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test.beforeEach(() => {
  globalThis.localStorage = memoryStorage()
})

test('first challenge is planned once between level 12 and 20', () => {
  assert.equal(createInitialChallengeState(() => 0).nextAt, 12)
  assert.equal(createInitialChallengeState(() => 0.999999).nextAt, 20)

  const first = loadChallenge('player', 1, () => 0.25)
  const afterReload = loadChallenge('player', 1, () => 0.99)
  assert.equal(afterReload.nextAt, first.nextAt)
})

test('levels 1 to 10 never create a challenge', () => {
  const state = createInitialChallengeState(() => 0)
  for (let level = 1; level <= 10; level += 1) {
    assert.equal(scheduleChallenge('player', 1, level, state).pending, null)
  }
})

test('challenge appears at its concrete trigger without scheduling the next one', () => {
  const state = { nextAt: 17, pending: null, completed: [] }
  assert.equal(scheduleChallenge('player', 1, 16, state), state)

  const offered = scheduleChallenge('player', 1, 17, state)
  assert.equal(offered.pending.triggerLevel, 17)
  assert.equal(offered.nextAt, 17)
})

test('a deferred challenge stays pending and blocks every further challenge', () => {
  const offered = scheduleChallenge('player', 1, 17, { nextAt: 17, pending: null, completed: [] })
  const deferred = { ...offered, pending: { ...offered.pending, status: 'deferred' } }

  assert.equal(scheduleChallenge('player', 1, 100, deferred), deferred)
  assert.equal(deferred.nextAt, 17)
})

test('completion schedules exactly one new trigger 12 to 20 levels later', () => {
  const offered = scheduleChallenge('player', 1, 17, { nextAt: 17, pending: null, completed: [] })
  const earliest = completeChallenge('player', 1, offered, offered.pending, () => 0)
  assert.equal(earliest.nextAt, 29)
  assert.equal(earliest.pending, null)

  const duplicateCompletion = completeChallenge('player', 1, earliest, offered.pending, () => 0.999999)
  assert.equal(duplicateCompletion, earliest)
  assert.equal(duplicateCompletion.nextAt, 29)

  const laterOffer = scheduleChallenge('player', 1, 31, { nextAt: 31, pending: null, completed: [] })
  const latest = completeChallenge('player', 1, laterOffer, laterOffer.pending, () => 0.999999)
  assert.equal(latest.nextAt, 51)
})

test('Kampagnenkarte nutzt Mini-Karte und prüft den Trigger vor der nächsten Aufgabe', () => {
  const campaign = readFileSync(new URL('../src/features/campaign/Campaign.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/features/campaign/Campaign.css', import.meta.url), 'utf8')
  const nextHandler = campaign.match(/function playNextLevel\(nextLevelId\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''

  assert.match(campaign, /className="campaign-challenge-mini"/)
  assert.match(campaign, /function checkForPendingChallengeAfterLevel/)
  assert.match(nextHandler, /checkForPendingChallengeAfterLevel/)
  assert.match(nextHandler, /setChallengeOfferOpen\(true\)/)
  assert.match(styles, /\.campaign-challenge-mini\{position:absolute/)
  assert.match(styles, /\.dq-map \{[\s\S]*?overflow: hidden/)
  assert.doesNotMatch(styles, /campaign-challenge-mini\{[^}]*position:fixed/)
})
