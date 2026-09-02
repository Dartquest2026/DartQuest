import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { difficultyLevels } from '../src/features/campaign/data/levels.js'
import { createLevelAttempt, isAttemptComplete, registerTargetHit } from '../src/features/campaign/utils/levelAttempt.js'

test('Schwer Level 61 rendert und akzeptiert S1 bis S5 vollständig', () => {
  const level = difficultyLevels[4].find((entry) => entry.id === 61)
  let attempt = createLevelAttempt(level)
  assert.deepEqual(attempt.targets.map((target) => target.label), ['S1','S2','S3','S4','S5'])
  for (const target of attempt.targets) attempt = registerTargetHit(attempt, target.id)
  assert.equal(attempt.hitCounters.S5, 1)
  assert.equal(isAttemptComplete(attempt), true)
})

test('Target-Grid erzeugt dynamische Reihen und zentriert ein fünftes Ziel', () => {
  const jsx = readFileSync(new URL('../src/features/campaign/components/HitCounter.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/features/campaign/components/HitCounter.css', import.meta.url), 'utf8')
  assert.match(jsx, /Math\.max\(4, visibleTargets\.length\)/)
  assert.match(jsx, /targetPageSize = 6/)
  assert.match(jsx, /attempt\.targets\.slice\(targetPageStart, targetPageStart \+ targetPageSize\)/)
  assert.match(jsx, /Math\.ceil\(targetSlotCount \/ 2\)/)
  assert.doesNotMatch(jsx, /slice\(0,\s*4\)/)
  assert.match(css, /repeat\(var\(--target-rows,2\),46px\)/)
  assert.match(css, /has-centered-last \.hit-target:last-child/)
  assert.match(css, /grid-column:1 \/ -1/)
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
