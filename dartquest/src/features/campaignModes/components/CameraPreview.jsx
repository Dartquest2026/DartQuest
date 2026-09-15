import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { MANUAL_BOARD_POINTS, createBoardOverlayGeometry } from '../cameraVision/boardGeometry.js'
import { projectPoint } from '../cameraVision/boardHomography.js'
import { createVideoDisplayTransform, clientPointToVideoPoint, videoPointToDisplayPoint } from '../cameraVision/coordinateTransforms.js'
import { CALIBRATION_STORAGE_KEY, calibrateFourPoints, cameraGeometryCompatible, restoreCalibration } from '../cameraVision/manualBoardCalibration.js'
import './CameraPreview.css'
import CameraDatasetPanel from './CameraDatasetPanel.jsx'

const MODEL = createBoardOverlayGeometry()
const DEFAULT_ZOOM = { value: 1, min: 1, max: 1, step: .1, hardware: false }
const EMPTY = { mode: 'idle', points: [], calibration: null, geometry: null }
function geometryFor(video, track) {
  const settings = track?.getSettings?.() ?? {}
  return { width: video.videoWidth, height: video.videoHeight, deviceId: settings.deviceId ?? '', facingMode: settings.facingMode ?? '', zoom: settings.zoom ?? 1, resizeMode: settings.resizeMode ?? '', orientation: window.screen.orientation?.angle ?? window.orientation ?? 0 }
}

