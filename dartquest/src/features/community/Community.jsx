import { useCallback, useEffect, useState } from 'react'
import Leaderboard from '../leaderboard/Leaderboard'
import GlobalLeaderboard from '../leaderboard/GlobalLeaderboard'
import { getFriends, getPendingRequests, respondToFriendRequest, respondToGroupInvite, searchProfiles, sendFriendRequest } from './communityStorage'
import './Community.css'

const communityItems = [
  { id: 'leaderboard', icon: '🏆', title: 'RANGLISTE', description: 'Vergleiche dich mit anderen Spielern' },
  { id: 'groups', icon: '👥', title: 'GRUPPEN', description: 'Erstelle Gruppen oder tritt einer Gruppe bei' },
  { id: 'friends', icon: '🤝', title: 'FREUNDE', description: 'Verwalte deine Freunde und finde Spieler' },
  { id: 'requests', icon: '🔔', title: 'ANFRAGEN', description: 'Freundschafts- und Gruppeneinladungen' },
  { id: 'tournaments', icon: '🎯', title: 'TURNIERE', description: 'Private und öffentliche Turniere', comingSoon: true },
]

function Header({ title, onBack }) {
  return <header className="community-subpage-header"><button type="button" onClick={onBack} aria-label="Zurück zur Community">‹</button><div><span>COMMUNITY</span><h1>{title}</h1></div></header>
}

function PlayerRow({ player, action }) {
  return <article className="community-player-row"><div className="community-player-avatar">{player.name.slice(0, 1).toUpperCase()}</div><div><strong>{player.name}</strong><small>LVL {player.playerLevel} · {player.xp.toLocaleString('de-DE')} XP</small></div>{action && <button type="button" onClick={() => action.onClick(player)}>{action.label}</button>}</article>
}

function FriendsPage({ onBack }) {
  const [friends, setFriends] = useState([])
  const [results, setResults] = useState([])
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { getFriends().then(setFriends).catch((error) => setMessage(error.message)).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    if (query.trim().length < 2) return undefined
    const timer = window.setTimeout(() => searchProfiles(query).then(setResults).catch((error) => setMessage(error.message)), 300)
    return () => window.clearTimeout(timer)
  }, [query])
  async function addFriend(player) {
    try { await sendFriendRequest(player.profileId); setMessage('Freundschaftsanfrage gesendet.') }
    catch (error) { setMessage(error.message) }
  }
  return <main className="community-screen"><Header title="Freunde" onBack={onBack} />
    <label className="community-search"><span>⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Spieler suchen" /></label>
    {message && <p className="community-message">{message}</p>}
    {query.trim().length >= 2 ? <section className="community-list"><h2>SUCHERGEBNISSE</h2>{results.map((player) => <PlayerRow key={player.profileId} player={player} action={{ label: 'HINZUFÜGEN', onClick: addFriend }} />)}{!results.length && <p className="community-list-empty">Keine Spieler gefunden.</p>}</section>
      : <section className="community-list"><h2>FREUNDE</h2>{loading && <p className="community-list-empty">Freunde werden geladen …</p>}{!loading && !friends.length && <p className="community-list-empty">Noch keine Freunde hinzugefügt.</p>}{friends.map((friend) => <PlayerRow key={friend.profileId} player={friend} />)}</section>}
  </main>
}

function RequestsPage({ onBack, onRequestsChanged }) {
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const load = useCallback(() => getPendingRequests().then(setRequests).catch((error) => setMessage(error.message)), [])
  useEffect(() => { load() }, [load])
  async function respond(request, accept) {
    setBusy(request.id); setMessage('')
    try {
      if (request.type === 'friend') await respondToFriendRequest(request.id, accept)
      else await respondToGroupInvite(request.id, accept)
      setMessage(accept ? (request.type === 'friend' ? 'Ihr seid jetzt Freunde.' : 'Du bist der Gruppe beigetreten.') : 'Anfrage abgelehnt.')
      await load(); onRequestsChanged()
    } catch (error) { setMessage(error.message) } finally { setBusy('') }
  }
  return <main className="community-screen"><Header title="Anfragen" onBack={onBack} /><section className="community-list"><h2>OFFENE ANFRAGEN</h2>{message && <p className="community-message">{message}</p>}{!requests.length && <p className="community-list-empty">Keine offenen Anfragen</p>}{requests.map((request) => <article className="community-request" key={request.id}><span>{request.type === 'friend' ? '🤝' : '👥'}</span><div><small>{request.type === 'friend' ? 'FREUNDSCHAFTSANFRAGE' : 'GRUPPENEINLADUNG'}</small><strong>{request.type === 'friend' ? `${request.senderName} möchte dein Freund werden.` : `${request.senderName} lädt dich in die Gruppe „${request.groupName}“ ein.`}</strong><div><button disabled={busy === request.id} onClick={() => respond(request, true)}>{request.type === 'friend' ? 'ANNEHMEN' : 'BEITRETEN'}</button><button disabled={busy === request.id} onClick={() => respond(request, false)}>ABLEHNEN</button></div></div></article>)}</section></main>
}

function Community({ activeProfile, onRequestsChanged }) {
  const [section, setSection] = useState('communityHome')
  const back = () => setSection('communityHome')
  if (section === 'leaderboard') return <GlobalLeaderboard activeProfile={activeProfile} onBack={back} />
  if (section === 'groups') return <Leaderboard activeProfile={activeProfile} onBack={back} />
  if (section === 'friends') return <FriendsPage onBack={back} />
  if (section === 'requests') return <RequestsPage onBack={back} onRequestsChanged={onRequestsChanged} />
  if (section === 'tournaments') return <main className="community-screen"><Header title="Turniere" onBack={back} /><p className="community-list-empty">Kommt bald</p></main>
  return <main className="community-screen"><header className="community-header"><span>DARTQUEST</span><h1>COMMUNITY</h1><p>Spieler finden, Gruppen verwalten und vergleichen.</p></header><section className="community-grid" aria-label="Community-Bereiche">{communityItems.map((item) => <button key={item.id} type="button" className="community-card" onClick={() => setSection(item.id)}><span className="community-card-icon">{item.icon}</span><span className="community-card-copy"><strong>{item.title}</strong><small>{item.description}</small></span>{item.comingSoon ? <em>KOMMT BALD</em> : <span className="community-card-arrow">›</span>}</button>)}</section></main>
}

export default Community
