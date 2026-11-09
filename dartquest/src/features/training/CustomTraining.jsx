import TrainingMetronome from './TrainingMetronome'
import {METRONOME_TRAINING_GAMES} from './metronomeModel'
import Metronome from './Metronome'
import FocusSwitchPlay, {FocusOptions} from './FocusSwitch'
import {enterFocusResult,focusVariant} from './focusSwitchRules'
import FavoriteComboFrame from './FavoriteComboFrame'
import TrainingScoreboard from './TrainingScoreboard'
import TrainingVisitActions from './TrainingVisitActions'
import { VISIT_IDLE_MS, tapFavoriteCombo, flushFavoriteCombo, isVisitLocked, hasVisits, isPaused, clockNow, toggleTrainingPause, flushVisit, enterBullHit, enterRouteHit, emptyVisit, enterCombo, enterFavoriteSingle, rememberVisit, undoVisit } from './trainingVisits'
import { normalizeTrainingName } from './freeTrainingSession'
import useCountdownAudio from './useCountdownAudio'
import BullCounter from './BullCounter'
import { unlockTrainingAudio } from './trainingAudio'
import TrainingIcon from './TrainingIcon'
import { AroundClockOptions, AroundClockComparison } from './AroundClockDetails'
import { useEffect, useRef, useState } from 'react'
import { ScoreKeypad } from '../campaignModes/components/CampaignGameUI'
import { triggerHaptic } from '../settings/haptics'
import { possibleComboCounts, FAVORITE_DOUBLES, CUSTOM_GAMES, DEFAULT_ROUTE, DURATIONS, beginTimedFinalEntry, finalEntryUsed, canEnterTrainingScore, finishTimedFinalEntry, bullsFinalHits, finishBullsFinalEntry, aroundVariant, elapsedClockMs, finishAroundClock, isAroundClock, recordAroundMiss, bestResults, favoriteSessionCounts, favoriteDoubleEntry, favoritePendingCount, hasOpenEntry, isSeriesGame, pointsLabel, recordRouteThrow, remainingSeconds, routeLabel, summary, validCombo } from './customTrainingRules'
import CustomTrainingDetails, { FavoriteDoubleSelector, RouteBreakdown, RouteSelector } from './CustomTrainingDetails'
import { clearCustomRun, completeCustomRun, loadCustomHistory, loadCustomRun, localCustomHistory, saveCustomRun, startCustomRun } from './customTrainingStorage'
import CustomTrainingStatistics from './CustomTrainingStatistics'
import './CustomTraining.css'
import './trainingMissButtons.css'

function Clock({ run, seconds, onPause }) {
  const around = isAroundClock(run.game)
  const ratio = around ? 1 : seconds / (run.minutes * 60)
  return <><button className="training-pause" type="button" aria-label={isPaused(run) ? 'Training fortsetzen' : 'Training pausieren'} aria-pressed={isPaused(run)} disabled={run.phase!=='playing'} onClick={onPause}><svg viewBox="0 0 24 24" aria-hidden="true">{isPaused(run)?<path d="m9 5 11 7-11 7Z"/>:<path d="M7 5h3v14H7zm7 0h3v14h-3z"/>}</svg></button><div className={`custom-clock${!around && seconds <= 60 ? ' is-urgent' : ''}`} role="timer" aria-label={`${around ? 'Spielzeit' : 'Restzeit'} ${Math.floor(seconds / 60)} Minuten ${seconds % 60} Sekunden`}>
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="clock-track" cx="60" cy="60" r="53"/><circle className="clock-progress" cx="60" cy="60" r="53" pathLength="1" strokeDasharray={`${ratio} 1`} /></svg>
    <div><strong>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong><small>{isPaused(run) ? 'PAUSE' : around ? 'SPIELZEIT' : 'RESTZEIT'}</small></div>
  </div></>
}

