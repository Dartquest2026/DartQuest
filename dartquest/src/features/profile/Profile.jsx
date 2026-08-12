import { useState } from 'react'
import { resetCurrentProfileProgress } from './progressReset'
import './Profile.css'

function Profile({ activeProfile, onLogout }) {
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirmProgressReset() {
    setBusy(true)
    setError('')
    try {
      await resetCurrentProfileProgress(activeProfile.id)
      setResetModalOpen(false)
      window.location.reload()
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="profile-screen">
      <header><span>DARTQUEST</span><h1>Profil</h1></header>

      <section className="profile-card">
        <div className="profile-avatar">{activeProfile.name.slice(0, 1).toUpperCase()}</div>
        <p>AKTIVES PROFIL</p>
        <h2>{activeProfile.name}</h2>
        {activeProfile.email && <p>{activeProfile.email}</p>}
        <div className="profile-stats">
          <span>LVL <strong>{activeProfile.playerLevel ?? 1}</strong></span>
          <span>XP <strong>{activeProfile.xp ?? 0}</strong></span>
          <span>Coins <strong>{activeProfile.coins ?? 0}</strong></span>
        </div>
        <button className="profile-logout" type="button" onClick={onLogout}>ABMELDEN</button>
      </section>

      <section className="profile-data-card">
        <p>DATEN &amp; FORTSCHRITT</p>
        <button type="button" onClick={() => setResetModalOpen(true)}>
          <span>⚠</span>
          <span><strong>Fortschritt zurücksetzen</strong><small>Lokalen Kampagnenfortschritt sowie Profil-XP und Coins zurücksetzen</small></span>
        </button>
      </section>

      <section className="profile-account-card">
        <p>KONTO &amp; PROFIL</p>
        <div className="profile-account-notice">
          <span>🔒</span>
          <span><strong>ACCOUNT LÖSCHEN</strong><small>Die vollständige Account-Löschung benötigt eine sichere serverseitige Funktion und ist derzeit noch nicht verfügbar.</small></span>
        </div>
      </section>

      {resetModalOpen && (
        <div className="profile-reset-backdrop" onClick={() => !busy && setResetModalOpen(false)}>
          <section className="profile-reset-modal" role="dialog" aria-modal="true" aria-labelledby="profile-reset-title" onClick={(event) => event.stopPropagation()}>
            <div className="profile-reset-icon">⚠</div>
            <h2 id="profile-reset-title">Fortschritt wirklich zurücksetzen?</h2>
            <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            {error && <p className="profile-error">{error}</p>}
            <button className="profile-reset-cancel" type="button" disabled={busy} onClick={() => setResetModalOpen(false)}>ABBRECHEN</button>
            <button className="profile-reset-confirm" type="button" disabled={busy} onClick={confirmProgressReset}>FORTSCHRITT ZURÜCKSETZEN</button>
          </section>
        </div>
      )}
    </main>
  )
}

export default Profile
