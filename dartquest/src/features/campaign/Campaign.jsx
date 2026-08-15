import { useEffect, useRef, useState } from 'react'

import {
  getLevelsByDifficulty,
} from './data/levels'

import {
  getWorldPosition,
} from './data/worldMaps'

import {
  getMultiplayerSaves,
  saveMultiplayerGame,
} from '../multiplayer/multiplayerSaves'

import LevelModal from './LevelModal'
import LevelEnterTransition from './components/LevelEnterTransition'
import CampaignExitModal from './CampaignExitModal'
import {
  getCampaignPlayerCount,
  scaleLevelForMultiplayer,
} from './multiplayerLevelScaling'
import {
  isBossUnlocked as checkBossUnlocked,
  isNormalLevelUnlocked,
} from './campaignUnlocking'
import logo from '../../assets/dartquest-logo.png'
import { XP_PER_PLAYER_LEVEL } from '../auth/profileStorage'

import './Campaign.css'


const CAMPAIGN_STORAGE_BASE_KEY =
  'dartquest-campaign-progress'

const FALLBACK_PATH_LEVEL_POSITIONS = [0, 11.65, 23.87, 33.06, 42.11, 53.62, 65.6, 73.49, 86.59, 100]

function measureLevelPositionsOnPath(path) {
  const totalLength = path.getTotalLength()
  const sampleCount = 1600

  return Array.from({ length: 10 }, (_, index) => {
    const target = getWorldPosition(1, index + 1)
    let nearestLength = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    for (let sample = 0; sample <= sampleCount; sample += 1) {
      const length = totalLength * sample / sampleCount
      const point = path.getPointAtLength(length)
      const distance = (point.x - target.x) ** 2 + (point.y - target.y) ** 2
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestLength = length
      }
    }

    return nearestLength / totalLength * 100
  })
}

const difficultyNames = {
  1: 'ANFÄNGER',
  2: 'LEICHT',
  3: 'MITTEL',
  4: 'SCHWER',
  5: 'PROFI',
}

const difficultyShortNames = {
  1: 'A',
  2: 'L',
  3: 'M',
  4: 'S',
  5: 'P',
}


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


