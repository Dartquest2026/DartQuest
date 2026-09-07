import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { difficultyLevels } from '../src/features/campaign/data/levels.js'
import { getWorldPosition } from '../src/features/campaign/data/worldMaps.js'
import { createLevelAttempt, fillCurrentVisitWithMisses, isAttemptComplete, registerTargetHit, undoLastDart } from '../src/features/campaign/utils/levelAttempt.js'

test('mobile campaign map and action card keep stable independent regions', () => {
  const css = readFileSync(new URL('../src/features/campaign/Campaign.css', import.meta.url), 'utf8')
  const finalMobileLayout = css.slice(css.lastIndexOf('/* Final compact campaign layout'))

  assert.match(finalMobileLayout, /\.app-shell > \.dq-campaign \.dq-map\s*\{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?min-height:\s*320px;/)
  assert.match(finalMobileLayout, /\.app-shell > \.dq-campaign \.dq-level-card\s*\{[\s\S]*?flex:\s*0 0 92px;[\s\S]*?height:\s*92px;[\s\S]*?max-height:\s*92px;/)
  assert.match(finalMobileLayout, /\.dq-level-task\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/)

  for (const world of [1, 6, 9, 10]) {
    assert.deepEqual([1, 5, 10].map((localLevel) => getWorldPosition(world, (world - 1) * 10 + localLevel)), [
      { id: 1, x: 12, y: 10 },
      { id: 5, x: 65, y: 46 },
      { id: 10, x: 84, y: 88 },
    ])
  }
})

test('Schwer Level 61 rendert und akzeptiert S1 bis S5 vollständig', () => {
  const level = difficultyLevels[4].find((entry) => entry.id === 61)
  let attempt = createLevelAttempt(level)
  assert.deepEqual(attempt.targets.map((target) => target.label), ['S1','S2','S3','S4','S5'])
  for (const target of attempt.targets) attempt = registerTargetHit(attempt, target.id)
  assert.equal(attempt.hitCounters.S5, 1)
  assert.equal(isAttemptComplete(attempt), true)
})

test('Target-Grid reserviert sechs feste Slots und zentriert kein ungerades Ziel', () => {
  const jsx = readFileSync(new URL('../src/features/campaign/components/HitCounter.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/features/campaign/components/HitCounter.css', import.meta.url), 'utf8')
  assert.match(jsx, /targetSlotCount = targetPageSize/)
  assert.match(jsx, /targetPageSize = 6/)
  assert.match(jsx, /attempt\.targets\.slice\(targetPageStart, targetPageStart \+ targetPageSize\)/)
  assert.match(jsx, /Math\.ceil\(targetSlotCount \/ 2\)/)
  assert.doesNotMatch(jsx, /slice\(0,\s*4\)/)
  assert.match(css, /repeat\(var\(--target-rows,2\),46px\)/)
  assert.doesNotMatch(css, /has-centered-last/)
  assert.doesNotMatch(css, /grid-column:1 \/ -1/)
  assert.match(css, /hit-target-content[^}]*justify-content:center/)
  assert.doesNotMatch(css, /hit-target[^}]*justify-content:space-between/)
})

test('bestehende Kampagne meldet ihre maximale Anzahl unterschiedlicher Targets', () => {
  let maximum = { count:0, difficulty:null, level:null }
  for (const [difficulty, levels] of Object.entries(difficultyLevels)) {
    for (const level of levels.filter((entry) => entry.taskType === 'targets')) {
      const count = createLevelAttempt(level).targets.length
      if (count > maximum.count) maximum = { count, difficulty:Number(difficulty), level:level.id }
    }
  }
  assert.deepEqual(maximum, { count:20, difficulty:4, level:67 })
})

test('Long-Press füllt nur offene Darts und Undo bleibt dartweise', () => {
  const level = difficultyLevels[1].find((entry) => entry.id === 10)

  const empty = fillCurrentVisitWithMisses(createLevelAttempt(level))
  assert.equal(empty.totalDarts, 3)
  assert.deepEqual(empty.hitHistory.map((entry) => entry.miss), [true, true, true])
  assert.equal(empty.visits, 2)

  const oneHit = registerTargetHit(createLevelAttempt(level), createLevelAttempt(level).targets[0].id)
  const completed = fillCurrentVisitWithMisses(oneHit)
  assert.equal(completed.totalDarts, 3)
  assert.deepEqual(completed.hitHistory.map((entry) => entry.miss === true), [false, true, true])

  const undone = undoLastDart(completed)
  assert.equal(undone.totalDarts, 2)
  assert.deepEqual(undone.hitHistory.map((entry) => entry.miss === true), [false, true])
})

