import { useEffect, useRef, useState } from 'react'
import Dartboard from './Dartboard'
import { DartSlots } from '../../campaignModes/components/CampaignGameUI'
import { useSequencePreview } from './useSequencePreview'
import './HitCounter.css'

const MISS_HOLD_DURATION_MS = 600

function HitCounter({ attempt, turnStartIndex = null, canUndo = attempt.totalDarts > 0, displayVisits = attempt.visits, displayTotalDarts = attempt.totalDarts, onHit, onNextVisit, onFillMisses, onPreviousVisit, completionPending, autoPerfectPending = false, onFinish, interactionDisabled = false, inputModeControl }) {
  const [pressedTarget, setPressedTarget] = useState(null)
  const [missHolding, setMissHolding] = useState(false)
  const [missTapped, setMissTapped] = useState(false)
  const feedbackTimer = useRef(null)
  const missFeedbackTimer = useRef(null)
  const missHoldTimer = useRef(null)
  const missHoldStartedAt = useRef(null)
  const missHoldButton = useRef(null)
  const missHoldOrigin = useRef(null)
  const suppressMissClick = useRef(false)
  const longPressTriggered = useRef(false)
  const expectedTarget = attempt.sequence[attempt.sequenceIndex]
  const previewTargetId = useSequencePreview(attempt)
  const targetPageSize = 6
  const targetPageStart = attempt.targets.length > targetPageSize
    ? Math.floor(attempt.sequenceIndex / targetPageSize) * targetPageSize
    : 0
  const visibleTargets = attempt.targets.length > targetPageSize
    ? attempt.targets.slice(targetPageStart, targetPageStart + targetPageSize)
    : attempt.targets
  // Every page owns the same 2 x 3 geometry. Empty targets keep their slots so
  // target count cannot move the remaining controls around the screen.
  const targetSlotCount = targetPageSize
  const targetRowCount = Math.ceil(targetSlotCount / 2)
  const currentVisitCount = attempt.totalDarts === 0 ? 0 : (attempt.totalDarts % 3 || 3)
  const currentVisit = turnStartIndex == null ? attempt.hitHistory.slice(-currentVisitCount) : attempt.hitHistory.slice(turnStartIndex)
  const dartValues = Array.from({ length: 3 }, (_, index) => {
    const entry = currentVisit[index]
    return entry ? entry.miss ? 0 : attempt.targets.find((target) => target.id === entry.targetId)?.label : null
  })

  useEffect(() => () => {
    window.clearTimeout(feedbackTimer.current)
    window.cancelAnimationFrame(missHoldTimer.current)
    window.clearTimeout(missFeedbackTimer.current)
  }, [])

  function cancelMissHold() {
    window.cancelAnimationFrame(missHoldTimer.current)
    missHoldTimer.current = null
    missHoldStartedAt.current = null
    missHoldOrigin.current = null
    missHoldButton.current?.style.removeProperty('--miss-hold-angle')
    missHoldButton.current = null
    setMissHolding(false)
  }

  function completeMissHold(button) {
    missHoldTimer.current = null
    missHoldStartedAt.current = null
    missHoldOrigin.current = null
    longPressTriggered.current = true
    suppressMissClick.current = true
    button.style.setProperty('--miss-hold-angle', '360deg')
    setMissHolding(false)
    button.classList.add('is-long-pressed')
    window.setTimeout(() => button.classList.remove('is-long-pressed'), 280)
    onFillMisses()
  }

  function startMissHold(event) {
    if (interactionDisabled) return
    cancelMissHold()
    longPressTriggered.current = false
    suppressMissClick.current = false
    missHoldOrigin.current = { x: event.clientX, y: event.clientY }
    missHoldStartedAt.current = performance.now()
    missHoldButton.current = event.currentTarget
    event.currentTarget.style.setProperty('--miss-hold-angle', '0deg')
    setMissHolding(true)
    const button = event.currentTarget
    button.setPointerCapture?.(event.pointerId)
    const updateHoldProgress = (now) => {
      if (missHoldStartedAt.current == null || longPressTriggered.current) return
      const elapsed = now - missHoldStartedAt.current
      const progress = Math.min(1, elapsed / MISS_HOLD_DURATION_MS)
      button.style.setProperty('--miss-hold-angle', `${progress * 360}deg`)
      if (progress >= 1) completeMissHold(button)
      else missHoldTimer.current = window.requestAnimationFrame(updateHoldProgress)
    }
    missHoldTimer.current = window.requestAnimationFrame(updateHoldProgress)
  }

  function moveMissHold(event) {
    const origin = missHoldOrigin.current
    if (!origin || longPressTriggered.current) return
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12) cancelMissHold()
  }

  function endMissHold() {
    const wasLongPress = longPressTriggered.current
    const hadActiveHold = missHoldTimer.current != null
    cancelMissHold()
    suppressMissClick.current = true
    if (!wasLongPress && hadActiveHold) {
      setMissTapped(true)
      window.clearTimeout(missFeedbackTimer.current)
      missFeedbackTimer.current = window.setTimeout(() => setMissTapped(false), 160)
      onNextVisit()
    }
  }

  function clickMiss(event) {
    if (suppressMissClick.current) {
      suppressMissClick.current = false
      event.preventDefault()
      return
    }
    // Keyboard activation has no preceding pointer sequence.
    if (event.detail === 0 && !interactionDisabled) onNextVisit()
  }

  function pressTarget(targetId) {
    setPressedTarget(targetId)
    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => setPressedTarget(null), 160)
    onHit(targetId)
  }

  return (
    <section className="hit-counter" aria-label="Trefferzähler">
      <Dartboard targets={attempt.targets} hitCounters={attempt.hitCounters} activeTargetId={attempt.ordered ? expectedTarget : null} previewTargetId={previewTargetId} />

      <header className="hit-counter-visit">
        <div><span>Aufnahme</span><strong>{displayVisits}</strong></div>
        <div><span>Darts gesamt</span><strong>{displayTotalDarts}</strong></div>
        <div className="hit-counter-mode"><span>Zähler</span>{inputModeControl}</div>
      </header>

      <DartSlots values={dartValues} emptyText="Noch nicht" />

      <div className="hit-counter-visit-actions">
        <button className="hit-counter-previous-visit" type="button" onClick={onPreviousVisit} disabled={interactionDisabled || !canUndo}>↶ Letzten Dart</button>
        <button className={`hit-counter-next-visit${missHolding ? ' is-holding' : ''}${missTapped ? ' is-tapped' : ''}`} type="button" onPointerDown={startMissHold} onPointerMove={moveMissHold} onPointerLeave={cancelMissHold} onPointerUp={endMissHold} onPointerCancel={cancelMissHold} onClick={clickMiss} onContextMenu={(event) => event.preventDefault()} disabled={interactionDisabled}>
          {completionPending ? 'Nicht getroffen · +1 Dart' : 'Nicht getroffen'}
        </button>
      </div>

      <div className="hit-counter-targets" style={{ '--target-rows': targetRowCount }}>
        {Array.from({ length: targetSlotCount }, (_, index) => visibleTargets[index]).map((target, index) => {
          if (!target) return <span className="hit-target-slot" key={`empty-${index}`} aria-hidden="true" />
          const hits = attempt.hitCounters[target.id]
          const complete = hits >= target.requiredHits
          const active = !attempt.ordered || expectedTarget === target.id
          return (
            <button key={target.id} className={`hit-target${complete ? ' is-complete' : ''}${attempt.ordered && active ? ' is-active' : ''}${pressedTarget === target.id ? ' is-pressed' : ''}`} type="button" onClick={() => pressTarget(target.id)} disabled={interactionDisabled || complete || !active}>
              <span className="hit-target-content"><strong>+ {target.label}</strong><b>{hits} / {target.requiredHits}</b></span>
            </button>
          )
        })}
      </div>

      {completionPending && (
        <section className="finishing-dart" aria-live="polite">
          <strong>{autoPerfectPending ? 'Perfekt erkannt ★★★★' : 'Aufgabe erfüllt ✓'}</strong>
          {autoPerfectPending ? (
            <>
              <span>Fehlt eine Aufnahme? Jetzt noch korrigieren.</span>
              <button className="finishing-dart-correction" type="button" onClick={onNextVisit} disabled={interactionDisabled}>+ Aufnahme</button>
            </>
          ) : (
            <>
              <span>Mit welchem Dart dieser Aufnahme?</span>
              <div>
                {[1, 2, 3].map((dart) => (
                  <button key={dart} type="button" onClick={() => onFinish(dart)} disabled={interactionDisabled}>
                    <small>Dart</small>{dart}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </section>
  )
}

export default HitCounter
