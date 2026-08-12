import { useState } from 'react'
import {
  authenticateProfile,
  createProfile,
  getProfiles,
} from '../auth/profileStorage'
import './Profile.css'

function Profile({ activeProfile, onProfileChanged, onLogout }) {
  const [view, setView] = useState('main')
  const [profiles, setProfiles] = useState(getProfiles)
  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
        <section className="profile-card">
          <div className="profile-avatar">{activeProfile.name.slice(0, 1).toUpperCase()}</div>
          <p>AKTIVES PROFIL</p><h2>{activeProfile.name}</h2>
          <div className="profile-stats"><span>XP <strong>{activeProfile.xp ?? 0}</strong></span><span>Coins <strong>{activeProfile.coins ?? 0}</strong></span></div>
          <button className="profile-primary" type="button" onClick={() => { setView('switch'); setError('') }}>PROFIL WECHSELN</button>
          <button className="profile-secondary" type="button" onClick={() => { setView('create'); setError('') }}>NEUES PROFIL</button>
          <button className="profile-logout" type="button" onClick={onLogout}>ABMELDEN</button>
        </section>
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
