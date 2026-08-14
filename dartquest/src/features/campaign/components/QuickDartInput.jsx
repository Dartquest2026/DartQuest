import Dartboard from './Dartboard'
import './QuickDartInput.css'

const QUICK_VALUES = [3, 6, 9, 12, 15]

function QuickDartInput({ attempt, value, minimumDarts, onChange, onComplete, disabled = false }) {
  const setSafeValue = (nextValue) => onChange(Math.max(minimumDarts, nextValue))

  return (
    <section className="quick-dart-input" aria-label="Schnelleingabe">
      <Dartboard targets={attempt.targets} hitCounters={attempt.hitCounters} />

      <div className="quick-dart-input__panel">
        <span>Darts benötigt</span>
        <div className="quick-dart-input__stepper">
          <button type="button" onClick={() => setSafeValue(value - 1)} disabled={disabled || value <= minimumDarts} aria-label="Einen Dart weniger">−</button>
          <strong>{value}<small>{value === 1 ? ' Dart' : ' Darts'}</small></strong>
          <button type="button" onClick={() => setSafeValue(value + 1)} disabled={disabled} aria-label="Einen Dart mehr">+</button>
        </div>

        <div className="quick-dart-input__presets" aria-label="Schnellauswahl">
          {QUICK_VALUES.filter((quickValue) => quickValue >= minimumDarts).map((quickValue) => (
            <button key={quickValue} className={value === quickValue ? 'is-active' : ''} type="button" onClick={() => setSafeValue(quickValue)} disabled={disabled}>{quickValue}</button>
          ))}
          <button type="button" onClick={() => setSafeValue(value + 3)} disabled={disabled}>+3</button>
        </div>
      </div>

      <button className="quick-dart-input__complete" type="button" onClick={onComplete} disabled={disabled}>Aufgabe geschafft</button>
    </section>
  )
}

export default QuickDartInput
