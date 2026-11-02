let context
export function unlockTrainingAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return Promise.resolve(false)
    if (!context || context.state === 'closed') context = new AudioContext()
    const resumed = context.state === 'running' ? Promise.resolve() : context.resume()
    const source = context.createBufferSource()
    source.buffer = context.createBuffer(1, 1, context.sampleRate)
    source.connect(context.destination)
    source.onended = () => source.disconnect()
    source.start()
    return resumed.then(() => context.state === 'running').catch(() => false)
  } catch { return Promise.resolve(false) }
}
export async function playTrainingSignal(kind) {
  if (!context) return false
  try {
    // Mobile browsers can suspend audio between interactions or in the background.
    // Resume before scheduling, rather than silently dropping the signal.
    if (context.state !== 'running') await context.resume()
    if (context.state !== 'running') return false
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
    return true
  } catch { return false }
}
