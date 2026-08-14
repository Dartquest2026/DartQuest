const campaignPages = new Set([
  'campaign',
  'singleplayerDifficulty',
  'singleplayerCampaign',
  'multiplayerCampaign',
])

const homePages = new Set(['home', 'singleplayer', 'multiplayer'])

function getActiveMainPage(activePage) {
  if (campaignPages.has(activePage)) return 'campaign'
  if (homePages.has(activePage)) return 'home'
  return activePage
}

function NavIcon({ name }) {
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6" /></>,
    campaign: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    community: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 20v-2.3A4.7 4.7 0 0 1 8.2 13h1.6a4.7 4.7 0 0 1 4.7 4.7V20M14.5 14h1.8a4.2 4.2 0 0 1 4.2 4.2V20" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21v-2.2A6.8 6.8 0 0 1 11.3 12h1.4a6.8 6.8 0 0 1 6.8 6.8V21" /></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function BottomNav({ activePage, onChangePage, pendingRequestCount = 0 }) {
  const activeMainPage = getActiveMainPage(activePage)
  const items = [
    { id: 'home', label: 'Home' },
    { id: 'campaign', label: 'Kampagne' },
    { id: 'community', label: 'Community' },
    { id: 'profile', label: 'Profil' },
  ]

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = activeMainPage === item.id
        return (
          <button key={item.id} type="button" className={isActive ? 'active' : ''} aria-current={isActive ? 'page' : undefined} onClick={() => onChangePage(item.id)}>
            <span className="bottom-nav-icon">
              <NavIcon name={item.id} />
              {item.id === 'community' && pendingRequestCount > 0 && (
                <span className="bottom-nav-badge" aria-label={`${pendingRequestCount} offene Anfragen`}>{pendingRequestCount > 99 ? '99+' : pendingRequestCount}</span>
              )}
            </span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
