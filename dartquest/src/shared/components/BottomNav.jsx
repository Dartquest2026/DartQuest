function BottomNav({ activePage, onChangePage }) {
  const items = [
    {
      id: 'home',
      icon: '⌂',
      label: 'Home',
    },
    {
      id: 'campaign',
      icon: '◎',
      label: 'Kampagne',
    },
    {
      id: 'leaderboard',
      icon: '🏆',
      label: 'Rangliste',
    },
    {
      id: 'profile',
      icon: '○',
      label: 'Profil',
    },
  ]

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            activePage === item.id ? 'active' : ''
          }
          onClick={() => onChangePage(item.id)}
        >
          <span>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
