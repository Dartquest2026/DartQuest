import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { boardDelta, detectBoard, smoothBoard, trackBoard } from '../cameraDetection'
import CameraCalibrationLab from './CameraCalibrationLab'
import { calibrateBoard, calibrationFromManualKeypoints, renderNormalizedBoard } from '../cameraVision/boardCalibration'
import { BOARD_MODEL_RADII, GROUND_TRUTH_POINTS, NORMALIZED_CENTER, SEGMENT_BOUNDARY_ANGLES } from '../cameraVision/boardGeometry'
import { projectPoint } from '../cameraVision/boardHomography'
import { createVideoDisplayTransform, displayPointToVideoPoint, videoPointToDisplayPoint } from '../cameraVision/coordinateTransforms'
import './CameraPreview.css'

const ANALYSIS_WIDTH = 280
const ANALYSIS_INTERVAL = 160

const CameraPreview = forwardRef(function CameraPreview(_, forwardedRef) {
  const stageRef = useRef(null), videoRef = useRef(null), overlayRef = useRef(null)
  const workRef = useRef(document.createElement('canvas')), streamRef = useRef(null), trackRef = useRef(null)
  const requestRef = useRef(0), loopRef = useRef(0), lastAnalysisRef = useRef(0)
  const boardRef = useRef(null), stableFramesRef = useRef(0), referenceRef = useRef(null)
  const previousFrameRef = useRef(null), movementSeenRef = useRef(false), markersRef = useRef([]), ringVisibleUntilRef = useRef(0)
  const boardStateRef = useRef('SEARCHING'), lockStreakRef = useRef(0), lostFramesRef = useRef(0), outlierRef = useRef(null)
  const candidateHistoryRef = useRef([]), candidateChangedFramesRef = useRef(0), geometryJumpCountRef = useRef(0), lastDetectionAtRef = useRef(0)
  const calibrationRef = useRef(null), autoCalibrationRef = useRef(null), autoOrientationRef = useRef(null), calibrationPendingRef = useRef(null), normalizedCanvasRef = useRef(document.createElement('canvas')), analysisFrameRef = useRef(null), manualPointsRef = useRef([]), calibrationRejectedRef = useRef(0)
  const debugRef = useRef(true), manualModeRef = useRef(false)
  const [status, setStatus] = useState('starting'), [error, setError] = useState(''), [debug, setDebug] = useState(true)
  const [manualMode, setManualMode] = useState(false), [manualPointCount, setManualPointCount] = useState(0)
  const [zoom, setZoom] = useState({ value: 1, min: 1, max: 1, step: .1, hardware: false })
  const [detection, setDetection] = useState({ state: 'SEARCHING', found: false, confidence: 0, stable: false, reference: false, last: 'keine', features: 0, lostFrames: 0 })

  const stopCamera = useCallback(() => {
    requestRef.current += 1; cancelAnimationFrame(loopRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null; trackRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    boardRef.current = null; referenceRef.current = null; previousFrameRef.current = null; markersRef.current = []
    boardStateRef.current = 'SEARCHING'; lockStreakRef.current = 0; lostFramesRef.current = 0; outlierRef.current = null
    candidateHistoryRef.current = []; candidateChangedFramesRef.current = 0; geometryJumpCountRef.current = 0
    calibrationRef.current = null; autoCalibrationRef.current = null; autoOrientationRef.current = null; calibrationPendingRef.current = null; manualPointsRef.current = []; calibrationRejectedRef.current = 0
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
    const rect = createVideoDisplayTransform(video.videoWidth, video.videoHeight, width, height)
    const sx = rect.width / board.frameWidth, sy = rect.height / board.frameHeight
    const x = rect.x + board.x * sx, y = rect.y + board.y * sy, rx = board.rx * sx, ry = board.ry * sy
    const opacity = now < ringVisibleUntilRef.current ? 1 : Math.max(0, 1 - (now - ringVisibleUntilRef.current) / 800)
    context.save()
    for (const candidate of board.candidates ?? []) { const cx = rect.x + candidate.x * sx, cy = rect.y + candidate.y * sy; context.globalAlpha = candidate.candidateId === board.selectedCandidateId ? .9 : .28; context.strokeStyle = candidate.candidateId === board.selectedCandidateId ? '#ffe35b' : '#61d9ff'; context.lineWidth = candidate.candidateId === board.selectedCandidateId ? 1.5 : 1; context.beginPath(); context.ellipse(cx, cy, candidate.rx * sx, candidate.ry * sy, candidate.rotation, 0, Math.PI * 2); context.stroke(); context.fillStyle = context.strokeStyle; context.font = 'bold 9px sans-serif'; context.fillText(candidate.candidateId, cx + candidate.rx * sx * .72, cy - candidate.ry * sy * .68) }
    context.globalAlpha = opacity; context.strokeStyle = '#42e695'; context.lineWidth = 2; context.shadowColor = '#42e695'; context.shadowBlur = 9
    if (boardStateRef.current === 'SEARCHING') context.setLineDash([6, 5])
    context.beginPath(); context.ellipse(x, y, rx, ry, board.rotation, 0, Math.PI * 2); context.stroke(); context.setLineDash([])
    context.fillStyle = '#42e69522'; context.beginPath(); context.moveTo(x, y); context.ellipse(x, y, rx, ry, board.rotation, -Math.PI / 2 - Math.PI / 20, -Math.PI / 2 + Math.PI / 20); context.closePath(); context.fill()
    context.fillStyle = '#42e695'; context.beginPath(); context.arc(x, y, 3, 0, Math.PI * 2); context.fill(); context.restore()
    if (debugRef.current) {
      context.save(); context.strokeStyle = '#ff5fd155'; context.lineWidth = 1
      for (const ring of board.rings ?? []) { context.beginPath(); context.ellipse(x, y, rx * ring.radius, ry * ring.radius, board.rotation, 0, Math.PI * 2); context.stroke() }
      const bx = rect.x + (board.bullX ?? board.x) * sx, by = rect.y + (board.bullY ?? board.y) * sy; context.strokeStyle = '#ffe35b'; context.beginPath(); context.moveTo(bx - 5, by); context.lineTo(bx + 5, by); context.moveTo(bx, by - 5); context.lineTo(bx, by + 5); context.stroke(); context.fillStyle = '#ffe35b'; context.font = 'bold 9px sans-serif'; context.fillText('B', bx + 6, by - 4)
      context.strokeStyle = '#61d9ff44'; for (let line = 0; line < Math.min(20, board.spiderLines ?? 0); line += 1) { const angle = (board.spiderPhase ?? 0) + line * Math.PI / 10; context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.cos(angle) * rx * .76, y + Math.sin(angle) * ry * .76); context.stroke() } context.restore()
    }
    const calibration = calibrationRef.current
    if (debugRef.current && calibration?.inverseHomography) {
      const calibrationTransform = createVideoDisplayTransform(calibration.sourceSize?.width ?? board.frameWidth, calibration.sourceSize?.height ?? board.frameHeight, width, height)
      const project = (point) => { const source = projectPoint(calibration.inverseHomography, point); return source ? videoPointToDisplayPoint(source, calibrationTransform) : null }
      context.save(); context.strokeStyle = '#ffe35bcc'; context.lineWidth = 1.4
      for (const radius of Object.values(BOARD_MODEL_RADII)) { context.beginPath(); for (let step = 0; step <= 72; step += 1) { const angle = step / 72 * Math.PI * 2, point = project({ x: NORMALIZED_CENTER + Math.cos(angle) * radius, y: NORMALIZED_CENTER + Math.sin(angle) * radius }); if (point) step ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y) } context.stroke() }
      for (const angle of SEGMENT_BOUNDARY_ANGLES) { const start = project({ x: NORMALIZED_CENTER + Math.cos(angle) * BOARD_MODEL_RADII.outerBull, y: NORMALIZED_CENTER + Math.sin(angle) * BOARD_MODEL_RADII.outerBull }), end = project({ x: NORMALIZED_CENTER + Math.cos(angle) * BOARD_MODEL_RADII.doubleOuter, y: NORMALIZED_CENTER + Math.sin(angle) * BOARD_MODEL_RADII.doubleOuter }); if (start && end) { context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke() } }
      context.fillStyle = '#ff65d8'; context.font = 'bold 10px sans-serif'
      for (const [index, point] of Object.values(calibration.keypoints ?? {}).entries()) { if (!point) continue; const display = videoPointToDisplayPoint(point, calibrationTransform); context.beginPath(); context.arc(display.x, display.y, 4, 0, Math.PI * 2); context.fill(); context.fillText(`K${index + 1}`, display.x + 5, display.y - 5) }
      context.restore()
    }
    if (manualModeRef.current) {
      const videoTransform = createVideoDisplayTransform(video.videoWidth, video.videoHeight, width, height)
      context.save(); context.fillStyle = '#ff65d8'; context.font = 'bold 10px sans-serif'
      manualPointsRef.current.forEach((point, index) => { const display = videoPointToDisplayPoint(point, videoTransform); context.beginPath(); context.arc(display.x, display.y, 5, 0, Math.PI * 2); context.fill(); context.fillText(`K${index + 1}`, display.x + 6, display.y - 6) }); context.restore()
    }
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
    analysisFrameRef.current = image
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
    const proposed = calibrateBoard(image, found)
    const orientationDelta = autoOrientationRef.current != null && proposed.orientationAngle != null ? Math.abs(Math.atan2(Math.sin(proposed.orientationAngle - autoOrientationRef.current), Math.cos(proposed.orientationAngle - autoOrientationRef.current))) : 0
    proposed.orientationDelta = orientationDelta
    if (orientationDelta > Math.PI / 12) { proposed.condition = 'BAD'; proposed.state = 'KEYPOINTS_FOUND'; proposed.rejected = true; proposed.rejectionReason = `ORIENT JUMP: ${(orientationDelta * 180 / Math.PI).toFixed(0)}°`; calibrationRejectedRef.current += 1 }
    if (proposed.homography) { autoCalibrationRef.current = proposed; if (!proposed.rejected) autoOrientationRef.current = proposed.orientationAngle }
    if (!manualModeRef.current && !calibrationRef.current?.manual && proposed.homography && proposed.condition !== 'BAD') {
      const orientationStable = orientationDelta <= Math.PI / 12
      const pending = calibrationPendingRef.current, agrees = pending && orientationStable && Math.abs((pending.value.reprojectionError ?? 99) - proposed.reprojectionError) < 2 && Math.abs((pending.value.geometryValidationScore ?? 0) - proposed.geometryValidationScore) < .12
      calibrationPendingRef.current = { value: proposed, frames: agrees ? pending.frames + 1 : 1 }
      if (calibrationPendingRef.current.frames >= 3) { calibrationRef.current = { ...proposed, state: calibrationRef.current ? 'TRACKING' : proposed.state }; calibrationPendingRef.current = null }
    }
    if (calibrationRef.current?.inverseHomography) renderNormalizedBoard(normalizedCanvasRef.current, image, calibrationRef.current.inverseHomography, 160, calibrationRef.current.sourceSize)
    const previousSelection = candidateHistoryRef.current.at(-1)
    if (previousSelection) {
      const radiusChange = Math.abs(previousSelection.radius - found.rx) / previousSelection.radius, centerChange = Math.hypot(previousSelection.x - found.x, previousSelection.y - found.y)
      if (radiusChange > .08 || centerChange > 12) candidateChangedFramesRef.current += 1
      if (radiusChange > .15 || centerChange > 24) geometryJumpCountRef.current += 1
    }
    candidateHistoryRef.current.push({ x: found.x, y: found.y, radius: found.rx, score: found.confidence, candidateId: found.selectedCandidateId })
    if (candidateHistoryRef.current.length > 20) candidateHistoryRef.current.shift()
    const history = candidateHistoryRef.current, meanX = history.reduce((sum, item) => sum + item.x, 0) / history.length, meanY = history.reduce((sum, item) => sum + item.y, 0) / history.length, meanRadius = history.reduce((sum, item) => sum + item.radius, 0) / history.length
    const centerJitter = Math.sqrt(history.reduce((sum, item) => sum + (item.x - meanX) ** 2 + (item.y - meanY) ** 2, 0) / history.length)
    const radiusJitter = Math.sqrt(history.reduce((sum, item) => sum + (item.radius - meanRadius) ** 2, 0) / history.length) / meanRadius * 100
    const redetectAge = lastDetectionAtRef.current ? now - lastDetectionAtRef.current : 0; lastDetectionAtRef.current = now
    lockStreakRef.current = moving ? Math.max(1, lockStreakRef.current - 1) : lockStreakRef.current + 1
    if (lockStreakRef.current >= 10 && found.confidence >= .5 && found.bullConfidence >= .2 && found.spiderLines >= 10) boardStateRef.current = 'LOCKED'
    else if (boardStateRef.current === 'LOCKED' && found.confidence < .42) boardStateRef.current = 'TRACKING'
    const stable = stableFramesRef.current >= 8
    referenceRef.current = null
    setDetection((value) => ({ ...value, calibration: calibrationRef.current, autoCalibration: autoCalibrationRef.current, calibrationRejectedCount: calibrationRejectedRef.current, state: boardStateRef.current, found: true, confidence: found.confidence, stable, stableFrames: lockStreakRef.current, candidateChangedFrames: candidateChangedFramesRef.current, geometryJumpCount: geometryJumpCountRef.current, lastRedetect: redetectAge, centerJitter, radiusJitter, reference: false, features: found.features?.length ?? 0, trackingFeatures: found.features?.length ?? 0, lostFrames: 0, reprojection: Number.isFinite(geometryDelta) ? geometryDelta : 0, bullConfidence: found.bullConfidence ?? 0, bullX: found.bullX, bullY: found.bullY, spiderLines: found.spiderLines ?? 0, spiderConfidence: found.spiderConfidence ?? 0, rings: found.rings ?? [], candidates: found.candidates ?? [], selectedCandidateId: found.selectedCandidateId, trackedCandidateId: boardRef.current?.selectedCandidateId, reasons: found.reasons ?? [], x: found.x, y: found.y, rx: found.rx, ry: found.ry, rotation: found.rotation, orientation: found.boardOrientation ?? 0, edgeStrength: found.edgeStrength ?? 0, geometryScore: found.geometryScore ?? 0, outerBoardLikelihood: found.outerBoardLikelihood ?? 0, concentricRingScore: found.concentricRingScore ?? 0 }))
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
    boardRef.current = null; referenceRef.current = null; previousFrameRef.current = null; markersRef.current = []; stableFramesRef.current = 0; movementSeenRef.current = false
    boardStateRef.current = 'SEARCHING'; lockStreakRef.current = 0; lostFramesRef.current = 0; outlierRef.current = null
    candidateHistoryRef.current = []; candidateChangedFramesRef.current = 0; geometryJumpCountRef.current = 0; lastDetectionAtRef.current = 0
    calibrationRef.current = null; autoCalibrationRef.current = null; autoOrientationRef.current = null; calibrationPendingRef.current = null; manualPointsRef.current = []; calibrationRejectedRef.current = 0; setManualPointCount(0); setManualMode(false)
    ringVisibleUntilRef.current = performance.now() + 3000; setDetection({ state: 'SEARCHING', found: false, confidence: 0, stable: false, reference: false, last: 'keine', features: 0, lostFrames: 0 })
  }

  useImperativeHandle(forwardedRef, () => ({ get videoElement() { return videoRef.current }, get stream() { return streamRef.current }, get resolution() { return { width: videoRef.current?.videoWidth ?? 0, height: videoRef.current?.videoHeight ?? 0 } }, stop: stopCamera }), [stopCamera])
  useEffect(() => { void startCamera(); return stopCamera }, [startCamera, stopCamera])
  useEffect(() => { debugRef.current = debug }, [debug])
  useEffect(() => { manualModeRef.current = manualMode }, [manualMode])

  function logSnapshot() {
    const snapshot = { boardState: detection.state, selectedCandidate: detection.selectedCandidateId, trackedBoard: detection.trackedCandidateId, candidates: detection.candidates, bull: { x: detection.bullX, y: detection.bullY, confidence: detection.bullConfidence }, rings: detection.rings, spider: { lines: detection.spiderLines, confidence: detection.spiderConfidence }, tracking: { features: detection.trackingFeatures, error: detection.reprojection, stableFrames: detection.stableFrames, lostFrames: detection.lostFrames }, jitter: { centerPx: detection.centerJitter, radiusPercent: detection.radiusJitter } }
    console.log('DartQuest camera detection snapshot', snapshot); console.table(detection.candidates ?? [])
  }

  function toggleManualCalibration() {
    manualPointsRef.current = []; setManualPointCount(0); setManualMode((value) => !value)
  }

  function undoManualPoint() { manualPointsRef.current.pop(); setManualPointCount(manualPointsRef.current.length) }
  function cancelManualCalibration() { manualPointsRef.current = []; setManualPointCount(0); setManualMode(false) }

  function setManualPoint(event) {
    if (!manualMode || !videoRef.current?.videoWidth || !stageRef.current) return
    const bounds = stageRef.current.getBoundingClientRect(), transform = createVideoDisplayTransform(videoRef.current.videoWidth, videoRef.current.videoHeight, bounds.width, bounds.height)
    const point = displayPointToVideoPoint({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, transform)
    if (point.x < 0 || point.y < 0 || point.x > videoRef.current.videoWidth || point.y > videoRef.current.videoHeight) return
    manualPointsRef.current.push(point); setManualPointCount(manualPointsRef.current.length)
    if (manualPointsRef.current.length === GROUND_TRUTH_POINTS.length) {
      const sourceSize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight }
      calibrationRef.current = calibrationFromManualKeypoints(manualPointsRef.current, analysisFrameRef.current, sourceSize)
      if (analysisFrameRef.current) renderNormalizedBoard(normalizedCanvasRef.current, analysisFrameRef.current, calibrationRef.current.inverseHomography, 160, sourceSize)
      setDetection((value) => ({ ...value, calibration: calibrationRef.current })); setManualMode(false)
    }
  }

  return <>{debug && <CameraCalibrationLab detection={detection} zoom={zoom} video={{ width: videoRef.current?.videoWidth ?? 0, height: videoRef.current?.videoHeight ?? 0 }} videoToDisplayTransform={videoRef.current?.videoWidth && stageRef.current ? createVideoDisplayTransform(videoRef.current.videoWidth, videoRef.current.videoHeight, stageRef.current.clientWidth, stageRef.current.clientHeight) : null} normalizedCanvas={normalizedCanvasRef.current} manualMode={manualMode} manualPointCount={manualPointCount} groundTruthPoint={GROUND_TRUTH_POINTS[manualPointCount]} onManualToggle={toggleManualCalibration} onManualUndo={undoManualPoint} onManualCancel={cancelManualCalibration} onSnapshot={logSnapshot} />}<section className="camera-preview" aria-label="Live-Kamerabild"><div ref={stageRef} className="camera-stage">
    <video ref={videoRef} autoPlay playsInline muted /><canvas ref={overlayRef} className={`camera-detection-canvas${manualMode ? ' is-manual' : ''}`} onPointerDown={setManualPoint} />
    {status === 'starting' && <p className="camera-message" aria-live="polite">Kamera wird gestartet …</p>}
    {status === 'error' && <div className="camera-message camera-error" role="alert"><p>{error}</p><button type="button" onClick={() => void startCamera()}>ERNEUT VERSUCHEN</button></div>}
    {status === 'active' && <>
      <span className="camera-status">● Kamera aktiv</span>
      <div className="camera-zoom-controls" aria-label="Kamerazoom"><button type="button" disabled={!zoom.hardware || zoom.value >= zoom.max} onClick={() => void changeZoom(1)}>+</button><span>{zoom.value.toFixed(1)}×</span><button type="button" disabled={!zoom.hardware || zoom.value <= zoom.min} onClick={() => void changeZoom(-1)}>−</button></div>
      <div className="camera-debug-actions"><button type="button" className={debug ? 'active' : ''} onClick={() => setDebug((value) => !value)}>Erkennung</button><button type="button" onClick={resetDetection}>Reset</button></div>
      {detection.last !== 'keine' && <strong className="camera-hit-badge">{detection.last}</strong>}
    </>}
  </div></section></>
})

export default CameraPreview