export default function CustomTraining({ activeProfile, onBack, freeTraining = false }) {
  const userId = activeProfile?.id
  const [metronome,setMetronome]=useState(false)
  const [trainingName, setTrainingName] = useState('')
  const [plan, setPlan] = useState([]), [editing, setEditing] = useState(null), [duration, setDuration] = useState(15)
  const [prepared, setPrepared] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(DEFAULT_ROUTE)
  const [selectedFavoriteDouble, setSelectedFavoriteDouble] = useState(16)
  const [includeBull, setIncludeBull] = useState(false)
  const [focusSize,setFocusSize] = useState(2)
  const [run, setRun] = useState(null), [savedRun, setSavedRun] = useState(() => loadCustomRun(userId))
  const [now, setNow] = useState(()=>Date.now()), [statsGame, setStatsGame] = useState(null)
  const [history, setHistory] = useState(() => localCustomHistory(userId))
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0), [leave, setLeave] = useState(false)
  const [favoriteFeedback,setFavoriteFeedback] = useState(null)
  const favoriteFeedbackTimer = useRef(null)
  useEffect(() => () => clearTimeout(favoriteFeedbackTimer.current), [])
  const finishing = useRef(false)
  const seconds = run ? isAroundClock(run.game) ? Math.floor(elapsedClockMs(run, now) / 1000) : remainingSeconds(run.endAt, clockNow(run,now)) : 0
  const timedFinal = run?.phase === 'final-entry'
  const finalUsed = finalEntryUsed(run)
  const bullFinal = run?.phase === 'bulls-final'
  const finalHits = bullsFinalHits(run)
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
    if (!run || run.phase !== 'playing' || isPaused(run)) return
    const tick = () => setNow(Date.now())
    const timer = setInterval(tick, 250)
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [run?.id, run?.phase, run?.pausedAt])
  useCountdownAudio(run?.id,seconds,Boolean(run && !isPaused(run) && !isAroundClock(run.game) && ['playing','bulls-final','final-entry','saving'].includes(run.phase)))

  useEffect(() => {
    if (run?.phase === 'playing' && !isPaused(run) && !isAroundClock(run.game) && seconds === 0) {
      setRun(r => ({...beginTimedFinalEntry(r),finalVisitBase:r.visits?.length}))
    }
  }, [seconds, run])
  useEffect(() => {
    if (hasVisits(run) && !isPaused(run) && run.pendingVisit && ['playing','bulls-final','final-entry'].includes(run.phase)) {
      const timer=setTimeout(()=>setRun(r=>flushVisit(r)),Math.max(0,VISIT_IDLE_MS-(Date.now()-run.pendingVisit.at)))
      return ()=>clearTimeout(timer)
    }
  },[run?.pendingVisit,run?.pausedAt,run?.phase])
  useEffect(()=>{
    if(run?.game!=='favorite-double'||!favoritePendingCount(run)||run.favoriteComboAt==null||isPaused(run)||!['playing','final-entry'].includes(run.phase))return
    const tick=()=>{setNow(Date.now());setRun(r=>flushFavoriteCombo(r))}
    const interval=setInterval(tick,100)
    const timer=setTimeout(tick,Math.max(0,VISIT_IDLE_MS-(Date.now()-run.favoriteComboAt)))
    return()=>{clearInterval(interval);clearTimeout(timer)}
  },[run?.favoriteComboAt,run?.favoriteComboCount,run?.pausedAt,run?.phase])
  useEffect(()=>{
    if(!run?.visitBlockedUntil||isPaused(run))return
    const timer=setTimeout(()=>setNow(Date.now()),Math.max(0,run.visitBlockedUntil-Date.now()))
    return ()=>clearTimeout(timer)
  },[run?.visitBlockedUntil,run?.pausedAt])
  useEffect(() => {
    if (run?.phase !== 'saving' || finishing.current || (freeTraining && !run.nameConfirmed)) return
    finishing.current = true
    setError('')
    completeCustomRun(userId, run).then(result => {
      setHistory(rows => [result, ...rows.filter(r => r.id !== result.id)])
      setRun(r => ({ ...r, ...(isAroundClock(r.game) ? result.payload : {}), phase: 'result' }))
    }).catch(e => setError(e.message)).finally(() => { finishing.current = false })
  }, [run?.phase, run?.id, run?.nameConfirmed, retry, userId, freeTraining])

  async function start(queue, index = 0) {
    if (busy) return
    unlockTrainingAudio()
    clearTimeout(favoriteFeedbackTimer.current);setFavoriteFeedback(null)
    setBusy(true); setError('')
    try {
      const task = queue[index]
      const favoriteDouble = FAVORITE_DOUBLES.includes(task.favoriteDouble) ? task.favoriteDouble : 16
      const next = await startCustomRun(userId, task.id, task.minutes, {...task,favoriteDouble})
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
    if (!['playing','bulls-final'].includes(run.phase)) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    event.currentTarget.animate?.([
      { transform: 'scale(1)', boxShadow: '0 0 0 0 #8be8b700' },
      { transform: reducedMotion ? 'scale(1)' : 'scale(1.025)', boxShadow: '0 0 28px 3px #8be8b74d, inset 0 0 20px #8be8b718' },
      { transform: 'scale(1)', boxShadow: '0 0 0 0 #8be8b700' },
    ], { duration: reducedMotion ? 160 : 380, easing: 'ease-out' })
    triggerHaptic('light'); setRun(r => enterBullHit(r,field,delta)); setNow(Date.now())
  }
  function changeScore(value) {
    if(isVisitLocked(run))return
    if (hasVisits(run)&&timedFinal&&run.visits.length>run.finalVisitBase)return
    if (!canEnterTrainingScore(run)) return
    setRun(r => ({ ...r, score: value })); setError('')
  }
  function confirmScore() {
    if(isVisitLocked(run))return
    const points = Number(run.score)
    if (run.game === 'favorite-double') {
      const entry = favoriteDoubleEntry(points, run.favoriteDouble ?? 16)
      if (!run.score || !entry) { setError(`Bitte ein positives Vielfaches von ${(run.favoriteDouble ?? 16) * 2} eingeben – für D${run.favoriteDouble ?? 16}.`); return }
      setRun(r => ({ ...r, entries: [...r.entries, entry], score: '', choosing: false })); setError(''); return
    }
    if (!run.score || !Array.from({ length: 20 }, (_, i) => i + 1).some(count => validCombo(points, count, run.game))) { setError(run.game === 'triple-20-19-18-combo' ? 'Diese Punkte sind mit 20, 19 und 18 und mindestens einem Triple pro Aufnahme nicht möglich. Bitte korrigieren.' : 'Bitte 60 bis 3600 Punkte eingeben.'); return }
    const choices=possibleComboCounts(points,run.game)
    if(choices.length===1){chooseCombo(choices[0]);return}
    setRun(r => ({ ...r, choosing: true })); setError('')
  }
  function chooseCombo(count) {
    const points = Number(run.score)
    if (!validCombo(points, count, run.game)) { setError('Punkte und Anzahl erfolgreicher Anwürfe passen nicht zusammen.'); return }
    setRun(r => enterCombo(r,points,count,r.comboEndedByMiss ?? r.phase==='playing')); setError('')
  }
  const favoriteCount = favoritePendingCount(run)
  const favoriteCounts = favoriteSessionCounts(run)
  function favoriteSingle(event) {
    if (enterFavoriteSingle(run) === run) { setNow(Date.now()); return }
    const button = event.currentTarget
    button.getAnimations?.().forEach(animation => animation.cancel())
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    button.animate?.([
      { transform:'scale(1)', background:'#8be8b7', boxShadow:'0 0 0 #8be8b700' },
      { transform:reduced?'scale(1)':'scale(.97)', background:'#c8ffdf', boxShadow:'0 0 22px #8be8b766, inset 0 0 12px #ffffff44' },
      { transform:'scale(1)', background:'#8be8b7', boxShadow:'0 0 0 #8be8b700' },
    ],{duration:reduced?180:380,easing:'ease-out'})
    clearTimeout(favoriteFeedbackTimer.current)
    setFavoriteFeedback({points:(run.favoriteDouble ?? 16)*2})
    favoriteFeedbackTimer.current=setTimeout(()=>setFavoriteFeedback(null),850)
    triggerHaptic('light'); setRun(r => enterFavoriteSingle(r)); setNow(Date.now()); setError('')
  }
  function favoriteCombo() { if(isVisitLocked(run))return; triggerHaptic('light'); setRun(r => tapFavoriteCombo(r)); setNow(Date.now()); setError('') }
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
  if (metronome) return <Metronome userId={userId} freeTraining={freeTraining} onBack={()=>setMetronome(false)}/>
  if (freeTraining && run?.phase === 'saving' && !run.nameConfirmed) return <main className="custom-training training-builder"><section className="free-training-name"><span className="bulls-eyebrow">TRAINING ABGESCHLOSSEN</span><h1>Wer hat trainiert?</h1><p>Dein Name ist freiwillig. Das Ergebnis bleibt mit Datum und Uhrzeit auf diesem Gerät sichtbar.</p><form onSubmit={event => {event.preventDefault();setRun(r=>({...r,trainingName:normalizeTrainingName(trainingName),nameConfirmed:true}))}}><label htmlFor="training-player-name">Name (optional)</label><input id="training-player-name" autoComplete="nickname" maxLength={40} value={trainingName} onChange={event=>setTrainingName(event.target.value)} placeholder="Dein Name"/><button className="training-start-button" type="submit">ERGEBNIS SPEICHERN</button><button type="button" onClick={()=>setRun(r=>({...r,trainingName:'',nameConfirmed:true}))}>ÜBERSPRINGEN</button></form></section></main>
  if (statsGame) return <CustomTrainingStatistics freeTraining={freeTraining} activeProfile={activeProfile} initialGame={statsGame} initialMinutes={15} initialFocusSize={prepared?.queue[prepared.index]?.focusSize ?? run?.focusSize ?? 2} initialRoute={prepared?.queue[prepared.index]?.route ?? run?.route ?? DEFAULT_ROUTE} initialIncludeBull={prepared?.queue[prepared.index]?.includeBull ?? run?.includeBull ?? false} onBack={() => setStatsGame(null)}/>
  if (prepared) {
    const next = prepared.queue[prepared.index]
    const nextGame = CUSTOM_GAMES.find(g => g.id === next.id)
    return <main className="custom-training training-builder"><header className="training-page-header"><button aria-label="Zurück" disabled={busy} onClick={() => { setPrepared(null); setError('') }}>‹</button><div><span>ANGEPASSTES TRAINING · {prepared.index + 1} / {prepared.queue.length}</span><h1>{nextGame.title}</h1></div></header><section className="custom-result"><span>BEREIT FÜR DEIN TRAINING?</span><h2>{isAroundClock(next.id) ? aroundVariant(next.includeBull) : `${next.minutes} Minuten`}</h2><p>{nextGame.description}</p>{isAroundClock(next.id) && <><AroundClockOptions value={next.includeBull} disabled={busy} onChange={includeBull => setPrepared(p => ({ ...p, queue: p.queue.map((task, index) => index === p.index ? { ...task, includeBull } : task) }))}/><p>Spiele die Ziele in Reihenfolge. Trage nur Fehlwürfe ein. Wenn du alle Ziele getroffen hast, tippe auf „Spiel beendet“.{next.includeBull ? ' Am Ende zählt Bull 25 oder 50.' : ''}</p></>}{next.id==='focus-switch'&&<FocusOptions value={next.focusSize} disabled={busy} onChange={focusSize=>setPrepared(p=>({...p,queue:p.queue.map((task,index)=>index===p.index?{...task,focusSize}:task)}))}/ >}{next.id === 'favorite-double' && <FavoriteDoubleSelector value={next.favoriteDouble} disabled={busy} onChange={favoriteDouble => setPrepared(p => ({ ...p, queue: p.queue.map((task, index) => index === p.index ? { ...task, favoriteDouble } : task) }))}/>}{next.id === 'double-route' && <RouteSelector value={next.route} disabled={busy} onChange={route => setPrepared(p => ({ ...p, queue: p.queue.map((task, index) => index === p.index ? { ...task, route } : task) }))}/>}<p>Die Zeit läuft erst, wenn du auf „Starten“ drückst.</p><button onClick={() => setStatsGame(next.id)} disabled={busy}>STATISTIK</button>{error && <p className="custom-error" role="alert">{error}</p>}<button className="training-start-button" disabled={busy} onClick={() => start(prepared.queue, prepared.index)}>{busy ? 'WIRD GESTARTET …' : 'STARTEN'}</button></section></main>
  }

  return <main data-game={run?.game} className={`custom-training training-builder${run && run.phase !== 'result' ? ' custom-playing' : ''}${timedFinal ? ' custom-final-entry' : ''}`}><header className="training-page-header"><button aria-label="Zurück" disabled={run?.phase === 'saving' && !error} onClick={() => run ? run.phase === 'result' ? exitRun(false) : setLeave(true) : onBack()}>‹</button><div><span>ANGEPASSTES TRAINING</span><h1>{game?.title ?? 'Dein Trainingsplan'}</h1></div></header>
    {error && <p className="custom-error" role="alert">{error}</p>}
    {!run ? <>
      {savedRun && <button className="training-resume-button" onClick={() => { unlockTrainingAudio(); setRun(savedRun.game==='favorite-double'&&favoritePendingCount(savedRun)>0?{...savedRun,favoriteComboAt:savedRun.favoriteComboAt??Date.now()}:savedRun); setNow(Date.now()) }}>TRAINING FORTSETZEN</button>}
      <section className="training-category"><h2>SPIELE HINZUFÜGEN</h2>{CUSTOM_GAMES.map(g => <article key={g.id}><button className="training-template-toggle" onClick={() => { setEditing({ game: g, index: null }); setDuration(15); setSelectedRoute(DEFAULT_ROUTE); setSelectedFavoriteDouble(16); setIncludeBull(false);setFocusSize(2) }}><i className="custom-game-icon"><TrainingIcon game={g.id}/></i><span><strong>{g.title}</strong><small>{g.description}</small></span><b className="custom-game-add" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg></b></button><button className="custom-game-statistics" title={`Statistik: ${g.title}`} aria-label={`Statistik: ${g.title}`} onClick={() => setStatsGame(g.id)}><TrainingIcon chart/></button></article>)}</section>
      <button className="training-metronome-launch" onClick={()=>setMetronome(true)}><span aria-hidden="true">◷</span><div><strong>Metronom</strong><small>Deinen Wurfrhythmus einstellen und abspielen</small></div><b aria-hidden="true">›</b></button>
      {plan.length > 0 && <section className="custom-plan"><h2>DEIN TRAININGSPLAN</h2>{plan.map((p, i) => <article key={i}><span className="custom-plan-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><strong>{CUSTOM_GAMES.find(g => g.id === p.id)?.title} · {isAroundClock(p.id) ? aroundVariant(p.includeBull) : `${p.minutes} Min.`}{p.id==='focus-switch'&&<small> · {focusVariant(p.focusSize)}</small>}{p.id === 'double-route' && <small> · {routeLabel(p.route ?? DEFAULT_ROUTE)}</small>}{p.id === 'favorite-double' && <small> · D{p.favoriteDouble ?? 16}</small>}</strong><button onClick={() => { setEditing({ game: CUSTOM_GAMES.find(g => g.id === p.id), index: i }); setDuration(p.minutes); setSelectedRoute(p.route ?? DEFAULT_ROUTE); setSelectedFavoriteDouble(FAVORITE_DOUBLES.includes(p.favoriteDouble) ? p.favoriteDouble : 16); setIncludeBull(Boolean(p.includeBull));setFocusSize(p.focusSize??2) }}>Bearbeiten</button><div className="custom-plan-controls"><button aria-label="Übung nach oben verschieben" disabled={i === 0} onClick={() => movePlan(i, -1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button><button aria-label="Übung nach unten verschieben" disabled={i === plan.length - 1} onClick={() => movePlan(i, 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg></button><button className="custom-plan-remove" aria-label="Übung entfernen" onClick={() => setPlan(list => list.filter((_, j) => i !== j))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button></div></article>)}</section>}
      {!userId && <p>{freeTraining ? 'Freies Training: Abgeschlossene Ergebnisse bleiben mit Datum und Uhrzeit auf diesem Gerät.' : 'Gasttraining: Ergebnisse werden auf diesem Gerät gespeichert.'}</p>}
      <div className="custom-start-dock"><button className="training-start-button" disabled={!plan.length || busy || Boolean(savedRun)} onClick={() => { setPrepared({ queue: [...plan], index: 0 }); setError('') }}>TRAINING STARTEN</button></div>
      {savedRun && <p>Setze dein gespeichertes Training fort oder beende es dort, bevor du ein neues startest.</p>}
    </> : <>
      {run.phase === 'result' ? <section className="custom-result"><span>TRAINING BEENDET · {isAroundClock(run.game) ? aroundVariant(run.includeBull) : `${run.minutes} MINUTEN`}</span><h2>{isAroundClock(run.game) ? `${run.misses} Fehlwürfe` : run.game==='focus-switch'?`${current.points} ${current.points===1?'Combo':'Combos'} geschafft`:pointsLabel(current.points)}</h2>
        <CustomTrainingDetails run={run} showEntries/>
        {isAroundClock(run.game) ? <AroundClockComparison run={run} rows={history}/> : (() => { const best = bestResults(run.game==='focus-switch'?history.filter(row=>row.payload.focusSize===run.focusSize):history, run.game, run.minutes, run.id, run.game === 'double-route' ? run.route : undefined); const metric = isSeriesGame(run.game) ? 'longest' : 'points'; return <><h3>{current[metric] > best[metric] ? 'NEUER REKORD!' : 'DEIN REKORDVERGLEICH'}</h3><p>Bisher: {best[metric]} · Heute: {current[metric]}{metric === 'longest' ? run.game === 'favorite-double' ? ' Doppeltreffer' : ' erfolgreiche Anwürfe' : run.game==='focus-switch'?' Combos':' Punkte'}</p>{metric === 'longest' && <p>Bisherige Serienpunkte: {best.bestSeries} · Sitzungsgesamtpunkte: {best.points}</p>}</> })()}
        <button onClick={() => setStatsGame(run.game)}>STATISTIK ANSEHEN</button>
        {run.queue && run.index + 1 < run.queue.length && <button className="training-start-button" disabled={busy} onClick={() => { setPrepared({ queue: run.queue, index: run.index + 1 }); setError('') }}>NÄCHSTES TRAINING</button>}
        <button onClick={() => exitRun(false)}>ZUR TRAININGSAUSWAHL</button>
      </section> : <section className={`custom-play-stage${!isAroundClock(run.game) && seconds <= 60 ? ' is-final-minute' : ''}`}>
        <div className="custom-play-hud"><Clock run={run} seconds={seconds} onPause={()=>{unlockTrainingAudio();setRun(r=>toggleTrainingPause(r));setNow(Date.now())}}/><TrainingScoreboard run={run} current={current}/></div>
        {hasVisits(run)&&isAroundClock(run.game)&&<small className="visit-history-note">Fehlwürfe zählen · Aufnahmenbilanz nach Spielende</small>}
        {isPaused(run) && <div className="training-paused-note" role="status">PAUSIERT · Zeit und Eingaben angehalten</div>}
        {timedFinal && <div className="custom-bulls-final-note custom-timed-final-note" role="status"><strong>ZEIT ABGELAUFEN · LETZTE EINGABE</strong><span>{run.game==='focus-switch'?'Trage noch das Ergebnis deiner letzten, vor Ablauf geworfenen Aufnahme ein.':run.game === 'double-route' ? `${finalUsed} / 3 letzte Pfeile erfasst.` : run.game === 'favorite-double' ? `${finalUsed} / 3 zusätzliche Treffer erfasst. Begonnene Combo wird automatisch gespeichert.` : finalUsed ? 'Letzte Combo gespeichert. Du kannst sie noch korrigieren oder fertigstellen.' : 'Trage noch deine letzte Combo mit Punkten und Anzahl ein.'}</span></div>}
        {run.phase === 'saving' ? <div className="custom-saving"><h2>{error ? 'Ergebnis noch nicht synchronisiert' : 'ERGEBNIS WIRD GESPEICHERT …'}</h2><p>{freeTraining ? 'Dein Ergebnis wird im Geräteverlauf gespeichert.' : 'Dein Ergebnis bleibt auf diesem Gerät erhalten.'}</p>{error && <button onClick={() => setRetry(n => n + 1)}>ERNEUT VERSUCHEN</button>}</div> : <div className="custom-play-inputs" inert={isPaused(run)||isVisitLocked(run,now)}>
          {run.game==='focus-switch'?<FocusSwitchPlay run={run} onResult={hits=>{triggerHaptic(hits===run.focusSize?'success':'light');setRun(r=>enterFocusResult(r,hits));setNow(Date.now())}}/>:isAroundClock(run.game) ? <div className="custom-around-play"><div className="custom-around-count" aria-live="polite"><strong>{run.misses}</strong><span>FEHLWÜRFE</span></div><button className="custom-around-miss training-miss-action" onClick={event => { event.currentTarget.animate?.([{transform:'scale(1)'},{transform:'scale(.97)'},{transform:'scale(1)'}],{duration:220}); triggerHaptic('light'); setRun(r => rememberVisit(r,recordAroundMiss(r))) }}><strong>DANEBEN GEWORFEN</strong><span>+1 Fehlwurf</span></button><button className="custom-around-finish" onClick={() => { triggerHaptic('success'); setRun(r => finishAroundClock(r)) }}>SPIEL BEENDET</button><p>Erfolgreiche Treffer nicht eingeben. Beende das Spiel erst nach allen {run.includeBull ? '21' : '20'} Zielen.</p></div> : run.game === 'bulls-warm-up' ? <div className="custom-bulls-layout">{bullFinal && <div className="custom-bulls-final-note" role="status"><strong>ZEIT ABGELAUFEN · LETZTE EINGABE</strong><span>Nur noch die vor Ablauf geworfenen Pfeile: {finalHits} / 3 Treffer nachgetragen.</span></div>}<div className="custom-bulls">{[['doubleBull', 'DOPPELBULL', 50], ['singleBull', 'SINGLE BULL', 25]].map(([field, label, points]) => <section key={field} data-bull={field}><span>{label} · {points}</span><BullCounter value={run[field]}/><div><button disabled={bullFinal ? run[field] <= run.bullsFinalBase[field] : run[field] === 0} aria-label={label + ' minus'} onClick={e => hit(field, -1, e)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button><button disabled={isVisitLocked(run,now)||(bullFinal && finalHits >= 3)} aria-label={label + ' plus'} onClick={e => hit(field, 1, e)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button></div></section>)}</div>{bullFinal && <button className="custom-bulls-finish" onClick={() => setRun(r => finishBullsFinalEntry(flushVisit(r,Date.now(),true)))}>FERTIG · ERGEBNIS SPEICHERN</button>}</div> : run.game === 'double-route' && hasVisits(run) ? <div className="visit-route-play"><div className="visit-route-targets">{run.route.map(target=><section key={target}><span>D{target}</span><strong>{(run.routeThrows??[]).filter(d=>d.target===target&&d.hit).length+(run.pendingVisit?.hits?.includes(target)?1:0)}</strong><div><button aria-label={`D${target} minus`} disabled={!run.pendingVisit?.hits?.includes(target)} onClick={()=>setRun(r=>enterRouteHit(r,target,-1))}>−</button><button aria-label={`D${target} plus`} disabled={isVisitLocked(run,now)||run.pendingVisit?.hits?.includes(target)||(timedFinal&&run.visits.length>run.finalVisitBase)} onClick={()=>setRun(r=>enterRouteHit(r,target))}>+</button></div></section>)}</div><p>Pro Aufnahme ein Pfeil je Doppel. Nicht eingegebene Ziele zählen nach 5 Sekunden als daneben.</p></div> : run.game === 'double-route' ? <div className="custom-route-play">
            <div className="custom-route-order">{(run.route ?? DEFAULT_ROUTE).map((target, index) => <span key={target} className={index === (run.routeThrows ?? []).length % 3 ? 'is-current' : ''}>D{target}</span>)}</div>
            <h2 className="custom-route-target"><span>Dein nächstes Ziel</span><strong>D{(run.route ?? DEFAULT_ROUTE)[(run.routeThrows ?? []).length % 3]}</strong></h2>
            <div className="custom-route-actions"><button disabled={timedFinal ? finalUsed >= 3 : !seconds} onClick={e => routeThrow(true, e)}>TREFFER · +1</button><button className="training-miss-action" disabled={timedFinal ? finalUsed >= 3 : !seconds} onClick={e => routeThrow(false, e)}>DANEBEN</button></div>
            <RouteBreakdown run={run}/><button className="custom-route-undo" disabled={timedFinal ? (run.routeThrows ?? []).length <= run.finalEntryBase.routeThrows : !seconds || !(run.routeThrows ?? []).length} onClick={() => setRun(r => ({ ...r, routeThrows: r.routeThrows.slice(0, -1) }))}>LETZTEN WURF ZURÜCKNEHMEN</button>
          </div> : run.game === 'favorite-double' ? <div className="custom-favorite-play">
            
            <div className="favorite-session-counts" role="group" aria-label="Einzeltreffer und gespeicherte Combos"><div><strong key={favoriteCounts.singles}>{favoriteCounts.singles}</strong><span>EINZELTREFFER</span></div><div><strong key={favoriteCounts.combos}>{favoriteCounts.combos}</strong><span>COMBOS · AB 2 TREFFERN</span></div></div>
            <div className="custom-favorite-actions"><button aria-label="EINMAL GETROFFEN" className={`favorite-single${favoriteFeedback ? ' is-recorded' : ''}`} disabled={(!seconds && !timedFinal) || (timedFinal && finalUsed >= 3) || Boolean(favoriteCount)} onClick={favoriteSingle}><strong>{favoriteFeedback ? '+1 TREFFER' : 'EINMAL GETROFFEN'}</strong><small>{favoriteFeedback ? `+${favoriteFeedback.points} Punkte gespeichert` : `1 Treffer · ${(run.favoriteDouble ?? 16)*2} Punkte`}</small></button><button className="favorite-combo" disabled={(!seconds && !timedFinal) || (timedFinal && finalUsed >= 3)} onClick={favoriteCombo}><FavoriteComboFrame run={run} now={now}/><strong>COMBO +1</strong><small>Für jeden Treffer einmal tippen</small></button></div>
            <div className="custom-favorite-counter" aria-live="polite"><strong>{favoriteCount}</strong><span>Treffer in dieser Combo · {favoriteCount * (run.favoriteDouble ?? 16) * 2} Punkte</span></div>
            

          </div> : <div className="custom-score-layout">
            <div className="custom-entry-status" role="status">{seconds === 0 && hasOpenEntry(run) ? 'Zeit abgelaufen – begonnene Serie abschließen oder verwerfen.' : run.game === 'favorite-double' ? 'Gesamtpunkte der beendeten Doppelserie eingeben.' : 'Gesamtpunkte der beendeten Combo eingeben.'}</div>
            <ScoreKeypad value={run.score} onChange={changeScore} onConfirm={confirmScore} disabled={isVisitLocked(run,now)||run.choosing || !canEnterTrainingScore(run)||(hasVisits(run)&&timedFinal&&run.visits.length>run.finalVisitBase)} maxScore={run.game === 'favorite-double' ? 99999 : 3600} maxDigits={run.game === 'favorite-double' ? 5 : 4} quick={[]} />
            <div className="custom-entry-actions"><button disabled={!hasOpenEntry(run)} onClick={() => { setRun(r => ({ ...r, score: '', choosing: false })); setError('') }}>VERWERFEN</button><button disabled={(timedFinal ? run.entries.length <= run.finalEntryBase.entries : !seconds || !run.entries.length) || run.choosing} onClick={() => setRun(r => hasVisits(r)?undoVisit(r):({ ...r, entries: r.entries.slice(0, -1) }))}>LETZTE SERIE ZURÜCK</button></div>
            <section className="custom-run-history" aria-label="Gespeicherte Serien"><h2>GESPEICHERTE SERIEN · {run.entries.length}</h2><div>{run.entries.length ? run.entries.map((e, i) => <article key={i}><strong>{pointsLabel(e.points)}</strong><span>{e.double ? 'D' + e.double + ' · ' + e.count + ' Treffer' : e.count + ' Anwürfe'}</span></article>) : <p>Noch keine Serie erfasst.</p>}</div></section>
          </div>}
        </div>}
        {timedFinal && <button className="custom-bulls-finish" disabled={hasOpenEntry(run)} onClick={() => setRun(r => finishTimedFinalEntry(flushVisit(r,Date.now(),true)))}>FERTIG · ERGEBNIS SPEICHERN</button>}
        <TrainingVisitActions run={run} now={now} onEmpty={()=>{triggerHaptic('light');setRun(r=>emptyVisit(r))}} onUndo={()=>setRun(r=>undoVisit(r))}/><footer className="custom-play-footer">{METRONOME_TRAINING_GAMES.includes(run.game)&&<TrainingMetronome key={`${run.id}-${run.phase}-${Boolean(run.pausedAt)}-${leave}`} userId={userId} freeTraining={freeTraining} disabled={isPaused(run)||run.phase!=='playing'||leave}/>}<button className="custom-exit" disabled={run.phase === 'saving' && !error} onClick={() => setLeave(true)}>TRAINING VERLASSEN</button></footer>
      </section>}

    </>}
    {editing && <div className="training-sheet-backdrop"><section className="training-sheet" role="dialog" aria-modal="true" aria-label={isAroundClock(editing.game.id) ? 'Spielvariante wählen' : 'Spieldauer wählen'}><h2>{editing.game.title}</h2>{isAroundClock(editing.game.id) ? <AroundClockOptions value={includeBull} onChange={setIncludeBull}/> : <><p>Wie lange möchtest du trainieren?</p><div className="training-chips">{DURATIONS.map(m => <button key={m} aria-pressed={m === duration} onClick={() => setDuration(m)}>{m} Min.</button>)}</div></>}{editing.game.id==='focus-switch'&&<FocusOptions value={focusSize} onChange={setFocusSize}/ >}{editing.game.id === 'double-route' && <RouteSelector value={selectedRoute} onChange={setSelectedRoute}/>}{editing.game.id === 'favorite-double' && <FavoriteDoubleSelector value={selectedFavoriteDouble} onChange={setSelectedFavoriteDouble}/>}<button onClick={() => { const task = { id: editing.game.id, ...(editing.game.id==='focus-switch'?{focusSize}:{}), minutes: isAroundClock(editing.game.id) ? 0 : duration, ...(isAroundClock(editing.game.id) ? { includeBull } : {}), ...(editing.game.id === 'double-route' ? { route: selectedRoute } : {}), ...(editing.game.id === 'favorite-double' ? { favoriteDouble: FAVORITE_DOUBLES.includes(selectedFavoriteDouble) ? selectedFavoriteDouble : 16 } : {}) }; setPlan(list => editing.index == null ? [...list, task] : list.map((p, i) => i === editing.index ? task : p)); setEditing(null) }}>{editing.index == null ? 'HINZUFÜGEN' : 'SPEICHERN'}</button><button onClick={() => setEditing(null)}>ABBRECHEN</button></section></div>}
    {run?.choosing && !isPaused(run) && <div className="training-sheet-backdrop"><section className="training-sheet" role="dialog" aria-modal="true" aria-label="Wie viele Combos?"><h2>Wie viele Combos?</h2>{run.phase==='playing'&&<button onClick={()=>setRun(r=>toggleTrainingPause(r))}>TRAINING PAUSIEREN</button>}{hasVisits(run) && <label className="visit-ended-choice"><input type="checkbox" checked={run.comboEndedByMiss ?? run.phase==='playing'} onChange={event=>setRun(r=>({...r,comboEndedByMiss:event.target.checked}))}/>Anschließenden Fehlversuch mitzählen</label>}<p>{run.score} Punkte · Anzahl aufeinanderfolgender erfolgreicher Anwürfe. 1 = ein Anwurf ohne Fortsetzung.</p>{error && <p role="alert">{error}</p>}<div className="custom-combo-picker" ref={element => { if (element && !element.dataset.positioned) { element.scrollTop = element.scrollHeight; element.dataset.positioned = 'true' } }}>{Array.from({ length: 20 }, (_, i) => i + 1).map(n => <button key={n} disabled={!validCombo(Number(run.score), n, run.game)} style={{ gridColumn: 3 - ((n - 1) % 3), gridRow: 7 - Math.floor((n - 1) / 3) }} onClick={() => chooseCombo(n)}>{n}</button>)}</div><button onClick={() => setRun(r => ({ ...r, choosing: false }))}>PUNKTE KORRIGIEREN</button><button onClick={() => { setRun(r => ({ ...r, choosing: false, score: '' })); setError('') }}>EINGABE VERWERFEN</button></section></div>}
    {leave && <div className="training-sheet-backdrop"><section className="training-sheet" role="alertdialog" aria-modal="true"><h2>Training verlassen?</h2><p>{(bullFinal || timedFinal) ? 'Deine letzte Eingabe bleibt beim Fortsetzen erhalten. Bei einem Abbruch wird kein Ergebnis gespeichert.' : 'Beim Fortsetzen läuft die Zeit weiter. Bei einem Abbruch wird kein Ergebnis gespeichert.'}</p><button onClick={() => exitRun(false)}>SPÄTER FORTSETZEN</button><button onClick={() => exitRun(true)}>TRAINING ABBRECHEN</button><button onClick={() => setLeave(false)}>WEITERSPIELEN</button></section></div>}
  </main>
}
