import { useState } from 'react'
import Home from './pages/Home'
import Campaign from './pages/Campaign'
import './App.css'

function App() {
  const [activePage, setActivePage] = useState('home')

  return (
    <div className="app-shell">
      {activePage === 'home' && (
        <Home onStartCampaign={() => setActivePage('campaign')} />
      )}

      {activePage === 'campaign' && (
        <Campaign />
      )}
    </div>
  )
}

export default App