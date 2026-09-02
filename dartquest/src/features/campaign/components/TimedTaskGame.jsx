import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCountdown, getCountdownTone } from '../campaignTimer'
import { createTimedTaskResult, pauseTimedAttempt, resumeTimedAttempt } from '../timedTaskAttempt'
import { triggerHaptic } from '../../settings/haptics'
import './TimedTaskGame.css'

function formatLimit(seconds) {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60
    return `${minutes} ${minutes === 1 ? 'MINUTE' : 'MINUTEN'}`
  }
  return `${seconds} SEKUNDEN`
}

function TimedTaskGame({ level, disabled, onComplete }) {
  const limitMs = level.timeLimitSeconds * 1000
  const [status, setStatus] = useState('idle')
  const [remainingMs, setRemainingMs] = useState(limitMs)
  const endTimeRef = useRef(null)
  const startedAtRef = useRef(null)
  const warningRef = useRef(new Set())
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const tone = getCountdownTone(remainingSeconds)
  const progress = Math.max(0, Math.min(1, remainingMs / limitMs))
  const clock = formatCountdown(remainingSeconds)
  const labels = level.targets?.map((target) => target.label) ?? []
  const fieldType = labels.every((label) => /^D\d+$/i.test(label)) ? 'DOPPEL' : labels.every((label) => /^T\d+$/i.test(label)) ? 'TRIPLE' : 'SINGLE'
  const task = useMemo(() => ({ lead: `TRIFF ALLE ${fieldType}-FELDER`, focus: 'VON 1 BIS 20', tail: 'DER REIHE NACH.' }), [fieldType])

  useEffect(() => {
    if (status !== 'running' || !endTimeRef.current) return undefined
    const update = () => {
      const nextMs = pauseTimedAttempt(endTimeRef.current)
      setRemainingMs(nextMs)
      const nextSeconds = Math.ceil(nextMs / 1000)
      for (const threshold of [60, 30, 10]) {
        if (nextSeconds <= threshold && !warningRef.current.has(threshold)) {
          warningRef.current.add(threshold)
          triggerHaptic(threshold === 10 ? 'medium' : 'light')
        }
      }
      if (nextMs === 0) {
        endTimeRef.current = null
        setStatus('expired')
        triggerHaptic('error')
      }
    }
    update()
    const interval = window.setInterval(update, 200)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [status])

  function start() {
    if (disabled || status !== 'idle') return
    endTimeRef.current = resumeTimedAttempt(limitMs)
    startedAtRef.current = Date.now()
    warningRef.current = new Set()
    setStatus('running'); triggerHaptic('light')
  }

  function stop() {
    if (status !== 'running') return
    setRemainingMs(pauseTimedAttempt(endTimeRef.current))
    endTimeRef.current = null
    setStatus('paused'); triggerHaptic('light')
  }

  function resume() {
    if (!['paused', 'review'].includes(status) || remainingMs <= 0) return
    endTimeRef.current = resumeTimedAttempt(remainingMs)
    setStatus('running'); triggerHaptic('light')
  }

  function finish() {
    if (!['running', 'paused'].includes(status)) return
    if (status === 'running') setRemainingMs(pauseTimedAttempt(endTimeRef.current))
    endTimeRef.current = null
    setStatus('review'); triggerHaptic('medium')
  }

  function confirm() {
    if (status !== 'review') return
    triggerHaptic('success')
    onComplete(createTimedTaskResult(level, remainingMs, Date.now(), startedAtRef.current ?? Date.now()))
  }

  function retry() {
    endTimeRef.current = null
    warningRef.current = new Set()
    startedAtRef.current = null
    setRemainingMs(limitMs)
    setStatus('idle')
    triggerHaptic('light')
  }

  return <section className={`timed-task-game ${tone}${status === 'expired' ? ' is-expired' : ''}`} aria-label="Zeitaufgabe">
    <header className="timed-task-copy"><span>{task.lead}</span><strong>{task.focus}</strong><span>{task.tail}</span></header>
    <div className="timed-task-limit"><small>ZEITLIMIT</small><strong>{formatLimit(level.timeLimitSeconds)}</strong></div>
    <div className="timed-task-clock" style={{ '--timer-progress': `${progress * 360}deg` }}>
      <div><strong aria-live="polite">{clock}</strong><small>{status === 'idle' ? 'BEREIT' : status === 'paused' ? 'PAUSIERT' : status === 'review' ? 'AUFGABE GESCHAFFT?' : status === 'expired' ? 'ZEIT ABGELAUFEN' : 'VERBLEIBENDE ZEIT'}</small></div>
    </div>
    {status === 'review' && <div className="timed-task-review" role="alertdialog" aria-modal="true"><strong>AUFGABE GESCHAFFT</strong><span>Benötigte Zeit: {formatCountdown(Math.ceil((limitMs - remainingMs) / 1000))}</span><button type="button" onClick={confirm}>✓ ERFOLG BESTÄTIGEN</button><button type="button" onClick={resume}>WEITER – NOCH NICHT FERTIG</button></div>}
    {status === 'expired' ? <div className="timed-task-expired"><button type="button" onClick={retry}>ERNEUT VERSUCHEN</button></div> : <div className="timed-task-controls">
      <button className="start" type="button" onClick={start} disabled={disabled || status !== 'idle'}>▶ START</button>
      <button className="stop" type="button" onClick={stop} disabled={status !== 'running'}>■ STOPP</button>
      <button className="resume" type="button" onClick={resume} disabled={!['paused', 'review'].includes(status)}>Ⅱ WEITER</button>
      <button className="finish" type="button" onClick={finish} disabled={!['running', 'paused'].includes(status)}>✓ FERTIG</button>
    </div>}
  </section>
}

export default TimedTaskGame
