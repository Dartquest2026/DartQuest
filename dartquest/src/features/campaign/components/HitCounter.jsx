import { getVisitState } from '../utils/levelAttempt'
import './HitCounter.css'

function HitCounter({ attempt, onHit, onMiss, onUndo }) {
  const { visit, dartsInCurrentVisit } = getVisitState(attempt.totalDarts)
  const expectedTarget = attempt.sequence[attempt.sequenceIndex]

  return (
    <section className="hit-counter" aria-label="Trefferzähler">
      <header className="hit-counter-visit">
        <div>
          <span>Aufnahme</span>
          <strong>{visit}</strong>
        </div>
        <div className="hit-counter-darts" aria-label={`${dartsInCurrentVisit} von 3 Darts`}>
          {[0, 1, 2].map((dart) => (
            <span key={dart} className={dart < dartsInCurrentVisit ? 'is-thrown' : ''}>●</span>
          ))}
        </div>
        <small>{attempt.totalDarts} Pfeile gesamt</small>
      </header>

      <div className="hit-counter-targets">
        {attempt.targets.map((target) => {
          const hits = attempt.hitCounters[target.id]
          const complete = hits >= target.requiredHits
          const active = !attempt.ordered || expectedTarget === target.id
          return (
            <article
              key={target.id}
              className={`hit-target${complete ? ' is-complete' : ''}${attempt.ordered && active ? ' is-active' : ''}`}
            >
              <div className="hit-target-heading">
                <strong>{target.label}</strong>
                {complete && <span aria-label="Erfüllt">✓</span>}
              </div>
              <div className="hit-target-controls">
                <button type="button" onClick={() => onUndo(target.id)} disabled={hits === 0} aria-label={`${target.label} korrigieren`}>−</button>
                <b>{hits} / {target.requiredHits}</b>
                <button type="button" onClick={() => onHit(target.id)} disabled={complete || !active}>+ {target.label}</button>
              </div>
            </article>
          )
        })}
      </div>

      {attempt.ordered && expectedTarget && (
        <p className="hit-counter-next">Als Nächstes: <strong>{attempt.targets.find((target) => target.id === expectedTarget)?.label}</strong></p>
      )}

      <button className="hit-counter-miss" type="button" onClick={onMiss}>Fehlwurf</button>
      <p className="hit-counter-hint">Jeder Treffer oder Fehlwurf zählt genau einen Dart.</p>
    </section>
  )
}

export default HitCounter
