import Dartboard from './Dartboard'
import { DartSlots } from '../../campaignModes/components/CampaignGameUI'
import './HitCounter.css'

function HitCounter({ attempt, onHit, onNextVisit, onPreviousVisit, onUndo, completionPending, autoPerfectPending = false, onFinish, interactionDisabled = false }) {
  const expectedTarget = attempt.sequence[attempt.sequenceIndex]
  const currentVisitCount = attempt.totalDarts === 0 ? 0 : (attempt.totalDarts % 3 || 3)
  const currentVisit = attempt.hitHistory.slice(-currentVisitCount)
  const dartValues = Array.from({ length: 3 }, (_, index) => {
    const entry = currentVisit[index]
    return entry ? entry.miss ? 0 : attempt.targets.find((target) => target.id === entry.targetId)?.label : null
  })

  return (
    <section className="hit-counter" aria-label="Trefferzähler">
      <Dartboard targets={attempt.targets} hitCounters={attempt.hitCounters} />

      <header className="hit-counter-visit">
        <div><span>Aufnahme</span><strong>{attempt.visits}</strong></div>
        <div><span>Darts gesamt</span><strong>{attempt.totalDarts}</strong></div>
      </header>

      <DartSlots values={dartValues} />

      <div className="hit-counter-visit-actions">
        <button className="hit-counter-previous-visit" type="button" onClick={onPreviousVisit} disabled={interactionDisabled || attempt.visits <= 1}>↶ Aufnahme</button>
        <button className="hit-counter-next-visit" type="button" onClick={onNextVisit} disabled={interactionDisabled}>
          {completionPending ? 'Nicht getroffen · +1 Dart' : 'Nicht getroffen'}
        </button>
      </div>

      <div className="hit-counter-targets">
        {attempt.targets.map((target) => {
          const hits = attempt.hitCounters[target.id]
          const complete = hits >= target.requiredHits
          const active = !attempt.ordered || expectedTarget === target.id
          return (
            <article key={target.id} className={`hit-target${complete ? ' is-complete' : ''}${attempt.ordered && active ? ' is-active' : ''}`}>
              <strong className="hit-target-label">{target.label}</strong>
              <button className="hit-target-undo" type="button" onClick={() => onUndo(target.id)} disabled={interactionDisabled || hits === 0} aria-label={`${target.label} korrigieren`}>↶</button>
              <button className="hit-target-add" type="button" onClick={() => onHit(target.id)} disabled={interactionDisabled || complete || !active}>+ {target.label}</button>
              <b className="hit-target-progress">{hits} / {target.requiredHits}</b>
              {complete && <span className="hit-target-check" aria-label="Erfüllt">✓</span>}
            </article>
          )
        })}
      </div>

      {attempt.ordered && expectedTarget && (
        <p className="hit-counter-next">Als Nächstes: <strong>{attempt.targets.find((target) => target.id === expectedTarget)?.label}</strong></p>
      )}

      {completionPending && (
        <section className="finishing-dart" aria-live="polite">
          <strong>{autoPerfectPending ? 'Perfekt erkannt ★★★★' : 'Aufgabe erfüllt ✓'}</strong>
          {autoPerfectPending ? (
            <>
              <span>Fehlt eine Aufnahme? Jetzt noch korrigieren.</span>
              <button className="finishing-dart-correction" type="button" onClick={onNextVisit} disabled={interactionDisabled}>+ Aufnahme</button>
            </>
          ) : (
            <>
              <span>Mit welchem Dart dieser Aufnahme?</span>
              <div>
                {[1, 2, 3].map((dart) => (
                  <button key={dart} type="button" onClick={() => onFinish(dart)} disabled={interactionDisabled}>
                    <small>Dart</small>{dart}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </section>
  )
}

export default HitCounter
