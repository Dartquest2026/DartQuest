import { useEffect, useState } from 'react'

const DAILY_STORAGE_KEY = 'dartquest-daily-challenge'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getReward(darts) {
  if (darts >= 1 && darts <= 3) {
    return {
      stars: 3,
      xp: 50,
      coins: 30,
      label: '⭐⭐⭐',
    }
  }

  if (darts >= 4 && darts <= 6) {
    return {
      stars: 2,
      xp: 35,
      coins: 20,
      label: '⭐⭐',
    }
  }

  if (darts >= 7 && darts <= 9) {
    return {
      stars: 1,
      xp: 20,
      coins: 10,
      label: '⭐',
    }
  }

  return {
    stars: 0,
    xp: 0,
    coins: 0,
    label: '❌',
  }
}

function Dashboard({ onStartCampaign }) {
  const [dailyOpen, setDailyOpen] = useState(false)
  const [darts, setDarts] = useState('')
  const [result, setResult] = useState(null)
  const [dailyCompleted, setDailyCompleted] = useState(false)

  useEffect(() => {
    const savedDaily = localStorage.getItem(DAILY_STORAGE_KEY)

    if (!savedDaily) {
      return
    }

    try {
      const parsedDaily = JSON.parse(savedDaily)

      if (parsedDaily.date === getTodayKey()) {
        setDailyCompleted(true)
        setResult(parsedDaily.result)
      } else {
        localStorage.removeItem(DAILY_STORAGE_KEY)
      }
    } catch {
      localStorage.removeItem(DAILY_STORAGE_KEY)
    }
  }, [])

  function openDailyChallenge() {
    if (dailyCompleted) {
      return
    }

    setDarts('')
    setResult(null)
    setDailyOpen(true)
  }

  function saveDailyResult(dailyResult) {
    const savedData = {
      date: getTodayKey(),
      result: dailyResult,
    }

    localStorage.setItem(
      DAILY_STORAGE_KEY,
      JSON.stringify(savedData),
    )

    setResult(dailyResult)
    setDailyCompleted(true)
  }

  function evaluateDailyChallenge() {
    const dartsNumber = Number(darts)

    if (
      !Number.isInteger(dartsNumber) ||
      dartsNumber < 1 ||
      dartsNumber > 9
    ) {
      setResult({
        error: true,
        message: 'Bitte gib eine Zahl von 1 bis 9 ein.',
      })

      return
    }

    saveDailyResult(getReward(dartsNumber))
  }

  function markAsFailed() {
    saveDailyResult(getReward(0))
  }

  function closeDailyChallenge() {
    setDailyOpen(false)
  }

  return (
    <section className="page">
      <div className="welcome-card">
        <p>Willkommen zurück, Daniel 👋</p>

        <h2>Bereit für dein nächstes Training?</h2>

        <div className="progress-info">
          <span>Kampagnenfortschritt</span>
          <strong>1 von 100</strong>
        </div>

        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={onStartCampaign}
        >
          Weiter spielen
        </button>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">⭐</span>
          <strong>0</strong>
          <p>Sterne</p>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🔥</span>
          <strong>0</strong>
          <p>Tagesserie</p>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🏆</span>
          <strong>0</strong>
          <p>Erfolge</p>
        </article>
      </div>

      <section
        className={`daily-card ${
          dailyCompleted ? 'daily-completed' : ''
        }`}
      >
        <div>
          <p className="eyebrow">
            {dailyCompleted
              ? 'TAGESAUFGABE ERLEDIGT'
              : 'TAGESAUFGABE'}
          </p>

          <h3>Treffe dreimal die Single 20</h3>

          <p>
            {dailyCompleted
              ? `${result?.label ?? ''} Neue Aufgabe morgen`
              : 'Du hast maximal 9 Pfeile.'}
          </p>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={openDailyChallenge}
          disabled={dailyCompleted}
        >
          {dailyCompleted ? '✓ Erledigt' : 'Starten'}
        </button>
      </section>

      {dailyOpen && (
        <div
          className="daily-modal-backdrop"
          onClick={closeDailyChallenge}
        >
          <article
            className="daily-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="daily-modal-close"
              type="button"
              onClick={closeDailyChallenge}
              aria-label="Tagesaufgabe schließen"
            >
              ×
            </button>

            <p className="eyebrow">TAGESAUFGABE</p>
            <h2>Treffe dreimal die Single 20</h2>

            {!dailyCompleted && (
              <>
                <div className="daily-task-info">
                  <span>Deine Aufgabe</span>
                  <strong>
                    Schaffe die Aufgabe mit maximal 9 Pfeilen.
                  </strong>
                </div>

                <label
                  className="daily-input-label"
                  htmlFor="daily-darts"
                >
                  Wie viele Pfeile hast du benötigt?
                </label>

                <input
                  id="daily-darts"
                  className="daily-input"
                  type="number"
                  min="1"
                  max="9"
                  inputMode="numeric"
                  placeholder="1 bis 9"
                  value={darts}
                  onChange={(event) =>
                    setDarts(event.target.value)
                  }
                />

                {result?.error && (
                  <p className="daily-error">
                    {result.message}
                  </p>
                )}

                <button
                  className="primary-button"
                  type="button"
                  onClick={evaluateDailyChallenge}
                >
                  Auswerten
                </button>

                <button
                  className="daily-failed-button"
                  type="button"
                  onClick={markAsFailed}
                >
                  Nicht geschafft
                </button>
              </>
            )}

            {dailyCompleted && !result?.error && (
              <div className="daily-result">
                <div className="daily-result-stars">
                  {result?.label}
                </div>

                <h3>
                  {result?.stars > 0
                    ? 'Tagesaufgabe abgeschlossen!'
                    : 'Heute leider nicht geschafft'}
                </h3>

                <div className="daily-rewards">
                  <span>+{result?.xp ?? 0} XP</span>
                  <span>+{result?.coins ?? 0} Quest Coins</span>
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={closeDailyChallenge}
                >
                  Weiter
                </button>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  )
}

export default Dashboard