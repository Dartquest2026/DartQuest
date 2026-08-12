import { useEffect, useState } from 'react'

import Home from '../features/home/Home'
import Singleplayer from '../features/singleplayer/Singleplayer'
import Campaign from '../features/campaign/Campaign'
import Multiplayer from '../features/multiplayer/Multiplayer'
import AuthScreen from '../features/auth/AuthScreen'
import Profile from '../features/profile/Profile'
import Leaderboard from '../features/leaderboard/Leaderboard'
import {
  getSessionProfile,
  logoutProfile,
  subscribeToAuthChanges,
} from '../features/auth/profileStorage'
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
    useState(null)

  const [authLoading, setAuthLoading] =
    useState(true)

  const [authError, setAuthError] =
    useState('')

  const [activePage, setActivePage] =
    useState('home')

  const [campaignExitRequest, setCampaignExitRequest] =
    useState(0)

  const [pageAfterCampaignExit, setPageAfterCampaignExit] =
    useState('home')

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
    isNewGame: true,
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
      isNewGame: true,
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
      isNewGame: false,
      savedGame,
      saveSlotId:
        savedGame.id ?? slotIndex + 1,
      slotIndex,
    })

    setActivePage(
      'multiplayerCampaign',
    )
  }

  useEffect(() => {
    let mounted = true

    getSessionProfile()
      .then((profile) => {
        if (mounted) setActiveProfile(profile)
      })
      .catch((error) => {
        if (mounted) setAuthError(error.message)
      })
      .finally(() => {
        if (mounted) setAuthLoading(false)
      })

    const unsubscribe = subscribeToAuthChanges((profile, error) => {
      if (!mounted) return
      setActiveProfile(profile)
      setAuthError(error?.message ?? '')
      setAuthLoading(false)
      if (!profile) setActivePage('home')
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  async function logout() {
    try {
      await logoutProfile()
      setActiveProfile(null)
      setActivePage('home')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  function changePage(nextPage) {
    const campaignIsOpen =
      activePage === 'singleplayerCampaign' ||
      activePage === 'multiplayerCampaign'

    if (campaignIsOpen && nextPage !== activePage) {
      setPageAfterCampaignExit(nextPage)
      setCampaignExitRequest((request) => request + 1)
      return
    }

    if (nextPage === 'campaign') {
      continueSoloCampaign()
      return
    }

    setActivePage(nextPage)
  }

  function finishCampaignExit() {
    const nextPage = pageAfterCampaignExit
    setCampaignExitRequest(0)
    setPageAfterCampaignExit('home')

    if (nextPage === 'campaign') {
      continueSoloCampaign()
      return
    }

    setActivePage(nextPage)
  }

  if (authLoading) {
    return <main className="auth-screen"><p>Profil wird geladen …</p></main>
  }

  if (!activeProfile) {
    return (
      <>
        <AuthScreen onAuthenticated={(profile) => { setActiveProfile(profile); setAuthError('') }} />
        {authError && <p className="app-auth-error">{authError}</p>}
      </>
    )
  }

  return (
    <div className="app-shell">

      {/* HOME */}

      {activePage === 'home' && (
        <Home
          activeProfile={activeProfile}
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
          onExit={finishCampaignExit}
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
          onExit={finishCampaignExit}
        />
      )}


      {/* PROFIL */}

      {activePage === 'profile' && (
        <Profile
          activeProfile={activeProfile}
          onLogout={logout}
        />
      )}

      {activePage === 'leaderboard' && (
        <Leaderboard
          activeProfile={activeProfile}
          onBack={() => setActivePage('home')}
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
