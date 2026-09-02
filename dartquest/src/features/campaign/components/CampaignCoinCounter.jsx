import { useEffect, useLayoutEffect, useRef, useState } from 'react'

function CampaignCoinCounter({ confirmedCoins, animation, onAnimationComplete }) {
  const safeConfirmedCoins = Number.isSafeInteger(Number(confirmedCoins)) ? Number(confirmedCoins) : 0
  const [displayCoins, setDisplayCoins] = useState(safeConfirmedCoins)
  const [announcement, setAnnouncement] = useState('')
  const animationFrame = useRef(null)
  const completionTimer = useRef(null)
  const handledAnimation = useRef(null)
  const onCompleteRef = useRef(onAnimationComplete)

  useEffect(() => {
    onCompleteRef.current = onAnimationComplete
  }, [onAnimationComplete])

  useLayoutEffect(() => {
    if (animation && handledAnimation.current !== animation.id) setDisplayCoins(animation.from)
  }, [animation])

  useEffect(() => {
    if (!animation && !animationFrame.current) setDisplayCoins(safeConfirmedCoins)
  }, [animation, safeConfirmedCoins])

  useEffect(() => {
    if (!animation || handledAnimation.current === animation.id) return undefined
    handledAnimation.current = animation.id
    const mode = document.documentElement.dataset.animations
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = mode === 'off' || reducedMotion ? 0 : mode === 'reduced' ? 180 : 900
    const startedAt = performance.now()
    setAnnouncement(`${animation.awarded} Coins erhalten, neuer Stand ${animation.to}`)

    const finish = () => {
      animationFrame.current = null
      setDisplayCoins(animation.to)
      if (duration === 0) {
        onCompleteRef.current?.(animation.id)
        return
      }
      completionTimer.current = window.setTimeout(() => {
        completionTimer.current = null
        onCompleteRef.current?.(animation.id)
      }, 500)
    }
    if (duration === 0) {
      finish()
      return () => { if (completionTimer.current) window.clearTimeout(completionTimer.current) }
    }
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - ((1 - progress) ** 3)
      setDisplayCoins(Math.round(animation.from + animation.awarded * eased))
      if (progress < 1) animationFrame.current = window.requestAnimationFrame(tick)
      else finish()
    }
    animationFrame.current = window.requestAnimationFrame(tick)
    return () => {
      if (animationFrame.current) window.cancelAnimationFrame(animationFrame.current)
      if (completionTimer.current) window.clearTimeout(completionTimer.current)
      animationFrame.current = null
      completionTimer.current = null
    }
  }, [animation])

  return <div className={`dq-coins${animation ? ' is-rewarding' : ''}`}>
    <span className="dq-coin-icon" aria-hidden="true">🪙</span>
    <strong>{displayCoins.toLocaleString('de-DE')}</strong>
    <span>Coins</span>
    {animation && <b className="dq-coin-gain" aria-hidden="true">+{animation.awarded}</b>}
    <span className="dq-sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>
}

export default CampaignCoinCounter
