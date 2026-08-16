import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createConfirmedCoinAnimation } from '../src/features/campaign/coinAnimation.js'

test('confirmed reward creates one exact 120 to 145 animation', () => {
  assert.deepEqual(createConfirmedCoinAnimation({ beforeCoins: 120, awardedCoins: 25, afterCoins: 145, rewardConfirmed: true, id: 1 }), { id: 1, from: 120, awarded: 25, to: 145 })
})

test('zero reward, save failure and contradictory totals do not animate', () => {
  assert.equal(createConfirmedCoinAnimation({ beforeCoins: 120, awardedCoins: 0, afterCoins: 120, rewardConfirmed: true, id: 1 }), null)
  assert.equal(createConfirmedCoinAnimation({ beforeCoins: 120, awardedCoins: 25, afterCoins: 145, rewardConfirmed: false, id: 2 }), null)
  assert.equal(createConfirmedCoinAnimation({ beforeCoins: 120, awardedCoins: 25, afterCoins: 150, rewardConfirmed: true, id: 3 }), null)
})

test('coin presentation contains no reward, profile, save or Supabase mutation', async () => {
  const component = await readFile(new URL('../src/features/campaign/components/CampaignCoinCounter.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(component, /onProfileRewards|localStorage|supabase|\.rpc\(|\.update\(|\.insert\(/i)
  assert.match(component, /aria-live="polite"/)
  assert.match(component, /cancelAnimationFrame/)
  assert.match(component, /animation\.to/)
})
