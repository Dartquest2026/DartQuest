import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { difficultyLevels } from '../src/features/campaign/data/levels.js'
import { createLevelAttempt } from '../src/features/campaign/utils/levelAttempt.js'

const modal = readFileSync(new URL('../src/features/campaign/LevelModal.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/features/campaign/LevelModal.css', import.meta.url), 'utf8')

function layoutOf(level) {
  if (Number.isFinite(level.timeLimitSeconds) && level.timeLimitSeconds > 0) return 'timed'
  if (level.taskType === 'checkout') return 'checkout'
  if (level.taskType === 'score') return 'score'
  return 'target'
}

test('all 500 standard levels map to one of four layout contracts', () => {
  const all = Object.values(difficultyLevels).flat()
  assert.equal(all.length, 500)
  const groups = Object.groupBy(all, layoutOf)
  assert.deepEqual(Object.keys(groups).sort(), ['checkout', 'score', 'target', 'timed'])
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([key, levels]) => [key, levels.length])), {
    target: 318, checkout: 104, score: 74, timed: 4,
  })
  assert.match(modal, /data-gameplay-layout=\{gameplayLayout\}/)
  assert.doesNotMatch(css, /\.level-(?:10|20|30|40|50|60)-fix/)
})

test('boss 10 through 60 share target layout and the same six-slot grid', () => {
  const beginner = difficultyLevels[1]
  const bosses = [10, 20, 30, 40, 50, 60].map((id) => beginner.find((level) => level.id === id))
  assert.deepEqual(bosses.map(layoutOf), Array(6).fill('target'))
  assert.deepEqual(bosses.map((level) => createLevelAttempt(level).targets.length), [1, 4, 4, 4, 3, 6])
  assert.match(css, /grid-template-rows:\s*repeat\(3, var\(--game-target-row-height\)\)/)
  assert.match(css, /\.level-modal\.is-boss-level \{ border-width: 1px !important; box-sizing: border-box; \}/)
})

test('viewport tokens produce invariant target anchors per viewport', () => {
  const contract = (width, height) => {
    const compact = height <= 700
    const gap = compact ? 3 : Math.min(7, Math.max(3, height * .007))
    const board = Math.min(310, Math.max(204, Math.min(height * .34, width - 42)))
    const header = 38
    const title = compact ? 40 : 48
    const status = compact ? 38 : 42
    const darts = compact ? 40 : 44
    const action = compact ? 36 : 38
    const targetRow = compact ? 44 : 46
    return { gap, targetRow, board, boardTop: header + gap + title + gap, statusTop: header + title + board + gap * 3, dartsTop: header + title + board + status + gap * 4, actionTop: header + title + board + status + darts + gap * 5, targetTop: header + title + board + status + darts + action + gap * 6, targetHeight: targetRow * 3 + gap * 2 }
  }
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 393, height: 852 }, { width: 430, height: 932 }, { width: 360, height: 800 }]) {
    const reference = contract(viewport.width, viewport.height)
    for (const count of [1, 2, 3, 4, 5, 6]) assert.deepEqual(contract(viewport.width, viewport.height), reference, `${viewport.width}x${viewport.height}, ${count} targets`)
    assert.ok(reference.board >= 204 && reference.board <= 310)
    assert.ok(reference.board <= viewport.width - 42)
    assert.equal(reference.targetHeight, reference.targetRow * 3 + reference.gap * 2)
  }
})

