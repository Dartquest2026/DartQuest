import logo from '../assets/dartquest-logo.jpeg'
import Dashboard from '../components/Dashboard'
import logo from '../assets/dartquest-logo.jpeg'

function Home({ onStartCampaign }) {
  return (
    <>
      <header className="topbar">
  <div className="brand-block">
    <img
      src={logo}
      alt="DartQuest Logo"
      className="brand-logo"
    />

    <div>
      <p className="eyebrow">DART TRAINING</p>
      <h1>DartQuest</h1>
    </div>
  </div>

  <div className="player-level">
    <span>Level 1</span>
    <strong>0 XP</strong>
  </div>
</header>

      <Dashboard onStartCampaign={onStartCampaign} />
    </>
  )
}

export default Home