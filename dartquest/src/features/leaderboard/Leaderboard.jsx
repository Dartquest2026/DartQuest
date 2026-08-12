import { useState } from 'react'
import { getProfiles } from '../auth/profileStorage'
import {
  createGroup,
  deleteGroup,
  getGroupsForProfile,
  getRankedMembers,
  joinGroup,
  leaveGroup,
} from './groupStorage'
import './Leaderboard.css'

function Leaderboard({ activeProfile, onBack }) {
  const [groups, setGroups] = useState(() => getGroupsForProfile(activeProfile.id))
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [mode, setMode] = useState('list')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

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

  function returnToGroupList() {
    setGroups(getGroupsForProfile(activeProfile.id))
    setSelectedGroup(null)
    setMode('list')
  }

  function confirmDeleteGroup() {
    if (selectedGroup && deleteGroup(selectedGroup.id, activeProfile.id)) {
      setDeleteModalOpen(false)
      returnToGroupList()
    }
  }

  function leaveSelectedGroup() {
    if (selectedGroup && leaveGroup(selectedGroup.id, activeProfile.id)) {
      returnToGroupList()
    }
  }

  const ranking = selectedGroup
    ? getRankedMembers(selectedGroup, getProfiles())
    : []

  return (
    <main className="leaderboard-screen">
      <header className="leaderboard-header">
        <button type="button" onClick={mode === 'detail' ? returnToGroupList : onBack}>‹</button>
        <div><span>DARTQUEST</span><h1>Rangliste</h1></div>
      </header>

      {mode === 'list' && (
        <>
          <section className="leaderboard-intro"><div>🏆</div><h2>Rangliste</h2><p>Miss dich mit deinen Freunden.</p></section>
          <div className="leaderboard-actions">
            <button type="button" onClick={() => { setMode('create'); setError('') }}>＋<strong>GRUPPE ERSTELLEN</strong></button>
            <button type="button" onClick={() => { setMode('join'); setJoinCode(''); setError('') }}>🔢<strong>GRUPPE BEITRETEN</strong></button>
          </div>
          <section className="leaderboard-groups">
            <h3>MEINE GRUPPEN <span>{groups.length} / 5</span></h3>
            {groups.length === 0 && <p className="leaderboard-empty">Noch keine Freundesgruppe vorhanden.</p>}
            {groups.map((group) => {
              const ownRank = getRankedMembers(group, getProfiles())
                .findIndex((member) => member.profileId === activeProfile.id) + 1

              return (
                <button key={group.id} type="button" onClick={() => { setSelectedGroup(group); setMode('detail') }}>
                  <span>👥</span><span><strong>{group.name}</strong><small>{group.members.length} Mitglieder · Dein Rang: #{ownRank}</small></span><b>ÖFFNEN</b>
                </button>
              )
            })}
          </section>
        </>
      )}

      {(mode === 'create' || mode === 'join') && (
        <section className="leaderboard-form-card">
          <p>{mode === 'create' ? 'NEUE GRUPPE' : 'EINLADUNG'}</p>
          <h2>{mode === 'create' ? 'Gruppe erstellen' : 'Gruppe beitreten'}</h2>
          <form onSubmit={submit}>
            <label>{mode === 'create' ? 'Gruppenname' : '6-stelliger Gruppencode'}
              <input
                key={mode}
                type="text"
                name="groupValue"
                defaultValue=""
                placeholder={mode === 'create' ? 'Dart-Abend' : '381742'}
                inputMode={mode === 'join' ? 'numeric' : 'text'}
                pattern={mode === 'join' ? '[0-9]{6}' : undefined}
                maxLength={mode === 'join' ? 6 : 60}
                onInput={mode === 'join' ? (event) => {
                  const normalized = event.currentTarget.value.replace(/\D/g, '').slice(0, 6)
                  event.currentTarget.value = normalized
                  setJoinCode(normalized)
                } : undefined}
                autoComplete="off"
                enterKeyHint="done"
                required
              />
            </label>
            {error && <p className="leaderboard-error">{error}</p>}
            <button className="leaderboard-primary" type="submit" disabled={mode === 'join' && !/^\d{6}$/.test(joinCode)}>{mode === 'create' ? 'GRUPPE ERSTELLEN' : 'BEITRETEN'}</button>
          </form>
          <button className="leaderboard-cancel" type="button" onClick={() => setMode('list')}>ABBRECHEN</button>
        </section>
      )}

      {mode === 'detail' && selectedGroup && (
        <>
          <section className="leaderboard-group-head">
            <span>FREUNDESGRUPPE</span><h2>{selectedGroup.name}</h2><p>👥 {selectedGroup.members.length} Mitglieder</p>
            <label className="leaderboard-code-label">GRUPPENCODE</label>
            <div><code>{selectedGroup.inviteCode}</code><button type="button" onClick={copyCode}>{copied ? 'KOPIERT ✓' : 'CODE KOPIEREN'}</button></div>
            <small>Lokale Testgruppe · keine Geräte-Synchronisierung</small>
            {selectedGroup.ownerProfileId === activeProfile.id ? (
              <button className="leaderboard-delete" type="button" onClick={() => setDeleteModalOpen(true)}>GRUPPE LÖSCHEN</button>
            ) : (
              <button className="leaderboard-leave" type="button" onClick={leaveSelectedGroup}>GRUPPE VERLASSEN</button>
            )}
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

      {deleteModalOpen && (
        <div className="leaderboard-delete-backdrop" onClick={() => setDeleteModalOpen(false)}>
          <section className="leaderboard-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-group-title" onClick={(event) => event.stopPropagation()}>
            <div>⚠</div>
            <h2 id="delete-group-title">Gruppe wirklich löschen?</h2>
            <p>Die Gruppe und ihre Rangliste werden dauerhaft entfernt.</p>
            <button className="leaderboard-cancel" type="button" onClick={() => setDeleteModalOpen(false)}>ABBRECHEN</button>
            <button className="leaderboard-delete-confirm" type="button" onClick={confirmDeleteGroup}>GRUPPE LÖSCHEN</button>
          </section>
        </div>
      )}
    </main>
  )
}

export default Leaderboard
