import { useMemo, useState } from 'react'
import { DartSlots, ScoreKeypad } from '../../campaignModes/components/CampaignGameUI'
import { getAvailableCheckoutDartCounts } from '../../campaignModes/rivalEngine'
import {
  applyCheckoutVisit, applyScoreVisit, createNumericAttempt, createNumericAttemptResult,
  getDartVisitPreview, getVisibleNumericHistory, numericAttemptStats, undoNumericVisit,
} from '../standardNumericAttempt'
import { triggerHaptic } from '../../settings/haptics'
import './NumericCampaignInput.css'

function NumericCampaignInput({ level, disabled, inputMode, onToggleInputMode, inputModeHint, onComplete }) {
  const [attempt, setAttempt] = useState(() => createNumericAttempt(level))
  const [input, setInput] = useState('')
  const [partialDarts, setPartialDarts] = useState([])
  const [checkoutPrompt, setCheckoutPrompt] = useState(false)
  const stats = useMemo(() => numericAttemptStats(level, attempt), [attempt, level])
  const perDart = inputMode === 'counter'
  const preview = useMemo(() => getDartVisitPreview(level, attempt, partialDarts), [attempt, level, partialDarts])
  const displayedRest = perDart && partialDarts.length ? preview.rest : stats.rest
  const checkoutDarts = attempt.kind === 'checkout' && !perDart ? getAvailableCheckoutDartCounts(stats.rest) : []
  const visibleHistory = getVisibleNumericHistory(stats.history)
  const historyOffset = stats.history.length - visibleHistory.length

  function finish(nextAttempt) {
    setAttempt(nextAttempt); setInput(''); setPartialDarts([]); setCheckoutPrompt(false)
    const nextStats = numericAttemptStats(level, nextAttempt)
    if (nextStats.complete) onComplete(createNumericAttemptResult(level, nextAttempt))
  }

  function commit() {
    const points = Number(input)
    if (!Number.isInteger(points) || points < 0 || points > (perDart ? 60 : 180)) { triggerHaptic('error'); return }
    if (perDart) {
      const darts = [...partialDarts, points]
      const nextPreview = getDartVisitPreview(level, attempt, darts)
      setInput('')
      if (nextPreview.bust) finish(applyCheckoutVisit(attempt, nextPreview.points))
      else if (nextPreview.checkout) { setPartialDarts(darts); setCheckoutPrompt(true) }
      else if (darts.length === 3 || nextPreview.complete) finish(attempt.kind === 'checkout' ? applyCheckoutVisit(attempt, nextPreview.points) : applyScoreVisit(attempt, nextPreview.points, darts.length))
      else setPartialDarts(darts)
      return
    }
    if (attempt.kind === 'checkout' && points === stats.rest && checkoutDarts.length) { setCheckoutPrompt(true); return }
    finish(attempt.kind === 'checkout' ? applyCheckoutVisit(attempt, points) : applyScoreVisit(attempt, points))
  }

  function confirmCheckout(darts) {
    finish(applyCheckoutVisit(attempt, perDart ? preview.points : stats.rest, true, perDart ? partialDarts.length : darts))
  }

  function undo() {
    triggerHaptic('light')
    if (partialDarts.length) { setPartialDarts([]); setInput(''); setCheckoutPrompt(false); return }
    setAttempt((current) => undoNumericVisit(current)); setInput(''); setCheckoutPrompt(false)
  }

  const scoreValue = level.taskType === 'checkout' ? displayedRest : level.comparison === 'exact' ? stats.totalScore + (perDart ? preview.points : 0) : displayedRest

  return <section className="numeric-campaign-input" aria-label={level.taskType === 'checkout' ? 'Checkout-Eingabe' : 'Punkte-Eingabe'}>
    <header className="numeric-campaign-score"><span>{level.taskType === 'checkout' ? 'REST' : level.comparison === 'exact' ? 'PUNKTE' : 'NOCH BENÖTIGT'}</span><strong>{scoreValue}</strong><small>Start {level.taskType === 'checkout' ? level.checkoutScore : level.targetScore}</small></header>
    <div className="numeric-campaign-meta">
      <div><span>Aufnahme</span><strong>{stats.visits + 1}</strong></div><div><span>Darts</span><strong>{stats.totalDarts + (perDart ? partialDarts.length : 0)}</strong></div>
      <div className="hit-counter-mode"><span>Eingabe</span><button type="button" className={`level-input-mode-switch is-${inputMode}${inputModeHint ? ' is-coachmark-target' : ''}`} onClick={() => { setInput(''); onToggleInputMode() }} disabled={disabled || partialDarts.length > 0} aria-label={perDart ? 'Zu Pro Aufnahme wechseln' : 'Zu Pro Dart wechseln'} title={perDart ? 'Pro Dart' : 'Pro Aufnahme'}><span aria-hidden="true"><i /></span><small>{perDart ? 'Pro Dart' : 'Aufnahme'}</small></button></div>
    </div>
    <DartSlots values={perDart ? partialDarts : []} emptyText={perDart ? 'Noch offen' : '–'} />
    <section className="numeric-campaign-history" aria-label="Aufnahmeverlauf">
      <header><span>Aufnahme</span><span>Punkte</span><span>{level.taskType === 'checkout' ? 'Rest' : 'Gesamt'}</span></header>
      {Array.from({ length: 3 }, (_, index) => visibleHistory[index] ?? null).map((visit, index) => visit ? <div key={historyOffset + index}><span>{historyOffset + index + 1}</span><strong>{visit.points}{visit.bust ? ' · Bust' : ''}</strong><b>{level.taskType === 'checkout' ? visit.rest : stats.history.slice(0, historyOffset + index + 1).reduce((sum, item) => sum + item.points, 0)}</b></div> : <div className="is-empty" key={`empty-${index}`}><span>–</span><strong>{stats.history.length === 0 && index === 0 ? 'Noch keine Aufnahme' : '–'}</strong><b>–</b></div>)}
    </section>
    <button className="numeric-campaign-undo" type="button" disabled={disabled || (stats.history.length === 0 && partialDarts.length === 0)} onClick={undo}>↶ {partialDarts.length ? 'AKTUELLE AUFNAHME' : 'LETZTE AUFNAHME'}</button>
    <ScoreKeypad value={input} onChange={(value) => { if (!perDart || value === '' || Number(value) <= 60) setInput(value) }} onConfirm={commit} disabled={disabled} fill quick={perDart ? [0, 1, 5, 20, 25, 40, 50, 60] : undefined} checkoutDartCounts={checkoutDarts} onCheckoutLongPress={confirmCheckout} />
    {checkoutPrompt && <div className="numeric-checkout-prompt" role="dialog" aria-modal="true" aria-labelledby="numeric-checkout-title"><section><span>DOUBLE-OUT</span><h3 id="numeric-checkout-title">Checkout bestätigen</h3><p>{perDart ? `War Dart ${partialDarts.length} ein Doppel oder Bull?` : 'Mit welchem Dart wurde ausgecheckt?'}</p><div>{perDart ? <button type="button" className="confirm-double" onClick={() => confirmCheckout(partialDarts.length)}><strong>JA</strong><small>Checkout</small></button> : checkoutDarts.map((darts) => <button type="button" key={darts} onClick={() => confirmCheckout(darts)}><strong>{darts}</strong><small>{darts === 1 ? 'Dart' : 'Darts'}</small></button>)}</div><button type="button" onClick={() => finish(applyCheckoutVisit(attempt, perDart ? preview.points : Number(input)))}>BUST – AUFNAHME SPEICHERN</button></section></div>}
  </section>
}

export default NumericCampaignInput