function Campaign({
  settings = {
    multiplayer: false,
    playerCount: 1,
    campaignType: 'solo',
    difficulty: 1,
    isNewGame: false,
  },
  exitRequest = 0,
  onExit = () => {},
  activeProfile = null,
  onProfileRewards = async () => {},
}) {

  const baseLevels =
    getLevelsByDifficulty(
      settings.difficulty,
    )

  const campaignPlayerCount =
    getCampaignPlayerCount(settings)

  const levels =
    settings.multiplayer
      ? baseLevels.map((level) =>
          scaleLevelForMultiplayer(
            level,
            campaignPlayerCount,
          ),
        )
      : baseLevels


  const campaignStorageScope =
    settings.multiplayer
      ? `multiplayer-${settings.campaignType}-${settings.playerCount}-players`
      : 'singleplayer'


  const CAMPAIGN_STORAGE_KEY =
    `${CAMPAIGN_STORAGE_BASE_KEY}-${campaignStorageScope}-difficulty-${settings.difficulty}`


  /* =======================================================
     BOSS STERNE NACH SCHWIERIGKEIT
     ======================================================= */

  const bossStarRequirements = {
    1: 9,
    2: 15,
    3: 20,
    4: 25,
    5: 25,
  }

  const BOSS_STAR_REQUIREMENT =
    bossStarRequirements[
      settings.difficulty
    ] ?? 9


  /* =======================================================
     STATE
     ======================================================= */

  const [
    selectedLevel,
    setSelectedLevel,
  ] = useState(null)

  const [
    selectedWorld,
    setSelectedWorld,
  ] = useState(1)

  const [
    previewLevelId,
    setPreviewLevelId,
  ] = useState(1)

  const [
    progress,
    setProgress,
  ] = useState({
    unlockedLevel: 1,
    results: {},
    xp: 0,
    coins: 0,
  })

  const [saveModalOpen, setSaveModalOpen] =
    useState(false)

  const [multiplayerSaves, setMultiplayerSaves] =
    useState([])

  const [leaveModalOpen, setLeaveModalOpen] =
    useState(false)

  const [exitAfterSlotSave, setExitAfterSlotSave] =
    useState(false)

  const [levelEnterTransition, setLevelEnterTransition] = useState(null)
  const levelEnterLocked = useRef(false)
  const playActivationTimer = useRef(null)
  const [activatingLevelId, setActivatingLevelId] = useState(null)
  const [unlockAnimation, setUnlockAnimation] = useState(null)
  const campaignPathRef = useRef(null)
  const [pathLevelPositions, setPathLevelPositions] = useState(FALLBACK_PATH_LEVEL_POSITIONS)
  const unlockFrom = unlockAnimation?.from
  const unlockTo = unlockAnimation?.to
  const unlockCrossWorld = unlockAnimation?.crossWorld

  useEffect(() => () => {
    if (playActivationTimer.current) window.clearTimeout(playActivationTimer.current)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (campaignPathRef.current) {
        setPathLevelPositions(measureLevelPositionsOnPath(campaignPathRef.current))
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!unlockFrom || !unlockTo) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const travelDelay = reducedMotion ? 20 : 240
    const arrivalDelay = reducedMotion ? 80 : 1740
    const finishDelay = reducedMotion ? 420 : 2350
    const worldDelay = reducedMotion ? 20 : 1250
    const travelTimer = window.setTimeout(() => {
      setUnlockAnimation((current) => current ? { ...current, phase: 'traveling' } : null)
    }, travelDelay)
    const arriveTimer = window.setTimeout(() => {
      setUnlockAnimation((current) => current ? { ...current, phase: 'arrived' } : null)
    }, arrivalDelay)
    const worldTimer = unlockCrossWorld
      ? window.setTimeout(() => setSelectedWorld(Math.ceil(unlockTo / 10)), worldDelay)
      : null
    const finishTimer = window.setTimeout(() => setUnlockAnimation(null), finishDelay)

    return () => {
      window.clearTimeout(travelTimer)
      window.clearTimeout(arriveTimer)
      if (worldTimer) window.clearTimeout(worldTimer)
      window.clearTimeout(finishTimer)
    }
  }, [unlockFrom, unlockTo, unlockCrossWorld])

  useEffect(() => {
    if (exitRequest > 0) {
      setLeaveModalOpen(true)
    }
  }, [exitRequest])


  /* =======================================================
     GRUNDWERTE
     ======================================================= */

  const worldStartLevel =
    (selectedWorld - 1) * 10 + 1

  const worldEndLevel =
    selectedWorld * 10


  const visibleLevels =
    levels.filter(
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
      (level) =>
        level.boss,
    )


  const worldNormalLevels =
    visibleLevels.filter(
      (level) =>
        !level.boss,
    )


  const worldStars =
    worldNormalLevels.reduce(
      (sum, level) =>
        sum +
        (
          progress.results[level.id]
            ?.stars ?? 0
        ),

      0,
    )


  const totalXP =
    Number(activeProfile?.xp) || 0

  const totalCoins =
    Number(activeProfile?.coins) || 0


  const playerLevel =
    Number(activeProfile?.playerLevel) || 1


  const xpInsideCurrentLevel =
    totalXP %
    XP_PER_PLAYER_LEVEL


  const xpPercent =
    Math.min(
      (
        xpInsideCurrentLevel /
        XP_PER_PLAYER_LEVEL
      ) * 100,

      100,
    )


  function openSaveModal() {
    setMultiplayerSaves(
      getMultiplayerSaves(),
    )
    setSaveModalOpen(true)
  }


  function saveToSlot(
    slotIndex,
    { confirmOverwrite = true, leaveAfterSaving = exitAfterSlotSave } = {},
  ) {
    const existingSave =
      multiplayerSaves[slotIndex]

    if (
      existingSave &&
      confirmOverwrite &&
      !window.confirm(
        'Diesen Spielstand wirklich überschreiben?',
      )
    ) {
      return
    }

    const savedAt = new Date().toISOString()

    saveMultiplayerGame(slotIndex, {
      players: (settings.players ?? []).map(
        (player) => ({
          id: player.id,
          name: player.name,
          userId: player.userId ?? null,
        }),
      ),
      playerCount: settings.playerCount,
      campaignType: settings.campaignType,
      difficulty: settings.difficulty,
      unlockedLevel: progress.unlockedLevel,
      results: progress.results,
      xp: progress.xp,
      coins: progress.coins,
      selectedWorld,
      previewLevelId,
      savedAt,
      lastPlayed: savedAt,
      saveSlotId: slotIndex + 1,
      slotIndex,
    })

    setMultiplayerSaves(
      getMultiplayerSaves(),
    )
    setSaveModalOpen(false)

    if (leaveAfterSaving) {
      setExitAfterSlotSave(false)
      onExit()
    }
  }

  function closeSaveModal() {
    setSaveModalOpen(false)
    setExitAfterSlotSave(false)
  }

  function saveAndExit() {
    if (!settings.multiplayer) {
      localStorage.setItem(
        CAMPAIGN_STORAGE_KEY,
        JSON.stringify(progress),
      )
      setLeaveModalOpen(false)
      onExit()
      return
    }

    if (Number.isInteger(settings.slotIndex)) {
      saveToSlot(settings.slotIndex, {
        confirmOverwrite: false,
        leaveAfterSaving: true,
      })
      setLeaveModalOpen(false)
      return
    }

    setLeaveModalOpen(false)
    setExitAfterSlotSave(true)
    openSaveModal()
  }

  function exitWithoutSaving() {
    setLeaveModalOpen(false)
    onExit()
  }


  /* =======================================================
     SPEICHER LADEN
     ======================================================= */

  useEffect(() => {

    setProgress({
      unlockedLevel: 1,
      results: {},
      xp: 0,
      coins: 0,
    })

    setSelectedWorld(1)
    setPreviewLevelId(1)
    setSelectedLevel(null)


    const isNewMultiplayerGame =
      settings.multiplayer &&
      settings.isNewGame === true

    const savedMultiplayerGame =
      settings.multiplayer &&
      settings.isNewGame === false
        ? settings.savedGame
        : null

    if (isNewMultiplayerGame) {
      return
    }


    if (savedMultiplayerGame) {
      const unlockedLevel = Math.min(
        Math.max(
          savedMultiplayerGame.unlockedLevel ?? 1,
          1,
        ),
        levels.length,
      )

      const restoredWorld = Math.min(
        Math.max(
          savedMultiplayerGame.selectedWorld ??
            Math.ceil(unlockedLevel / 10),
          1,
        ),
        worldNames.length,
      )

      const restoredPreviewLevel = Math.min(
        Math.max(
          savedMultiplayerGame.previewLevelId ??
            unlockedLevel,
          1,
        ),
        levels.length,
      )

      setProgress({
        unlockedLevel,
        results:
          savedMultiplayerGame.results ?? {},
        xp:
          savedMultiplayerGame.xp ?? 0,
        coins:
          savedMultiplayerGame.coins ?? 0,
      })

      setSelectedWorld(restoredWorld)
      setPreviewLevelId(restoredPreviewLevel)

      return
    }


    const savedProgress =
      localStorage.getItem(
        CAMPAIGN_STORAGE_KEY,
      )


    if (!savedProgress) {
      return
    }


    try {

      const parsedProgress =
        JSON.parse(
          savedProgress,
        )


      const unlockedLevel =
        Math.min(
          parsedProgress
            .unlockedLevel ?? 1,

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


      setSelectedWorld(
        currentWorld,
      )


      setPreviewLevelId(
        unlockedLevel,
      )

    } catch {

      localStorage.removeItem(
        CAMPAIGN_STORAGE_KEY,
      )

    }

  }, [
    settings.difficulty,
    settings.multiplayer,
    settings.isNewGame,
    settings.savedGame,
    CAMPAIGN_STORAGE_KEY,
    levels.length,
  ])


  /* =======================================================
     HELFER
     ======================================================= */

  function getWorldStars(
    worldNumber,
    currentResults,
  ) {

    const startLevel =
      (worldNumber - 1) *
      10 +
      1

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
          (
            currentResults[level.id]
              ?.stars ?? 0
          ),

        0,
      )
  }


  function isLevelUnlocked(
    level,
  ) {

    if (!level) {
      return false
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

      const normalLevelsInWorld =
        levels.filter(
          (candidate) =>
            Math.ceil(candidate.id / 10) === levelWorld &&
            !candidate.boss,
        )

      return checkBossUnlocked({
        normalLevels: normalLevelsInWorld,
        results: progress.results,
        worldStars: starsInWorld,
        requiredStars: BOSS_STAR_REQUIREMENT,
      })
    }


    return isNormalLevelUnlocked(
      level,
      progress.results,
    )
  }


  function getLevelStars(
    level,
  ) {

    if (!level) {
      return '☆☆☆☆'
    }


    const result =
      progress.results[level.id]


    if (!result) {
      return '☆☆☆☆'
    }


    const stars =
      Math.max(
        0,

        Math.min(
          result.stars ?? 0,
          4,
        ),
      )


    return `${'⭐'.repeat(
      stars,
    )}${'☆'.repeat(
      4 - stars,
    )}`
  }


  function goToWorld(
    worldNumber,
  ) {

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
      (
        boundedWorld - 1
      ) * 10 + 1,
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


  function selectMapLevel(
    level,
  ) {

    if (
      !isLevelUnlocked(level) ||
      unlockAnimation
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
      ) ||
      levelEnterLocked.current
    ) {
      return
    }

    const levelToStart = selectedPreviewLevel
    const sourceNode = document.querySelector(
      `[data-campaign-level-id="${levelToStart.id}"]`,
    )
    const sourceRect = sourceNode?.getBoundingClientRect()

    levelEnterLocked.current = true
    setActivatingLevelId(levelToStart.id)
    playActivationTimer.current = window.setTimeout(() => {
      setLevelEnterTransition({
        level: levelToStart,
        sourceRect: sourceRect
          ? {
              x: sourceRect.x,
              y: sourceRect.y,
              width: sourceRect.width,
              height: sourceRect.height,
            }
          : null,
      })
    }, 300)
  }

  function finishLevelEnter() {
    const level = levelEnterTransition?.level
    if (!level) return
    setSelectedLevel(level)
    setLevelEnterTransition(null)
    setActivatingLevelId(null)
    levelEnterLocked.current = false
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
    const previousResult = progress.results[level.id]
    const previousStars = previousResult?.stars ?? 0
    const bestStars = Math.max(previousStars, result.stars ?? 0)
    const bestDarts = previousResult?.darts == null
      ? result.darts
      : result.darts == null
        ? previousResult.darts
        : Math.min(previousResult.darts, result.darts)
    const successfulAttempt =
      result.success !== false && (result.stars ?? 0) >= 1
    const completedSuccessfully = bestStars >= 1
    const isFirstCompletion = !previousResult
    const isBetterResult = bestStars > previousStars
    const coinRewardAllowed = isFirstCompletion || isBetterResult
    const earnedXP = successfulAttempt ? level.rewardXP ?? 0 : 0
    const earnedCoins = successfulAttempt && coinRewardAllowed
      ? level.rewardCoins ?? 0
      : 0
    const updatedProgress = {
      unlockedLevel: completedSuccessfully
        ? Math.max(
            progress.unlockedLevel,
            Math.min(level.id + 1, levels.length),
          )
        : progress.unlockedLevel,
      results: {
        ...progress.results,
        [level.id]: {
          ...previousResult,
          ...result,
          stars: bestStars,
          darts: bestDarts,
        },
      },
      // Vorhandene lokale Werte bleiben erhalten, erhalten aber keine neuen
      // globalen Rewards mehr. public.profiles ist ab jetzt maßgeblich.
      xp: progress.xp ?? 0,
      coins: progress.coins ?? 0,
    }

    const newlyUnlocked =
      updatedProgress.unlockedLevel > progress.unlockedLevel

    if (newlyUnlocked) {
      setUnlockAnimation({
        from: level.id,
        to: updatedProgress.unlockedLevel,
        boss: level.boss === true,
        crossWorld: Math.ceil(level.id / 10) !== Math.ceil(updatedProgress.unlockedLevel / 10),
        phase: 'charging',
      })
    }

    setProgress(updatedProgress)

    if (!settings.multiplayer) {
      localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(updatedProgress))
    }

    setPreviewLevelId(Math.min(level.id + 1, levels.length))

    if (successfulAttempt && (earnedXP > 0 || earnedCoins > 0)) {
      onProfileRewards({ xp: earnedXP, coins: earnedCoins })
        .catch((rewardError) => {
          console.error('Profil-Rewards konnten nicht gespeichert werden.', rewardError)
        })
    }


    setSelectedLevel(null)
  }


  /* =======================================================
     UI
     ======================================================= */

  const highestUnlockedMapIndex =
    visibleLevels.reduce(
      (highestIndex, level, index) =>
        isLevelUnlocked(level)
          ? index
          : highestIndex,
      0,
    )

  const bossUnlocked =
    checkBossUnlocked({
      normalLevels: worldNormalLevels,
      results: progress.results,
      worldStars,
      requiredStars: BOSS_STAR_REQUIREMENT,
    })

  const mapPathProgress =
    pathLevelPositions[
      highestUnlockedMapIndex
    ] ?? 0

  const unlockFromIndex = unlockAnimation
    ? (unlockAnimation.from - 1) % 10
    : 0
  const unlockToIndex = unlockAnimation
    ? (unlockAnimation.to - 1) % 10
    : 0
  const unlockPathStart = pathLevelPositions[unlockFromIndex] ?? 0
  const unlockPathEnd = pathLevelPositions[unlockToIndex] ?? unlockPathStart
  const unlockPathLength = Math.max(0, unlockPathEnd - unlockPathStart)
  const unlockVisible = unlockAnimation && !unlockAnimation.crossWorld &&
    Math.ceil(unlockAnimation.from / 10) === selectedWorld
  const displayedMapPathProgress = unlockVisible && unlockAnimation.phase !== 'arrived'
    ? unlockPathStart
    : mapPathProgress

  return (
    <main className="dq-campaign">

      {/* HEADER */}

      <header className="dq-header">

        {settings.multiplayer ? (
          <button
            type="button"
            className="dq-header-button dq-header-save"
            aria-label="Spiel speichern"
            onClick={openSaveModal}
          >
            💾
          </button>
        ) : (
          <button
            type="button"
            className="dq-header-button"
            aria-label="Menü"
          >
            ☰
          </button>
        )}


        <div className="dq-logo">
          <img
            src={logo}
            alt="DartQuest"
          />
        </div>


        <div
          className={`dq-difficulty-badge dq-difficulty-${settings.difficulty}`}
          aria-label={`Schwierigkeitsgrad ${difficultyNames[settings.difficulty] ?? difficultyNames[1]}`}
          title={`Schwierigkeitsgrad: ${difficultyNames[settings.difficulty] ?? difficultyNames[1]}`}
        >
          <strong>{difficultyShortNames[settings.difficulty] ?? difficultyShortNames[1]}</strong>
          <small>{difficultyNames[settings.difficulty] ?? difficultyNames[1]}</small>
        </div>

      </header>


      {/* STATUS */}

      <section className="dq-status">

        <div className="dq-level">

          <small>
            LVL
          </small>

          <strong>
            {playerLevel}
          </strong>

        </div>


        <div className="dq-xp">

          <div>

            <strong>
              XP
            </strong>

            <span>
              {totalXP.toLocaleString('de-DE')}
              {' / '}
              {(playerLevel * XP_PER_PLAYER_LEVEL).toLocaleString('de-DE')}
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

      <section className="dq-title dq-title-world-only">

        <div
          className="dq-world-switcher"
          style={{
            display: 'grid',

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

          {/* LINKS */}

          <button
            type="button"

            className="dq-world-arrow"

            disabled={
              selectedWorld === 1
            }

            onClick={
              goToPreviousWorld
            }

            style={{
              width: '56px',
              height: '42px',

              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center',

              padding: 0,

              border:
                '1px solid rgba(66, 230, 149, 0.35)',

              borderRadius:
                '11px',

              backgroundColor:
                selectedWorld === 1
                  ? '#071712'
                  : '#092019',

              backgroundImage:
                'none',

              color:
                selectedWorld === 1
                  ? '#315f50'
                  : '#42e695',

              fontSize:
                '30px',

              fontWeight:
                900,

              lineHeight:
                1,

              opacity:
                1,

              cursor:
                selectedWorld === 1
                  ? 'default'
                  : 'pointer',
            }}
          >
            ‹
          </button>


          {/* WELT */}

          <div
            className="dq-world-current"

            style={{
              width:
                '122px',

              height:
                '42px',

              display:
                'flex',

              flexDirection:
                'column',

              alignItems:
                'center',

              justifyContent:
                'center',

              padding:
                '3px 5px',

              border:
                '1px solid rgba(66, 230, 149, 0.35)',

              borderRadius:
                '11px',

              backgroundColor:
                '#092019',

              color:
                '#ffffff',
            }}
          >

            <small
              style={{
                color:
                  '#42e695',
              }}
            >
              WELT{' '}
              {selectedWorld}
              {' / '}
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


          {/* RECHTS */}

          <button
            type="button"

            className="dq-world-arrow"

            disabled={
              selectedWorld ===
              worldNames.length
            }

            onClick={
              goToNextWorld
            }

            style={{
              width:
                '56px',

              height:
                '42px',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              padding:
                0,

              border:
                '1px solid rgba(66, 230, 149, 0.35)',

              borderRadius:
                '11px',

              backgroundColor:
                selectedWorld ===
                worldNames.length
                  ? '#071712'
                  : '#092019',

              backgroundImage:
                'none',

              color:
                selectedWorld ===
                worldNames.length
                  ? '#315f50'
                  : '#42e695',

              fontSize:
                '30px',

              fontWeight:
                900,

              lineHeight:
                1,

              opacity:
                1,

              cursor:
                selectedWorld ===
                worldNames.length
                  ? 'default'
                  : 'pointer',
            }}
          >
            ›
          </button>

        </div>

      </section>


      {/* MAP */}

      <section className="dq-map">

        <svg
          className="dq-path"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >

          <defs>
            <mask id="dq-unlocked-path-mask">
              <path
                pathLength="100"
                d="
                  M 12 10
                  C 30 8, 52 10, 66 19
                  C 78 26, 84 31, 80 36
                  C 74 44, 57 47, 38 48
                  C 22 49, 12 53, 14 60
                  C 16 69, 34 74, 56 76
                  C 70 77, 79 82, 84 88
                "
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeDasharray={`${displayedMapPathProgress} 100`}
              />
            </mask>
          </defs>

          <path
            ref={campaignPathRef}
            className="dq-path-shadow"

            pathLength="100"

            d="
              M 12 10
              C 30 8, 52 10, 66 19
              C 78 26, 84 31, 80 36
              C 74 44, 57 47, 38 48
              C 22 49, 12 53, 14 60
              C 16 69, 34 74, 56 76
              C 70 77, 79 82, 84 88
            "
          />


          <path
            className="dq-path-main"

            pathLength="100"

            mask="url(#dq-unlocked-path-mask)"

            d="
              M 12 10
              C 30 8, 52 10, 66 19
              C 78 26, 84 31, 80 36
              C 74 44, 57 47, 38 48
              C 22 49, 12 53, 14 60
              C 16 69, 34 74, 56 76
              C 70 77, 79 82, 84 88
            "
          />

          {unlockVisible && unlockAnimation.phase === 'traveling' && (
            <>
              <path
                className={`dq-path-unlock${unlockAnimation.boss ? ' is-boss' : ''}`}
                pathLength="100"
                style={{
                  '--dq-unlock-length': unlockPathLength,
                  '--dq-unlock-gap': 100 - unlockPathLength,
                  '--dq-unlock-offset': -unlockPathStart,
                }}
                d="M 12 10 C 30 8, 52 10, 66 19 C 78 26, 84 31, 80 36 C 74 44, 57 47, 38 48 C 22 49, 12 53, 14 60 C 16 69, 34 74, 56 76 C 70 77, 79 82, 84 88"
              />
              <circle className="dq-path-unlock-aura" r="2.8">
                <animateMotion dur="1500ms" fill="freeze" calcMode="linear" keyPoints={`${unlockPathStart / 100};${unlockPathEnd / 100}`} keyTimes="0;1" path="M 12 10 C 30 8, 52 10, 66 19 C 78 26, 84 31, 80 36 C 74 44, 57 47, 38 48 C 22 49, 12 53, 14 60 C 16 69, 34 74, 56 76 C 70 77, 79 82, 84 88" />
              </circle>
              <circle className="dq-path-unlock-head" r="1.55">
                <animateMotion
                  dur="1500ms"
                  fill="freeze"
                  calcMode="linear"
                  keyPoints={`${unlockPathStart / 100};${unlockPathEnd / 100}`}
                  keyTimes="0;1"
                  path="M 12 10 C 30 8, 52 10, 66 19 C 78 26, 84 31, 80 36 C 74 44, 57 47, 38 48 C 22 49, 12 53, 14 60 C 16 69, 34 74, 56 76 C 70 77, 79 82, 84 88"
                />
              </circle>
            </>
          )}

        </svg>


        {visibleLevels.map(
          (level) => {

            const unlocked =
              isLevelUnlocked(
                level,
              )


            const selected =
              selectedPreviewLevel
                ?.id ===
              level.id


            const position =
              getWorldPosition(
                selectedWorld,
                level.id,
              )


            return (
              <button
                key={level.id}
                data-campaign-level-id={level.id}

                type="button"

                className={[
                  'dq-node',

                  unlocked
                    ? 'unlocked'
                    : 'locked',

                  selected
                    ? 'selected'
                    : '',

                  activatingLevelId === level.id
                    ? 'is-starting'
                    : '',

                  level.boss
                    ? 'boss'
                    : '',

                  unlockAnimation?.from === level.id
                    ? 'just-completed'
                    : '',

                  unlockAnimation?.to === level.id
                    ? `unlocking ${unlockAnimation.phase}`
                    : '',

                  unlockAnimation?.boss && unlockAnimation?.to === level.id
                    ? 'boss-unlock'
                    : '',
                ].join(' ')}

                style={{
                  left:
                    `${position?.x ?? 50}%`,

                  top:
                    `${position?.y ?? 50}%`,
                }}

                onClick={() =>
                  selectMapLevel(
                    level,
                  )
                }

                disabled={
                  !unlocked
                }

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

                {unlockAnimation?.to === level.id && (
                  <span className="dq-node-unlock-lock" aria-hidden="true">🔒</span>
                )}


                <strong>
                  {
                    unlocked
                      ? level.id
                      : '🔒'
                  }
                </strong>


                <span className="dq-node-stars">
                  {
                    getLevelStars(
                      level,
                    )
                  }
                </span>

              </button>
            )
          },
        )}

      </section>


      {/* AUSGEWÄHLTES LEVEL */}

      {selectedPreviewLevel &&
        isLevelUnlocked(
          selectedPreviewLevel,
        ) && (

          <section className="dq-level-card">

            <div className="dq-level-description">

              <small className="dq-level-name">
                {
                  selectedPreviewLevel
                    .title
                }
              </small>


              <strong className="dq-level-task">
                {
                  selectedPreviewLevel
                    .task
                }
              </strong>


              <span className="dq-level-best">
                Beste Bewertung
              </span>


              <div className="dq-level-stars">
                {
                  getLevelStars(
                    selectedPreviewLevel,
                  )
                }
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
                className={`dq-play-button${activatingLevelId === selectedPreviewLevel.id ? ' is-activating' : ''}`}

                type="button"

                disabled={Boolean(activatingLevelId || levelEnterTransition)}

                onClick={
                  startSelectedLevel
                }
              >
                <span className="dq-play-icon" aria-hidden="true" />
                SPIELEN
              </button>

            </div>

          </section>
        )}


      {/* BOSS */}

      <section className="dq-boss-card">

        <div className="dq-boss-icon">

          <span>♛</span>
          <strong>BOSS</strong>

        </div>


        <div className="dq-boss-info">

          <span>
            <b className="dq-boss-star-icon">
              ★
            </b>

            <span className="dq-boss-star-count">
              <strong>{worldStars}</strong>
              <small>/</small>
              <strong>{BOSS_STAR_REQUIREMENT}</strong>
            </span>
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

          {
            bossUnlocked
              ? 'BOSS'
              : '🔒'
          }

        </button>

      </section>


      {leaveModalOpen && (
        <CampaignExitModal
          onSaveAndExit={saveAndExit}
          onExitWithoutSaving={exitWithoutSaving}
          onCancel={() => setLeaveModalOpen(false)}
        />
      )}


      {settings.multiplayer && saveModalOpen && (
        <div
          className="dq-save-modal-backdrop"
          onClick={closeSaveModal}
        >
          <section
            className="dq-save-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dq-save-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="dq-save-modal-header">
              <div>
                <span>DARTQUEST</span>
                <h2 id="dq-save-modal-title">
                  Spiel speichern
                </h2>
              </div>

              <button
                type="button"
                onClick={closeSaveModal}
                aria-label="Speichern schließen"
              >
                ×
              </button>
            </header>

            <div className="dq-save-slot-list">
              {[0, 1, 2].map((slotIndex) => {
                const save =
                  multiplayerSaves[slotIndex]

                const stars = Object.values(
                  save?.results ?? {},
                ).reduce(
                  (total, result) =>
                    total + (result?.stars ?? 0),
                  0,
                )

                const playerNames = (
                  save?.players ?? []
                )
                  .map((player) => player.name)
                  .filter(Boolean)
                  .join(' & ')

                return (
                  <article
                    key={slotIndex}
                    className={[
                      'dq-save-slot',
                      save ? 'occupied' : 'empty',
                    ].join(' ')}
                  >
                    <span className="dq-save-slot-label">
                      Speicherplatz {slotIndex + 1}
                    </span>

                    {save ? (
                      <>
                        <strong>
                          {playerNames || 'Mehrspieler-Kampagne'}
                        </strong>

                        <small>
                          {(save.campaignType ?? 'coop').toUpperCase()}
                          {' · '}
                          {difficultyNames[save.difficulty] ?? 'ANFÄNGER'}
                        </small>

                        <p>
                          Welt {save.selectedWorld ?? 1}
                          {' · '}
                          Level {save.unlockedLevel ?? 1}
                        </p>

                        <p>
                          ⭐ {stars} Sterne
                          {' · '}XP {save.xp ?? 0}
                        </p>

                        <small>
                          Zuletzt gespeichert:{' '}
                          {save.savedAt
                            ? new Date(
                                save.savedAt,
                              ).toLocaleDateString('de-DE')
                            : '–'}
                        </small>
                      </>
                    ) : (
                      <strong>Noch kein Spielstand</strong>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        saveToSlot(slotIndex)
                      }
                    >
                      {save ? 'ÜBERSCHREIBEN' : 'SPEICHERN'}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}


      {/* LEVEL MODAL */}

      {levelEnterTransition && (
        <LevelEnterTransition
          level={levelEnterTransition.level}
          sourceRect={levelEnterTransition.sourceRect}
          onComplete={finishLevelEnter}
        />
      )}

      <LevelModal
        level={
          selectedLevel
        }

        multiplayer={
          settings.multiplayer === true
        }

        playerCount={
          campaignPlayerCount
        }

        players={
          settings.players
        }

        onClose={
          closeLevel
        }

        onComplete={
          completeLevel
        }
      />

    </main>
  )
}


export default Campaign
