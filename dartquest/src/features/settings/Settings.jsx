import { useEffect, useRef, useState } from 'react'
import CampaignTransfer from '../profile/CampaignTransferPanel'
import { resetCurrentProfileProgress } from '../profile/progressReset'
import { requestPasswordRecovery } from '../auth/profileStorage'
import { applySettings, loadSettings, saveSettings } from './settingsStorage'
import { resetTutorialFlags } from './tutorialStorage'
import HelpContact from '../help/HelpContact'
import './Settings.css'

const APP_VERSION = import.meta.env.VITE_APP_VERSION

function Settings({ activeProfile, onBack, onOpenProfile, onLogout }) {
  const [settings, setSettings] = useState(loadSettings)
  const [message, setMessage] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [tutorialResetOpen, setTutorialResetOpen] = useState(false)
  const tutorialResetButtonRef = useRef(null)

  useEffect(() => { applySettings(settings) }, [settings])
  useEffect(() => {
    if (!tutorialResetOpen) return undefined
    const closeFromHistory = () => {
      setTutorialResetOpen(false)
      window.setTimeout(() => tutorialResetButtonRef.current?.focus(), 0)
    }
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeTutorialReset() }
    window.addEventListener('popstate', closeFromHistory)
    window.addEventListener('keydown', closeOnEscape)
    return () => { window.removeEventListener('popstate', closeFromHistory); window.removeEventListener('keydown', closeOnEscape) }
  }, [tutorialResetOpen])
  function updateSetting(name, value) { setSettings((current) => saveSettings({ ...current, [name]: value })) }

  async function sendPasswordReset() {
    if (busy) return
    setBusy(true)
    try { await requestPasswordRecovery(activeProfile.email) } catch { /* neutrale Antwort verhindert Account-Erkennung */ }
    finally { setMessage('Wenn dein Konto eine E-Mail-Adresse besitzt, wurde ein Link zum Ändern des Passworts gesendet.'); setBusy(false) }
  }

  async function resetProgress() {
    if (busy) return
    setBusy(true)
    try { await resetCurrentProfileProgress(activeProfile.id); window.location.reload() }
    catch (error) { setMessage(error.message); setResetOpen(false); setBusy(false) }
  }

  async function openPasswordHelp() {
    await sendPasswordReset()
    setHelpOpen(false)
  }

  function openTransferHelp() {
    setHelpOpen(false)
    window.setTimeout(() => document.getElementById('settings-game-transfer')?.scrollIntoView({ block: 'start' }), 0)
  }

  function resetTutorials() {
    resetTutorialFlags(activeProfile.id)
    setMessage('Die Bedienhinweise erscheinen beim nächsten Öffnen von Level 1 erneut.')
    closeTutorialReset()
  }

  function requestTutorialReset() {
    window.history.pushState({ dartQuestOverlay: 'tutorial-reset' }, '')
    setTutorialResetOpen(true)
  }

  function closeTutorialReset() {
    if (window.history.state?.dartQuestOverlay === 'tutorial-reset') window.history.back()
    else {
      setTutorialResetOpen(false)
      window.setTimeout(() => tutorialResetButtonRef.current?.focus(), 0)
    }
  }

  if (helpOpen) return <HelpContact onBack={() => setHelpOpen(false)} onPasswordHelp={openPasswordHelp} onTransferHelp={openTransferHelp} />

  return <main className="settings-screen">
    <header className="settings-header"><button type="button" onClick={onBack} aria-label="Zurück">‹</button><div><span>DARTQUEST</span><h1>EINSTELLUNGEN</h1></div></header>
    {message && <p className="settings-message" role="status" aria-live="polite">{message}</p>}

    <section className="settings-section"><div className="settings-section-heading"><span aria-hidden="true">⚙</span><div><p>ALLGEMEIN</p><h2>Darstellung &amp; Gerät</h2></div></div><div className="settings-list">
      <label><span><strong>Sound</strong><small>Vorhandene Spielsounds steuern</small></span><input type="checkbox" checked={settings.sound} onChange={(event) => updateSetting('sound', event.target.checked)} /></label>
      <label><span><strong>Animationen</strong><small>Reduzierte Systembewegung wird respektiert</small></span><select value={settings.animations} onChange={(event) => updateSetting('animations', event.target.value)}><option value="full">Vollständig</option><option value="reduced">Reduziert</option><option value="off">Aus</option></select></label>
      <label><span><strong>Haptisches Feedback</strong><small>Nur auf unterstützten Geräten</small></span><input type="checkbox" checked={settings.haptics} onChange={(event) => updateSetting('haptics', event.target.checked)} /></label>
      <div className="settings-row"><span><strong>Benachrichtigungen</strong><small>Push-Benachrichtigungen</small></span><em>Demnächst</em></div>
    </div></section>

    <section className="settings-section"><div className="settings-section-heading"><span aria-hidden="true">🎯</span><div><p>SPIEL &amp; BEDIENUNG</p><h2>Eingabe</h2></div></div><div className="settings-list">
      <label><span><strong>Eingabemodus</strong><small>Standard für neue Levelversuche</small></span><select value={settings.inputMode} onChange={(event) => updateSetting('inputMode', event.target.value)}><option value="counter">Trefferzähler</option><option value="quick">Schnelleingabe</option></select></label>
    </div></section>

    <section className="settings-section"><div className="settings-section-heading"><span aria-hidden="true">i</span><div><p>TUTORIALS &amp; HINWEISE</p><h2>Vorhandene Hinweise</h2></div></div><div className="settings-list"><button ref={tutorialResetButtonRef} type="button" onClick={requestTutorialReset}><span><strong>Bedienhinweise zurücksetzen</strong><small>Den Eingabemodus-Hinweis in Level 1 erneut anzeigen</small></span><b>›</b></button></div></section>

    <section className="settings-section" id="settings-game-transfer"><div className="settings-section-heading"><span aria-hidden="true">↔</span><div><p>SPIELSTAND &amp; GERÄTE</p><h2>Fortschritt verwalten</h2></div></div><CampaignTransfer accountId={activeProfile.id} onMessage={setMessage} /><button className="settings-danger-row" type="button" onClick={() => setResetOpen(true)}>Fortschritt zurücksetzen</button></section>

    <section className="settings-section"><div className="settings-section-heading"><span aria-hidden="true">♙</span><div><p>KONTO &amp; DATENSCHUTZ</p><h2>Account</h2></div></div><div className="settings-list">
      <button type="button" onClick={onOpenProfile}><span><strong>Profil öffnen</strong><small>Profilbild, Statistiken und Konto löschen</small></span><b>›</b></button>
      <button type="button" disabled={busy} onClick={sendPasswordReset}><span><strong>Passwort ändern</strong><small>Sicheren Reset-Link per E-Mail senden</small></span><b>›</b></button>
      <button type="button" onClick={onLogout}><span><strong>Abmelden</strong><small>Diese Sitzung beenden</small></span><b>›</b></button>
      <div className="settings-row"><span><strong>Datenschutz · Impressum · Nutzungsbedingungen</strong><small>Rechtliche Seiten sind noch nicht hinterlegt</small></span><em>Demnächst</em></div>
    </div></section>

    <section className="settings-section"><div className="settings-section-heading"><span aria-hidden="true">?</span><div><p>HILFE</p><h2>Support</h2></div></div><div className="settings-list"><button type="button" onClick={() => setHelpOpen(true)}><span><strong>Hilfe &amp; Kontakt</strong><small>FAQ und Kontaktmöglichkeit</small></span><b>›</b></button></div></section>
    <footer className="settings-version">DartQuest v{APP_VERSION}</footer>
    {resetOpen && <div className="settings-confirm-backdrop" onClick={() => !busy && setResetOpen(false)}><section role="alertdialog" aria-modal="true" aria-labelledby="settings-reset-title" onClick={(event) => event.stopPropagation()}><h2 id="settings-reset-title">Fortschritt wirklich zurücksetzen?</h2><p>Diese Aktion kann nicht rückgängig gemacht werden.</p><button type="button" disabled={busy} onClick={() => setResetOpen(false)}>ABBRECHEN</button><button className="danger" type="button" disabled={busy} onClick={resetProgress}>{busy ? 'BITTE WARTEN …' : 'FORTSCHRITT ZURÜCKSETZEN'}</button></section></div>}
    {tutorialResetOpen && <div className="settings-confirm-backdrop" onClick={closeTutorialReset}><section role="alertdialog" aria-modal="true" aria-labelledby="tutorial-reset-title" onClick={(event) => event.stopPropagation()}><h2 id="tutorial-reset-title">Tutorial wirklich erneut starten?</h2><p>Dein Level-, Sterne-, XP- und Coin-Fortschritt bleibt erhalten.</p><button autoFocus type="button" onClick={closeTutorialReset}>ABBRECHEN</button><button className="danger" type="button" onClick={resetTutorials}>ZURÜCKSETZEN</button></section></div>}
  </main>
}

export default Settings
