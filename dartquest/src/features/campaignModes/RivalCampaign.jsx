import { useEffect, useRef, useState } from 'react'
import { applyVisit, checkoutAttemptsForFinish, createAiVisit, createChallengeRivalMatch, createRivalMatch, currentLegStats, getAvailableCheckoutDartCounts, isValidCheckoutAttempt, playerMatchStats, rivalAverageForLevel, rivalMatchResult, shouldRequestCheckoutConfirmation, undoPlayerRound } from './rivalEngine'
import { buildVisitRows } from './rivalHistory'
import { formatCheckoutStats } from './checkoutStatistics.js'
import { isCampaignLevelUnlocked, loadCampaignProgress, saveCampaignProgress } from './campaignModeStorage'
import { CampaignResult, ScoreKeypad } from './components/CampaignGameUI'
import CameraPreview from './components/CameraPreview'
import { grantFreePack } from '../cards/cardStorage'
import { explainField, getCheckoutAdvice, isBogeyNumber, isCheckoutScore } from '../checkout/checkoutGuide'
import './CampaignModes.css'
import './RivalMobile.css'
import './RivalScoreboardHistory.css'
import './CheckoutMobile.css'
import './RivalLevels.css'

const RIVAL_DRAFT_VERSION = 1

function draftKey(profileId) {
  return `dartquest-rival-active-match-v${RIVAL_DRAFT_VERSION}-${profileId || 'local'}`
}

function loadRivalDraft(profileId) {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey(profileId)))
    if (draft?.match && draft.match.winner == null) return draft
  } catch {
    /* ignore broken drafts */
  }
  return null
}

function saveRivalDraft(profileId, draft) {
  localStorage.setItem(draftKey(profileId), JSON.stringify({ ...draft, version: RIVAL_DRAFT_VERSION, updatedAt: new Date().toISOString() }))
}

function clearRivalDraft(profileId) {
  localStorage.removeItem(draftKey(profileId))
}

function recordedCheckoutDarts(match, playerIndex = 0) {
  if (Array.isArray(match?.currentLegCheckoutDarts)) return match.currentLegCheckoutDarts[playerIndex] ?? 0
  return (match?.legVisits ?? [])
    .filter((visit) => visit.player === playerIndex)
    .reduce((total, visit) => total + (visit.checkoutDarts ?? visit.doubleAttempts ?? 0), 0)
}

