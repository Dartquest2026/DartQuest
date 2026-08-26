import { useState } from 'react'
import StandardGame from '../standardGames/StandardGame'
import './Singleplayer.css'

const modes = [
  {
    id: 'campaign',
    icon: '🗺️',
    title: 'Kampagne',
    description:
      'Setze deinen persönlichen Fortschritt fort',
  },
  {
    id: 'training',
    visible: false,
    icon: '🎯',
    title: 'Training',
    description:
      'Verbessere gezielt deine Fähigkeiten',
  },
  {
    id: 'standard',
    visible: false,
    icon: '🎮',
    title: 'Standardspiele',
    description:
      '501 mit Double Out',
  },
]

function Singleplayer({
  onBack,
  onOpenCampaign,
  activeProfile,
}) {
  const [standardOpen, setStandardOpen] = useState(false)

  function openMode(modeId) {
    if (modeId === 'campaign') {
      onOpenCampaign?.()
    }
    if (modeId === 'standard') setStandardOpen(true)
  }

  if (standardOpen) return <StandardGame initialPlayers={[activeProfile?.name || 'Spieler 1']} activeProfile={activeProfile} onBack={() => setStandardOpen(false)} />

  return (
    <main className="singleplayer-screen">

      <header className="singleplayer-header">

        <button
          type="button"
          className="singleplayer-back"
          onClick={onBack}
          aria-label="Zurück zur Startseite"
        >
          &lsaquo;
        </button>

        <div>
          <span className="singleplayer-eyebrow">
            DARTQUEST
          </span>

          <h1>Einzelspieler</h1>
        </div>

      </header>

      <section className="singleplayer-intro">

        <div className="singleplayer-intro-icon">
          👤
        </div>

        <h2>Was möchtest du spielen?</h2>

        <p>Wähle deinen Spielmodus.</p>

      </section>

      <section className="singleplayer-mode-grid">

        {modes.filter((mode) => mode.visible !== false).map((mode) => (
          <button
            key={mode.id}
            type="button"
            className="singleplayer-mode-card"
            onClick={() => openMode(mode.id)}
          >

            <span className="singleplayer-mode-icon">
              {mode.icon}
            </span>

            <span className="singleplayer-mode-content">
              <strong>{mode.title}</strong>
              <small>{mode.description}</small>
            </span>

            <span className="singleplayer-mode-arrow">
              &rsaquo;
            </span>

          </button>
        ))}

      </section>

    </main>
  )
}

export default Singleplayer
