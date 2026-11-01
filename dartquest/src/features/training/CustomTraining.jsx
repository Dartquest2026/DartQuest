import { useEffect, useRef, useState } from 'react'
import { ScoreKeypad } from '../campaignModes/components/CampaignGameUI'
import { triggerHaptic } from '../settings/haptics'
import { CUSTOM_GAMES, DEFAULT_ROUTE, DURATIONS, bestResults, favoriteDoubleEntry, hasOpenEntry, isSeriesGame, pointsLabel, recordRouteThrow, remainingSeconds, routeLabel, summary, validCombo } from './customTrainingRules'
import CustomTrainingDetails, { RouteBreakdown, RouteSelector } from './CustomTrainingDetails'
import { clearCustomRun, completeCustomRun, loadCustomHistory, loadCustomRun, localCustomHistory, saveCustomRun, startCustomRun } from './customTrainingStorage'
import CustomTrainingStatistics from './CustomTrainingStatistics'
import './CustomTraining.css'

function Clock({ run, seconds }) {
  const ratio = seconds / (run.minutes * 60)
  return <div className={`custom-clock${seconds <= 30 ? ' is-urgent' : ''}`} role="timer" aria-label={`Restzeit ${Math.floor(seconds / 60)} Minuten ${seconds % 60} Sekunden`}>
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="clock-track" cx="60" cy="60" r="53"/><circle className="clock-progress" cx="60" cy="60" r="53" pathLength="1" strokeDasharray={`${ratio} 1`} /></svg>
    <div><strong>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong><small>RESTZEIT</small></div>
  </div>
}

