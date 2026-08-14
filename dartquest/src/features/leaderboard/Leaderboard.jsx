import { useCallback, useEffect, useState } from 'react'
import {
  createGroup,
  deleteGroup,
  getGroupsForProfile,
  getRankedMembers,
  joinGroup,
  leaveGroup,
  loadGroup,
  normalizeInviteCode,
} from './groupStorage'
import './Leaderboard.css'

function Leaderboard({ activeProfile, onBack }) {
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [mode, setMode] = useState('list')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshGroups = useCallback(async () => {
    setLoading(true)
    try {
      setGroups(await getGroupsForProfile())
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const refreshTimer = window.setTimeout(refreshGroups, 0)
    return () => window.clearTimeout(refreshTimer)
  }, [refreshGroups])

  async function submit(event) {
    event.preventDefault()
    setError('')
    const value = new FormData(event.currentTarget)
      .get('groupValue')
      ?.toString() ?? ''
    try {
      setLoading(true)
      const group = mode === 'create'
        ? await createGroup(value)
        : await joinGroup(joinCode)
      await refreshGroups()
      setSelectedGroup(group)
      setMode('detail')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
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
    refreshGroups()
    setSelectedGroup(null)
    setMode('list')
  }

  async function confirmDeleteGroup() {
    if (!selectedGroup) return
    try {
      await deleteGroup(selectedGroup.id)
      setDeleteModalOpen(false)
      returnToGroupList()
    } catch (deleteError) {
      setDeleteModalOpen(false)
      setError(deleteError.message)
    }
  }

  async function leaveSelectedGroup() {
    if (!selectedGroup) return
    try {
      await leaveGroup(selectedGroup.id, selectedGroup.ownerProfileId)
      returnToGroupList()
    } catch (leaveError) {
      setError(leaveError.message)
    }
  }

  const ranking = selectedGroup
    ? getRankedMembers(selectedGroup)
    : []

  return (
    <main className="leaderboard-screen">
      <header className="leaderboard-header">
        <button type="button" onClick={mode === 'detail' ? returnToGroupList : onBack}>‹</button>
        <div><span>DARTQUEST</span><h1>Gruppen</h1></div>
      </header>

      {mode === 'list' && (
        <>
          <section className="leaderboard-groups-intro">
            <span>GRUPPEN</span>
            <p>Erstelle eine Gruppe oder tritt einer bestehenden bei.</p>
          </section>
          <div className="leaderboard-actions">
            <button type="button" onClick={() => { setMode('create'); setError('') }}>＋<strong>GRUPPE ERSTELLEN</strong></button>
            <button type="button" onClick={() => { setMode('join'); setJoinCode(''); setError('') }}>🔢<strong>GRUPPE BEITRETEN</strong></button>
          </div>
          <section className="leaderboard-groups">
            <h3>MEINE GRUPPEN <span>{groups.length} / 5</span></h3>
            {loading && <p className="leaderboard-empty">Gruppen werden geladen …</p>}
            {error && <p className="leaderboard-error">{error}</p>}
            {!loading && groups.length === 0 && <p className="leaderboard-empty">Noch keine Freundesgruppe vorhanden.</p>}
            {groups.map((group) => {
              const ownRank = getRankedMembers(group)
                .findIndex((member) => member.profileId === activeProfile.id) + 1

              return (
                <button key={group.id} type="button" onClick={async () => {
                  setError('')
                  try {
                    setSelectedGroup(await loadGroup(group.id))
                    setMode('detail')
                  } catch (loadError) {
                    setError(loadError.message)
                  }
                }}>
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
                value={mode === 'join' ? joinCode : undefined}
                defaultValue={mode === 'create' ? '' : undefined}
                placeholder={mode === 'create' ? 'Dart-Abend' : '381742'}
                inputMode={mode === 'join' ? 'numeric' : 'text'}
                pattern={mode === 'join' ? '[0-9]{6}' : undefined}
                maxLength={mode === 'join' ? 6 : 60}
                onChange={mode === 'join' ? (event) => {
                  setJoinCode(
                    normalizeInviteCode(event.currentTarget.value).slice(0, 6),
                  )
                } : undefined}
                autoComplete="off"
                enterKeyHint="done"
                required
              />
            </label>
            {error && <p className="leaderboard-error">{error}</p>}
            <button className="leaderboard-primary" type="submit" disabled={loading || (mode === 'join' && !/^\d{6}$/.test(joinCode))}>{loading ? 'BITTE WARTEN …' : mode === 'create' ? 'GRUPPE ERSTELLEN' : 'BEITRETEN'}</button>
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
            <small>Online synchronisiert · auf allen Geräten verfügbar</small>
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
                <div className="rank-player"><strong>{member.name} {member.profileId === activeProfile.id && <em>DU</em>}</strong><span>LVL {member.playerLevel}</span></div>
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
