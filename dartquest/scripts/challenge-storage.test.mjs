import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  checkAndCreateChallengeAfterLevel,
  completeChallenge,
  createInitialChallengeState,
  loadChallenge,
  scheduleChallenge,
} from '../src/features/campaign/challengeStorage.js'
import { getNextStandardLevelId } from '../src/features/campaign/campaignNavigation.js'

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

test('first challenge is planned once between level 8 and 12', () => {
  assert.equal(createInitialChallengeState(() => 0).nextAt, 8)
  assert.equal(createInitialChallengeState(() => 0.999999).nextAt, 12)

  const first = loadChallenge('player', 1, () => 0.25)
  const afterReload = loadChallenge('player', 1, () => 0.99)
  assert.equal(afterReload.nextAt, first.nextAt)
})

test('levels before the concrete first trigger never create a challenge', () => {
  const state = createInitialChallengeState(() => 0)
  for (let level = 1; level < state.nextAt; level += 1) {
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

test('completion schedules exactly one new trigger 8 to 12 levels later', () => {
  const offered = scheduleChallenge('player', 1, 17, { nextAt: 17, pending: null, completed: [] })
  const earliest = completeChallenge('player', 1, offered, offered.pending, () => 0)
  assert.equal(earliest.nextAt, 25)
  assert.equal(earliest.pending, null)

  const duplicateCompletion = completeChallenge('player', 1, earliest, offered.pending, () => 0.999999)
  assert.equal(duplicateCompletion, earliest)
  assert.equal(duplicateCompletion.nextAt, 25)

  const laterOffer = scheduleChallenge('player', 1, 31, { nextAt: 31, pending: null, completed: [] })
  const latest = completeChallenge('player', 1, laterOffer, laterOffer.pending, () => 0.999999)
  assert.equal(latest.nextAt, 43)
})

test('Nächste Aufgabe bleibt über mindestens 20 direkte Level und Weltgrenzen verfügbar', () => {
  for (let level = 1; level <= 20; level += 1) {
    assert.equal(getNextStandardLevelId(level, 100, true), level + 1)
  }
  for (const boundary of [10, 20, 30, 40]) {
    assert.equal(getNextStandardLevelId(boundary, 100, true), boundary + 1)
  }
  assert.equal(getNextStandardLevelId(100, 100, true), null)
  assert.equal(getNextStandardLevelId(31, 100, false), null)
})

test('bereits freigeschaltetes nächstes Level lässt den Button weiterhin zu', () => {
  assert.equal(getNextStandardLevelId(31, 100, true), 32)
})

test('Kampagnenkarte nutzt Mini-Karte und prüft den Trigger vor der nächsten Aufgabe', () => {
  const campaign = readFileSync(new URL('../src/features/campaign/Campaign.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/features/campaign/Campaign.css', import.meta.url), 'utf8')
  const nextHandler = campaign.match(/function playNextLevel\(nextLevelId\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''
  const startHandler = campaign.match(/function requestStartStandardLevel\([\s\S]*?\n  \}/)?.[0] ?? ''

  assert.match(campaign, /className="campaign-challenge-mini"/)
  assert.match(campaign, /function checkForPendingChallengeAfterLevel/)
  assert.match(nextHandler, /requestStartStandardLevel/)
  assert.match(campaign, /requestStartStandardLevel\(selectedPreviewLevel\.id, 'map'/)
  assert.match(startHandler, /checkForPendingChallengeAfterLevel/)
  assert.match(startHandler, /setChallengeOfferOpen\(true\)/)
  assert.match(styles, /\.campaign-challenge-mini\{position:absolute/)
  assert.match(styles, /\.dq-map \{[\s\S]*?overflow: hidden/)
  assert.doesNotMatch(styles, /campaign-challenge-mini\{[^}]*position:fixed/)
})

test('direkter Nächste-Aufgabe-Flow zeigt den Trigger exakt einmal', () => {
  localStorage.setItem('dartquest-campaign-challenge-player-1', JSON.stringify({ nextAt: 17, pending: null, completed: [] }))

  const afterLevel16 = checkAndCreateChallengeAfterLevel('player', 1, 16)
  assert.equal(afterLevel16.shouldShowChallenge, false)
  assert.equal(afterLevel16.state.pending, null)

  const afterLevel17 = checkAndCreateChallengeAfterLevel('player', 1, 17)
  assert.equal(afterLevel17.shouldShowChallenge, true)
  assert.equal(afterLevel17.challenge.triggerLevel, 17)
  assert.equal(afterLevel17.challenge.autoShown, true)

  const afterLevel18 = checkAndCreateChallengeAfterLevel('player', 1, 18)
  assert.equal(afterLevel18.shouldShowChallenge, false)
  assert.equal(afterLevel18.state.pending.id, afterLevel17.challenge.id)
})

test('übersprungener Trigger wird robust erkannt und Reload zeigt ihn nicht erneut automatisch', () => {
  localStorage.setItem('dartquest-campaign-challenge-player-1', JSON.stringify({ nextAt: 17, pending: null, completed: [] }))
  const triggered = checkAndCreateChallengeAfterLevel('player', 1, 27)
  assert.equal(triggered.shouldShowChallenge, true)

  const afterReload = checkAndCreateChallengeAfterLevel('player', 1, 27)
  assert.equal(afterReload.shouldShowChallenge, false)
  assert.equal(afterReload.state.pending.id, triggered.challenge.id)
})

test('Challenge-Overlay liegt über aktivem Level und behält das vorgemerkte Ziel', () => {
  const campaign = readFileSync(new URL('../src/features/campaign/Campaign.jsx', import.meta.url), 'utf8')
  const campaignStyles = readFileSync(new URL('../src/features/campaign/Campaign.css', import.meta.url), 'utf8')
  const levelStyles = readFileSync(new URL('../src/features/campaign/LevelModal.css', import.meta.url), 'utf8')
  const acceptHandler = campaign.match(/function acceptChallenge\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''
  const finishHandler = campaign.match(/function finishChallenge\([\s\S]*?\n  \}/)?.[0] ?? ''
  const challengeLayerIndex = campaign.indexOf('campaign-challenge-backdrop')
  const levelModalIndex = campaign.indexOf('<LevelModal')

  assert.match(levelStyles, /\.level-modal-backdrop[\s\S]*?z-index:\s*9999\s*!important/)
  assert.match(campaignStyles, /\.campaign-challenge-backdrop\{[^}]*z-index:10500/)
  assert.match(campaignStyles, /\.campaign-challenge-backdrop\{[^}]*pointer-events:auto/)
  assert.ok(challengeLayerIndex >= 0 && challengeLayerIndex < levelModalIndex)
  assert.doesNotMatch(acceptHandler, /setChallengeNextLevelId\(null\)/)
  assert.match(finishHandler, /continueStandardLevelStart\(nextLevelId, nextEntry\)/)
})
