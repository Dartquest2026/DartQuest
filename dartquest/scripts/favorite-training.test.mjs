import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { changeFavoriteCombo, favoritePendingCount, hasOpenEntry, recordFavoriteSingle, saveFavoriteCombo, summary } from '../src/features/training/customTrainingRules.js'

const base = () => ({ game: 'favorite-double', favoriteDouble: 8, phase: 'playing', endAt: 10000, entries: [], score: '', favoriteComboCount: 0 })
test('single-hit button immediately records one hit using the configured double', () => {
  let run = recordFavoriteSingle(base(), 1)
  run = recordFavoriteSingle(run, 2)
  assert.deepEqual(run.entries, [{ points: 16, count: 1, double: 8 }, { points: 16, count: 1, double: 8 }])
  assert.equal(summary(run).seriesCount, 2)
})
test('three combo taps remain pending until OK and cannot be confirmed twice', () => {
  let run = base()
  for (let i = 0; i < 3; i++) run = changeFavoriteCombo(run, 1, 1)
  assert.equal(favoritePendingCount(run), 3)
  assert.equal(run.entries.length, 0)
  assert.ok(hasOpenEntry(run))
  assert.equal(recordFavoriteSingle(run, 1), run)
  run = saveFavoriteCombo(run)
  assert.deepEqual(run.entries, [{ points: 48, count: 3, double: 8 }])
  assert.equal(favoritePendingCount(run), 0)
  assert.equal(saveFavoriteCombo(run), run)
})
test('timeout rejects new hits but permits correcting and confirming a pending combo', () => {
  let run = changeFavoriteCombo(base(), 1, 1)
  run = changeFavoriteCombo(run, 1, 1)
  assert.equal(changeFavoriteCombo(run, 1, 10000), run)
  assert.equal(recordFavoriteSingle(run, 10000), run)
  run = changeFavoriteCombo(run, -1, 10000)
  assert.deepEqual(saveFavoriteCombo(run).entries, [{ points: 16, count: 1, double: 8 }])
  assert.equal(favoritePendingCount(changeFavoriteCombo(base(), -1, 1)), 0)
})
test('older pending points input is preserved as a combo on resume', () => {
  const run = { ...base(), favoriteDouble: 16, score: '128', favoriteComboCount: undefined }
  assert.equal(favoritePendingCount(run), 4)
  assert.deepEqual(saveFavoriteCombo(run).entries, [{ points: 128, count: 4, double: 16 }])
})
test('plan-selected double and pending combo survive storage and guest completion', async () => {
  const values = new Map()
  const source = readFileSync(new URL('../src/features/training/customTrainingStorage.js', import.meta.url), 'utf8').replace(/^import .*\r?\n/gm, '').replaceAll('export ', '')
  const storage = runInNewContext(source + '\n;({startCustomRun,saveCustomRun,loadCustomRun,completeCustomRun,localCustomHistory})', {
    crypto: { randomUUID: () => 'test-favorite-session' }, Date,
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
  })
  let run = JSON.parse(JSON.stringify(await storage.startCustomRun(null, 'favorite-double', 15, { favoriteDouble: 12 })))
  assert.equal(run.favoriteDouble, 12)
  assert.equal(run.minutes, 15)
  run = changeFavoriteCombo(run, 1, run.startedAt)
  run = changeFavoriteCombo(run, 1, run.startedAt)
  storage.saveCustomRun(null, run)
  run = JSON.parse(JSON.stringify(storage.loadCustomRun(null)))
  assert.equal(favoritePendingCount(run), 2)
  await storage.completeCustomRun(null, saveFavoriteCombo(run))
  assert.deepEqual(JSON.parse(JSON.stringify(storage.localCustomHistory(null)[0].payload.entries)), [{ points: 48, count: 2, double: 12 }])
})

test('favorite live totals distinguish single hits and saved combos without counting a pending combo',async()=>{
 const {favoriteSessionCounts}=await import('../src/features/training/customTrainingRules.js')
 assert.deepEqual(favoriteSessionCounts({entries:[]}),{singles:0,combos:0})
 assert.deepEqual(favoriteSessionCounts({entries:[...Array.from({length:5},()=>({count:1})),{count:3},{count:4}],favoriteComboCount:6}),{singles:5,combos:2})
 assert.deepEqual(favoriteSessionCounts({entries:[{count:1},{count:3}].slice(0,-1)}),{singles:1,combos:0})
})

test('favorite choices are exactly the ten requested doubles without duplicates',async()=>{
 const {FAVORITE_DOUBLES}=await import('../src/features/training/customTrainingRules.js')
 assert.deepEqual([...FAVORITE_DOUBLES],[20,18,16,12,10,8,6,4,2,1])
 assert.equal(new Set(FAVORITE_DOUBLES).size,10)
})
test('favorite record context uses the stored double and streak, including mixed historical targets',async()=>{
 const {favoriteDoubleContext,favoriteComboContext,favoriteBestCombo}=await import('../src/features/training/customTrainingRules.js')
 const run={entries:[{double:16,count:2,points:64},{double:8,count:4,points:64},{double:20,count:2,points:80}]}
 assert.equal(favoriteDoubleContext(run),'Gespielt: D16 · D8 · D20')
 assert.equal(favoriteComboContext(run),'D20 · 2 Treffer hintereinander')
 assert.equal(favoriteBestCombo(run).points,80)
 assert.equal(favoriteDoubleContext({entries:[{double:3,count:2,points:12}]}),'Gespielt: D3')
 assert.equal(favoriteDoubleContext({entries:[]}),'Gespieltes Doppel nicht erfasst')
 assert.equal(favoriteComboContext({entries:[{double:16,count:1,points:32}]}),'Noch keine Combo ab 2 Treffern')
})
