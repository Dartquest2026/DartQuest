import { useEffect, useState } from 'react'

function getStars(level, darts) {
  if (darts < level.minArrows || darts > level.maxArrows) {
    return 0
  }

  if (level.id === 4) {
    if (darts === 5) return 3
    if (darts <= 7) return 2
    return 1
  }

  if (level.id === 6) {
    if (darts === 6) return 3
    if (darts <= 8) return 2
    return 1
  }

  if (level.id === 7) {
    if (darts === 1) return 3
    if (darts <= 5) return 2
    return 1
  }

  if (level.id === 9) {
    if (darts <= 3) return 3
    if (darts <= 6) return 2
    return 1
  }

  if (darts === level.minArrows) {
    return 3
  }

  if (darts <= 6) {
    return 2
  }

  return 1
}

function LevelModal({ level, onClose, onComplete }) {
  const [darts, setDarts] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setDarts('')
    setResult(null)
    setError('')
  }, [level?.id])

  if (!level) {
    return null
  }

  function evaluateLevel() {
    const dartsNumber = Number(darts)

    if (
      !Number.isInteger(dartsNumber) ||
      dartsNumber < level.minArrows ||
      dartsNumber > level.maxArrows
    ) {
      setError(
        `Bitte gib eine Zahl von ${level.minArrows} bis ${level.maxArrows} ein.`,
      )

      return
    }

    const stars = getStars(level, dartsNumber)

    const levelResult = {
      darts: dartsNumber,
      stars,
      xp: level.rewardXP,
      coins: level.rewardCoins,
    }

    setError('')
    setResult(levelResult)
  }

  function finishLevel() {
    onComplete(level, result)
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
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Level schließen"
        >
          ×
        </button>

        <p className="eyebrow">
          {level.boss
            ? 'BOSS-LEVEL'
            : `LEVEL ${level.id}`}
        </p>

        <h2>{level.task}</h2>

        {!result && (
          <>
            <div className="task-box">
              <span>Deine Aufgabe</span>

              <strong>{level.task}</strong>

              <p>
                Schaffe die Aufgabe mit maximal{' '}
                {level.maxArrows} Pfeilen.
              </p>
            </div>

            <label
              className="daily-input-label"
              htmlFor="level-darts"
            >
              Wie viele Pfeile hast du benötigt?
            </label>

            <input
              id="level-darts"
              className="daily-input"
              type="number"
              min={level.minArrows}
              max={level.maxArrows}
              inputMode="numeric"
              placeholder={`${level.minArrows} bis ${level.maxArrows}`}
              value={darts}
              onChange={(event) =>
                setDarts(event.target.value)
              }
            />

            {error && (
              <p className="daily-error">
                {error}
              </p>
            )}

            <button
              className="primary-button"
              type="button"
              onClick={evaluateLevel}
            >
              Auswerten
            </button>
          </>
        )}

        {result && (
          <div className="daily-result">
            <div className="daily-result-stars">
              {'⭐'.repeat(result.stars)}
            </div>

            <h3>Level geschafft!</h3>

            <p>
              {result.darts} Pfeile benötigt
            </p>

            <div className="daily-rewards">
              <span>
                +{result.xp} XP
              </span>

              <span>
                +{result.coins} Quest Coins
              </span>
            </div>

            <button
              className="primary-button"
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