export default function RivalCampaign({ activeProfile, onProfileRewards, onBack, challenge = null, onChallengeComplete = null, cameraTest = false }) {
  const savedDraft = challenge || cameraTest ? null : loadRivalDraft(activeProfile?.id)
  const [progress, setProgress] = useState(() => loadCampaignProgress(activeProfile?.id, 'rival'))
  const [match, setMatch] = useState(() => challenge ? createChallengeRivalMatch(activeProfile?.name, challenge) : savedDraft?.match ?? null)
  const [input, setInput] = useState(() => savedDraft?.input ?? '')
  const [checkoutPrompt, setCheckoutPrompt] = useState(() => savedDraft?.checkoutPrompt ?? null)
  const [checkoutDartsInput, setCheckoutDartsInput] = useState(() => savedDraft?.checkoutDartsInput ?? savedDraft?.doubleAttempts ?? 0)
  const [checkoutHelpOpen, setCheckoutHelpOpen] = useState(false)
  const [reward, setReward] = useState(null)
  const [selectedResultLevel, setSelectedResultLevel] = useState(null)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const confirming = useRef(false)
  const challengeRewardGranted = useRef(false)
  const historyRef = useRef(null)
  const aiThinking = match?.active === 1 && match?.winner == null

  useEffect(() => {
    if (!match || match.active !== 1 || match.winner != null) return undefined
    const timer = window.setTimeout(() => {
      setMatch((current) => {
        if (current?.active !== 1) return current
        const visit = createAiVisit(current)
        const next = applyVisit(current, visit.points, visit.validCheckout, visit.dartsUsed)
        if (next.winner === 1 && !challenge && !cameraTest) {
          setProgress((currentProgress) => {
            const old = currentProgress.levels[next.level] || {}
            const saved = { ...currentProgress, levels: { ...currentProgress.levels, [next.level]: { ...old, lastMatch: rivalMatchResult(next) } } }
            saveCampaignProgress(activeProfile?.id, 'rival', saved)
            return saved
          })
        }
        return next
      })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [activeProfile?.id, cameraTest, challenge, match])

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [match?.legVisits?.length])

  useEffect(() => {
    if (challenge || cameraTest) return
    if (match && match.winner == null) {
      saveRivalDraft(activeProfile?.id, { match, input, checkoutPrompt, checkoutDartsInput })
      return
    }
    clearRivalDraft(activeProfile?.id)
  }, [activeProfile?.id, cameraTest, challenge, checkoutDartsInput, checkoutPrompt, input, match])

  async function storeResult(nextMatch) {
    if (nextMatch.winner == null) return
    if (cameraTest) return
    const matchResult = rivalMatchResult(nextMatch)
    if (challenge) {
      if (nextMatch.winner !== 0) return
      if (challengeRewardGranted.current) return
      challengeRewardGranted.current = true
      const delta = { xp: 75, coins: 35 }
      if (onProfileRewards) await onProfileRewards(delta)
      grantFreePack(activeProfile?.id, challenge.id)
      setReward({ ...delta, stars: 3, pack: true })
      return
    }

    const old = progress.levels[nextMatch.level] || {}
    if (nextMatch.winner !== 0) {
      const next = { ...progress, levels: { ...progress.levels, [nextMatch.level]: { ...old, lastMatch: matchResult } } }
      setProgress(next)
      saveCampaignProgress(activeProfile?.id, 'rival', next)
      return
    }

    const stars = nextMatch.players[1].legs === 0 ? 3 : nextMatch.players[1].legs === 1 ? 2 : 1
    const factor = stars === 3 ? 1.5 : stars === 2 ? 1.25 : 1
    const full = { xp: Math.round((35 + nextMatch.level * 5) * factor), coins: Math.round((15 + nextMatch.level * 3) * factor) }
    const paid = old.reward || { xp: 0, coins: 0 }
    const delta = { xp: Math.max(0, full.xp - paid.xp), coins: Math.max(0, full.coins - paid.coins) }
    if ((delta.xp || delta.coins) && onProfileRewards) await onProfileRewards(delta)

    const firstPack = !old.packGranted
    if (firstPack) grantFreePack(activeProfile?.id, `rival-${nextMatch.level}`)
    const stats = playerMatchStats(nextMatch.players[0])
    const next = {
      ...progress,
      levels: {
        ...progress.levels,
        [nextMatch.level]: {
          completed: true,
          stars: Math.max(old.stars || 0, stars),
          average: Math.max(old.average || 0, stats.average),
          bestAverage: Math.max(old.bestAverage || 0, stats.average),
          darts: old.darts ? Math.min(old.darts, stats.darts) : stats.darts,
          highestVisit: Math.max(old.highestVisit || 0, stats.highestVisit),
          bestCheckout: Math.max(old.bestCheckout || 0, stats.bestCheckout || 0),
          checkoutRate: stats.checkoutRate ?? old.checkoutRate ?? null,
          checkoutDarts: stats.checkoutDarts,
          successfulCheckouts: stats.successfulCheckouts,
          lastMatch: matchResult,
          reward: { xp: Math.max(paid.xp, full.xp), coins: Math.max(paid.coins, full.coins) },
          packGranted: true,
        },
      },
    }
    setProgress(next)
    saveCampaignProgress(activeProfile?.id, 'rival', next)
    setReward({ ...delta, stars, pack: firstPack })
  }

  function commit(validCheckout = false, checkoutDart = 3, checkoutDartsForLeg = 0, pointsOverride = null) {
    if (confirming.current || !match || match.active !== 0) return
    const points = pointsOverride == null ? Number(input) : Number(pointsOverride)
    if (!Number.isInteger(points) || points < 0 || points > 180) return
    const checkoutCompleted = shouldRequestCheckoutConfirmation(match.players[0].score, points)
    if (checkoutCompleted && !validCheckout) {
      setCheckoutPrompt({ points, checkout: true })
      setCheckoutDartsInput(recordedCheckoutDarts(match) + 1)
      return
    }

    const checkedCheckout = validCheckout && isValidCheckoutAttempt(points, checkoutDart)
    confirming.current = true
    setMatch((current) => {
      const next = applyVisit(current, points, checkedCheckout, checkoutDart, checkoutDartsForLeg)
      void storeResult(next)
      return next
    })
    setInput('')
    setCheckoutPrompt(null)
    setCheckoutDartsInput(0)
    window.setTimeout(() => { confirming.current = false }, 250)
  }

  function rejectCheckout() {
    const points = typeof checkoutPrompt === 'object' ? checkoutPrompt.points : checkoutPrompt
    setMatch((current) => {
      const next = applyVisit(current, points, false, 3, checkoutDartsInput)
      void storeResult(next)
      return next
    })
    setCheckoutPrompt(null)
    setInput('')
    setCheckoutDartsInput(0)
  }

  function requestCheckoutByLongPress(dartsUsed) {
    if (confirming.current || !match || match.active !== 0) return
    const points = match.players[0].score
    if (!getAvailableCheckoutDartCounts(points).includes(dartsUsed)) return

    confirming.current = true
    setCheckoutPrompt(null)
    setCheckoutDartsInput(0)
    setInput('')
    const next = applyVisit(match, points, true, dartsUsed, recordedCheckoutDarts(match) + checkoutAttemptsForFinish(points, dartsUsed))
    setMatch(next)
    void storeResult(next)
    window.setTimeout(() => { confirming.current = false }, 250)
  }

  function handleCameraDartScore(_score, dart) {
    if (!cameraTest || match?.active !== 0 || match?.winner != null) return
    setInput(String(dart.visitTotal))
    if (dart.complete) commit(false, 3, 0, dart.visitTotal)
  }

  function closeChallenge() {
    if (challenge) onChallengeComplete?.(challenge)
    onBack()
  }

  function closeMatchSelection() {
    if (!cameraTest) clearRivalDraft(activeProfile?.id)
    setCameraEnabled(false)
    setMatch(null)
    setInput('')
    setCheckoutPrompt(null)
    setCheckoutDartsInput(0)
  }

  function startMatch(level) {
    if (!cameraTest) clearRivalDraft(activeProfile?.id)
    setCameraEnabled(false)
    setSelectedResultLevel(null)
    setInput('')
    setCheckoutPrompt(null)
    setCheckoutDartsInput(0)
    setReward(null)
    setMatch(createRivalMatch(activeProfile?.name, level))
  }

  if (!match) {
    return (
      <RivalLevels
        progress={progress}
        selectedLevel={selectedResultLevel}
        onSelect={setSelectedResultLevel}
        onBack={onBack}
        onStart={startMatch}
        cameraTest={cameraTest}
      />
    )
  }

  const human = match.players[0]
  const ai = match.players[1]
  const humanLegStats = currentLegStats(match, 0)
  const aiLegStats = currentLegStats(match, 1)
  const rounds = buildVisitRows(match.legVisits ?? [], match.startScore)
  const availableCheckoutDarts = match.active === 0 ? getAvailableCheckoutDartCounts(human.score) : []
  const minimumCheckoutDarts = recordedCheckoutDarts(match) + 1
  const checkoutStatus = isBogeyNumber(human.score) ? 'bogey' : isCheckoutScore(human.score) ? 'checkout' : 'normal'
  const nextUnlocked = match.level < 40 && isCampaignLevelUnlocked(progress, match.level + 1)

  return (
    <main className={`rival-game${cameraTest ? ' camera-test-game' : ''}`}>
      <header>
        <button type="button" onClick={() => challenge ? onBack() : closeMatchSelection()}>‹</button>
        <div>
          <span>{cameraTest ? `KAMERA TEST · RIVALE ${match.level}` : challenge ? 'ZUFÄLLIGE HERAUSFORDERUNG' : `RIVALEN-LEVEL ${match.level} · Ø ${match.targetAverage}`}</span>
          <h1>First to {match.firstTo ?? 3} · {match.startScore}</h1>
        </div>
        <div className="rival-header-actions">{cameraTest && <button type="button" className={`rival-camera-toggle${cameraEnabled ? ' active' : ''}`} aria-pressed={cameraEnabled} onClick={() => setCameraEnabled((enabled) => !enabled)}>📷<span>Kamera</span></button>}<button type="button" className="rival-checkout-help-button" disabled={human.score < 2 || human.score > 170 || match.winner != null} onClick={() => setCheckoutHelpOpen(true)}>Checkout</button><button type="button" className="rival-undo" disabled={!match.history.length || aiThinking} onClick={() => { setMatch((current) => undoPlayerRound(current)); setInput('') }}>↶ Undo</button></div>
      </header>

      <section className="rival-scoreboard">
        <article className={`${match.active === 0 && match.winner == null ? 'active ' : ''}checkout-${checkoutStatus}`}><span>{human.name}</span><strong>{human.score}</strong><small className="rival-player-average">AVG <b>{formatLegAverage(humanLegStats.average)}</b></small></article>
        <div className="rival-legs"><small>LEGS</small><strong><b>{human.legs}</b><i>|</i><b>{ai.legs}</b></strong></div>
        <article className={match.active === 1 && match.winner == null ? 'active' : ''}><span>{ai.name}</span><strong>{ai.score}</strong><small className="rival-player-average">AVG <b>{formatLegAverage(aiLegStats.average)}</b></small></article>
      </section>

      <section ref={historyRef} className="rival-history" aria-label="Aufnahmeverlauf">
        <header><span>SCORE</span><span>PUNKTE</span><b>DARTS</b><span>SCORE</span><span>PUNKTE</span></header>
        <div className="rival-history-start"><span /><strong>{match.startScore}</strong><b /><span /><strong>{match.startScore}</strong></div>
        {rounds.map((round) => <div key={round.key}><VisitColumns visit={round.human} /><b>{round.darts}</b><VisitColumns visit={round.ai} /></div>)}
      </section>

      {aiThinking && <div className="rival-thinking" aria-live="polite">Rivale wirft …</div>}
      {match.winner == null && (cameraTest && cameraEnabled
        ? <CameraPreview onDartScore={handleCameraDartScore} />
        : <ScoreKeypad value={input} onChange={setInput} onConfirm={() => commit(false)} disabled={match.active !== 0} fill checkoutDartCounts={availableCheckoutDarts} onCheckoutLongPress={requestCheckoutByLongPress} />)}
      {checkoutHelpOpen && <CheckoutRouteOverlay score={human.score} onClose={() => setCheckoutHelpOpen(false)} />}
      {match.winner != null && (
        <CampaignResult title={match.winner === 0 ? 'Du hast gewonnen!' : 'Du hast verloren'}>
          <RivalResultDetails result={rivalMatchResult(match)} />
          {reward && (
            <div className="rival-result-reward">
              <strong className="result-stars">{'★'.repeat(reward.stars)}</strong>
              <p>+{reward.xp} XP · +{reward.coins} Coins{reward.pack && ' · 🎴 5er-Pack'}</p>
            </div>
          )}
          <button type="button" onClick={() => { setReward(null); challenge ? setMatch(createChallengeRivalMatch(activeProfile?.name, challenge)) : startMatch(match.level) }}>ERNEUT SPIELEN</button>
          <button type="button" onClick={() => { setReward(null); challenge ? closeChallenge() : closeMatchSelection() }}>{challenge ? 'ZURÜCK ZUR KARTE' : 'ZUR RIVALENAUSWAHL'}</button>
          {!challenge && <button type="button" disabled={!nextUnlocked} onClick={() => { setReward(null); startMatch(match.level + 1) }}>NÄCHSTER GEGNER</button>}
        </CampaignResult>
      )}
      {checkoutPrompt != null && (
        <div className="checkout-dialog dq-checkout-dialog">
          <section className={`rival-checkout-confirm${checkoutPrompt?.checkout ? ' is-checkout' : ''}`} role="dialog" aria-modal="true" aria-labelledby="rival-checkout-title">
            <div className="rival-checkout-emblem" aria-hidden="true"><span>♦</span><i /></div>
            <span className="dialog-eyebrow">DARTQUEST CHECKOUT</span>
            <h2 id="rival-checkout-title">{checkoutPrompt?.checkout ? 'Checkout bestätigen' : 'Doppelversuche erfassen'}</h2>
            <div className="rival-checkout-divider" aria-hidden="true"><i /></div>
            {checkoutPrompt?.finalVisitDarts ? <>
              <p>Wie viele Darts auf Doppel/Bull hast du in diesem Leg insgesamt benötigt?</p>
              <div className="checkout-darts-counter" aria-label="Checkout-Darts insgesamt"><button type="button" onClick={() => setCheckoutDartsInput((value) => Math.max(minimumCheckoutDarts, value - 1))} aria-label="Checkout-Darts verringern">−</button><strong>{checkoutDartsInput}</strong><button type="button" onClick={() => setCheckoutDartsInput((value) => value + 1)} aria-label="Checkout-Darts erhöhen">+</button></div>
              <button className="checkout-confirm" type="button" onClick={() => commit(true, checkoutPrompt.finalVisitDarts, checkoutDartsInput)}>CHECKOUT SPEICHERN</button>
            </> : <>
              <p>Wie viele Gesamtdarts wurden in der finalen Aufnahme verwendet?</p>
              <div className="checkout-attempt-choice" aria-label="Darts der finalen Aufnahme">
                {getAvailableCheckoutDartCounts(typeof checkoutPrompt === 'object' ? checkoutPrompt.points : checkoutPrompt).map((darts) => <button type="button" key={darts} onClick={() => { setCheckoutPrompt((current) => ({ ...current, finalVisitDarts: darts })); setCheckoutDartsInput(recordedCheckoutDarts(match) + checkoutAttemptsForFinish(checkoutPrompt.points, darts)) }}><strong>{darts}</strong><span className="checkout-card-darts" aria-hidden="true">{Array.from({ length: darts }, (_, index) => <i key={index} />)}</span><small>{darts === 1 ? 'Dart' : 'Darts'}</small></button>)}
              </div>
            </>}
            {checkoutPrompt?.checkout && <div className="rival-checkout-divider" aria-hidden="true"><i /></div>}
            <button className="checkout-bust" type="button" onClick={rejectCheckout}><span aria-hidden="true">↶</span>{checkoutPrompt?.checkout ? 'BUST – AUFNAHME WIEDERHOLEN' : 'AUFNAHME SPEICHERN'}</button>
          </section>
        </div>
      )}
    </main>
  )
}

function formatVisit(visit) {
  return visit ? `${visit.points}${visit.bust ? ' · Bust' : visit.checkout ? ' · Checkout' : ''}` : ''
}

function VisitColumns({ visit }) {
  if (!visit) return <><span className="rival-visit-score is-empty" /><strong className="rival-visit-rest is-empty" /></>
  return <><span className="rival-visit-score">{formatVisit(visit)}</span><strong className="rival-visit-rest">{visit.rest}</strong></>
}

function formatLegAverage(average) {
  return average == null ? '–' : average.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function CheckoutRouteOverlay({ score, onClose }) {
  const advice = getCheckoutAdvice(score, 3)
  const primary = advice.routes[0]
  const alternative = advice.routes[1]
  return <div className="rival-checkout-help" role="dialog" aria-modal="true" aria-labelledby="rival-checkout-help-title" onClick={onClose}><section onClick={(event) => event.stopPropagation()}><span>CHECKOUT</span><h2 id="rival-checkout-help-title">{score}</h2>{primary ? <><Route route={primary} />{alternative && <><small>ALTERNATIVE</small><Route route={alternative} /></>}</> : <div className="rival-checkout-setup"><strong>{score} ist kein 3-Dart-Checkout.</strong><p>{advice.setup?.text || 'Stelle dir einen Finish.'}</p></div>}<button type="button" onClick={onClose}>SCHLIESSEN</button></section></div>
}

function Route({ route }) {
  return <div className="rival-checkout-route">{route.map((field, index) => <span key={`${field.notation}-${index}`} title={explainField(field)}><b>{field.notation}</b>{index < route.length - 1 && <i>→</i>}</span>)}</div>
}

function RivalLevels({ progress, selectedLevel, onSelect, onBack, onStart, cameraTest = false }) {
  const levels = Array.from({ length: 40 }, (_, index) => index + 1)
  const result = selectedLevel ? progress.levels[selectedLevel] : null

  return (
    <main className={`campaign-levels rival-levels${cameraTest ? ' camera-test-levels' : ''}`}>
      <header>
        <button type="button" onClick={onBack}>‹</button>
        <div>
          <span>{cameraTest ? 'KAMERA TEST' : 'RIVALEN-KAMPAGNE'}</span>
          <h1>{cameraTest ? 'Testversion Kamera' : 'Rivalen-Kampagne'}</h1>
        </div>
      </header>

      <div className="campaign-level-grid">
        {levels.map((level) => {
          const unlocked = isCampaignLevelUnlocked(progress, level)
          const levelResult = progress.levels[level]
          const ownAverage = levelResult?.bestAverage ?? levelResult?.average
          return (
            <button type="button" key={level} disabled={!unlocked} onClick={() => levelResult?.completed ? onSelect(level) : onStart(level)}>
              <strong>{unlocked ? level : '🔒'}</strong>
              <span>Rivale {level}</span>
              <small>Ziel-Average {rivalAverageForLevel(level).toLocaleString('de-DE')}</small>
              {ownAverage != null && <small>Dein Average {ownAverage.toFixed(1)}</small>}
            </button>
          )
        })}
      </div>

      {result?.completed && (
        <div className="rival-level-result" role="dialog" aria-modal="true">
          <section>
            <span>RIVALE {selectedLevel}</span>
            <h2>Altes Ergebnis</h2>
            <strong>{result.stars ? '★'.repeat(result.stars) : '✓'}</strong>
            <RivalResultDetails result={result.lastMatch} legacy={result} />
            <button type="button" onClick={() => onStart(selectedLevel)}>LEVEL SPIELEN</button>
            <button type="button" onClick={() => onSelect(null)}>SCHLIESSEN</button>
          </section>
        </div>
      )}
    </main>
  )
}

function RivalResultDetails({ result, legacy = null }) {
  const legacyAverage = legacy?.bestAverage ?? legacy?.average
  if (!result) return <div className="rival-result-details is-legacy"><p>Match- und Leg-Statistiken: Nicht verfügbar</p><dl><div><dt>3-Dart-Average</dt><dd>{legacyAverage != null ? Number(legacyAverage).toFixed(1) : '–'}</dd></div><div><dt>Darts</dt><dd>{legacy?.darts ?? '–'}</dd></div><div><dt>Höchste Aufnahme</dt><dd>{legacy?.highestVisit ?? '–'}</dd></div><div><dt>Bestes Checkout</dt><dd>{legacy?.bestCheckout || '–'}</dd></div></dl></div>

  return <div className="rival-result-details">
    <header><span>{result.won ? 'MATCH GEWONNEN' : 'MATCH VERLOREN'}</span><strong>{result.playerLegs}:{result.opponentLegs}</strong></header>
    <dl>
      <div><dt>Gesamt-Average</dt><dd>{Number(result.average ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</dd></div>
      <div><dt>Darts</dt><dd>{result.darts ?? '–'}</dd></div>
      <div><dt>Höchste Aufnahme</dt><dd>{result.highestVisit ?? '–'}</dd></div>
      {result.checkoutDartsReliable === true && (result.checkoutDarts ?? 0) > 0 && <div className="rival-checkout-stat"><dt>Checkoutquote</dt><dd>{formatCheckoutStats(result.successfulCheckouts, result.checkoutDarts)}</dd></div>}
    </dl>
    <section className="rival-leg-results">
      {!Array.isArray(result.legs) || result.legs.length === 0 ? <p>Leg-Statistiken: Nicht verfügbar</p> : result.legs.map((leg, index) => <article key={leg.number ?? index}>
        <strong>LEG {leg.number ?? index + 1}</strong>
        <span>AVG {Number(leg.average ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
        <em>{leg.winner === 0 ? `${leg.darts} DARTS` : `${leg.remaining} REST`}</em>
        {leg.checkoutDartsReliable === true && (leg.checkoutDarts ?? 0) > 0 && <small>CO {formatCheckoutStats(leg.successfulCheckouts, leg.checkoutDarts)}</small>}
        <b className={leg.winner === 0 ? 'won' : 'lost'} aria-label={leg.winner === 0 ? 'Gewonnen' : 'Verloren'}>{leg.winner === 0 ? '✓' : '×'}</b>
      </article>)}
    </section>
  </div>
}
