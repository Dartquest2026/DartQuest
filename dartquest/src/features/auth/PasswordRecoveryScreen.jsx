import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/dartquest-logo.png'
import { finishPasswordRecovery } from './profileStorage'
import { validateNewPassword } from './passwordRecovery'
import './AuthScreen.css'

function PasswordRecoveryScreen({ status, onBackToLogin }) {
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const passwordRef = useRef(null)

  useEffect(() => {
    if (status === 'ready') passwordRef.current?.focus()
  }, [status])

  async function submit(event) {
    event.preventDefault()
    if (busy || status !== 'ready') return
    const validationError = validateNewPassword(password, repeatPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    setBusy(true)
    setError('')
    try {
      await finishPasswordRecovery(password)
      onBackToLogin('Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <img className="auth-logo" src={logo} alt="DartQuest" />
        <p className="auth-eyebrow">PASSWORT-WIEDERHERSTELLUNG</p>
        <h1>Neues Passwort setzen</h1>

        {status === 'checking' && <p className="auth-intro" role="status">Recovery-Link wird geprüft …</p>}

        {status === 'invalid' && (
          <>
            <p className="auth-error" role="alert" aria-live="assertive">
              Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet. Fordere bitte einen neuen Link an.
            </p>
            <button className="auth-secondary" type="button" onClick={() => onBackToLogin('')}>
              ZURÜCK ZUR ANMELDUNG
            </button>
          </>
        )}

        {status === 'ready' && (
          <>
            <p className="auth-intro">Lege ein neues Passwort für deinen DartQuest-Account fest.</p>
            <form onSubmit={submit}>
              <label>
                Neues Passwort
                <input ref={passwordRef} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
              </label>
              <label>
                Neues Passwort wiederholen
                <input type={showPassword ? 'text' : 'password'} value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} autoComplete="new-password" required />
              </label>
              <label className="auth-password-toggle">
                <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
                <span>Passwort anzeigen</span>
              </label>
              {error && <p className="auth-error" role="alert" aria-live="assertive">{error}</p>}
              <button className="auth-primary" type="submit" disabled={busy}>
                {busy ? 'PASSWORT WIRD GEÄNDERT …' : 'PASSWORT ÄNDERN'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}

export default PasswordRecoveryScreen
