import { aroundClockBest, aroundClockStats, aroundVariant, formatElapsed } from './customTrainingRules'

export function AroundClockOptions({ value = false, onChange, disabled = false }) {
  return <div className="custom-select-label" role="group" aria-label="Spielvariante"><span>SPIELVARIANTE</span><div className="training-chips"><button type="button" disabled={disabled} aria-pressed={!value} onClick={() => onChange(false)}>1–20 ohne Bull</button><button type="button" disabled={disabled} aria-pressed={value} onClick={() => onChange(true)}>1–20 + Bull</button></div></div>
}
export function AroundClockDetails({ run }) {
  const stats = aroundClockStats(run)
  return <><p>{aroundVariant(run.includeBull)}</p><div className="statistics-grid"><div><span>BENÖTIGTE ZEIT</span><strong>{formatElapsed(stats.elapsedMs)}</strong></div><div><span>TREFFERQUOTE</span><strong>{stats.accuracy.toFixed(1)} %</strong></div><div><span>WÜRFE INSGESAMT</span><strong>{stats.darts}</strong></div><div><span>PFLICHTTREFFER</span><strong>{stats.hits}</strong></div></div><p>Trefferquote = {stats.hits} getroffene Ziele geteilt durch alle Würfe einschließlich Fehlwürfen.</p></>
}
export function AroundClockComparison({ run, rows }) {
  const best = aroundClockBest(rows, Boolean(run.includeBull), run.id), stats = aroundClockStats(run)
  return <><h3>{best.misses === null || stats.misses < best.misses ? 'NEUER FEHLWURF-BESTWERT!' : 'DEIN VERGLEICH'}</h3>{best.previous ? <><p>Letztes Mal: <strong>{best.previous.misses} Fehlwürfe</strong> · {formatElapsed(best.previous.elapsedMs)}</p><p>Heute: <strong>{stats.misses} Fehlwürfe</strong> · {formatElapsed(stats.elapsedMs)}</p><p>{stats.misses === best.previous.misses ? 'Genauso viele Fehlwürfe wie letztes Mal.' : `${Math.abs(stats.misses - best.previous.misses)} Fehlwürfe ${stats.misses < best.previous.misses ? 'weniger' : 'mehr'} als letztes Mal.`}</p></> : <p>Dein erster abgeschlossener Durchlauf in dieser Variante.</p>}{best.misses !== null && <p>Bisher am wenigsten: {best.misses} Fehlwürfe · Bisher schnellste Zeit: {formatElapsed(best.elapsedMs)}</p>}</>
}
