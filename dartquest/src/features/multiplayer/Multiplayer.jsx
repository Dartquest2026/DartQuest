import { useState } from 'react'

import {
  getMultiplayerSaves,
  MAX_MULTIPLAYER_SAVES,
} from './multiplayerSaves'
import StandardGame from '../standardGames/StandardGame'
import { NewBadge, useNewFeatures } from '../releases/NewFeatures'

import './Multiplayer.css'

const difficultyNames = {
  1: 'ANFÄNGER',
  2: 'LEICHT',
  3: 'MITTEL',
  4: 'SCHWER',
  5: 'PROFI',
}

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
  const { markSeen } = useNewFeatures()
  const [players, setPlayers] = useState([
    {
      id: 1,
      name: activeProfile?.name || 'Spieler 1',
      userId: activeProfile?.id ?? null,
      active: true,
    },
    {
      id: 2,
      name: 'Spieler 2',
      active: false,
    },
    {
      id: 3,
      name: 'Spieler 3',
      active: false,
    },
    {
      id: 4,
      name: 'Spieler 4',
      active: false,
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
      players: activePlayers,
      campaignType,
      difficulty: selectedDifficulty,
      isNewGame: true,
    })
  }

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
                const progress = Math.min(
                  100,
                  Math.round(unlockedLevel),
                )
                const stars = Object.values(
                  save.results ?? {},
                ).reduce(
                  (total, result) =>
                    total + (result?.stars ?? 0),
                  0,
                )
                const playerNames = (
                  save.players ?? []
                )
                  .map((player) => player.name)
                  .filter(Boolean)
                  .join(' & ')

                return (
                  <article
                    key={slotId}
                    className="multiplayer-save-card occupied"
                  >
                    <div className="multiplayer-save-title">
                      <span>Speicherplatz {slotId}</span>
                      <strong>
                        {playerNames || 'Mehrspieler-Kampagne'}
                      </strong>
                      <small>
                        {(save.campaignType ?? 'coop').toUpperCase()}
                        {' · '}
                        {difficultyNames[save.difficulty] ?? 'ANFÄNGER'}
                        {' · '}
                        {save.playerCount ?? save.players?.length ?? 0}
                        {' SPIELER'}
                      </small>
                    </div>

                    <div className="multiplayer-save-progress">
                      <span>Welt {world}</span>
                      <span>Level {unlockedLevel}</span>
                      <span>Fortschritt {progress} %</span>
                    </div>

                    <div className="multiplayer-save-rewards">
                      <span>⭐ {stars} Sterne</span>
                      <span>⭐ {save.xp ?? 0} XP</span>
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
                    <input
                      type="text"
                      value={player.name}
                      maxLength="24"
                      aria-label={`Name für Spieler ${player.id}`}
                      onChange={(event) =>
                        updatePlayerName(
                          player.id,
                          event.target.value,
                        )
                      }
                    />
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


                <button
                  type="button"
                  className="multiplayer-mode-card"
                  onClick={() => { markSeen('standard-games'); setSelectedMode('standard') }}
                >

                  <span className="multiplayer-mode-icon">
                    🎮
                  </span>

                  <div>
                    <strong>
                      Standardspiele <NewBadge featureId="standard-games" />
                    </strong>

                    <small>
                      501 mit Double Out
                    </small>
                  </div>

                  <span className="multiplayer-mode-arrow">
                    ›
                  </span>

                </button>

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
