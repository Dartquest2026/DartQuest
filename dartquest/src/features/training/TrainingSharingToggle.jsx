import { useEffect, useState } from 'react'
import { loadTrainingSharing, setTrainingSharing } from './trainingStatControls'
export default function TrainingSharingToggle({ userId, game }) {
  const [sharing,setSharing]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{
    let alive=true
    loadTrainingSharing(userId,game).then(enabled=>{if(alive){setSharing(enabled);setReady(true)}}).catch(e=>{if(alive)setError(e.message)})
    return()=>{alive=false}
  },[userId,game])
  async function toggle(){setBusy(true);setError('');try{await setTrainingSharing(userId,game,!sharing);setSharing(!sharing)}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <div className="statistics-sharing"><label className="statistics-sharing-toggle" title="Nur bestätigte Freunde können deine Ergebnisse dieses Spiels vergleichen."><span>Für Freunde sichtbar</span><input type="checkbox" aria-label="Ergebnisse dieses Spiels für Freunde sichtbar" checked={sharing} disabled={!ready||busy} onChange={toggle}/></label>{error&&<span className="statistics-sharing-error" role="alert">{error}</span>}</div>
}
