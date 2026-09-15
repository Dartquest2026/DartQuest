import { invertHomography } from './boardHomography.js'

export const LOCATOR_STATES = { SEARCHING: 'BOARD GESUCHT', TRACKING: 'BOARD ERKANNT', UNCERTAIN: 'BOARD UNSICHER', LOST: 'BOARD VERLOREN', MOVED: 'BOARD BEWEGT', ERROR: 'LOCATOR NICHT VERFÜGBAR' }

// Capture/worker lifecycle only. CV modules are bundled exclusively in the worker.
export class BoardLocatorController {
  constructor(video, onResult, { workerFactory = () => new Worker(new URL('./boardLocator.worker.js', import.meta.url), { type: 'module' }), canvas = document.createElement('canvas') } = {}) {
    this.video = video; this.onResult = onResult; this.workerFactory = workerFactory; this.canvas = canvas
    this.epoch = 0; this.id = 0; this.busy = false; this.stopped = false; this.frozen = null
    this.reset()
  }
  reset() {
    this.worker?.terminate(); this.worker = null; this.epoch++; this.busy = false; this.failed = false
    this.lastSent = -Infinity; this.readyAt = performance.now() + 650; this.signature = null; this.state = 'SEARCHING'; this.frozenJobs = 0
    this.onResult({ state: 'SEARCHING', result: null, calibration: null })
  }
  stop() { this.stopped = true; this.worker?.terminate(); this.worker = null; this.busy = false; this.canvas.width = 0; this.canvas.height = 0; this.frozen = null }
  freeze(canvas) { this.frozen = canvas; this.reset(); this.readyAt = 0 }
  reanalyse() { this.reset(); this.readyAt = 0 }
  tick(now) {
    if (this.stopped || this.failed || now < this.readyAt || document.hidden) return
    if (this.busy) {
      if (now - this.lastSent > 5000) this.fail('Analyse-Zeitlimit erreicht. Erneut suchen wählen.')
      return
    }
    if (this.frozen && this.frozenJobs >= 2) return
    const settings = this.video.srcObject?.getVideoTracks?.()[0]?.getSettings?.() ?? {}
    const signature = JSON.stringify([this.video.videoWidth, this.video.videoHeight, settings.zoom, settings.deviceId, settings.facingMode, window.screen.orientation?.angle ?? window.orientation])
    if (!this.frozen && this.signature && this.signature !== signature) { this.reset(); this.signature = signature; return }
    this.signature = signature
    if (now - this.lastSent < (this.state === 'TRACKING' ? 220 : 650)) return
    const source = this.frozen ?? this.video, width = this.frozen?.width ?? this.video.videoWidth, height = this.frozen?.height ?? this.video.videoHeight
    if (!width || !height || (!this.frozen && (this.video.readyState < 2 || this.video.paused))) return
    try {
      if (!this.worker) {
        this.worker = this.workerFactory()
        this.worker.onerror = () => this.fail('Analyse konnte nicht geladen werden. Erneut suchen wählen.')
        this.worker.onmessage = ({ data }) => {
          if (this.stopped || data.epoch !== this.epoch || data.id !== this.id) return
          this.busy = false; this.state = data.state
          if (data.state === 'ERROR') { this.fail(data.error); return }
          let calibration = null
          if (data.result?.valid) {
            const h = data.result.transform.inverseHomography, sx = width / data.result.sourceSize.width, sy = height / data.result.sourceSize.height
            const inverseHomography = h.map((value, i) => value * (i < 3 ? sx : i < 6 ? sy : 1))
            calibration = { inverseHomography, homography: invertHomography(inverseHomography), sourceSize: { width, height }, calibrationMode: 'AUTO_POC', orientationAssumption: data.result.orientationAssumption }
          }
          this.onResult({ ...data, calibration, receivedAt: performance.now() })
        }
      }
      const scale = Math.min(1, 480 / Math.max(width, height))
      this.canvas.width = Math.round(width * scale); this.canvas.height = Math.round(height * scale)
      const context = this.canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(source, 0, 0, this.canvas.width, this.canvas.height)
      const frame = context.getImageData(0, 0, this.canvas.width, this.canvas.height)
      this.busy = true; this.lastSent = now; this.id++; this.frozenJobs++
      this.worker.postMessage({ id: this.id, epoch: this.epoch, frame, timestamp: now, force: Boolean(this.frozen) }, [frame.data.buffer])
    } catch (error) { this.fail(error.message) }
  }
  fail(error) { this.worker?.terminate(); this.worker = null; this.busy = false; this.failed = true; this.state = 'ERROR'; this.onResult({ state: 'ERROR', error, result: null, calibration: null }) }
}
