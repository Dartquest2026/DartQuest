import { useEffect, useState } from 'react'
import { levels } from '../data/levels'
import { getWorldPosition } from '../data/worldMaps'
import LevelModal from '../components/LevelModal'

import '../styles/Campaign.css'

const CAMPAIGN_STORAGE_KEY =
  'dartquest-campaign-progress'

const BOSS_STAR_REQUIREMENT = 22
const XP_PER_PLAYER_LEVEL = 500

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
    xp: 0,
    coins: 0,
  })

  /* =======================================================
     GRUNDWERTE
     ======================================================= */

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

  const totalXP =
    progress.xp ?? 0

  const totalCoins =
    progress.coins ?? 0

  const playerLevel =
    Math.floor(
      totalXP / XP_PER_PLAYER_LEVEL,
    ) + 1

  const xpInsideCurrentLevel =
    totalXP % XP_PER_PLAYER_LEVEL

  const xpPercent =
    Math.min(
      (xpInsideCurrentLevel /
        XP_PER_PLAYER_LEVEL) *
        100,
      100,
    )

  /* =======================================================
     SPEICHER LADEN
     ======================================================= */

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
          Math.max(
            1,
            Math.ceil(
              unlockedLevel / 10,
            ),
          ),
          worldNames.length,
        )

      setProgress({
        unlockedLevel,
        results:
          parsedProgress.results ?? {},
        xp:
          parsedProgress.xp ?? 0,
        coins:
          parsedProgress.coins ?? 0,
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

  /* =======================================================
     HELFER
     ======================================================= */

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

  function isLevelUnlocked(level) {
    if (!level) {
      return false
    }

    if (
      progress.results[level.id]
    ) {
      return true
    }

    if (level.boss) {
      const levelWorld =
        Math.ceil(
          level.id / 10,
        )

      const starsInWorld =
        getWorldStars(
          levelWorld,
          progress.results,
        )

      return (
        starsInWorld >=
        BOSS_STAR_REQUIREMENT
      )
    }

    return (
      level.id <=
      progress.unlockedLevel
    )
  }

  function getLevelStars(level) {
    if (!level) {
      return '☆☆☆'
    }

    const result =
      progress.results[level.id]

    if (!result) {
      return '☆☆☆'
    }

    const stars =
      Math.max(
        0,
        Math.min(
          result.stars ?? 0,
          3,
        ),
      )

    return `${'⭐'.repeat(
      stars,
    )}${'☆'.repeat(
      3 - stars,
    )}`
  }

  function goToWorld(worldNumber) {
    const boundedWorld =
      Math.min(
        Math.max(
          worldNumber,
          1,
        ),
        worldNames.length,
      )

    setSelectedWorld(
      boundedWorld,
    )

    setPreviewLevelId(
      (boundedWorld - 1) *
        10 +
        1,
    )

    setSelectedLevel(null)
  }

  function goToPreviousWorld() {
    if (
      selectedWorld <= 1
    ) {
      return
    }

    goToWorld(
      selectedWorld - 1,
    )
  }

  function goToNextWorld() {
    if (
      selectedWorld >=
      worldNames.length
    ) {
      return
    }

    goToWorld(
      selectedWorld + 1,
    )
  }

  function selectMapLevel(level) {
    if (
      !isLevelUnlocked(level)
    ) {
      return
    }

    setPreviewLevelId(
      level.id,
    )
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

  /* =======================================================
     LEVEL ABSCHLIESSEN
     ======================================================= */

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

        const previousStars =
          previousResult?.stars ??
          0

        const bestStars =
          Math.max(
            previousStars,
            result.stars ?? 0,
          )

        const bestDarts =
          previousResult?.darts ==
          null
            ? result.darts
            : result.darts ==
                null
              ? previousResult.darts
              : Math.min(
                  previousResult.darts,
                  result.darts,
                )

        const updatedResults = {
          ...currentProgress.results,

          [level.id]: {
            ...previousResult,
            ...result,
            stars: bestStars,
            darts: bestDarts,
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

        const isFirstCompletion =
          !previousResult

        const isBetterResult =
          bestStars >
          previousStars

        const rewardAllowed =
          isFirstCompletion ||
          isBetterResult

        const earnedXP =
          rewardAllowed
            ? level.rewardXP ??
              0
            : 0

        const earnedCoins =
          rewardAllowed
            ? level.rewardCoins ??
              0
            : 0

        const updatedProgress = {
          unlockedLevel:
            nextUnlockedLevel,

          results:
            updatedResults,

          xp:
            (currentProgress.xp ??
              0) +
            earnedXP,

          coins:
            (currentProgress.coins ??
              0) +
            earnedCoins,
        }

        localStorage.setItem(
          CAMPAIGN_STORAGE_KEY,
          JSON.stringify(
            updatedProgress,
          ),
        )

        const nextPreviewLevel =
          Math.min(
            level.id + 1,
            levels.length,
          )

        setPreviewLevelId(
          nextPreviewLevel,
        )

        return updatedProgress
      },
    )

    setSelectedLevel(null)
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <main className="dq-campaign">

      {/* HEADER */}

      <header className="dq-header">
        <button
          type="button"
          className="dq-header-button"
          aria-label="Menü"
        >
          ☰
        </button>

        <div className="dq-logo">
          <span>🎯</span>

          <strong>
            DART QUEST
          </strong>
        </div>

        <button
          type="button"
          className="dq-header-button"
          aria-label="Benachrichtigungen"
        >
          ♧
        </button>
      </header>

      {/* STATUS */}

      <section className="dq-status">

        <div className="dq-level">
          <small>LVL</small>

          <strong>
            {playerLevel}
          </strong>
        </div>

        <div className="dq-xp">

          <div>
            <strong>XP</strong>

            <span>
              {xpInsideCurrentLevel}{' '}
              /{' '}
              {XP_PER_PLAYER_LEVEL}
            </span>
          </div>

          <div className="dq-xp-track">
            <div
              style={{
                width:
                  `${xpPercent}%`,
              }}
            />
          </div>

        </div>

        <div className="dq-coins">
          🪙

          <strong>
            {totalCoins}
          </strong>

          <span>
            Coins
          </span>
        </div>

      </section>

      {/* KAMPAGNE */}

      <section className="dq-title">

        <div>
          <h1>
            KAMPAGNE
          </h1>

          <p>
            Werde zur Dart-Legende
          </p>
        </div>

        <div
          className="dq-world-switcher"
          style={{
            display:
              'grid',

            gridTemplateColumns:
              '56px 122px 56px',

            alignItems:
              'center',

            justifyContent:
              'end',

            gap:
              '8px',
          }}
        >

          <button
            type="button"
            className="dq-world-arrow"
            disabled={
              selectedWorld === 1
            }
            style={{
              width:
                '56px',

              height:
                '42px',

              padding:
                0,

              borderRadius:
                '11px',

              fontSize:
                '30px',

              fontWeight:
                900,

              opacity:
                selectedWorld === 1
                  ? 0.35
                  : 1,
            }}
            onClick={
              goToPreviousWorld
            }
          >
            ‹
          </button>

          <div
            className="dq-world-current"
            style={{
              width:
                '122px',

              height:
                '42px',

              padding:
                '3px 5px',

              borderRadius:
                '11px',
            }}
          >
            <small>
              WELT{' '}
              {selectedWorld}{' '}
              /{' '}
              {worldNames.length}
            </small>

            <strong>
              {
                worldNames[
                  selectedWorld - 1
                ]
              }
            </strong>
          </div>

          <button
            type="button"
            className="dq-world-arrow"
            disabled={
              selectedWorld ===
              worldNames.length
            }
            style={{
              width:
                '56px',

              height:
                '42px',

              padding:
                0,

              borderRadius:
                '11px',

              fontSize:
                '30px',

              fontWeight:
                900,

              opacity:
                selectedWorld ===
                worldNames.length
                  ? 0.35
                  : 1,
            }}
            onClick={
              goToNextWorld
            }
          >
            ›
          </button>

        </div>

      </section>

      {/* FORTSCHRITT */}

      <section className="dq-overview">

        <div className="dq-overview-left">

          <div className="dq-world-icon">
            🎯
          </div>

          <div className="dq-progress-info">

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

            <div className="dq-progress-row">

              <div className="dq-progress-track">
                <div
                  style={{
                    width:
                      `${campaignPercent}%`,
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

        <div className="dq-boss-rewards">

          <span>
            Boss-Level{' '}
            {worldBoss?.id ??
              worldEndLevel}
          </span>

          <div>

            <figure>
              <b>🪙</b>

              <small>
                +
                {worldBoss
                  ?.rewardCoins ??
                  0}
                <br />
                Coins
              </small>
            </figure>

            <figure>
              <b>⭐</b>

              <small>
                +
                {worldBoss
                  ?.rewardXP ??
                  0}
                <br />
                XP
              </small>
            </figure>

            <figure>
              <b>🃏</b>

              <small>
                Karten
              </small>
            </figure>

          </div>

        </div>

      </section>
            {/* TABS */}

      <nav className="dq-tabs">
        <button
          type="button"
          className="active"
        >
          KARTE
        </button>

        <button
          type="button"
        >
          LISTE
        </button>
      </nav>


      {/* MAP */}

      <section className="dq-map">

        <svg
          className="dq-path"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >

          <path
            className="dq-path-shadow"
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
            className="dq-path-main"
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


        {visibleLevels.map((level) => {
          const unlocked =
            isLevelUnlocked(level)

          const selected =
            selectedPreviewLevel?.id ===
            level.id

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
                'dq-node',

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
                left:
                  `${position?.x ?? 50}%`,

                top:
                  `${position?.y ?? 50}%`,
              }}

              onClick={() =>
                selectMapLevel(level)
              }

              disabled={!unlocked}

              aria-label={
                unlocked
                  ? `${level.title} auswählen`
                  : `${level.title} gesperrt`
              }
            >

              {level.boss && (
                <span className="dq-crown">
                  ♛
                </span>
              )}

              <strong>
                {unlocked
                  ? level.id
                  : '🔒'}
              </strong>

              <span className="dq-node-stars">
                {getLevelStars(level)}
              </span>

            </button>
          )
        })}

      </section>


      {/* AUSGEWÄHLTES LEVEL */}

      {selectedPreviewLevel &&
        isLevelUnlocked(
          selectedPreviewLevel,
        ) && (

          <section className="dq-level-card">

            <div className="dq-level-description">

              <small className="dq-level-name">
                {selectedPreviewLevel.title}
              </small>

              <strong className="dq-level-task">
                {selectedPreviewLevel.task}
              </strong>

              <span className="dq-level-best">
                Beste Bewertung
              </span>

              <div className="dq-level-stars">
                {getLevelStars(
                  selectedPreviewLevel,
                )}
              </div>

            </div>


            <div className="dq-level-action-area">

              <div className="dq-level-rewards">

                <div className="dq-reward-item">

                  <span className="dq-reward-icon">
                    ⭐
                  </span>

                  <strong>
                    +
                    {
                      selectedPreviewLevel
                        .rewardXP
                    }{' '}
                    XP
                  </strong>

                </div>


                <div className="dq-reward-item">

                  <span className="dq-reward-icon">
                    🪙
                  </span>

                  <strong>
                    +
                    {
                      selectedPreviewLevel
                        .rewardCoins
                    }{' '}
                    Coins
                  </strong>

                </div>

              </div>


              <button
                className="dq-play-button"
                type="button"
                onClick={
                  startSelectedLevel
                }
              >
                SPIELEN
              </button>

            </div>

          </section>
        )}


      {/* BOSS */}

      <section className="dq-boss-card">

        <div className="dq-boss-icon">
          {worldStars >=
          BOSS_STAR_REQUIREMENT
            ? '👑'
            : '🎁'}
        </div>


        <div className="dq-boss-info">

          <strong>
            Boss-Level{' '}
            {worldBoss?.id ??
              worldEndLevel}
          </strong>

          <span>
            ⭐ {worldStars} /{' '}
            {BOSS_STAR_REQUIREMENT}
          </span>

          <div className="dq-boss-track">

            <div
              style={{
                width:
                  `${Math.min(
                    (
                      worldStars /
                      BOSS_STAR_REQUIREMENT
                    ) * 100,
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
            ? 'BOSS'
            : '🔒'}

        </button>

      </section>


      {/* LEVEL MODAL */}

      <LevelModal
        level={selectedLevel}
        onClose={closeLevel}
        onComplete={completeLevel}
      />

    </main>
  )
}

export default Campaign