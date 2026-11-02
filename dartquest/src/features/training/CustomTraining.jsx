import BullCounter from './BullCounter'
import { unlockTrainingAudio, playTrainingSignal } from './trainingAudio'
import TrainingIcon from './TrainingIcon'
import { AroundClockOptions, AroundClockComparison } from './AroundClockDetails'
import { useEffect, useRef, useState } from 'react'
import { ScoreKeypad } from '../campaignModes/components/CampaignGameUI'
import { triggerHaptic } from '../settings/haptics'
import { CUSTOM_GAMES, DEFAULT_ROUTE, DURATIONS, aroundVariant, elapsedClockMs, finishAroundClock, isAroundClock, recordAroundMiss, bestResults, changeFavoriteCombo, favoriteDoubleEntry, favoritePendingCount, recordFavoriteSingle, saveFavoriteCombo, hasOpenEntry, isSeriesGame, pointsLabel, recordRouteThrow, remainingSeconds, routeLabel, summary, validCombo } from './customTrainingRules'
import CustomTrainingDetails, { FavoriteDoubleSelector, RouteBreakdown, RouteSelector } from './CustomTrainingDetails'
import { clearCustomRun, completeCustomRun, loadCustomHistory, loadCustomRun, localCustomHistory, saveCustomRun, startCustomRun } from './customTrainingStorage'
import CustomTrainingStatistics from './CustomTrainingStatistics'
import './CustomTraining.css'

function Clock({ run, seconds }) {
  const around = isAroundClock(run.game)
  const ratio = around ? 1 : seconds / (run.minutes * 60)
  return <div className={`custom-clock${!around && seconds <= 60 ? ' is-urgent' : ''}`} role="timer" aria-label={`${around ? 'Spielzeit' : 'Restzeit'} ${Math.floor(seconds / 60)} Minuten ${seconds % 60} Sekunden`}>
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="clock-track" cx="60" cy="60" r="53"/><circle className="clock-progress" cx="60" cy="60" r="53" pathLength="1" strokeDasharray={`${ratio} 1`} /></svg>
    <div><strong>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong><small>{around ? 'SPIELZEIT' : 'RESTZEIT'}</small></div>
  </div>
}

