import { useState } from 'react'

import Home from '../features/home/Home'
import Campaign from '../features/campaign/Campaign'
import Multiplayer from '../features/multiplayer/Multiplayer'
import BottomNav from '../shared/components/BottomNav'

import './App.css'
import '../shared/styles/BottomNav.css'
import '../features/campaign/LevelModal.css'

function App() {
  const [activePage, setActivePage] =
    useState('home')

  const [
    campaignSettings,
    setCampaignSettings,
  ] = useState({
    multiplayer: false,
    playerCount: 1,
    campaignType: 'solo',
    difficulty: 1,
  })

  function startSoloCampaign() {
    setCampaignSettings({
      multiplayer: false,
      playerCount: 1,
      campaignType: 'solo',
      difficulty: 1,
    })

    setActivePage('campaign')
  }

  function startMultiplayerCampaign(
    settings,
  ) {
    setCampaignSettings({
      multiplayer: true,
      playerCount:
        settings.playerCount,
      campaignType:
        settings.campaignType,
      difficulty:
        settings.difficulty,
    })

    setActivePage('campaign')
  }

  return (
    <div className="app-shell">

      {/* HOME */}

      {activePage === 'home' && (
        <Home
          onStartCampaign={
            startSoloCampaign
          }

          onOpenSingleplayer={() =>
            setActivePage(
              'singleplayer',
            )
          }

          onOpenMultiplayer={() =>
            setActivePage(
              'multiplayer',
            )
          }
        />
      )}


      {/* EINZELSPIELER */}

      {activePage ===
        'singleplayer' && (

        <section
          style={{
            padding: 20,
          }}
        >

          <h2>
            👤 Einzelspieler
          </h2>

          <p>
            Wähle deinen Spielmodus.
          </p>


          <button
            type="button"
            onClick={
              startSoloCampaign
            }
          >
            🗺️ Kampagne fortsetzen
          </button>


          <button
            type="button"
          >
            🎯 Training
          </button>


          <button
            type="button"
          >
            🎮 Standardspiele
          </button>

        </section>
      )}


      {/* MEHRSPIELER */}

      {activePage ===
        'multiplayer' && (

        <Multiplayer
          onBack={() =>
            setActivePage('home')
          }

          onStartCampaign={
            startMultiplayerCampaign
          }
        />
      )}


      {/* KAMPAGNE */}

      {activePage ===
        'campaign' && (

        <Campaign
          settings={
            campaignSettings
          }
        />
      )}


      {/* ERFOLGE */}

      {activePage ===
        'achievements' && (

        <div
          style={{
            padding: 20,
          }}
        >

          <h2>
            🏆 Erfolge
          </h2>

          <p>
            Kommt bald...
          </p>

        </div>
      )}


      {/* PROFIL */}

      {activePage ===
        'profile' && (

        <div
          style={{
            padding: 20,
          }}
        >

          <h2>
            👤 Profil
          </h2>

          <p>
            Kommt bald...
          </p>

        </div>
      )}


      {/* NAVIGATION */}

      <BottomNav
        activePage={
          activePage
        }

        onChangePage={
          setActivePage
        }
      />

    </div>
  )
}

export default App