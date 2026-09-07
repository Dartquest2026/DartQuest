import { useRef, useState } from 'react'

import {
  getMultiplayerSaves,
  MAX_MULTIPLAYER_SAVES,
} from './multiplayerSaves'
import StandardGame from '../standardGames/StandardGame'
import Training from '../training/Training'

import './Multiplayer.css'

const difficultyNames = {
  1: 'ANFÄNGER',
  2: 'LEICHT',
  3: 'MITTEL',
  4: 'SCHWER',
  5: 'PROFI',
}

const SHOW_DEFERRED_GAME_MODES = false
const PLAYER_COLORS = ['#42e695', '#4da3ff', '#ffd34c', '#bd7cff']

const difficulties = [
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

function Multiplayer({
  activeProfile,
  onBack,
  onStartCampaign,
  onContinueCampaign,
}) {
  const [players, setPlayers] = useState([
    {
      id: 1,
      name: activeProfile?.name || 'Spieler 1',
      userId: activeProfile?.id ?? null,
      active: true,
      color: PLAYER_COLORS[0],
    },
    {
      id: 2,
      name: '',
      active: false,
      color: PLAYER_COLORS[1],
    },
    {
      id: 3,
      name: '',
      active: false,
      color: PLAYER_COLORS[2],
    },
    {
      id: 4,
      name: '',
      active: false,
      color: PLAYER_COLORS[3],
    },
  ])

  const [selectedMode, setSelectedMode] =
    useState('entry')

  const [multiplayerSaves] = useState(
    getMultiplayerSaves,
  )

  const [campaignType, setCampaignType] =
    useState(null)

  const [difficulty, setDifficulty] =
    useState(null)
  const playerNameInputs = useRef({})

  const activePlayers = players.filter(
    (player) => player.active,
  )

  const playerCount = activePlayers.length

  function updatePlayerName(id, name) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === id
          ? { ...player, name }
          : player,
      ),
    )
  }

  function togglePlayer(id) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === id
          ? {
              ...player,
              active: !player.active,
            }
          : player,
      ),
    )
  }

  function continueToModes() {
    if (playerCount < 2) {
      return
    }

    setSelectedMode('modes')
    setCampaignType(null)
    setDifficulty(null)
  }

  function openCampaign() {
    setSelectedMode('campaign')
    setCampaignType(null)
    setDifficulty(null)
  }

  function selectCampaignType(type) {
    setCampaignType(type)
    setSelectedMode('difficulty')
    setDifficulty(null)
  }

  function goBack() {
    if (selectedMode === 'difficulty') {
      setSelectedMode('campaign')
      setDifficulty(null)
      return
    }

    if (selectedMode === 'campaign') {
      setSelectedMode('modes')
      setCampaignType(null)
      return
    }

    if (selectedMode === 'standard') {
      setSelectedMode('modes')
      return
    }

    if (selectedMode === 'training') {
      setSelectedMode('modes')
      return
    }

    if (selectedMode === 'modes') {
      setSelectedMode('players')
      return
    }

    if (
      selectedMode === 'players' ||
      selectedMode === 'saves'
    ) {
      setSelectedMode('entry')
      return
    }

    onBack?.()
  }

  function startCampaign(selectedDifficulty) {
    setDifficulty(selectedDifficulty)

    onStartCampaign?.({
      playerCount,
      players: activePlayers.map((player) => ({
        ...player,
        name: player.name.trim() || `Spieler ${player.id}`,
      })),
      campaignType,
      difficulty: selectedDifficulty,
      isNewGame: true,
    })
  }

  if (selectedMode === 'training') return <Training activeProfile={activeProfile} players={activePlayers.map((player) => ({ ...player, name:player.name.trim() || `Spieler ${player.id}` }))} onBack={() => setSelectedMode('modes')} />

  return (
    <main className="multiplayer-screen">

      {/* HEADER */}

      <header className="multiplayer-header">

        <button
          type="button"
          className="multiplayer-back"
          onClick={goBack}
        >
          ‹
        </button>

        <div>
          <span className="multiplayer-eyebrow">
            DARTQUEST
          </span>

          <h1>
            Mehrspieler
          </h1>
        </div>

      </header>


      {/* =====================================================
          HAUPTANSICHT
          ===================================================== */}

      {selectedMode === 'entry' && (
        <section className="multiplayer-entry">

          <section className="multiplayer-intro">

            <div className="multiplayer-intro-icon">
              👥
            </div>

            <h2>Wie möchtet ihr spielen?</h2>

            <p>
              Startet neu oder setzt eine Kampagne fort.
            </p>

          </section>

          <div className="multiplayer-entry-grid">

            <button
              type="button"
              className="multiplayer-entry-card"
              onClick={() =>
                setSelectedMode('players')
              }
            >
              <span className="multiplayer-entry-icon">
                ➕
              </span>

              <span className="multiplayer-entry-content">
                <strong>NEUES SPIEL</strong>
                <small>
                  Spieler auswählen und neue Runde starten
                </small>
              </span>

              <span className="multiplayer-entry-arrow">
                &rsaquo;
              </span>
            </button>

            <button
              type="button"
              className="multiplayer-entry-card saved"
              onClick={() =>
                setSelectedMode('saves')
              }
            >
              <span className="multiplayer-entry-icon">
                💾
              </span>

              <span className="multiplayer-entry-content">
                <strong>GESPEICHERTE SPIELE</strong>
                <small>
                  Gemeinsame Kampagne fortsetzen
                </small>
              </span>

              <span className="multiplayer-entry-arrow">
                &rsaquo;
              </span>
            </button>

          </div>

        </section>
      )}


      {selectedMode === 'saves' && (
        <section className="multiplayer-saves">

          <div className="multiplayer-saves-heading">
            <span>MEHRSPIELER</span>
            <h2>Gespeicherte Spiele</h2>
            <p>Bis zu drei gemeinsame Kampagnen.</p>
          </div>

          <div className="multiplayer-save-list">

            {Array.from(
              { length: MAX_MULTIPLAYER_SAVES },
              (_, index) => {
                const slotId = index + 1
                const save = multiplayerSaves.find(
                  (item) => item?.id === slotId,
                )

                if (!save) {
                  return (
                    <article
                      key={slotId}
                      className="multiplayer-save-card empty"
                    >
                      <span className="multiplayer-save-icon">
                        💾
                      </span>

                      <div>
                        <strong>
                          Speicherplatz {slotId}
                        </strong>
                        <small>Noch keine Kampagne</small>
                      </div>
                    </article>
                  )
                }

                const unlockedLevel =
                  save.unlockedLevel ?? 1
                const world = Math.max(
                  1,
                  Math.ceil(unlockedLevel / 10),
                )
                const stars = Object.values(
                  save.results ?? {},
                ).reduce(
                  (total, result) =>
                    total + (result?.stars ?? 0),
                  0,
                )
                const savedPlayers = (save.players ?? [])
                  .filter((player) => String(player?.name ?? '').trim())
                const isVersus = (save.campaignType ?? 'coop') === 'versus'

                return (
                  <article
                    key={slotId}
                    className="multiplayer-save-card occupied"
                  >
                    <div className="multiplayer-save-title">
                      <span>SPEICHERPLATZ {slotId}</span>
                      <small className="multiplayer-save-mode">{isVersus ? 'VERSUS' : 'KOOP'}</small>
                    </div>

                    <div className="multiplayer-save-players">
                      {savedPlayers.map((player, playerIndex) => {
                        const personalLevel = save.versusProgress?.[player.id]?.levelId ?? 1
                        const playerColor = PLAYER_COLORS[Math.max(0, Math.min(3, Number(player.id ?? playerIndex + 1) - 1))]
                        return <div className="multiplayer-save-player" key={player.id ?? playerIndex}>
                          <i aria-hidden="true" style={{ '--saved-player-color': playerColor }} />
                          <strong title={player.name}>{player.name}</strong>
                          {isVersus && <small>Level {personalLevel}</small>}
                        </div>
                      })}
                    </div>

                    <div className="multiplayer-save-context">
                      <span>{difficultyNames[save.difficulty] ?? 'ANFÄNGER'}</span>
                      <b aria-hidden="true">·</b>
                      <span>Welt {world}</span>
                      {!isVersus && <><b aria-hidden="true">·</b><span>Level {unlockedLevel}</span></>}
                    </div>

                    <div className="multiplayer-save-rewards">
                      <span>★ {stars} Sterne</span>
                      <span>XP {save.xp ?? 0}</span>
                      <span>🪙 {save.coins ?? 0} Coins</span>
                    </div>

                    <p className="multiplayer-save-date">
                      Zuletzt gespielt:{' '}
                      {save.lastPlayed
                        ? new Date(
                            save.lastPlayed,
                          ).toLocaleDateString('de-DE')
                        : '–'}
                    </p>

                    <button
                      type="button"
                      className="multiplayer-save-continue"
                      onClick={() =>
                        onContinueCampaign?.(
                          save,
                          index,
                        )
                      }
                    >
                      FORTSETZEN
                    </button>
                  </article>
                )
              },
            )}

          </div>

        </section>
      )}

      {selectedMode === 'players' && (
        <section className="multiplayer-player-select">

          <section className="multiplayer-intro">

            <div className="multiplayer-intro-icon">
              👥
            </div>

            <h2>Wer spielt mit?</h2>

            <p>
              Aktiviere mindestens einen weiteren Spieler.
            </p>

          </section>

          <div className="multiplayer-player-list">

            {players.map((player) => (
              <article
                key={player.id}
                className={[
                  'multiplayer-player-card',
                  player.active ? 'active' : '',
                ].join(' ')}
                style={{ '--player-color': player.color }}
              >

                <span className="multiplayer-player-number">
                  {player.id}
                </span>

                <div className="multiplayer-player-field">
                  <small>
                    {player.id === 1
                      ? 'HAUPTSPIELER'
                      : `SPIELER ${player.id}`}
                  </small>

                  {player.id === 1 ? (
                    <strong>{player.name}</strong>
                  ) : (
                    <span className="multiplayer-player-input-wrap">
                      <input
                        ref={(node) => { playerNameInputs.current[player.id] = node }}
                        type="text"
                        value={player.name}
                        placeholder={`Spieler ${player.id}`}
                        maxLength="24"
                        aria-label={`Name für Spieler ${player.id}`}
                        onChange={(event) => updatePlayerName(player.id, event.target.value)}
                      />
                      {player.name && <button
                        type="button"
                        className="multiplayer-player-clear"
                        aria-label={`Name von Spieler ${player.id} leeren`}
                        title="Name leeren"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          updatePlayerName(player.id, '')
                          playerNameInputs.current[player.id]?.focus()
                        }}
                      >×</button>}
                    </span>
                  )}
                </div>

                {player.id === 1 ? (
                  <span className="multiplayer-player-fixed">
                    ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    className="multiplayer-player-toggle"
                    onClick={() =>
                      togglePlayer(player.id)
                    }
                    aria-label={
                      player.active
                        ? `Spieler ${player.id} entfernen`
                        : `Spieler ${player.id} aktivieren`
                    }
                  >
                    {player.active ? '−' : '+'}
                  </button>
                )}

              </article>
            ))}

          </div>

          <p className="multiplayer-player-summary">
            {playerCount} Spieler ausgewählt
          </p>

          <button
            type="button"
            className="multiplayer-continue"
            disabled={playerCount < 2}
            onClick={continueToModes}
          >
            WEITER
          </button>

        </section>
      )}


      {selectedMode === 'modes' && (
        <section className="multiplayer-mode-section">

              <div className="multiplayer-mode-heading">

                <span>
                  {playerCount} SPIELER
                </span>

                <h2>
                  Was wollt ihr spielen?
                </h2>

              </div>


              <div className="multiplayer-mode-grid">

                <button
                  type="button"
                  className="multiplayer-mode-card"
                  onClick={openCampaign}
                >

                  <span className="multiplayer-mode-icon">
                    🗺️
                  </span>

                  <div>
                    <strong>
                      Kampagne
                    </strong>

                    <small>
                      Gemeinsam oder gegeneinander
                    </small>
                  </div>

                  <span className="multiplayer-mode-arrow">
                    ›
                  </span>

                </button>


                <button
                  type="button"
                  className="multiplayer-mode-card"
                  onClick={() => setSelectedMode('training')}
                >

                  <span className="multiplayer-mode-icon">
                    🎯
                  </span>

                  <div>
                    <strong>
                      Training
                    </strong>

                    <small>
                      Gemeinsam trainieren
                    </small>
                  </div>

                  <span className="multiplayer-mode-arrow">
                    ›
                  </span>

                </button>


                {SHOW_DEFERRED_GAME_MODES && <button
                  type="button"
                  className="multiplayer-mode-card"
                  onClick={() => setSelectedMode('standard')}
                >

                  <span className="multiplayer-mode-icon">
                    🎮
                  </span>

                  <div>
                    <strong>
                      Standardspiele
                    </strong>

                    <small>
                      501 mit Double Out
                    </small>
                  </div>

                  <span className="multiplayer-mode-arrow">
                    ›
                  </span>

                </button>}

              </div>

        </section>
      )}

      {selectedMode === 'standard' && (
        <StandardGame
          initialPlayers={activePlayers.map((player) => player.name)}
          activeProfile={activeProfile}
          onBack={() => setSelectedMode('modes')}
        />
      )}



      {/* =====================================================
          KAMPAGNE – KOOP ODER VERSUS
          ===================================================== */}

      {selectedMode === 'campaign' && (
        <section className="multiplayer-campaign-select">

          <div className="multiplayer-campaign-heading">

            <span>
              {playerCount} SPIELER · KAMPAGNE
            </span>

            <h2>
              Wie wollt ihr spielen?
            </h2>

            <p>
              Wählt zwischen gemeinsamem
              Fortschritt oder einem direkten
              Wettkampf.
            </p>

          </div>


          <div className="campaign-type-grid">

            <button
              type="button"
              className="campaign-type-card coop"
              onClick={() =>
                selectCampaignType('coop')
              }
            >

              <div className="campaign-type-icon">
                🤝
              </div>

              <div className="campaign-type-content">

                <span>
                  MITEINANDER
                </span>

                <strong>
                  Koop-Kampagne
                </strong>

                <p>
                  Ihr arbeitet gemeinsam
                  an derselben Aufgabe.
                </p>

              </div>

              <span className="campaign-type-arrow">
                ›
              </span>

            </button>


            <button
              type="button"
              className="campaign-type-card versus"
              onClick={() =>
                selectCampaignType('versus')
              }
            >

              <div className="campaign-type-icon">
                ⚔️
              </div>

              <div className="campaign-type-content">

                <span>
                  GEGENEINANDER
                </span>

                <strong>
                  Versus-Kampagne
                </strong>

                <p>
                  Jeder Spieler arbeitet
                  an seinem eigenen Fortschritt.
                </p>

              </div>

              <span className="campaign-type-arrow">
                ›
              </span>

            </button>

          </div>

        </section>
      )}


      {/* =====================================================
          SCHWIERIGKEITSSTUFE
          ===================================================== */}

      {selectedMode === 'difficulty' && (
        <section className="multiplayer-difficulty">

          <div className="multiplayer-campaign-heading">

            <span>
              {playerCount} SPIELER ·{' '}
              {campaignType === 'coop'
                ? 'KOOP'
                : 'VERSUS'}
            </span>

            <h2>
              Welche Schwierigkeitsstufe?
            </h2>

            <p>
              Wählt die Kampagne, die zu eurem
              Spielniveau passt.
            </p>

          </div>


          <div className="difficulty-grid">

            {difficulties.map((item) => (
              <button
                key={item.id}
                type="button"

                className={[
                  'difficulty-card',

                  difficulty === item.id
                    ? 'selected'
                    : '',
                ].join(' ')}

                onClick={() =>
                  startCampaign(item.id)
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
                  ›
                </span>

              </button>
            ))}

          </div>

        </section>
      )}

    </main>
  )
}

export default Multiplayer
