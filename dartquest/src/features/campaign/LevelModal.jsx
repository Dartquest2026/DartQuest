import { useEffect, useRef, useState } from 'react'

import HitCounter from './components/HitCounter'
import LevelCompleteAnimation from './components/LevelCompleteAnimation'
import QuickDartInput from './components/QuickDartInput'
import {
  createAbandonedResult,
  createAttemptResult,
  createLevelAttempt,
  createQuickAttemptResult,
  getMinimumDarts,
  isAutoPerfectAttempt,
  isAttemptComplete,
  nextVisit,
  previousVisit,
  registerTargetHit,
  undoTargetHit,
} from './utils/levelAttempt'
import './LevelModal.css'

const INPUT_MODE_STORAGE_KEY = 'dartquest-gameplay-input-mode'

function formatTaskForDisplay(task) {
  return String(task ?? '').replace(/\s+mit maximal\s+\d+\s+Darts?$/i, '')
}

function joinTargetLabels(labels) {
  if (labels.length < 2) return labels[0] ?? ''
  return labels.slice(0, -1).join(', ') + ' und ' + labels.at(-1)
}

function formatAttemptTitle(level, attempt) {
  const targets = attempt.targets
  if (!targets.length || targets.some((target) => target.targetType === 'task')) {
    return formatTaskForDisplay(level.task)
  }

  const labels = targets.map((target) => target.label)
  const requiredHits = targets.map((target) => target.requiredHits)
  const equalRequirements = requiredHits.every((hits) => hits === requiredHits[0])
  const numberTargets = targets.every((target) => target.targetType === 'number')

  if (targets.length === 1) {
    const targetName = numberTargets ? 'das ' + labels[0] + 'er-Feld' : labels[0]
    if (requiredHits[0] === 1) return 'Triff ' + targetName
    if (requiredHits[0] === 2) return 'Triff ' + targetName + ' zweimal'
    return 'Triff ' + targetName + ' · ' + requiredHits[0] + ' Treffer'
  }

  if (equalRequirements && requiredHits[0] === 1) {
    return 'Triff ' + joinTargetLabels(labels)
  }

  if (equalRequirements) {
    return joinTargetLabels(labels) + ' · je ' + requiredHits[0] + ' Treffer'
  }

  return 'Ziele: ' + targets.map((target) => target.label + ' (' + target.requiredHits + ')').join(' · ')
}

