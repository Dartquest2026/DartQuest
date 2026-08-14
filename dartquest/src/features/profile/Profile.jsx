import { useRef, useState } from 'react'
import { XP_PER_PLAYER_LEVEL } from '../auth/profileStorage'
import { resetCurrentProfileProgress } from './progressReset'
import { deleteOwnAccount, getAvatarUrl, removeOwnAvatar, uploadOwnAvatar } from './avatarStorage'
import './Profile.css'

function Avatar({ profile, version }) {
  const url = getAvatarUrl(profile.avatarPath, version)
  return <div className="profile-avatar">{url ? <img src={url} alt={`Profilbild von ${profile.name}`} /> : profile.name.slice(0, 1).toUpperCase()}</div>
}

function Profile({ activeProfile, onLogout, onProfileUpdated, onAccountDeleted }) {
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [avatarVersion, setAvatarVersion] = useState('')
  const cameraInput = useRef(null)
  const galleryInput = useRef(null)
  const xp = Number(activeProfile.xp) || 0
  const level = Number(activeProfile.playerLevel) || 1
  const levelXp = xp % XP_PER_PLAYER_LEVEL
  const xpPercent = Math.min(100, (levelXp / XP_PER_PLAYER_LEVEL) * 100)

  async function changeAvatar(event) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setBusy(true); setError(''); setMessage('')
    try {
      await uploadOwnAvatar(file, activeProfile.id)
      await onProfileUpdated()
      setAvatarVersion(Date.now().toString())
      setAvatarMenuOpen(false); setMessage('Profilbild aktualisiert.')
    } catch (uploadError) { setError(uploadError.message) } finally { setBusy(false) }
  }

  async function removeAvatar() {
    setBusy(true); setError(''); setMessage('')
    try { await removeOwnAvatar(activeProfile.avatarPath); await onProfileUpdated(); setAvatarMenuOpen(false); setMessage('Profilbild entfernt.') }
    catch (removeError) { setError(removeError.message) } finally { setBusy(false) }
  }

  async function confirmProgressReset() {
    setBusy(true); setError('')
    try { await resetCurrentProfileProgress(activeProfile.id); setResetModalOpen(false); window.location.reload() }
    catch (resetError) { setError(resetError.message) } finally { setBusy(false) }
  }

  async function confirmAccountDeletion(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await deleteOwnAccount(password, activeProfile.email); onAccountDeleted() }
    catch (deleteError) { setError(deleteError.message) } finally { setBusy(false) }
  }

  return <main className="profile-screen">
    <header><span>DARTQUEST</span><h1>SPIELERPROFIL</h1></header>
    <section className="profile-hero">
      <Avatar profile={activeProfile} version={avatarVersion} />
      <h2>{activeProfile.name}</h2><span className="profile-level">LVL {level}</span>
      <div className="profile-xp-copy"><span>XP</span><strong>{levelXp.toLocaleString('de-DE')} / {XP_PER_PLAYER_LEVEL.toLocaleString('de-DE')}</strong></div>
      <div className="profile-xp-track"><div style={{ width: `${xpPercent}%` }} /></div>
      <p>🪙 {(activeProfile.coins ?? 0).toLocaleString('de-DE')} Coins</p>
      <button className="profile-avatar-change" type="button" onClick={() => { setAvatarMenuOpen(true); setError('') }}>PROFILBILD ÄNDERN</button>
    </section>
    {message && <p className="profile-message">{message}</p>}{error && !deleteModalOpen && <p className="profile-error">{error}</p>}
    <section className="profile-section"><h3>STATISTIKEN</h3><div className="profile-stat-grid"><div><span>GESAMT-XP</span><strong>{xp.toLocaleString('de-DE')}</strong></div><div><span>LEVEL</span><strong>{level}</strong></div><div><span>COINS</span><strong>{(activeProfile.coins ?? 0).toLocaleString('de-DE')}</strong></div></div></section>
    <section className="profile-section"><h3>ERFOLGE</h3><p>Noch keine öffentlichen Erfolge.</p></section>
    <section className="profile-section profile-settings"><h3>PROFIL &amp; ACCOUNT</h3><button type="button" onClick={() => setAvatarMenuOpen(true)}>🖼 <span><strong>Profilbild ändern</strong><small>Kamera oder Bilddatei verwenden</small></span></button><button type="button" onClick={onLogout}>↪ <span><strong>Abmelden</strong><small>Diese Sitzung beenden</small></span></button></section>
    <section className="profile-data-card"><p>DATEN &amp; FORTSCHRITT</p><button type="button" onClick={() => setResetModalOpen(true)}><span>⚠</span><span><strong>Fortschritt zurücksetzen</strong><small>Lokalen Kampagnenfortschritt sowie Profil-XP und Coins zurücksetzen</small></span></button></section>
    <section className="profile-account-card"><p>GEFAHRENBEREICH</p><button type="button" onClick={() => { setPassword(''); setDeleteConfirmed(false); setError(''); setDeleteModalOpen(true) }}><span>🗑</span><span><strong>KONTO LÖSCHEN</strong><small>Profil, Spieldaten und Login dauerhaft entfernen</small></span></button></section>

    <input ref={cameraInput} className="profile-file-input" type="file" accept="image/*" capture="user" onChange={changeAvatar} />
    <input ref={galleryInput} className="profile-file-input" type="file" accept="image/*" onChange={changeAvatar} />
    {avatarMenuOpen && <div className="profile-sheet-backdrop" onClick={() => !busy && setAvatarMenuOpen(false)}><section className="profile-sheet" onClick={(event) => event.stopPropagation()}><h2>Profilbild ändern</h2><button disabled={busy} onClick={() => cameraInput.current?.click()}>📷 FOTO AUFNEHMEN</button><button disabled={busy} onClick={() => galleryInput.current?.click()}>🖼 BILD AUSWÄHLEN</button><button className="danger" disabled={busy || !activeProfile.avatarPath} onClick={removeAvatar}>🗑 PROFILBILD ENTFERNEN</button><button onClick={() => setAvatarMenuOpen(false)}>ABBRECHEN</button></section></div>}
    {resetModalOpen && <div className="profile-reset-backdrop" onClick={() => !busy && setResetModalOpen(false)}><section className="profile-reset-modal" onClick={(event) => event.stopPropagation()}><div className="profile-reset-icon">⚠</div><h2>Fortschritt wirklich zurücksetzen?</h2><p>Diese Aktion kann nicht rückgängig gemacht werden.</p>{error && <p className="profile-error">{error}</p>}<button className="profile-reset-cancel" disabled={busy} onClick={() => setResetModalOpen(false)}>ABBRECHEN</button><button className="profile-reset-confirm" disabled={busy} onClick={confirmProgressReset}>FORTSCHRITT ZURÜCKSETZEN</button></section></div>}
    {deleteModalOpen && <div className="profile-delete-backdrop" onClick={() => !busy && setDeleteModalOpen(false)}><section className="profile-delete-modal" onClick={(event) => event.stopPropagation()}><div className="profile-delete-icon">⚠</div><h2>DartQuest-Konto wirklich löschen?</h2><p>Dein Profil, deine persönlichen Spieldaten und dein Login werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p><form onSubmit={confirmAccountDeletion}><label>Passwort erneut eingeben<input type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} autoComplete="current-password" required /></label><label className="profile-delete-checkbox"><input type="checkbox" checked={deleteConfirmed} onChange={(event) => setDeleteConfirmed(event.currentTarget.checked)} /><span>Ich verstehe, dass mein Konto dauerhaft gelöscht wird.</span></label>{error && <p className="profile-delete-error">{error}</p>}<button className="profile-delete-confirm" disabled={busy || !password || !deleteConfirmed}>{busy ? 'KONTO WIRD GELÖSCHT …' : 'KONTO ENDGÜLTIG LÖSCHEN'}</button><button className="profile-delete-cancel" type="button" disabled={busy} onClick={() => setDeleteModalOpen(false)}>ABBRECHEN</button></form></section></div>}
  </main>
}

export default Profile
