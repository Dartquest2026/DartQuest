import { useEffect, useRef, useState } from 'react'

import { triggerHaptic } from '../../features/settings/haptics.js'

export const PRESS_FEEDBACK_DELAY_MS = 130

export function getPressFeedbackDelay(root = document.documentElement) {
  return root?.dataset?.animations === 'full' ? PRESS_FEEDBACK_DELAY_MS : 0
}

export function usePressFeedback() {
  const [pressedKey, setPressedKey] = useState(null)
  const lockedRef = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  function press(key, action, hapticType = 'light') {
    if (lockedRef.current) return false

    triggerHaptic(hapticType)
    const delay = getPressFeedbackDelay()
    if (!delay) {
      action()
      return true
    }

    lockedRef.current = true
    setPressedKey(key)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setPressedKey(null)
      action()
      lockedRef.current = false
    }, delay)
    return true
  }

  return { pressedKey, press }
}
