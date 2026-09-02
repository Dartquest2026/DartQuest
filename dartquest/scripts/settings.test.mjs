import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  applySettings,
  loadSettings,
  saveSettings,
  vibrate,
} from '../src/features/settings/settingsStorage.js'
import { HAPTIC_PATTERNS, isHapticsSupported, triggerHaptic } from '../src/features/settings/haptics.js'
import {
  confirmInputModeHint,
  getInputModeHintKey,
  hasConfirmedInputModeHint,
  resetTutorialFlags,
} from '../src/features/settings/tutorialStorage.js'

function storage(initial = {}) {
  const target = { ...initial }
  Object.defineProperties(target, {
    getItem: { enumerable: false, value: (key) => target[key] ?? null },
    setItem: { enumerable: false, value: (key, value) => { target[key] = value } },
    removeItem: { enumerable: false, value: (key) => { delete target[key] } },
  })
  return target
}

test('settings persist and migrate the existing input mode', () => {
  const memory = storage({ 'dartquest-gameplay-input-mode': 'quick' })
  assert.equal(loadSettings(memory).inputMode, 'quick')
  const saved = saveSettings({ sound: false, animations: 'off', haptics: false, inputMode: 'counter' }, memory)
  assert.deepEqual(loadSettings(memory), saved)
})

test('reduced-motion overrides full animations without removing the selected value', () => {
  const root = { dataset: {} }
  assert.equal(applySettings({ animations: 'full' }, root, { matches: true }), 'reduced')
  assert.equal(applySettings({ animations: 'off' }, root, { matches: false }), 'off')
})

test('haptics safely handles disabled and unsupported devices', () => {
  assert.equal(vibrate(20, { haptics: false }, { vibrate: () => true }), false)
  assert.equal(vibrate(20, { haptics: true }, {}), false)
  assert.equal(vibrate(20, { haptics: true }, { vibrate: () => true }), true)
})

test('typed haptics use subtle patterns and remain fire-and-forget', () => {
  const calls = []
  const supportedNavigator = { vibrate: (pattern) => { calls.push(pattern); return true } }
  assert.equal(isHapticsSupported(supportedNavigator), true)
  assert.equal(isHapticsSupported({}), false)
  assert.equal(triggerHaptic('light', { haptics: true }, supportedNavigator), true)
  assert.equal(triggerHaptic('medium', { haptics: true }, supportedNavigator), true)
  assert.equal(triggerHaptic('success', { haptics: true }, supportedNavigator), true)
  assert.equal(triggerHaptic('error', { haptics: true }, supportedNavigator), true)
  assert.deepEqual(calls, [15, 35, [25, 40, 35], [50, 40, 50]])
  assert.deepEqual(HAPTIC_PATTERNS.success, [25, 40, 35])
  assert.equal(triggerHaptic('light', { haptics: false }, supportedNavigator), false)
  assert.equal(triggerHaptic('light', { haptics: true }, {}), false)
  assert.equal(triggerHaptic('unknown', { haptics: true }, supportedNavigator), false)
  assert.equal(triggerHaptic('error', { haptics: true }, { vibrate: () => { throw new Error('unsupported') } }), false)
})

test('long press haptic is centralized and click suppression prevents a second feedback', async () => {
  const source = await readFile(new URL('../src/features/campaignModes/components/CampaignGameUI.jsx', import.meta.url), 'utf8')
  const holdHandler = source.match(/function startHold\(number, event\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''
  assert.match(holdHandler, /suppressNextClick\(\)[\s\S]*?triggerHaptic\('medium'\)[\s\S]*?onCheckoutLongPress/)
  assert.doesNotMatch(source, /navigator\.vibrate/)
  assert.match(source, /if \(suppressClick\.current\) \{[\s\S]*?return/)
})

test('tutorial reset is profile-scoped and keeps progress and settings', () => {
  const userAKey = getInputModeHintKey('user-a', 1)
  const userBKey = getInputModeHintKey('user-b', 1)
  const memory = storage({ [userAKey]: 'true', [userBKey]: 'true', 'dartquest-campaign-progress-singleplayer-difficulty-1': '{"stars":4,"best_darts":9}', 'dartquest-settings-v1': '{"sound":false,"animations":"off"}', 'dartquest-supabase-profile-cache': '[{"xp":500,"coins":25,"playerLevel":2}]' })
  resetTutorialFlags('user-a', memory)
  assert.equal(memory[userAKey], undefined)
  assert.equal(memory[userBKey], 'true')
  assert.equal(memory['dartquest-campaign-progress-singleplayer-difficulty-1'], '{"stars":4,"best_darts":9}')
  assert.equal(memory['dartquest-settings-v1'], '{"sound":false,"animations":"off"}')
  assert.equal(memory['dartquest-supabase-profile-cache'], '[{"xp":500,"coins":25,"playerLevel":2}]')
})

test('legacy confirmation migrates once and Verstanden persists explicitly', () => {
  const memory = storage({ dartquest_seen_input_mode_hint_difficulty_2: 'true' })
  assert.equal(hasConfirmedInputModeHint('user-a', 2, memory), true)
  assert.equal(memory.dartquest_seen_input_mode_hint_difficulty_2, undefined)
  assert.equal(memory[getInputModeHintKey('user-a', 2)], 'true')
  assert.equal(hasConfirmedInputModeHint('user-b', 2, memory), false)
  confirmInputModeHint('user-b', 3, memory)
  assert.equal(hasConfirmedInputModeHint('user-b', 3, memory), true)
})

test('automatic hint timeout does not persist Verstanden', async () => {
  const levelModal = await readFile(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
  const timeoutBlock = levelModal.match(/if \(!showInputModeHint\)[\s\S]*?\}, \[showInputModeHint\]\)/)?.[0] ?? ''
  assert.doesNotMatch(timeoutBlock, /setItem|confirmInputModeHint/)
  assert.match(levelModal, /function dismissInputModeHint\(\)[\s\S]*confirmInputModeHint/)
})

test('campaign menu is state preserving and has no native confirm', async () => {
  const levelModal = await readFile(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
  assert.match(levelModal, /setMenuOpen\(true\)/)
  assert.match(levelModal, /onOpenSettings\(/)
  assert.match(levelModal, /LEVEL NEU STARTEN/)
  assert.match(levelModal, /Level wirklich neu starten\?/)
  assert.match(levelModal, /setRestartConfirmOpen\(false\)/)
  assert.match(levelModal, /KAMPAGNE VERLASSEN/)
  assert.match(levelModal, /popstate/)
  assert.doesNotMatch(levelModal, /window\.confirm/)
})
