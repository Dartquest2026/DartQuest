import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadGlobalLeaderboardPage } from './globalLeaderboardStorage'
import { formatDecimal, starsSummary } from './leaderboardFormat'
import { calculateCheckoutRate } from '../campaignModes/checkoutStatistics.js'
import PublicPlayerProfile from '../community/PublicPlayerProfile'
import PlayerAvatar from '../../shared/components/PlayerAvatar'
import './GlobalLeaderboard.css'

const tabs = [{ id: 'xp', label: 'XP' }, { id: 'standard', label: 'Standard' }, { id: 'checkout', label: 'Checkout' }, { id: 'rivals', label: 'Rivalen' }]
const rankMedals = ['🥇', '🥈', '🥉']

function GlobalLeaderboard({ activeProfile, onBack, onRequestsChanged }) {
  const [mode, setMode] = useState('xp')
  const [players, setPlayers] = useState([])
  const [nextOffset, setNextOffset] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState(null)

  const loadFirstPage = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const page = await loadGlobalLeaderboardPage(mode)
      setPlayers(page.players); setNextOffset(page.nextOffset); setHasMore(page.hasMore)
    } catch (loadError) { setError(loadError.message) } finally { setLoading(false) }
  }, [mode])

  useEffect(() => { const timer = window.setTimeout(loadFirstPage, 0); return () => window.clearTimeout(timer) }, [loadFirstPage])

  async function loadMore() {
    if (nextOffset == null || loadingMore) return
    setLoadingMore(true); setError('')
    try {
      const page = await loadGlobalLeaderboardPage(mode, nextOffset)
      setPlayers((current) => [...current, ...page.players]); setNextOffset(page.nextOffset); setHasMore(page.hasMore)
    } catch (loadError) { setError(loadError.message) } finally { setLoadingMore(false) }
  }

  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de-DE')
    return query ? players.filter((player) => player.name.toLocaleLowerCase('de-DE').includes(query)) : players
  }, [players, search])
  const globalCheckoutRate = useMemo(() => players[0] ? calculateCheckoutRate(players[0].globalSuccessfulCheckouts, players[0].globalCheckoutDarts)?.percentage ?? null : null, [players])

  if (selectedProfileId) return <PublicPlayerProfile profileId={selectedProfileId} onBack={() => setSelectedProfileId(null)} onRequestsChanged={onRequestsChanged} />
  return <main className="global-leaderboard-screen">
    <header className="global-leaderboard-header"><button type="button" onClick={onBack} aria-label="Zurück zur Community">‹</button><div><span>COMMUNITY</span><h1>🏆 RANGLISTE</h1><p>Alle DartQuest-Spieler</p></div></header>
    <label className="global-leaderboard-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Spieler suchen" aria-label="Spieler suchen" /></label>
    <p className="global-leaderboard-search-note">Suche innerhalb der bereits geladenen Spieler</p>
    <nav className="leaderboard-tabs" aria-label="Rangliste auswählen">{tabs.map((tab) => <button key={tab.id} type="button" className={mode === tab.id ? 'active' : ''} aria-pressed={mode === tab.id} onClick={() => setMode(tab.id)}>{tab.label}</button>)}</nav>
    {mode === 'rivals' && <p className="leaderboard-global-stat">Ø Checkout aller Spieler: <strong>{globalCheckoutRate == null ? '–' : `${formatDecimal(globalCheckoutRate)} %`}</strong></p>}
    <div className={`global-leaderboard-columns mode-${mode}`}><span>RANG</span><span aria-hidden="true" /><span>SPIELER</span><span>{mode === 'xp' ? 'LEVEL' : mode === 'rivals' ? 'FORTSCHRITT' : 'KAMPAGNE'}</span>{mode === 'xp' && <span>XP</span>}</div>
    <section className={`global-leaderboard-list mode-${mode}`} aria-label={`${tabs.find((tab) => tab.id === mode)?.label}-Rangliste`}>
      {loading && <p className="global-leaderboard-state">Rangliste wird geladen …</p>}{error && <p className="global-leaderboard-error">{error}</p>}
      {!loading && !error && players.length === 0 && <p className="global-leaderboard-state">Noch keine Spieler vorhanden.</p>}
      {!loading && players.length > 0 && visiblePlayers.length === 0 && <p className="global-leaderboard-state">Kein geladener Spieler gefunden.</p>}
      {visiblePlayers.map((player) => <PlayerRow key={player.profileId} player={player} mode={mode} isMe={player.profileId === activeProfile.id} onOpen={() => setSelectedProfileId(player.profileId)} />)}
      {!search && hasMore && <button className="global-leaderboard-more" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'WIRD GELADEN …' : 'MEHR LADEN'}</button>}
    </section>
  </main>
}

function PlayerRow({ player, mode, isMe, onOpen }) {
  const checkoutRate = calculateCheckoutRate(player.successfulCheckouts, player.checkoutDarts)?.percentage ?? null
  return <button type="button" className={`global-player mode-${mode} rank-${player.rank} ${isMe ? 'is-me' : ''}`} onClick={onOpen} aria-label={`Spielerprofil von ${player.name} öffnen`}>
    <b className="global-player-rank">{rankMedals[player.rank - 1] ?? player.rank}</b><PlayerAvatar className="global-player-avatar" name={player.name} avatarPath={player.avatarPath} /><div className="global-player-name"><strong>{player.name}</strong>{isMe && <em>DU</em>}</div>
    {mode === 'xp' && <><span className="global-player-level">LVL {player.playerLevel}</span><span className="global-player-xp"><strong>{player.xp.toLocaleString('de-DE')}</strong> XP</span></>}
    {mode === 'standard' && <div className="global-player-campaign"><strong>{player.completedLevels == null ? '–' : `${player.completedLevels} Level`}</strong><span>{starsSummary(player)}</span></div>}
    {mode === 'checkout' && <div className="global-player-campaign"><strong>{player.completedLevels == null ? '–' : `${player.completedLevels} / 169 Level`}</strong><span>{starsSummary(player)}</span></div>}
    {mode === 'rivals' && <div className="global-player-campaign rivals"><strong>{player.completedLevels == null ? '–' : `Rivalen LVL ${player.completedLevels}`}</strong><span>AVG {formatDecimal(player.bestAverage)} · 180 {player.score180 ?? '–'} · 140 {player.score140 ?? '–'}</span><span>100 {player.score100 ?? '–'} · CO {checkoutRate == null ? '–' : `${formatDecimal(checkoutRate)} %`}</span></div>}
  </button>
}
export default GlobalLeaderboard
