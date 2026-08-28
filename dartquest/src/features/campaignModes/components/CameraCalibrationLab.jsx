import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'dartquest-camera-calibration-samples-v1'
const POSITIONS = ['FRONTAL', 'LINKS', 'RECHTS', 'OBEN', 'UNTEN', 'LEICHT SCHRÄG']

function loadSamples() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(value) ? value : [] } catch { return [] }
}

function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 }
function deviation(values) { const average = mean(values); return values.length ? Math.sqrt(mean(values.map((value) => (value - average) ** 2))) : 0 }

function buildSample(detection, zoom, video, position) {
  const candidates = detection.candidates ?? []
  const selected = candidates.find((candidate) => candidate.candidateId === detection.selectedCandidateId) ?? candidates[0]
  const radii = candidates.map((candidate) => candidate.rx).sort((a, b) => b - a)
  const selectedIndex = selected ? radii.findIndex((radius) => radius === selected.rx) : -1
  const calibration = detection.calibration ?? {}
  return {
    timestamp: new Date().toISOString(), position, zoom: zoom.value,
    videoWidth: video.width, videoHeight: video.height,
    boardState: detection.state, selectedCandidate: detection.selectedCandidateId ?? null,
    centerX: detection.x ?? null, centerY: detection.y ?? null,
    radiusX: detection.rx ?? null, radiusY: detection.ry ?? null,
    perspectiveRatio: detection.rx ? detection.ry / detection.rx : null,
    bullX: detection.bullX ?? null, bullY: detection.bullY ?? null,
    bullConfidence: detection.bullConfidence ?? 0,
    bullOffset: detection.x != null && detection.bullX != null ? Math.hypot(detection.x - detection.bullX, detection.y - detection.bullY) : null,
    geometryScore: detection.geometryScore ?? 0, outerScore: detection.outerBoardLikelihood ?? 0,
    edgeScore: detection.edgeStrength ?? 0, ringScore: detection.concentricRingScore ?? 0,
    spiderScore: detection.spiderConfidence ?? 0, finalConfidence: detection.confidence ?? 0,
    centerJitter: detection.centerJitter ?? 0, radiusJitter: detection.radiusJitter ?? 0,
    detectedRadii: (detection.rings ?? []).map((ring) => ring.radius),
    candidateCount: candidates.length, candidateSwitchCount: detection.candidateChangedFrames ?? 0,
    geometryJumpCount: detection.geometryJumpCount ?? 0,
    relativeToNextSmaller: selectedIndex >= 0 && radii[selectedIndex + 1] ? selected.rx / radii[selectedIndex + 1] : null,
    relativeToNextLarger: selectedIndex > 0 ? selected.rx / radii[selectedIndex - 1] : null,
    relativeToBull: selected?.rx && detection.rings?.[0]?.radius ? 1 / detection.rings[0].radius : null,
    relativeToLargestInnerRing: selected?.rx && detection.rings?.length > 1 ? 1 / detection.rings.at(-2).radius : null,
    topCandidates: candidates.slice(0, 3).map((candidate) => ({ id: candidate.candidateId, centerX: candidate.x, centerY: candidate.y, radiusX: candidate.rx, radiusY: candidate.ry, relativeRadius: candidate.relativeRadius, outerScore: candidate.outerBoardLikelihood, bullScore: candidate.bullAlignmentScore, ringCount: candidate.ringCount, finalScore: candidate.finalCandidateScore })),
    keypoints: calibration.keypoints ?? null, keypointConfidences: calibration.keypointConfidence ?? null,
    homography: calibration.homography ?? null, inverseHomography: calibration.inverseHomography ?? null,
    matchCount: calibration.matchCount ?? 0, inlierCount: calibration.inlierCount ?? 0,
    reprojectionError: calibration.reprojectionError ?? null, geometryValidationScore: calibration.geometryValidationScore ?? 0,
    orientationAngle: calibration.orientationAngle ?? null, calibrationState: calibration.state ?? 'SEARCHING', homographyCondition: calibration.condition ?? 'BAD', manualCalibration: calibration.manual === true,
  }
}

