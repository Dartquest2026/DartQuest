import { useEffect, useState } from 'react'
import '../styles/LevelModal.css'

function getStarOptions(level) {
  const min = level.minArrows
  const max = level.maxArrows
  const remaining = max - min

  const options = [
    {
      stars: 3,
      label: '⭐⭐⭐',
      minDarts: min,
      maxDarts: min,
    },
  ]

  if (remaining <= 0) {
    return options
  }

  const twoStarMin = min + 1
  let twoStarMax

  if (remaining % 2 === 1 && min <= 3) {
    twoStarMax = min + Math.floor(remaining / 2)
  } else {
    twoStarMax = min + Math.ceil(remaining / 2)
  }

  const oneStarMin = twoStarMax + 1

  if (twoStarMin <= max) {
    options.push({
      stars: 2,
      label: '⭐⭐',
      minDarts: twoStarMin,
      maxDarts: Math.min(twoStarMax, max),
    })
  }

  if (oneStarMin <= max) {
    options.push({
      stars: 1,
      label: '⭐',
      minDarts: oneStarMin,
      maxDarts: max,
    })
  }

  return options
}

function formatDarts(min, max) {
  if (min === max) {
    return `${min} ${min === 1 ? 'Pfeil' : 'Pfeile'}`
  }

  return `${min}–${max} Pfeile`
}

function LevelModal({
  level,
  onClose,
  onComplete,
}) {
  const [result, setResult] = useState(null)

  useEffect(() => {
    setResult(null)
  }, [level?.id])

  useEffect(() => {
    if (!result || !level) {
      return
    }

    const timer = setTimeout(() => {
      onComplete(level, result)
      onClose()
    }, 2500)

    return () => {
      clearTimeout(timer)
    }
  }, [result, level, onComplete, onClose])

  if (!level) {
    return null
  }

  const starOptions = getStarOptions(level)

  function selectResult(option) {
    setResult({
      success: true,
      stars: option.stars,
      darts: null,

      dartRange: formatDarts(
        option.minDarts,
        option.maxDarts,
      ),

      xp: level.rewardXP,
      coins: level.rewardCoins,
    })
  }

  function finishLevel() {
    if (!result) {
      return
    }

    onComplete(level, result)
    onClose()
  }

  function giveUpLevel() {
    onClose()
  }

  return (
    <div
      className="level-modal-backdrop"
      onClick={onClose}
    >
      <article
        className="level-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="level-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Level schließen"
        >
          ×
        </button>

        {!result && (
          <>
            <p className="level-modal-eyebrow">
              {level.boss
                ? `BOSS-LEVEL ${level.id}`
                : `LEVEL ${level.id}`}
            </p>

            <h2 className="level-modal-title">
              {level.task}
            </h2>

            <div className="level-modal-task">
              <p>
                Deine Aufgabe:{' '}
                <strong>{level.task}</strong>
              </p>

              <p>
                Du hast maximal{' '}
                <strong>{level.maxArrows} Pfeile</strong>.
              </p>
            </div>

            <p className="level-modal-question">
              Wie hast du die Aufgabe geschafft?
            </p>

            <div className="level-modal-options">
              {starOptions.map((option) => (
                <button
                  key={option.stars}
                  type="button"
                  className="level-choice"
                  onClick={() => selectResult(option)}
                >
                  <span className="level-choice-stars">
                    {option.label}
                  </span>

                  <span className="level-choice-text">
                    {formatDarts(
                      option.minDarts,
                      option.maxDarts,
                    )}
                  </span>

                  <span className="level-choice-arrow">
                    ›
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="level-choice level-choice-giveup"
                onClick={giveUpLevel}
              >
                <span className="level-choice-stars">
                  ❌
                </span>

                <span className="level-choice-text">
                  Aufgeben
                </span>

                <span className="level-choice-arrow">
                  ›
                </span>
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="level-result-screen">
            <p className="level-modal-eyebrow">
              LEVEL {level.id}
            </p>

            <div className="level-result-stars">
              {'⭐'.repeat(result.stars)}
            </div>

            <h2>Level geschafft!</h2>

            <p className="level-result-range">
              {result.dartRange}
            </p>

            <div className="level-result-rewards">
              <div>
                <span>XP</span>
                <strong>+{result.xp}</strong>
              </div>

              <div>
                <span>Coins</span>
                <strong>+{result.coins}</strong>
              </div>
            </div>

            <button
              className="level-result-continue"
              type="button"
              onClick={finishLevel}
            >
              Weiter
            </button>
          </div>
        )}
      </article>
    </div>
  )
}

export default LevelModal