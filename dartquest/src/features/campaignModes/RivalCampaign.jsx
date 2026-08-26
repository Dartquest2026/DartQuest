import { useEffect, useRef, useState } from 'react'
import { applyVisit, canCheckout, checkoutDartOptions, createAiVisit, createChallengeRivalMatch, createRivalMatch, getAvailableCheckoutDartCounts, isValidCheckoutAttempt, playerMatchStats, rivalAverageForLevel, rivalMatchResult, undoPlayerRound } from './rivalEngine'
import { isCampaignLevelUnlocked, loadCampaignProgress, saveCampaignProgress } from './campaignModeStorage'
import { CampaignResult, ScoreKeypad } from './components/CampaignGameUI'
import { grantFreePack } from '../cards/cardStorage'
import './CampaignModes.css'
import './RivalMobile.css'
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

export default function RivalCampaign({ activeProfile, onProfileRewards, onBack, challenge = null, onChallengeComplete = null }) {
  const savedDraft = challenge ? null : loadRivalDraft(activeProfile?.id)
  const [progress, setProgress] = useState(() => loadCampaignProgress(activeProfile?.id, 'rival'))
  const [match, setMatch] = useState(() => challenge ? createChallengeRivalMatch(activeProfile?.name, challenge) : savedDraft?.match ?? null)
  const [input, setInput] = useState(() => savedDraft?.input ?? '')
  const [checkoutPrompt, setCheckoutPrompt] = useState(() => savedDraft?.checkoutPrompt ?? null)
  const [doubleAttempts, setDoubleAttempts] = useState(() => savedDraft?.doubleAttempts ?? 0)
  const [reward, setReward] = useState(null)
  const [selectedResultLevel, setSelectedResultLevel] = useState(null)
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
        if (next.winner === 1 && !challenge) {
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
  }, [activeProfile?.id, challenge, match])

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [match?.legVisits?.length])

  useEffect(() => {
    if (challenge) return
    if (match && match.winner == null) {
      saveRivalDraft(activeProfile?.id, { match, input, checkoutPrompt, doubleAttempts })
      return
    }
    clearRivalDraft(activeProfile?.id)
  }, [activeProfile?.id, challenge, checkoutPrompt, doubleAttempts, input, match])

  async function storeResult(nextMatch) {
    if (nextMatch.winner == null) return
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
          checkoutAttempts: stats.checkoutAttempts,
          checkouts: stats.checkouts,
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

  function commit(validCheckout = false, checkoutDart = 3, actualDoubleAttempts = 0) {
    if (confirming.current || !match || match.active !== 0) return
    const points = Number(input)
    if (!Number.isInteger(points) || points < 0 || points > 180) return
    const finishableVisit = canCheckout(match.players[0].score)
    if (finishableVisit && !validCheckout) {
      setCheckoutPrompt({ points, checkout: match.players[0].score - points === 0 && checkoutDartOptions(points).length > 0 })
      setDoubleAttempts(match.players[0].score - points === 0 ? 1 : 0)
      return
    }

    const checkedCheckout = validCheckout && isValidCheckoutAttempt(points, checkoutDart)
    confirming.current = true
    setMatch((current) => {
      const next = applyVisit(current, points, checkedCheckout, checkoutDart, actualDoubleAttempts)
      void storeResult(next)
      return next
    })
    setInput('')
    setCheckoutPrompt(null)
    setDoubleAttempts(0)
    window.setTimeout(() => { confirming.current = false }, 250)
  }

  function rejectCheckout() {
    const points = typeof checkoutPrompt === 'object' ? checkoutPrompt.points : checkoutPrompt
    setMatch((current) => {
      const next = applyVisit(current, points, false, 3, doubleAttempts)
      void storeResult(next)
      return next
    })
    setCheckoutPrompt(null)
    setInput('')
    setDoubleAttempts(0)
  }

  function confirmCheckoutWithAttempts(attempts) {
    const points = typeof checkoutPrompt === 'object' ? checkoutPrompt.points : checkoutPrompt
    const validDarts = checkoutDartOptions(points)
    const checkoutDart = checkoutPrompt?.checkoutDart ?? (validDarts.includes(attempts) ? attempts : validDarts[0] ?? 3)
    if (attempts < 1 || attempts > checkoutDart) return
    commit(true, checkoutDart, attempts)
  }

  function requestCheckoutByLongPress(dartsUsed) {
    if (!match || match.active !== 0 || !getAvailableCheckoutDartCounts(match.players[0].score).includes(dartsUsed)) return
    setInput(String(match.players[0].score))
    setDoubleAttempts(1)
    setCheckoutPrompt({ points: match.players[0].score, checkout: true, checkoutDart: dartsUsed })
  }

  function closeChallenge() {
    if (challenge) onChallengeComplete?.(challenge)
    onBack()
  }

  function closeMatchSelection() {
    clearRivalDraft(activeProfile?.id)
    setMatch(null)
    setInput('')
    setCheckoutPrompt(null)
    setDoubleAttempts(0)
  }

  function startMatch(level) {
    clearRivalDraft(activeProfile?.id)
    setSelectedResultLevel(null)
    setInput('')
    setCheckoutPrompt(null)
    setDoubleAttempts(0)
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
      />
    )
  }

  const human = match.players[0]
  const ai = match.players[1]
  const rounds = buildVisitRows(match.legVisits ?? []).slice(-5)
  const availableCheckoutDarts = match.active === 0 ? getAvailableCheckoutDartCounts(human.score) : []
  const nextUnlocked = match.level < 40 && isCampaignLevelUnlocked(progress, match.level + 1)

  return (
    <main className="rival-game">
      <header>
        <button type="button" onClick={() => challenge ? onBack() : closeMatchSelection()}>‹</button>
        <div>
          <span>{challenge ? 'ZUFÄLLIGE HERAUSFORDERUNG' : `RIVALEN-LEVEL ${match.level} · Ø ${match.targetAverage}`}</span>
          <h1>First to {match.firstTo ?? 3} · {match.startScore}</h1>
        </div>
        <button type="button" className="rival-undo" disabled={!match.history.length || aiThinking} onClick={() => { setMatch((current) => undoPlayerRound(current)); setInput('') }}>↶ Undo</button>
      </header>

      <section className="rival-scoreboard">
        <article className={match.active === 0 && match.winner == null ? 'active' : ''}><span>{human.name}</span><strong>{human.score}</strong></article>
        <div className="rival-legs"><small>LEGS</small><strong><b>{human.legs}</b><i>|</i><b>{ai.legs}</b></strong></div>
        <article className={match.active === 1 && match.winner == null ? 'active' : ''}><span>{ai.name}</span><strong>{ai.score}</strong></article>
      </section>

      <section ref={historyRef} className="rival-history" aria-label="Aufnahmeverlauf">
        <header><span>{human.visits} Aufnahmen · {human.dartsThrown} Darts</span><b>DARTS</b><span>{ai.visits} Aufnahmen · {ai.dartsThrown} Darts</span></header>
        {rounds.map((round, index) => <div key={index}><span>{formatVisit(round.human)}</span><b>{(index + 1) * 3}</b><span>{formatVisit(round.ai)}</span></div>)}
      </section>

      {aiThinking && <div className="rival-thinking" aria-live="polite">Rivale wirft …</div>}
      {match.winner == null && <ScoreKeypad value={input} onChange={setInput} onConfirm={() => commit(false)} disabled={match.active !== 0} fill checkoutDartCounts={availableCheckoutDarts} onCheckoutLongPress={requestCheckoutByLongPress} />}
      {match.winner != null && (
        <CampaignResult title={match.winner === 0 ? 'Du hast gewonnen!' : 'Du hast verloren'}>
          <RivalResultDetails result={rivalMatchResult(match)} />
          {reward && (
            <>
              <strong className="result-stars">{'★'.repeat(reward.stars)}</strong>
              <p>+{reward.xp} XP · +{reward.coins} Coins</p>
              {reward.pack && <p>Fünfer-Kartenpaket erhalten</p>}
            </>
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
            <p>Wie viele Darts wurden auf Doppel geworfen?</p>
            <div className="checkout-attempt-choice" aria-label="Tatsächliche Doppelversuche">
              {(checkoutPrompt?.checkout ? [1, 2, 3].filter((attempts) => attempts <= (checkoutPrompt?.checkoutDart ?? 3)) : [0, 1, 2, 3]).map((attempts) => <button className={doubleAttempts === attempts ? 'selected' : ''} type="button" key={attempts} onClick={() => checkoutPrompt?.checkout ? confirmCheckoutWithAttempts(attempts) : setDoubleAttempts(attempts)}><strong>{attempts}</strong><span className="checkout-card-darts" aria-hidden="true">{Array.from({ length: Math.max(1, attempts) }, (_, index) => <i key={index} />)}</span><small>{attempts === 1 ? 'Dart' : 'Darts'}</small></button>)}
            </div>
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

function buildVisitRows(visits) {
  const rows = []
  for (const visit of visits) {
    const side = visit.player === 0 ? 'human' : 'ai'
    let row = rows.at(-1)
    if (!row || row[side]) {
      row = {}
      rows.push(row)
    }
    row[side] = visit
  }
  return rows
}

function RivalLevels({ progress, selectedLevel, onSelect, onBack, onStart }) {
  const levels = Array.from({ length: 40 }, (_, index) => index + 1)
  const result = selectedLevel ? progress.levels[selectedLevel] : null

  return (
    <main className="campaign-levels rival-levels">
      <header>
        <button type="button" onClick={onBack}>‹</button>
        <div>
          <span>RIVALEN-KAMPAGNE</span>
          <h1>Rivalen-Kampagne</h1>
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

function checkoutText(checkouts, attempts, rate) {
  if (!attempts) return '– (keine Doppelversuche)'
  return `${Number(rate ?? (checkouts / attempts) * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} % (${checkouts}/${attempts})`
}

function RivalResultDetails({ result, legacy = null }) {
  const legacyAverage = legacy?.bestAverage ?? legacy?.average
  if (!result) return <div className="rival-result-details is-legacy"><p>Match- und Leg-Statistiken: Nicht verfügbar</p><dl><div><dt>3-Dart-Average</dt><dd>{legacyAverage != null ? Number(legacyAverage).toFixed(1) : '–'}</dd></div><div><dt>Darts</dt><dd>{legacy?.darts ?? '–'}</dd></div><div><dt>Höchste Aufnahme</dt><dd>{legacy?.highestVisit ?? '–'}</dd></div><div><dt>Bestes Checkout</dt><dd>{legacy?.bestCheckout || '–'}</dd></div></dl></div>

  return <div className="rival-result-details">
    <header><span>{result.won ? 'MATCH GEWONNEN' : 'MATCH VERLOREN'}</span><strong>{result.playerLegs}:{result.opponentLegs}</strong></header>
    <dl>
      <div><dt>Gesamt-Average</dt><dd>{Number(result.average ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</dd></div>
      <div><dt>Checkoutquote</dt><dd>{checkoutText(result.checkouts ?? 0, result.checkoutAttempts ?? 0, result.checkoutRate)}</dd></div>
      <div><dt>Darts</dt><dd>{result.darts ?? '–'}</dd></div>
      <div><dt>Höchste Aufnahme</dt><dd>{result.highestVisit ?? '–'}</dd></div>
    </dl>
    <section className="rival-leg-results">
      {!Array.isArray(result.legs) || result.legs.length === 0 ? <p>Leg-Statistiken: Nicht verfügbar</p> : result.legs.map((leg, index) => <article key={leg.number ?? index}>
        <div><strong>Leg {leg.number ?? index + 1}</strong><b className={leg.winner === 0 ? 'won' : 'lost'}>{leg.winner === 0 ? 'Gewonnen' : 'Verloren'}</b></div>
        <span>Average: {Number(leg.average ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
        <span>Checkout: {checkoutText(leg.checkouts ?? 0, leg.checkoutAttempts ?? 0, leg.checkoutAttempts ? undefined : null)}</span>
        <em>{leg.winner === 0 ? `Gewonnen mit ${leg.darts} Darts` : `Verloren – ${leg.remaining} Punkte Rest`}</em>
      </article>)}
    </section>
  </div>
}
