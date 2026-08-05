import { useEffect, useMemo, useState } from 'react'
import { levels } from '../data/levels'
import LevelModal from '../components/LevelModal'

const CAMPAIGN_STORAGE_KEY = 'dartquest-campaign-progress'

function Campaign() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [previewLevelId, setPreviewLevelId] = useState(1)

  const [progress, setProgress] = useState({
    unlockedLevel: 1,
    results: {},
  })

  useEffect(() => {
    const savedProgress = localStorage.getItem(
      CAMPAIGN_STORAGE_KEY,
    )

    if (!savedProgress) {
      return
    }

    try {
      const parsedProgress = JSON.parse(savedProgress)

      setProgress(parsedProgress)
      setPreviewLevelId(
        Math.min(parsedProgress.unlockedLevel, levels.length),
      )
    } catch {
      localStorage.removeItem(CAMPAIGN_STORAGE_KEY)
    }
  }, [])

  const selectedPreviewLevel = useMemo(() => {
    return (
      levels.find((level) => level.id === previewLevelId) ??
      levels[0]
    )
  }, [previewLevelId])

  const totalStars = levels
  .filter((level) => !level.boss)
  .reduce((sum, level) => {
    return sum + (progress.results[level.id]?.stars ?? 0)
  }, 0)


  const completedLevels = Object.keys(progress.results).length

  const campaignPercent = Math.round(
    (completedLevels / levels.length) * 100,
  )

  function isLevelUnlocked(level) {
    return (
      level.id <= progress.unlockedLevel ||
      Boolean(progress.results[level.id])
    )
  }

  function selectMapLevel(level) {
    if (!isLevelUnlocked(level)) {
      return
    }

    setPreviewLevelId(level.id)
  }

  function startSelectedLevel() {
    if (!isLevelUnlocked(selectedPreviewLevel)) {
      return
    }

    setSelectedLevel(selectedPreviewLevel)
  }

  function closeLevel() {
    setSelectedLevel(null)
  }

  function completeLevel(level, result) {
    setProgress((currentProgress) => {
      const previousResult =
        currentProgress.results[level.id]

      const bestStars = Math.max(
        previousResult?.stars ?? 0,
        result.stars,
      )

      const nextUnlockedLevel = level.boss
        ? currentProgress.unlockedLevel
        : Math.max(
            currentProgress.unlockedLevel,
            Math.min(level.id + 1, levels.length),
          )

      const updatedProgress = {
        unlockedLevel: nextUnlockedLevel,
        results: {
          ...currentProgress.results,
          [level.id]: {
            ...result,
            stars: bestStars,
          },
        },
      }

      localStorage.setItem(
        CAMPAIGN_STORAGE_KEY,
        JSON.stringify(updatedProgress),
      )

      setPreviewLevelId(nextUnlockedLevel)

      return updatedProgress
    })
  }

  return (
    <section className="campaign-screen">
      <header className="campaign-header">
        <div>
          <p className="eyebrow">KAMPAGNE</p>
          <h1>Die Grundlagen</h1>
          <p className="campaign-subtitle">
            Steige Level für Level auf und besiege den Boss.
          </p>
        </div>

        <button
          className="campaign-select-button"
          type="button"
        >
          Anfänger I
          <span>⌄</span>
        </button>
      </header>

      <section className="campaign-summary-card">
        <div className="campaign-summary-progress">
          <div className="campaign-emblem">🎯</div>

          <div>
            <strong>Kampagne: Anfänger I</strong>

            <div className="campaign-progress-label">
              <span>Fortschritt</span>
              <span>{campaignPercent}%</span>
            </div>

            <div className="campaign-progress-bar">
              <div
                className="campaign-progress-fill"
                style={{ width: `${campaignPercent}%` }}
              />
            </div>

            <small>
              Level {Math.min(progress.unlockedLevel, 10)} von 10
            </small>
          </div>
        </div>

        <div className="boss-rewards">
          <p>Belohnung für Boss-Level 10</p>

          <div className="boss-reward-items">
            <span>🪙 +500 Coins</span>
            <span>⭐ +1.000 XP</span>
            <span>🃏 Kartenpaket</span>
          </div>
        </div>
      </section>

      <div className="campaign-tabs">
        <button className="active" type="button">
          KARTE
        </button>

        <button type="button">
          LISTE
        </button>
      </div>

      <section className="campaign-world-map">
        <svg
          className="campaign-path-lines"
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="
              M12 12
              C28 10, 34 11, 45 19
              C62 31, 64 42, 61 52
              C56 68, 43 69, 33 79
              C21 91, 17 105, 25 116
              C38 132, 60 122, 88 127
            "
          />
        </svg>

        {levels.map((level) => {
          const result = progress.results[level.id]
          const unlocked = isLevelUnlocked(level)
          const selected =
            selectedPreviewLevel.id === level.id

          return (
            <button
              key={level.id}
              type="button"
              className={[
                'map-level-node',
                `map-level-${level.id}`,
                unlocked ? 'unlocked' : 'locked',
                selected ? 'selected' : '',
                level.boss ? 'boss' : '',
              ].join(' ')}
              onClick={() => selectMapLevel(level)}
              disabled={!unlocked}
            >
              {level.boss && (
                <span className="boss-crown">♛</span>
              )}

              <span className="map-level-number">
                {unlocked ? level.id : '🔒'}
              </span>

              <span className="map-level-stars">
                {result
                  ? `${'⭐'.repeat(result.stars)}${'☆'.repeat(
                      3 - result.stars,
                    )}`
                  : '☆☆☆'}
              </span>
            </button>
          )
        })}

        {isLevelUnlocked(selectedPreviewLevel) && (
          <article className="selected-level-card">
            <p>{selectedPreviewLevel.title}</p>

            <strong>{selectedPreviewLevel.task}</strong>

            <span>Beste Bewertung</span>

            <div className="selected-level-stars">
              {progress.results[selectedPreviewLevel.id]
                ? `${'⭐'.repeat(
                    progress.results[selectedPreviewLevel.id]
                      .stars,
                  )}${'☆'.repeat(
                    3 -
                      progress.results[selectedPreviewLevel.id]
                        .stars,
                  )}`
                : '☆☆☆'}
            </div>

            <button
              type="button"
              onClick={startSelectedLevel}
            >
              Spielen
            </button>
          </article>
        )}
      </section>

      <section className="boss-unlock-card">
        <div className="boss-chest">🎁</div>

        <div className="boss-unlock-info">
          <strong>
            Sammle Sterne, um Boss-Level 10
            freizuschalten!
          </strong>

          <span>⭐ {totalStars} / 27</span>

          <div className="boss-star-progress">
            <div
              style={{
                width: `${Math.min(
                  (totalStars / 27) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </div>

        <button type="button">
          Belohnungen
        </button>
      </section>

      <LevelModal
        level={selectedLevel}
        onClose={closeLevel}
        onComplete={completeLevel}
      />
    </section>
  )
}

export default Campaign