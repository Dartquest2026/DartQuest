import './CampaignGameUI.css'

export function DartSlots({ values, labels = ['Dart 1', 'Dart 2', 'Dart 3'] }) {
  return <div className="campaign-dart-slots">{labels.map((label, index) => <div key={label} className={values[index] != null ? 'filled' : ''}><small>{label}</small><strong>{values[index] == null ? 'Noch nicht geworfen' : values[index] === 0 ? 'Nicht getroffen' : values[index]}</strong></div>)}</div>
}

export function ScoreKeypad({ value, onChange, onConfirm, disabled, quick = [26,41,45,60,81,83,100,140] }) {
  return <section className="score-keypad"><div className="score-display">{value || '0'}</div><div className="score-quick">{quick.map((item) => <button type="button" key={item} disabled={disabled} onClick={() => onChange(String(item))}>{item}</button>)}</div><div className="score-numbers">{[1,2,3,4,5,6,7,8,9].map((number) => <button type="button" key={number} disabled={disabled} onClick={() => onChange((value + number).slice(0,3))}>{number}</button>)}<button type="button" onClick={() => onChange('')}>C</button><button type="button" disabled={disabled} onClick={() => onChange((value + '0').slice(0,3))}>0</button><button type="button" onClick={() => onChange(value.slice(0,-1))}>⌫</button></div><button className="score-confirm" type="button" disabled={disabled || value === '' || Number(value) > 180} onClick={onConfirm}>✓ BESTÄTIGEN</button></section>
}

export function CampaignResult({ title, children, actions }) {
  return <div className="campaign-result"><section role="dialog" aria-modal="true"><span>ERGEBNIS</span><h2>{title}</h2>{children}<div>{actions}</div></section></div>
}
