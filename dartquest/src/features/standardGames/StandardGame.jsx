import { useEffect, useRef, useState } from 'react'
import Settings from '../settings/Settings'
import { createDart, createX01Match, playerAverage, throwX01Dart, undoX01 } from './x01Engine'
import './StandardGame.css'

function StandardGame({ initialPlayers = ['Spieler 1'], activeProfile, onBack }) {
  const [names, setNames] = useState(initialPlayers.map((name) => String(name)))
  const [startPlayerIndex, setStartPlayerIndex] = useState(0)
  const [match, setMatch] = useState(null)
  const [segment, setSegment] = useState(20)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuButton = useRef(null)
  const validSetup = names.length >= 1 && names.length <= 4 && names.every((name) => name.trim())

  useEffect(() => {
    if (!menuOpen && !confirmation) return undefined
    const closeOverlay = (event) => {
      if (event.key !== 'Escape') return
      if (confirmation) setConfirmation(null)
      else {
        setMenuOpen(false)
        window.setTimeout(() => menuButton.current?.focus(), 0)
      }
    }
    window.addEventListener('keydown', closeOverlay)
    return () => window.removeEventListener('keydown', closeOverlay)
  }, [confirmation, menuOpen])

  function startMatch() { if (validSetup) setMatch(createX01Match({ names, startPlayerIndex })) }
  function addDart(dart) { setMatch((current) => throwX01Dart(current, dart)) }
  function restart() { setMatch(createX01Match({ names, startPlayerIndex })); setConfirmation(null); setMenuOpen(false) }
  function leaveMatch() { setMatch(null); setConfirmation(null); setMenuOpen(false) }

  if (settingsOpen) return <div className="standard-settings"><Settings activeProfile={activeProfile} onBack={() => { setSettingsOpen(false); window.setTimeout(() => menuButton.current?.focus(), 0) }} /></div>

  if (!match) return <main className="standard-game setup">
    <header><button type="button" onClick={onBack} aria-label="Zurück">‹</button><div><span>STANDARDSPIEL</span><h1>501</h1></div></header>
    <section className="standard-panel"><h2>Match einrichten</h2><p>501 · Double Out · maximal drei Darts pro Aufnahme</p>
      <div className="standard-name-list">{names.map((name, index) => <label key={index}>Spieler {index + 1}<input value={name} maxLength="24" onChange={(event) => setNames((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}</div>
      <label>Startspieler<select value={startPlayerIndex} onChange={(event) => setStartPlayerIndex(Number(event.target.value))}>{names.map((name, index) => <option key={index} value={index}>{name.trim() || `Spieler ${index + 1}`}</option>)}</select></label>
      <button className="standard-primary" type="button" disabled={!validSetup} onClick={startMatch}>501 STARTEN</button>
      <details><summary>Regeln</summary><p>Von 501 exakt auf 0 spielen. Der letzte Dart muss ein Double sein. Überwerfen, Rest 1 oder ein unzulässiger letzter Dart erzeugen einen Bust; der Stand vom Beginn der Aufnahme wird wiederhergestellt.</p></details>
    </section>
  </main>

  const currentPlayer = match.players[match.currentPlayerIndex]
  const winner = match.winnerIndex == null ? null : match.players[match.winnerIndex]
  return <main className="standard-game">
    <header><button ref={menuButton} type="button" onClick={() => setMenuOpen(true)} aria-label="Pausenmenü öffnen">☰</button><div><span>501 · DOUBLE OUT</span><h1>{winner ? 'Match beendet' : `${currentPlayer.name} ist am Zug`}</h1></div></header>
    <section className="standard-scoreboard" aria-label="Punktestände">{match.players.map((player, index) => <article key={player.id} className={index === match.currentPlayerIndex ? 'active' : ''}><span>{player.name}</span><strong>{player.score}</strong><small>{player.dartsThrown} Darts · Ø {playerAverage(player).toFixed(1)}</small></article>)}</section>
    <p className="standard-live" aria-live="polite">{match.notice}</p>
    {!winner && <section className="standard-input"><div className="standard-visit"><span>Aufnahme</span>{[0, 1, 2].map((index) => <strong key={index}>{match.currentVisit[index]?.label ?? '–'}</strong>)}</div>
      <label>Segment<select value={segment} onChange={(event) => setSegment(Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>
      <div className="standard-multipliers"><button type="button" onClick={() => addDart(createDart(segment, 1))}>SINGLE {segment}</button><button type="button" onClick={() => addDart(createDart(segment, 2))}>DOUBLE {segment}</button><button type="button" onClick={() => addDart(createDart(segment, 3))}>TRIPLE {segment}</button></div>
      <div className="standard-specials"><button type="button" onClick={() => addDart(createDart('miss'))}>MISS</button><button type="button" onClick={() => addDart(createDart('bull', 1))}>BULL 25</button><button type="button" onClick={() => addDart(createDart('bull', 2))}>DOUBLE BULL 50</button></div>
      <button className="standard-undo" type="button" disabled={!match.history.length} onClick={() => setMatch((current) => undoX01(current))}>LETZTEN DART ZURÜCKNEHMEN</button>
    </section>}
    {winner && <section className="standard-winner" aria-live="assertive"><span>🏆 SIEGER</span><h2>{winner.name}</h2><strong>{winner.dartsThrown} Darts · {winner.visits} Aufnahmen</strong><p>Ø {playerAverage(winner).toFixed(1)} · Höchste Aufnahme {winner.highestVisit} · Checkout mit {winner.checkoutDarts} Dart(s)</p><button type="button" onClick={restart}>GLEICHE EINSTELLUNGEN</button><button type="button" onClick={leaveMatch}>ZUR MODUSAUSWAHL</button></section>}
    {menuOpen && <div className="standard-overlay"><section role="dialog" aria-modal="true" aria-labelledby="standard-menu-title"><h2 id="standard-menu-title">Spiel pausiert</h2><button autoFocus type="button" onClick={() => { setMenuOpen(false); window.setTimeout(() => menuButton.current?.focus(), 0) }}>WEITERSPIELEN</button><button type="button" onClick={() => { setMenuOpen(false); setSettingsOpen(true) }}>EINSTELLUNGEN</button><button type="button" onClick={() => setConfirmation('restart')}>SPIEL NEU STARTEN</button><button className="danger" type="button" onClick={() => setConfirmation('leave')}>SPIEL VERLASSEN</button></section></div>}
    {confirmation && <div className="standard-overlay"><section role="alertdialog" aria-modal="true" aria-labelledby="standard-confirm-title"><h2 id="standard-confirm-title">{confirmation === 'restart' ? 'Spiel wirklich neu starten?' : 'Spiel wirklich verlassen?'}</h2><p>Der aktuelle Matchstand geht verloren.</p><button autoFocus type="button" onClick={() => setConfirmation(null)}>ABBRECHEN</button><button className="danger" type="button" onClick={confirmation === 'restart' ? restart : leaveMatch}>BESTÄTIGEN</button></section></div>}
  </main>
}

export default StandardGame
