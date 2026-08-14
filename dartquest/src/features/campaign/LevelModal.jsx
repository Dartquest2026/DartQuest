import { useEffect, useState } from 'react'

import HitCounter from './components/HitCounter'
import {
  createAbandonedResult,
  createAttemptResult,
  createLevelAttempt,
  isAttemptComplete,
  registerDart,
  undoTargetHit,
} from './utils/levelAttempt'
import './LevelModal.css'

function formatTaskForDisplay(task) {
  return String(task ?? '').replace(/\s+mit maximal\s+\d+\s+Darts?$/i, '')
}

function LevelModalAttempt({ level, multiplayer = false, playerCount = 1, players = [], onClose, onComplete }) {
  const [attempt, setAttempt] = useState(() => createLevelAttempt(level))
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!result || !level) return undefined
    const timer = setTimeout(() => {
      onComplete(level, result)
      onClose()
    }, 2500)
    return () => clearTimeout(timer)
  }, [result, level, onComplete, onClose])

  const displayedTask = formatTaskForDisplay(level.task)
  const playerNames = Array.isArray(players)
    ? players.filter((player) => player?.active !== false).map((player) => player?.name).filter(Boolean)
    : []

  function applyDart(targetId = null) {
    const nextAttempt = registerDart(attempt, targetId)
    if (nextAttempt === attempt) return
    setAttempt(nextAttempt)
    if (isAttemptComplete(nextAttempt)) setResult(createAttemptResult(level, nextAttempt))
  }

  function finishLevel() {
    if (!result) return
    onComplete(level, result)
    onClose()
  }

  function giveUpLevel() {
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
              onHit={(targetId) => applyDart(targetId)}
              onMiss={() => applyDart()}
              onUndo={(targetId) => setAttempt((current) => undoTargetHit(current, targetId))}
            />
            <button type="button" className="level-giveup-button" onClick={giveUpLevel}>Aufgeben</button>
          </>
        )}

        {result && (
          <div className="level-result-screen">
            <p className="level-modal-eyebrow">{level.boss ? `BOSS-LEVEL ${level.id}` : `LEVEL ${level.id}`}</p>
            <div className="level-result-stars">{'⭐'.repeat(result.stars)}</div>
            <h2>Level geschafft!</h2>
            <p className="level-result-range">
              {result.totalDarts} {result.totalDarts === 1 ? 'Pfeil' : 'Pfeile'} · {result.visits} {result.visits === 1 ? 'Aufnahme' : 'Aufnahmen'}
            </p>
            <div className="level-result-rewards">
              <div><span>XP</span><strong>+{result.xp}</strong></div>
              <div><span>Coins</span><strong>+{result.coins}</strong></div>
            </div>
            <button className="level-result-continue" type="button" onClick={finishLevel}>Weiter</button>
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