export default function CustomTraining({ activeProfile, onBack }) {
  const userId = activeProfile?.id
  const [plan, setPlan] = useState([]), [editing, setEditing] = useState(null), [duration, setDuration] = useState(5)
  const [prepared, setPrepared] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(DEFAULT_ROUTE)
  const [run, setRun] = useState(null), [savedRun, setSavedRun] = useState(() => loadCustomRun(userId))
  const [now, setNow] = useState(Date.now()), [statsGame, setStatsGame] = useState(null)
  const [history, setHistory] = useState(() => localCustomHistory(userId))
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0), [leave, setLeave] = useState(false)
  const finishing = useRef(false)
  const seconds = run ? remainingSeconds(run.endAt, now) : 0
  const current = run ? summary(run) : null
  const game = CUSTOM_GAMES.find(g => g.id === run?.game)

  useEffect(() => { let live = true; loadCustomHistory(userId).then(result => { if (live) setHistory(result.rows) }); return () => { live = false } }, [userId])
  useEffect(() => { if (run) saveCustomRun(userId, run) }, [run, userId])
  useEffect(() => {
    if (!run || run.phase !== 'playing') return
    const tick = () => setNow(Date.now())
    const timer = setInterval(tick, 250)
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [run?.id, run?.phase])
  useEffect(() => {
    if (run?.phase === 'playing' && seconds === 0 && !hasOpenEntry(run)) setRun(r => ({ ...r, phase: 'saving' }))
  }, [seconds, run])
  useEffect(() => {
    if (run?.phase !== 'saving' || finishing.current) return
    finishing.current = true
    setError('')
    completeCustomRun(userId, run).then(result => {
      setHistory(rows => [result, ...rows.filter(r => r.id !== result.id)])
      setRun(r => ({ ...r, phase: 'result' }))
    }).catch(e => setError(e.message)).finally(() => { finishing.current = false })
  }, [run?.phase, run?.id, retry, userId])

  async function start(queue, index = 0) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const next = await startCustomRun(userId, queue[index].id, queue[index].minutes, queue[index])
      next.queue = queue; next.index = index
      saveCustomRun(userId, next); setRun(next); setNow(Date.now()); setSavedRun(next); setPrepared(null)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  function hit(field, delta, event) {
    if (run.phase !== 'playing' || remainingSeconds(run.endAt) === 0) { setNow(Date.now()); return }
    event.currentTarget.animate?.([{ transform: 'scale(1)', boxShadow: '0 0 0 transparent' }, { transform: 'scale(1.07)', boxShadow: '0 0 24px #42e695' }, { transform: 'scale(1)' }], { duration: 260 })
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
  if (statsGame) return <CustomTrainingStatistics activeProfile={activeProfile} initialGame={statsGame} initialMinutes={prepared?.queue[prepared.index]?.minutes ?? run?.minutes ?? 5} initialRoute={prepared?.queue[prepared.index]?.route ?? run?.route ?? DEFAULT_ROUTE} onBack={() => setStatsGame(null)}/>
  if (prepared) {
    const next = prepared.queue[prepared.index]
    const nextGame = CUSTOM_GAMES.find(g => g.id === next.id)
    return <main className="custom-training training-builder"><header className="training-page-header"><button aria-label="Zurück" disabled={busy} onClick={() => { setPrepared(null); setError('') }}>‹</button><div><span>ANGEPASSTES TRAINING · {prepared.index + 1} / {prepared.queue.length}</span><h1>{nextGame.title}</h1></div></header><section className="custom-result"><span>BEREIT FÜR DEIN TRAINING?</span><h2>{next.minutes} Minuten</h2><p>{nextGame.description}</p>{next.id === 'double-route' && <RouteSelector value={next.route} disabled={busy} onChange={route => setPrepared(p => ({ ...p, queue: p.queue.map((task, index) => index === p.index ? { ...task, route } : task) }))}/>}<p>Die Zeit läuft erst, wenn du auf „Starten“ drückst.</p><button onClick={() => setStatsGame(next.id)} disabled={busy}>STATISTIK</button>{error && <p className="custom-error" role="alert">{error}</p>}<button className="training-start-button" disabled={busy} onClick={() => start(prepared.queue, prepared.index)}>{busy ? 'WIRD GESTARTET …' : 'STARTEN'}</button></section></main>
  }

  return <main className="custom-training training-builder"><header className="training-page-header"><button aria-label="Zurück" onClick={() => run ? run.phase === 'result' ? exitRun(false) : setLeave(true) : onBack()}>‹</button><div><span>ANGEPASSTES TRAINING</span><h1>{game?.title ?? 'Dein Trainingsplan'}</h1></div></header>
    {error && <p className="custom-error" role="alert">{error}</p>}
    {!run ? <>
      {savedRun && <button className="training-resume-button" onClick={() => { setRun(savedRun); setNow(Date.now()) }}>TRAINING FORTSETZEN</button>}
      <section className="training-category"><h2>SPIELE HINZUFÜGEN</h2>{CUSTOM_GAMES.map(g => <article key={g.id}><button className="training-template-toggle" onClick={() => { setEditing({ game: g, index: null }); setDuration(5); setSelectedRoute(DEFAULT_ROUTE) }}><i>+</i><span><strong>{g.title}</strong><small>{g.description}</small></span></button><button onClick={() => setStatsGame(g.id)}>Statistik</button></article>)}</section>
      {plan.length > 0 && <section className="custom-plan"><h2>DEIN TRAININGSPLAN</h2>{plan.map((p, i) => <article key={i}><strong>{CUSTOM_GAMES.find(g => g.id === p.id)?.title} · {p.minutes} Min.{p.id === 'double-route' && <small> · {routeLabel(p.route ?? DEFAULT_ROUTE)}</small>}</strong><button onClick={() => { setEditing({ game: CUSTOM_GAMES.find(g => g.id === p.id), index: i }); setDuration(p.minutes); setSelectedRoute(p.route ?? DEFAULT_ROUTE) }}>Bearbeiten</button><button aria-label="Übung entfernen" onClick={() => setPlan(list => list.filter((_, j) => i !== j))}>×</button></article>)}</section>}
      {!userId && <p>Gasttraining: Ergebnisse werden auf diesem Gerät gespeichert.</p>}
      <button className="training-start-button" disabled={!plan.length || busy || Boolean(savedRun)} onClick={() => { setPrepared({ queue: [...plan], index: 0 }); setError('') }}>TRAINING STARTEN</button>
      {savedRun && <p>Setze dein gespeichertes Training fort oder beende es dort, bevor du ein neues startest.</p>}
    </> : <>
      {run.phase === 'result' ? <section className="custom-result"><span>TRAINING BEENDET · {run.minutes} MINUTEN</span><h2>{pointsLabel(current.points)}</h2>
        <CustomTrainingDetails run={run} showEntries/>
        {(() => { const best = bestResults(history, run.game, run.minutes, run.id, run.game === 'double-route' ? run.route : undefined); const metric = isSeriesGame(run.game) ? 'longest' : 'points'; return <><h3>{current[metric] > best[metric] ? 'NEUER REKORD!' : 'DEIN REKORDVERGLEICH'}</h3><p>Bisher: {best[metric]} · Heute: {current[metric]}{metric === 'longest' ? run.game === 'favorite-double' ? ' Doppeltreffer' : ' erfolgreiche Anwürfe' : ' Punkte'}</p>{metric === 'longest' && <p>Bisherige Serienpunkte: {best.bestSeries} · Sitzungsgesamtpunkte: {best.points}</p>}</> })()}
        <button onClick={() => setStatsGame(run.game)}>STATISTIK ANSEHEN</button>
        {run.queue && run.index + 1 < run.queue.length && <button className="training-start-button" disabled={busy} onClick={() => { setPrepared({ queue: run.queue, index: run.index + 1 }); setError('') }}>NÄCHSTES TRAINING</button>}
        <button onClick={() => exitRun(false)}>ZUR TRAININGSAUSWAHL</button>
      </section> : <>
        <Clock run={run} seconds={seconds}/><div className="custom-live"><strong>{current.points} Punkte</strong>{isSeriesGame(run.game) && <span>Längste Serie: {current.longest}{run.game === 'favorite-double' ? ' Doppeltreffer' : ' Anwürfe'}</span>}</div>
        {run.phase === 'saving' ? <section className="custom-result"><h2>{error ? 'Ergebnis noch nicht synchronisiert' : 'ERGEBNIS WIRD GESPEICHERT …'}</h2><p>Dein Ergebnis bleibt auf diesem Gerät erhalten.</p>{error && <button onClick={() => setRetry(n => n + 1)}>ERNEUT VERSUCHEN</button>}</section> : <>
          {run.game === 'bulls-warm-up' ? <div className="custom-bulls">{[['doubleBull', 'DOPPELBULL', 50], ['singleBull', 'SINGLE BULL', 25]].map(([field, label, points]) => <section key={field}><span>{label} · {points}</span><strong>{run[field]}</strong><div><button disabled={!seconds || run[field] === 0} aria-label={`${label} minus`} onClick={e => hit(field, -1, e)}>−</button><button disabled={!seconds} aria-label={`${label} plus`} onClick={e => hit(field, 1, e)}>+</button></div></section>)}</div> : run.game === 'double-route' ? <>
            <div className="custom-route-order">{(run.route ?? DEFAULT_ROUTE).map((target, index) => <span key={target} className={index === (run.routeThrows ?? []).length % 3 ? 'is-current' : ''}>D{target}</span>)}</div>
            <h2 className="custom-route-target">Jetzt auf D{(run.route ?? DEFAULT_ROUTE)[(run.routeThrows ?? []).length % 3]} werfen</h2>
            <p className="custom-route-note">Jeden Dart erfassen. Danach folgt automatisch das nächste Doppel.</p>
            <div className="custom-route-actions"><button disabled={!seconds} onClick={e => routeThrow(true, e)}>TREFFER · +1</button><button disabled={!seconds} onClick={e => routeThrow(false, e)}>DANEBEN</button></div>
            <RouteBreakdown run={run}/><button disabled={!seconds || !(run.routeThrows ?? []).length} onClick={() => setRun(r => ({ ...r, routeThrows: r.routeThrows.slice(0, -1) }))}>LETZTEN WURF ZURÜCKNEHMEN</button>
          </> : <>
            {run.game === 'favorite-double' && <label className="custom-select-label">GESPIELTES DOPPEL<select aria-label="Gespieltes Doppel" value={run.favoriteDouble ?? 16} disabled={!seconds && !hasOpenEntry(run)} onChange={e => { const target = Number(e.target.value); setRun(r => ({ ...r, favoriteDouble: target })); setError('') }}>{Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={n}>D{n} · {n * 2} Punkte je Treffer</option>)}</select><small>Erst mit Dart 1 treffen, dann bis zum ersten Fehlwurf fortsetzen. Gesamtpunkte der Serie eingeben – die Trefferzahl wird automatisch berechnet.</small></label>}
            {seconds === 0 && hasOpenEntry(run) && <p role="status">Zeit abgelaufen. Schließe die bereits begonnene Serie ab oder verwirf sie.</p>}
            <ScoreKeypad value={run.score} onChange={changeScore} onConfirm={confirmScore} disabled={run.choosing || (!seconds && !hasOpenEntry(run))} maxScore={run.game === 'favorite-double' ? 99999 : 3600} maxDigits={run.game === 'favorite-double' ? 5 : 4} quick={[]} />
            {hasOpenEntry(run) && <button onClick={() => { setRun(r => ({ ...r, score: '', choosing: false })); setError('') }}>EINGABE VERWERFEN</button>}
            <div className="custom-history"><h2>GESPEICHERTE SERIEN</h2>{run.entries.map((e, i) => <article key={i}><strong>{e.points} Punkte</strong><span>{e.double ? `D${e.double} · ${e.count} Doppeltreffer` : `${e.count} erfolgreiche Anwürfe`}</span></article>)}</div>
            <button disabled={!seconds || !run.entries.length || run.choosing} onClick={() => setRun(r => ({ ...r, entries: r.entries.slice(0, -1) }))}>LETZTE SERIE ZURÜCKNEHMEN</button>
          </>}
          <button className="custom-exit" onClick={() => setLeave(true)}>TRAINING VERLASSEN</button>
        </>}
      </>}
    </>}
    {editing && <div className="training-sheet-backdrop"><section className="training-sheet" role="dialog" aria-modal="true" aria-label="Spieldauer wählen"><h2>{editing.game.title}</h2><p>Wie lange möchtest du trainieren?</p><div className="training-chips">{DURATIONS.map(m => <button key={m} aria-pressed={m === duration} onClick={() => setDuration(m)}>{m} Min.</button>)}</div>{editing.game.id === 'double-route' && <RouteSelector value={selectedRoute} onChange={setSelectedRoute}/>}<button onClick={() => { const task = { id: editing.game.id, minutes: duration, ...(editing.game.id === 'double-route' ? { route: selectedRoute } : {}) }; setPlan(list => editing.index == null ? [...list, task] : list.map((p, i) => i === editing.index ? task : p)); setEditing(null) }}>{editing.index == null ? 'HINZUFÜGEN' : 'SPEICHERN'}</button><button onClick={() => setEditing(null)}>ABBRECHEN</button></section></div>}
    {run?.choosing && <div className="training-sheet-backdrop"><section className="training-sheet" role="dialog" aria-modal="true" aria-label="Wie viele Combos?"><h2>Wie viele Combos?</h2><p>{run.score} Punkte · Anzahl aufeinanderfolgender erfolgreicher Anwürfe. 1 = ein Anwurf ohne Fortsetzung.</p>{error && <p role="alert">{error}</p>}<div className="custom-combo-picker">{Array.from({ length: 20 }, (_, i) => i + 1).map(n => <button key={n} disabled={!validCombo(Number(run.score), n, run.game)} onClick={() => chooseCombo(n)}>{n}</button>)}</div><button onClick={() => setRun(r => ({ ...r, choosing: false }))}>PUNKTE KORRIGIEREN</button><button onClick={() => { setRun(r => ({ ...r, choosing: false, score: '' })); setError('') }}>EINGABE VERWERFEN</button></section></div>}
    {leave && <div className="training-sheet-backdrop"><section className="training-sheet" role="alertdialog" aria-modal="true"><h2>Training verlassen?</h2><p>Beim Fortsetzen läuft die Zeit weiter. Bei einem Abbruch wird kein Ergebnis gespeichert.</p><button onClick={() => exitRun(false)}>SPÄTER FORTSETZEN</button><button onClick={() => exitRun(true)}>TRAINING ABBRECHEN</button><button onClick={() => setLeave(false)}>WEITERSPIELEN</button></section></div>}
  </main>
}
