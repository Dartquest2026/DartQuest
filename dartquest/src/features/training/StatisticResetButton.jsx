import { useRef, useState } from 'react'
import { resetTrainingStatistics } from './trainingStatControls'
export default function StatisticResetButton({ userId, category, game, title, onReset }) {
  const dialog = useRef(null)
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [done,setDone] = useState(false)
  async function reset() {
    setBusy(true);setError('')
    try { await resetTrainingStatistics(userId,category,game);onReset();dialog.current.close();setDone(true) }
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <section className="stat-reset-section"><button className="stat-reset-open" onClick={() => {setError('');setDone(false);dialog.current.showModal()}}>Statistik zurücksetzen</button><p>Nur {title}. XP, Kampagne und andere Spiele bleiben erhalten.</p>{done&&<p role="status">Die Statistik für {title} wurde zurückgesetzt.</p>}<dialog ref={dialog} className="bulls-session-dialog stat-reset-dialog" onCancel={e => {if(busy)e.preventDefault()}} aria-labelledby="stat-reset-title"><h2 id="stat-reset-title">Statistik zurücksetzen?</h2><p>Alle gespeicherten Ergebnisse und Rekorde für <strong>{title}</strong> werden endgültig gelöscht – über alle Spieldauern und Varianten hinweg{userId?' und auf allen verbundenen Geräten': ' auf diesem Gerät'}. Ein laufendes Training bleibt erhalten.</p>{error&&<p role="alert">{error}</p>}<button className="stat-reset-confirm" disabled={busy} onClick={reset}>{busy?'WIRD ZURÜCKGESETZT …':'JA, STATISTIK LÖSCHEN'}</button><button autoFocus disabled={busy} onClick={() => dialog.current.close()}>ABBRECHEN</button></dialog></section>
}
