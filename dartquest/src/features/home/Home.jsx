import logo from '../../assets/dartquest-logo.png'

import './Home.css'

function Home({
  activeProfile,
  onContinueCampaign,
  onOpenSingleplayer,
  onOpenMultiplayer,
}) {
  const xp = Number(activeProfile?.xp) || 0
  const coins = Number(activeProfile?.coins) || 0
  const xpPerLevel = 500
  const playerLevel = Math.floor(xp / xpPerLevel) + 1
  const levelXP = xp % xpPerLevel
  const xpPercent = Math.min((levelXP / xpPerLevel) * 100, 100)

  return (
    <section className="home-screen">
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
      </header>
      <main className="home-main">

        <section className="home-player-card">
          <div className="home-avatar">
            {activeProfile?.name?.slice(0, 1).toUpperCase() || '👤'}
          </div>
          <div className="home-player-copy">
            <span>WILLKOMMEN ZURÜCK</span>
            <h1>{activeProfile?.name || 'Spieler'}</h1>
            <p>Bereit für die nächste Runde?</p>
          </div>
          <div className="home-level-badge"><span>LVL</span><strong>{playerLevel}</strong></div>
          <div className="home-player-progress">
            <div className="home-xp-row"><span>XP</span><strong>{levelXP} / {xpPerLevel}</strong></div>
            <div className="home-xp-bar"><div className="home-xp-fill" style={{ width: `${xpPercent}%` }} /></div>
          </div>
          <div className="home-coins">🪙 <strong>{coins}</strong> Coins</div>
        </section>

        <button
          className="home-campaign-card"
          type="button"
          onClick={onContinueCampaign}
        >
          <div className="home-card-icon">🎯</div>
          <div className="home-card-content">
            <span>DEINE KAMPAGNE</span>
            <strong>Persönliche Kampagne</strong>
            <small>Kehre direkt zu deinem aktuellen Fortschritt zurück</small>
            <b>WEITERSPIELEN <i>›</i></b>
          </div>
        </button>

        <div className="home-mode-grid">
          <button
            className="home-mode-card"
            type="button"
            onClick={onOpenSingleplayer}
          >
            <div className="home-mode-icon">👤</div>
            <strong>Einzelspieler</strong>
            <span>🎯 Training</span>
            <span>🎮 Standardspiele</span>
            <span>🗺 Kampagne</span>
            <div className="home-mode-arrow">›</div>
          </button>
          <button
            className="home-mode-card"
            type="button"
            onClick={onOpenMultiplayer}
          >
            <div className="home-mode-icon">👥</div>
            <strong>Mehrspieler</strong>
            <span>👥 2–4 Spieler</span>
            <span>⚔ Koop &amp; gegeneinander</span>
            <div className="home-mode-arrow">›</div>
          </button>
        </div>
      </main>
    </section>
  )
}

export default Home
