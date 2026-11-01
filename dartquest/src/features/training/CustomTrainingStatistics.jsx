import { AroundClockOptions } from './AroundClockDetails'
import { useEffect, useState } from 'react'
import { CUSTOM_GAMES, DEFAULT_ROUTE, DURATIONS, aroundClockBest, aroundVariant, formatElapsed, isAroundClock, bestResults, isSeriesGame, pointsLabel, summary } from './customTrainingRules'
import { loadCustomHistory, localCustomHistory } from './customTrainingStorage'
import CustomTrainingDetails, { RouteBreakdown, RouteSelector } from './CustomTrainingDetails'
import './CustomTraining.css'

export default function CustomTrainingStatistics({ activeProfile, initialGame, initialMinutes = 5, initialRoute = DEFAULT_ROUTE, initialIncludeBull = false, onBack }) {
  const [game, setGame] = useState(initialGame ?? null)
  const [minutes, setMinutes] = useState(initialMinutes)
  const [route, setRoute] = useState(initialRoute)
  const [includeBull, setIncludeBull] = useState(initialIncludeBull)
  const [history, setHistory] = useState(() => localCustomHistory(activeProfile?.id))
  const [offline, setOffline] = useState(false)
  useEffect(() => { let alive = true; loadCustomHistory(activeProfile?.id).then(result => { if (alive) { setHistory(result.rows); setOffline(result.offline) } }); return () => { alive = false } }, [activeProfile?.id])
  const rows = history.filter(r => r.game === game && (isAroundClock(game) ? Boolean(r.payload.includeBull) === includeBull : r.minutes === minutes) && (game !== 'double-route' || JSON.stringify(r.payload.route) === JSON.stringify(route)))
  const best = bestResults(rows, game, minutes)
  const clockBest = aroundClockBest(rows, includeBull)
  const favoriteDoubles = game === 'favorite-double' ? Array.from({ length: 20 }, (_, i) => i + 1).map(target => {
    const entries = rows.flatMap(row => row.payload.entries ?? []).filter(entry => entry.double === target)
    return { target, starts: entries.length, hits: entries.reduce((n, entry) => n + entry.count, 0), longest: Math.max(0, ...entries.map(entry => entry.count)) }
  }).filter(row => row.starts) : []
  return <main className="statistics-screen custom-training"><header className="training-page-header"><button onClick={game && !initialGame ? () => setGame(null) : onBack} aria-label="Zurück">‹</button><div><span>ANGEPASSTES TRAINING</span><h1>{CUSTOM_GAMES.find(g => g.id === game)?.title ?? 'Statistik'}</h1></div></header>
    {offline && <p role="status">Offline: Gespeicherter Verlauf auf diesem Gerät.</p>}
    {!game ? <div className="statistics-games">{CUSTOM_GAMES.map(g => <button key={g.id} onClick={() => setGame(g.id)}><strong>{g.title}</strong><small>{history.filter(r => r.game === g.id).length} Durchläufe</small></button>)}</div> : <>
      <>{isAroundClock(game) ? <AroundClockOptions value={includeBull} onChange={setIncludeBull}/> : <div className="training-chips">{DURATIONS.map(m => <button key={m} aria-pressed={m === minutes} onClick={() => setMinutes(m)}>{m} Min.</button>)}</div>}</>
      {game === 'double-route' && <RouteSelector value={route} onChange={setRoute}/>}
      {isAroundClock(game) ? <><h2>BESTLEISTUNGEN · {aroundVariant(includeBull)}</h2><div className="statistics-grid"><div><span>WENIGSTE FEHLWÜRFE</span><strong>{clockBest.misses ?? '–'}</strong></div><div><span>SCHNELLSTE ZEIT</span><strong>{clockBest.elapsedMs === null ? '–' : formatElapsed(clockBest.elapsedMs)}</strong></div><div><span>DURCHLÄUFE</span><strong>{rows.length}</strong></div></div></> : <><h2>BESTLEISTUNGEN · {minutes} MINUTEN</h2><div className="statistics-grid"><div><span>{game === 'double-route' ? 'MEISTE TREFFER' : 'GESAMTPUNKTE'}</span><strong>{best.points}</strong></div>{isSeriesGame(game) && <><div><span>LÄNGSTE SERIE</span><strong>{best.longest}{game === 'favorite-double' ? ' Treffer' : ''}</strong></div><div><span>BESTE SERIENPUNKTE</span><strong>{best.bestSeries}</strong></div></>}</div></>}

      {game === 'double-route' && <><h2>TREFFER JE DOPPEL · ALLE DURCHLÄUFE</h2><RouteBreakdown run={{ route, routeThrows: rows.flatMap(row => row.payload.routeThrows ?? []) }}/></>}
      {game === 'favorite-double' && favoriteDoubles.length > 0 && <><h2>DEINE DOPPEL IM VERGLEICH</h2><div className="custom-history">{favoriteDoubles.map(row => <article key={row.target}><strong>D{row.target}</strong><span>{row.starts} erfolgreiche Starts · {row.hits} Treffer · längste Serie {row.longest}</span></article>)}</div><CustomTrainingDetails run={{game,entries: rows.flatMap(row => row.payload.entries ?? [])}}/></>}
      <h2>ALLE DURCHLÄUFE</h2>{!rows.length && <p>Noch keine Ergebnisse für diese Auswahl.</p>}
      <div className="custom-history">{rows.map(row => <article key={row.id}><time>{new Date(row.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><h3>{CUSTOM_GAMES.find(g => g.id === row.game)?.title} · {isAroundClock(row.game) ? aroundVariant(row.payload.includeBull) : `${row.minutes} Min.`}</h3><strong>{isAroundClock(row.game) ? `${row.payload.misses} Fehlwürfe` : pointsLabel(summary(row.payload).points)}</strong><CustomTrainingDetails run={row.payload} showEntries/></article>)}</div>
    </>}
  </main>
}
