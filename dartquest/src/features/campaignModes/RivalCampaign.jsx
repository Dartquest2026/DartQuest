import { useEffect, useRef, useState } from 'react'
import { applyVisit, createAiVisit, createRivalMatch, playerMatchStats, rivalAverageForLevel, undoPlayerRound } from './rivalEngine'
import { isCampaignLevelUnlocked, loadCampaignProgress, saveCampaignProgress } from './campaignModeStorage'
import { CampaignResult, ScoreKeypad } from './components/CampaignGameUI'
import './CampaignModes.css'

export default function RivalCampaign({ activeProfile, onBack }) {
  const [progress, setProgress] = useState(() => loadCampaignProgress(activeProfile?.id, 'rival'))
  const [match, setMatch] = useState(null)
  const [input, setInput] = useState('')
  const [checkoutPrompt, setCheckoutPrompt] = useState(null)
  const confirming = useRef(false)
  const historyRef = useRef(null)
  const aiThinking = match?.active === 1 && match?.winner == null

  useEffect(() => {
    if (!match || match.active !== 1 || match.winner != null) return undefined
    const timer = window.setTimeout(() => {
      setMatch((current) => {
        if (current?.active !== 1) return current
        const visit = createAiVisit(current)
        return applyVisit(current, visit.points, visit.validCheckout, visit.dartsUsed)
      })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [match])

  useEffect(() => { if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight }, [match?.visits.length])

  function storeWin(nextMatch) {
    if (nextMatch.winner !== 0 || progress.levels[nextMatch.level]?.completed) return
    const next = { ...progress, levels: { ...progress.levels, [nextMatch.level]: { completed: true } } }
    setProgress(next); saveCampaignProgress(activeProfile?.id, 'rival', next)
  }

  function commit(validCheckout = false, checkoutDart = 3) {
    if (confirming.current || !match || match.active !== 0) return
    const points = Number(input)
    if (!Number.isInteger(points) || points < 0 || points > 180) return
    if (match.players[0].score - points === 0 && !validCheckout) { setCheckoutPrompt(points); return }
    confirming.current = true
    setMatch((current) => { const next = applyVisit(current, points, validCheckout, checkoutDart); storeWin(next); return next }); setInput(''); setCheckoutPrompt(null)
    window.setTimeout(() => { confirming.current = false }, 250)
  }

  function rejectCheckout() {
    const points = checkoutPrompt
    setMatch((current) => { const next = applyVisit(current, points, false); storeWin(next); return next })
    setCheckoutPrompt(null); setInput('')
  }

  if (!match) return <RivalLevels progress={progress} onBack={onBack} onStart={(level) => setMatch(createRivalMatch(activeProfile?.name, level))} />
  const human = match.players[0], ai = match.players[1]
  const rounds = Array.from({ length: Math.ceil(match.visits.length / 2) }, (_, index) => ({ human: match.visits[index * 2], ai: match.visits[index * 2 + 1] }))
  const stats = playerMatchStats(human)
  const nextUnlocked = match.level < 40 && isCampaignLevelUnlocked(progress, match.level + 1)
  return <main className="rival-game"><header><button type="button" onClick={() => setMatch(null)}>‹</button><div><span>RIVALEN-LEVEL {match.level} · Ø {match.targetAverage}</span><h1>First to 3</h1></div><button type="button" className="rival-undo" disabled={!match.history.length || aiThinking} onClick={() => { setMatch((current) => undoPlayerRound(current)); setInput('') }}>↶ Undo</button></header>
    <section className="rival-scoreboard"><article className={match.active === 0 && match.winner == null ? 'active' : ''}><span>{human.name}</span><strong>{human.score}</strong></article><div className="rival-legs"><small>LEGS</small><strong><b>{human.legs}</b><i>|</i><b>{ai.legs}</b></strong></div><article className={match.active === 1 && match.winner == null ? 'active' : ''}><span>{ai.name}</span><strong>{ai.score}</strong></article></section>
    <section ref={historyRef} className="rival-history" aria-label="Aufnahmeverlauf"><header><span>{human.visits} Aufnahmen · {human.dartsThrown} Darts</span><b>DARTS</b><span>{ai.visits} Aufnahmen · {ai.dartsThrown} Darts</span></header>{rounds.map((round,index) => <div key={index}><span>{formatVisit(round.human)}</span><b>{(index + 1) * 3}</b><span>{formatVisit(round.ai)}</span></div>)}</section>
    {aiThinking && <div className="rival-thinking" aria-live="polite">Rivale wirft …</div>}
    {match.winner == null && <ScoreKeypad value={input} onChange={setInput} onConfirm={() => commit(false)} disabled={match.active !== 0} />}
    {match.winner != null && <CampaignResult title={match.winner === 0 ? 'Du hast gewonnen!' : 'Du hast verloren'}><strong className="result-score">{human.legs}:{ai.legs} Legs</strong><dl><div><dt>3-Dart-Average</dt><dd>{stats.average.toFixed(1)}</dd></div><div><dt>Darts</dt><dd>{stats.darts}</dd></div><div><dt>Aufnahmen</dt><dd>{stats.visits}</dd></div><div><dt>Höchste Aufnahme</dt><dd>{stats.highestVisit}</dd></div><div><dt>Bestes Checkout</dt><dd>{stats.bestCheckout ?? '–'}</dd></div><div><dt>Checkoutquote</dt><dd>{stats.checkoutRate == null ? '–' : `${stats.checkoutRate.toFixed(0)} %`}</dd></div></dl><button type="button" onClick={() => setMatch(createRivalMatch(activeProfile?.name, match.level))}>ERNEUT SPIELEN</button><button type="button" onClick={() => setMatch(null)}>ZUR LEVELAUSWAHL</button><button type="button" disabled={!nextUnlocked} onClick={() => setMatch(createRivalMatch(activeProfile?.name, match.level + 1))}>NÄCHSTER GEGNER</button></CampaignResult>}
    {checkoutPrompt != null && <div className="checkout-dialog"><section role="dialog" aria-modal="true"><h2>Regelkonform mit einem Doppel ausgecheckt?</h2><p>Falls ja: Mit welchem Dart wurde das Checkout getroffen?</p><div className="checkout-dart-choice">{[1,2,3].map((dart) => <button type="button" key={dart} onClick={() => commit(true, dart)}>{dart} Dart{dart > 1 ? 's' : ''}</button>)}</div><button type="button" onClick={rejectCheckout}>NEIN · BUST</button></section></div>}
  </main>
}

function formatVisit(visit) { return visit ? `${visit.points}${visit.bust ? ' · Bust' : visit.checkout ? ' · Checkout' : ''}` : '' }

function RivalLevels({ progress, onBack, onStart }) {
  const levels = Array.from({ length: 40 }, (_, index) => index + 1)
  return <main className="campaign-levels"><header><button type="button" onClick={onBack}>‹</button><div><span>RIVALEN-KAMPAGNE</span><h1>Gegner</h1></div></header><div className="campaign-level-grid">{levels.map((level) => { const unlocked = isCampaignLevelUnlocked(progress, level); return <button type="button" key={level} disabled={!unlocked} onClick={() => onStart(level)}><strong>{unlocked ? level : '🔒'}</strong><span>Rivale {level}</span><small>Ziel-Average {rivalAverageForLevel(level).toLocaleString('de-DE')}</small></button> })}</div></main>
}
