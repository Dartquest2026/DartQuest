import { useState } from 'react'

import './Multiplayer.css'

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
  onBack,
  onStartCampaign,
}) {
  const [playerCount, setPlayerCount] =
    useState(null)

  const [selectedMode, setSelectedMode] =
    useState(null)

  const [campaignType, setCampaignType] =
    useState(null)

  const [difficulty, setDifficulty] =
    useState(null)

  function selectPlayers(count) {
    setPlayerCount(count)

    setSelectedMode(null)
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
      setSelectedMode(null)
      setCampaignType(null)
      return
    }

    onBack?.()
  }

  function startCampaign(selectedDifficulty) {
    setDifficulty(selectedDifficulty)

    onStartCampaign?.({
      playerCount,
      campaignType,
      difficulty: selectedDifficulty,
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

      {selectedMode === null && (
        <>

          <section className="multiplayer-intro">

            <div className="multiplayer-intro-icon">
              👥
            </div>

            <h2>
              Wie viele Spieler?
            </h2>

            <p>
              Wähle aus, wie viele Spieler
              gemeinsam spielen.
            </p>

          </section>


          <section className="player-count-grid">

            {[2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"

                className={[
                  'player-count-card',

                  playerCount === count
                    ? 'selected'
                    : '',
                ].join(' ')}

                onClick={() =>
                  selectPlayers(count)
                }
              >

                <span className="player-count-icon">
                  {count === 2 && '👥'}
                  {count === 3 && '👥👤'}
                  {count === 4 && '👥👥'}
                </span>

                <strong>
                  {count}
                </strong>

                <small>
                  Spieler
                </small>

              </button>
            ))}

          </section>


          {playerCount && (
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
                >

                  <span className="multiplayer-mode-icon">
                    🎮
                  </span>

                  <div>
                    <strong>
                      Standardspiele
                    </strong>

                    <small>
                      501 und weitere Spiele
                    </small>
                  </div>

                  <span className="multiplayer-mode-arrow">
                    ›
                  </span>

                </button>

              </div>

            </section>
          )}

        </>
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