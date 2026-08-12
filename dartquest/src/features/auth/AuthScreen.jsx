import { useState } from 'react'
import logo from '../../assets/dartquest-logo.png'
import { authenticateProfile, createProfile, getProfiles } from './profileStorage'
import './AuthScreen.css'

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState(() => getProfiles().length ? 'login' : 'register')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const hasProfiles = getProfiles().length > 0

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (mode === 'register') {
      if (name.trim().length < 2) return setError('Der Profilname muss mindestens 2 Zeichen haben.')
      if (password.length < 4) return setError('Das Passwort muss mindestens 4 Zeichen haben.')
      if (password !== repeatPassword) return setError('Die Passwörter stimmen nicht überein.')
    }

    setBusy(true)
    try {
      const profile = mode === 'register'
        ? await createProfile(name, password)
        : await authenticateProfile(name, password)

      if (!profile) setError('Profilname oder Passwort ist falsch.')
      else onAuthenticated(profile)
    } catch (submitError) {
      setError(submitError.message || 'Das Profil konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <img className="auth-logo" src={logo} alt="DartQuest" />
        <p className="auth-eyebrow">LOKALES PROFIL</p>
        <h1>{mode === 'register' ? 'Profil erstellen' : 'Willkommen zurück'}</h1>
        <p className="auth-intro">
          {mode === 'register'
            ? 'Erstelle dein Profil für dieses Gerät.'
            : 'Melde dich mit deinem lokalen Profil an.'}
        </p>

        <form onSubmit={submit}>
          <label>Profilname<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" /></label>
          <label>Passwort<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {mode === 'register' && (
            <label>Passwort wiederholen<input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} autoComplete="new-password" /></label>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-primary" type="submit" disabled={busy}>
            {busy ? 'BITTE WARTEN …' : mode === 'register' ? 'PROFIL ERSTELLEN' : 'ANMELDEN'}
          </button>
        </form>

        {hasProfiles && (
          <button className="auth-secondary" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'WEITERES PROFIL ERSTELLEN' : 'ZUR ANMELDUNG'}
          </button>
        )}
        <small className="auth-note">Nur lokal auf diesem Gerät – kein Online-Konto.</small>
      </section>
    </main>
  )
}

export default AuthScreen
