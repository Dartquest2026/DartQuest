import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import './CameraPreview.css'

const CameraPreview = forwardRef(function CameraPreview(_, forwardedRef) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const requestRef = useRef(0)
  const [status, setStatus] = useState('starting')
  const [error, setError] = useState('')

  const stopCamera = useCallback(() => {
    requestRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    stopCamera()
    setError('')
    setStatus('starting')

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Auf diesem Gerät/Browser ist keine Kamera verfügbar.')
      setStatus('error')
      return
    }

    const request = requestRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })

      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('active')
    } catch (cameraError) {
      if (request !== requestRef.current) return
      const denied = cameraError?.name === 'NotAllowedError' || cameraError?.name === 'SecurityError'
      setError(denied ? 'Kamerazugriff nicht erlaubt.' : 'Die Kamera konnte nicht gestartet werden.')
      setStatus('error')
    }
  }, [stopCamera])

  useImperativeHandle(forwardedRef, () => ({
    get videoElement() { return videoRef.current },
    get stream() { return streamRef.current },
    get resolution() {
      return { width: videoRef.current?.videoWidth ?? 0, height: videoRef.current?.videoHeight ?? 0 }
    },
    stop: stopCamera,
  }), [stopCamera])

  useEffect(() => {
    void startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  return (
    <section className="camera-preview" aria-label="Live-Kamerabild">
      <div className="camera-stage">
        <video ref={videoRef} autoPlay playsInline muted />
        <div className="camera-future-overlay" aria-hidden="true" />
        {status === 'starting' && <p className="camera-message" aria-live="polite">Kamera wird gestartet …</p>}
        {status === 'error' && <div className="camera-message camera-error" role="alert"><p>{error}</p><button type="button" onClick={() => void startCamera()}>ERNEUT VERSUCHEN</button></div>}
        {status === 'active' && <span className="camera-status">● Kamera aktiv</span>}
      </div>
    </section>
  )
})

export default CameraPreview
