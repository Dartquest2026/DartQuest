import { useMemo, useState } from 'react'
import { isCampaignLevelUnlocked, loadCampaignProgress, saveCampaignProgress } from './campaignModeStorage'
import { checkoutDartOptions, checkoutRewards, checkoutStarsForDarts } from './checkoutRules'
import { CampaignResult, DartFieldInput, DartSlots, ScoreKeypad } from './components/CampaignGameUI'
import { grantFreePack } from '../cards/cardStorage'
import CheckoutTip from '../checkout/CheckoutTip'
import './CampaignModes.css'
import './CheckoutMobile.css'
import './CheckoutResult.css'

const freshState = (rest) => ({ rest, darts: 0, slots: [], message: '', history: [], result: null })

export default function CheckoutCampaign({ activeProfile, onProfileRewards, onBack }) {
  const [progress, setProgress] = useState(() => loadCampaignProgress(activeProfile?.id, 'checkout'))
  const [level, setLevel] = useState(null)
  const [state, setState] = useState(() => freshState(2))
  const [value, setValue] = useState('')
  const [checkout, setCheckout] = useState(null)
  const [saving, setSaving] = useState(false)
  const [inputMode, setInputMode] = useState(() => localStorage.getItem('dartquest-checkout-score-input') === 'fields' ? 'fields' : 'keypad')
  const levels = useMemo(() => Array.from({ length: 169 }, (_, index) => index + 1), [])
  const target = level == null ? null : level + 1

  function openLevel(nextLevel) { setLevel(nextLevel); setState(freshState(nextLevel + 1)); setValue(''); setCheckout(null) }
  function switchInput(next) { setInputMode(next); localStorage.setItem('dartquest-checkout-score-input', next); setValue('') }
  function snapshot() { return { rest: state.rest, darts: state.darts, slots: state.slots, message: state.message } }
  function finishFailedVisit(label = 'Bust') {
    setState({ ...state, darts: state.darts + 3, slots: [label, '–', '–'], message: 'Aufnahme beendet. Du kannst mit der nächsten Aufnahme fortfahren.', history: [...state.history, snapshot()] })
    setValue(''); setCheckout(null)
  }
  function scoreVisit() {
    const points = Number(value)
    if (!Number.isInteger(points) || points < 0 || points > 180 || saving) return
    const remainder = state.rest - points
    if (remainder === 0) {
      const options = checkoutDartOptions(state.rest)
      if (!options.length) { finishFailedVisit('Ungültiger Checkout'); return }
      setCheckout({ points, options, selected: options.at(-1) }); return
    }
    const bust = remainder < 0 || remainder === 1
    setState({ ...state, rest: bust ? state.rest : remainder, darts: state.darts + 3, slots: [bust ? 'Bust' : `${points} Punkte`, '–', '–'], message: bust ? 'Aufnahme beendet. Du kannst mit der nächsten Aufnahme fortfahren.' : '', history: [...state.history, snapshot()] })
    setValue('')
  }
  async function confirmCheckout(selectedDart = checkout?.selected, advance = false) {
    const checkoutDart = Number.isInteger(selectedDart) ? selectedDart : checkout?.selected
    if (!checkoutDart || saving) return
    setSaving(true)
    const darts = state.darts + checkoutDart
    const stars = checkoutStarsForDarts(target, darts)
    const reward = checkoutRewards(target, stars)
    const old = progress.levels[level] || {}
    const oldReward = old.reward || { xp: 0, coins: 0 }
    const delta = { xp: Math.max(0, reward.xp - oldReward.xp), coins: Math.max(0, reward.coins - oldReward.coins) }
    const firstCompletion = !old.completed
    try {
      if ((delta.xp || delta.coins) && onProfileRewards) await onProfileRewards(delta)
      const pack = firstCompletion && level % 10 === 0
      if (pack) grantFreePack(activeProfile?.id, `checkout-${level}`)
      const next = { ...progress, levels: { ...progress.levels, [level]: { completed: true, stars: Math.max(old.stars || 0, stars), bestDarts: Math.min(old.bestDarts || Infinity, darts), reward: { xp: Math.max(oldReward.xp, reward.xp), coins: Math.max(oldReward.coins, reward.coins) }, packGranted: old.packGranted || pack } } }
      setProgress(next); saveCampaignProgress(activeProfile?.id, 'checkout', next)
      setState((current) => ({ ...current, slots: Array.from({ length: 3 }, (_, index) => index < checkoutDart ? (index === checkoutDart - 1 ? 'Checkout' : 'Dart') : null), result: { darts, stars, reward: delta, pack } }))
      setCheckout(null); setValue('')
      if (advance && level < 169) openLevel(level + 1)
    } finally { setSaving(false) }
  }
  function rejectCheckout() { finishFailedVisit('Bust') }
  function undo() { const previous=state.history.at(-1); if(!previous)return; setState({...state,...previous,history:state.history.slice(0,-1)});setValue('');setCheckout(null) }

  if(level!=null)return <main className="checkout-play"><header><button type="button" onClick={()=>setLevel(null)}>‹</button><div><span>CHECKOUT · LEVEL {level}</span><h1>Rest: {state.rest}</h1></div><button className="checkout-undo" type="button" disabled={!state.history.length||saving} onClick={undo}>↶ Undo</button></header><DartSlots values={state.slots}/><div className="checkout-meta">{state.darts} Darts gesamt · Ausgangsrest {target}</div>{!state.result&&<CheckoutTip key={state.rest} rest={state.rest} dartsRemaining={3}/>}{state.message&&<p className="campaign-notice" aria-live="polite">{state.message}</p>}<nav className="checkout-input-switch"><button className={inputMode==='keypad'?'active':''} onClick={()=>switchInput('keypad')}>AUFNAHME</button><button className={inputMode==='fields'?'active':''} onClick={()=>switchInput('fields')}>FELDER 1–20</button></nav>{!state.result&&<div className="checkout-input-bottom">{inputMode==='keypad'?<ScoreKeypad value={value} onChange={setValue} onConfirm={scoreVisit} disabled={saving}/>:<><DartFieldInput value={value} onChange={setValue} disabled={saving}/><button className="field-score-confirm" disabled={value===''||saving} onClick={scoreVisit}>✓ AUFNAHME WERTEN</button></>}</div>}{checkout&&<div className="checkout-dialog dq-checkout-dialog"><section role="dialog" aria-modal="true"><span className="dialog-eyebrow">DARTQUEST CHECKOUT</span><h2>Regelkonform über Doppel ausgecheckt?</h2><p>Wähle deinen Checkout-Dart und bestätige.</p><div className="checkout-dart-choice">{[1,2,3].map((dart)=><button key={dart} className={checkout.selected===dart?'selected':''} disabled={!checkout.options.includes(dart)} onClick={()=>setCheckout({...checkout,selected:dart})}>{dart} Dart{dart>1?'s':''}</button>)}</div><button className="checkout-confirm" disabled={saving} onClick={confirmCheckout}>JA · CHECKOUT BESTÄTIGEN</button><button className="checkout-bust" onClick={rejectCheckout}>NEIN · ALS BUST WIEDERHOLEN</button></section></div>}{state.result&&<CampaignResult title="Checkout geschafft"><p>{state.result.darts} Darts</p><strong className="result-stars">{'★'.repeat(state.result.stars)}{'☆'.repeat(4-state.result.stars)}</strong><p className="result-rewards">+{state.result.reward.xp} XP · +{state.result.reward.coins} Coins</p>{state.result.pack&&<p>🎴 Fünfer-Kartenpaket erhalten</p>}<button disabled={level>=169} onClick={()=>openLevel(level+1)}>{level>=169?'KAMPAGNE ABGESCHLOSSEN':'NÄCHSTE AUFGABE'}</button><button onClick={()=>setLevel(null)}>ZUR LEVELAUSWAHL</button></CampaignResult>}</main>
  const completed=Object.values(progress.levels).filter((item)=>item.completed).length
  return <main className="campaign-levels"><header><button onClick={onBack}>‹</button><div><span>CHECKOUT-KAMPAGNE</span><h1>169 Checkouts</h1></div></header><p>{completed}/169 abgeschlossen</p><div className="campaign-level-grid">{levels.map((item)=>{const unlocked=isCampaignLevelUnlocked(progress,item),result=progress.levels[item];return <button key={item} disabled={!unlocked} onClick={()=>openLevel(item)}><strong>{unlocked?item:'🔒'}</strong><span>Checkout {item+1}</span><small>{result?.stars?'★'.repeat(result.stars):'☆☆☆☆'}{result?.bestDarts?` · ${result.bestDarts} Darts`:''}</small></button>})}</div></main>
}
