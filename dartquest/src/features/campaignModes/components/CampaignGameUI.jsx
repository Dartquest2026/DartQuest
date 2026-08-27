import './CampaignGameUI.css'
import { useRef, useState } from 'react'

export function DartSlots({ values, labels = ['Dart 1', 'Dart 2', 'Dart 3'] }) {
  return <div className="campaign-dart-slots">{labels.map((label, index) => <div key={label} className={values[index] != null ? 'filled' : ''}><small>{label}</small><strong>{values[index] == null ? 'Noch nicht geworfen' : values[index] === 0 ? 'Nicht getroffen' : values[index]}</strong></div>)}</div>
}

export function ScoreKeypad({ value, onChange, onConfirm, disabled, quick = [26, 41, 45, 60, 81, 85, 100, 140], fill = false, checkoutDartCounts = [], onCheckoutLongPress }) {
  const [pressedKey, setPressedKey] = useState(null)
  const [holdingKey, setHoldingKey] = useState(null)
  const feedbackTimer = useRef(null)
  const holdTimer = useRef(null)
  const holdStart = useRef(null)
  const suppressClick = useRef(false)
  const suppressClickTimer = useRef(null)
  const confirmDisabled = disabled || value === '' || Number(value) > 180

  function press(key, action) {
    setPressedKey(key)
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => setPressedKey(null), 820)
    action()
  }

  function keyClass(key, extra = '') {
    return `${extra}${pressedKey === key ? `${extra ? ' ' : ''}is-pressed` : ''}`
  }

  function cancelHold() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
    holdStart.current = null
    setHoldingKey(null)
  }

  function endHold() {
    cancelHold()
  }

  function startHold(number, event) {
    if (!checkoutDartCounts.includes(number) || disabled || !onCheckoutLongPress) return
    cancelHold()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    holdStart.current = { x: event.clientX, y: event.clientY }
    setHoldingKey(number)
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null
      holdStart.current = null
      suppressNextClick()
      setHoldingKey(null)
      navigator.vibrate?.(35)
      onCheckoutLongPress(number)
    }, 600)
  }

  function suppressNextClick() {
    suppressClick.current = true
    if (suppressClickTimer.current) window.clearTimeout(suppressClickTimer.current)
    suppressClickTimer.current = window.setTimeout(() => { suppressClick.current = false }, 1000)
  }

  function moveHold(event) {
    if (!holdStart.current) return
    if (Math.hypot(event.clientX - holdStart.current.x, event.clientY - holdStart.current.y) > 12) {
      suppressNextClick()
      cancelHold()
    }
  }

  function clickNumber(number) {
    if (suppressClick.current) {
      suppressClick.current = false
      if (suppressClickTimer.current) window.clearTimeout(suppressClickTimer.current)
      return
    }
    press(`number-${number}`, () => onChange((value + number).slice(0, 3)))
  }

  const numberButton = (number) => {
    const checkoutAvailable = checkoutDartCounts.includes(number)
    const classes = [keyClass(`number-${number}`), checkoutAvailable ? 'is-checkout-available' : '', holdingKey === number ? 'is-holding' : ''].filter(Boolean).join(' ')
    return <button type="button" key={number} className={classes} disabled={disabled} onPointerDown={(event) => startHold(number, event)} onPointerMove={moveHold} onPointerUp={endHold} onPointerCancel={cancelHold} onContextMenu={(event) => checkoutAvailable && event.preventDefault()} onClick={() => clickNumber(number)}>{number}</button>
  }

  return <section className={`score-keypad${fill ? ' is-fill' : ''}`}>
    <div className="score-display">{value || '0'}</div>
    <div className="score-quick">{quick.map((item) => <button type="button" key={item} className={keyClass(`quick-${item}`)} disabled={disabled} onClick={() => press(`quick-${item}`, () => onChange(String(item)))}>{item}</button>)}</div>
    <div className="score-numbers">
      {numberButton(1)}
      {numberButton(2)}
      {numberButton(3)}
      {numberButton(4)}
      {numberButton(5)}
      {numberButton(6)}
      {numberButton(7)}
      {numberButton(8)}
      {numberButton(9)}
      <button type="button" className={keyClass('backspace')} disabled={disabled} onClick={() => press('backspace', () => onChange(value.slice(0, -1)))} aria-label="Letzte Ziffer löschen">⌫</button>
      <button type="button" className={keyClass('number-0', 'score-zero')} disabled={disabled} onClick={() => press('number-0', () => onChange((value + '0').slice(0, 3)))}>0</button>
      <button className={keyClass('confirm', 'score-confirm')} type="button" disabled={confirmDisabled} onClick={() => press('confirm', onConfirm)} aria-label="Eingabe bestätigen">✓ <span>OK</span></button>
    </div>
  </section>
}

export function DartFieldInput({ value, onChange, disabled }) {
  const [menu, setMenu] = useState(null)
  const timer = useRef(null)
  function add(points) { onChange(String(Math.min(180, (Number(value) || 0) + points))); setMenu(null) }
  function startHold(number, event) { event.currentTarget.setPointerCapture?.(event.pointerId); timer.current = window.setTimeout(() => setMenu(number), 420) }
  function cancelHold(number) { if (timer.current) window.clearTimeout(timer.current); timer.current = null; if (menu == null) add(number) }
  return <section className="dart-field-input"><div className="score-display">{value || '0'}</div><div className="dart-field-grid">{Array.from({length:20},(_,index)=>index+1).map((number)=><div key={number} className="dart-field-cell"><button type="button" disabled={disabled} onPointerDown={(event)=>startHold(number,event)} onPointerUp={()=>cancelHold(number)} onPointerCancel={()=>{window.clearTimeout(timer.current);timer.current=null}}>{number}</button>{menu===number&&<div className="dart-multiplier-menu"><button onClick={()=>add(number*2)}>D{number}</button><button onClick={()=>add(number*3)}>T{number}</button></div>}</div>)}<button type="button" onClick={()=>add(25)}>BULL 25</button><button type="button" onClick={()=>add(50)}>BULL 50</button></div><div className="dart-field-actions"><button onClick={()=>onChange('')}>LÖSCHEN</button><button onClick={()=>onChange(String(Math.floor((Number(value)||0)/10)))}>⌫</button></div></section>
}

export function CampaignResult({ title, children, actions }) {
  return <div className="campaign-result"><section role="dialog" aria-modal="true"><span>ERGEBNIS</span><h2>{title}</h2>{children}<div>{actions}</div></section></div>
}
