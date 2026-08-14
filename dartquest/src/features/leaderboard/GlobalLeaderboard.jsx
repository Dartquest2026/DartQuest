import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadGlobalLeaderboardPage } from './globalLeaderboardStorage'
import './GlobalLeaderboard.css'

const rankMedals = ['🥇', '🥈', '🥉']

function GlobalLeaderboard({ activeProfile, onBack }) {
  const [players, setPlayers] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadFirstPage = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const page = await loadGlobalLeaderboardPage()
      setPlayers(page.players)
      setNextCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(loadFirstPage, 0)
    return () => window.clearTimeout(timer)
  }, [loadFirstPage])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const page = await loadGlobalLeaderboardPage(nextCursor)
      setPlayers((current) => [...current, ...page.players])
      setNextCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de-DE')
    if (!query) return players
    return players.filter((player) => player.name.toLocaleLowerCase('de-DE').includes(query))
  }, [players, search])

  const ranksByProfileId = useMemo(
    () => new Map(players.map((player, index) => [player.profileId, index + 1])),
    [players],
  )

  return (
    <main className="global-leaderboard-screen">
      <header className="global-leaderboard-header">
        <button type="button" onClick={onBack} aria-label="Zurück zur Community">‹</button>
        <div><span>COMMUNITY</span><h1>🏆 RANGLISTE</h1><p>Alle DartQuest-Spieler</p></div>
      </header>

      <label className="global-leaderboard-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Spieler suchen" aria-label="Spieler suchen" />
      </label>
      <p className="global-leaderboard-search-note">Suche innerhalb der bereits geladenen Spieler</p>

      <section className="global-leaderboard-list" aria-label="Globale Spielerrangliste">
        <div className="global-leaderboard-columns"><span>RANG</span><span aria-hidden="true" /><span>SPIELER</span><span>LEVEL</span><span>XP</span></div>
        {loading && <p className="global-leaderboard-state">Rangliste wird geladen …</p>}
        {error && <p className="global-leaderboard-error">{error}</p>}
        {!loading && !error && players.length === 0 && <p className="global-leaderboard-state">Noch keine Spieler vorhanden.</p>}
        {!loading && players.length > 0 && visiblePlayers.length === 0 && <p className="global-leaderboard-state">Kein geladener Spieler gefunden.</p>}

        {visiblePlayers.map((player) => {
          const rank = ranksByProfileId.get(player.profileId)
          const isMe = player.profileId === activeProfile.id
          return (
            <article key={player.profileId} className={`global-player rank-${rank} ${isMe ? 'is-me' : ''}`}>
              <b className="global-player-rank">{rankMedals[rank - 1] ?? rank}</b>
              <div className="global-player-avatar">{player.name.slice(0, 1).toUpperCase()}</div>
              <div className="global-player-name"><strong>{player.name}</strong>{isMe && <em>DU</em>}</div>
              <span className="global-player-level">LVL {player.playerLevel}</span>
              <span className="global-player-xp"><strong>{player.xp.toLocaleString('de-DE')}</strong> XP</span>
            </article>
          )
        })}
      </section>

      {!search && hasMore && (
        <button className="global-leaderboard-more" type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'WIRD GELADEN …' : 'MEHR LADEN'}
        </button>
      )}
    </main>
  )
}

export default GlobalLeaderboard