export default function CameraCalibrationLab({ detection, zoom, video, normalizedCanvas, manualMode, manualPointCount, onManualToggle, onSnapshot }) {
  const [position, setPosition] = useState('FRONTAL')
  const [samples, setSamples] = useState(loadSamples)
  const [copyStatus, setCopyStatus] = useState('')
  const [measuring, setMeasuring] = useState(false)
  const [summary, setSummary] = useState(null)
  const measurementRef = useRef([]), timerRef = useRef(0), previewRef = useRef(null)
  const calibration = detection.calibration ?? {}

  useEffect(() => {
    const liveCalibration = detection.calibration ?? {}
    if (measuring && detection.x != null) measurementRef.current.push({ time: performance.now(), x: detection.x, y: detection.y, radius: detection.rx, bullOffset: detection.bullX == null ? 0 : Math.hypot(detection.x - detection.bullX, detection.y - detection.bullY), confidence: detection.confidence, switches: detection.candidateChangedFrames ?? 0, jumps: detection.geometryJumpCount ?? 0, calibrationState: liveCalibration.state, reprojection: liveCalibration.reprojectionError, inliers: liveCalibration.inlierCount, keypoints: Object.values(liveCalibration.keypoints ?? {}).filter(Boolean).length, homography: liveCalibration.homography })
  }, [detection, measuring])

  useEffect(() => { const canvas = previewRef.current; if (!canvas || !normalizedCanvas?.width) return; const context = canvas.getContext('2d'); context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(normalizedCanvas, 0, 0, canvas.width, canvas.height) }, [detection, normalizedCanvas])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  function saveMeasurement() {
    const next = [...samples, buildSample(detection, zoom, video, position)]
    setSamples(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function startMeasurement() {
    if (measuring) return
    measurementRef.current = []; setSummary(null); setMeasuring(true)
    timerRef.current = window.setTimeout(() => {
      const frames = measurementRef.current, first = frames[0], last = frames.at(-1)
      const reprojections = frames.map((item) => item.reprojection).filter(Number.isFinite), homographySwitches = frames.slice(1).filter((item, index) => item.homography && frames[index].homography && item.homography.some((value, matrixIndex) => Math.abs(value - frames[index].homography[matrixIndex]) > .01)).length
      setSummary({ frames: frames.length, candidateSwitches: first && last ? Math.max(0, last.switches - first.switches) : 0, geometryJumps: first && last ? Math.max(0, last.jumps - first.jumps) : 0, meanX: mean(frames.map((item) => item.x)), meanY: mean(frames.map((item) => item.y)), centerDeviation: Math.hypot(deviation(frames.map((item) => item.x)), deviation(frames.map((item) => item.y))), meanRadius: mean(frames.map((item) => item.radius)), radiusDeviation: deviation(frames.map((item) => item.radius)), bullOffset: mean(frames.map((item) => item.bullOffset)), confidence: mean(frames.map((item) => item.confidence)), calibratedFrames: frames.filter((item) => ['CALIBRATED','TRACKING'].includes(item.calibrationState)).length, keypointLosses: frames.filter((item) => item.keypoints < 4).length, calibrationLosses: frames.filter((item, index) => index && ['CALIBRATED','TRACKING'].includes(frames[index-1].calibrationState) && !['CALIBRATED','TRACKING'].includes(item.calibrationState)).length, homographySwitches, reprojectionAverage: mean(reprojections), reprojectionMax: reprojections.length ? Math.max(...reprojections) : 0, inliersAverage: mean(frames.map((item) => item.inliers ?? 0)) })
      setMeasuring(false)
    }, 5000)
  }

  async function copyData() {
    const json = JSON.stringify(samples)
    try { await navigator.clipboard.writeText(json); setCopyStatus('KOPIERT') } catch { setCopyStatus('NICHT MÖGLICH') }
    console.table(samples); window.setTimeout(() => setCopyStatus(''), 1800)
  }

  function clearSamples() {
    if (!window.confirm('Alle lokalen Calibration-Messungen löschen?')) return
    localStorage.removeItem(STORAGE_KEY); setSamples([]); setSummary(null)
  }

  const bullOffset = detection.x != null && detection.bullX != null ? Math.hypot(detection.x - detection.bullX, detection.y - detection.bullY) : 0
  return <aside className="camera-calibration-lab has-normalized" aria-label="Camera Calibration Lab">
    <header><span>CAMERA CALIBRATION</span><strong>CALIBRATION: {calibration.state ?? 'SEARCHING'} · {calibration.condition ?? 'BAD'}</strong></header>
    <div className="calibration-normalized"><span>NORMALIZED</span><canvas ref={previewRef} width="100" height="100" /></div>
    <section className="calibration-metrics">
      <span><small>CENTER</small>{detection.x?.toFixed(0) ?? '–'} / {detection.y?.toFixed(0) ?? '–'}</span><span><small>OUTER RX/RY</small>{detection.rx?.toFixed(0) ?? '–'} / {detection.ry?.toFixed(0) ?? '–'}</span><span><small>PERSPECTIVE</small>{detection.rx ? (detection.ry / detection.rx).toFixed(2) : '–'}</span><span><small>BULL X/Y</small>{detection.bullX?.toFixed(0) ?? '–'} / {detection.bullY?.toFixed(0) ?? '–'}</span><span><small>BULL OFFSET</small>{bullOffset.toFixed(1)} px</span><span><small>JITTER C/R</small>{(detection.centerJitter ?? 0).toFixed(1)}px / {(detection.radiusJitter ?? 0).toFixed(1)}%</span><span><small>CONFIDENCE</small>{(detection.confidence ?? 0).toFixed(2)}</span>
    </section>
    <div className="calibration-candidates">{(detection.candidates ?? []).slice(0, 3).map((candidate) => <span key={candidate.candidateId}><b>{candidate.candidateId}</b> R{Math.round(candidate.relativeRadius * 100)}% · OUT {candidate.outerBoardLikelihood.toFixed(2)} · BULL {candidate.bullAlignmentScore.toFixed(2)} · R{candidate.ringCount} · {candidate.finalCandidateScore.toFixed(2)}</span>)}</div>
    <p className="calibration-radii"><b>RADII:</b> {(detection.rings ?? []).map((ring) => ring.radius.toFixed(2)).join(' · ') || '–'}</p>
    <p className="calibration-homography">KEYPOINTS {Object.values(calibration.keypoints ?? {}).filter(Boolean).length}/4 · K1 {(calibration.keypointConfidence?.top ?? 0).toFixed(2)} K2 {(calibration.keypointConfidence?.right ?? 0).toFixed(2)} K3 {(calibration.keypointConfidence?.bottom ?? 0).toFixed(2)} K4 {(calibration.keypointConfidence?.left ?? 0).toFixed(2)} · MATCHES {calibration.matchCount ?? 0} · INLIERS {calibration.inlierCount ?? 0} · REPROJ {Number.isFinite(calibration.reprojectionError) ? calibration.reprojectionError.toFixed(1) : '–'}px · GEOMETRY {(calibration.geometryValidationScore ?? 0).toFixed(2)}</p>
    {summary && <p className="calibration-summary">5s: {summary.calibratedFrames}/{summary.frames} calibrated · KP lost {summary.keypointLosses} · H switches {summary.homographySwitches} · Reproj Ø{summary.reprojectionAverage.toFixed(1)}/max{summary.reprojectionMax.toFixed(1)} · Inliers Ø{summary.inliersAverage.toFixed(1)}</p>}
    <footer><select value={position} onChange={(event) => setPosition(event.target.value)} aria-label="Testposition">{POSITIONS.map((item) => <option key={item}>{item}</option>)}</select><button type="button" disabled={detection.x == null} onClick={saveMeasurement}>MESSUNG SPEICHERN</button><button type="button" disabled={measuring} onClick={startMeasurement}>{measuring ? 'MESSE …' : '5 SEK MESSEN'}</button><button type="button" onClick={onSnapshot}>SNAPSHOT</button><button type="button" className={manualMode ? 'active' : ''} onClick={onManualToggle}>{manualMode ? `SETZE K${manualPointCount + 1}` : 'KEYPOINTS MANUELL'}</button><button type="button" disabled={!samples.length} onClick={() => void copyData()}>{copyStatus || 'DATEN KOPIEREN'}</button><button type="button" disabled={!samples.length} onClick={clearSamples}>MESSUNGEN LÖSCHEN</button></footer>
    <div className="calibration-samples"><b>SAMPLES: {samples.length}</b>{samples.slice(-3).reverse().map((sample, index) => <span key={sample.timestamp}>#{samples.length - index} {sample.position} {sample.zoom.toFixed(1)}× {sample.boardState}</span>)}</div>
  </aside>
}
