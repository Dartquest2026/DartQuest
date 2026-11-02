import TrainingFriendPicker from './TrainingFriendPicker'
import { useEffect, useState } from 'react'
import { getFriends } from '../community/communityStorage'
import { loadFriendTraining } from './trainingStatControls'
export default function TrainingFriendComparison({ userId, game, onComparison }) {
  const [friends,setFriends]=useState([]),[friend,setFriend]=useState(''),[ready,setReady]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  useEffect(()=>{
    let alive=true
    if(!userId)return
    getFriends().then(rows=>{if(alive){setFriends(rows);setReady(true)}}).catch(e=>{if(alive)setError(e.message)})
    return()=>{alive=false}
  },[userId,game])
  useEffect(()=>{
    let alive=true
    onComparison(null)
    if(!friend)return
    loadFriendTraining(friend,game).then(result=>{if(!alive)return; if(!result.sharing)setNotice('Dein Freund hat dieses Spiel noch nicht zum Vergleich freigegeben.');else {onComparison({game,name:friends.find(f=>f.profileId===friend)?.name??'Freund',rows:result.rows});if(!result.rows.length)setNotice('Noch keine abgeschlossenen Trainings für dieses Spiel.')}}).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[friend,game,friends,onComparison])
  if(!userId)return <p className="training-compare-guest">Melde dich an, um Trainings mit Freunden zu vergleichen.</p>
  return <div className="training-friend-panel" aria-label="Freundesvergleich"><div className="training-friend-toolbar"><span>VERGLEICH</span><TrainingFriendPicker friends={friends} value={friend} disabled={!ready} onChange={id=>{setFriend(id);setLoading(Boolean(id));setNotice('');setError('')}}/></div>{ready&&!friends.length&&<p>Füge zuerst unter Community einen Freund hinzu.</p>}{loading&&<p role="status">Trainings werden geladen …</p>}{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div>
}
