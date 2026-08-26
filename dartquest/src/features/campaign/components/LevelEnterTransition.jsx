import { useCallback, useEffect, useRef, useState } from 'react'
import { getBossIntroContent } from '../bossIntro'
import { getBossHapticPattern, getBossPresentation, getBossPresentationStyle } from '../bossPresentation'
import { loadSettings, vibrate } from '../../settings/settingsStorage'

import './LevelEnterTransition.css'

function LevelEnterTransition({ level, sourceRect, worldName, onComplete }) {
  const [phase, setPhase] = useState('focusing')
  const completed = useRef(false)
  const hapticPlayed = useRef(false)
  const historyPushed = useRef(false)
  const skipButton = useRef(null)
  const isBoss = level.boss === true
  const bossContent = isBoss ? getBossIntroContent(level, worldName) : null
  const bossPresentation = isBoss ? getBossPresentation(level) : null

  const finishOnce = useCallback(() => {
    if (completed.current) return
    completed.current = true
    onComplete()
  }, [onComplete])

  const requestFinish = useCallback(() => {
    if (window.history.state?.dartQuestOverlay === 'boss-intro') window.history.back()
    else finishOnce()
  }, [finishOnce])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animationMode = document.documentElement.dataset.animations
    const limitedMotion = reducedMotion || animationMode === 'reduced'
    const noMotion = animationMode === 'off'
    const zoomTimer = window.setTimeout(() => setPhase(isBoss ? 'revealing' : 'zooming'), noMotion ? 0 : limitedMotion ? 20 : 300)
    const readyTimer = isBoss ? window.setTimeout(() => setPhase('ready'), noMotion ? 20 : limitedMotion ? 180 : 1050) : null
    const completeTimer = isBoss ? null : window.setTimeout(finishOnce, reducedMotion ? 140 : 1500)
    document.body.style.overflow = 'hidden'

    if (isBoss && !hapticPlayed.current) {
      hapticPlayed.current = true
      vibrate(getBossHapticPattern(bossPresentation.hapticKey), loadSettings())
    }
    if (isBoss && !historyPushed.current) {
      window.history.pushState({ dartQuestOverlay: 'boss-intro' }, '')
      historyPushed.current = true
    }
    const focusTimer = isBoss ? window.setTimeout(() => skipButton.current?.focus(), noMotion ? 0 : 320) : null
    const finishOnEscape = (event) => { if (event.key === 'Escape') requestFinish() }
    if (isBoss) {
      window.addEventListener('keydown', finishOnEscape)
      window.addEventListener('popstate', finishOnce)
    }

    return () => {
      window.clearTimeout(zoomTimer)
      if (readyTimer) window.clearTimeout(readyTimer)
      if (completeTimer) window.clearTimeout(completeTimer)
      if (focusTimer) window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', finishOnEscape)
      window.removeEventListener('popstate', finishOnce)
      if (window.history.state?.dartQuestOverlay === 'boss-intro') window.history.replaceState(null, '')
      document.body.style.overflow = previousOverflow
    }
  }, [bossPresentation?.hapticKey, finishOnce, isBoss, requestFinish])

  const centerX = sourceRect ? sourceRect.x + sourceRect.width / 2 : window.innerWidth / 2
  const centerY = sourceRect ? sourceRect.y + sourceRect.height / 2 : window.innerHeight / 2
  const size = Math.max(sourceRect?.width ?? 58, sourceRect?.height ?? 58)
  const style = {
    '--level-enter-x': `${centerX - size / 2}px`,
    '--level-enter-y': `${centerY - size / 2}px`,
    '--level-enter-size': `${size}px`,
    '--level-enter-dx': `${window.innerWidth / 2 - centerX}px`,
    '--level-enter-dy': `${window.innerHeight / 2 - centerY}px`,
  }

  return (
    <div className={`level-enter-transition is-${phase}${isBoss ? ` is-boss boss-theme-${bossPresentation.theme} boss-effect-${bossPresentation.effect}` : ''}`} style={{ ...style, ...(isBoss ? getBossPresentationStyle(bossPresentation) : {}) }} aria-hidden={isBoss ? undefined : 'true'}>
      <div className="level-enter-transition__veil" />
      <div className="level-enter-transition__world" />
      <div className="level-enter-transition__node">
        <span>{level.boss ? 'BOSS-LEVEL' : 'LEVEL'}</span>
        <strong>{level.id}</strong>
      </div>
      {isBoss && <section className="boss-intro" role="dialog" aria-modal="true" aria-labelledby="boss-intro-title"><div className="boss-intro__effect" aria-hidden="true"><i /><i /><i /></div><div className="boss-intro__emblem" aria-hidden="true">{bossPresentation.symbol || '◆'}</div><p>BOSS-LEVEL · WELT {bossContent.world} · LEVEL {bossContent.levelId}</p><h2 id="boss-intro-title">{bossContent.bossName}</h2><strong>{bossContent.worldLabel}</strong><div><span>DEINE AUFGABE</span><b>{bossContent.task}</b>{bossContent.target && <small>{bossContent.target}</small>}</div><button ref={skipButton} className="boss-intro__ready" type="button" onClick={requestFinish}>BEREIT</button></section>}
    </div>
  )
}

export default LevelEnterTransition
