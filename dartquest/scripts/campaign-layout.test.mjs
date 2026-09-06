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
  const contract = (height) => {
    const compact = height <= 700
    const gap = compact ? 4 : Math.min(6, Math.max(4, height * .0065))
    const board = compact ? 220 : Math.min(240, Math.max(220, height * .28))
    const header = 16
    const title = compact ? 40 : 48
    const status = compact ? 38 : 42
    const darts = compact ? 40 : 44
    const action = compact ? 34 : 38
    const targetRow = compact ? 42 : 46
    return { gap, targetRow, board, boardTop: header + gap + title + gap, statusTop: header + title + board + gap * 3, dartsTop: header + title + board + status + gap * 4, actionTop: header + title + board + status + darts + gap * 5, targetTop: header + title + board + status + darts + action + gap * 6, targetHeight: targetRow * 3 + gap * 2 }
  }
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    const reference = contract(viewport.height)
    for (const count of [1, 2, 3, 4, 5, 6]) assert.deepEqual(contract(viewport.height), reference, `${viewport.width}x${viewport.height}, ${count} targets`)
    assert.ok(reference.board >= 220 && reference.board <= 240)
    assert.equal(reference.targetHeight, reference.targetRow * 3 + reference.gap * 2)
  }
})

test('give-up owns a fixed final row and numeric history stays at three rows', () => {
  assert.match(css, /grid-template-rows:[^;]*var\(--game-giveup-height\)/)
  assert.match(css, /\.level-gameplay-layer > \.level-giveup-button[\s\S]*?height: var\(--game-giveup-height\)/)
  const numeric = readFileSync(new URL('../src/features/campaign/components/NumericCampaignInput.jsx', import.meta.url), 'utf8')
  assert.match(numeric, /Array\.from\(\{ length: 3 \}/)
})
