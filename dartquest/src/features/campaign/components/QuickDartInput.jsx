import Dartboard from './Dartboard'
import './QuickDartInput.css'

function QuickDartInput({ attempt, minimumDarts, onComplete, disabled = false }) {
  const options = [
    { stars: 4, darts: minimumDarts, text: `${minimumDarts} ${minimumDarts === 1 ? 'Pfeil' : 'Pfeile'} · Perfekt` },
    { stars: 3, darts: minimumDarts + 1, text: `${minimumDarts + 1}–${minimumDarts * 3} Pfeile` },
    { stars: 2, darts: minimumDarts * 3 + 1, text: `${minimumDarts * 3 + 1}–${minimumDarts * 6} Pfeile` },
    { stars: 1, darts: minimumDarts * 6 + 1, text: `${minimumDarts * 6 + 1} oder mehr Pfeile` },
  ]

  return (
    <section className="quick-dart-input" aria-label="Schnelleingabe">
      <Dartboard targets={attempt.targets} hitCounters={attempt.hitCounters} />

      <div className="quick-dart-input__panel">
        <span>Wie hast du die Aufgabe geschafft?</span>
        <div className="quick-dart-input__ratings">
          {options.map((option) => (
            <button key={option.stars} type="button" onClick={() => onComplete(option.darts)} disabled={disabled}>
              <b>{'★'.repeat(option.stars)}</b>
              <strong>{option.text}</strong>
              <i aria-hidden="true">›</i>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default QuickDartInput
