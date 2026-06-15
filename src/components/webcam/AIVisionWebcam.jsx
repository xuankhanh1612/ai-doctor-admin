import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Settings, X, ScanFace } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext.jsx'
import WebcamControls from './WebcamControls.jsx'
import CameraSettingsDrawer from './CameraSettingsDrawer.jsx'
import CameraOverlay from './CameraOverlay.jsx'
import { useMediaPipeVision } from './useMediaPipeVision.js'
import { drawFaceMesh, drawPose, drawObjectDetections, drawClock, drawBorder, drawOverlayBadge } from './drawOverlay.js'
import { saveVisionControlImage, saveVisionControlVideo, dataUrlToFile, blobToDataUrl } from './visionStorage.js'
import './webcam-controls.css'

const RESOLUTIONS = {
  '720': { width: 1280, height: 720 },
  '1080': { width: 1920, height: 1080 },
}

export default function AIVisionWebcam({ onViewMedicalRecord, onCaptureSaved, onPreviewCapture, reviewImageUrl, onExitReview }) {
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

  // ----- state -----
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [selectedCamera, setSelectedCamera] = useState('front') // 'front' | 'rear'
  const [resolution, setResolution] = useState('1080')
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [flashSupported, setFlashSupported] = useState(false)

  const [showObjectDetection, setShowObjectDetection] = useState(true)
  const [showClock, setShowClock] = useState(true)
  const [showBorder, setShowBorder] = useState(true)
  const [showFaceMesh, setShowFaceMesh] = useState(false)
  const [showPose, setShowPose] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [uploadedImage, setUploadedImage] = useState(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [savingStatus, setSavingStatus] = useState('')
  const [now, setNow] = useState(new Date())

  // ----- capture preview (confirm before save) -----
  // { dataUrl, kind } | null
  const [capturePreview, setCapturePreview] = useState(null)
  const [savingPreview, setSavingPreview] = useState(false)

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

  // iOS Safari: sau khi isCameraOpen=true React mới mount <video>.
  // Effect này gán srcObject + gọi play() ngay khi video element vào DOM.
  useEffect(() => {
    if (!isCameraOpen) return
    const video = videoRef.current
    const stream = streamRef.current
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [isCameraOpen])

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
      // iOS Safari: gán srcObject + play() ngay trong cùng microtask getUserMedia.
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setIsCameraOpen(true)
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
  // KHÔNG flip gì cả — cả video lẫn canvas đều hiển thị raw stream.
  // Giống WebcamControls.jsx (trang Control): không dùng CSS mirror, không dùng ctx scale(-1).
  // Browser/OS tự xử lý chiều camera front trên mỗi thiết bị.
  const drawLandmarks = useCallback((ctx, width) => {
    const drawingUtils = visionRef.current.getDrawingUtils(ctx)
    if (showFaceMesh) drawFaceMesh(ctx, drawingUtils, visionRef.current.getFaceLandmarker(), lastResultRef.current.face)
    if (showPose) drawPose(ctx, drawingUtils, visionRef.current.getPoseLandmarker(), lastResultRef.current.pose)
    if (showObjectDetection) drawObjectDetections(ctx, lastResultRef.current.object)
  }, [showFaceMesh, showPose, showObjectDetection])

  // drawComposite: dùng cho capture/record/export — vẽ thẳng không flip.
  const drawComposite = useCallback((ctx, { width, height, source }) => {
    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(source, 0, 0, width, height)
    ctx.restore()
    if (showObjectDetection || showFaceMesh || showPose) {
      drawLandmarks(ctx, width)
      drawOverlayBadge(ctx, width, 'AI DOCTOR VISION SCAN')
    }
    if (showClock) drawClock(ctx, width, height, new Date())
    if (showBorder) drawBorder(ctx, width, height)
  }, [showObjectDetection, showFaceMesh, showPose, showClock, showBorder, drawLandmarks])

  // ----- live face mesh / pose detection loop -----
  useEffect(() => {
    let cancelled = false
    const needsDetection = isCameraOpen && (showObjectDetection || showFaceMesh || showPose)

    if (!needsDetection) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext?.('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    visionRef.current.ensureLoaded({ face: showFaceMesh, pose: showPose, object: showObjectDetection })

    const loop = async () => {
      if (cancelled) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2 && visionRef.current.status === 'ready') {
        if (canvas.width !== video.videoWidth && video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight && video.videoHeight) canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        try {
          const result = await visionRef.current.detectVideoFrame({ video, face: showFaceMesh, pose: showPose, object: showObjectDetection })
          lastResultRef.current = result
        } catch (error) {
          console.error('MediaPipe detection failed:', error)
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawLandmarks(ctx, canvas.width)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isCameraOpen, showObjectDetection, showFaceMesh, showPose, drawLandmarks])

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
    if (!showObjectDetection && !showFaceMesh && !showPose) {
      lastResultRef.current = {}
      return
    }
    try {
      await visionRef.current.ensureLoaded({ face: showFaceMesh, pose: showPose, object: showObjectDetection })
      const result = await visionRef.current.detectImage({ image: img, face: showFaceMesh, pose: showPose, object: showObjectDetection })
      lastResultRef.current = result
      drawLandmarks(ctx, canvas.width)
    } catch (error) {
      console.error('MediaPipe image detection failed:', error)
    }
  }, [showObjectDetection, showFaceMesh, showPose, drawLandmarks])

  useEffect(() => {
    if (uploadedImage) runImageDetection()
  }, [uploadedImage, showObjectDetection, showFaceMesh, showPose, runImageDetection])

  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    closeCamera()
    const dataUrl = await blobToDataUrl(file)
    setUploadedImage(dataUrl)
  }, [closeCamera])

  // ----- load reviewImageUrl into upload mode (Xem lại ảnh đã chụp) -----
  // Khi parent truyền reviewImageUrl, tắt camera và load ảnh vào upload mode
  // với MỌI lớp phủ mặc định TẮT (kể cả clock, border, AI layers)
  useEffect(() => {
    if (!reviewImageUrl) return
    closeCamera()
    setCapturePreview(null)
    setUploadedImage(reviewImageUrl)
    // Tắt hết lớp phủ khi xem lại ảnh proof
    setShowObjectDetection(false)
    setShowFaceMesh(false)
    setShowPose(false)
    setShowClock(false)
    setShowBorder(false)
  }, [reviewImageUrl, closeCamera])

  // ----- capture preview: save confirmed -----
  const handleConfirmSave = useCallback(async () => {
    if (!capturePreview) return
    setSavingPreview(true)
    setSavingStatus(t('Đang lưu ảnh vào Upload Records...', 'Saving photo to Upload Records...'))
    try {
      const file = dataUrlToFile(capturePreview.dataUrl, 'ai_vision_capture.jpg')
      const record = await saveVisionControlImage(file, {
        user, lang, label: t('Ảnh chụp AI Doctor Vision', 'AI Doctor Vision capture'),
      })
      setSavingStatus(`${t('Đã lưu vào Upload Records', 'Saved to Upload Records')}: ${record.filename}`)
      onCaptureSaved?.(record)
      setCapturePreview(null)
    } catch (error) {
      console.error('AI Vision capture save failed:', error)
      setSavingStatus(t('Không thể lưu ảnh chụp.', 'Could not save the photo.'))
    } finally {
      setSavingPreview(false)
    }
  }, [capturePreview, user, lang, onCaptureSaved])

  // ----- capture preview: cancel → reopen camera -----
  const handleCancelPreview = useCallback(async () => {
    setCapturePreview(null)
    setSavingStatus('')
    await openCamera()
  }, [openCamera])

  // ----- capture -----
  const handleCapture = useCallback(async () => {
    try {
      let canvas
      let kind = 'webcam'
      if (isCameraOpen && videoRef.current) {
        const video = videoRef.current
        canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        drawComposite(canvas.getContext('2d'), { width: canvas.width, height: canvas.height, source: video })
        kind = 'webcam'
      } else if (uploadedImage && uploadedImageElRef.current?.naturalWidth) {
        const img = uploadedImageElRef.current
        canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        drawComposite(canvas.getContext('2d'), { width: canvas.width, height: canvas.height, source: img })
        kind = 'image'
      } else {
        setSavingStatus(t('Vui lòng mở camera hoặc tải ảnh lên trước.', 'Please open the camera or upload an image first.'))
        return
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

      // Nếu có onPreviewCapture (prop từ parent): delegate về parent
      if (onPreviewCapture) {
        onPreviewCapture(dataUrl, kind)
        setSavingStatus(t('Ảnh đã chụp — nhấn "Lưu ảnh" để xác nhận.', 'Photo taken — tap "Save photo" to confirm.'))
        return
      }

      // Luồng nội bộ: tắt camera → hiện preview overlay trong chính AIVisionWebcam
      stopCamera()
      setCapturePreview({ dataUrl, kind })
      setSavingStatus('')
    } catch (error) {
      console.error('AI Vision capture failed:', error)
      setSavingStatus(t('Không thể lưu ảnh chụp.', 'Could not save the photo.'))
    }
  }, [isCameraOpen, uploadedImage, drawComposite, stopCamera, onPreviewCapture])

  // ----- save / export PNG -----
  // ----- "Lưu ảnh" toolbar button → qua flow xác nhận preview rồi mới lưu vào Upload Records -----
  const handleSaveToUpload = useCallback(async () => {
    try {
      let canvas
      let kind = 'webcam'
      if (isCameraOpen && videoRef.current) {
        const video = videoRef.current
        canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        drawComposite(canvas.getContext('2d'), { width: canvas.width, height: canvas.height, source: video })
        kind = 'webcam'
      } else if (uploadedImage && uploadedImageElRef.current?.naturalWidth) {
        const img = uploadedImageElRef.current
        canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        drawComposite(canvas.getContext('2d'), { width: canvas.width, height: canvas.height, source: img })
        kind = 'image'
      } else {
        setSavingStatus(t('Vui lòng mở camera hoặc tải ảnh lên trước.', 'Please open the camera or upload an image first.'))
        return
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      // Nếu có onPreviewCapture (prop từ parent): delegate về parent
      if (onPreviewCapture) {
        onPreviewCapture(dataUrl, kind)
        setSavingStatus(t('Ảnh đã sẵn sàng — nhấn "Lưu ảnh" để xác nhận.', 'Ready — tap "Save photo" to confirm.'))
        return
      }
      // Luồng nội bộ: hiện preview confirm (không tắt camera nếu đang dùng upload mode)
      if (isCameraOpen) stopCamera()
      setCapturePreview({ dataUrl, kind })
      setSavingStatus('')
    } catch (error) {
      console.error('AI Vision save to upload failed:', error)
      setSavingStatus(t('Không thể lưu ảnh.', 'Could not save the photo.'))
    }
  }, [isCameraOpen, uploadedImage, drawComposite, stopCamera, onPreviewCapture])

  // ----- record -----
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
    if (showObjectDetection || showFaceMesh || showPose || showClock || showBorder) {
      const video = videoRef.current
      const recCanvas = document.createElement('canvas')
      recCanvas.width = video.videoWidth || 1280
      recCanvas.height = video.videoHeight || 720
      const recCtx = recCanvas.getContext('2d')
      const drawFrame = () => {
        drawComposite(recCtx, { width: recCanvas.width, height: recCanvas.height, source: video })
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
  }, [isRecording, isCameraOpen, showObjectDetection, showFaceMesh, showPose, showClock, showBorder, drawComposite, user, lang])

  useEffect(() => () => {
    if (recordRafRef.current) cancelAnimationFrame(recordRafRef.current)
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current)
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop?.()
  }, [])

  const clearUploadedImage = useCallback(() => {
    setUploadedImage(null)
    lastResultRef.current = {}
    const canvas = canvasRef.current
    const ctx = canvas?.getContext?.('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    onExitReview?.()
  }, [onExitReview])

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
              className="wc-video"
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
            showOverlay={showObjectDetection || showFaceMesh || showPose}
            showClock={showClock}
            showBorder={showBorder}
            now={now}
            canvasRef={canvasRef}
            clockInset={null}
          />

          {showingMedia && !capturePreview && (
            /* ── X đóng: góc trên trái, trước badge Live ── */
            <button
              type="button"
              className="wc-settings-fab"
              style={{ left: 14, right: 'auto' }}
              onClick={isCameraOpen ? closeCamera : clearUploadedImage}
              title={t('Đóng', 'Close')}
            >
              <X size={18} />
            </button>
          )}
          {showingMedia && !capturePreview && isCameraOpen && (
            /* ── Flash ⚡: góc trên phải, trước Settings ── */
            <button
              type="button"
              className={`wc-settings-fab${flashEnabled ? ' wc-flash-on' : ''}`}
              style={{ right: 60 }}
              onClick={toggleFlash}
              title={flashEnabled ? t('Tắt đèn Flash', 'Flash OFF') : t('Bật đèn Flash', 'Flash ON')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={flashEnabled ? '#ffe066' : 'currentColor'} stroke="none">
                <path d="M13 2L4.09 12.96A1 1 0 005 14.5h6.5L10 22l9.91-10.96A1 1 0 0019 9.5H12.5L13 2z" />
              </svg>
            </button>
          )}
          {showingMedia && !capturePreview && (
            /* ── Settings: góc trên phải ── */
            <button type="button" className="wc-settings-fab" style={{ right: 14 }} onClick={() => setShowSettings(v => !v)} title="Settings">
              <Settings size={18} />
            </button>
          )}

          <CameraSettingsDrawer
            lang={lang}
            open={showSettings}
            showObjectDetection={showObjectDetection}
            onToggleObjectDetection={() => setShowObjectDetection(v => !v)}
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
          />

          {/* ── CAPTURE PREVIEW: confirm before save ── */}
          {capturePreview && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 30,
              display: 'flex', flexDirection: 'column',
              background: '#000',
            }}>
              {/* preview image */}
              <img
                src={capturePreview.dataUrl}
                alt="capture preview"
                style={{ flex: 1, width: '100%', objectFit: 'contain', display: 'block', minHeight: 0 }}
              />
              {/* action bar */}
              <div style={{
                display: 'flex', gap: 10, padding: '12px 16px',
                background: 'rgba(0,0,0,0.85)',
                borderTop: '1px solid rgba(255,255,255,0.10)',
                flexShrink: 0,
              }}>
                <button
                  type="button"
                  disabled={savingPreview}
                  onClick={handleCancelPreview}
                  style={{
                    flex: 1, padding: '11px 6px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.08)', color: '#e2e8f0',
                    fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                    cursor: savingPreview ? 'default' : 'pointer',
                    opacity: savingPreview ? 0.5 : 1,
                  }}
                >
                  🔄 Hủy / Chụp lại
                </button>
                <button
                  type="button"
                  disabled={savingPreview}
                  onClick={handleConfirmSave}
                  style={{
                    flex: 1, padding: '11px 6px', borderRadius: 10, border: 'none',
                    background: savingPreview ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg,#16a34a,#22c55e)',
                    color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                    cursor: savingPreview ? 'default' : 'pointer',
                    boxShadow: '0 6px 20px rgba(34,197,94,0.3)',
                  }}
                >
                  {savingPreview ? '⏳ Đang lưu...' : '💾 Lưu ảnh'}
                </button>
              </div>
            </div>
          )}

          {!isCameraOpen && !uploadedImage && !capturePreview && (
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

          {isCameraOpen && !capturePreview && (
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
              onSave={handleSaveToUpload}
            />
          )}

          {!isCameraOpen && uploadedImage && !capturePreview && (
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
              onSave={handleSaveToUpload}
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
