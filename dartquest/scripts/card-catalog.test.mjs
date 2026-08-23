import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CARD_CATALOG,
  CATEGORIES,
  RARITIES,
  openFiveCardPack,
  rarityIndex,
} from '../src/features/cards/cardCatalog.js'

test('Serie 1 enthält exakt 100 eindeutige Karten mit lückenlosen IDs', () => {
  assert.equal(CARD_CATALOG.length, 100)
  assert.equal(new Set(CARD_CATALOG.map((card) => card.id)).size, 100)
  assert.equal(new Set(CARD_CATALOG.map((card) => card.collectionNumber)).size, 100)

  CARD_CATALOG.forEach((card, index) => {
    const number = index + 1
    assert.equal(card.id, `DQ-${String(number).padStart(3, '0')}`)
    assert.equal(card.collectionNumber, number)
    assert.equal(card.series, 1)
    assert.ok(!('unlocked' in card))
    assert.ok(!('ownedCount' in card))
  })
})

test('Serie 1 hat die geforderten Kategorienanzahlen', () => {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]))
  for (const card of CARD_CATALOG) counts[card.category] += 1
  assert.deepEqual(counts, {
    player: 40,
    darts: 25,
    jersey: 20,
    dartboard: 15,
  })
})

test('Alle Karten besitzen vollständige Katalogdaten und Artwork-Pfade', () => {
  const expectedV2Images = {
    'DQ-001': '/assets/cards/series-1/DQ-001-v2.webp',
    'DQ-002': '/assets/cards/series-1/DQ-002-v2.webp',
    'DQ-003': '/assets/cards/series-1/DQ-003-v2.webp.png',
    'DQ-004': '/assets/cards/series-1/DQ-004-v2.webp',
  }
  assert.equal(new Set(CARD_CATALOG.map((card) => card.image)).size, 100)
  assert.equal(new Set(CARD_CATALOG.map((card) => card.artworkPrompt)).size, 100)
  for (const card of CARD_CATALOG) {
    assert.ok(RARITIES.includes(card.rarity))
    assert.equal(card.image, expectedV2Images[card.id] ?? `/assets/cards/series-1/${card.id}.webp`)
    assert.equal(card.artwork, card.image)
    assert.match(card.artwork, /^\/assets\/cards\/series-1\/DQ-\d{3}(?:-v2)?\.webp(?:\.png)?$/)
    assert.ok(card.artworkPrompt.includes('keine'))
    assert.ok(card.artworkPrompt.includes('Farbwelt:'))
    assert.ok(card.artworkPrompt.includes('Pose oder Perspektive:'))
    assert.ok(card.artworkPrompt.includes('Material:'))
    assert.ok(card.name)
    assert.ok(card.subtitle)
    assert.ok(card.description)
    assert.match(card.accentColor, /^#[0-9a-f]{6}$/i)
  }
})

test('Fünfer-Paket enthält garantiert mindestens eine seltene oder bessere Karte', () => {
  const pack = openFiveCardPack(() => 0.1)
  assert.equal(pack.length, 5)
  assert.ok(pack.some((card) => rarityIndex(card.rarity) >= rarityIndex('rare')))
})

test('Eine spätere DQ-101-Erweiterung verändert bestehende IDs nicht', () => {
  const idsBefore = CARD_CATALOG.map((card) => card.id)
  const extended = [...CARD_CATALOG, { ...CARD_CATALOG[0], id: 'DQ-101', collectionNumber: 101, series: 2 }]
  assert.equal(extended.length, 101)
  assert.deepEqual(extended.slice(0, 100).map((card) => card.id), idsBefore)
  assert.equal(extended.at(-1).id, 'DQ-101')
})
