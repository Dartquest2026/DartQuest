import { useState } from 'react'
import CampaignTransfer from '../profile/CampaignTransferPanel'
import './Settings.css'

const APP_VERSION = import.meta.env.VITE_APP_VERSION

function Settings({ activeProfile, onBack }) {
  const [message, setMessage] = useState('')

  return (
    <main className="settings-screen">
      <header className="settings-header">
        <button type="button" onClick={onBack} aria-label="Zurück zur Home-Seite">‹</button>
        <div>
          <span>DARTQUEST</span>
          <h1>EINSTELLUNGEN</h1>
        </div>
      </header>

      {message && <p className="settings-message" role="status">{message}</p>}

      <section className="settings-section">
        <div className="settings-section-heading">
          <span aria-hidden="true">↔</span>
          <div>
            <p>SPIELSTAND &amp; GERÄTE</p>
            <h2>Spielstand auf anderes Gerät übertragen</h2>
          </div>
        </div>
        <CampaignTransfer accountId={activeProfile.id} onMessage={setMessage} />
      </section>

      <footer className="settings-version">DartQuest v{APP_VERSION}</footer>
    </main>
  )
}

export default Settings
