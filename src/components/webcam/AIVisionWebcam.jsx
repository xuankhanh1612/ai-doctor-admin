import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Settings, X, ScanFace } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext.jsx'
import WebcamControls from './WebcamControls.jsx'
import CameraSettingsDrawer from './CameraSettingsDrawer.jsx'
import CameraOverlay from './CameraOverlay.jsx'
import { useMediaPipeVision } from './useMediaPipeVision.js'
import { drawFaceMesh, drawPose, drawClock, drawBorder, drawOverlayBadge } from './drawOverlay.js'
import { saveVisionControlImage, saveVisionControlVideo, dataUrlToFile, blobToDataUrl } from './visionStorage.js'
import './webcam-controls.css'

const RESOLUTIONS = {
  '720': { width: 1280, height: 720 },
  '1080': { width: 1920, height: 1080 },
}

export default function AIVisionWebcam({ onViewMedicalRecord }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const t = (vi, en) => (lang === 'vi' ? vi : en)

  // ----- refs -----
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const uploadedImageElRef = useRef(null)
  const rafRef = useRef(null)
  const recorderRef = useRef(null)
  const recordChunksRef = useRef([])
  const recordTimerRef = useRef(null)
  const recordRafRef = useRef(null)
  const lastResultRef = useRef({})

  // ----- state model (see WEBCAM_CONTROLS_GUIDE.md) -----
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [selectedCamera, setSelectedCamera] = useState('front') // 'front' | 'rear'
  const [resolution, setResolution] = useState('1080')
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [flashSupported, setFlashSupported] = useState(false)

  const [showOverlay, setShowOverlay] = useState(true)
  const [showClock, setShowClock] = useState(true)
  const [showBorder, setShowBorder] = useState(true)
  const [showFaceMesh, setShowFaceMesh] = useState(true)
  const [showPose, setShowPose] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  const [uploadedImage, setUploadedImage] = useState(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [savingStatus, setSavingStatus] = useState('')
  const [now, setNow] = useState(new Date())

  const vision = useMediaPipeVision()
  const visionRef = useRef(vision)
  visionRef.current = vision

  // ----- clock tick -----
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // ----- camera lifecycle -----
  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraOpen(false)
    setCameraStarting(false)
    setFlashSupported(false)
    setFlashEnabled(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const openCamera = useCallback(async (camera = selectedCamera, res = resolution) => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('Trình duyệt không hỗ trợ mở camera.', 'Browser does not support camera access.'))
      return
    }
    setCameraStarting(true)
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    const { width, height } = RESOLUTIONS[res] || RESOLUTIONS['1080']
    const facingMode = camera === 'rear' ? 'environment' : 'user'
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: width }, height: { ideal: height } },
        audio: false,
      })
      streamRef.current = stream
      setUploadedImage(null)
      setIsCameraOpen(true)
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
      const track = stream.getVideoTracks()[0]
      const caps = track?.getCapabilities?.()
      setFlashSupported(!!caps?.torch)
    } catch (error) {
      console.error('AI Vision camera open failed:', error)
      setCameraError(t('Không thể mở camera. Vui lòng cấp quyền camera.', 'Could not open camera. Please grant camera permission.'))
      stopCamera()
    } finally {
      setCameraStarting(false)
    }
  }, [selectedCamera, resolution, stopCamera, lang])

  const closeCamera = useCallback(() => {
    stopCamera()
    setSavingStatus('')
  }, [stopCamera])

  const switchCamera = useCallback(async () => {
    const next = selectedCamera === 'front' ? 'rear' : 'front'
    setSwitching(true)
    setSelectedCamera(next)
    if (isCameraOpen) await openCamera(next, resolution)
    setSwitching(false)
  }, [selectedCamera, resolution, isCameraOpen, openCamera])

  const selectCamera = useCallback(async (camera) => {
    setSelectedCamera(camera)
    if (isCameraOpen) await openCamera(camera, resolution)
  }, [isCameraOpen, resolution, openCamera])

  const selectResolution = useCallback(async (res) => {
    setResolution(res)
    if (isCameraOpen) await openCamera(selectedCamera, res)
  }, [isCameraOpen, selectedCamera, openCamera])

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks?.()[0]
    if (!track || !flashSupported) {
      setSavingStatus(t('Đèn flash không khả dụng trên thiết bị này.', 'Flash unavailable on this device.'))
      return
    }
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashEnabled }] })
      setFlashEnabled(v => !v)
    } catch (error) {
      console.error('Flash toggle failed:', error)
      setSavingStatus(t('Đèn flash không khả dụng trên thiết bị này.', 'Flash unavailable on this device.'))
    }
  }, [flashEnabled, flashSupported, lang])

  // ----- shared drawing -----
  const drawLandmarks = useCallback((ctx, mirror, width) => {
    if (mirror) { ctx.save(); ctx.translate(width, 0); ctx.scale(-1, 1) }
    const drawingUtils = visionRef.current.getDrawingUtils(ctx)
    if (showFaceMesh) drawFaceMesh(ctx, drawingUtils, visionRef.current.getFaceLandmarker(), lastResultRef.current.face)
    if (showPose) drawPose(ctx, drawingUtils, visionRef.current.getPoseLandmarker(), lastResultRef.current.pose)
    if (mirror) ctx.restore()
  }, [showFaceMesh, showPose])

  const drawComposite = useCallback((ctx, { width, height, source, mirror }) => {
    ctx.save()
    ctx.clearRect(0, 0, width, height)
    if (mirror) { ctx.translate(width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(source, 0, 0, width, height)
    ctx.restore()
    if (showOverlay) {
      drawLandmarks(ctx, mirror, width)
      drawOverlayBadge(ctx, width, 'AI DOCTOR VISION SCAN')
    }
    if (showClock) drawClock(ctx, width, height, new Date())
    if (showBorder) drawBorder(ctx, width, height)
  }, [showOverlay, showClock, showBorder, drawLandmarks])

  // ----- live face mesh / pose detection loop -----
  useEffect(() => {
    let cancelled = false
    const needsDetection = isCameraOpen && showOverlay && (showFaceMesh || showPose)

    if (!needsDetection) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext?.('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    visionRef.current.ensureLoaded({ face: showFaceMesh, pose: showPose })

    const loop = async () => {
      if (cancelled) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2 && visionRef.current.status === 'ready') {
        if (canvas.width !== video.videoWidth && video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight && video.videoHeight) canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        try {
          const result = await visionRef.current.detectVideoFrame({ video, face: showFaceMesh, pose: showPose })
          lastResultRef.current = result
        } catch (error) {
          console.error('MediaPipe detection failed:', error)
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawLandmarks(ctx, selectedCamera === 'front', canvas.width)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isCameraOpen, showOverlay, showFaceMesh, showPose, selectedCamera, drawLandmarks])

  // ----- upload image flow -----
  const triggerUpload = useCallback(() => fileInputRef.current?.click(), [])

  const runImageDetection = useCallback(async () => {
    const img = uploadedImageElRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return
    if (!img.complete || !img.naturalWidth) return
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!showOverlay || (!showFaceMesh && !showPose)) {
      lastResultRef.current = {}
      return
    }
    try {
      await visionRef.current.ensureLoaded({ face: showFaceMesh, pose: showPose })
      const result = await visionRef.current.detectImage({ image: img, face: showFaceMesh, pose: showPose })
      lastResultRef.current = result
      drawLandmarks(ctx, false, canvas.width)
    } catch (error) {
      console.error('MediaPipe image detection failed:', error)
    }
  }, [showOverlay, showFaceMesh, showPose, drawLandmarks])

  useEffect(() => {
    if (uploadedImage) runImageDetection()
  }, [uploadedImage, showOverlay, showFaceMesh, showPose, runImageDetection])

  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    closeCamera()
    const dataUrl = await blobToDataUrl(file)
    setUploadedImage(dataUrl)
  }, [closeCamera])

  // ----- capture (save to Medical Records) -----
  const handleCapture = useCallback(async () => {
    setCapturing(true)
    setSavingStatus(t('Đang lưu ảnh vào Upload Records...', 'Saving photo to Upload Records...'))
    try {
      let canvas
      if (isCameraOpen && videoRef.current) {
        const video = videoRef.current
        canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        drawComposite(canvas.getContext('2d'), {
          width: canvas.width, height: canvas.height, source: video, mirror: selectedCamera === 'front',
        })
      } else if (uploadedImage && uploadedImageElRef.current?.naturalWidth) {
        const img = uploadedImageElRef.current
        canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        drawComposite(canvas.getContext('2d'), { width: canvas.width, height: canvas.height, source: img, mirror: false })
      } else {
        setSavingStatus(t('Vui lòng mở camera hoặc tải ảnh lên trước.', 'Please open the camera or upload an image first.'))
        return
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const file = dataUrlToFile(dataUrl, 'ai_vision_capture.jpg')
      const record = await saveVisionControlImage(file, {
        user, lang, label: t('Ảnh chụp AI Doctor Vision', 'AI Doctor Vision capture'),
      })
      setSavingStatus(`${t('Đã lưu vào Upload Records', 'Saved to Upload Records')}: ${record.filename}`)
    } catch (error) {
      console.error('AI Vision capture failed:', error)
      setSavingStatus(t('Không thể lưu ảnh chụp.', 'Could not save the photo.'))
    } finally {
      setCapturing(false)
    }
  }, [isCameraOpen, uploadedImage, selectedCamera, drawComposite, user, lang])

  // ----- save / export to device (PNG download) -----
  const handleSaveDownload = useCallback(() => {
    setDownloading(true)
    try {
      let canvas
      if (isCameraOpen && videoRef.current) {
        const video = videoRef.current
        canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        drawComposite(canvas.getContext('2d'), {
          width: canvas.width, height: canvas.height, source: video, mirror: selectedCamera === 'front',
        })
      } else if (uploadedImage && uploadedImageElRef.current?.naturalWidth) {
        const img = uploadedImageElRef.current
        canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        drawComposite(canvas.getContext('2d'), { width: canvas.width, height: canvas.height, source: img, mirror: false })
      } else {
        setSavingStatus(t('Vui lòng mở camera hoặc tải ảnh lên trước.', 'Please open the camera or upload an image first.'))
        return
      }
      const link = document.createElement('a')
      link.download = `ai_doctor_vision_${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setSavingStatus(t('Đã xuất ảnh PNG về máy.', 'Exported PNG to your device.'))
    } catch (error) {
      console.error('AI Vision export failed:', error)
      setSavingStatus(t('Không thể xuất ảnh.', 'Could not export image.'))
    } finally {
      setDownloading(false)
    }
  }, [isCameraOpen, uploadedImage, selectedCamera, drawComposite, lang])

  // ----- record flow -----
  const toggleRecord = useCallback(async () => {
    if (isRecording) {
      recorderRef.current?.stop()
      return
    }
    const stream = streamRef.current
    if (!isCameraOpen || !stream) {
      setSavingStatus(t('Vui lòng mở camera trước khi ghi video.', 'Please open the camera before recording.'))
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setSavingStatus(t('Trình duyệt không hỗ trợ ghi video.', 'Browser does not support video recording.'))
      return
    }

    let recordStream = stream
    if (showOverlay || showClock || showBorder) {
      const video = videoRef.current
      const recCanvas = document.createElement('canvas')
      recCanvas.width = video.videoWidth || 1280
      recCanvas.height = video.videoHeight || 720
      const recCtx = recCanvas.getContext('2d')
      const drawFrame = () => {
        drawComposite(recCtx, {
          width: recCanvas.width, height: recCanvas.height, source: video, mirror: selectedCamera === 'front',
        })
        recordRafRef.current = requestAnimationFrame(drawFrame)
      }
      drawFrame()
      recordStream = recCanvas.captureStream(30)
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const recorder = new MediaRecorder(recordStream, { mimeType })
    recordChunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data?.size) recordChunksRef.current.push(event.data)
    }
    recorder.onstop = async () => {
      if (recordRafRef.current) { cancelAnimationFrame(recordRafRef.current); recordRafRef.current = null }
      if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null }
      setIsRecording(false)
      setRecordSeconds(0)
      const blob = new Blob(recordChunksRef.current, { type: 'video/webm' })
      setSavingStatus(t('Đang lưu video vào Upload Records...', 'Saving video to Upload Records...'))
      try {
        const record = await saveVisionControlVideo(blob, {
          user, lang, label: t('Video AI Doctor Vision', 'AI Doctor Vision video'),
        })
        setSavingStatus(`${t('Đã lưu video vào Upload Records', 'Saved video to Upload Records')}: ${record.filename}`)
      } catch (error) {
        console.error('AI Vision video save failed:', error)
        setSavingStatus(t('Không thể lưu video.', 'Could not save the video.'))
      }
    }

    recorder.start()
    recorderRef.current = recorder
    setIsRecording(true)
    setRecordSeconds(0)
    recordTimerRef.current = window.setInterval(() => setRecordSeconds(s => s + 1), 1000)
  }, [isRecording, isCameraOpen, showOverlay, showClock, showBorder, selectedCamera, drawComposite, user, lang])

  useEffect(() => () => {
    if (recordRafRef.current) cancelAnimationFrame(recordRafRef.current)
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current)
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop?.()
  }, [])

  // ----- presets -----
  const applyPreset = useCallback((values) => {
    setShowOverlay(values.overlay)
    setShowFaceMesh(values.faceMesh)
    setShowPose(values.pose)
    setShowClock(values.clock)
    setShowBorder(values.border)
  }, [])

  const clearUploadedImage = useCallback(() => {
    setUploadedImage(null)
    lastResultRef.current = {}
    const canvas = canvasRef.current
    const ctx = canvas?.getContext?.('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const showingMedia = isCameraOpen || !!uploadedImage

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="wc-wrapper">
        <div className="wc-frame">
          {isCameraOpen && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`wc-video${selectedCamera === 'front' ? ' wc-mirror' : ''}`}
            />
          )}

          {!isCameraOpen && uploadedImage && (
            <img
              ref={uploadedImageElRef}
              src={uploadedImage}
              alt="uploaded"
              className="wc-uploaded-image"
              onLoad={runImageDetection}
            />
          )}

          <CameraOverlay
            lang={lang}
            cameraOpen={showingMedia}
            isLive={isCameraOpen}
            showOverlay={showOverlay}
            showClock={showClock}
            showBorder={showBorder}
            now={now}
            canvasRef={canvasRef}
            clockInset={showingMedia ? 112 : 14}
          />

          {showingMedia && (
            <button type="button" className="wc-settings-fab" style={{ right: 14 }} onClick={() => setShowSettings(v => !v)} title="Settings">
              <Settings size={18} />
            </button>
          )}
          {showingMedia && (
            <button type="button" className="wc-settings-fab" style={{ right: 60 }} onClick={isCameraOpen ? closeCamera : clearUploadedImage} title={t('Đóng', 'Close')}>
              <X size={18} />
            </button>
          )}

          <CameraSettingsDrawer
            lang={lang}
            open={showSettings}
            showOverlay={showOverlay}
            onToggleOverlay={() => setShowOverlay(v => !v)}
            showClock={showClock}
            onToggleClock={() => setShowClock(v => !v)}
            showBorder={showBorder}
            onToggleBorder={() => setShowBorder(v => !v)}
            showFaceMesh={showFaceMesh}
            onToggleFaceMesh={() => setShowFaceMesh(v => !v)}
            showPose={showPose}
            onTogglePose={() => setShowPose(v => !v)}
            flashEnabled={flashEnabled}
            onToggleFlash={toggleFlash}
            flashSupported={flashSupported}
            selectedCamera={selectedCamera}
            onSelectCamera={selectCamera}
            resolution={resolution}
            onSelectResolution={selectResolution}
            onApplyPreset={applyPreset}
          />

          {!isCameraOpen && !uploadedImage && (
            <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, zIndex: 9 }}>
              <button type="button" className="wc-open-btn" onClick={() => openCamera()} disabled={cameraStarting}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ScanFace size={18} />
                  {cameraStarting ? t('ĐANG MỞ…', 'OPENING…') : t('MỞ CAMERA', 'OPEN CAMERA')}
                </span>
                <span className="wc-open-sub">{t('Bắt đầu quét AI Livestream', 'Start AI Livestream Scan')}</span>
              </button>
              <button type="button" className="wc-upload-link" onClick={triggerUpload}>
                {t('🖼 Hoặc tải ảnh lên để quét', '🖼 Or upload an image to scan')}
              </button>
            </div>
          )}

          {isCameraOpen && (
            <WebcamControls
              lang={lang}
              isRecording={isRecording}
              recordSeconds={recordSeconds}
              capturing={capturing}
              saving={downloading}
              switching={switching}
              onSwitchCamera={switchCamera}
              onUpload={triggerUpload}
              onCapture={handleCapture}
              onRecord={toggleRecord}
              onSave={handleSaveDownload}
            />
          )}

          {!isCameraOpen && uploadedImage && (
            <WebcamControls
              lang={lang}
              isRecording={false}
              capturing={capturing}
              saving={downloading}
              switching={false}
              onSwitchCamera={() => openCamera()}
              onUpload={triggerUpload}
              onCapture={handleCapture}
              onRecord={() => openCamera()}
              onSave={handleSaveDownload}
            />
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      </div>

      {cameraError && <div className="wc-caption wc-status-error">⚠️ {cameraError}</div>}
      {savingStatus && (
        <div className={`wc-caption${savingStatus.startsWith(t('Đã', 'Saved')) || savingStatus.includes('Exported') ? ' wc-status-ok' : ''}`}>
          {savingStatus}
        </div>
      )}
      {!cameraError && !savingStatus && (
        <div className="wc-caption">
          <b>{t('AI demo layer đang BẬT.', 'AI demo layer is ON.')}</b>{' '}
          {isCameraOpen
            ? t('Camera đang BẬT — đang quét AI realtime.', 'Camera is ON — running realtime AI scan.')
            : t('Camera đang TẮT. Bạn có thể tải ảnh lên hoặc mở camera để quét.', 'Camera is OFF. You can upload an image or open camera to scan.')}
        </div>
      )}

      {onViewMedicalRecord && (
        <button
          type="button"
          onClick={onViewMedicalRecord}
          style={{
            minHeight: 42, borderRadius: 11, border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 900,
            fontFamily: 'inherit', color: '#fff', background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            boxShadow: '0 14px 30px rgba(34,197,94,0.24)',
          }}
        >
          {t('Xem hình tại Medical Records', 'View image in Medical Records')}
        </button>
      )}
    </div>
  )
}
