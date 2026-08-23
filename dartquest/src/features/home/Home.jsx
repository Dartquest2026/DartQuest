import { useState } from 'react'
import logo from '../../assets/dartquest-logo.png'
import { XP_PER_PLAYER_LEVEL } from '../auth/profileStorage'
import { NewBadge, useNewFeatures, useVisibleFeature } from '../releases/NewFeatures'
import PlayerAvatar from '../../shared/components/PlayerAvatar'
import CardCollection from '../cards/CardCollection'

import './Home.css'

const APP_VERSION = import.meta.env.VITE_APP_VERSION

function Home({
  activeProfile,
  onContinueCampaign,
  onOpenSingleplayer,
  onOpenMultiplayer,
  onOpenProfile,
  onOpenSettings,
  onSpendCoins,
}) {
  const { markSeen } = useNewFeatures()
  const versionRef = useVisibleFeature('version-display')
  const [homeView, setHomeView] = useState('home')
  const xp = Number(activeProfile?.xp) || 0
  const coins = Number(activeProfile?.coins) || 0
  const playerLevel = Number(activeProfile?.playerLevel) || 1
  const levelXP = xp % XP_PER_PLAYER_LEVEL
  const nextLevelXP = playerLevel * XP_PER_PLAYER_LEVEL
  const xpPercent = Math.min((levelXP / XP_PER_PLAYER_LEVEL) * 100, 100)

  if (homeView === 'season') {
    return (
      <section className="home-screen home-season-screen">
        <header className="home-season-header">
          <button type="button" onClick={() => setHomeView('home')} aria-label="Zurück zur Home-Seite">‹</button>
          <div><span>DARTQUEST</span><h1>SAISONALE AUFGABEN</h1></div>
        </header>
        <section className="home-season-placeholder">
          <span aria-hidden="true">🎯</span>
          <h2>Saisonale Herausforderungen kommen bald.</h2>
          <p>Spiele DartQuest und erfülle zusätzliche Herausforderungen, um besondere Belohnungen freizuschalten.</p>
        </section>
      </section>
    )
  }

  if (homeView === 'cards') return <CardCollection activeProfile={activeProfile} onSpendCoins={onSpendCoins} onBack={() => setHomeView('home')} />

  return (
    <section className="home-screen">
      <header className="home-header">
        <button
          className="home-menu-button"
          type="button"
          aria-label="Menü öffnen"
          onClick={onOpenSettings}
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

        <button type="button" className="home-player-card" onClick={onOpenProfile} aria-label="Spielerprofil öffnen">
          <PlayerAvatar className="home-avatar" name={activeProfile?.name} avatarPath={activeProfile?.avatarPath} />
          <div className="home-player-copy">
            <span>WILLKOMMEN ZURÜCK</span>
            <h1>{activeProfile?.name || 'Spieler'}</h1>
            <p>Bereit für die nächste Runde?</p>
          </div>
          <div className="home-level-badge"><span>LVL</span><strong>{playerLevel}</strong></div>
          <div className="home-player-progress">
            <div className="home-xp-row"><span>XP</span><strong>{xp.toLocaleString('de-DE')} / {nextLevelXP.toLocaleString('de-DE')}</strong></div>
            <div className="home-xp-bar"><div className="home-xp-fill" style={{ width: `${xpPercent}%` }} /></div>
          </div>
          <div className="home-coins">🪙 <strong>{coins}</strong> Coins</div>
        </button>

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

        <button className="home-season-card" type="button" onClick={() => setHomeView('season')}>
          <span className="home-season-icon" aria-hidden="true">🎯</span>
          <span className="home-season-copy"><small>SAISONALE AUFGABEN</small><strong>Aktuelle Saison</strong><em>Schließe Aufgaben ab und sichere dir Belohnungen.</em></span>
          <span className="home-season-arrow" aria-hidden="true">›</span>
        </button>

        <div className="home-options-grid">
          <button className="home-settings-card" type="button" onClick={() => { markSeen('settings-home-entry'); onOpenSettings() }}>
            <span aria-hidden="true">⚙</span>
            <strong>Einstellungen <NewBadge featureId="settings-home-entry" /></strong>
            <small>Sound, Bedienung &amp; Geräte</small>
          </button>
          <button className="home-settings-card" type="button" onClick={() => setHomeView('cards')}>
            <span aria-hidden="true">🎴</span><strong>Sammelkarten</strong><small>Sammlung &amp; Kartenpakete</small>
          </button>
        </div>
      </main>
      <footer ref={versionRef} className="home-version" aria-label={`DartQuest Version ${APP_VERSION}`}>
        v{APP_VERSION} <NewBadge featureId="version-display" />
      </footer>
    </section>
  )
}

export default Home
