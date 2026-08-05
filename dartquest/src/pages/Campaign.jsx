import { useEffect, useState } from 'react'
import { levels } from '../data/levels'
import LevelModal from '../components/LevelModal'

const CAMPAIGN_STORAGE_KEY = 'dartquest-campaign-progress'

function Campaign() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [progress, setProgress] = useState({
    unlockedLevel: 1,
    results: {},
  })

  useEffect(() => {
    const savedProgress = localStorage.getItem(CAMPAIGN_STORAGE_KEY)

    if (!savedProgress) {
      return
    }

    try {
      setProgress(JSON.parse(savedProgress))
    } catch {
      localStorage.removeItem(CAMPAIGN_STORAGE_KEY)
    }
  }, [])

  function openLevel(level) {
    const isUnlocked =
      level.id <= progress.unlockedLevel ||
      Boolean(progress.results[level.id])

    if (!isUnlocked) {
      return
    }

    setSelectedLevel(level)
  }

  function closeLevel() {
    setSelectedLevel(null)
  }

  function completeLevel(level, result) {
    setProgress((currentProgress) => {
      const previousResult = currentProgress.results[level.id]

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

      return updatedProgress
    })
  }

  return (
    <section className="campaign-page">
      <div className="section-heading">
        <p className="eyebrow">WELT 1</p>
        <h2>Die Grundlagen</h2>
        <p>Schließe alle Level ab und besiege den Boss.</p>
      </div>

      <div className="campaign-map">
        {levels.map((level, index) => {
          const result = progress.results[level.id]

          const isUnlocked =
            level.id <= progress.unlockedLevel ||
            Boolean(result)

          return (
            <div
              key={level.id}
              className={`campaign-step ${
                index % 2 === 0
                  ? 'step-left'
                  : 'step-right'
              }`}
            >
              <button
                type="button"
                className={`campaign-node ${
                  isUnlocked ? 'unlocked' : 'locked'
                } ${level.boss ? 'boss-node' : ''}`}
                onClick={() => openLevel(level)}
                disabled={!isUnlocked}
              >
                {level.boss
                  ? '👑'
                  : isUnlocked
                    ? level.id
                    : '🔒'}
              </button>

              <div className="node-description">
                <strong>{level.title}</strong>

                <span>
                  {isUnlocked
                    ? level.task
                    : 'Noch gesperrt'}
                </span>

                {result && (
                  <span>
                    {'⭐'.repeat(result.stars)}
                  </span>
                )}
              </div>

              {index !== levels.length - 1 && (
                <div className="campaign-connector"></div>
              )}
            </div>
          )
        })}
      </div>

      <LevelModal
        level={selectedLevel}
        onClose={closeLevel}
        onComplete={completeLevel}
      />
    </section>
  )
}

export default Campaign