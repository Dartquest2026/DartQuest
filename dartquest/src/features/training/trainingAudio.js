let context
export function unlockTrainingAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    context ??= new AudioContext()
    context.resume().catch(() => {})
    // A silent source unlocked by the Start gesture also supports mobile Safari.
    const source = context.createBufferSource()
    source.buffer = context.createBuffer(1, 1, context.sampleRate)
    source.connect(context.destination)
    source.start()
  } catch { /* Training remains usable when audio is unavailable. */ }
}
export function playTrainingSignal(kind) {
  if (!context || context.state !== 'running') return
  try {
    const pulses = kind === 'end' ? 12 : 1
    for (let i = 0; i < pulses; i++) {
      const start = context.currentTime + i * .25
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = kind === 'end' ? (i % 2 ? 880 : 660) : 880
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(.18, start + .015)
      gain.gain.setValueAtTime(.18, start + .13)
      gain.gain.linearRampToValueAtTime(0, start + .22)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      oscillator.start(start)
      oscillator.stop(start + .23)
    }
  } catch { /* A blocked sound must never interrupt the timer. */ }
}
