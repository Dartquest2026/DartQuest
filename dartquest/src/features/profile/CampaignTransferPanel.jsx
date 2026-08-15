import { useState } from 'react'
import {
  campaignTransferLimits,
  createCampaignTransferCode,
  importCampaignTransfer,
  previewCampaignTransfer,
} from './campaignTransfer.js'

function CampaignTransfer({ accountId, onMessage }) {
  const [mode, setMode] = useState(null)
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  function close() {
    if (busy) return
    setMode(null)
    setCode('')
    setPreview(null)
    setError('')
    setCopied(false)
  }

  async function createCode() {
    setBusy(true)
    setError('')
    setCopied(false)
    try {
      setCode(await createCampaignTransferCode(accountId))
      setMode('create')
    } catch (createError) {
      setError(createError.message)
    } finally {
      setBusy(false)
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setError('Der Code konnte nicht automatisch kopiert werden. Bitte markiere ihn manuell.')
    }
  }

  async function checkCode() {
    setBusy(true)
    setError('')
    setPreview(null)
    try {
      setPreview(await previewCampaignTransfer(code, accountId))
    } catch (checkError) {
      setError(checkError.message)
    } finally {
      setBusy(false)
    }
  }

  function importCode() {
    try {
      const result = importCampaignTransfer(preview)
      onMessage(`Spielstand übertragen: ${result.added} neue und ${result.improved} verbesserte Level. XP und Coins wurden nicht verändert.`)
      close()
    } catch (importError) {
      setError(importError.message)
    }
  }

  return (
    <>
      <section className="profile-transfer-card">
        <p>SPIELSTAND ÜBERTRAGEN</p>
        <span>Überträgt Kampagnenlevel, Sterne und Bestwerte auf ein anderes Gerät. XP und Coins werden weiterhin über deinen Account synchronisiert.</span>
        <div>
          <button type="button" disabled={busy} onClick={createCode}>Transfercode erstellen</button>
          <button type="button" onClick={() => { setMode('import'); setCode(''); setPreview(null); setError('') }}>Transfercode eingeben</button>
        </div>
      </section>

      {mode && (
        <div className="profile-transfer-backdrop" onClick={close}>
          <section className="profile-transfer-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="transfer-title">{mode === 'create' ? 'Transfercode erstellt' : 'Transfercode eingeben'}</h2>
            {mode === 'create' ? (
              <>
                <p>Nutze diesen Code auf dem anderen Gerät mit demselben DartQuest-Account.</p>
                <textarea className="profile-transfer-code" value={code} readOnly rows="7" aria-label="Transfercode" />
                <small>Die Prüfsumme erkennt beschädigte Codes, bietet aber keinen vollständigen Manipulationsschutz.</small>
                {copied && <p className="profile-transfer-success" role="status">Code kopiert.</p>}
                {error && <p className="profile-error" role="alert">{error}</p>}
                <button className="profile-transfer-primary" type="button" onClick={copyCode}>Code kopieren</button>
                <button className="profile-transfer-cancel" type="button" onClick={close}>Schließen</button>
              </>
            ) : (
              <>
                <p>Füge den Code vom anderen Gerät ein. Vor dem Import wird eine Vorschau angezeigt.</p>
                <textarea
                  className="profile-transfer-code"
                  value={code}
                  maxLength={campaignTransferLimits.maxCodeLength}
                  rows="7"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  onChange={(event) => { setCode(event.currentTarget.value); setPreview(null); setError('') }}
                  aria-label="Transfercode eingeben"
                />
                {preview && (
                  <div className="profile-transfer-preview">
                    <strong>Vorschau</strong>
                    <span>{preview.added} neue Level</span>
                    <span>{preview.improved} verbesserte Level</span>
                    <small>XP und Coins bleiben unverändert.</small>
                  </div>
                )}
                {error && <p className="profile-error" role="alert">{error}</p>}
                {!preview ? (
                  <button className="profile-transfer-primary" type="button" disabled={busy || !code.trim()} onClick={checkCode}>
                    {busy ? 'Code wird geprüft …' : 'Code prüfen'}
                  </button>
                ) : (
                  <button className="profile-transfer-primary" type="button" onClick={importCode}>Importieren</button>
                )}
                <button className="profile-transfer-cancel" type="button" disabled={busy} onClick={close}>Abbrechen</button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}

export default CampaignTransfer
