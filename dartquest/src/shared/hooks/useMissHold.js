import { useEffect, useRef, useState } from 'react'

export const MISS_HOLD_DURATION_MS = 600

export function useMissHold({ disabled = false, onMiss, onFill }) {
  const [missHolding, setMissHolding] = useState(false)
  const [missTapped, setMissTapped] = useState(false)
  const animationFrame = useRef(null)
  const startedAt = useRef(null)
  const buttonRef = useRef(null)
  const origin = useRef(null)
  const suppressClick = useRef(false)
  const longPressTriggered = useRef(false)
  const feedbackTimer = useRef(null)

  function cancelMissHold() {
    window.cancelAnimationFrame(animationFrame.current)
    animationFrame.current = null
    startedAt.current = null
    origin.current = null
    buttonRef.current?.style.removeProperty('--miss-hold-angle')
    buttonRef.current = null
    setMissHolding(false)
  }

  function completeMissHold(button) {
    animationFrame.current = null
    startedAt.current = null
    origin.current = null
    longPressTriggered.current = true
    suppressClick.current = true
    button.style.setProperty('--miss-hold-angle', '360deg')
    setMissHolding(false)
    button.classList.add('is-long-pressed')
    window.setTimeout(() => button.classList.remove('is-long-pressed'), 280)
    onFill()
  }

  function startMissHold(event) {
    if (disabled) return
    cancelMissHold()
    longPressTriggered.current = false
    suppressClick.current = false
    origin.current = { x:event.clientX, y:event.clientY }
    startedAt.current = performance.now()
    buttonRef.current = event.currentTarget
    event.currentTarget.style.setProperty('--miss-hold-angle', '0deg')
    setMissHolding(true)
    const button = event.currentTarget
    button.setPointerCapture?.(event.pointerId)
    const updateHoldProgress = (now) => {
      if (startedAt.current == null || longPressTriggered.current) return
      const elapsed = now - startedAt.current
      const progress = Math.min(1, elapsed / MISS_HOLD_DURATION_MS)
      button.style.setProperty('--miss-hold-angle', `${progress * 360}deg`)
      if (progress >= 1) completeMissHold(button)
      else animationFrame.current = window.requestAnimationFrame(updateHoldProgress)
    }
    animationFrame.current = window.requestAnimationFrame(updateHoldProgress)
  }

  function moveMissHold(event) {
    if (!origin.current || longPressTriggered.current) return
    if (Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 12) cancelMissHold()
  }

  function endMissHold() {
    const wasLongPress = longPressTriggered.current
    const hadActiveHold = animationFrame.current != null
    cancelMissHold()
    suppressClick.current = true
    if (!wasLongPress && hadActiveHold) {
      setMissTapped(true)
      window.clearTimeout(feedbackTimer.current)
      feedbackTimer.current = window.setTimeout(() => setMissTapped(false), 160)
      onMiss()
    }
  }

  function clickMiss(event) {
    if (suppressClick.current) {
      suppressClick.current = false
      event.preventDefault()
      return
    }
    if (event.detail === 0 && !disabled) onMiss()
  }

  useEffect(() => () => {
    window.cancelAnimationFrame(animationFrame.current)
    window.clearTimeout(feedbackTimer.current)
  }, [])

  return {
    missHolding,
    missTapped,
    missButtonProps:{ onPointerDown:startMissHold, onPointerMove:moveMissHold, onPointerLeave:cancelMissHold, onPointerUp:endMissHold, onPointerCancel:cancelMissHold, onClick:clickMiss, onContextMenu:(event) => event.preventDefault() },
  }
}
