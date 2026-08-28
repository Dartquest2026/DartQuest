import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { detectBoard, findFrameChange, getContainedVideoRect, isInTwentySector } from '../cameraDetection'
import './CameraPreview.css'

const ANALYSIS_WIDTH = 280
const ANALYSIS_INTERVAL = 160

const CameraPreview = forwardRef(function CameraPreview(_, forwardedRef) {
  const stageRef = useRef(null), videoRef = useRef(null), overlayRef = useRef(null)
  const workRef = useRef(document.createElement('canvas')), streamRef = useRef(null), trackRef = useRef(null)
  const requestRef = useRef(0), loopRef = useRef(0), lastAnalysisRef = useRef(0)
  const boardRef = useRef(null), stableFramesRef = useRef(0), referenceRef = useRef(null)
  const previousFrameRef = useRef(null), movementSeenRef = useRef(false), markerRef = useRef(null), ringVisibleUntilRef = useRef(0)
  const debugRef = useRef(true)
  const [status, setStatus] = useState('starting'), [error, setError] = useState(''), [debug, setDebug] = useState(true)
  const [zoom, setZoom] = useState({ value: 1, min: 1, max: 1, step: .1, hardware: false })
  const [detection, setDetection] = useState({ found: false, confidence: 0, stable: false, reference: false, last: 'keine' })

  const stopCamera = useCallback(() => {
    requestRef.current += 1; cancelAnimationFrame(loopRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null; trackRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    boardRef.current = null; referenceRef.current = null; previousFrameRef.current = null; markerRef.current = null
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
    context.beginPath(); context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); context.stroke()
    context.fillStyle = '#42e69522'; context.beginPath(); context.moveTo(x, y); context.ellipse(x, y, rx, ry, 0, -Math.PI / 2 - Math.PI / 20, -Math.PI / 2 + Math.PI / 20); context.closePath(); context.fill()
    context.fillStyle = '#42e695'; context.beginPath(); context.arc(x, y, 3, 0, Math.PI * 2); context.fill(); context.restore()
    if (markerRef.current) {
      const mx = rect.x + markerRef.current.x * sx, my = rect.y + markerRef.current.y * sy
      context.strokeStyle = markerRef.current.twenty ? '#ffe35b' : '#ff7f87'; context.lineWidth = 3
      context.beginPath(); context.arc(mx, my, 8, 0, Math.PI * 2); context.moveTo(mx - 12, my); context.lineTo(mx + 12, my); context.moveTo(mx, my - 12); context.lineTo(mx, my + 12); context.stroke()
    }
  }, [])

  const analyse = useCallback((now) => {
    const video = videoRef.current
    if (!video?.videoWidth || now - lastAnalysisRef.current < ANALYSIS_INTERVAL) return
    lastAnalysisRef.current = now
    const work = workRef.current, height = Math.round(ANALYSIS_WIDTH * video.videoHeight / video.videoWidth)
    work.width = ANALYSIS_WIDTH; work.height = height
    const context = work.getContext('2d', { willReadFrequently: true }); context.drawImage(video, 0, 0, ANALYSIS_WIDTH, height)
    const image = context.getImageData(0, 0, ANALYSIS_WIDTH, height), previous = boardRef.current, found = detectBoard(image, previous)
    if (!found) { stableFramesRef.current = 0; setDetection((value) => ({ ...value, found: false, stable: false })); return }
    found.frameWidth = ANALYSIS_WIDTH; found.frameHeight = height
    const gray = new Uint8Array(ANALYSIS_WIDTH * height)
    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) gray[p] = (image.data[i] * 3 + image.data[i + 1] * 6 + image.data[i + 2]) / 10
    let frameDifference = 0
    if (previousFrameRef.current?.length === gray.length) {
      for (let index = 0; index < gray.length; index += 16) frameDifference += Math.abs(gray[index] - previousFrameRef.current[index])
      frameDifference /= gray.length / 16
    }
    previousFrameRef.current = gray
    const delta = previous ? Math.hypot(found.x - previous.x, found.y - previous.y) + Math.abs(found.rx - previous.rx) : 99
    const moving = delta > 5 || frameDifference > 8
    stableFramesRef.current = moving ? 0 : stableFramesRef.current + 1
    if (moving) { movementSeenRef.current = true; ringVisibleUntilRef.current = now + 3000 }
    boardRef.current = previous ? { ...found, x: previous.x * .7 + found.x * .3, y: previous.y * .7 + found.y * .3, rx: previous.rx * .7 + found.rx * .3, ry: previous.ry * .7 + found.ry * .3 } : found
    const stable = stableFramesRef.current >= 8
    if (stable && !referenceRef.current) { referenceRef.current = gray; movementSeenRef.current = false }
    else if (stable && movementSeenRef.current && referenceRef.current) {
      const change = findFrameChange(referenceRef.current, gray, boardRef.current)
      if (change) {
        const twenty = isInTwentySector(change, boardRef.current)
        markerRef.current = { ...change, twenty }; referenceRef.current = gray; movementSeenRef.current = false
        setDetection((value) => ({ ...value, last: twenty ? '20' : 'außerhalb' }))
      }
    }
    setDetection((value) => ({ ...value, found: true, confidence: found.confidence, stable, reference: Boolean(referenceRef.current) }))
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
    try { await trackRef.current.applyConstraints({ advanced: [{ zoom: value }] }); setZoom((current) => ({ ...current, value })) } catch { /* transient device rejection */ }
  }

  function resetDetection() {
    boardRef.current = null; referenceRef.current = null; previousFrameRef.current = null; markerRef.current = null; stableFramesRef.current = 0; movementSeenRef.current = false
    ringVisibleUntilRef.current = performance.now() + 3000; setDetection({ found: false, confidence: 0, stable: false, reference: false, last: 'keine' })
  }

  useImperativeHandle(forwardedRef, () => ({ get videoElement() { return videoRef.current }, get stream() { return streamRef.current }, get resolution() { return { width: videoRef.current?.videoWidth ?? 0, height: videoRef.current?.videoHeight ?? 0 } }, stop: stopCamera }), [stopCamera])
  useEffect(() => { void startCamera(); return stopCamera }, [startCamera, stopCamera])
  useEffect(() => { debugRef.current = debug }, [debug])

  return <section className="camera-preview" aria-label="Live-Kamerabild"><div ref={stageRef} className="camera-stage">
    <video ref={videoRef} autoPlay playsInline muted /><canvas ref={overlayRef} className="camera-detection-canvas" />
    {status === 'starting' && <p className="camera-message" aria-live="polite">Kamera wird gestartet …</p>}
    {status === 'error' && <div className="camera-message camera-error" role="alert"><p>{error}</p><button type="button" onClick={() => void startCamera()}>ERNEUT VERSUCHEN</button></div>}
    {status === 'active' && <><span className="camera-status">● Kamera aktiv</span><div className="camera-zoom-controls" aria-label="Kamerazoom"><button type="button" disabled={!zoom.hardware || zoom.value >= zoom.max} onClick={() => void changeZoom(1)}>+</button><span>{zoom.value.toFixed(1)}×</span><button type="button" disabled={!zoom.hardware || zoom.value <= zoom.min} onClick={() => void changeZoom(-1)}>−</button></div><div className="camera-debug-actions"><button type="button" className={debug ? 'active' : ''} onClick={() => setDebug((value) => !value)}>Erkennung</button><button type="button" onClick={resetDetection}>Reset</button></div>{debug && <div className="camera-debug-info">Board: {detection.found ? 'erkannt' : 'nicht erkannt'}<br />Confidence: {detection.confidence.toFixed(2)}<br />Stabil: {detection.stable ? 'ja' : 'nein'}<br />Zoom: {zoom.value.toFixed(1)}× {zoom.hardware ? 'Hardware' : 'nicht verfügbar'}<br />Referenz: {detection.reference ? 'bereit' : 'wartet'}<br />Letzte Erkennung: {detection.last}</div>}{detection.last !== 'keine' && <strong className="camera-hit-badge">{detection.last === '20' ? '20 ERKANNT' : 'TREFFER AUSSERHALB 20'}</strong>}</>}
  </div></section>
})

export default CameraPreview