test('Miss-Button trennt Tap, Hold, Bewegung und Pointer-Cancel ohne Folge-Click', () => {
  const source = readFileSync(new URL('../src/shared/hooks/useMissHold.js', import.meta.url), 'utf8')
  assert.match(source, /MISS_HOLD_DURATION_MS = 600/)
  assert.match(source, /elapsed \/ MISS_HOLD_DURATION_MS/)
  assert.match(source, /progress >= 1\) completeMissHold\(button\)/)
  assert.match(source, /completeMissHold[\s\S]*?360deg[\s\S]*?onFill\(\)/)
  assert.match(source, /cancelMissHold[\s\S]*?removeProperty\('--miss-hold-angle'\)/)
  assert.match(source, /Math\.hypot\([\s\S]*?> 12\) cancelMissHold\(\)/)
  assert.match(source, /onPointerCancel:cancelMissHold/)
  assert.match(source, /suppressClick\.current = true/)
  assert.match(source, /if \(suppressClick\.current\) \{[\s\S]*?event\.preventDefault\(\)/)
})

test('Target-Dartslots unterscheiden offen, Treffer und Miss ohne Größenänderung', () => {
  const slots = readFileSync(new URL('../src/features/campaignModes/components/CampaignGameUI.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/features/campaign/components/HitCounter.css', import.meta.url), 'utf8')
  assert.match(slots, /value == null \? 'open' : value === 0 \? 'miss' : 'hit'/)
  assert.match(slots, /state === 'miss' \? 'MISS'/)
  assert.match(css, /\.dart-slot\.is-open/)
  assert.match(css, /\.dart-slot\.is-hit/)
  assert.match(css, /\.dart-slot\.is-miss/)
})

test('jede strukturierte Sequenz verweist auf existierende und schaltbare Targets', () => {
  for (const levels of Object.values(difficultyLevels)) {
    for (const level of levels.filter((entry) => entry.taskType === 'targets')) {
      let attempt = createLevelAttempt(level)
      for (const expected of attempt.sequence) {
        assert.ok(attempt.targets.some((target) => target.id === expected), `Level ${level.id}: ${expected}`)
        const next = registerTargetHit(attempt, expected)
        assert.notEqual(next, attempt, `Level ${level.id}: active target ${expected} must be clickable`)
        attempt = next
      }
    }
  }
})

test('Boss 50 resolves 5, 20 and Bull despite legacy number-prefixed sequence ids', () => {
  const level = difficultyLevels[1].find((entry) => entry.id === 50)
  let attempt = createLevelAttempt(level)
  assert.deepEqual(attempt.sequence, ['5', '20', 'BULL'])
  for (const id of attempt.sequence) attempt = registerTargetHit(attempt, id)
  assert.equal(isAttemptComplete(attempt), true)
})

test('Long-Press ring and sequence preview reuse bounded central animations', () => {
  const counter = readFileSync(new URL('../src/features/campaign/components/HitCounter.jsx', import.meta.url), 'utf8')
  const counterCss = readFileSync(new URL('../src/features/campaign/components/HitCounter.css', import.meta.url), 'utf8')
  const board = readFileSync(new URL('../src/features/campaign/components/Dartboard.jsx', import.meta.url), 'utf8')
  const preview = readFileSync(new URL('../src/features/campaign/components/useSequencePreview.js', import.meta.url), 'utf8')
  const quick = readFileSync(new URL('../src/features/campaign/components/QuickDartInput.jsx', import.meta.url), 'utf8')
  assert.match(preview, /setInterval\([\s\S]*?, 550\)/)
  assert.match(preview, /dataset\.animations !== 'off'/)
  assert.match(counter, /useSequencePreview\(attempt\)/)
  assert.match(quick, /useSequencePreview\(attempt\)/)
  assert.match(counter, /className=\{`hit-counter-next-visit[\s\S]*?is-holding/)
  assert.match(counterCss, /conic-gradient\(#ff8f96 var\(--miss-hold-angle\)/)
  assert.match(counterCss, /animation:missHoldProgress \.6s linear forwards/)
  assert.match(board, /previewTargetId/)
  assert.match(board, /dartboard-segment--active/)
  assert.match(board, /dartboard-segment--preview/)
})
