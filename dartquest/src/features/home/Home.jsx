import logo from '../../assets/dartquest-logo.png'

import './Home.css'

function Home({
  onStartCampaign,
  onOpenSingleplayer,
  onOpenMultiplayer,
}) {
  function resetProgress() {
    const confirmed = window.confirm(
      'Fortschritt wirklich komplett zurücksetzen?',
    )

    if (!confirmed) {
      return
    }

    localStorage.removeItem(
      'dartquest-campaign-progress',
    )

    window.location.reload()
  }

  return (
    <section className="home-screen">

      {/* HEADER */}

      <header className="home-header">

        <button
          className="home-menu-button"
          type="button"
          aria-label="Menü öffnen"
        >
          ☰
        </button>

        <div className="home-logo-wrap">
          <img
            src={logo}
            alt="DartQuest"
            className="home-logo"
          />
        </div>

        <div className="home-player-info">

          <div className="home-level-badge">
            <span>LVL</span>
            <strong>1</strong>
          </div>

          <div className="home-xp-area">

            <div className="home-xp-row">
              <span>XP</span>
              <strong>0 / 500</strong>
            </div>

            <div className="home-xp-bar">
              <div
                className="home-xp-fill"
                style={{
                  width: '0%',
                }}
              />
            </div>

            <div className="home-coins">
              🪙 0
            </div>

          </div>

        </div>

      </header>


      {/* STARTBEREICH */}

      <main className="home-main">

        <section className="home-welcome">

          <span className="home-eyebrow">
            DARTQUEST
          </span>

          <h1>
            Bereit für die nächste Runde?
          </h1>

          <p>
            Setze deine Kampagne fort
            oder starte einen neuen Spielmodus.
          </p>

        </section>


        {/* KAMPAGNE */}

        <button
          className="home-campaign-card"
          type="button"
          onClick={onStartCampaign}
        >

          <div className="home-card-icon">
            🗺️
          </div>

          <div className="home-card-content">

            <span>
              KAMPAGNE
            </span>

            <strong>
              Kampagne fortsetzen
            </strong>

            <small>
              Kehre direkt zu deinem
              aktuellen Fortschritt zurück
            </small>

          </div>

          <div className="home-card-arrow">
            ›
          </div>

        </button>


        {/* ZWEI HAUPTMODI */}

        <div className="home-mode-grid">

          <button
            className="home-mode-card"
            type="button"
            onClick={onOpenSingleplayer}
          >

            <div className="home-mode-icon">
              👤
            </div>

            <strong>
              Einzelspieler
            </strong>

            <span>
              Kampagne, Training
              & Standardspiele
            </span>

            <div className="home-mode-arrow">
              ›
            </div>

          </button>


          <button
            className="home-mode-card"
            type="button"
            onClick={onOpenMultiplayer}
          >

            <div className="home-mode-icon">
              👥
            </div>

            <strong>
              Mehrspieler
            </strong>

            <span>
              2–4 Spieler,
              Koop & gegeneinander
            </span>

            <div className="home-mode-arrow">
              ›
            </div>

          </button>

        </div>


        {/* RESET */}

        <button
          className="dev-reset-button"
          type="button"
          onClick={resetProgress}
        >
          🗑 Fortschritt zurücksetzen
        </button>

      </main>

    </section>
  )
}

export default Home