import { useMemo, useState } from 'react'
import { CARD_CATALOG, CATEGORIES, CATEGORY_LABELS, PACK_PRICE, RARITIES, RARITY_LABELS, SERIES, openFiveCardPack, rarityIndex } from './cardCatalog'
import { addCards, loadCards } from './cardStorage'
import './CardCollection.css'
import './CardDetail.css'

const ALL = 'all'
// These four files are temporary category placeholders, never individual card artwork.
const PLACEHOLDER_ART = {
  player: '/assets/cards/placeholders/player.png',
  darts: '/assets/cards/placeholders/darts.png',
  jersey: '/assets/cards/placeholders/jersey.png',
  dartboard: '/assets/cards/placeholders/dartboard.png',
}
const STAT_LABELS = {
  player: ['Average', 'Checkout', 'Präzision'],
  darts: ['Balance', 'Griff', 'Präzision'],
  jersey: ['Style', 'Fokus', 'Prestige'],
  dartboard: ['Design', 'Präzision', 'Effekt'],
}

function formatNumber(card) {
  return `#${String(card.collectionNumber).padStart(3, '0')}/${CARD_CATALOG.length}`
}

function cardStats(card) {
  const base = 48 + rarityIndex(card.rarity) * 9
  return STAT_LABELS[card.category].map((label, index) => ({
    label,
    value: Math.min(100, base + ((card.collectionNumber * (index + 3)) % 13)),
  }))
}

function starCount(card) {
  return Math.min(5, Math.max(1, rarityIndex(card.rarity) + 1))
}

function matchesText(card, search) {
  const term = search.trim().toLowerCase()
  return !term || `${card.id} ${card.name} ${card.subtitle} ${card.description}`.toLowerCase().includes(term)
}

function sortCards(cards, sort, inventory, lastObtainedAt) {
  return [...cards].sort((left, right) => {
    if (sort === 'recent') {
      const difference = (lastObtainedAt[right.id] || '').localeCompare(lastObtainedAt[left.id] || '')
      if (difference) return difference
    }
    if (sort === 'rarity') {
      const difference = rarityIndex(right.rarity) - rarityIndex(left.rarity)
      if (difference) return difference
    }
    if (sort === 'owned') {
      const difference = (inventory[right.id] || 0) - (inventory[left.id] || 0)
      if (difference) return difference
    }
    return left.collectionNumber - right.collectionNumber
  })
}

export default function CardCollection({ activeProfile, onSpendCoins, onBack }) {
  const [state, setState] = useState(() => loadCards(activeProfile?.id))
  const [tab, setTab] = useState('collection')
  const [rarity, setRarity] = useState(ALL)
  const [category, setCategory] = useState(ALL)
  const [series, setSeries] = useState(ALL)
  const [sort, setSort] = useState('number')
  const [search, setSearch] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [opened, setOpened] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const inventory = useMemo(() => state.inventory || {}, [state.inventory])
  const lastObtainedAt = useMemo(() => state.lastObtainedAt || {}, [state.lastObtainedAt])
  const owned = CARD_CATALOG.filter((card) => (inventory[card.id] || 0) > 0).length
  const progressPercent = CARD_CATALOG.length ? Math.round((owned / CARD_CATALOG.length) * 100) : 0
  const visibleCards = useMemo(() => sortCards(CARD_CATALOG.filter((card) => (
    (rarity === ALL || card.rarity === rarity) &&
    (category === ALL || card.category === category) &&
    (series === ALL || String(card.series) === series) && matchesText(card, search)
  )), sort, inventory, lastObtainedAt), [category, inventory, lastObtainedAt, rarity, search, series, sort])

  function openPack(free = false) {
    const pack = openFiveCardPack()
    const baseState = free ? { ...state, unopened: Math.max(0, (state.unopened || 0) - 1) } : state
    setState(addCards(activeProfile?.id, baseState, pack))
    setOpened(pack)
  }

  async function buyPack() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await onSpendCoins(PACK_PRICE)
      openPack(false)
      setConfirm(false)
    } catch (reason) {
      setError(reason?.message || 'Kauf fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="cards-screen">
    <header className="cards-header">
      <button type="button" onClick={onBack} aria-label="Zurück">‹</button>
      <div><span>DARTQUEST</span><h1>Meine Sammlung</h1></div>
      <strong>{owned} / {CARD_CATALOG.length}</strong>
    </header>
    <section className="cards-progress" aria-label="Sammlungsfortschritt"><span>{progressPercent}% gesammelt</span><i><b style={{ width: `${progressPercent}%` }} /></i></section>
    <nav className="cards-tabs">
      <button type="button" className={tab === 'collection' ? 'active' : ''} onClick={() => setTab('collection')}>SAMMLUNG</button>
      <button type="button" className={tab === 'packs' ? 'active' : ''} onClick={() => setTab('packs')}>KARTENPAKETE</button>
    </nav>

    {tab === 'collection' ? <>
      <section className="card-filters">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Karte suchen" aria-label="Karte suchen" />
        <select value={series} onChange={(event) => setSeries(event.target.value)} aria-label="Serie filtern"><option value={ALL}>Alle Serien</option>{SERIES.map((item) => <option key={item.id} value={String(item.id)}>{item.label}</option>)}</select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Kartenart filtern"><option value={ALL}>Alle Arten</option>{CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</select>
        <select value={rarity} onChange={(event) => setRarity(event.target.value)} aria-label="Seltenheit filtern"><option value={ALL}>Alle Seltenheiten</option>{RARITIES.map((item) => <option key={item} value={item}>{RARITY_LABELS[item]}</option>)}</select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sortierung"><option value="number">Nach Nummer</option><option value="rarity">Nach Seltenheit</option><option value="recent">Zuletzt erhalten</option><option value="owned">Nach Exemplaren</option></select>
      </section>
      <section className="card-grid" aria-label="Sammelkarten">{visibleCards.map((card) => <CollectionCard key={card.id} card={card} count={inventory[card.id] || 0} onSelect={setSelectedCard} />)}</section>
    </> : <PackShop state={state} activeProfile={activeProfile} busy={busy} error={error} onFree={() => openPack(true)} onBuy={() => setConfirm(true)} />}

    {confirm && <div className="card-overlay"><section><h2>Paket für {PACK_PRICE} Coins kaufen?</h2><button type="button" onClick={() => setConfirm(false)}>ABBRECHEN</button><button type="button" disabled={busy} onClick={buyPack}>KAUFEN</button></section></div>}
    {opened && <OpenedPack cards={opened} onClose={() => { setOpened(null); setTab('collection') }} />}
    {selectedCard && <CardDetail card={selectedCard} count={inventory[selectedCard.id] || 0} onClose={() => setSelectedCard(null)} />}
  </main>
}

function CollectionCard({ card, count, onSelect }) {
  const owned = count > 0
  return <button type="button" disabled={!owned} onClick={() => onSelect(card)} className={`collect-card rarity-${rarityIndex(card.rarity)} ${owned ? 'owned' : 'locked'}`} style={{ '--card-accent': card.accentColor }}>
    <span className="mini-rarity">{owned ? RARITY_LABELS[card.rarity] : card.id}</span>
    {owned ? <><CardArtwork card={card} /><strong>{card.name}</strong><b>{formatNumber(card)}</b><StarRow card={card} />{count > 1 && <em>×{count}</em>}</> : <><span className="locked-silhouette" aria-hidden="true" /><strong>Noch nicht entdeckt</strong><b>{formatNumber(card)}</b></>}
  </button>
}

function CardArtwork({ card, className = '' }) {
  const source = card.image || card.artwork
  return <span className={`card-art card-art-${card.category} ${className}`}><img src={source} data-placeholder={PLACEHOLDER_ART[card.category]} onError={(event) => { const placeholder = event.currentTarget.dataset.placeholder; if (!event.currentTarget.src.endsWith(placeholder)) event.currentTarget.src = placeholder }} loading="lazy" decoding="async" alt={`${card.name} – ${CATEGORY_LABELS[card.category]}`} /></span>
}

function StarRow({ card }) {
  const filled = starCount(card)
  return <span className="card-stars" aria-label={`${filled} von 5 Sternen`}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < filled ? 'filled' : ''}>★</i>)}</span>
}

