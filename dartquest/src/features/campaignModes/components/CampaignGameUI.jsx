import './CampaignGameUI.css'
import { useRef, useState } from 'react'

export function DartSlots({ values, labels = ['Dart 1', 'Dart 2', 'Dart 3'] }) {
  return <div className="campaign-dart-slots">{labels.map((label, index) => <div key={label} className={values[index] != null ? 'filled' : ''}><small>{label}</small><strong>{values[index] == null ? 'Noch nicht geworfen' : values[index] === 0 ? 'Nicht getroffen' : values[index]}</strong></div>)}</div>
}

export function ScoreKeypad({ value, onChange, onConfirm, disabled, quick = [26,41,45,60,81,83,100,140] }) {
  return <section className="score-keypad"><div className="score-display">{value || '0'}</div><div className="score-quick">{quick.map((item) => <button type="button" key={item} disabled={disabled} onClick={() => onChange(String(item))}>{item}</button>)}</div><div className="score-numbers">{[1,2,3,4,5,6,7,8,9].map((number) => <button type="button" key={number} disabled={disabled} onClick={() => onChange((value + number).slice(0,3))}>{number}</button>)}<button type="button" onClick={() => onChange('')}>C</button><button type="button" disabled={disabled} onClick={() => onChange((value + '0').slice(0,3))}>0</button><button type="button" onClick={() => onChange(value.slice(0,-1))}>⌫</button></div><button className="score-confirm" type="button" disabled={disabled || value === '' || Number(value) > 180} onClick={onConfirm}>✓ BESTÄTIGEN</button></section>
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
