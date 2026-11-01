import { DEFAULT_ROUTE, DOUBLE_ROUTES, routeLabel, routeMetrics, seriesDistribution, summary } from './customTrainingRules'

export function RouteSelector({ value = DEFAULT_ROUTE, onChange, disabled = false }) {
  return <label className="custom-select-label">DOPPELWEG<select aria-label="Doppelweg auswählen" value={value.join('-')} disabled={disabled} onChange={e => onChange(e.target.value.split('-').map(Number))}>{DOUBLE_ROUTES.map(route => <option key={route.join('-')} value={route.join('-')}>{routeLabel(route)}</option>)}</select></label>
}
export function FavoriteDoubleSelector({ value = 16, onChange, disabled = false }) {
  return <label className="custom-select-label">DEIN FAVORITEN-DOPPEL<select aria-label="Favoriten-Doppel auswählen" value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))}>{Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={n}>D{n} · {n * 2} Punkte je Treffer</option>)}</select></label>
}
export function RouteBreakdown({ run }) {
  return <div className="custom-route-metrics">{routeMetrics(run).map(row => <article key={row.target}><strong>D{row.target}</strong><span>{row.hits} Treffer / {row.attempts} {row.attempts === 1 ? 'Wurf' : 'Würfe'}</span><small>{row.attempts ? `${(row.hits / row.attempts * 100).toFixed(1)} %` : 'Noch keine Würfe'}</small></article>)}</div>
}
export default function CustomTrainingDetails({ run, showEntries = false }) {
  const stats = summary(run), entries = run.entries ?? []
  if (run.game === 'bulls-warm-up') return <p>{run.doubleBull} × Doppelbull · {run.singleBull} × Single Bull</p>
  if (run.game === 'double-route') return <><p>{routeLabel(run.route ?? DEFAULT_ROUTE)} · ein Punkt pro Treffer</p><RouteBreakdown run={run}/></>
  const favorite = run.game === 'favorite-double'
  return <><p>Längste Serie: {stats.longest} {favorite ? 'Doppeltreffer' : stats.longest === 1 ? 'erfolgreicher Anwurf' : 'erfolgreiche Anwürfe'}<br/>Beste Serie: {stats.bestSeries} Punkte<br/>{stats.seriesCount} {favorite ? 'erfolgreiche Starts mit Dart 1' : stats.seriesCount === 1 ? 'gespeicherte Serie' : 'gespeicherte Serien'}</p>
    {favorite && <><p>Insgesamt {entries.reduce((n, entry) => n + entry.count, 0)} Doppeltreffer</p><h3>SERIENVERTEILUNG</h3><div className="custom-distribution">{seriesDistribution(entries).map(([length, count]) => <span key={length}>{length} Treffer hintereinander: {count}×</span>)}</div></>}
    {showEntries && <details><summary>Alle Serien anzeigen</summary><ol>{entries.map((entry, index) => <li key={index}>{favorite ? `D${entry.double} · ` : ''}{entry.points} Punkte · {entry.count} {favorite ? 'Doppeltreffer' : 'erfolgreiche Anwürfe'}</li>)}</ol></details>}
  </>
}
