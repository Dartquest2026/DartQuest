import { useEffect, useRef } from 'react'
import { unlockTrainingAudio, playTrainingSignal } from './trainingAudio'
export default function useCountdownAudio(id, seconds, enabled) {
  const signals = useRef(new Map())
  useEffect(() => {
    if (!enabled || !id) return
    const sent = signals.current.get(id) ?? { minute:false, end:false, pending:{} }
    signals.current.set(id,sent)
    const check = async () => {
      const kind = seconds === 0 ? 'end' : seconds <= 60 ? 'minute' : null
      if (!kind || sent[kind] || sent.pending[kind]) return
      sent.pending[kind] = true
      const played = await playTrainingSignal(kind)
      if (played) sent[kind] = true
      sent.pending[kind] = false
    }
    const interact = () => { void unlockTrainingAudio().then(check) }
    const wake = () => { if (!document.hidden) interact() }
    void check()
    document.addEventListener('pointerdown',interact,{capture:true})
    document.addEventListener('visibilitychange',wake)
    window.addEventListener('focus',wake)
    return () => { document.removeEventListener('pointerdown',interact,{capture:true});document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake) }
  },[id,seconds,enabled])
}