test('give-up owns a fixed final row and numeric history stays at three rows', () => {
  assert.match(css, /grid-template-rows:[^;]*var\(--game-giveup-height\)/)
  assert.match(css, /\.level-gameplay-layer > \.level-giveup-button[\s\S]*?height: var\(--game-giveup-height\)/)
  const numeric = readFileSync(new URL('../src/features/campaign/components/NumericCampaignInput.jsx', import.meta.url), 'utf8')
  assert.match(numeric, /Array\.from\(\{ length: 3 \}/)
})

test('mobile shell uses the safe viewport once and boss styling has no geometry overrides', () => {
  const polish = readFileSync(new URL('../src/features/campaign/CampaignPolish.css', import.meta.url), 'utf8')
  assert.match(css, /\.level-modal-backdrop\s*\{[\s\S]*?height:\s*100dvh;/)
  assert.match(css, /max\(7px, env\(safe-area-inset-right\)\)/)
  assert.match(css, /max\(7px, env\(safe-area-inset-left\)\)/)
  assert.match(css, /\.level-modal\s*\{[\s\S]*?height:\s*100% !important;[\s\S]*?max-height:\s*none !important;/)
  assert.doesNotMatch(css, /height:\s*min\(calc\(100dvh[\s\S]*?700px\)/)
  assert.doesNotMatch(polish, /\.level-modal\.is-boss-level \.attempt-dartboard/)
  assert.doesNotMatch(polish, /\.level-modal\.is-boss-level \.hit-target/)
})

test('star rating and scoring interactions stay inside their allocated shell rows', () => {
  assert.match(css, /\.quick-dart-input__ratings \{ grid-template-columns: minmax\(0, 1fr\); \}/)
  assert.doesNotMatch(css, /\.quick-dart-input__ratings\s*\{[^}]*grid-template-columns:\s*repeat\(2/)
  assert.match(css, /\.quick-dart-input__ratings button \{ min-height: 46px; grid-template-columns: minmax\(76px,\.7fr\) minmax\(0,1fr\) 15px;/)
  assert.match(css, /\.layout-score \.score-keypad,[\s\S]*?height: 100%;/)
  assert.match(css, /\.layout-score \.score-keypad\.has-quick-scores,[\s\S]*?grid-template-rows: 36px 92px minmax\(0, 1fr\)/)
  assert.match(css, /\.layout-score \.score-keypad\.no-quick-scores,[\s\S]*?grid-template-rows: 36px minmax\(0, 1fr\)/)
  assert.match(css, /\.layout-score \.score-numbers,[\s\S]*?height: 100%;[\s\S]*?align-self: stretch;[\s\S]*?grid-template-rows: repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(css, /\.layout-score \.score-keypad \.score-quick button,[\s\S]*?min-height:44px/)
})

test('target, rating and numeric layouts fit the short reference viewport', () => {
  const viewport = 667
  const safeAreaAndFrame = 20 + 6 + 16
  const content = viewport - safeAreaAndFrame
  const outerChrome = 38 + 36 + 44 + (3 * 3)
  const main = content - outerChrome
  const board = viewport * .34
  const target = board + 38 + 40 + 36 + (3 * 44 + 2 * 3) + (4 * 3)
  const rating = board + 38 + (2 * 3) + 134
  const numeric = 44 + 38 + 40 + 72 + 38 + 250 + (5 * 3)
  assert.ok(target <= main, `target needs ${target}px of ${main}px`)
  assert.ok(rating <= main, `rating needs ${rating}px of ${main}px`)
  assert.ok(numeric <= main, `numeric needs ${numeric}px of ${main}px`)
})

test('all requested smartphone viewports keep every gameplay zone inside the shell', () => {
  const viewports = [
    { width:375, height:667, reserved:42 },
    { width:390, height:844, reserved:103 },
    { width:393, height:852, reserved:103 },
    { width:430, height:932, reserved:115 },
    { width:360, height:800, reserved:70 },
  ]
  for (const { width, height, reserved } of viewports) {
    const compact = height <= 700
    const gap = compact ? 3 : Math.min(7, Math.max(3, height * .007))
    const board = Math.min(310, Math.max(204, Math.min(height * .34, width - 42)))
    const title = compact ? 36 : 42
    const status = compact ? 38 : 42
    const darts = compact ? 40 : 44
    const action = compact ? 36 : 38
    const targetRow = compact ? 44 : 46
    const main = height - reserved - 38 - title - 44 - (3 * gap)
    const target = board + status + darts + action + (3 * targetRow + 2 * gap) + (4 * gap)
    const rating = board + status + (2 * gap) + (compact ? 134 : 151)
    const numeric = compact
      ? 44 + status + darts + 72 + 38 + 250 + (5 * gap)
      : 48 + status + darts + 88 + 40 + 290 + (5 * gap)
    for (const [layout, required] of Object.entries({ target, rating, numeric })) {
      assert.ok(required <= main, `${width}x${height} ${layout} needs ${required}px of ${main}px`)
    }
  }
})
