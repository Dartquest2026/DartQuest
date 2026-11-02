import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../src/features/training/customTrainingStorage.js', import.meta.url), 'utf8').replace(/^import .*\r?\n/gm, '').replaceAll('export ', '')
function fixture(offset, minutes) {
  let serverNow = 1800000000000
  const values = new Map()
  const id = 'clock-skew-session'
  let serverEnd
  class DeviceDate extends Date { static now() { return serverNow + offset } }
  const supabase = { async rpc(name, args) {
    if (name === 'start_custom_training') {
      const started = serverNow
      serverEnd = started + minutes * 60000
      serverNow += 875 // response delay
      return { data: { started_at: new Date(started).toISOString(), end_at: new Date(serverEnd).toISOString() }, error: null }
    }
    if (serverNow < serverEnd) return { error: { message: 'Trainingszeit noch nicht abgelaufen' } }
    return { data: { id, created_at: new Date(serverEnd).toISOString(), payload: args.p_payload, status: 'completed' }, error: null }
  } }
  const storage = runInNewContext(source + '\n;({startCustomRun,loadCustomRun,completeCustomRun,localCustomHistory})', { Date: DeviceDate, crypto: { randomUUID: () => id }, localStorage: { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) }, supabase })
  return { storage, advance: ms => { serverNow += ms }, now: () => DeviceDate.now() }
}
for (const offset of [-120000, 0, 120000]) for (const minutes of [5,10,15]) {
  test(`confirmed ${minutes}-minute run completes with device clock offset ${offset}ms`, async () => {
    const f = fixture(offset,minutes)
    const run = await f.storage.startCustomRun('user','bulls-warm-up',minutes)
    assert.equal(run.startedAt,f.now())
    assert.equal(run.endAt-f.now(),minutes*60000)
    assert.equal(f.storage.loadCustomRun('user').endAt,run.endAt)
    await assert.rejects(f.storage.completeCustomRun('user',run),/Trainingszeit/)
    f.advance(minutes*60000)
    assert.equal(f.now(),run.endAt)
    const result=await f.storage.completeCustomRun('user',run)
    assert.equal(result.status,'completed')
    await f.storage.completeCustomRun('user',run)
    assert.equal(f.storage.localCustomHistory('user').length,1)
  })
}
test('Around the Clock stopwatch starts on confirmation even with device clock skew', async () => {
  const f=fixture(120000,0)
  const run=await f.storage.startCustomRun('user','around-the-clock',0)
  assert.equal(run.startedAt,f.now())
  assert.equal(run.endAt,null)
})
