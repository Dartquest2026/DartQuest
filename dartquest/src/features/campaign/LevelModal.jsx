import { useEffect, useRef, useState } from 'react'

import HitCounter from './components/HitCounter'
import {
  createAbandonedResult,
  createAttemptResult,
  createLevelAttempt,
  isAutoPerfectAttempt,
  isAttemptComplete,
  nextVisit,
  registerTargetHit,
  undoTargetHit,
} from './utils/levelAttempt'
import './LevelModal.css'

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
  const [result, setResult] = useState(null)
  const completionStarted = useRef(false)
  const resultDelivered = useRef(false)

  useEffect(() => {
    if (!result || !level) return undefined
    const timer = setTimeout(() => {
      if (resultDelivered.current) return
      resultDelivered.current = true
      onComplete(level, result)
      onClose()
    }, 2500)
    return () => clearTimeout(timer)
  }, [result, level, onComplete, onClose])

  const displayedTask = formatAttemptTitle(level, attempt)
  const playerNames = Array.isArray(players)
    ? players.filter((player) => player?.active !== false).map((player) => player?.name).filter(Boolean)
    : []

  function applyHit(targetId) {
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
    if (!isAttemptComplete(attempt) || completionStarted.current) return
    completionStarted.current = true
    setResult(createAttemptResult(level, attempt, Date.now(), finishingDart))
  }

  function finishLevel() {
    if (!result || resultDelivered.current) return
    resultDelivered.current = true
    onComplete(level, result)
    onClose()
  }

  function giveUpLevel() {
    if (resultDelivered.current) return
    resultDelivered.current = true
    onComplete(level, createAbandonedResult(level, attempt))
    onClose()
  }

  return (
    <div className="level-modal-backdrop" onClick={onClose}>
      <article className="level-modal" onClick={(event) => event.stopPropagation()}>
        <button className="level-modal-close" type="button" onClick={onClose} aria-label="Level schließen">×</button>

        {!result && (
          <>
            <p className="level-modal-eyebrow">{level.boss ? `BOSS-LEVEL ${level.id}` : `LEVEL ${level.id}`}</p>
            <h2 className="level-modal-title">{displayedTask}</h2>
            {multiplayer && (
              <div className="level-modal-multiplayer">
                <strong>👥 {playerCount} Spieler</strong>
                {playerNames.length > 0 && <span>{playerNames.join(' · ')}</span>}
                <span>{level.multiplayerGoal}</span>
              </div>
            )}

            <HitCounter
              attempt={attempt}
              onHit={applyHit}
              onNextVisit={() => setAttempt((current) => nextVisit(current))}
              onUndo={(targetId) => setAttempt((current) => undoTargetHit(current, targetId))}
              completionPending={isAttemptComplete(attempt)}
              onFinish={finishAttempt}
            />
            <button type="button" className="level-giveup-button" onClick={giveUpLevel}>Aufgeben</button>
          </>
        )}

        {result && (
          <div className="level-result-screen">
            <p className="level-modal-eyebrow">{level.boss ? `BOSS-LEVEL ${level.id}` : `LEVEL ${level.id}`}</p>
            <div className="level-result-stars">{'⭐'.repeat(result.stars)}</div>
            <h2>{result.autoPerfect ? 'Perfekt!' : 'Level geschafft!'}</h2>
            {result.autoPerfect && (
              <p className="level-result-perfect-copy">Alle Ziele in der ersten Aufnahme getroffen.</p>
            )}
            <p className="level-result-range">
              {result.totalDarts} {result.totalDarts === 1 ? 'Pfeil' : 'Pfeile'} · {result.visits} {result.visits === 1 ? 'Aufnahme' : 'Aufnahmen'}
            </p>
            <div className="level-result-rewards">
              <div><span>XP</span><strong>+{result.xp}</strong></div>
              <div><span>Coins</span><strong>+{result.coins}</strong></div>
            </div>
            {!result.autoPerfect && (
              <button className="level-result-continue" type="button" onClick={finishLevel}>Weiter</button>
            )}
          </div>
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