const CameraPreview = forwardRef(function CameraPreview(_, forwardedRef) {
  const stageRef = useRef(null), videoRef = useRef(null), overlayRef = useRef(null)
  const streamRef = useRef(null), trackRef = useRef(null), requestRef = useRef(0), loopRef = useRef(0)
  const sessionRef = useRef(EMPTY), debugRef = useRef(false), zoomBusyRef = useRef(false)
  const [status, setStatus] = useState('starting'), [error, setError] = useState('')
  const [session, setSession] = useState(EMPTY), [debug, setDebug] = useState(false)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM), [zoomBusy, setZoomBusy] = useState(false), [notice, setNotice] = useState('')
  const [datasetOpen, setDatasetOpen] = useState(false)
  const updateSession = useCallback((value) => { sessionRef.current = value; setSession(value) }, [])
  const invalidate = useCallback((message) => { updateSession(EMPTY); setNotice(message) }, [updateSession])

  const stopCamera = useCallback(() => {
    requestRef.current += 1; cancelAnimationFrame(loopRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null; trackRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current, video = videoRef.current, stage = stageRef.current
    if (!canvas || !video || !stage) return
    const width = stage.clientWidth, height = stage.clientHeight, ratio = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
    }
    const context = canvas.getContext('2d')
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height)
    if (!video.videoWidth || !video.videoHeight) return
    const current = sessionRef.current
    if (current.geometry && !cameraGeometryCompatible(current.geometry, geometryFor(video, trackRef.current))) {
      invalidate('Kamerageometrie geändert. Bitte neu kalibrieren.'); return
    }
    const transform = createVideoDisplayTransform(video.videoWidth, video.videoHeight, width, height)
    context.save(); context.beginPath()
    context.rect(Math.max(0, transform.x), Math.max(0, transform.y), Math.min(width, transform.width), Math.min(height, transform.height)); context.clip()
    context.lineWidth = 1.4; context.strokeStyle = '#ffe35b'; context.fillStyle = '#ffe35b'
    if (current.calibration) {
      const project = (point) => videoPointToDisplayPoint(projectPoint(current.calibration.inverseHomography, point), transform)
      for (const points of [...MODEL.rings.map((ring) => ring.points), ...MODEL.boundaries]) {
        context.beginPath()
        points.forEach((point, i) => { const p = project(point); if (i) context.lineTo(p.x, p.y); else context.moveTo(p.x, p.y) }); context.stroke()
      }
      const center = project(MODEL.center)
      context.beginPath(); context.moveTo(center.x - 5, center.y); context.lineTo(center.x + 5, center.y)
      context.moveTo(center.x, center.y - 5); context.lineTo(center.x, center.y + 5); context.stroke()
      if (debugRef.current) {
        context.font = 'bold 11px sans-serif'; context.textAlign = 'center'
        for (const label of MODEL.labels) { const p = project(label.point); context.fillText(label.number, p.x, p.y + 4) }
      }
    }
    if (current.mode !== 'confirmed' || debugRef.current) {
      context.fillStyle = '#ff65d8'; context.font = 'bold 12px sans-serif'; context.textAlign = 'left'
      current.points.forEach((point, index) => {
        const p = videoPointToDisplayPoint(point, transform)
        context.beginPath(); context.arc(p.x, p.y, 5, 0, Math.PI * 2); context.fill()
        context.fillText(['20', '6', '3', '11'][index], p.x + 7, p.y - 7)
      })
    }
    context.restore()
  }, [invalidate])

  const startCamera = useCallback(async () => {
    stopCamera(); setError(''); setStatus('starting'); setZoom(DEFAULT_ZOOM); invalidate('')
    if (!navigator.mediaDevices?.getUserMedia) { setError('Auf diesem Gerät/Browser ist keine Kamera verfügbar.'); setStatus('error'); return }
    const request = requestRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      if (request !== requestRef.current) { stream.getTracks().forEach((track) => track.stop()); return }
      const track = stream.getVideoTracks()[0], capabilities = track.getCapabilities?.() ?? {}, settings = track.getSettings?.() ?? {}
      streamRef.current = stream; trackRef.current = track
      if (capabilities.zoom) setZoom({ value: settings.zoom ?? capabilities.zoom.min, min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step || .1, hardware: true })
      const video = videoRef.current
      video.srcObject = stream; await video.play()
      if (request !== requestRef.current) return
      setStatus('active')
      const geometry = geometryFor(video, track)
      try {
        const saved = localStorage.getItem(CALIBRATION_STORAGE_KEY), restored = restoreCalibration(saved, geometry)
        if (restored) {
          updateSession({ mode: 'preview', points: restored.points, calibration: restored, geometry })
          setNotice('Gespeicherte Kalibrierung geladen. Ausrichtung prüfen und übernehmen.')
        } else if (saved) setNotice('Gespeicherte Kamerageometrie passt nicht. Bitte neu kalibrieren.')
      } catch { setNotice('Lokaler Speicher nicht verfügbar. Kalibrierung gilt für diese Sitzung.') }
      track.onended = () => {
        if (request !== requestRef.current) return
        stopCamera(); invalidate(''); setError('Kamerastream beendet. Bitte erneut starten.'); setStatus('error')
      }
      const tick = () => { if (request !== requestRef.current) return; drawOverlay(); loopRef.current = requestAnimationFrame(tick) }
      loopRef.current = requestAnimationFrame(tick)
    } catch (cameraError) {
      if (request !== requestRef.current) return
      stopCamera()
      const denied = cameraError?.name === 'NotAllowedError' || cameraError?.name === 'SecurityError'
      setError(denied ? 'Kamerazugriff nicht erlaubt.' : 'Die Kamera konnte nicht gestartet werden.'); setStatus('error')
    }
  }, [drawOverlay, invalidate, stopCamera, updateSession])

  async function changeZoom(direction) {
    if (!zoom.hardware || !trackRef.current || zoomBusyRef.current) return
    const track = trackRef.current, request = requestRef.current
    const value = Math.min(zoom.max, Math.max(zoom.min, zoom.value + direction * zoom.step))
    if (value === zoom.value) return
    zoomBusyRef.current = true; setZoomBusy(true); invalidate('Zoom wird geändert. Anschließend bitte neu kalibrieren.')
    try {
      await track.applyConstraints({ advanced: [{ zoom: value }] })
      if (request === requestRef.current) { setZoom((current) => ({ ...current, value: track.getSettings?.().zoom ?? value })); setNotice('Zoom geändert. Bitte neu kalibrieren.') }
    } catch { if (request === requestRef.current) setNotice('Zoom konnte nicht geändert werden. Bitte neu kalibrieren.') }
    finally { zoomBusyRef.current = false; setZoomBusy(false) }
  }
  function beginCalibration() {
    const video = videoRef.current
    if (!video?.videoWidth || zoomBusyRef.current) return
    updateSession({ mode: 'collecting', points: [], calibration: null, geometry: geometryFor(video, trackRef.current) }); setNotice('')
  }
  function undoPoint() {
    const current = sessionRef.current
    updateSession({ ...current, mode: 'collecting', points: current.points.slice(0, -1), calibration: null }); setNotice('')
  }
  function setManualPoint(event) {
    const current = sessionRef.current, stage = stageRef.current, video = videoRef.current
    if (current.mode !== 'collecting' || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    if (!cameraGeometryCompatible(current.geometry, geometryFor(video, trackRef.current))) { invalidate('Kamerageometrie geändert. Bitte neu kalibrieren.'); return }
    const transform = createVideoDisplayTransform(video.videoWidth, video.videoHeight, stage.clientWidth, stage.clientHeight)
    const point = clientPointToVideoPoint({ x: event.clientX, y: event.clientY }, stage.getBoundingClientRect(), transform)
    if (!point) return
    const points = [...current.points, point]
    const calibration = points.length === 4 ? calibrateFourPoints(points, current.geometry, transform) : null
    if (points.length === 4 && !calibration) {
      setNotice('Diese Punkte ergeben kein gültiges Board. Letzten Punkt korrigieren oder neu beginnen.')
      updateSession({ ...current, points, mode: 'invalid' }); return
    }
    updateSession({ ...current, points, calibration, mode: calibration ? 'preview' : 'collecting' }); setNotice('')
  }
  function confirmCalibration() {
    const current = sessionRef.current
    if (!current.calibration) return
    if (!cameraGeometryCompatible(current.geometry, geometryFor(videoRef.current, trackRef.current))) { invalidate('Kamerageometrie geändert. Bitte neu kalibrieren.'); return }
    updateSession({ ...current, mode: 'confirmed' })
    try { localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(current.calibration)); setNotice('Kalibrierung gespeichert. Kamera und Board nicht bewegen.') }
    catch { setNotice('Overlay fixiert. Lokales Speichern nicht möglich; gilt nur für diese Sitzung.') }
  }

  useImperativeHandle(forwardedRef, () => ({ get videoElement() { return videoRef.current }, get stream() { return streamRef.current }, get resolution() { return { width: videoRef.current?.videoWidth ?? 0, height: videoRef.current?.videoHeight ?? 0 } }, stop: stopCamera }), [stopCamera])
  useEffect(() => { void startCamera(); return stopCamera }, [startCamera, stopCamera])
  useEffect(() => { debugRef.current = debug }, [debug])
  useEffect(() => {
    const changed = () => { if (sessionRef.current.geometry) invalidate('Gerät gedreht. Bitte neu kalibrieren.') }
    window.addEventListener('orientationchange', changed); window.screen.orientation?.addEventListener('change', changed)
    return () => { window.removeEventListener('orientationchange', changed); window.screen.orientation?.removeEventListener('change', changed) }
  }, [invalidate])

  function getCaptureContext() {
    const video = videoRef.current, stage = stageRef.current, current = sessionRef.current
    const settings = trackRef.current?.getSettings?.() ?? {}
    const compatible = current.geometry && cameraGeometryCompatible(current.geometry, geometryFor(video, trackRef.current))
    const bounds = stage.getBoundingClientRect()
    return {
      video, settings,
      viewport: { width: bounds.width, height: bounds.height, layoutWidth: stage.clientWidth, layoutHeight: stage.clientHeight, objectFit: 'contain', objectPosition: '50% 50%', windowWidth: window.innerWidth, windowHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio ?? null },
      orientation: { type: window.screen.orientation?.type ?? null, angle: window.screen.orientation?.angle ?? window.orientation ?? null },
      calibration: compatible ? current.calibration : null,
      calibrationState: compatible ? current.mode : 'idle',
    }
  }

  return <section className={`camera-preview${datasetOpen ? ' has-dataset' : ''}`} aria-label="Live-Kamerabild">
    <div ref={stageRef} className="camera-stage">
      <video ref={videoRef} autoPlay playsInline muted /><canvas ref={overlayRef} aria-label="Kalibrierpunkte im Kamerabild setzen" className={`camera-detection-canvas${session.mode === 'collecting' ? ' is-manual' : ''}`} onPointerDown={setManualPoint} />
      {status === 'starting' && <p className="camera-message" aria-live="polite">Kamera wird gestartet …</p>}
      {status === 'error' && <div className="camera-message camera-error" role="alert"><p>{error}</p><button type="button" onClick={() => void startCamera()}>ERNEUT VERSUCHEN</button></div>}
      {status === 'active' && <>
        <span className="camera-status">{session.mode === 'confirmed' ? '● Overlay fixiert' : '● Kamera aktiv'}</span>
        <div className="camera-debug-actions"><button type="button" aria-pressed={debug} onClick={() => setDebug((value) => !value)}>Debug {debug ? 'an' : 'aus'}</button></div>
        <div className="camera-zoom-controls" aria-label="Kamerazoom"><button type="button" aria-label="Vergrößern" disabled={zoomBusy || !zoom.hardware || zoom.value >= zoom.max} onClick={() => void changeZoom(1)}>+</button><span>{zoom.value.toFixed(1)}×</span><button type="button" aria-label="Verkleinern" disabled={zoomBusy || !zoom.hardware || zoom.value <= zoom.min} onClick={() => void changeZoom(-1)}>−</button></div>
      </>}
    </div>
    <div className="camera-data-toolbar"><button type="button" className="camera-data-toggle" aria-expanded={datasetOpen} onClick={() => setDatasetOpen((value) => !value)}>KI DATEN · {datasetOpen ? 'SCHLIESSEN' : 'ENTWICKLUNG'}</button></div>
    {datasetOpen && <CameraDatasetPanel getCaptureContext={getCaptureContext} captureDisabled={status !== 'active' || zoomBusy} />}
    {status === 'active' && !datasetOpen && <div className="camera-calibration-controls">
      <p aria-live="polite">{session.mode === 'collecting' ? `${session.points.length + 1}/4 – Markiere ${MANUAL_BOARD_POINTS[session.points.length].label}` : session.mode === 'preview' ? 'Vorschau: Bull, Ringe und Segmentgrenzen prüfen.' : session.mode === 'confirmed' ? 'Board kalibriert – Overlay bleibt fest.' : 'Board mit vier Punkten kalibrieren.'}</p>
      {session.mode === 'collecting' && <small>Äußere Kante des Double-Rings, mittig im Segment antippen.</small>}
      {notice && <small role="status">{notice}</small>}
      <div className="camera-calibration-buttons">
        {session.mode === 'preview' && <button type="button" onClick={confirmCalibration}>KALIBRIERUNG ÜBERNEHMEN</button>}
        {['collecting', 'preview', 'invalid'].includes(session.mode) && <button type="button" disabled={!session.points.length} onClick={undoPoint}>ZURÜCK</button>}
        <button type="button" disabled={zoomBusy} onClick={beginCalibration}>{session.mode === 'idle' ? 'BOARD KALIBRIEREN' : 'NEU KALIBRIEREN'}</button>
      </div>
      {debug && session.calibration && <small>Video {session.geometry.width} × {session.geometry.height} · Zoom {session.geometry.zoom.toFixed(1)}× · 4 Punkte · projektive Geometrie</small>}
    </div>}
  </section>
})
export default CameraPreview
