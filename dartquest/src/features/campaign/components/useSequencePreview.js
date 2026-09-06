import { useEffect, useState } from 'react'

export function useSequencePreview(attempt) {
  const [previewIndex, setPreviewIndex] = useState(0)
  const enabled = attempt.ordered && attempt.sequence.length > 1 && document.documentElement.dataset.animations !== 'off'

  useEffect(() => {
    if (!enabled) return undefined
    const timer = window.setInterval(() => setPreviewIndex((index) => (index + 1) % attempt.sequence.length), 550)
    return () => window.clearInterval(timer)
  }, [attempt.sequence, enabled])

  return enabled ? attempt.sequence[previewIndex % attempt.sequence.length] : null
}
