import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { boardDelta, detectBoard, getContainedVideoRect, smoothBoard, trackBoard } from '../cameraDetection'
import { detectNewDart, normalizeBoardFrame, scoreTwentyDart } from '../cameraDartDetection'
import './CameraPreview.css'

const ANALYSIS_WIDTH = 280
const ANALYSIS_INTERVAL = 160

const CameraPreview = forwardRef(function CameraPreview({ onDartScore }, forwardedRef) {
  const stageRef = useRef(null), videoRef = useRef(null), overlayRef = useRef(null)
  const workRef = useRef(document.createElement('canvas')), streamRef = useRef(null), trackRef = useRef(null)
  const requestRef = useRef(0), loopRef = useRef(0), lastAnalysisRef = useRef(0)
  const boardRef = useRef(null), stableFramesRef = useRef(0), referenceRef = useRef(null)
  const previousFrameRef = useRef(null), movementSeenRef = useRef(false), markersRef = useRef([]), ringVisibleUntilRef = useRef(0)
  const dartPendingRef = useRef(null), dartCountRef = useRef(0), visitTotalRef = useRef(0), scoreCallbackRef = useRef(onDartScore)
  const boardStateRef = useRef('SEARCHING'), lockStreakRef = useRef(0), lostFramesRef = useRef(0), outlierRef = useRef(null)
  const debugRef = useRef(true)
  const [status, setStatus] = useState('starting'), [error, setError] = useState(''), [debug, setDebug] = useState(true)
  const [zoom, setZoom] = useState({ value: 1, min: 1, max: 1, step: .1, hardware: false })
  const [detection, setDetection] = useState({ state: 'SEARCHING', found: false, confidence: 0, stable: false, reference: false, last: 'keine', features: 0, lostFrames: 0 })

  const stopCamera = useCallback(() => {
    requestRef.current += 1; cancelAnimationFrame(loopRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null; trackRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    boardRef.current = null; referenceRef.current = null; previousFrameRef.current = null; markersRef.current = []; dartPendingRef.current = null
    boardStateRef.current = 'SEARCHING'; lockStreakRef.current = 0; lostFramesRef.current = 0; outlierRef.current = null
    const canvas = overlayRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const drawOverlay = useCallback((now) => {
    const canvas = overlayRef.current, video = videoRef.current, stage = stageRef.current, board = boardRef.current
    if (!canvas || !video || !stage) return
    const width = stage.clientWidth, height = stage.clientHeight, ratio = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio) }
    const context = canvas.getContext('2d'); context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height)
    if (!debugRef.current || !board) return
    const rect = getContainedVideoRect(video.videoWidth, video.videoHeight, width, height)
    const sx = rect.width / board.frameWidth, sy = rect.height / board.frameHeight
    const x = rect.x + board.x * sx, y = rect.y + board.y * sy, rx = board.rx * sx, ry = board.ry * sy
    const opacity = now < ringVisibleUntilRef.current ? 1 : Math.max(0, 1 - (now - ringVisibleUntilRef.current) / 800)
    context.save(); context.globalAlpha = opacity; context.strokeStyle = '#42e695'; context.lineWidth = 2; context.shadowColor = '#42e695'; context.shadowBlur = 9
    if (boardStateRef.current === 'SEARCHING') context.setLineDash([6, 5])
    context.beginPath(); context.ellipse(x, y, rx, ry, board.rotation, 0, Math.PI * 2); context.stroke(); context.setLineDash([])
    context.fillStyle = '#42e69522'; context.beginPath(); context.moveTo(x, y); context.ellipse(x, y, rx, ry, board.rotation, -Math.PI / 2 - Math.PI / 20, -Math.PI / 2 + Math.PI / 20); context.closePath(); context.fill()
    context.fillStyle = '#42e695'; context.beginPath(); context.arc(x, y, 3, 0, Math.PI * 2); context.fill(); context.restore()
    if (debugRef.current) for (const feature of board.features ?? []) { context.fillStyle = '#61d9ff'; context.beginPath(); context.arc(rect.x + feature.x * sx, rect.y + feature.y * sy, 1.5, 0, Math.PI * 2); context.fill() }
    for (const marker of markersRef.current) { const mx = rect.x + marker.x * sx, my = rect.y + marker.y * sy; context.strokeStyle = marker.score ? '#ffe35b' : '#ff7f87'; context.lineWidth = 3; context.beginPath(); context.arc(mx, my, 8, 0, Math.PI * 2); context.moveTo(mx - 12, my); context.lineTo(mx + 12, my); context.moveTo(mx, my - 12); context.lineTo(mx, my + 12); context.stroke(); context.fillStyle = context.strokeStyle; context.font = 'bold 9px sans-serif'; context.fillText(`DART ${marker.dart}`, mx + 10, my - 8) }
  }, [])

  const analyse = useCallback((now) => {
    const video = videoRef.current
    const interval = boardStateRef.current === 'SEARCHING' ? 420 : ANALYSIS_INTERVAL
    if (!video?.videoWidth || now - lastAnalysisRef.current < interval) return
    lastAnalysisRef.current = now
    const work = workRef.current, height = Math.round(ANALYSIS_WIDTH * video.videoHeight / video.videoWidth)
    work.width = ANALYSIS_WIDTH; work.height = height
    const context = work.getContext('2d', { willReadFrequently: true }); context.drawImage(video, 0, 0, ANALYSIS_WIDTH, height)
    const image = context.getImageData(0, 0, ANALYSIS_WIDTH, height), previous = boardRef.current
    let found = boardStateRef.current === 'SEARCHING' ? detectBoard(image) : trackBoard(image, previous)
    if (!found) {
      stableFramesRef.current = 0; lostFramesRef.current += 1
      if (lostFramesRef.current >= 5) { boardStateRef.current = 'SEARCHING'; boardRef.current = null; lockStreakRef.current = 0; referenceRef.current = null }
      setDetection((value) => ({ ...value, state: boardStateRef.current, found: Boolean(boardRef.current), stable: false, lostFrames: lostFramesRef.current })); return
    }
    lostFramesRef.current = 0
    if (boardStateRef.current === 'SEARCHING') { boardStateRef.current = 'TRACKING'; lockStreakRef.current = 1; ringVisibleUntilRef.current = now + 3000 }
    const geometryDelta = boardDelta(previous, found)
    const outlierThreshold = previous ? Math.max(18, previous.rx * .18) : Infinity
    if (geometryDelta > outlierThreshold && previous) {
      const agrees = outlierRef.current && boardDelta(outlierRef.current, found) < outlierThreshold * .5
      if (!agrees) { outlierRef.current = found; setDetection((value) => ({ ...value, lostFrames: 0 })); return }
    }
    outlierRef.current = null
    const smoothing = geometryDelta > 8 ? .38 : boardStateRef.current === 'LOCKED' ? .16 : .24
    found = smoothBoard(previous, found, smoothing)
    const gray = new Uint8Array(ANALYSIS_WIDTH * height)
    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) gray[p] = (image.data[i] * 3 + image.data[i + 1] * 6 + image.data[i + 2]) / 10
    let frameDifference = 0
    if (previousFrameRef.current?.length === gray.length) {
      for (let index = 0; index < gray.length; index += 16) frameDifference += Math.abs(gray[index] - previousFrameRef.current[index])
      frameDifference /= gray.length / 16
    }
    previousFrameRef.current = gray
    const moving = geometryDelta > 5 || frameDifference > 8
    stableFramesRef.current = moving ? 0 : stableFramesRef.current + 1
    if (moving) { movementSeenRef.current = true; ringVisibleUntilRef.current = now + 3000 }
    boardRef.current = found
    lockStreakRef.current = moving ? Math.max(1, lockStreakRef.current - 1) : lockStreakRef.current + 1
    if (lockStreakRef.current >= 10 && found.confidence >= .5 && found.bullConfidence >= .2 && found.spiderLines >= 10) boardStateRef.current = 'LOCKED'
    else if (boardStateRef.current === 'LOCKED' && found.confidence < .42) boardStateRef.current = 'TRACKING'
    const stable = stableFramesRef.current >= 8
    const lockedAndStable = boardStateRef.current === 'LOCKED' && stable
    const normalized = lockedAndStable ? normalizeBoardFrame(image, boardRef.current) : null
    if (lockedAndStable && !referenceRef.current) { referenceRef.current = normalized; movementSeenRef.current = false }
    else if (lockedAndStable && referenceRef.current) {
      const dart = detectNewDart(referenceRef.current, normalized)
      if (dart) {
        const pending = dartPendingRef.current, confirmed = pending && Math.hypot(pending.tip.x - dart.tip.x, pending.tip.y - dart.tip.y) < 6
        if (!confirmed) dartPendingRef.current = dart
        else {
          const scored = scoreTwentyDart(dart.tip, normalized.size, boardRef.current.boardOrientation ?? 0)
          const nx = (dart.tip.x / (normalized.size - 1) - .5) * 2, ny = (dart.tip.y / (normalized.size - 1) - .5) * 2
          const cosine = Math.cos(boardRef.current.rotation), sine = Math.sin(boardRef.current.rotation)
          const x = boardRef.current.x + nx * boardRef.current.rx * cosine - ny * boardRef.current.ry * sine
          const y = boardRef.current.y + nx * boardRef.current.rx * sine + ny * boardRef.current.ry * cosine
          if (scored) { dartCountRef.current += 1; visitTotalRef.current += scored.score }
          markersRef.current.push({ x, y, dart: scored ? dartCountRef.current : '?', score: scored?.score ?? 0 })
          if (scored) scoreCallbackRef.current?.(scored.score, { ...scored, confidence: dart.confidence, dartNumber: dartCountRef.current, visitTotal: visitTotalRef.current, complete: dartCountRef.current === 3 })
          if (scored && dartCountRef.current === 3) { dartCountRef.current = 0; visitTotalRef.current = 0 }
          referenceRef.current = normalized; movementSeenRef.current = false; dartPendingRef.current = null
          setDetection((value) => ({ ...value, last: scored ? `${scored.label} · ${scored.score}` : 'Position unsicher', dartConfidence: dart.confidence }))
        }
      } else dartPendingRef.current = null
    }
    setDetection((value) => ({ ...value, state: boardStateRef.current, found: true, confidence: found.confidence, stable, reference: Boolean(referenceRef.current), features: found.features?.length ?? 0, trackingFeatures: found.features?.length ?? 0, lostFrames: 0, reprojection: Number.isFinite(geometryDelta) ? geometryDelta : 0, bullConfidence: found.bullConfidence ?? 0, spiderLines: found.spiderLines ?? 0, spiderConfidence: found.spiderConfidence ?? 0, x: found.x, y: found.y, rx: found.rx, ry: found.ry, rotation: found.rotation, orientation: found.boardOrientation ?? 0 }))
  }, [])

  const startLoop = useCallback(() => {
    const tick = (now) => { analyse(now); drawOverlay(now); loopRef.current = requestAnimationFrame(tick) }
    loopRef.current = requestAnimationFrame(tick)
  }, [analyse, drawOverlay])

  const startCamera = useCallback(async () => {
    stopCamera(); setError(''); setStatus('starting'); setZoom({ value: 1, min: 1, max: 1, step: .1, hardware: false })
    if (!navigator.mediaDevices?.getUserMedia) { setError('Auf diesem Gerät/Browser ist keine Kamera verfügbar.'); setStatus('error'); return }
    const request = requestRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } })
      if (request !== requestRef.current) { stream.getTracks().forEach((track) => track.stop()); return }
      const track = stream.getVideoTracks()[0], capabilities = track.getCapabilities?.() ?? {}, settings = track.getSettings?.() ?? {}
      streamRef.current = stream; trackRef.current = track
      if (capabilities.zoom) setZoom({ value: settings.zoom ?? capabilities.zoom.min, min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step || .1, hardware: true })
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setStatus('active'); ringVisibleUntilRef.current = performance.now() + 3000; startLoop()
    } catch (cameraError) {
      if (request !== requestRef.current) return
      const denied = cameraError?.name === 'NotAllowedError' || cameraError?.name === 'SecurityError'
      setError(denied ? 'Kamerazugriff nicht erlaubt.' : 'Die Kamera konnte nicht gestartet werden.'); setStatus('error')
    }
  }, [startLoop, stopCamera])

  async function changeZoom(direction) {
    if (!zoom.hardware || !trackRef.current) return
    const value = Math.min(zoom.max, Math.max(zoom.min, Number((zoom.value + direction * zoom.step).toFixed(2))))
    try { await trackRef.current.applyConstraints({ advanced: [{ zoom: value }] }); setZoom((current) => ({ ...current, value })); resetDetection() } catch { /* transient device rejection */ }
  }

  function resetDetection() {
    boardRef.current = null; referenceRef.current = null; previousFrameRef.current = null; markersRef.current = []; dartPendingRef.current = null; dartCountRef.current = 0; visitTotalRef.current = 0; stableFramesRef.current = 0; movementSeenRef.current = false
    boardStateRef.current = 'SEARCHING'; lockStreakRef.current = 0; lostFramesRef.current = 0; outlierRef.current = null
    ringVisibleUntilRef.current = performance.now() + 3000; setDetection({ state: 'SEARCHING', found: false, confidence: 0, stable: false, reference: false, last: 'keine', features: 0, lostFrames: 0 })
  }

  useImperativeHandle(forwardedRef, () => ({ get videoElement() { return videoRef.current }, get stream() { return streamRef.current }, get resolution() { return { width: videoRef.current?.videoWidth ?? 0, height: videoRef.current?.videoHeight ?? 0 } }, stop: stopCamera }), [stopCamera])
  useEffect(() => { void startCamera(); return stopCamera }, [startCamera, stopCamera])
  useEffect(() => { debugRef.current = debug }, [debug])
  scoreCallbackRef.current = onDartScore

  return <section className="camera-preview" aria-label="Live-Kamerabild"><div ref={stageRef} className="camera-stage">
    <video ref={videoRef} autoPlay playsInline muted /><canvas ref={overlayRef} className="camera-detection-canvas" />
    {status === 'starting' && <p className="camera-message" aria-live="polite">Kamera wird gestartet …</p>}
    {status === 'error' && <div className="camera-message camera-error" role="alert"><p>{error}</p><button type="button" onClick={() => void startCamera()}>ERNEUT VERSUCHEN</button></div>}
    {status === 'active' && <><span className="camera-status">● Kamera aktiv</span><div className="camera-zoom-controls" aria-label="Kamerazoom"><button type="button" disabled={!zoom.hardware || zoom.value >= zoom.max} onClick={() => void changeZoom(1)}>+</button><span>{zoom.value.toFixed(1)}×</span><button type="button" disabled={!zoom.hardware || zoom.value <= zoom.min} onClick={() => void changeZoom(-1)}>−</button></div><div className="camera-debug-actions"><button type="button" className={debug ? 'active' : ''} onClick={() => setDebug((value) => !value)}>Erkennung</button><button type="button" onClick={resetDetection}>Reset</button></div>{debug && <div className="camera-debug-info">BOARD: {detection.state}<br />Bull: {(detection.bullConfidence ?? 0) >= .42 ? 'FOUND' : 'NOT FOUND'} ({(detection.bullConfidence ?? 0).toFixed(2)})<br />Spider: {detection.spiderLines ?? 0}/20 lines<br />Board features: {detection.features}<br />Tracking features: {detection.trackingFeatures ?? 0}<br />Reprojection: {(detection.reprojection ?? 0).toFixed(1)} px<br />Center: {detection.x?.toFixed(0) ?? '–'} / {detection.y?.toFixed(0) ?? '–'}<br />Ellipse: {detection.rx?.toFixed(0) ?? '–'} / {detection.ry?.toFixed(0) ?? '–'}<br />Ellipse angle: {detection.rotation != null ? `${(detection.rotation * 180 / Math.PI).toFixed(1)}°` : '–'}<br />Perspective: {detection.rx ? (detection.ry / detection.rx).toFixed(2) : '–'}<br />Board orientation: {((detection.orientation ?? 0) * 180 / Math.PI).toFixed(1)}°<br />Confidence: {detection.confidence.toFixed(2)}<br />Lost frames: {detection.lostFrames}<br />Zoom: {zoom.value.toFixed(1)}×<br />Referenz: {detection.reference ? 'BEREIT' : 'wartet'}<br />Letzte Erkennung: {detection.last}{detection.dartConfidence ? ` (${detection.dartConfidence.toFixed(2)})` : ''}</div>}{detection.last !== 'keine' && <strong className="camera-hit-badge">{detection.last}</strong>}</>}
  </div></section>
})

export default CameraPreview
