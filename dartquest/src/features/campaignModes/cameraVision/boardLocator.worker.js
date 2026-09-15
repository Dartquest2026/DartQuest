import { detectBoard } from './boardLocator.js'
import { createTrackingReference, trackBoard, updateLocatorState } from './boardTracking.js'

let state = null, reference = null, lastFull = -Infinity
self.onmessage = ({ data }) => {
  const { id, epoch, frame, timestamp, force } = data
  const started = performance.now()
  try {
    let track = null, full = force || !reference || timestamp - lastFull > 3000
    if (reference) { track = trackBoard(reference, frame); if (!track.valid) full = true }
    if (track?.moved) { reference = null; state = { ...state, result: null, candidate: null, streak: 0 } }
    if (full) {
      const stableResult = track?.valid ? state.result : null
      const result = detectBoard(frame, timestamp)
      state = updateLocatorState(state, result, timestamp); lastFull = timestamp
      // Keep both transform and original patch reference while stationary. Updating the
      // reference each cycle would accumulate slow camera drift without detecting it.
      if (stableResult && result.valid) state = { ...state, state: 'TRACKING', result: stableResult, everFound: true }
      else reference = state.result ? createTrackingReference(frame, state.result) : null
    }
    self.postMessage({ id, epoch, state: track?.moved && state.state !== 'TRACKING' ? 'MOVED' : state.state, result: state.result, diagnostic: state.diagnostic, tracking: track, lastFull, full, analysisMs: performance.now() - started })
  } catch (error) { reference = null; state = null; self.postMessage({ id, epoch, state: 'ERROR', error: error.message }) }
}
