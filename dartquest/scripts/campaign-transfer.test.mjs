import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  campaignTransferLimits,
  createCampaignTransferCode,
  importCampaignTransfer,
  previewCampaignTransfer,
} from '../src/features/profile/campaignTransfer.js'

class MemoryStorage {
  data = new Map()
  getItem(key) { return this.data.get(key) ?? null }
  setItem(key, value) { this.data.set(key, String(value)) }
}

globalThis.window = {
  dispatchEvent() {},
}
globalThis.CustomEvent = class CustomEvent {
  constructor(type) { this.type = type }
}

const key = (difficulty) => `dartquest-campaign-progress-singleplayer-difficulty-${difficulty}`
const progress = (results) => JSON.stringify({ unlockedLevel: 1, results, xp: 0, coins: 0 })

test('same account transfers levels 1-4 and unlocks level 5 without profile values', async () => {
  const phone = new MemoryStorage()
  phone.setItem(key(1), progress({
    1: { stars: 2, darts: 12, completedAt: '2026-01-04T00:00:00.000Z' },
    2: { stars: 2, darts: 11 },
    3: { stars: 3, darts: 10 },
    4: { stars: 1, darts: 14 },
  }))
  const code = await createCampaignTransferCode('account-a', phone)
  assert.match(code, /^DQ1-/)
  assert.doesNotMatch(code, /account-a|email|token/i)

  const pc = new MemoryStorage()
  const preview = await previewCampaignTransfer(code, 'account-a', pc)
  assert.deepEqual({ added: preview.added, improved: preview.improved }, { added: 4, improved: 0 })
  importCampaignTransfer(preview, pc)
  const imported = JSON.parse(pc.getItem(key(1)))
  assert.equal(imported.unlockedLevel, 5)
  assert.equal(imported.results[1].completedAt, '2026-01-04T00:00:00.000Z')
  assert.equal(imported.xp, 0)
  assert.equal(imported.coins, 0)
})

test('merge keeps higher stars, lower darts and earliest completion', async () => {
  const source = new MemoryStorage()
  source.setItem(key(2), progress({
    1: { stars: 3, darts: 9, completedAt: '2026-02-02T00:00:00.000Z' },
  }))
  const target = new MemoryStorage()
  target.setItem(key(2), JSON.stringify({
    unlockedLevel: 2,
    results: { 1: { stars: 2, darts: 12, completedAt: '2026-01-01T00:00:00.000Z' } },
    xp: 77,
    coins: 88,
  }))
  const preview = await previewCampaignTransfer(
    await createCampaignTransferCode('account-a', source),
    'account-a',
    target,
  )
  assert.equal(preview.improved, 1)
  importCampaignTransfer(preview, target)
  const merged = JSON.parse(target.getItem(key(2)))
  assert.equal(merged.results[1].stars, 3)
  assert.equal(merged.results[1].darts, 9)
  assert.equal(merged.results[1].completedAt, '2026-01-01T00:00:00.000Z')
  assert.equal(merged.xp, 77)
  assert.equal(merged.coins, 88)

  const worse = new MemoryStorage()
  worse.setItem(key(2), progress({ 1: { stars: 2, darts: 14 } }))
  const repeated = await previewCampaignTransfer(
    await createCampaignTransferCode('account-a', worse),
    'account-a',
    target,
  )
  importCampaignTransfer(repeated, target)
  assert.equal(JSON.parse(target.getItem(key(2))).results[1].darts, 9)
})

test('re-import is idempotent and does not create rewards', async () => {
  const source = new MemoryStorage()
  source.setItem(key(3), progress({ 1: { stars: 4, darts: 6 } }))
  const target = new MemoryStorage()
  const code = await createCampaignTransferCode('account-a', source)
  importCampaignTransfer(await previewCampaignTransfer(code, 'account-a', target), target)
  const second = await previewCampaignTransfer(code, 'account-a', target)
  assert.deepEqual({ added: second.added, improved: second.improved }, { added: 0, improved: 0 })
  importCampaignTransfer(second, target)
  const imported = JSON.parse(target.getItem(key(3)))
  assert.equal(imported.xp, 0)
  assert.equal(imported.coins, 0)
})

test('wrong account, corruption and excessive input are rejected without writes', async () => {
  const source = new MemoryStorage()
  source.setItem(key(1), progress({ 1: { stars: 1, darts: 20 } }))
  const target = new MemoryStorage()
  const code = await createCampaignTransferCode('account-a', source)
  await assert.rejects(previewCampaignTransfer(code, 'account-b', target), /anderen Account/)
  await assert.rejects(previewCampaignTransfer(code.slice(0, -1) + 'x', 'account-a', target), /beschädigt/)
  await assert.rejects(
    previewCampaignTransfer('DQ1-' + 'a'.repeat(campaignTransferLimits.maxCodeLength), 'account-a', target),
    /zu groß/,
  )
  assert.equal(target.data.size, 0)
})

test('client remains local-only, reset has no campaign RPC and settings entry stays wired', async () => {
  const [campaign, reset, profileStorage, home, vite, settings, profile, app, bottomNav] = await Promise.all([
    readFile(new URL('../src/features/campaign/Campaign.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/profile/progressReset.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/auth/profileStorage.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/home/Home.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../vite.config.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/settings/Settings.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/profile/Profile.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/shared/components/BottomNav.jsx', import.meta.url), 'utf8'),
  ])
  assert.doesNotMatch(campaign + reset, /complete_campaign_level|reset_own_campaign_progress|merge_campaign_progress|campaign_progress/)
  assert.match(campaign, /localStorage\.setItem\(CAMPAIGN_STORAGE_KEY/)
  assert.match(reset, /localStorage\.removeItem/)
  assert.match(profileStorage, /resetProfileProgressFields/)
  assert.match(home, /home-version/)
  assert.match(home, /onOpenSettings/)
  assert.match(vite, /packageJson\.version/)
  assert.match(settings, /SPIELSTAND &amp; GERÄTE/)
  assert.match(settings, /CampaignTransfer/)
  assert.doesNotMatch(profile, /CampaignTransfer/)
  assert.match(app, /activePage === 'settings'/)
  assert.match(bottomNav, /'settings'/)
})