function CardStats({ card }) {
  return <div className="card-stats">{cardStats(card).map((stat, index) => <div key={stat.label}><span aria-hidden="true" className={`stat-icon stat-icon-${index}`} /><small>{stat.label}</small><strong>{stat.value}</strong></div>)}</div>
}

function CardDetail({ card, count, onClose }) {
  return <div className="card-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="card-detail-title" onClick={onClose}>
    <section className={`card-detail rarity-${rarityIndex(card.rarity)}`} style={{ '--card-accent': card.accentColor }} onClick={(event) => event.stopPropagation()}>
      <button className="card-detail-close" type="button" aria-label="Kartenansicht schließen" onClick={onClose}>×</button>
      <div className="detail-rarity">{RARITY_LABELS[card.rarity]}</div><CardArtwork card={card} className="detail-art" />
      <div className="detail-name"><h2 id="card-detail-title">{card.name}</h2><span>{formatNumber(card)}</span></div>
      <p className="detail-subtitle">{card.subtitle}</p><CardStats card={card} /><StarRow card={card} />
      <p className="detail-description">{card.description}</p><strong className="detail-owned">{count}× vorhanden</strong>
    </section>
  </div>
}

function PackShop({ state, activeProfile, busy, error, onFree, onBuy }) {
  return <section className="pack-shop">
    {state.unopened > 0 && <div className="free-packs"><strong>{state.unopened} kostenlose Paket{state.unopened === 1 ? '' : 'e'}</strong><button type="button" onClick={onFree}>KOSTENLOSES PAKET ÖFFNEN</button></div>}
    <div className="pack-art" aria-hidden="true"><i /><i /><i /><strong>5 KARTEN</strong></div>
    <h2>DartQuest-Paket</h2><p>Fünf Karten. Eine Karte ist garantiert selten oder besser.</p><strong>{PACK_PRICE} Coins</strong>
    <button type="button" disabled={(activeProfile?.coins || 0) < PACK_PRICE || busy} onClick={onBuy}>PAKET KAUFEN</button>
    {(activeProfile?.coins || 0) < PACK_PRICE && <small>Nicht genügend Coins</small>}{error && <p role="alert">{error}</p>}
  </section>
}

function OpenedPack({ cards, onClose }) {
  return <div className="card-overlay pack-overlay"><section className="opened-pack"><span>DARTQUEST</span><h2>Paket geöffnet</h2><div>{cards.map((card, index) => <CollectionCard key={`${card.id}-${index}`} card={card} count={1} onSelect={() => {}} />)}</div><button type="button" onClick={onClose}>ZUR SAMMLUNG</button></section></div>
}
