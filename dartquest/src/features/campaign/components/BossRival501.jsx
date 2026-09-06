import { useEffect, useRef, useState } from 'react'
import {
  applyVisit,
  createAiVisit,
  createRivalMatch,
  currentLegStats,
  getAvailableCheckoutDartCounts,
  isValidCheckoutAttempt,
  playerMatchStats,
  rivalMatchResult,
  shouldRequestCheckoutConfirmation,
  undoPlayerRound,
} from '../../campaignModes/rivalEngine'
import { buildVisitRows } from '../../campaignModes/rivalHistory'
import { ScoreKeypad } from '../../campaignModes/components/CampaignGameUI'
import '../../campaignModes/CampaignModes.css'
import '../../campaignModes/RivalMobile.css'
import '../../campaignModes/RivalScoreboardHistory.css'
import '../../campaignModes/CheckoutMobile.css'
import './BossRival501.css'

function makeFinalMatch(playerName, phase) {
  const match = createRivalMatch(playerName || 'Spieler', phase.rivalLevel ?? 3, phase.startScore ?? 501, phase.firstTo ?? 1)
  return {
    ...match,
    targetAverage: phase.targetAverage ?? 35,
    players: [match.players[0], { ...match.players[1], name: 'Final-Boss' }],
  }
}

function average(value) {
  return value == null ? '–' : value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export default function BossRival501({ level, playerName, onWin, onRetry, onBack }) {
  const phase = level.bossPhases.find((entry) => entry.type === 'rival501')
  const [match, setMatch] = useState(() => makeFinalMatch(playerName, phase))
  const [input, setInput] = useState('')
  const [checkoutPrompt, setCheckoutPrompt] = useState(null)
  const confirming = useRef(false)
  const human = match.players[0]
  const ai = match.players[1]
  const humanStats = currentLegStats(match, 0)
  const aiStats = currentLegStats(match, 1)
  const rows = buildVisitRows(match.legVisits, match.startScore)
  const checkoutDarts = match.active === 0 ? getAvailableCheckoutDartCounts(human.score) : []

  useEffect(() => {
    if (match.active !== 1 || match.winner != null) return undefined
    const timer = window.setTimeout(() => {
      setMatch((current) => {
        if (current.active !== 1 || current.winner != null) return current
        const visit = createAiVisit(current)
        return applyVisit(current, visit.points, visit.validCheckout, visit.dartsUsed)
      })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [match])

  function applyPlayerVisit(points, validCheckout = false, dartsUsed = 3) {
    if (confirming.current || match.active !== 0 || match.winner != null) return
    confirming.current = true
    const next = applyVisit(match, points, validCheckout, dartsUsed)
    setMatch(next)
    setInput('')
    setCheckoutPrompt(null)
    if (next.winner === 0) onWin({
      ...rivalMatchResult(next),
      opponentAverage: playerMatchStats(next.players[1]).average,
      targetAverage: next.targetAverage,
    })
    window.setTimeout(() => { confirming.current = false }, 250)
  }

  function commit() {
    const points = Number(input)
    if (!Number.isInteger(points) || points < 0 || points > 180) return
    if (shouldRequestCheckoutConfirmation(human.score, points)) {
      setCheckoutPrompt(points)
      return
    }
    applyPlayerVisit(points)
  }

  return <main className="rival-game boss-rival-501">
    <header><button type="button" onClick={onBack}>‹</button><div><span>BOSS-LEVEL 100 · PHASE 2</span><h1>First to 1 · 501</h1></div><div className="rival-header-actions"><button type="button" className="rival-undo" disabled={!match.history.length || match.active === 1} onClick={() => { setMatch((current) => undoPlayerRound(current)); setInput('') }}>↶ Undo</button></div></header>
    <section className="rival-scoreboard">
      <article className={match.active === 0 && match.winner == null ? 'active' : ''}><span>{human.name}</span><strong>{human.score}</strong><small className="rival-player-average">AVG <b>{average(humanStats.average)}</b></small></article>
      <div className="rival-legs"><small>LEGS</small><strong><b>{human.legs}</b><i>|</i><b>{ai.legs}</b></strong></div>
      <article className={match.active === 1 && match.winner == null ? 'active' : ''}><span>{ai.name}</span><strong>{ai.score}</strong><small className="rival-player-average">AVG <b>{average(aiStats.average)}</b></small></article>
    </section>
    <section className="rival-history" aria-label="Aufnahmeverlauf"><header><span>SCORE</span><span>PUNKTE</span><b>DARTS</b><span>SCORE</span><span>PUNKTE</span></header><div className="rival-history-start"><span /><strong>501</strong><b /><span /><strong>501</strong></div>{rows.map((row) => <div key={row.key}><Visit visit={row.human} /><b>{row.darts}</b><Visit visit={row.ai} /></div>)}</section>
    {match.active === 1 && match.winner == null && <div className="rival-thinking">Final-Boss wirft …</div>}
    {match.winner == null && <ScoreKeypad value={input} onChange={setInput} onConfirm={commit} disabled={match.active !== 0} fill checkoutDartCounts={checkoutDarts} onCheckoutLongPress={(darts) => applyPlayerVisit(human.score, isValidCheckoutAttempt(human.score, darts), darts)} />}
    {match.winner === 1 && <div className="boss-rival-result" role="dialog" aria-modal="true"><section><span>BOSS NICHT BESIEGT</span><h2>Der Final-Boss gewinnt</h2><button type="button" onClick={onRetry}>NOCHMAL VERSUCHEN</button><button type="button" onClick={onBack}>ZUR KARTE</button></section></div>}
    {checkoutPrompt != null && <div className="checkout-dialog dq-checkout-dialog"><section className="rival-checkout-confirm is-checkout" role="dialog" aria-modal="true"><span className="dialog-eyebrow">DARTQUEST CHECKOUT</span><h2>Checkout bestätigen</h2><p>Mit welchem Dart wurde ausgecheckt?</p><div className="checkout-attempt-choice">{getAvailableCheckoutDartCounts(checkoutPrompt).map((darts) => <button type="button" key={darts} onClick={() => applyPlayerVisit(checkoutPrompt, true, darts)}><strong>{darts}</strong><small>{darts === 1 ? 'Dart' : 'Darts'}</small></button>)}</div><button className="checkout-bust" type="button" onClick={() => applyPlayerVisit(checkoutPrompt)}>BUST – AUFNAHME SPEICHERN</button></section></div>}
  </main>
}

function Visit({ visit }) {
  if (!visit) return <><span className="rival-visit-score is-empty" /><strong className="rival-visit-rest is-empty" /></>
  return <><span className="rival-visit-score">{visit.points}{visit.bust ? ' · Bust' : visit.checkout ? ' · Checkout' : ''}</span><strong className="rival-visit-rest">{visit.rest}</strong></>
}
