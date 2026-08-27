import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDecimal, percentage, starsSummary } from '../src/features/leaderboard/leaderboardFormat.js'
test('stars use completed levels as the maximum',()=>assert.equal(starsSummary({completedLevels:200,earnedStars:612}),'★ 612 / 800 · 76,5 %'))
test('checkout rates are weighted from totals',()=>{assert.equal(formatDecimal(percentage(17,60)),'28,3');assert.equal(percentage(0,0),null)})
test('campaigns without progress render a dash',()=>assert.equal(starsSummary({completedLevels:null,earnedStars:null}),'–'))
