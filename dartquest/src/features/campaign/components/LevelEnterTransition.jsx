import { useEffect, useState } from 'react'

import './LevelEnterTransition.css'

function LevelEnterTransition({ level, sourceRect, onComplete }) {
  const [phase, setPhase] = useState('focusing')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const zoomTimer = window.setTimeout(() => setPhase('zooming'), reducedMotion ? 20 : 300)
    const completeTimer = window.setTimeout(onComplete, reducedMotion ? 140 : 1500)
    document.body.style.overflow = 'hidden'

    return () => {
      window.clearTimeout(zoomTimer)
      window.clearTimeout(completeTimer)
      document.body.style.overflow = previousOverflow
    }
  }, [onComplete])

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
    <div className={`level-enter-transition is-${phase}${level.boss ? ' is-boss' : ''}`} style={style} aria-hidden="true">
      <div className="level-enter-transition__veil" />
      <div className="level-enter-transition__world" />
      <div className="level-enter-transition__node">
        <span>{level.boss ? 'BOSS-LEVEL' : 'LEVEL'}</span>
        <strong>{level.id}</strong>
      </div>
    </div>
  )
}

export default LevelEnterTransition
