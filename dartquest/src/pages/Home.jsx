import Dashboard from '../components/Dashboard'

function Home({ onStartCampaign }) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">DART TRAINING</p>
          <h1>DartQuest</h1>
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