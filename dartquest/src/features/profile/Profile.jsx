import { useState } from 'react'
import {
  authenticateProfile,
  createProfile,
  getProfiles,
} from '../auth/profileStorage'
import { resetCurrentProfileProgress } from './progressReset'
import './Profile.css'

function Profile({ activeProfile, onProfileChanged, onLogout, onOpenLeaderboard }) {
  const [view, setView] = useState('main')
  const [profiles, setProfiles] = useState(getProfiles)
  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  function confirmProgressReset() {
    resetCurrentProfileProgress(activeProfile.id)
    setResetModalOpen(false)
    window.location.reload()
  }

  async function switchProfile(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const profile = await authenticateProfile(selectedId, password)
    setBusy(false)
    if (!profile) return setError('Profilname oder Passwort ist falsch.')
    onProfileChanged(profile)
    setView('main')
    setPassword('')
  }

  async function addProfile(event) {
    event.preventDefault()
    setError('')
    if (name.trim().length < 2) return setError('Der Profilname muss mindestens 2 Zeichen haben.')
    if (password.length < 4) return setError('Das Passwort muss mindestens 4 Zeichen haben.')
    if (password !== repeatPassword) return setError('Die Passwörter stimmen nicht überein.')
    setBusy(true)
    try {
      const profile = await createProfile(name, password)
      setProfiles(getProfiles())
      onProfileChanged(profile)
      setView('main')
      setName(''); setPassword(''); setRepeatPassword('')
    } catch (creationError) {
      setError(creationError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="profile-screen">
      <header><span>DARTQUEST</span><h1>Profil</h1></header>

      {view === 'main' && (
        <>
        <section className="profile-card">
          <div className="profile-avatar">{activeProfile.name.slice(0, 1).toUpperCase()}</div>
          <p>AKTIVES PROFIL</p><h2>{activeProfile.name}</h2>
          <div className="profile-stats"><span>XP <strong>{activeProfile.xp ?? 0}</strong></span><span>Coins <strong>{activeProfile.coins ?? 0}</strong></span></div>
          <button className="profile-primary" type="button" onClick={() => { setView('switch'); setError('') }}>PROFIL WECHSELN</button>
          <button className="profile-leaderboard" type="button" onClick={onOpenLeaderboard}>🏆 RANGLISTE</button>
          <button className="profile-secondary" type="button" onClick={() => { setView('create'); setError('') }}>NEUES PROFIL</button>
          <button className="profile-logout" type="button" onClick={onLogout}>ABMELDEN</button>
        </section>

        <section className="profile-data-card">
          <p>DATEN &amp; FORTSCHRITT</p>
          <button type="button" onClick={() => setResetModalOpen(true)}>
            <span>⚠</span>
            <span><strong>Fortschritt zurücksetzen</strong><small>Kampagnenfortschritt, Sterne, XP und Coins zurücksetzen</small></span>
          </button>
        </section>
        </>
      )}

      {resetModalOpen && (
        <div className="profile-reset-backdrop" onClick={() => setResetModalOpen(false)}>
          <section className="profile-reset-modal" role="dialog" aria-modal="true" aria-labelledby="profile-reset-title" onClick={(event) => event.stopPropagation()}>
            <div className="profile-reset-icon">⚠</div>
            <h2 id="profile-reset-title">Fortschritt wirklich zurücksetzen?</h2>
            <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <ul>
              <li>Singleplayer-Kampagnenfortschritt und Sterne</li>
              <li>Singleplayer-Schwierigkeitsauswahl</li>
              <li>Tagesaufgaben-Fortschritt</li>
              <li>XP und Coins des aktiven Profils</li>
            </ul>
            <button className="profile-reset-cancel" type="button" onClick={() => setResetModalOpen(false)}>ABBRECHEN</button>
            <button className="profile-reset-confirm" type="button" onClick={confirmProgressReset}>FORTSCHRITT ZURÜCKSETZEN</button>
          </section>
        </div>
      )}

      {view === 'switch' && (
        <section className="profile-card">
          <h2>Profil wechseln</h2><p>Wähle ein lokales Profil und gib das Passwort ein.</p>
          <form onSubmit={switchProfile}>
            <div className="profile-list">
              {profiles.map((profile) => (
                <button key={profile.id} className={selectedId === profile.id ? 'selected' : ''} type="button" onClick={() => setSelectedId(profile.id)}>
                  <b>{profile.name.slice(0, 1).toUpperCase()}</b><span>{profile.name}</span>
                </button>
              ))}
            </div>
            <label>Passwort<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {error && <p className="profile-error">{error}</p>}
            <button className="profile-primary" disabled={!selectedId || busy}>ANMELDEN</button>
          </form>
          <button className="profile-secondary" type="button" onClick={() => setView('main')}>ZURÜCK</button>
        </section>
      )}

      {view === 'create' && (
        <section className="profile-card">
          <h2>Neues Profil</h2>
          <form onSubmit={addProfile}>
            <label>Profilname<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Passwort<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label>Passwort wiederholen<input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} /></label>
            {error && <p className="profile-error">{error}</p>}
            <button className="profile-primary" disabled={busy}>PROFIL ERSTELLEN</button>
          </form>
          <button className="profile-secondary" type="button" onClick={() => setView('main')}>ZURÜCK</button>
        </section>
      )}
    </main>
  )
}

export default Profile
