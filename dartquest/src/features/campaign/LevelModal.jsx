import { useEffect, useState } from 'react'

import './LevelModal.css'


/* =========================================================
   4-STERNE-BEWERTUNG
   ========================================================= */

function getStarOptions(level) {
  const targetHits =
    Number(level.targetHits)

  const minimumDarts =
    Number.isFinite(targetHits) &&
    targetHits > 0
      ? targetHits
      : 1

  const threeStarMax =
    minimumDarts * 3

  const twoStarMax =
    minimumDarts * 6

  return [
    {
      stars: 4,
      label: '⭐⭐⭐⭐',

      minDarts:
        minimumDarts,

      maxDarts:
        minimumDarts,

      text:
        minimumDarts === 1
          ? '1 Pfeil · Perfekt'
          : `${minimumDarts} Pfeile · Perfekt`,
    },

    {
      stars: 3,
      label: '⭐⭐⭐',

      minDarts:
        minimumDarts + 1,

      maxDarts:
        threeStarMax,

      text:
        `${minimumDarts + 1}–${threeStarMax} Pfeile`,
    },

    {
      stars: 2,
      label: '⭐⭐',

      minDarts:
        threeStarMax + 1,

      maxDarts:
        twoStarMax,

      text:
        `${threeStarMax + 1}–${twoStarMax} Pfeile`,
    },

    {
      stars: 1,
      label: '⭐',

      minDarts:
        twoStarMax + 1,

      maxDarts:
        null,

      text:
        `${twoStarMax + 1} oder mehr Pfeile`,
    },
  ]
}

/* =========================================================
   PFEILTEXT
   ========================================================= */

function formatDarts(
  min,
  max,
) {
  if (min == null) {
    return ''
  }

  if (max == null) {
    return `${min} oder mehr Pfeile`
  }


  if (min === max) {
    return `${min} ${
      min === 1
        ? 'Pfeil'
        : 'Pfeile'
    }`
  }


  return `${min}–${max} Pfeile`
}

function formatTaskForDisplay(task) {
  return String(task ?? '')
    .replace(/\s+mit maximal\s+\d+\s+Darts?$/i, '')
}


/* =========================================================
   LEVEL MODAL
   ========================================================= */

function LevelModal({
  level,
  multiplayer = false,
  playerCount = 1,
  players = [],
  onClose,
  onComplete,
}) {

  const [
    result,
    setResult,
  ] = useState(null)


  /* =======================================================
     NEUES LEVEL
     ======================================================= */

  useEffect(() => {
    setResult(null)
  }, [level?.id])


  /* =======================================================
     AUTOMATISCH WEITER
     ======================================================= */

  useEffect(() => {

    if (
      !result ||
      !level
    ) {
      return
    }


    const timer =
      setTimeout(() => {

        onComplete(
          level,
          result,
        )

        onClose()

      }, 2500)


    return () => {
      clearTimeout(timer)
    }

  }, [
    result,
    level,
    onComplete,
    onClose,
  ])


  /* =======================================================
     KEIN LEVEL
     ======================================================= */

  if (!level) {
    return null
  }


  const starOptions =
    getStarOptions(level)

  const displayedTask =
    formatTaskForDisplay(level.task)


  const playerNames = Array.isArray(players)
    ? players
        .filter((player) => player?.active !== false)
        .map((player) => player?.name)
        .filter(Boolean)
    : []


  /* =======================================================
     ERGEBNIS AUSWÄHLEN
     ======================================================= */

  function selectResult(
    option,
  ) {

    const dartRange =
      option.text ??
      formatDarts(
        option.minDarts,
        option.maxDarts,
      )


    setResult({
      success: true,

      stars:
        option.stars,

      /*
        Wir speichern momentan den Bereich.

        Später kann hier unser optionaler
        Dart-Counter die echte Dartzahl
        eintragen.
      */

      darts:
        option.maxDarts ??
        null,

      dartRange,

      xp:
        level.rewardXP ?? 0,

      coins:
        level.rewardCoins ?? 0,
    })
  }


  /* =======================================================
     MANUELL WEITER
     ======================================================= */

  function finishLevel() {

    if (!result) {
      return
    }


    onComplete(
      level,
      result,
    )

    onClose()
  }


  /* =======================================================
     AUFGEBEN
     ======================================================= */

  function giveUpLevel() {
    onClose()
  }


  /* =======================================================
     UI
     ======================================================= */

  return (
    <div
      className="level-modal-backdrop"

      onClick={
        onClose
      }
    >

      <article
        className="level-modal"

        onClick={(
          event,
        ) =>
          event.stopPropagation()
        }
      >

        {/* SCHLIESSEN */}

        <button
          className="level-modal-close"

          type="button"

          onClick={
            onClose
          }

          aria-label="Level schließen"
        >
          ×
        </button>


        {/* =================================================
            AUFGABE
            ================================================= */}

        {!result && (
          <>

            <p className="level-modal-eyebrow">

              {level.boss
                ? `BOSS-LEVEL ${level.id}`
                : `LEVEL ${level.id}`}

            </p>


            <h2 className="level-modal-title">
              {displayedTask}
            </h2>


            {multiplayer && (
              <div className="level-modal-multiplayer">
                <strong>
                  👥 {playerCount} Spieler
                </strong>

                {playerNames.length > 0 && (
                  <span>{playerNames.join(' · ')}</span>
                )}

                <span>
                  {level.multiplayerGoal}
                </span>
              </div>
            )}


            <div className="level-modal-task">

              <p>
                Deine Aufgabe:{' '}

                <strong>
                  {displayedTask}
                </strong>
              </p>


              <p>
                Schließe die Aufgabe
                erfolgreich ab.
              </p>

            </div>


            <p className="level-modal-question">
              Wie hast du die Aufgabe geschafft?
            </p>


            {/* STERNE */}

            <div className="level-modal-options">

              {starOptions.map(
                (option) => (

                  <button
                    key={
                      option.stars
                    }

                    type="button"

                    className="level-choice"

                    onClick={() =>
                      selectResult(
                        option,
                      )
                    }
                  >

                    <span className="level-choice-stars">

                      {
                        option.label
                      }

                    </span>


                    <span className="level-choice-text">

                      {
                        option.text ??
                        formatDarts(
                          option.minDarts,
                          option.maxDarts,
                        )
                      }

                    </span>


                    <span className="level-choice-arrow">
                      ›
                    </span>

                  </button>

                ),
              )}


              {/* AUFGEBEN */}

              <button
                type="button"

                className="
                  level-choice
                  level-choice-giveup
                "

                onClick={
                  giveUpLevel
                }
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


        {/* =================================================
            ERGEBNIS
            ================================================= */}

        {result && (

          <div className="level-result-screen">

            <p className="level-modal-eyebrow">

              {level.boss
                ? `BOSS-LEVEL ${level.id}`
                : `LEVEL ${level.id}`}

            </p>


            <div className="level-result-stars">

              {'⭐'.repeat(
                result.stars,
              )}

            </div>


            <h2>
              Level geschafft!
            </h2>


            <p className="level-result-range">
              {result.dartRange}
            </p>


            <div className="level-result-rewards">

              <div>

                <span>
                  XP
                </span>

                <strong>
                  +
                  {result.xp}
                </strong>

              </div>


              <div>

                <span>
                  Coins
                </span>

                <strong>
                  +
                  {result.coins}
                </strong>

              </div>

            </div>


            <button
              className="level-result-continue"

              type="button"

              onClick={
                finishLevel
              }
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
