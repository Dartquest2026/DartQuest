import { useMemo, useState } from 'react'
import { CONTACT_TOPICS, HELP_FAQS } from './helpData'
import { createMailtoUrl, createSupportMessage, getPlatformSummary, isValidOptionalEmail, SUPPORT_EMAIL } from './supportContact'
import './HelpContact.css'

const APP_VERSION = import.meta.env.VITE_APP_VERSION

function HelpContact({ onBack, onPasswordHelp, onTransferHelp }) {
  const [openFaq, setOpenFaq] = useState(null)
  const [topic, setTopic] = useState(CONTACT_TOPICS[0])
  const [message, setMessage] = useState('')
  const [replyEmail, setReplyEmail] = useState('')
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const platform = useMemo(() => getPlatformSummary(), [])
  const body = createSupportMessage({ topic, message, replyEmail, appVersion: APP_VERSION, platform })
  const mailto = createMailtoUrl(SUPPORT_EMAIL, `DartQuest Hilfe: ${topic}`, body)

  function checkForm(event) {
    event.preventDefault()
    if (!message.trim()) return setError('Bitte beschreibe dein Anliegen.')
    if (!isValidOptionalEmail(replyEmail)) return setError('Bitte gib eine gültige Rückantwort-E-Mail ein oder lasse das Feld leer.')
    setError('')
    setPreview(true)
  }

  function openMailClient() {
    if (!mailto || sending) return
    setSending(true)
    window.location.assign(mailto)
    window.setTimeout(() => setSending(false), 1000)
  }

  return <main className="help-screen">
    <header className="settings-header"><button type="button" onClick={onBack} aria-label="Zurück zu Einstellungen">‹</button><div><span>DARTQUEST</span><h1>HILFE &amp; KONTAKT</h1></div></header>
    <section className="help-intro"><h2>Wie können wir helfen?</h2><p>Hier findest du kurze Antworten zu Account, Spielstand und Kampagne.</p></section>
    <section className="help-section"><p className="help-kicker">HÄUFIGE FRAGEN</p><div className="help-faqs">{HELP_FAQS.map((faq) => <article key={faq.id}><button type="button" aria-expanded={openFaq === faq.id} onClick={() => setOpenFaq((current) => current === faq.id ? null : faq.id)}><span>{faq.question}</span><b>{openFaq === faq.id ? '−' : '+'}</b></button>{openFaq === faq.id && <div><p>{faq.answer}</p>{faq.action === 'password' && <button type="button" onClick={onPasswordHelp}>{faq.actionLabel}</button>}{faq.action === 'transfer' && <button type="button" onClick={onTransferHelp}>{faq.actionLabel}</button>}</div>}</article>)}</div></section>
    <section className="help-section"><p className="help-kicker">KONTAKT</p><h2>Nachricht vorbereiten</h2><p className="help-warning">Bitte sende niemals dein Passwort oder andere Zugangsdaten.</p><form onSubmit={checkForm}>
      <label>Thema<select value={topic} onChange={(event) => setTopic(event.target.value)}>{CONTACT_TOPICS.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Nachricht<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows="6" maxLength="3000" required /></label>
      <label>Rückantwort-E-Mail <small>(optional)</small><input type="email" value={replyEmail} onChange={(event) => setReplyEmail(event.target.value)} autoComplete="email" /></label>
      <div className="help-metadata"><span>DartQuest v{APP_VERSION}</span><span>{platform}</span></div>
      {error && <p className="help-error" role="alert" aria-live="assertive">{error}</p>}
      <button className="help-primary" type="submit">NACHRICHT PRÜFEN</button>
    </form></section>
    {preview && <div className="help-preview-backdrop" onClick={() => setPreview(false)}><section role="dialog" aria-modal="true" aria-labelledby="help-preview-title" onClick={(event) => event.stopPropagation()}><h2 id="help-preview-title">Nachricht prüfen</h2><pre>{body}</pre>{!SUPPORT_EMAIL && <p className="help-error">Der Kontaktversand ist noch nicht verfügbar, weil keine Supportadresse konfiguriert ist.</p>}<button type="button" onClick={() => setPreview(false)}>ZURÜCK ZUM BEARBEITEN</button><button className="help-primary" type="button" disabled={!mailto || sending} onClick={openMailClient}>{sending ? 'E-MAIL WIRD GEÖFFNET …' : 'E-MAIL-PROGRAMM ÖFFNEN'}</button></section></div>}
  </main>
}

export default HelpContact
