import { useState } from 'react'

import Home from '../features/home/Home'
import Singleplayer from '../features/singleplayer/Singleplayer'
import Campaign from '../features/campaign/Campaign'
import Multiplayer from '../features/multiplayer/Multiplayer'
import AuthScreen from '../features/auth/AuthScreen'
import Profile from '../features/profile/Profile'
import { getActiveProfile, logoutProfile } from '../features/auth/profileStorage'
import BottomNav from '../shared/components/BottomNav'

import './App.css'
import '../shared/styles/BottomNav.css'
import '../features/campaign/LevelModal.css'

const SINGLEPLAYER_DIFFICULTY_STORAGE_KEY =
  'dartquest-singleplayer-difficulty'

const soloDifficulties = [
  {
    id: 1,
    name: 'Anfänger',
    icon: '🟢',
    description:
      'Für absolute Anfänger und junge Spieler',
  },
  {
    id: 2,
    name: 'Leicht',
    icon: '🔵',
    description:
      'Für Spieler mit ersten Dart-Erfahrungen',
  },
  {
    id: 3,
    name: 'Mittel',
    icon: '🟡',
    description:
      'Für regelmäßige Hobbyspieler',
  },
  {
    id: 4,
    name: 'Schwer',
    icon: '🟠',
    description:
      'Für gute und erfahrene Dartspieler',
  },
  {
    id: 5,
    name: 'Profi',
    icon: '🔴',
    description:
      'Für sehr starke Spieler und maximale Herausforderung',
  },
]

function App() {
  const [activeProfile, setActiveProfile] =
    useState(getActiveProfile)

  const [activePage, setActivePage] =
    useState('home')

  const [campaignExitRequest, setCampaignExitRequest] =
    useState(0)

  const [
    singleplayerCampaignSettings,
    setSingleplayerCampaignSettings,
  ] = useState({
    multiplayer: false,
    playerCount: 1,
    campaignType: 'solo',
    difficulty: 1,
  })

  const [
    multiplayerCampaignSettings,
    setMultiplayerCampaignSettings,
  ] = useState({
    multiplayer: true,
    playerCount: 2,
    players: [],
    campaignType: 'coop',
    difficulty: 1,
    savedGame: null,
    saveSlotId: null,
    slotIndex: null,
  })

  function startSoloCampaign(difficulty) {
    localStorage.setItem(
      SINGLEPLAYER_DIFFICULTY_STORAGE_KEY,
      String(difficulty),
    )

    setSingleplayerCampaignSettings({
      multiplayer: false,
      playerCount: 1,
      campaignType: 'solo',
      difficulty,
    })

    setActivePage(
      'singleplayerCampaign',
    )
  }

  function continueSoloCampaign() {
    const savedDifficulty = Number(
      localStorage.getItem(
        SINGLEPLAYER_DIFFICULTY_STORAGE_KEY,
      ),
    )

    if (
      Number.isInteger(savedDifficulty) &&
      savedDifficulty >= 1 &&
      savedDifficulty <= 5
    ) {
      startSoloCampaign(savedDifficulty)
      return
    }

    setActivePage(
      'singleplayerDifficulty',
    )
  }

  function startMultiplayerCampaign(
    settings,
  ) {
    setMultiplayerCampaignSettings({
      multiplayer: true,
      playerCount:
        settings.playerCount,
      players:
        settings.players,
      campaignType:
        settings.campaignType,
      difficulty:
        settings.difficulty,
      savedGame: null,
      saveSlotId: null,
      slotIndex: null,
    })

    setActivePage(
      'multiplayerCampaign',
    )
  }

  function continueMultiplayerCampaign(
    savedGame,
    slotIndex,
  ) {
    setMultiplayerCampaignSettings({
      multiplayer: true,
      playerCount:
        savedGame.playerCount ??
        savedGame.players?.length ??
        2,
      players:
        savedGame.players ?? [],
      campaignType:
        savedGame.campaignType,
      difficulty:
        savedGame.difficulty,
      savedGame,
      saveSlotId:
        savedGame.id ?? slotIndex + 1,
      slotIndex,
    })

    setActivePage(
      'multiplayerCampaign',
    )
  }

  function logout() {
    logoutProfile()
    setActiveProfile(null)
    setActivePage('home')
  }

  function changePage(nextPage) {
    const campaignIsOpen =
      activePage === 'singleplayerCampaign' ||
      activePage === 'multiplayerCampaign'

    if (campaignIsOpen && nextPage === 'home') {
      setCampaignExitRequest((request) => request + 1)
      return
    }

    setActivePage(nextPage)
  }

  if (!activeProfile) {
    return <AuthScreen onAuthenticated={setActiveProfile} />
  }

  return (
    <div className="app-shell">

      {/* HOME */}

      {activePage === 'home' && (
        <Home
          onContinueCampaign={
            continueSoloCampaign
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

        <Singleplayer
          onBack={() =>
            setActivePage('home')
          }

          onOpenCampaign={() =>
            setActivePage(
              'singleplayerDifficulty',
            )
          }
        />
      )}


      {/* EINZELSPIELER-SCHWIERIGKEIT */}

      {activePage ===
        'singleplayerDifficulty' && (

        <main className="multiplayer-screen">

          <header className="multiplayer-header">

            <button
              type="button"
              className="multiplayer-back"
              onClick={() =>
                setActivePage(
                  'singleplayer',
                )
              }
            >
              &lsaquo;
            </button>

            <div>
              <span className="multiplayer-eyebrow">
                DARTQUEST
              </span>

              <h1>
                Einzelspieler
              </h1>
            </div>

          </header>

          <section className="multiplayer-difficulty">

            <div className="multiplayer-campaign-heading">

              <span>
                1 SPIELER · KAMPAGNE
              </span>

              <h2>
                Welche Schwierigkeitsstufe?
              </h2>

              <p>
                Wähle die Kampagne, die zu deinem
                Spielniveau passt.
              </p>

            </div>

            <div className="difficulty-grid">

              {soloDifficulties.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="difficulty-card"
                  onClick={() =>
                    startSoloCampaign(item.id)
                  }
                >

                  <span className="difficulty-icon">
                    {item.icon}
                  </span>

                  <div className="difficulty-content">

                    <small>
                      STUFE {item.id}
                    </small>

                    <strong>
                      {item.name}
                    </strong>

                    <p>
                      {item.description}
                    </p>

                  </div>

                  <span className="difficulty-arrow">
                    &rsaquo;
                  </span>

                </button>
              ))}

            </div>

          </section>

        </main>
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

          onContinueCampaign={
            continueMultiplayerCampaign
          }
        />
      )}


      {/* EINZELSPIELER-KAMPAGNE */}

      {activePage ===
        'singleplayerCampaign' && (

        <Campaign
          settings={
            singleplayerCampaignSettings
          }
          exitRequest={campaignExitRequest}
          onExit={() => {
            setCampaignExitRequest(0)
            setActivePage('home')
          }}
        />
      )}


      {/* MEHRSPIELER-KAMPAGNE */}

      {activePage ===
        'multiplayerCampaign' && (

        <Campaign
          settings={
            multiplayerCampaignSettings
          }
          exitRequest={campaignExitRequest}
          onExit={() => {
            setCampaignExitRequest(0)
            setActivePage('home')
          }}
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

      {activePage === 'profile' && (
        <Profile
          activeProfile={activeProfile}
          onProfileChanged={setActiveProfile}
          onLogout={logout}
        />
      )}

      {/* NAVIGATION */}

      <BottomNav
        activePage={
          activePage
        }

        onChangePage={
          changePage
        }
      />

    </div>
  )
}

export default App