export default function CustomTraining({ activeProfile, onBack }) {
  const userId = activeProfile?.id
  const [plan, setPlan] = useState([]), [editing, setEditing] = useState(null), [duration, setDuration] = useState(15)
  const [prepared, setPrepared] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(DEFAULT_ROUTE)
  const [selectedFavoriteDouble, setSelectedFavoriteDouble] = useState(16)
  const [includeBull, setIncludeBull] = useState(false)
  const [run, setRun] = useState(null), [savedRun, setSavedRun] = useState(() => loadCustomRun(userId))
  const [now, setNow] = useState(Date.now()), [statsGame, setStatsGame] = useState(null)
  const [history, setHistory] = useState(() => localCustomHistory(userId))
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0), [leave, setLeave] = useState(false)
  const finishing = useRef(false)
  const signals = useRef({})
  const seconds = run ? isAroundClock(run.game) ? Math.floor(elapsedClockMs(run, now) / 1000) : remainingSeconds(run.endAt, now) : 0
  const current = run ? summary(run) : null
  const game = CUSTOM_GAMES.find(g => g.id === run?.game)

  useEffect(() => {
    let live = true
    const refresh = () => loadCustomHistory(userId).then(result => { if (live) setHistory(result.rows) })
    refresh()
    window.addEventListener('dartquest-training-statistics-reset',refresh)
    return () => { live = false; window.removeEventListener('dartquest-training-statistics-reset',refresh) }
  }, [userId])
  useEffect(() => { if (run) saveCustomRun(userId, run) }, [run, userId])
  useEffect(() => {
    if (!run || run.phase !== 'playing') return
    const tick = () => setNow(Date.now())
    const timer = setInterval(tick, 250)
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [run?.id, run?.phase])
  useEffect(() => {
    if (!run || isAroundClock(run.game) || !['playing', 'saving'].includes(run.phase)) return
    const sent = signals.current[run.id] ??= {}
    if (seconds > 0 && seconds <= 60 && !sent.minute) {
      sent.minute = true
      playTrainingSignal('minute')
    }
    if (seconds === 0 && !sent.end) {
      sent.end = true
      playTrainingSignal('end')
    }
  }, [run?.id, run?.phase, seconds])

  useEffect(() => {
    if (run?.phase === 'playing' && !isAroundClock(run.game) && seconds === 0 && !hasOpenEntry(run)) setRun(r => ({ ...r, phase: 'saving' }))
  }, [seconds, run])
  useEffect(() => {
    if (run?.phase !== 'saving' || finishing.current) return
    finishing.current = true
    setError('')
    completeCustomRun(userId, run).then(result => {
      setHistory(rows => [result, ...rows.filter(r => r.id !== result.id)])
      setRun(r => ({ ...r, ...(isAroundClock(r.game) ? result.payload : {}), phase: 'result' }))
    }).catch(e => setError(e.message)).finally(() => { finishing.current = false })
  }, [run?.phase, run?.id, retry, userId])

  async function start(queue, index = 0) {
    if (busy) return
    unlockTrainingAudio()
    setBusy(true); setError('')
    try {
      const next = await startCustomRun(userId, queue[index].id, queue[index].minutes, queue[index])
      next.queue = queue; next.index = index
      saveCustomRun(userId, next); setRun(next); setNow(Date.now()); setSavedRun(next); setPrepared(null)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  function movePlan(index, delta) {
    setPlan(list => {
      const target = index + delta
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  function hit(field, delta, event) {
    if (run.phase !== 'playing' || remainingSeconds(run.endAt) === 0) { setNow(Date.now()); return }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    event.currentTarget.animate?.([
      { transform: 'scale(1)', boxShadow: '0 0 0 0 #8be8b700' },
      { transform: reducedMotion ? 'scale(1)' : 'scale(1.025)', boxShadow: '0 0 28px 3px #8be8b74d, inset 0 0 20px #8be8b718' },
      { transform: 'scale(1)', boxShadow: '0 0 0 0 #8be8b700' },
    ], { duration: reducedMotion ? 160 : 380, easing: 'ease-out' })
    triggerHaptic('light'); setRun(r => ({ ...r, [field]: Math.max(0, r[field] + delta) }))
  }
  function changeScore(value) {
    if (run.phase !== 'playing' || (remainingSeconds(run.endAt) === 0 && !hasOpenEntry(run))) return
    setRun(r => ({ ...r, score: value })); setError('')
  }
  function confirmScore() {
    const points = Number(run.score)
    if (run.game === 'favorite-double') {
      const entry = favoriteDoubleEntry(points, run.favoriteDouble ?? 16)
      if (!run.score || !entry) { setError(`Bitte ein positives Vielfaches von ${(run.favoriteDouble ?? 16) * 2} eingeben – für D${run.favoriteDouble ?? 16}.`); return }
      setRun(r => ({ ...r, entries: [...r.entries, entry], score: '', choosing: false })); setError(''); return
    }
    if (!run.score || !Array.from({ length: 20 }, (_, i) => i + 1).some(count => validCombo(points, count, run.game))) { setError(run.game === 'triple-20-19-18-combo' ? 'Diese Punkte sind mit 20, 19 und 18 und mindestens einem Triple pro Aufnahme nicht möglich. Bitte korrigieren.' : 'Bitte 60 bis 3600 Punkte eingeben.'); return }
    setRun(r => ({ ...r, choosing: true })); setError('')
  }
  function chooseCombo(count) {
    const points = Number(run.score)
    if (!validCombo(points, count, run.game)) { setError('Punkte und Anzahl erfolgreicher Anwürfe passen nicht zusammen.'); return }
    setRun(r => ({ ...r, entries: [...r.entries, { points, count }], score: '', choosing: false })); setError('')
  }
  const favoriteCount = favoritePendingCount(run)
  function favoriteSingle() { triggerHaptic('light'); setRun(r => recordFavoriteSingle(r)); setNow(Date.now()); setError('') }
  function favoriteCombo() { triggerHaptic('light'); setRun(r => changeFavoriteCombo(r, 1)); setNow(Date.now()); setError('') }
  function confirmFavoriteCombo() { triggerHaptic('success'); setRun(r => saveFavoriteCombo(r)); setError('') }
  function exitRun(abort) {
    if (abort || run.phase === 'result') { clearCustomRun(userId); setSavedRun(null) } else setSavedRun(run)
    setRun(null); setLeave(false); setError('')
  }
  function routeThrow(hit, event) {
    const next = recordRouteThrow(run, hit)
    if (next === run) { setNow(Date.now()); return }
    event.currentTarget.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 220 })
    triggerHaptic(hit ? 'success' : 'light'); setRun(next)
  }
  if (statsGame) return <CustomTrainingStatistics activeProfile={activeProfile} initialGame={statsGame} initialMinutes={prepared?.queue[prepared.index]?.minutes ?? run?.minutes ?? 5} initialRoute={prepared?.queue[prepared.index]?.route ?? run?.route ?? DEFAULT_ROUTE} initialIncludeBull={prepared?.queue[prepared.index]?.includeBull ?? run?.includeBull ?? false} onBack={() => setStatsGame(null)}/>
  if (prepared) {
    const next = prepared.queue[prepared.index]
    const nextGame = CUSTOM_GAMES.find(g => g.id === next.id)
    return <main className="custom-training training-builder"><header className="training-page-header"><button aria-label="Zurück" disabled={busy} onClick={() => { setPrepared(null); setError('') }}>‹</button><div><span>ANGEPASSTES TRAINING · {prepared.index + 1} / {prepared.queue.length}</span><h1>{nextGame.title}</h1></div></header><section className="custom-result"><span>BEREIT FÜR DEIN TRAINING?</span><h2>{isAroundClock(next.id) ? aroundVariant(next.includeBull) : `${next.minutes} Minuten`}</h2><p>{nextGame.description}</p>{isAroundClock(next.id) && <><AroundClockOptions value={next.includeBull} disabled={busy} onChange={includeBull => setPrepared(p => ({ ...p, queue: p.queue.map((task, index) => index === p.index ? { ...task, includeBull } : task) }))}/><p>Spiele die Ziele in Reihenfolge. Trage nur Fehlwürfe ein. Wenn du alle Ziele getroffen hast, tippe auf „Spiel beendet“.{next.includeBull ? ' Am Ende zählt Bull 25 oder 50.' : ''}</p></>}{next.id === 'favorite-double' && <FavoriteDoubleSelector value={next.favoriteDouble} disabled={busy} onChange={favoriteDouble => setPrepared(p => ({ ...p, queue: p.queue.map((task, index) => index === p.index ? { ...task, favoriteDouble } : task) }))}/>}{next.id === 'double-route' && <RouteSelector value={next.route} disabled={busy} onChange={route => setPrepared(p => ({ ...p, queue: p.queue.map((task, index) => index === p.index ? { ...task, route } : task) }))}/>}<p>Die Zeit läuft erst, wenn du auf „Starten“ drückst.</p><button onClick={() => setStatsGame(next.id)} disabled={busy}>STATISTIK</button>{error && <p className="custom-error" role="alert">{error}</p>}<button className="training-start-button" disabled={busy} onClick={() => start(prepared.queue, prepared.index)}>{busy ? 'WIRD GESTARTET …' : 'STARTEN'}</button></section></main>
  }

  return <main data-game={run?.game} className={`custom-training training-builder${run && run.phase !== 'result' ? ' custom-playing' : ''}`}><header className="training-page-header"><button aria-label="Zurück" disabled={run?.phase === 'saving' && !error} onClick={() => run ? run.phase === 'result' ? exitRun(false) : setLeave(true) : onBack()}>‹</button><div><span>ANGEPASSTES TRAINING</span><h1>{game?.title ?? 'Dein Trainingsplan'}</h1></div></header>
    {error && <p className="custom-error" role="alert">{error}</p>}
    {!run ? <>
      {savedRun && <button className="training-resume-button" onClick={() => { unlockTrainingAudio(); setRun(savedRun); setNow(Date.now()) }}>TRAINING FORTSETZEN</button>}
      <section className="training-category"><h2>SPIELE HINZUFÜGEN</h2>{CUSTOM_GAMES.map(g => <article key={g.id}><button className="training-template-toggle" onClick={() => { setEditing({ game: g, index: null }); setDuration(15); setSelectedRoute(DEFAULT_ROUTE); setSelectedFavoriteDouble(16); setIncludeBull(false) }}><i className="custom-game-icon"><TrainingIcon game={g.id}/></i><span><strong>{g.title}</strong><small>{g.description}</small></span><b className="custom-game-add" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg></b></button><button className="custom-game-statistics" title={`Statistik: ${g.title}`} aria-label={`Statistik: ${g.title}`} onClick={() => setStatsGame(g.id)}><TrainingIcon chart/></button></article>)}</section>
      {plan.length > 0 && <section className="custom-plan"><h2>DEIN TRAININGSPLAN</h2>{plan.map((p, i) => <article key={i}><span className="custom-plan-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><strong>{CUSTOM_GAMES.find(g => g.id === p.id)?.title} · {isAroundClock(p.id) ? aroundVariant(p.includeBull) : `${p.minutes} Min.`}{p.id === 'double-route' && <small> · {routeLabel(p.route ?? DEFAULT_ROUTE)}</small>}{p.id === 'favorite-double' && <small> · D{p.favoriteDouble ?? 16}</small>}</strong><button onClick={() => { setEditing({ game: CUSTOM_GAMES.find(g => g.id === p.id), index: i }); setDuration(p.minutes); setSelectedRoute(p.route ?? DEFAULT_ROUTE); setSelectedFavoriteDouble(p.favoriteDouble ?? 16); setIncludeBull(Boolean(p.includeBull)) }}>Bearbeiten</button><div className="custom-plan-controls"><button aria-label="Übung nach oben verschieben" disabled={i === 0} onClick={() => movePlan(i, -1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button><button aria-label="Übung nach unten verschieben" disabled={i === plan.length - 1} onClick={() => movePlan(i, 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg></button><button className="custom-plan-remove" aria-label="Übung entfernen" onClick={() => setPlan(list => list.filter((_, j) => i !== j))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button></div></article>)}</section>}
      {!userId && <p>Gasttraining: Ergebnisse werden auf diesem Gerät gespeichert.</p>}
      <div className="custom-start-dock"><button className="training-start-button" disabled={!plan.length || busy || Boolean(savedRun)} onClick={() => { setPrepared({ queue: [...plan], index: 0 }); setError('') }}>TRAINING STARTEN</button></div>
      {savedRun && <p>Setze dein gespeichertes Training fort oder beende es dort, bevor du ein neues startest.</p>}
    </> : <>
      {run.phase === 'result' ? <section className="custom-result"><span>TRAINING BEENDET · {isAroundClock(run.game) ? aroundVariant(run.includeBull) : `${run.minutes} MINUTEN`}</span><h2>{isAroundClock(run.game) ? `${run.misses} Fehlwürfe` : pointsLabel(current.points)}</h2>
        <CustomTrainingDetails run={run} showEntries/>
        {isAroundClock(run.game) ? <AroundClockComparison run={run} rows={history}/> : (() => { const best = bestResults(history, run.game, run.minutes, run.id, run.game === 'double-route' ? run.route : undefined); const metric = isSeriesGame(run.game) ? 'longest' : 'points'; return <><h3>{current[metric] > best[metric] ? 'NEUER REKORD!' : 'DEIN REKORDVERGLEICH'}</h3><p>Bisher: {best[metric]} · Heute: {current[metric]}{metric === 'longest' ? run.game === 'favorite-double' ? ' Doppeltreffer' : ' erfolgreiche Anwürfe' : ' Punkte'}</p>{metric === 'longest' && <p>Bisherige Serienpunkte: {best.bestSeries} · Sitzungsgesamtpunkte: {best.points}</p>}</> })()}
        <button onClick={() => setStatsGame(run.game)}>STATISTIK ANSEHEN</button>
        {run.queue && run.index + 1 < run.queue.length && <button className="training-start-button" disabled={busy} onClick={() => { setPrepared({ queue: run.queue, index: run.index + 1 }); setError('') }}>NÄCHSTES TRAINING</button>}
        <button onClick={() => exitRun(false)}>ZUR TRAININGSAUSWAHL</button>
      </section> : <section className={`custom-play-stage${!isAroundClock(run.game) && seconds <= 60 ? ' is-final-minute' : ''}`}>
        <div className="custom-play-hud"><Clock run={run} seconds={seconds}/><div className="custom-live"><strong>{isAroundClock(run.game) ? `${run.misses} Fehlwürfe` : pointsLabel(current.points)}</strong>{isAroundClock(run.game) && <b>{aroundVariant(run.includeBull)}</b>}{isSeriesGame(run.game) && <span>Längste Serie: {current.longest}{run.game === 'favorite-double' ? ' Treffer' : ' Anwürfe'}</span>}{run.game === 'favorite-double' && <b>D{run.favoriteDouble ?? 16} · {(run.favoriteDouble ?? 16) * 2} Punkte je Treffer</b>}{isSeriesGame(run.game) && <small>{run.entries.length} gespeicherte Serien</small>}</div></div>
        {run.phase === 'saving' ? <div className="custom-saving"><h2>{error ? 'Ergebnis noch nicht synchronisiert' : 'ERGEBNIS WIRD GESPEICHERT …'}</h2><p>Dein Ergebnis bleibt auf diesem Gerät erhalten.</p>{error && <button onClick={() => setRetry(n => n + 1)}>ERNEUT VERSUCHEN</button>}</div> : <div className="custom-play-inputs">
          {isAroundClock(run.game) ? <div className="custom-around-play"><div className="custom-around-count" aria-live="polite"><strong>{run.misses}</strong><span>FEHLWÜRFE</span></div><button className="custom-around-miss" onClick={event => { event.currentTarget.animate?.([{transform:'scale(1)'},{transform:'scale(.97)'},{transform:'scale(1)'}],{duration:220}); triggerHaptic('light'); setRun(r => recordAroundMiss(r)) }}><strong>DANEBEN GEWORFEN</strong><span>+1 Fehlwurf</span></button><button className="custom-around-finish" onClick={() => { triggerHaptic('success'); setRun(r => finishAroundClock(r)) }}>SPIEL BEENDET</button><p>Erfolgreiche Treffer nicht eingeben. Beende das Spiel erst nach allen {run.includeBull ? '21' : '20'} Zielen.</p></div> : run.game === 'bulls-warm-up' ? <div className="custom-bulls">{[['doubleBull', 'DOPPELBULL', 50], ['singleBull', 'SINGLE BULL', 25]].map(([field, label, points]) => <section key={field} data-bull={field}><span>{label} · {points}</span><BullCounter value={run[field]}/><div><button disabled={!seconds || run[field] === 0} aria-label={label + ' minus'} onClick={e => hit(field, -1, e)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button><button disabled={!seconds} aria-label={label + ' plus'} onClick={e => hit(field, 1, e)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button></div></section>)}</div> : run.game === 'double-route' ? <div className="custom-route-play">
            <div className="custom-route-order">{(run.route ?? DEFAULT_ROUTE).map((target, index) => <span key={target} className={index === (run.routeThrows ?? []).length % 3 ? 'is-current' : ''}>D{target}</span>)}</div>
            <h2 className="custom-route-target"><span>Dein nächstes Ziel</span><strong>D{(run.route ?? DEFAULT_ROUTE)[(run.routeThrows ?? []).length % 3]}</strong></h2>
            <div className="custom-route-actions"><button disabled={!seconds} onClick={e => routeThrow(true, e)}>TREFFER · +1</button><button disabled={!seconds} onClick={e => routeThrow(false, e)}>DANEBEN</button></div>
            <RouteBreakdown run={run}/><button className="custom-route-undo" disabled={!seconds || !(run.routeThrows ?? []).length} onClick={() => setRun(r => ({ ...r, routeThrows: r.routeThrows.slice(0, -1) }))}>LETZTEN WURF ZURÜCKNEHMEN</button>
          </div> : run.game === 'favorite-double' ? <div className="custom-favorite-play">
            <div className="custom-entry-status" role="status">{seconds === 0 && hasOpenEntry(run) ? 'Zeit abgelaufen – begonnene Combo bestätigen oder verwerfen.' : 'Einzeltreffer direkt speichern oder Combo hochzählen.'}</div>
            <div className="custom-favorite-actions"><button className="favorite-single" disabled={!seconds || Boolean(favoriteCount)} onClick={favoriteSingle}><strong>EINMAL GETROFFEN</strong><small>1 Treffer · {(run.favoriteDouble ?? 16) * 2} Punkte</small></button><button className="favorite-combo" disabled={!seconds} onClick={favoriteCombo}><strong>COMBO +1</strong><small>Für jeden Treffer einmal tippen</small></button></div>
            <div className="custom-favorite-counter" aria-live="polite"><strong>{favoriteCount}</strong><span>Treffer in dieser Combo · {favoriteCount * (run.favoriteDouble ?? 16) * 2} Punkte</span></div>
            <div className="custom-favorite-confirm"><button aria-label="Combo um einen Treffer verringern" disabled={!favoriteCount} onClick={() => setRun(r => changeFavoriteCombo(r, -1))}>−1</button><button className="favorite-confirm" disabled={!favoriteCount} onClick={confirmFavoriteCombo}>OK · COMBO SPEICHERN</button></div>
            <div className="custom-entry-actions"><button disabled={!hasOpenEntry(run)} onClick={() => { setRun(r => ({ ...r, favoriteComboCount: 0, score: '', choosing: false })); setError('') }}>VERWERFEN</button><button disabled={!seconds || !run.entries.length || Boolean(favoriteCount)} onClick={() => setRun(r => ({ ...r, entries: r.entries.slice(0, -1) }))}>LETZTE SERIE ZURÜCK</button></div>
            <section className="custom-run-history" aria-label="Gespeicherte Serien"><h2>GESPEICHERTE SERIEN · {run.entries.length}</h2><div>{run.entries.length ? run.entries.map((entry, index) => <article key={index}><strong>{entry.count} Treffer</strong><span>D{entry.double} · {pointsLabel(entry.points)}</span></article>) : <p>Noch kein Treffer erfasst.</p>}</div></section>
          </div> : <div className="custom-score-layout">
            <div className="custom-entry-status" role="status">{seconds === 0 && hasOpenEntry(run) ? 'Zeit abgelaufen – begonnene Serie abschließen oder verwerfen.' : run.game === 'favorite-double' ? 'Gesamtpunkte der beendeten Doppelserie eingeben.' : 'Gesamtpunkte der beendeten Combo eingeben.'}</div>
            <ScoreKeypad value={run.score} onChange={changeScore} onConfirm={confirmScore} disabled={run.choosing || (!seconds && !hasOpenEntry(run))} maxScore={run.game === 'favorite-double' ? 99999 : 3600} maxDigits={run.game === 'favorite-double' ? 5 : 4} quick={[]} />
            <div className="custom-entry-actions"><button disabled={!hasOpenEntry(run)} onClick={() => { setRun(r => ({ ...r, score: '', choosing: false })); setError('') }}>VERWERFEN</button><button disabled={!seconds || !run.entries.length || run.choosing} onClick={() => setRun(r => ({ ...r, entries: r.entries.slice(0, -1) }))}>LETZTE SERIE ZURÜCK</button></div>
            <section className="custom-run-history" aria-label="Gespeicherte Serien"><h2>GESPEICHERTE SERIEN · {run.entries.length}</h2><div>{run.entries.length ? run.entries.map((e, i) => <article key={i}><strong>{pointsLabel(e.points)}</strong><span>{e.double ? 'D' + e.double + ' · ' + e.count + ' Treffer' : e.count + ' Anwürfe'}</span></article>) : <p>Noch keine Serie erfasst.</p>}</div></section>
          </div>}
        </div>}
        <footer className="custom-play-footer"><button className="custom-exit" disabled={run.phase === 'saving' && !error} onClick={() => setLeave(true)}>TRAINING VERLASSEN</button></footer>
      </section>}

    </>}
    {editing && <div className="training-sheet-backdrop"><section className="training-sheet" role="dialog" aria-modal="true" aria-label={isAroundClock(editing.game.id) ? 'Spielvariante wählen' : 'Spieldauer wählen'}><h2>{editing.game.title}</h2>{isAroundClock(editing.game.id) ? <AroundClockOptions value={includeBull} onChange={setIncludeBull}/> : <><p>Wie lange möchtest du trainieren?</p><div className="training-chips">{DURATIONS.map(m => <button key={m} aria-pressed={m === duration} onClick={() => setDuration(m)}>{m} Min.</button>)}</div></>}{editing.game.id === 'double-route' && <RouteSelector value={selectedRoute} onChange={setSelectedRoute}/>}{editing.game.id === 'favorite-double' && <FavoriteDoubleSelector value={selectedFavoriteDouble} onChange={setSelectedFavoriteDouble}/>}<button onClick={() => { const task = { id: editing.game.id, minutes: isAroundClock(editing.game.id) ? 0 : duration, ...(isAroundClock(editing.game.id) ? { includeBull } : {}), ...(editing.game.id === 'double-route' ? { route: selectedRoute } : {}), ...(editing.game.id === 'favorite-double' ? { favoriteDouble: selectedFavoriteDouble } : {}) }; setPlan(list => editing.index == null ? [...list, task] : list.map((p, i) => i === editing.index ? task : p)); setEditing(null) }}>{editing.index == null ? 'HINZUFÜGEN' : 'SPEICHERN'}</button><button onClick={() => setEditing(null)}>ABBRECHEN</button></section></div>}
    {run?.choosing && <div className="training-sheet-backdrop"><section className="training-sheet" role="dialog" aria-modal="true" aria-label="Wie viele Combos?"><h2>Wie viele Combos?</h2><p>{run.score} Punkte · Anzahl aufeinanderfolgender erfolgreicher Anwürfe. 1 = ein Anwurf ohne Fortsetzung.</p>{error && <p role="alert">{error}</p>}<div className="custom-combo-picker" ref={element => { if (element && !element.dataset.positioned) { element.scrollTop = element.scrollHeight; element.dataset.positioned = 'true' } }}>{Array.from({ length: 20 }, (_, i) => i + 1).map(n => <button key={n} disabled={!validCombo(Number(run.score), n, run.game)} style={{ gridColumn: 3 - ((n - 1) % 3), gridRow: 7 - Math.floor((n - 1) / 3) }} onClick={() => chooseCombo(n)}>{n}</button>)}</div><button onClick={() => setRun(r => ({ ...r, choosing: false }))}>PUNKTE KORRIGIEREN</button><button onClick={() => { setRun(r => ({ ...r, choosing: false, score: '' })); setError('') }}>EINGABE VERWERFEN</button></section></div>}
    {leave && <div className="training-sheet-backdrop"><section className="training-sheet" role="alertdialog" aria-modal="true"><h2>Training verlassen?</h2><p>Beim Fortsetzen läuft die Zeit weiter. Bei einem Abbruch wird kein Ergebnis gespeichert.</p><button onClick={() => exitRun(false)}>SPÄTER FORTSETZEN</button><button onClick={() => exitRun(true)}>TRAINING ABBRECHEN</button><button onClick={() => setLeave(false)}>WEITERSPIELEN</button></section></div>}
  </main>
}
