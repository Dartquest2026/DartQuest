function BottomNav({ activePage, onChangePage, pendingRequestCount = 0 }) {
  const items = [
    { id: 'home', icon: '⌂', label: 'Home' },
    { id: 'campaign', icon: '◎', label: 'Kampagne' },
    { id: 'community', icon: '👥', label: 'Community' },
    { id: 'profile', icon: '○', label: 'Profil' },
  ]

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button key={item.id} type="button" className={activePage === item.id ? 'active' : ''} onClick={() => onChangePage(item.id)}>
          <span className="bottom-nav-icon">
            {item.icon}
            {item.id === 'community' && pendingRequestCount > 0 && (
              <span className="bottom-nav-badge" aria-label={`${pendingRequestCount} offene Anfragen`}>{pendingRequestCount > 99 ? '99+' : pendingRequestCount}</span>
            )}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
