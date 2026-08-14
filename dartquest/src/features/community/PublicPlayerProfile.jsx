import { useCallback, useEffect, useState } from 'react'
import { getPublicPlayerProfile, respondToFriendRequest, sendFriendRequest } from './communityStorage'
import './PublicPlayerProfile.css'
import PlayerAvatar from '../../shared/components/PlayerAvatar'

const actionLabels = {
  none: '🤝 FREUNDSCHAFTSANFRAGE SENDEN',
  outgoing_pending: 'ANFRAGE GESENDET',
  incoming_pending: '🤝 ANFRAGE ANNEHMEN',
  friends: '✓ FREUNDE',
}

function PublicPlayerProfile({ profileId, onBack, onRequestsChanged }) {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try { setPlayer(await getPublicPlayerProfile(profileId)); setMessage('') }
    catch (error) { setMessage(error.message) }
    finally { setLoading(false) }
  }, [profileId])

  useEffect(() => { const timer = window.setTimeout(loadProfile, 0); return () => window.clearTimeout(timer) }, [loadProfile])

  async function handleFriendAction() {
    if (!player || !['none', 'incoming_pending'].includes(player.friendshipStatus)) return
    setBusy(true); setMessage('')
    try {
      let successMessage
      if (player.friendshipStatus === 'incoming_pending') {
        await respondToFriendRequest(player.pendingRequestId, true)
        successMessage = 'Ihr seid jetzt Freunde.'
      } else {
        await sendFriendRequest(player.profileId)
        successMessage = 'Freundschaftsanfrage gesendet.'
      }
      await loadProfile()
      setMessage(successMessage)
      onRequestsChanged?.()
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }

  return <main className="public-profile-screen">
    <header className="public-profile-header"><button type="button" onClick={onBack} aria-label="Zurück zur Rangliste">‹</button><div><span>COMMUNITY</span><h1>SPIELERPROFIL</h1></div></header>
    {loading && <p className="public-profile-state">Spielerprofil wird geladen …</p>}
    {message && <p className="public-profile-message">{message}</p>}
    {player && <>
      <section className="public-profile-card">
        <PlayerAvatar className="public-profile-avatar" name={player.name} avatarPath={player.avatarPath} />
        <h2>{player.name}</h2><span className="public-profile-level">LVL {player.playerLevel}</span>
        <strong>{player.xp.toLocaleString('de-DE')} <small>XP</small></strong>
      </section>
      {player.friendshipStatus !== 'self' && <section className="public-profile-section"><h3>AKTIONEN</h3><div className="public-profile-actions">
        <button type="button" onClick={handleFriendAction} disabled={busy || !['none', 'incoming_pending'].includes(player.friendshipStatus)}>{actionLabels[player.friendshipStatus]}</button>
        <button type="button" onClick={() => setMessage('Nachrichten – kommt bald')}>💬 NACHRICHT SENDEN</button>
      </div></section>}
      <section className="public-profile-section"><h3>STATISTIKEN</h3><dl><div><dt>LEVEL</dt><dd>{player.playerLevel}</dd></div><div><dt>XP</dt><dd>{player.xp.toLocaleString('de-DE')}</dd></div></dl></section>
      <section className="public-profile-section"><h3>ERFOLGE</h3><p>Noch keine öffentlichen Erfolge.</p></section>
    </>}
  </main>
}

export default PublicPlayerProfile
