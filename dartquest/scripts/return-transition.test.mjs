import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getReturnTransitionTiming, RETURN_TRANSITION_PHASES } from '../src/features/campaign/returnTransition.js'

test('return transition exposes one ordered central phase model', () => {
  assert.deepEqual(Object.values(RETURN_TRANSITION_PHASES), [
    'idle', 'fading-out-game', 'switching-view', 'fading-in-map', 'complete',
  ])
  const full = getReturnTransitionTiming('full', false)
  assert.ok(full.switchAt < full.revealAt)
  assert.ok(full.revealAt < full.completeAt)
})

test('reduced and disabled animation modes remain short or immediate', () => {
  assert.deepEqual(getReturnTransitionTiming('off', false), { switchAt: 0, revealAt: 0, completeAt: 0 })
  assert.deepEqual(getReturnTransitionTiming('full', true), { switchAt: 0, revealAt: 0, completeAt: 0 })
  assert.ok(getReturnTransitionTiming('reduced', false).completeAt <= 150)
})

test('level return is guarded, waits for confirmation and hides gameplay accessibly', async () => {
  const modal = await readFile(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
  assert.match(modal, /if \(returnStarted\.current\) return/)
  assert.match(modal, /setNormalConfirmation\(confirmation\)/)
  assert.match(modal, /WEITER ZUR KARTE/)
  assert.match(modal, /aria-hidden=/)
  assert.match(modal, /inert=/)
  assert.match(modal, /timers\.forEach/)
})

test('disabled animations bypass completion UI and continue only after persistence', async () => {
  const modal = await readFile(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
  assert.match(modal, /if \(animationMode === 'off'\) \{\s*completeAndContinue\(\)\s*return undefined\s*\}/)
  assert.match(modal, /const confirmation = await onCompleteRef\.current\(level, result\)[\s\S]*?confirmation\?\.nextLevelId[\s\S]*?onPlayNextRef\.current/)
  assert.match(modal, /result && !level\.boss && !instantMode/)
  assert.match(modal, /dataset\.animations === 'off'\)/)
})

test('crossfade presentation has no persistence or reward mutation', async () => {
  const transition = await readFile(new URL('../src/features/campaign/returnTransition.js', import.meta.url), 'utf8')
  assert.doesNotMatch(transition, /localStorage|supabase|onProfileRewards|rewardXP|rewardCoins|\.rpc\(/i)
})
