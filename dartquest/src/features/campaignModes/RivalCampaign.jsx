import { useEffect, useRef, useState } from 'react'
import { applyVisit, checkoutDartOptions, createAiVisit, createChallengeRivalMatch, createRivalMatch, isValidCheckoutAttempt, playerMatchStats, rivalAverageForLevel, undoPlayerRound } from './rivalEngine'
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
        return applyVisit(current, visit.points, visit.validCheckout, visit.dartsUsed)
      })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [match])

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [match?.legVisits?.length])

  useEffect(() => {
    if (challenge) return
    if (match && match.winner == null) {
      saveRivalDraft(activeProfile?.id, { match, input, checkoutPrompt })
      return
    }
    clearRivalDraft(activeProfile?.id)
  }, [activeProfile?.id, challenge, checkoutPrompt, input, match])

  async function storeWin(nextMatch) {
    if (nextMatch.winner !== 0) return
    if (challenge) {
      if (challengeRewardGranted.current) return
      challengeRewardGranted.current = true
      const delta = { xp: 75, coins: 35 }
      if (onProfileRewards) await onProfileRewards(delta)
      grantFreePack(activeProfile?.id, challenge.id)
      setReward({ ...delta, stars: 3, pack: true })
      return
    }

    const stars = nextMatch.players[1].legs === 0 ? 3 : nextMatch.players[1].legs === 1 ? 2 : 1
    const factor = stars === 3 ? 1.5 : stars === 2 ? 1.25 : 1
    const full = { xp: Math.round((35 + nextMatch.level * 5) * factor), coins: Math.round((15 + nextMatch.level * 3) * factor) }
    const old = progress.levels[nextMatch.level] || {}
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
          reward: { xp: Math.max(paid.xp, full.xp), coins: Math.max(paid.coins, full.coins) },
          packGranted: true,
        },
      },
    }
    setProgress(next)
    saveCampaignProgress(activeProfile?.id, 'rival', next)
    setReward({ ...delta, stars, pack: firstPack })
  }

  function commit(validCheckout = false, checkoutDart = 3) {
    if (confirming.current || !match || match.active !== 0) return
    const points = Number(input)
    if (!Number.isInteger(points) || points < 0 || points > 180) return
    if (match.players[0].score - points === 0 && !validCheckout && checkoutDartOptions(points).length > 0) {
      setCheckoutPrompt(points)
      return
    }

    const checkedCheckout = validCheckout && isValidCheckoutAttempt(points, checkoutDart)
    confirming.current = true
    setMatch((current) => {
      const next = applyVisit(current, points, checkedCheckout, checkoutDart)
      void storeWin(next)
      return next
    })
    setInput('')
    setCheckoutPrompt(null)
    window.setTimeout(() => { confirming.current = false }, 250)
  }

  function rejectCheckout() {
    const points = checkoutPrompt
    setMatch((current) => {
      const next = applyVisit(current, points, false)
      void storeWin(next)
      return next
    })
    setCheckoutPrompt(null)
    setInput('')
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
  }

  function startMatch(level) {
    clearRivalDraft(activeProfile?.id)
    setSelectedResultLevel(null)
    setInput('')
    setCheckoutPrompt(null)
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
  const stats = playerMatchStats(human)
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
      {match.winner == null && <ScoreKeypad value={input} onChange={setInput} onConfirm={() => commit(false)} disabled={match.active !== 0} fill />}
      {match.winner != null && (
        <CampaignResult title={match.winner === 0 ? 'Du hast gewonnen!' : 'Du hast verloren'}>
          <strong className="result-score">{human.legs}:{ai.legs} Legs</strong>
          {reward && (
            <>
              <strong className="result-stars">{'★'.repeat(reward.stars)}</strong>
              <p>+{reward.xp} XP · +{reward.coins} Coins</p>
              {reward.pack && <p>Fünfer-Kartenpaket erhalten</p>}
            </>
          )}
          <dl>
            <div><dt>3-Dart-Average</dt><dd>{stats.average.toFixed(1)}</dd></div>
            <div><dt>Darts</dt><dd>{stats.darts}</dd></div>
            <div><dt>Aufnahmen</dt><dd>{stats.visits}</dd></div>
            <div><dt>Höchste Aufnahme</dt><dd>{stats.highestVisit}</dd></div>
            <div><dt>Bestes Checkout</dt><dd>{stats.bestCheckout ?? '–'}</dd></div>
            <div><dt>Checkoutquote</dt><dd>{stats.checkoutRate == null ? '–' : `${stats.checkoutRate.toFixed(0)} %`}</dd></div>
          </dl>
          <button type="button" onClick={() => { setReward(null); challenge ? setMatch(createChallengeRivalMatch(activeProfile?.name, challenge)) : startMatch(match.level) }}>ERNEUT SPIELEN</button>
          <button type="button" onClick={() => { setReward(null); challenge ? closeChallenge() : closeMatchSelection() }}>{challenge ? 'ZURÜCK ZUR KARTE' : 'ZUR RIVALENAUSWAHL'}</button>
          {!challenge && <button type="button" disabled={!nextUnlocked} onClick={() => { setReward(null); startMatch(match.level + 1) }}>NÄCHSTER GEGNER</button>}
        </CampaignResult>
      )}
      {checkoutPrompt != null && (
        <div className="checkout-dialog dq-checkout-dialog">
          <section role="dialog" aria-modal="true">
            <span className="dialog-eyebrow">DARTQUEST CHECKOUT</span>
            <h2>Regelkonform über Doppel ausgecheckt?</h2>
            <p>Wähle den Checkout-Dart. Unmögliche Checkouts werden als Bust gewertet.</p>
            <div className="checkout-dart-choice">
              {[1, 2, 3].map((dart) => <button type="button" key={dart} onClick={() => commit(true, dart)}>{dart} Dart{dart > 1 ? 's' : ''} · BESTÄTIGEN</button>)}
            </div>
            <button className="checkout-bust" type="button" onClick={rejectCheckout}>NEIN · ALS BUST WIEDERHOLEN</button>
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
            <dl>
              <div><dt>3-Dart-Average</dt><dd>{(result.bestAverage ?? result.average ?? 0).toFixed(1)}</dd></div>
              <div><dt>Darts</dt><dd>{result.darts ?? '–'}</dd></div>
              <div><dt>Höchste Aufnahme</dt><dd>{result.highestVisit ?? '–'}</dd></div>
              <div><dt>Bestes Checkout</dt><dd>{result.bestCheckout || '–'}</dd></div>
            </dl>
            <button type="button" onClick={() => onStart(selectedLevel)}>LEVEL SPIELEN</button>
            <button type="button" onClick={() => onSelect(null)}>SCHLIESSEN</button>
          </section>
        </div>
      )}
    </main>
  )
}
