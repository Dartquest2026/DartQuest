import logo from '../assets/dartquest-logo.png'
import Dashboard from '../components/Dashboard'

import '../styles/Home.css'

function Home({ onStartCampaign }) {
  return (
    <section className="home-screen">
      <header className="home-header">

        <button
          className="home-menu-button"
          type="button"
          aria-label="Menü öffnen"
        >
          ☰
        </button>

        <div className="home-logo-wrap">
          <img
            src={logo}
            alt="DartQuest"
            className="home-logo"
          />
        </div>

        <div className="home-player-info">
          <div className="home-level-badge">
            <span>LVL</span>
            <strong>1</strong>
          </div>

          <div className="home-xp-area">
            <div className="home-xp-row">
              <span>XP</span>
              <strong>0 / 500</strong>
            </div>

            <div className="home-xp-bar">
              <div
                className="home-xp-fill"
                style={{ width: '0%' }}
              />
            </div>

            <div className="home-coins">
              🪙 0
            </div>
          </div>
        </div>

      </header>

      <Dashboard
        onStartCampaign={onStartCampaign}
      />
    </section>
  )
}

export default Home