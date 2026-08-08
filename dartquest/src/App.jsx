import { useState } from 'react'

import Home from './pages/Home'
import Campaign from './pages/Campaign'
import BottomNav from './components/BottomNav'

import './styles/App.css'
import './styles/BottomNav.css'
import './styles/LevelModal.css'

function App() {
  const [activePage, setActivePage] = useState('home')

  return (
    <div className="app-shell">

      {activePage === 'home' && (
        <Home
          onStartCampaign={() => setActivePage('campaign')}
        />
      )}

      {activePage === 'campaign' && (
        <Campaign />
      )}

      {activePage === 'achievements' && (
        <div style={{ padding: 20 }}>
          <h2>🏆 Erfolge</h2>
          <p>Kommt bald...</p>
        </div>
      )}

      {activePage === 'profile' && (
        <div style={{ padding: 20 }}>
          <h2>👤 Profil</h2>
          <p>Kommt bald...</p>
        </div>
      )}

      <BottomNav
        activePage={activePage}
        onChangePage={setActivePage}
      />

    </div>
  )
}

export default App