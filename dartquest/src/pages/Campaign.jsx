import { useEffect, useState } from 'react'
import { levels } from '../data/levels'
import { getWorldPosition } from '../data/worldMaps'
import LevelModal from '../components/LevelModal'

import '../styles/Campaign.css'

const CAMPAIGN_STORAGE_KEY =
  'dartquest-campaign-progress'

const BOSS_STAR_REQUIREMENT = 22

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
  const [selectedLevel, setSelectedLevel] =
    useState(null)

  const [selectedWorld, setSelectedWorld] =
    useState(1)

  const [previewLevelId, setPreviewLevelId] =
    useState(1)

  const [progress, setProgress] = useState({
    unlockedLevel: 1,
    results: {},
  })

  /* =========================
     WELT
  ========================= */

  const worldStartLevel =
    (selectedWorld - 1) * 10 + 1

  const worldEndLevel =
    selectedWorld * 10

  const visibleLevels = levels.filter(
    (level) =>
      level.id >= worldStartLevel &&
      level.id <= worldEndLevel,
  )

  const selectedPreviewLevel =
    visibleLevels.find(
      (level) =>
        level.id === previewLevelId,
    ) ?? visibleLevels[0]

  const worldBoss =
    visibleLevels.find(
      (level) => level.boss,
    )

  const worldNormalLevels =
    visibleLevels.filter(
      (level) => !level.boss,
    )

  /* =========================
     FORTSCHRITT
  ========================= */

  const worldStars =
    worldNormalLevels.reduce(
      (sum, level) =>
        sum +
        (progress.results[level.id]?.stars ??
          0),
      0,
    )

  const completedWorldLevels =
    visibleLevels.filter((level) =>
      Boolean(
        progress.results[level.id],
      ),
    ).length

  const campaignPercent =
    visibleLevels.length > 0
      ? Math.round(
          (completedWorldLevels /
            visibleLevels.length) *
            100,
        )
      : 0

  /* =========================
     SPEICHER LADEN
  ========================= */

  useEffect(() => {
    const savedProgress =
      localStorage.getItem(
        CAMPAIGN_STORAGE_KEY,
      )

    if (!savedProgress) {
      return
    }

    try {
      const parsedProgress =
        JSON.parse(savedProgress)

      const unlockedLevel =
        Math.min(
          parsedProgress.unlockedLevel ??
            1,
          levels.length,
        )

      const currentWorld =
        Math.min(
          Math.ceil(
            unlockedLevel / 10,
          ),
          worldNames.length,
        )

      setProgress({
        unlockedLevel,
        results:
          parsedProgress.results ?? {},
      })

      setSelectedWorld(currentWorld)
      setPreviewLevelId(
        unlockedLevel,
      )
    } catch {
      localStorage.removeItem(
        CAMPAIGN_STORAGE_KEY,
      )
    }
  }, [])

  /* =========================
     STERNE PRO WELT
  ========================= */

  function getWorldStars(
    worldNumber,
    currentResults,
  ) {
    const startLevel =
      (worldNumber - 1) * 10 + 1

    const endLevel =
      worldNumber * 10

    return levels
      .filter(
        (level) =>
          level.id >= startLevel &&
          level.id <= endLevel &&
          !level.boss,
      )
      .reduce(
        (sum, level) =>
          sum +
          (currentResults[level.id]
            ?.stars ?? 0),
        0,
      )
  }

  /* =========================
     FREISCHALTUNG
  ========================= */

  function isLevelUnlocked(level) {
    if (
      progress.results[level.id]
    ) {
      return true
    }

    if (level.boss) {
      const levelWorld =
        Math.ceil(level.id / 10)

      const stars =
        getWorldStars(
          levelWorld,
          progress.results,
        )

      return (
        stars >=
        BOSS_STAR_REQUIREMENT
      )
    }

    return (
      level.id <=
      progress.unlockedLevel
    )
  }

  /* =========================
     WELT WECHSELN
  ========================= */

  function changeWorld(event) {
    const newWorld =
      Number(event.target.value)

    const firstLevel =
      (newWorld - 1) * 10 + 1

    setSelectedWorld(newWorld)
    setPreviewLevelId(firstLevel)
    setSelectedLevel(null)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  /* =========================
     LEVEL AUSWÄHLEN
  ========================= */

  function selectMapLevel(level) {
    if (!isLevelUnlocked(level)) {
      return
    }

    setPreviewLevelId(level.id)
  }

  function startSelectedLevel() {
    if (
      !selectedPreviewLevel ||
      !isLevelUnlocked(
        selectedPreviewLevel,
      )
    ) {
      return
    }

    setSelectedLevel(
      selectedPreviewLevel,
    )
  }

  function closeLevel() {
    setSelectedLevel(null)
  }

  /* =========================
     LEVEL ABSCHLIESSEN
  ========================= */

  function completeLevel(
    level,
    result,
  ) {
    setProgress(
      (currentProgress) => {
        const previousResult =
          currentProgress.results[
            level.id
          ]

        const bestStars =
          Math.max(
            previousResult?.stars ??
              0,
            result.stars,
          )

        const bestDarts =
          previousResult?.darts ==
          null
            ? result.darts
            : result.darts == null
              ? previousResult.darts
              : Math.min(
                  previousResult.darts,
                  result.darts,
                )

        const updatedResults = {
          ...currentProgress.results,

          [level.id]: {
            ...result,
            darts: bestDarts,
            stars: bestStars,
          },
        }

        const nextUnlockedLevel =
          Math.max(
            currentProgress.unlockedLevel,
            Math.min(
              level.id + 1,
              levels.length,
            ),
          )

        const updatedProgress = {
          unlockedLevel:
            nextUnlockedLevel,

          results:
            updatedResults,
        }

        localStorage.setItem(
          CAMPAIGN_STORAGE_KEY,
          JSON.stringify(
            updatedProgress,
          ),
        )

        setPreviewLevelId(
          nextUnlockedLevel,
        )

        return updatedProgress
      },
    )
  }

  /* =========================
     STERNE
  ========================= */

  function getLevelStars(level) {
    const result =
      progress.results[level.id]

    if (!result) {
      return '☆☆☆'
    }

    return `${'⭐'.repeat(
      result.stars,
    )}${'☆'.repeat(
      3 - result.stars,
    )}`
  }

  /* =========================
     UI
  ========================= */

  return (
    <section className="campaign-screen">

      {/* TOPBAR */}

      <header
  className="campaign-topbar"
  style={{
    background: 'red',
    padding: '20px',
  }}
>

        <button
          className="campaign-icon-button"
          type="button"
          aria-label="Menü"
        >
          ☰
        </button>

        <div className="campaign-logo">
          <span className="campaign-logo-mark">
            🎯
          </span>

          <strong>
            DART QUEST
          </strong>
        </div>

        <button
          className="campaign-icon-button"
          type="button"
          aria-label="Benachrichtigungen"
        >
          ♧
        </button>

      </header>


      {/* SPIELERSTATUS */}

      <section className="campaign-playerbar">

        <div className="player-level-badge">
          <span>LVL</span>

          <strong>
            {Math.max(
              1,
              Math.ceil(
                progress.unlockedLevel /
                  10,
              ),
            )}
          </strong>
        </div>

        <div className="player-xp">

          <div className="player-xp-label">
            <span>XP</span>
            <strong>
              0 / 500
            </strong>
          </div>

          <div className="player-xp-track">
            <div
              className="player-xp-fill"
              style={{
                width: '0%',
              }}
            />
          </div>

        </div>

        <div className="player-coins">
          🪙 0 Coins
        </div>

      </section>


      {/* KAMPAGNE */}

      <section className="campaign-heading">

        <div>
          <h1>
            KAMPAGNE
          </h1>

          <p>
            Steige Level für Level auf
            und werde zur Legende!
          </p>
        </div>

        <select
          className="campaign-world-select"
          value={selectedWorld}
          onChange={changeWorld}
          aria-label="Welt auswählen"
        >
          {worldNames.map(
            (world, index) => (
              <option
                key={world}
                value={index + 1}
              >
                Welt {index + 1} –{' '}
                {world}
              </option>
            ),
          )}
        </select>

      </section>


      {/* ÜBERSICHT */}

      <section className="campaign-summary">

        <div className="campaign-summary-left">

          <div className="campaign-shield">
            🎯
          </div>

          <div className="campaign-summary-progress">

            <strong>
              Kampagne:{' '}
              {
                worldNames[
                  selectedWorld - 1
                ]
              }
            </strong>

            <span>
              Fortschritt
            </span>

            <div className="summary-progress-row">

              <div className="summary-progress-track">
                <div
                  style={{
                    width: `${campaignPercent}%`,
                  }}
                />
              </div>

              <b>
                {campaignPercent}%
              </b>

            </div>

            <small>
              Level{' '}
              {completedWorldLevels}{' '}
              von 10
            </small>

          </div>

        </div>


        <div className="campaign-summary-rewards">

          <span>
            Belohnung für
            Boss-Level{' '}
            {worldBoss?.id ??
              worldEndLevel}
          </span>

          <div className="summary-rewards-grid">

            <div>
              <b>🪙</b>
              <small>
                +
                {worldBoss
                  ?.rewardCoins ?? 0}
                <br />
                Coins
              </small>
            </div>

            <div>
              <b>⭐</b>
              <small>
                +
                {worldBoss
                  ?.rewardXP ?? 0}
                <br />
                XP
              </small>
            </div>

            <div>
              <b>🃏</b>
              <small>
                Kartenpaket
              </small>
            </div>

          </div>

        </div>

      </section>


      {/* TABS */}

      <div className="campaign-tabs">

        <button
          className="active"
          type="button"
        >
          KARTE
        </button>

        <button type="button">
          LISTE
        </button>

      </div>


      {/* KARTE */}

      <section className="campaign-world-map">

        <svg
          className="campaign-path"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >

          <path
            className="campaign-path-shadow"
            d="
              M 15 12
              C 28 8, 40 12, 47 18
              C 58 26, 74 25, 77 36
              C 80 48, 61 48, 51 55
              C 41 62, 24 60, 22 70
              C 20 79, 36 84, 48 84
              C 62 84, 71 79, 80 84
              C 86 87, 88 91, 90 94
            "
          />

          <path
            className="campaign-path-main"
            d="
              M 15 12
              C 28 8, 40 12, 47 18
              C 58 26, 74 25, 77 36
              C 80 48, 61 48, 51 55
              C 41 62, 24 60, 22 70
              C 20 79, 36 84, 48 84
              C 62 84, 71 79, 80 84
              C 86 87, 88 91, 90 94
            "
          />

        </svg>

        {visibleLevels.map(
          (level) => {
            const unlocked =
              isLevelUnlocked(level)

            const selected =
              selectedPreviewLevel
                ?.id === level.id

            const position =
              getWorldPosition(
                selectedWorld,
                level.id,
              )

            return (
              <button
                key={level.id}
                type="button"

                className={[
                  'map-level-node',

                  unlocked
                    ? 'unlocked'
                    : 'locked',

                  selected
                    ? 'selected'
                    : '',

                  level.boss
                    ? 'boss'
                    : '',
                ].join(' ')}

                style={{
                  left: `${
                    position?.x ??
                    50
                  }%`,

                  top: `${
                    position?.y ??
                    50
                  }%`,
                }}

                onClick={() =>
                  selectMapLevel(
                    level,
                  )
                }

                disabled={
                  !unlocked
                }
              >

                {level.boss && (
                  <span className="boss-crown">
                    ♛
                  </span>
                )}

                <span className="map-level-number">
                  {unlocked
                    ? level.id
                    : '🔒'}
                </span>

                <span className="map-level-stars">
                  {getLevelStars(
                    level,
                  )}
                </span>

              </button>
            )
          },
        )}

      </section>


      {/* LEVEL INFO */}

      {selectedPreviewLevel &&
        isLevelUnlocked(
          selectedPreviewLevel,
        ) && (

          <article className="selected-level-card">

            <div className="selected-level-main">

              <p>
                {
                  selectedPreviewLevel.title
                }
              </p>

              <strong>
                {
                  selectedPreviewLevel.task
                }
              </strong>

              <span>
                Beste Bewertung
              </span>

              <div className="selected-level-stars">
                {getLevelStars(
                  selectedPreviewLevel,
                )}
              </div>

            </div>


            <div className="selected-level-side">

              <div className="reward-box">
                ⭐ +
                {
                  selectedPreviewLevel
                    .rewardXP
                }{' '}
                XP
              </div>

              <div className="reward-box">
                🪙 +
                {
                  selectedPreviewLevel
                    .rewardCoins
                }{' '}
                Coins
              </div>

              <button
                type="button"
                onClick={
                  startSelectedLevel
                }
              >
                SPIELEN
              </button>

            </div>

          </article>
        )}


      {/* BOSS */}

      <section className="boss-unlock-card">

        <div className="boss-chest">
          {worldStars >=
          BOSS_STAR_REQUIREMENT
            ? '👑'
            : '🎁'}
        </div>

        <div className="boss-unlock-info">

          <strong>
            {worldStars >=
            BOSS_STAR_REQUIREMENT
              ? `Boss-Level ${
                  worldBoss?.id ??
                  worldEndLevel
                } ist freigeschaltet!`
              : `Sammle Sterne, um Boss-Level ${
                  worldBoss?.id ??
                  worldEndLevel
                } freizuschalten!`}
          </strong>

          <span>
            ⭐ {worldStars} /{' '}
            {BOSS_STAR_REQUIREMENT}
          </span>

          <div className="boss-star-progress">
            <div
              style={{
                width: `${Math.min(
                  (worldStars /
                    BOSS_STAR_REQUIREMENT) *
                    100,
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
              isLevelUnlocked(
                worldBoss,
              )
            ) {
              setPreviewLevelId(
                worldBoss.id,
              )
            }
          }}

          disabled={
            !worldBoss ||
            !isLevelUnlocked(
              worldBoss,
            )
          }
        >
          {worldStars >=
          BOSS_STAR_REQUIREMENT
            ? 'Boss wählen'
            : '🔒'}
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