function LevelModalAttempt({ level, multiplayer = false, playerCount = 1, players = [], onClose, onComplete }) {
  const [attempt, setAttempt] = useState(() => createLevelAttempt(level))
  const minimumDarts = getMinimumDarts(level)
  const [inputMode, setInputMode] = useState(() => {
    const savedMode = localStorage.getItem(INPUT_MODE_STORAGE_KEY)
    return savedMode === 'quick' ? 'quick' : 'counter'
  })
  const [pendingInputMode, setPendingInputMode] = useState(null)
  const [result, setResult] = useState(null)
  const [introReady, setIntroReady] = useState(false)
  const completionStarted = useRef(false)
  const resultDelivered = useRef(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setIntroReady(true), reducedMotion ? 40 : 1200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!result || !level) return undefined
    const timer = setTimeout(() => {
      if (resultDelivered.current) return
      resultDelivered.current = true
      onComplete(level, result)
      onClose()
    }, 3200)
    return () => clearTimeout(timer)
  }, [result, level, onComplete, onClose])

  const displayedTask = formatAttemptTitle(level, attempt)
  const playerNames = Array.isArray(players)
    ? players.filter((player) => player?.active !== false).map((player) => player?.name).filter(Boolean)
    : []

  function applyHit(targetId) {
    if (!introReady) return
    const nextAttempt = registerTargetHit(attempt, targetId)
    if (nextAttempt === attempt) return
    setAttempt(nextAttempt)

    if (isAutoPerfectAttempt(nextAttempt) && !completionStarted.current) {
      completionStarted.current = true
      setResult({
        ...createAttemptResult(level, nextAttempt, Date.now(), 3),
        autoPerfect: true,
      })
    }
  }

  function finishAttempt(finishingDart) {
    if (!introReady || !isAttemptComplete(attempt) || completionStarted.current) return
    completionStarted.current = true
    setResult(createAttemptResult(level, attempt, Date.now(), finishingDart))
  }

  function finishQuickAttempt(totalDarts) {
    if (!introReady || completionStarted.current) return
    completionStarted.current = true
    setResult(createQuickAttemptResult(level, totalDarts, attempt.startedAt))
  }

  function applyInputMode(nextMode) {
    setAttempt(createLevelAttempt(level))
    setInputMode(nextMode)
    setPendingInputMode(null)
    localStorage.setItem(INPUT_MODE_STORAGE_KEY, nextMode)
  }

  function requestInputMode(nextMode) {
    if (nextMode === inputMode) return
    const counterHasInput = attempt.hitHistory.length > 0 || attempt.visits > 1
    if (inputMode === 'counter' && counterHasInput) {
      setPendingInputMode(nextMode)
      return
    }
    applyInputMode(nextMode)
  }

  function giveUpLevel() {
    if (resultDelivered.current) return
    resultDelivered.current = true
    onComplete(level, createAbandonedResult(level, attempt))
    onClose()
  }

  return (
    <div className="level-modal-backdrop" onClick={result ? undefined : onClose}>
      <article className={`level-modal ${introReady ? 'is-intro-ready' : 'is-intro-entering'}${result ? ' is-completing' : ''}`} onClick={(event) => event.stopPropagation()}>
        {!result && <button className="level-modal-close" type="button" onClick={onClose} aria-label="Level schließen">×</button>}

        <div className={`level-gameplay-layer${result ? ' is-finished' : ''}`} aria-hidden={result ? 'true' : undefined}>
            <p className="level-modal-eyebrow">{level.boss ? `BOSS-LEVEL ${level.id}` : `LEVEL ${level.id}`}</p>
            <h2 className="level-modal-title">{displayedTask}</h2>
            <button
              type="button"
              className={`level-input-mode-switch is-${inputMode}`}
              onClick={() => requestInputMode(inputMode === 'counter' ? 'quick' : 'counter')}
              disabled={!introReady || Boolean(result)}
              aria-label={inputMode === 'counter' ? 'Zur Schnelleingabe wechseln' : 'Zum Trefferzähler wechseln'}
              title={inputMode === 'counter' ? 'Treffer zählen' : 'Schnelleingabe'}
            >
              <span aria-hidden="true"><i /></span>
              <small>{inputMode === 'counter' ? 'Zähler' : 'Schnell'}</small>
            </button>
            {multiplayer && (
              <div className="level-modal-multiplayer">
                <strong>👥 {playerCount} Spieler</strong>
                {playerNames.length > 0 && <span>{playerNames.join(' · ')}</span>}
                <span>{level.multiplayerGoal}</span>
              </div>
            )}

            {inputMode === 'counter' ? (
              <HitCounter
                attempt={attempt}
                onHit={applyHit}
                onNextVisit={() => setAttempt((current) => nextVisit(current))}
                onPreviousVisit={() => setAttempt((current) => previousVisit(current))}
                onUndo={(targetId) => setAttempt((current) => undoTargetHit(current, targetId))}
                completionPending={isAttemptComplete(attempt)}
                onFinish={finishAttempt}
                interactionDisabled={!introReady || Boolean(result)}
              />
            ) : (
              <QuickDartInput
                attempt={attempt}
                minimumDarts={minimumDarts}
                onComplete={finishQuickAttempt}
                disabled={!introReady || Boolean(result)}
              />
            )}
            <button type="button" className="level-giveup-button" onClick={giveUpLevel} disabled={!introReady || Boolean(result)}>Aufgeben</button>

            {pendingInputMode && (
              <div className="level-input-mode-confirm" role="alertdialog" aria-modal="true" aria-labelledby="input-mode-confirm-title">
                <div>
                  <strong id="input-mode-confirm-title">Eingaben zurücksetzen?</strong>
                  <p>Deine bisherigen Eingaben dieses Versuchs werden beim Wechsel verworfen.</p>
                  <span>
                    <button type="button" onClick={() => setPendingInputMode(null)}>Abbrechen</button>
                    <button type="button" onClick={() => applyInputMode(pendingInputMode)}>Wechseln</button>
                  </span>
                </div>
              </div>
            )}
        </div>

        {result && (
          <LevelCompleteAnimation
            stars={result.stars}
            xp={result.xp}
            coins={result.coins}
            totalDarts={result.totalDarts}
            visits={result.visits}
            isBoss={level.boss === true}
            levelId={level.id}
            autoPerfect={result.autoPerfect === true}
          />
        )}
      </article>
    </div>
  )
}

function LevelModal(props) {
  if (!props.level) return null

  return (
    <LevelModalAttempt
      key={`level-attempt-${props.level.id}`}
      {...props}
    />
  )
}

export default LevelModal
