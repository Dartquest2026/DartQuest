import { useCallback, useEffect, useState } from 'react'

import Home from '../features/home/Home'
import Singleplayer from '../features/singleplayer/Singleplayer'
import Campaign from '../features/campaign/Campaign'
import CampaignModes from '../features/campaignModes/CampaignModes'
import CheckoutCampaign from '../features/campaignModes/CheckoutCampaign'
import RivalCampaign from '../features/campaignModes/RivalCampaign'
import Multiplayer from '../features/multiplayer/Multiplayer'
import AuthScreen from '../features/auth/AuthScreen'
import PasswordRecoveryScreen from '../features/auth/PasswordRecoveryScreen'
import {
  isPasswordRecoveryLocation,
  PASSWORD_RESET_PATH,
} from '../features/auth/passwordRecovery'
import Profile from '../features/profile/Profile'
import Settings from '../features/settings/Settings'
import { applySettings, loadSettings } from '../features/settings/settingsStorage'
import Community from '../features/community/Community'
import { getPendingRequests } from '../features/community/communityStorage'
import {
  addProfileRewards,
  getSessionProfile,
  logoutProfile,
  subscribeToAuthChanges,
  spendProfileCoins,
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
  const [recoveryRoute, setRecoveryRoute] = useState(
    () => window.location.pathname === PASSWORD_RESET_PATH,
  )
  const [recoveryStatus, setRecoveryStatus] = useState('checking')
  const [loginMessage, setLoginMessage] = useState('')

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const refresh = () => applySettings(loadSettings(), document.documentElement, media)
    refresh()
    media.addEventListener?.('change', refresh)
    window.addEventListener('dartquest:settings', refresh)
    return () => { media.removeEventListener?.('change', refresh); window.removeEventListener('dartquest:settings', refresh) }
  }, [])
  const [activeProfile, setActiveProfile] =
    useState(null)

  const [authLoading, setAuthLoading] =
    useState(true)

  const [authError, setAuthError] =
    useState('')

  const [pendingRequests, setPendingRequests] = useState([])

  const [activePage, setActivePage] =
    useState('home')

  const [rootNavigationKeys, setRootNavigationKeys] =
    useState({ home: 0, campaign: 0, community: 0, profile: 0 })

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
    const recoveryLocation = isPasswordRecoveryLocation()
    const recoverySearch = new URLSearchParams(window.location.search)
    const recoveryHash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const recoveryError = recoverySearch.has('error') || recoveryHash.has('error')
    let recoveryTimer

    if (recoveryRoute) {
      recoveryTimer = window.setTimeout(() => {
        if (mounted) {
          window.history.replaceState(null, '', PASSWORD_RESET_PATH)
          setRecoveryStatus('invalid')
        }
      }, recoveryError || !recoveryLocation ? 0 : 3000)
    }

    const initialProfile = recoveryRoute
      ? Promise.resolve(null)
      : getSessionProfile()

    initialProfile
      .then((profile) => {
        if (mounted) setActiveProfile(profile)
      })
      .catch((error) => {
        if (mounted) setAuthError(error.message)
      })
      .finally(() => {
        if (mounted) setAuthLoading(false)
      })

    const unsubscribe = subscribeToAuthChanges((profile, error, event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' && recoveryRoute && session) {
        window.clearTimeout(recoveryTimer)
        window.history.replaceState(null, '', PASSWORD_RESET_PATH)
        setRecoveryStatus('ready')
        setAuthLoading(false)
        return
      }
      if (recoveryRoute) {
        setAuthLoading(false)
        return
      }
      setActiveProfile(profile)
      setAuthError(error?.message ?? '')
      setAuthLoading(false)
      if (!profile) {
        setPendingRequests([])
        setActivePage('home')
      }
    })

    return () => {
      mounted = false
      window.clearTimeout(recoveryTimer)
      unsubscribe()
    }
  }, [recoveryRoute])

  function returnToLogin(message) {
    window.history.replaceState(null, '', '/')
    setLoginMessage(message)
    setRecoveryRoute(false)
    setRecoveryStatus('checking')
    setActiveProfile(null)
    setAuthLoading(false)
  }

  const refreshPendingRequests = useCallback(async () => {
    if (!activeProfile) { setPendingRequests([]); return [] }
    try {
      const requests = await getPendingRequests()
      setPendingRequests(requests)
      return requests
    } catch {
      setPendingRequests([])
      return []
    }
  }, [activeProfile])

  useEffect(() => {
    if (!activeProfile) return undefined
    const initialTimer = window.setTimeout(refreshPendingRequests, 0)
    const timer = window.setInterval(refreshPendingRequests, 30000)
    const refreshOnFocus = () => refreshPendingRequests()
    window.addEventListener('focus', refreshOnFocus)
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); window.removeEventListener('focus', refreshOnFocus) }
  }, [activeProfile, refreshPendingRequests])

  async function logout() {
    try {
      await logoutProfile()
      setActiveProfile(null)
      setPendingRequests([])
      setActivePage('home')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  async function refreshActiveProfile() {
    const profile = await getSessionProfile()
    if (profile) setActiveProfile(profile)
    return profile
  }

  async function applyProfileRewards(rewards) {
    const profile = await addProfileRewards(rewards)
    setActiveProfile(profile)
    return profile
  }

  async function applyCoinPurchase(amount) {
    const profile = await spendProfileCoins(amount)
    setActiveProfile(profile)
    return profile
  }

  function openRoot(destination) {
    setRootNavigationKeys((current) => ({
      ...current,
      [destination]: current[destination] + 1,
    }))

    if (destination === 'campaign') {
      continueSoloCampaign()
      return
    }

    if (destination === 'home' || destination === 'profile') {
      refreshActiveProfile().catch((error) => setAuthError(error.message))
    }

    setActivePage(destination)
  }

  function navigateToRoot(destination) {
    const campaignIsOpen =
      activePage === 'singleplayerCampaign' ||
      activePage === 'multiplayerCampaign'

    if (campaignIsOpen) {
      setPageAfterCampaignExit(destination)
      setCampaignExitRequest((request) => request + 1)
      return
    }

    openRoot(destination)
  }

  function finishCampaignExit() {
    const nextPage = pageAfterCampaignExit
    setCampaignExitRequest(0)
    setPageAfterCampaignExit('home')

    openRoot(nextPage)
  }

  if (recoveryRoute) {
    return (
      <PasswordRecoveryScreen
        status={recoveryStatus}
        onBackToLogin={returnToLogin}
      />
    )
  }

  if (authLoading) {
    return <main className="auth-screen"><p>Profil wird geladen …</p></main>
  }

  if (!activeProfile) {
    return (
      <>
        <AuthScreen initialMessage={loginMessage} onAuthenticated={(profile) => { setPendingRequests([]); setActiveProfile(profile); setAuthError(''); setLoginMessage('') }} />
        {authError && <p className="app-auth-error">{authError}</p>}
      </>
    )
  }

  return (
    <div className="app-shell">

      {/* HOME */}

      {activePage === 'home' && (
        <Home
          key={`home-root-${rootNavigationKeys.home}`}
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
          onOpenProfile={() => setActivePage('profile')}
          onOpenSettings={() => setActivePage('settings')}
          onSpendCoins={applyCoinPurchase}
        />
      )}


      {/* EINZELSPIELER */}

      {activePage ===
        'singleplayer' && (

        <Singleplayer
          activeProfile={activeProfile}
          onBack={() =>
            setActivePage('home')
          }

          onOpenCampaign={() =>
            setActivePage(
              'campaignModes',
            )
          }
        />
      )}

      {activePage === 'campaignModes' && (
        <CampaignModes
          onBack={() => setActivePage('singleplayer')}
          onSelect={(mode) => setActivePage(
            mode === 'standard' ? 'singleplayerDifficulty' : `${mode}Campaign`,
          )}
        />
      )}

      {activePage === 'checkoutCampaign' && (
        <CheckoutCampaign activeProfile={activeProfile} onProfileRewards={applyProfileRewards} onBack={() => setActivePage('campaignModes')} />
      )}

      {activePage === 'rivalCampaign' && (
        <RivalCampaign activeProfile={activeProfile} onProfileRewards={applyProfileRewards} onBack={() => setActivePage('campaignModes')} />
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
                  'campaignModes',
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
          activeProfile={activeProfile}
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
          key={`campaign-root-${rootNavigationKeys.campaign}`}
          settings={
            singleplayerCampaignSettings
          }
          exitRequest={campaignExitRequest}
          onExit={finishCampaignExit}
          activeProfile={activeProfile}
          onProfileRewards={applyProfileRewards}
          onOpenProfile={() => setActivePage('profile')}
          onLogout={logout}
        />
      )}


      {/* MEHRSPIELER-KAMPAGNE */}

      {activePage ===
        'multiplayerCampaign' && (

        <Campaign
          key={`campaign-root-${rootNavigationKeys.campaign}`}
          settings={
            multiplayerCampaignSettings
          }
          exitRequest={campaignExitRequest}
          onExit={finishCampaignExit}
          activeProfile={activeProfile}
          onProfileRewards={applyProfileRewards}
          onOpenProfile={() => setActivePage('profile')}
          onLogout={logout}
        />
      )}


      {/* PROFIL */}

      {activePage === 'profile' && (
        <Profile
          key={`profile-root-${rootNavigationKeys.profile}`}
          activeProfile={activeProfile}
          onLogout={logout}
          onProfileUpdated={refreshActiveProfile}
          onAccountDeleted={() => { setActiveProfile(null); setActivePage('home') }}
        />
      )}

      {activePage === 'settings' && (
        <Settings
          activeProfile={activeProfile}
          onBack={() => setActivePage('home')}
          onOpenProfile={() => setActivePage('profile')}
          onLogout={logout}
        />
      )}

      {activePage === 'community' && (
        <Community
          key={`community-root-${rootNavigationKeys.community}`}
          activeProfile={activeProfile}
          pendingRequests={pendingRequests}
          onRequestsChanged={refreshPendingRequests}
        />
      )}

      {/* NAVIGATION */}

      <BottomNav
        activePage={
          activePage
        }

        onChangePage={
          navigateToRoot
        }
        pendingRequestCount={pendingRequests.length}
      />

    </div>
  )
}

export default App
