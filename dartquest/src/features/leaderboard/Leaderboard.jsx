import { useState } from 'react'
import { getProfiles } from '../auth/profileStorage'
import {
  createGroup,
  getGroupsForProfile,
  getRankedMembers,
  joinGroup,
} from './groupStorage'
import './Leaderboard.css'

function Leaderboard({ activeProfile, onBack }) {
  const [groups, setGroups] = useState(() => getGroupsForProfile(activeProfile.id))
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [mode, setMode] = useState('list')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function submit(event) {
    event.preventDefault()
    setError('')
    const value = new FormData(event.currentTarget)
      .get('groupValue')
      ?.toString() ?? ''
    try {
      const group = mode === 'create'
        ? createGroup(value, activeProfile.id)
        : joinGroup(value, activeProfile.id)
      setGroups(getGroupsForProfile(activeProfile.id))
      setSelectedGroup(group)
      setMode('detail')
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  async function copyCode() {
    if (!selectedGroup) return
    try {
      await navigator.clipboard.writeText(selectedGroup.inviteCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const ranking = selectedGroup
    ? getRankedMembers(selectedGroup, getProfiles())
    : []

  return (
    <main className="leaderboard-screen">
      <header className="leaderboard-header">
        <button type="button" onClick={mode === 'detail' ? () => { setMode('list'); setSelectedGroup(null) } : onBack}>‹</button>
        <div><span>DARTQUEST</span><h1>Rangliste</h1></div>
      </header>

      {mode === 'list' && (
        <>
          <section className="leaderboard-intro"><div>🏆</div><h2>Deine Freundesgruppen</h2><p>Vergleicht euren Fortschritt auf diesem Gerät.</p></section>
          <div className="leaderboard-actions">
            <button type="button" onClick={() => { setMode('create'); setError('') }}>＋<strong>GRUPPE ERSTELLEN</strong></button>
            <button type="button" onClick={() => { setMode('join'); setError('') }}>⌁<strong>GRUPPE BEITRETEN</strong></button>
          </div>
          <section className="leaderboard-groups">
            <h3>MEINE GRUPPEN <span>{groups.length} / 5</span></h3>
            {groups.length === 0 && <p className="leaderboard-empty">Noch keine Freundesgruppe vorhanden.</p>}
            {groups.map((group) => (
              <button key={group.id} type="button" onClick={() => { setSelectedGroup(group); setMode('detail') }}>
                <span>👥</span><span><strong>{group.name}</strong><small>{group.members.length} Mitglieder · {group.inviteCode}</small></span><b>›</b>
              </button>
            ))}
          </section>
        </>
      )}

      {(mode === 'create' || mode === 'join') && (
        <section className="leaderboard-form-card">
          <p>{mode === 'create' ? 'NEUE GRUPPE' : 'EINLADUNG'}</p>
          <h2>{mode === 'create' ? 'Gruppe erstellen' : 'Gruppe beitreten'}</h2>
          <form onSubmit={submit}>
            <label>{mode === 'create' ? 'Gruppenname' : 'Einladungscode'}
              <input
                key={mode}
                type="text"
                name="groupValue"
                defaultValue=""
                placeholder={mode === 'create' ? 'Dart-Abend' : 'DQ-7K4M2'}
                autoCapitalize={mode === 'join' ? 'characters' : 'sentences'}
                autoComplete="off"
                enterKeyHint="done"
                required
              />
            </label>
            {error && <p className="leaderboard-error">{error}</p>}
            <button className="leaderboard-primary" type="submit">{mode === 'create' ? 'GRUPPE ERSTELLEN' : 'BEITRETEN'}</button>
          </form>
          <button className="leaderboard-cancel" type="button" onClick={() => setMode('list')}>ABBRECHEN</button>
        </section>
      )}

      {mode === 'detail' && selectedGroup && (
        <>
          <section className="leaderboard-group-head">
            <span>FREUNDESGRUPPE</span><h2>{selectedGroup.name}</h2><p>👥 {selectedGroup.members.length} Mitglieder</p>
            <div><code>{selectedGroup.inviteCode}</code><button type="button" onClick={copyCode}>{copied ? 'KOPIERT ✓' : 'CODE KOPIEREN'}</button></div>
            <small>Lokale Testgruppe · keine Geräte-Synchronisierung</small>
          </section>
          <section className="leaderboard-ranking">
            <h3>RANGLISTE <small>NACH GESAMT-XP</small></h3>
            {ranking.map((member, index) => (
              <article key={member.profileId} className={`rank-${index + 1} ${member.profileId === activeProfile.id ? 'is-me' : ''}`}>
                <b className="rank-number">{index + 1}</b>
                <div className="rank-avatar">{member.name.slice(0, 1).toUpperCase()}</div>
                <div className="rank-player"><strong>{member.name} {member.profileId === activeProfile.id && <em>DU</em>}</strong><span>LVL {member.playerLevel} · ⭐ {member.stars} · 🎯 {member.completedLevels} · 👑 {member.defeatedBosses}</span></div>
                <div className="rank-xp"><strong>{member.xp.toLocaleString('de-DE')}</strong><span>XP</span></div>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  )
}

export default Leaderboard
