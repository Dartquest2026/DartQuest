import { useEffect, useState } from 'react'
import { levels } from '../data/levels'
import LevelModal from '../components/LevelModal'

const CAMPAIGN_STORAGE_KEY = 'dartquest-campaign-progress'
const BOSS_STAR_REQUIREMENT = 25

const worldNames = [
  'Anfänger I',
  'Anfänger II',
  'Grundlagen',
  'Doppel',
  'Triple',
  'Scoring',
  'Checkouts',
  'Fortgeschritten',
  'Profi',
  'Meister',
]

function Campaign() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedWorld, setSelectedWorld] = useState(1)
  const [previewLevelId, setPreviewLevelId] = useState(1)

  const [progress, setProgress] = useState({
    unlockedLevel: 1,
    results: {},
  })

  const worldStartLevel = (selectedWorld - 1) * 10 + 1
  const worldEndLevel = selectedWorld * 10

  const visibleLevels = levels.filter(
    (level) =>
      level.id >= worldStartLevel &&
      level.id <= worldEndLevel,
  )

  const selectedPreviewLevel =
    visibleLevels.find(
      (level) => level.id === previewLevelId,
    ) ?? visibleLevels[0]

  const worldBoss = visibleLevels.find((level) => level.boss)

  const worldNormalLevels = visibleLevels.filter(
    (level) => !level.boss,
  )

  const worldStars = worldNormalLevels.reduce(
    (sum, level) =>
      sum + (progress.results[level.id]?.stars ?? 0),
    0,
  )

  const completedWorldLevels = visibleLevels.filter((level) =>
    Boolean(progress.results[level.id]),
  ).length

  const campaignPercent =
    visibleLevels.length > 0
      ? Math.round(
          (completedWorldLevels / visibleLevels.length) * 100,
        )
      : 0

  useEffect(() => {
    const savedProgress = localStorage.getItem(
      CAMPAIGN_STORAGE_KEY,
    )

    if (!savedProgress) {
      return
    }

    try {
      const parsedProgress = JSON.parse(savedProgress)

      const unlockedLevel = Math.min(
        parsedProgress.unlockedLevel ?? 1,
        levels.length,
      )

      const currentWorld = Math.min(
        Math.ceil(unlockedLevel / 10),
        worldNames.length,
      )

      setProgress({
        unlockedLevel,
        results: parsedProgress.results ?? {},
      })

      setSelectedWorld(currentWorld)
      setPreviewLevelId(unlockedLevel)
    } catch {
      localStorage.removeItem(CAMPAIGN_STORAGE_KEY)
    }
  }, [])

  function getWorldStars(worldNumber, currentResults) {
    const startLevel = (worldNumber - 1) * 10 + 1
    const endLevel = worldNumber * 10

    return levels
      .filter(
        (level) =>
          level.id >= startLevel &&
          level.id <= endLevel &&
          !level.boss,
      )
      .reduce(
        (sum, level) =>
          sum + (currentResults[level.id]?.stars ?? 0),
        0,
      )
  }

  function isLevelUnlocked(level) {
    if (progress.results[level.id]) {
      return true
    }

    if (level.boss) {
      const levelWorld = Math.ceil(level.id / 10)
      const starsInLevelWorld = getWorldStars(
        levelWorld,
        progress.results,
      )

<<<<<<< HEAD
      return starsInLevelWorld >= 25
=======
      return starsInLevelWorld >= BOSS_STAR_REQUIREMENT
>>>>>>> 6569575 (Levelauswertung auf Sterne Buttons umgestellt)
    }

    return level.id <= progress.unlockedLevel
  }

  function changeWorld(event) {
    const newWorld = Number(event.target.value)
    const firstLevel = (newWorld - 1) * 10 + 1

    setSelectedWorld(newWorld)
    setPreviewLevelId(firstLevel)
    setSelectedLevel(null)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function selectMapLevel(level) {
    if (!isLevelUnlocked(level)) {
      return
    }

    setPreviewLevelId(level.id)
  }

  function startSelectedLevel() {
    if (
      !selectedPreviewLevel ||
      !isLevelUnlocked(selectedPreviewLevel)
    ) {
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

      const bestDarts =
        previousResult?.darts == null
          ? result.darts
          : Math.min(previousResult.darts, result.darts)

      const updatedResults = {
        ...currentProgress.results,
        [level.id]: {
          ...result,
          darts: bestDarts,
          stars: bestStars,
        },
      }

      const nextUnlockedLevel = Math.max(
        currentProgress.unlockedLevel,
        Math.min(level.id + 1, levels.length),
      )

      const updatedProgress = {
        unlockedLevel: nextUnlockedLevel,
        results: updatedResults,
      }

      localStorage.setItem(
        CAMPAIGN_STORAGE_KEY,
        JSON.stringify(updatedProgress),
      )

      const nextWorld = Math.min(
        Math.ceil(nextUnlockedLevel / 10),
        worldNames.length,
      )

      setSelectedWorld(nextWorld)
      setPreviewLevelId(nextUnlockedLevel)

      return updatedProgress
    })
  }

  function getLevelStars(level) {
    const result = progress.results[level.id]

    if (!result) {
      return '☆☆☆'
    }

    return `${'⭐'.repeat(result.stars)}${'☆'.repeat(
      3 - result.stars,
    )}`
  }

  return (
    <section className="campaign-screen">
      <header className="campaign-header">
        <div>
          <p className="eyebrow">
            KAMPAGNE · WELT {selectedWorld}
          </p>

          <h1>{worldNames[selectedWorld - 1]}</h1>

          <p className="campaign-subtitle">
            Steige Level für Level auf und besiege den Boss.
          </p>
        </div>

        <select
          className="campaign-select-button"
          value={selectedWorld}
          onChange={changeWorld}
          aria-label="Kampagne auswählen"
        >
          {worldNames.map((worldName, index) => (
            <option key={worldName} value={index + 1}>
              Welt {index + 1} – {worldName}
            </option>
          ))}
        </select>
      </header>

      <section className="campaign-summary-card">
        <div className="campaign-summary-progress">
          <div className="campaign-emblem">🎯</div>

          <div>
            <strong>
              Kampagne: {worldNames[selectedWorld - 1]}
            </strong>

            <div className="campaign-progress-label">
              <span>Fortschritt</span>
              <span>{campaignPercent}%</span>
            </div>

            <div className="campaign-progress-bar">
              <div
                className="campaign-progress-fill"
                style={{
                  width: `${campaignPercent}%`,
                }}
              />
            </div>

            <small>
              {completedWorldLevels} von 10 Leveln abgeschlossen
            </small>
          </div>
        </div>

        <div className="boss-rewards">
          <p>
            Belohnung für Boss-Level{' '}
            {worldBoss?.id ?? worldEndLevel}
          </p>

          <div className="boss-reward-items">
            <span>
              🪙 +{worldBoss?.rewardCoins ?? 0} Coins
            </span>

            <span>
              ⭐ +{worldBoss?.rewardXP ?? 0} XP
            </span>

            <span>🃏 Kartenpaket</span>
          </div>
        </div>
      </section>

      <div className="campaign-tabs">
        <button className="active" type="button">
          KARTE
        </button>

        <button type="button">LISTE</button>
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

        {visibleLevels.map((level, index) => {
          const unlocked = isLevelUnlocked(level)
          const selected =
            selectedPreviewLevel?.id === level.id

          return (
            <button
              key={level.id}
              type="button"
              className={[
                'map-level-node',
                `map-level-${index + 1}`,
                unlocked ? 'unlocked' : 'locked',
                selected ? 'selected' : '',
                level.boss ? 'boss' : '',
              ].join(' ')}
              onClick={() => selectMapLevel(level)}
              disabled={!unlocked}
              aria-label={
                unlocked
                  ? `${level.title} auswählen`
                  : `${level.title} ist gesperrt`
              }
            >
              {level.boss && (
                <span className="boss-crown">♛</span>
              )}

              <span className="map-level-number">
                {unlocked ? level.id : '🔒'}
              </span>

              <span className="map-level-stars">
                {getLevelStars(level)}
              </span>
            </button>
          )
        })}
      </section>

      {selectedPreviewLevel &&
        isLevelUnlocked(selectedPreviewLevel) && (
          <article className="selected-level-card">
            <div className="selected-level-main">
              <p>{selectedPreviewLevel.title}</p>

              <strong>{selectedPreviewLevel.task}</strong>
            </div>

            <div className="selected-level-rating">
              <span>Beste Bewertung</span>

              <div className="selected-level-stars">
                {getLevelStars(selectedPreviewLevel)}
              </div>
            </div>

            <div className="selected-level-reward">
              <small>
                +{selectedPreviewLevel.rewardXP} XP
              </small>

              <small>
                +{selectedPreviewLevel.rewardCoins} Coins
              </small>
            </div>

            <button
              type="button"
              onClick={startSelectedLevel}
            >
              Spielen
            </button>
          </article>
        )}

      <section className="boss-unlock-card">
        <div className="boss-chest">
<<<<<<< HEAD
          {worldStars >= 25 ? '👑' : '🎁'}
=======
          {worldStars >= BOSS_STAR_REQUIREMENT
            ? '👑'
            : '🎁'}
>>>>>>> 6569575 (Levelauswertung auf Sterne Buttons umgestellt)
        </div>

        <div className="boss-unlock-info">
          <strong>
<<<<<<< HEAD
            {worldStars >= 25
=======
            {worldStars >= BOSS_STAR_REQUIREMENT
>>>>>>> 6569575 (Levelauswertung auf Sterne Buttons umgestellt)
              ? `Boss-Level ${
                  worldBoss?.id ?? worldEndLevel
                } ist freigeschaltet!`
              : `Sammle Sterne, um Boss-Level ${
                  worldBoss?.id ?? worldEndLevel
                } freizuschalten!`}
          </strong>

<<<<<<< HEAD
          <span>⭐ {worldStars} / 25</span>
=======
          <span>
            ⭐ {worldStars} / {BOSS_STAR_REQUIREMENT}
          </span>
>>>>>>> 6569575 (Levelauswertung auf Sterne Buttons umgestellt)

          <div className="boss-star-progress">
            <div
              style={{
                width: `${Math.min(
<<<<<<< HEAD
                  (worldStars / 25) * 100,
=======
                  (worldStars /
                    BOSS_STAR_REQUIREMENT) *
                    100,
>>>>>>> 6569575 (Levelauswertung auf Sterne Buttons umgestellt)
                  100,
                )}%`,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (
              worldBoss &&
              isLevelUnlocked(worldBoss)
            ) {
              setPreviewLevelId(worldBoss.id)
            }
          }}
          disabled={
            !worldBoss ||
            !isLevelUnlocked(worldBoss)
          }
        >
<<<<<<< HEAD
          {worldStars >= 25
=======
          {worldStars >= BOSS_STAR_REQUIREMENT
>>>>>>> 6569575 (Levelauswertung auf Sterne Buttons umgestellt)
            ? 'Boss auswählen'
            : 'Noch gesperrt'}
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