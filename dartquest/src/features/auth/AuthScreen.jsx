import { useRef, useState } from 'react'
import logo from '../../assets/dartquest-logo.png'
import { loginProfile, registerProfile } from './profileStorage'
import './AuthScreen.css'

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const emailInputRef = useRef(null)

  function insertAtSign() {
    const input = emailInputRef.current
    const start = input?.selectionStart ?? email.length
    const end = input?.selectionEnd ?? start
    const nextEmail = `${email.slice(0, start)}@${email.slice(end)}`

    setEmail(nextEmail)

    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + 1, start + 1)
    })
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'register') {
      if (name.trim().length < 2) return setError('Der Profilname muss mindestens 2 Zeichen haben.')
      if (password.length < 6) return setError('Das Passwort muss mindestens 6 Zeichen haben.')
      if (password !== repeatPassword) return setError('Die Passwörter stimmen nicht überein.')
    }

    setBusy(true)
    try {
      if (mode === 'register') {
        const result = await registerProfile(name, email, password)
        if (result.confirmationRequired) {
          setMessage('Bitte bestätige deine E-Mail-Adresse. Danach kannst du dich anmelden.')
          setMode('login')
          setPassword('')
          setRepeatPassword('')
        } else {
          onAuthenticated(result.profile)
        }
      } else {
        onAuthenticated(await loginProfile(email, password))
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setMode((current) => current === 'login' ? 'register' : 'login')
    setError('')
    setMessage('')
    setPassword('')
    setRepeatPassword('')
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <img className="auth-logo" src={logo} alt="DartQuest" />
        <p className="auth-eyebrow">DARTQUEST ACCOUNT</p>
        <h1>{mode === 'register' ? 'Profil erstellen' : 'Willkommen zurück'}</h1>
        <p className="auth-intro">{mode === 'register' ? 'Erstelle deinen DartQuest-Account.' : 'Melde dich mit deinem DartQuest-Account an.'}</p>

        <form onSubmit={submit}>
          {mode === 'register' && <label>Profilname<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" required /></label>}
          <label>
            E-Mail
            <span className="auth-email-input">
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                inputMode="email"
                placeholder="name@beispiel.de"
                required
              />
              <button type="button" onClick={insertAtSign} aria-label="@-Zeichen einfügen">@</button>
            </span>
          </label>
          <label>Passwort<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {mode === 'register' && <label>Passwort wiederholen<input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} autoComplete="new-password" required /></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}
          <button className="auth-primary" type="submit" disabled={busy}>{busy ? 'BITTE WARTEN …' : mode === 'register' ? 'PROFIL ERSTELLEN' : 'ANMELDEN'}</button>
        </form>

        <button className="auth-secondary" type="button" onClick={switchMode}>
          {mode === 'login' ? 'NEUES PROFIL ANLEGEN' : 'BESTEHENDES PROFIL ANMELDEN'}
        </button>
        <small className="auth-note">Online-Account über Supabase Auth.</small>
      </section>
    </main>
  )
}

export default AuthScreen
