import { useState } from 'react'
import Leaderboard from '../leaderboard/Leaderboard'
import GlobalLeaderboard from '../leaderboard/GlobalLeaderboard'
import './Community.css'

const communityItems = [
  { id: 'leaderboard', icon: '🏆', title: 'RANGLISTE', description: 'Vergleiche dich mit anderen Spielern' },
  { id: 'groups', icon: '👥', title: 'GRUPPEN', description: 'Erstelle Gruppen oder tritt einer Gruppe bei' },
  { id: 'friends', icon: '🤝', title: 'FREUNDE', description: 'Verwalte deine Freunde und Favoriten' },
  { id: 'requests', icon: '🔔', title: 'ANFRAGEN', description: 'Freundschafts-, Gruppen- und Spieleinladungen' },
  { id: 'tournaments', icon: '🎯', title: 'TURNIERE', description: 'Private und öffentliche Turniere', comingSoon: true },
]

function EmptyCommunityPage({ title, icon, children, action, onBack }) {
  return (
    <main className="community-screen">
      <header className="community-subpage-header">
        <button type="button" onClick={onBack} aria-label="Zurück zur Community">‹</button>
        <div><span>COMMUNITY</span><h1>{title}</h1></div>
      </header>
      <section className="community-empty">
        <span className="community-empty-icon" aria-hidden="true">{icon}</span>
        <h2>{children}</h2>
        {action && <button type="button">{action}</button>}
      </section>
    </main>
  )
}

function Community({ activeProfile }) {
  const [section, setSection] = useState('communityHome')

  if (section === 'leaderboard') {
    return <GlobalLeaderboard activeProfile={activeProfile} onBack={() => setSection('communityHome')} />
  }
  if (section === 'groups') {
    return <Leaderboard activeProfile={activeProfile} onBack={() => setSection('communityHome')} />
  }
  if (section === 'friends') return <EmptyCommunityPage title="Freunde" icon="🤝" action="SPIELER SUCHEN" onBack={() => setSection('communityHome')}>Noch keine Freunde hinzugefügt.</EmptyCommunityPage>
  if (section === 'requests') return <EmptyCommunityPage title="Anfragen" icon="🔔" onBack={() => setSection('communityHome')}>Keine offenen Anfragen</EmptyCommunityPage>
  if (section === 'tournaments') return <EmptyCommunityPage title="Turniere" icon="🎯" onBack={() => setSection('communityHome')}>Kommt bald</EmptyCommunityPage>

  return (
    <main className="community-screen">
      <header className="community-header">
        <span>DARTQUEST</span><h1>COMMUNITY</h1>
        <p>Spieler finden, Gruppen verwalten und vergleichen.</p>
      </header>
      <section className="community-grid" aria-label="Community-Bereiche">
        {communityItems.map((item) => (
          <button key={item.id} type="button" className="community-card" onClick={() => setSection(item.id)}>
            <span className="community-card-icon" aria-hidden="true">{item.icon}</span>
            <span className="community-card-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
            {item.comingSoon ? <em>KOMMT BALD</em> : <span className="community-card-arrow">›</span>}
          </button>
        ))}
      </section>
    </main>
  )
}

export default Community
