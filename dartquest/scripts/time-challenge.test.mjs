import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { clampTargetTime, summarizeAttempts, timeChallenges } from '../src/features/timeChallenge/timeChallenges.js'
import { getTimeChallengeTone, runningElapsedMs, timerSnapshot } from '../src/features/timeChallenge/timeChallengeTimer.js'

test('Time Challenge besitzt drei datengetriebene Übungen', () => {
  assert.deepEqual(timeChallenges.map((item)=>item.id), ['singles-around-clock','doubles-around-clock','triples-around-clock'])
  assert.equal(new Set(timeChallenges.map((item)=>item.defaultTargetTimeSeconds)).size, 1)
})
test('Zielzeit wird in 30-Sekunden-Schritten sicher begrenzt', () => { assert.equal(clampTargetTime(44),30); assert.equal(clampTargetTime(419),420); assert.equal(clampTargetTime(99999),3600) })
test('aktive Laufzeit schließt Pausen aus', () => {
  let accumulated=runningElapsedMs(0,1000,61000)
  assert.equal(accumulated,60000)
  accumulated=runningElapsedMs(accumulated,181000,195000)
  assert.equal(accumulated,74000)
})
test('nach Ablauf läuft die Challenge in Overtime weiter', () => {
  assert.deepEqual(timerSnapshot(300000,338000), {remainingMs:0,overtimeMs:38000,overtime:true,progress:0})
})
test('Warnfarben wechseln exakt an 60, 30, 10 und 0 Sekunden', () => {
  const cases=[[62,'is-normal'],[61,'is-normal'],[60,'is-warning'],[59,'is-warning'],[31,'is-warning'],[30,'is-critical'],[11,'is-critical'],[10,'is-last-seconds'],[9,'is-last-seconds'],[1,'is-last-seconds'],[0,'is-overtime']]
  for (const [seconds,tone] of cases) assert.equal(getTimeChallengeTone(seconds),tone,String(seconds))
  assert.equal(getTimeChallengeTone(42,true),'is-overtime')
})
test('Bestzeit, letzte Zeit und History-Anzahl werden gebündelt abgeleitet', () => {
  const attempts=[620,592,614].map((seconds,index)=>({challenge_id:'singles-around-clock',elapsed_time_ms:seconds*1000,target_time_ms:420000,completed_at:String(3-index)}))
  const summary=summarizeAttempts(attempts)['singles-around-clock']
  assert.equal(summary.lastTimeSeconds,620); assert.equal(summary.bestTimeSeconds,592); assert.equal(summary.attempts,3)
})
test('Migration schützt private History mit RLS und expliziten Grants', () => {
  const sql=readFileSync(new URL('../supabase/migrations/20260902000000_time_challenge_attempts.sql',import.meta.url),'utf8')
  assert.match(sql,/enable row level security/); assert.match(sql,/to authenticated/); assert.match(sql,/\(select auth\.uid\(\)\) = user_id/); assert.match(sql,/grant select, insert/); assert.doesNotMatch(sql,/grant all/i)
})
test('Modus steht direkt hinter der Rivalen-Kampagne', () => {
  const source=readFileSync(new URL('../src/features/campaignModes/CampaignModes.jsx',import.meta.url),'utf8')
  assert.ok(source.indexOf("['timeChallenge'") > source.indexOf("['rival'")); assert.ok(source.indexOf("['timeChallenge'") < source.indexOf("['cameraTest'"))
})
