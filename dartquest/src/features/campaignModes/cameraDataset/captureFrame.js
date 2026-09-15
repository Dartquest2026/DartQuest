export const DATASET_VERSION = 1
export const CAPTURE_CATEGORIES = Object.freeze([
  { id: 'empty_board', label: 'BOARD LEER', dartCount: 0 },
  { id: '1_dart', label: '1 DART', dartCount: 1 },
  { id: '2_darts', label: '2 DARTS', dartCount: 2 },
  { id: '3_darts', label: '3 DARTS', dartCount: 3 },
  { id: 'moved', label: 'BOARD / KAMERA BEWEGT', dartCount: null },
  { id: 'other', label: 'SONSTIGES', dartCount: null },
])

export function createCaptureMetadata({ category, videoWidth, videoHeight, viewport, settings = {}, orientation = null, calibration = null, calibrationState = 'idle', appVersion = null, id = crypto.randomUUID(), timestamp = new Date().toISOString() }) {
  const choice = CAPTURE_CATEGORIES.find((item) => item.id === category)
  if (!choice || !(videoWidth > 0 && videoHeight > 0)) throw new Error('Kategorie oder Videobild ungültig.')
  return { id, timestamp, category, dartCount: choice.dartCount, dartCountSource: 'user_category', videoWidth, videoHeight,
    viewport, orientation, zoom: Number.isFinite(settings.zoom) ? settings.zoom : null,
    facingMode: settings.facingMode ?? null, resizeMode: settings.resizeMode ?? null,
    calibrationActive: Boolean(calibration), calibrationState, calibration: calibration ? structuredClone(calibration) : null,
    appVersion, datasetVersion: DATASET_VERSION, imagePath: `images/frame_${id}.jpg`, mimeType: 'image/jpeg', jpegQuality: .95 }
}

// Only the video element is drawn. Neither DOM nor the overlay canvas is an input.
export async function captureVideoFrame(video, context, createCanvas = () => document.createElement('canvas')) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight || video.paused || video.ended) throw new Error('Noch kein aktuelles Kamerabild verfügbar.')
  const canvas = createCanvas()
  canvas.width = video.videoWidth; canvas.height = video.videoHeight
  const metadata = createCaptureMetadata({ ...context, videoWidth: canvas.width, videoHeight: canvas.height })
  try {
    const drawing = canvas.getContext('2d')
    if (!drawing) throw new Error('Bildaufnahme wird nicht unterstützt.')
    drawing.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value?.size && value.type === 'image/jpeg' ? resolve(value) : reject(new Error('JPEG konnte nicht erstellt werden.')), 'image/jpeg', .95))
    return { metadata: { ...metadata, byteSize: blob.size }, blob }
  } finally { canvas.width = 0; canvas.height = 0 }
}
