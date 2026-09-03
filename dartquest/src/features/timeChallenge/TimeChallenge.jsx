import { useEffect, useRef, useState } from 'react'
import { triggerHaptic } from '../settings/haptics'
import { clampTargetTime, formatTrainingTime, summarizeAttempts, timeChallenges } from './timeChallenges'
import { getTimeChallengeTone, runningElapsedMs, timerSnapshot } from './timeChallengeTimer'
import { loadTimeChallengeStats, saveTimeChallengeAttempt } from './timeChallengeStorage'
import './TimeChallenge.css'
import './TimeChallengeWarnings.css'

function TimeChallenge({ activeProfile, onBack }) {
  const userId = activeProfile?.id ?? null
  const [screen, setScreen] = useState('list')
  const [challenge, setChallenge] = useState(null)
  const [stats, setStats] = useState({})
  const [targetSeconds, setTargetSeconds] = useState(420)
  const [status, setStatus] = useState('ready')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [displayElapsedMs, setDisplayElapsedMs] = useState(0)
  const [saveState, setSaveState] = useState('idle')
  const runningSinceRef = useRef(null)
  const warningsRef = useRef(new Set())

  useEffect(() => { let active=true; loadTimeChallengeStats(userId).then((value)=>active&&setStats(value)); return()=>{active=false} }, [userId])
  useEffect(() => {
    if (status !== 'running') return undefined
    const update = () => {
      const next = runningElapsedMs(elapsedMs, runningSinceRef.current)
      setDisplayElapsedMs(next)
      const remaining = Math.max(0, Math.ceil((targetSeconds * 1000 - next) / 1000))
      for (const threshold of [60,30,10]) if (remaining <= threshold && !warningsRef.current.has(threshold)) { warningsRef.current.add(threshold); triggerHaptic(threshold === 10 ? 'medium' : 'light') }
      if (next >= targetSeconds * 1000 && !warningsRef.current.has(0)) { warningsRef.current.add(0); triggerHaptic('error') }
    }
    update()
    const interval = window.setInterval(update, 100)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [status, elapsedMs, targetSeconds])

  function openChallenge(item) {
    const previous = stats[item.id]
    setChallenge(item); setTargetSeconds(previous?.lastTargetTimeSeconds ?? item.defaultTargetTimeSeconds)
    setStatus('ready'); setElapsedMs(0); setDisplayElapsedMs(0); setSaveState('idle'); setScreen('setup')
  }
  function changeTarget(delta) { if (status === 'ready') setTargetSeconds((value)=>clampTargetTime(value+delta)) }
  function start() { runningSinceRef.current=Date.now(); warningsRef.current=new Set(); setStatus('running'); setScreen('play'); triggerHaptic('light') }
  function stop() { const next=runningElapsedMs(elapsedMs,runningSinceRef.current); setElapsedMs(next); setDisplayElapsedMs(next); runningSinceRef.current=null; setStatus('paused'); triggerHaptic('light') }
  function resume() { runningSinceRef.current=Date.now(); setStatus('running'); setScreen('play'); triggerHaptic('light') }
  function finish() { const next=status==='running'?runningElapsedMs(elapsedMs,runningSinceRef.current):elapsedMs; setElapsedMs(next); setDisplayElapsedMs(next); runningSinceRef.current=null; setStatus('finish_pending'); triggerHaptic('success') }
  async function save() {
    if (saveState === 'saving') return
    setSaveState('saving')
    const completedAt=Date.now()
    const result=await saveTimeChallengeAttempt(userId,{challengeId:challenge.id,targetTimeMs:targetSeconds*1000,elapsedTimeMs:elapsedMs,completedAt})
    const synthetic={challenge_id:challenge.id,target_time_ms:targetSeconds*1000,elapsed_time_ms:elapsedMs,completed_at:new Date(completedAt).toISOString()}
    setStats((current)=>({ ...current, ...summarizeAttempts([synthetic, ...Array.from({length:current[challenge.id]?.attempts??0},()=>({challenge_id:challenge.id,target_time_ms:(current[challenge.id]?.lastTargetTimeSeconds??targetSeconds)*1000,elapsed_time_ms:(current[challenge.id]?.bestTimeSeconds??Math.ceil(elapsedMs/1000))*1000,completed_at:''}))]) }))
    setSaveState(result.saved?'saved':'offline'); setStatus('completed')
  }
  function resetSame() { openChallenge(challenge) }

  if (screen === 'list') return <main className="time-challenge-list"><header><button type="button" onClick={onBack}>‹</button><div><span>DARTQUEST</span><h1>Time Challenge</h1></div></header><p>Trainiere gegen deine eigene Bestzeit.</p><section>{timeChallenges.map((item)=>{const stat=stats[item.id];return <article key={item.id}><div><small>TIME CHALLENGE</small><h2>{item.title}</h2><p>{item.short}</p></div><dl><div><dt>BESTZEIT</dt><dd>{stat?.bestTimeSeconds?formatTrainingTime(stat.bestTimeSeconds):'–'}</dd></div><div><dt>LETZTE ZEIT</dt><dd>{stat?.lastTimeSeconds?formatTrainingTime(stat.lastTimeSeconds):'–'}</dd></div><div><dt>VERSUCHE</dt><dd>{stat?.attempts??0}</dd></div></dl><button type="button" onClick={()=>openChallenge(item)}>STARTEN</button></article>})}</section></main>

  if (screen === 'setup') { const stat=stats[challenge.id]; return <main className="time-challenge-setup"><header><button type="button" onClick={()=>setScreen('list')}>‹</button><div><span>TIME CHALLENGE</span><h1>{challenge.title}</h1></div></header><section><span>DEINE ZIELZEIT</span><strong>{formatTrainingTime(targetSeconds)}</strong><div><button onClick={()=>changeTarget(-60)}>− 1 MIN</button><button onClick={()=>changeTarget(-30)}>− 30 SEK</button><button onClick={()=>changeTarget(30)}>+ 30 SEK</button><button onClick={()=>changeTarget(60)}>+ 1 MIN</button></div>{stat?.bestTimeSeconds&&<button className="preset" onClick={()=>setTargetSeconds(stat.bestTimeSeconds)}>BESTZEIT ANGREIFEN · {formatTrainingTime(stat.bestTimeSeconds)}</button>}{stat?.lastTimeSeconds&&<button className="preset" onClick={()=>setTargetSeconds(stat.lastTimeSeconds)}>LETZTE ZEIT SCHLAGEN · {formatTrainingTime(stat.lastTimeSeconds)}</button>}<button className="primary" onClick={start}>▶ START</button></section></main> }

  const snapshot=timerSnapshot(targetSeconds*1000,displayElapsedMs)
  const stat=stats[challenge.id]
  const shownSeconds=Math.floor((snapshot.overtime?snapshot.overtimeMs:snapshot.remainingMs)/1000)
  const timerTone=getTimeChallengeTone(Math.ceil(snapshot.remainingMs/1000),snapshot.overtime)
  const newBest=stat?.bestTimeSeconds==null||Math.ceil(elapsedMs/1000)<stat.bestTimeSeconds
  return <main className={`time-challenge-play ${timerTone}`}><header><button type="button" onClick={()=>setScreen('list')}>‹</button><div><span>TIME CHALLENGE</span><h1>{challenge.title}</h1></div></header><div className="time-challenge-task"><span>TRIFF ALLE {challenge.field}</span><strong>{challenge.focus}</strong><span>DER REIHE NACH.</span></div><div className="time-challenge-target"><small>ZIELZEIT</small><strong>{formatTrainingTime(targetSeconds)}</strong></div><div className="time-challenge-ring" style={{'--progress':`${snapshot.progress*360}deg`}}><div><strong key={`${timerTone}-${shownSeconds}`}>{formatTrainingTime(shownSeconds,snapshot.overtime)}</strong><small>{snapshot.overtime?'ZIELZEIT VERPASST':status==='paused'?'PAUSIERT':'VERBLEIBENDE ZEIT'}</small></div></div><div className="time-challenge-comparison"><span>BESTZEIT <b>{stat?.bestTimeSeconds?formatTrainingTime(stat.bestTimeSeconds):'–'}</b></span><span>LETZTE ZEIT <b>{stat?.lastTimeSeconds?formatTrainingTime(stat.lastTimeSeconds):'–'}</b></span></div><div className="time-challenge-actions"><button className="stop" disabled={status!=='running'} onClick={stop}>■ STOPP</button><button disabled={!['paused','finish_pending'].includes(status)} onClick={resume}>Ⅱ WEITER</button><button className="finish" disabled={!['running','paused'].includes(status)} onClick={finish}>✓ FERTIG</button></div><button className="time-challenge-giveup" onClick={()=>setScreen('list')}>AUFGEBEN</button>{status==='finish_pending'&&<aside className="time-challenge-result"><small>{newBest?'NEUE BESTZEIT!':'GESCHAFFT!'}</small><h2>{formatTrainingTime(Math.ceil(elapsedMs/1000))}</h2><p>Ziel {formatTrainingTime(targetSeconds)} · {snapshot.overtime?`${formatTrainingTime(Math.ceil(snapshot.overtimeMs/1000),true)} verpasst`:`${formatTrainingTime(Math.floor(snapshot.remainingMs/1000))} schneller`}</p><button onClick={save}>ZEIT SPEICHERN</button><button onClick={resume}>WEITERMACHEN</button></aside>}{status==='completed'&&<aside className="time-challenge-result"><small>{newBest?'NEUE BESTZEIT!':'ZEIT GESPEICHERT'}</small><h2>{formatTrainingTime(Math.ceil(elapsedMs/1000))}</h2>{saveState==='offline'&&<p>Offline gespeichert – wird beim nächsten verfügbaren Sync erneut berücksichtigt.</p>}<button onClick={resetSame}>NOCHMAL</button><button onClick={()=>setScreen('list')}>ZUR AUSWAHL</button></aside>}</main>
}

export default TimeChallenge
