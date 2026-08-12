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
    icon: '🎯',
    title: 'Training',
    description:
      'Verbessere gezielt deine Fähigkeiten',
  },
  {
    id: 'standard',
    icon: '🎮',
    title: 'Standardspiele',
    description:
      '501 und weitere Dartspiele',
  },
]

function Singleplayer({
  onBack,
  onOpenCampaign,
}) {
  function openMode(modeId) {
    if (modeId === 'campaign') {
      onOpenCampaign?.()
    }
  }

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

        {modes.map((mode) => (
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
