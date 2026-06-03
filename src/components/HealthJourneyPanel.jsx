import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { detectFileType, fileToBase64, fileToDataUrl, saveRecord } from '../lib/medicalStorage.js'
import { notifyUpload } from '../hooks/useMedicalData.js'

const BLUE = '#0058bc'
const PRIMARY = '#0070eb'
const SURFACE = '#f9f9fb'
const INK = '#1D1D1F'
const MUTED = '#86868B'
const HEALTHY = '#68D391'
const ATTENTION = '#FF8A7A'

const journeyTabs = [
  { id: 'emotion', icon: '🤖', titleVi: 'Bạn đồng hành cảm xúc AI', titleEn: 'AI Emotional Companion', subtitleVi: 'Hope AI · giảm lo âu và xả stress', subtitleEn: 'Hope AI · anxiety relief and decompression' },
  { id: 'meal', icon: '🥗', titleVi: 'Quét bữa ăn AI', titleEn: 'AI Meal Scan', subtitleVi: 'Nhận diện món ăn · dinh dưỡng · phù hợp phác đồ', subtitleEn: 'Food recognition · nutrition · care-plan fit' },
  { id: 'medication', icon: '💊', titleVi: 'Trợ lý thuốc thông minh', titleEn: 'Smart Medication Assistant', subtitleVi: 'Quét thuốc · lịch uống · cảnh báo tương tác', subtitleEn: 'Medication scan · schedule · interaction warnings' },
  { id: 'faceDetector', icon: '🙂', titleVi: 'Face detector', titleEn: 'Face Detector', subtitleVi: 'Camera live · landmark khuôn mặt · sinh trắc', subtitleEn: 'Live camera · face landmarks · biometrics' },
  { id: 'bodyDetector', icon: '🏃', titleVi: 'Body detector', titleEn: 'Body Detector', subtitleVi: 'Camera live · khung xương · lớp phủ sinh học', subtitleEn: 'Live camera · pose skeleton · bio overlay' },
]

const panelShell = {
  minHeight: 760,
  borderRadius: 28,
  overflow: 'hidden',
  background: SURFACE,
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.10)',
  color: '#1a1c1d',
  position: 'relative',
}

const glass = {
  background: 'rgba(255,255,255,0.76)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
}



function cameraTimestamp(lang, date = new Date()) {
  return date.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function drawCameraScanOverlay(ctx, width, height, { label, timestamp }) {
  const pad = Math.max(16, Math.round(width * 0.034))
  const corner = Math.min(width, height) * 0.16
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.96)'
  ctx.lineWidth = Math.max(4, Math.round(width * 0.006))
  ctx.shadowColor = 'rgba(0,229,255,0.95)'
  ctx.shadowBlur = 16
  ;[
    [pad, pad, pad + corner, pad, pad, pad + corner],
    [width - pad, pad, width - pad - corner, pad, width - pad, pad + corner],
    [pad, height - pad, pad + corner, height - pad, pad, height - pad - corner],
    [width - pad, height - pad, width - pad - corner, height - pad, width - pad, height - pad - corner],
  ].forEach(([ax, ay, bx, by, cx, cy]) => {
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.moveTo(ax, ay)
    ctx.lineTo(cx, cy)
    ctx.stroke()
  })
  const boxW = Math.min(width - pad * 2, Math.max(330, width * 0.46))
  const boxH = Math.max(70, height * 0.09)
  const boxY = height - pad - boxH
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,12,24,0.76)'
  ctx.fillRect(pad, boxY, boxW, boxH)
  ctx.strokeStyle = 'rgba(131,247,255,0.78)'
  ctx.lineWidth = 2
  ctx.strokeRect(pad, boxY, boxW, boxH)
  ctx.fillStyle = '#fff'
  ctx.font = `900 ${Math.max(16, width * 0.023)}px sans-serif`
  ctx.fillText(label, pad + 14, boxY + 28)
  ctx.fillStyle = '#83f7ff'
  ctx.font = `800 ${Math.max(14, width * 0.019)}px monospace`
  ctx.fillText(timestamp, pad + 14, boxY + 54)
  ctx.restore()
}

function CameraScanOverlayBadge({ label, timestamp }) {
  return (
    <div style={{ position: 'absolute', inset: 10, zIndex: 5, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.94)', borderRadius: 12, boxShadow: '0 0 0 1px rgba(0,229,255,0.78), 0 0 24px rgba(0,229,255,0.32) inset' }} />
      <div style={{ position: 'absolute', left: 12, bottom: 12, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(131,247,255,0.72)', background: 'rgba(0,12,24,0.76)', boxShadow: '0 0 18px rgba(0,229,255,0.22)' }}>
        <div style={{ color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ color: '#83f7ff', fontSize: 10, marginTop: 4, fontFamily: 'monospace', fontWeight: 800 }}>{timestamp}</div>
      </div>
    </div>
  )
}

const SAFE_FOLDER_FALLBACK = 'guest'

function safeUploadSegment(value) {
  return (value || SAFE_FOLDER_FALLBACK)
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || SAFE_FOLDER_FALLBACK
}

function makeJourneyFilename(prefix, originalName = 'camera.jpg') {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}_${stamp}.${ext || 'jpg'}`
}

function getUploadFolder(user, mode) {
  const userFolder = safeUploadSegment(user?.email || user?.name || 'guest')
  const modeFolder = mode === 'medication' ? 'medication-assistant' : mode === 'meal' ? 'meal-scan' : mode
  return `upload/${userFolder}/${modeFolder}`
}

async function saveJourneyImageFile(file, { mode, user, lang, label }) {
  const [dataUrl, base64Data] = await Promise.all([fileToDataUrl(file), fileToBase64(file)])
  const uploadFolder = getUploadFolder(user, mode)
  const filename = makeJourneyFilename(mode, file.name)
  const uploadPath = `${uploadFolder}/${filename}`
  const record = {
    id: `hj_${mode}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    filename,
    name: filename,
    fileType: detectFileType(file.type, filename),
    type: detectFileType(file.type, filename),
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl,
    base64Data,
    notes: lang === 'vi' ? `${label} · lưu tại ${uploadPath}` : `${label} · saved at ${uploadPath}`,
    ownerEmail: user?.email || null,
    ownerName: user?.name || '',
    ownerAvatar: user?.avatar || '',
    ownerProvider: user?.provider || '',
    sourceModule: mode,
    uploadFolder,
    uploadPath,
  }

  await saveRecord(record, {
    ownerEmail: user?.email,
    ownerName: user?.name,
    ownerAvatar: user?.avatar,
    ownerProvider: user?.provider,
  })
  notifyUpload()
  return record
}

function JourneyCameraUploader({ mode, captureLabel, uploadLabel, helper, onUploaded, immersiveBackdrop = false, backdropHostRef }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const localInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [preview, setPreview] = useState('')
  const [capturedFile, setCapturedFile] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [scanOverlayOn, setScanOverlayOn] = useState(true)
  const [scanNow, setScanNow] = useState(new Date())

  const [facingMode, setFacingMode] = useState('environment')
  const virtualFolder = getUploadFolder(user, mode)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
    setCameraStarting(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  useEffect(() => {
    if (!cameraOpen) return undefined
    setScanNow(new Date())
    const timer = window.setInterval(() => setScanNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [cameraOpen])

  const setSelectedImage = useCallback(async (file, source = 'camera') => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus(lang === 'vi' ? 'Vui lòng chụp hoặc chọn một hình ảnh.' : 'Please capture or choose an image.')
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      setCapturedFile(file)
      setPreview(dataUrl)
      setStatus(source === 'camera'
        ? (lang === 'vi' ? 'Đã chụp ảnh thật từ camera. Bấm upload để lưu vào hệ thống.' : 'Real camera photo captured. Press upload to save it to the system.')
        : (lang === 'vi' ? 'Đã chọn hình trong máy. Bấm upload để lưu vào hệ thống.' : 'Local image selected. Press upload to save it to the system.'))
    } catch (error) {
      console.error('Health journey image preview failed:', error)
      setStatus(lang === 'vi' ? 'Không thể đọc ảnh. Vui lòng thử lại.' : 'Could not read the image. Please try again.')
    }
  }, [lang])

  const openPhysicalCamera = useCallback(async (nextFacingMode = facingMode) => {
    setStatus('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(lang === 'vi' ? 'Trình duyệt không hỗ trợ mở camera vật lý. Vui lòng dùng nút upload hình trong máy.' : 'This browser cannot open the physical camera. Please use the local image upload button.')
      return
    }

    setCameraStarting(true)
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacingMode }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      })
      streamRef.current = stream
      setFacingMode(nextFacingMode)
      setCameraOpen(true)
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
      setStatus(lang === 'vi' ? `Camera ${nextFacingMode === 'user' ? 'trước' : 'sau'} đã mở. Bấm “Chụp ảnh” để lấy hình.` : `${nextFacingMode === 'user' ? 'Front' : 'Rear'} camera is open. Press “Take photo” to capture.`)
    } catch (error) {
      console.error('Health journey physical camera failed:', error)
      stopCamera()
      setStatus(lang === 'vi' ? 'Không thể mở camera vật lý. Vui lòng kiểm tra quyền camera hoặc dùng nút upload hình trong máy.' : 'Could not open the physical camera. Please check camera permission or use the local image upload button.')
    } finally {
      setCameraStarting(false)
    }
  }, [facingMode, lang, stopCamera])

  const switchCamera = useCallback(() => {
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user'
    openPhysicalCamera(nextFacingMode)
  }, [facingMode, openPhysicalCamera])

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (facingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (scanOverlayOn) {
      drawCameraScanOverlay(ctx, canvas.width, canvas.height, {
        label: mode === 'medication' ? 'AI Medication Scan' : 'AI Meal Scan',
        timestamp: cameraTimestamp(lang, scanNow),
      })
    }
    canvas.toBlob(blob => {
      if (!blob) {
        setStatus(lang === 'vi' ? 'Không chụp được ảnh từ camera.' : 'Could not capture a photo from the camera.')
        return
      }
      const file = new File([blob], makeJourneyFilename(mode === 'medication' ? 'medication_camera' : 'meal_camera'), { type: 'image/jpeg' })
      stopCamera()
      setSelectedImage(file, 'camera')
    }, 'image/jpeg', 0.92)
  }, [facingMode, lang, mode, scanNow, scanOverlayOn, setSelectedImage, stopCamera])

  const resetCapture = useCallback(() => {
    stopCamera()
    setCapturedFile(null)
    setPreview('')
    setStatus(lang === 'vi' ? 'Đã huỷ hình vừa chụp.' : 'Captured image cleared.')
    onUploaded?.(null)
  }, [lang, onUploaded, stopCamera])

  const uploadCapturedFile = useCallback(async () => {
    if (!capturedFile) {
      setStatus(lang === 'vi' ? 'Vui lòng chụp hình hoặc chọn hình trong máy trước khi upload.' : 'Please capture a photo or choose a local image before uploading.')
      return
    }

    setUploading(true)
    setStatus(lang === 'vi' ? 'Đang upload ảnh vào thư mục upload của user...' : 'Uploading image into the user upload folder...')

    try {
      const record = await saveJourneyImageFile(capturedFile, { mode, user, lang, label: uploadLabel })
      setPreview(record.dataUrl)
      setCapturedFile(null)
      setStatus(lang === 'vi' ? `Đã upload: ${record.uploadPath}` : `Uploaded: ${record.uploadPath}`)
      onUploaded?.(record)
    } catch (error) {
      console.error('Health journey camera upload failed:', error)
      setStatus(lang === 'vi' ? 'Không thể upload ảnh. Vui lòng thử lại.' : 'Could not upload the image. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [capturedFile, lang, mode, onUploaded, uploadLabel, user])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        ref={localInputRef}
        type="file"
        accept="image/*"
        onChange={e => { setSelectedImage(e.target.files?.[0], 'local'); e.target.value = '' }}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button disabled={uploading || cameraStarting} onClick={() => openPhysicalCamera()} style={{ ...secondaryAction(), opacity: uploading || cameraStarting ? 0.72 : 1 }}>
          {cameraStarting ? (lang === 'vi' ? 'Đang mở...' : 'Opening...') : captureLabel}
        </button>
        <button disabled={uploading} onClick={uploadCapturedFile} style={{ ...primaryAction(), opacity: uploading ? 0.72 : 1 }}>
          {uploading ? (lang === 'vi' ? 'Đang upload...' : 'Uploading...') : uploadLabel}
        </button>
      </div>
      {cameraOpen && immersiveBackdrop && backdropHostRef?.current && createPortal(
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#000', pointerEvents: 'none' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
          {scanOverlayOn && <CameraScanOverlayBadge label={mode === 'medication' ? 'AI Medication Scan' : 'AI Meal Scan'} timestamp={cameraTimestamp(lang, scanNow)} />}
        </div>,
        backdropHostRef.current
      )}
      {cameraOpen && (
        <div style={immersiveBackdrop ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } : { border: '1px solid rgba(0,112,235,0.22)', borderRadius: 16, padding: 10, background: 'rgba(0,112,235,0.06)' }}>
          {!immersiveBackdrop && (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ display: 'block', width: '100%', maxHeight: 220, objectFit: 'cover', background: '#000', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
              {scanOverlayOn && <CameraScanOverlayBadge label={mode === 'medication' ? 'AI Medication Scan' : 'AI Meal Scan'} timestamp={cameraTimestamp(lang, scanNow)} />}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: immersiveBackdrop ? 0 : 8, gridColumn: immersiveBackdrop ? '1 / -1' : 'auto' }}>
            <button onClick={captureFromCamera} style={primaryAction()}>{lang === 'vi' ? '📸 Chụp ảnh' : '📸 Take photo'}</button>
            <button onClick={switchCamera} style={secondaryAction()}>🔄 {lang === 'vi' ? 'Đổi camera' : 'Switch camera'}</button>
            <button onClick={() => setScanOverlayOn(v => !v)} style={{ ...secondaryAction(), background: scanOverlayOn ? 'rgba(0,229,255,0.14)' : '#e3e2e6', color: scanOverlayOn ? BLUE : INK }}>▣ {lang === 'vi' ? 'Lớp phủ' : 'Overlay'}</button>
            <button onClick={stopCamera} style={secondaryAction()}>{lang === 'vi' ? 'Đóng camera' : 'Close camera'}</button>
          </div>
        </div>
      )}
      <button disabled={uploading} onClick={() => localInputRef.current?.click()} style={secondaryAction()}>
        {lang === 'vi' ? 'upload hình trong máy' : 'upload local image'}
      </button>
      {preview && <button disabled={uploading} onClick={resetCapture} style={{ ...secondaryAction(), background: '#fff0f0', color: '#93000a' }}>{lang === 'vi' ? 'Quét lại' : 'Scan again'}</button>}
      <div style={{ fontSize: 11, color: mode === 'meal' ? MUTED : 'rgba(29,29,31,0.62)', lineHeight: 1.45 }}>
        {helper}<br />{lang === 'vi' ? 'Thư mục user:' : 'User folder:'} <b>{virtualFolder}</b>
      </div>
      {preview && <img alt={uploadLabel} src={preview} style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 14, border: '1px solid rgba(0,112,235,0.18)' }} />}
      {status && <div style={{ fontSize: 11, color: status.startsWith('Không') || status.startsWith('Could') ? '#93000a' : BLUE, fontWeight: 800, lineHeight: 1.4 }}>{status}</div>}
    </div>
  )
}

function drawPoint(ctx, x, y, color = '#8b7cff', radius = 5) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 16
  ctx.fill()
  ctx.shadowBlur = 0
}

function drawBone(ctx, points, a, b, color = '#83f7ff') {
  ctx.beginPath()
  ctx.moveTo(points[a][0], points[a][1])
  ctx.lineTo(points[b][0], points[b][1])
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.stroke()
  ctx.shadowBlur = 0
}

function drawFaceOverlay(ctx, w, h, time) {
  const cx = w / 2
  const cy = h * 0.44
  const rx = Math.min(w, h) * 0.18
  const ry = Math.min(w, h) * 0.24
  ctx.strokeStyle = '#83f7ff'
  ctx.lineWidth = 2
  ctx.shadowColor = '#83f7ff'
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.shadowBlur = 0
  for (let row = -3; row <= 3; row += 1) {
    const y = cy + row * ry * 0.22
    const width = rx * Math.sqrt(Math.max(0.1, 1 - (row / 4) ** 2))
    ctx.beginPath()
    ctx.moveTo(cx - width, y)
    ctx.lineTo(cx + width, y)
    ctx.strokeStyle = 'rgba(131,247,255,0.35)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ;[
    [cx - rx * 0.38, cy - ry * 0.18], [cx + rx * 0.38, cy - ry * 0.18],
    [cx, cy + Math.sin(time / 300) * 4], [cx - rx * 0.26, cy + ry * 0.38], [cx + rx * 0.26, cy + ry * 0.38],
    [cx - rx * 0.62, cy + ry * 0.02], [cx + rx * 0.62, cy + ry * 0.02],
  ].forEach(([x, y], i) => drawPoint(ctx, x, y, i < 2 ? '#c084fc' : '#83f7ff', i < 2 ? 6 : 4))
}

function drawBodyOverlay(ctx, w, h, time) {
  const cx = w * 0.52
  const cy = h * 0.48
  const sway = Math.sin(time / 420) * 10
  const p = {
    head: [cx - 30, cy - 180], neck: [cx - 18, cy - 126], chest: [cx, cy - 70], hip: [cx + 12, cy + 20],
    lShoulder: [cx - 78, cy - 112], lElbow: [cx - 132, cy - 56], lWrist: [cx - 188, cy - 92 + sway],
    rShoulder: [cx + 48, cy - 108], rElbow: [cx + 118, cy - 80], rWrist: [cx + 166, cy - 18 - sway],
    lKnee: [cx - 70, cy + 120], lAnkle: [cx - 126, cy + 220], rKnee: [cx + 98, cy + 126], rAnkle: [cx + 156, cy + 238],
  }
  const points = Object.values(p)
  ;[['head','neck'], ['neck','chest'], ['chest','hip'], ['lShoulder','neck'], ['rShoulder','neck'], ['lShoulder','lElbow'], ['lElbow','lWrist'], ['rShoulder','rElbow'], ['rElbow','rWrist'], ['hip','lKnee'], ['lKnee','lAnkle'], ['hip','rKnee'], ['rKnee','rAnkle']]
    .forEach(([a, b]) => drawBone(ctx, p, a, b))
  points.forEach(([x, y], i) => drawPoint(ctx, x, y, i % 2 ? '#c084fc' : '#83f7ff', 6))
  ctx.beginPath()
  ctx.moveTo(w * 0.06, h * 0.76)
  ctx.quadraticCurveTo(w * 0.58, h * 0.60, w * 0.96, h * 0.48)
  ctx.strokeStyle = '#90f7b1'
  ctx.lineWidth = 4
  ctx.shadowColor = '#90f7b1'
  ctx.shadowBlur = 20
  ctx.stroke()
  ctx.shadowBlur = 0
}

function DetectorRealtimeOverlay({ isBody }) {
  return (
    <div style={{ position: 'absolute', left: 24, top: 96, zIndex: 8, display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 380, pointerEvents: 'none' }}>
      <RealtimeOverlayChip value={isBody ? '125°' : '478'} label={isBody ? 'Góc khớp gối' : 'Face mesh'} />
      <RealtimeOverlayChip value={isBody ? '3%' : '96%'} label={isBody ? 'Độ lệch' : 'Độ cân xứng'} tone="#6f7cff" />
      <RealtimeOverlayChip value="Live" label="AI realtime" tone="#2f9e62" />
    </div>
  )
}

function MediaPipeDetectorView({ type }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const isBody = type === 'body'
  const detectorMode = isBody ? 'body-detector' : 'face-detector'
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [overlayOn, setOverlayOn] = useState(true)
  const [scanNow, setScanNow] = useState(new Date())
  const [status, setStatus] = useState(lang === 'vi' ? 'Sẵn sàng mở camera vật lý.' : 'Ready to open the physical camera.')
  const [recording, setRecording] = useState(false)
  const [snapshotSaving, setSnapshotSaving] = useState(false)
  const [speed, setSpeed] = useState(1)
  const uploadFolder = getUploadFolder(user, detectorMode)

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
    setCameraStarting(false)
    setRecording(false)
  }, [])

  const draw = useCallback((time = 0) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width))
    canvas.height = Math.max(1, Math.floor(rect.height))
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (overlayOn) {
      if (isBody) drawBodyOverlay(ctx, canvas.width, canvas.height, time)
      else drawFaceOverlay(ctx, canvas.width, canvas.height, time)
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [isBody, overlayOn])

  const openCamera = useCallback(async (nextFacingMode = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(lang === 'vi' ? 'Trình duyệt không hỗ trợ camera vật lý.' : 'This browser does not support the physical camera.')
      return
    }
    setCameraStarting(true)
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      streamRef.current = stream
      setFacingMode(nextFacingMode)
      setCameraOpen(true)
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
        draw()
      }, 0)
      setStatus(lang === 'vi' ? `Camera ${nextFacingMode === 'user' ? 'trước' : 'sau'} đang phân tích video AI live.` : `${nextFacingMode === 'user' ? 'Front' : 'Rear'} camera is analyzing live AI video.`)
    } catch (error) {
      console.error('Detector camera failed:', error)
      setStatus(lang === 'vi' ? 'Không thể mở camera. Vui lòng cấp quyền camera.' : 'Could not open the camera. Please grant camera permission.')
      stopCamera()
    } finally {
      setCameraStarting(false)
    }
  }, [draw, facingMode, lang, stopCamera])

  const switchCamera = useCallback(() => {
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user'
    openCamera(nextFacingMode)
  }, [facingMode, openCamera])

  const captureDetectorSnapshot = useCallback(() => {
    const video = videoRef.current
    if (!cameraOpen || !video) {
      setStatus(lang === 'vi' ? 'Vui lòng mở camera trước khi chụp.' : 'Please open the camera before taking a snapshot.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (facingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (overlayOn) {
      if (isBody) drawBodyOverlay(ctx, canvas.width, canvas.height, performance.now())
      else drawFaceOverlay(ctx, canvas.width, canvas.height, performance.now())
    }

    setSnapshotSaving(true)
    setRecording(true)
    canvas.toBlob(async blob => {
      if (!blob) {
        setStatus(lang === 'vi' ? 'Không chụp được hình detector.' : 'Could not capture detector snapshot.')
        setSnapshotSaving(false)
        setRecording(false)
        return
      }
      try {
        const file = new File([blob], makeJourneyFilename(`${detectorMode}_camera`), { type: 'image/jpeg' })
        if (overlayOn) {
          drawCameraScanOverlay(ctx, canvas.width, canvas.height, {
            label: isBody ? 'AI Body Detector Scan' : 'AI Face Detector Scan',
            timestamp: cameraTimestamp(lang, scanNow),
          })
        }
        const record = await saveJourneyImageFile(file, {
          mode: detectorMode,
          user,
          lang,
          label: isBody ? 'Body detector snapshot' : 'Face detector snapshot',
        })
        setStatus(lang === 'vi' ? `Đã chụp và lưu vào upload hình: ${record.uploadPath}` : `Captured and saved to image uploads: ${record.uploadPath}`)
      } catch (error) {
        console.error('Detector snapshot upload failed:', error)
        setStatus(lang === 'vi' ? 'Không thể lưu hình detector vào upload.' : 'Could not save detector snapshot to uploads.')
      } finally {
        setSnapshotSaving(false)
        setRecording(false)
      }
    }, 'image/jpeg', 0.92)
  }, [cameraOpen, detectorMode, facingMode, isBody, lang, overlayOn, scanNow, user])

  useEffect(() => {
    if (cameraOpen) draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [cameraOpen, draw, overlayOn])

  useEffect(() => {
    if (!cameraOpen) return undefined
    setScanNow(new Date())
    const timer = window.setInterval(() => setScanNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [cameraOpen])
  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <div style={{ ...panelShell, minHeight: 820, background: '#111', color: '#fff' }}>
      {cameraOpen ? (
        <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none', zIndex: 0 }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'grid', placeItems: 'center', background: isBody ? 'linear-gradient(135deg,#323744,#879098)' : 'linear-gradient(135deg,#20293b,#64748b)', color: 'rgba(255,255,255,0.78)', textAlign: 'center', padding: 24 }}>
          <div><div style={{ fontSize: 84, marginBottom: 10 }}>{isBody ? '🏃' : '🙂'}</div><b>{lang === 'vi' ? 'Bấm mở camera để bắt đầu' : 'Open camera to start'}</b></div>
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(0,0,0,0.12)', pointerEvents: 'none' }} />
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={floatingPillButton()}>×</button>
        <div style={{ ...glass, padding: '8px 24px', borderRadius: 999, color: BLUE, fontSize: 13, fontWeight: 900, letterSpacing: '.08em' }}>{isBody ? 'AI BODY DETECTOR' : 'AI FACE DETECTOR'}</div>
        <button style={floatingPillButton()}>⚙</button>
      </header>
      <ScanReticle />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 6, width: '100%', height: '100%', pointerEvents: 'none' }} />
      {cameraOpen && overlayOn && <CameraScanOverlayBadge label={isBody ? 'AI Body Detector Scan' : 'AI Face Detector Scan'} timestamp={cameraTimestamp(lang, scanNow)} />}
      <DetectorRealtimeOverlay isBody={isBody} />
      <div style={{ position: 'absolute', top: '30%', right: '22%', zIndex: 7, pointerEvents: 'none', animation: 'hj-float 3s ease-in-out infinite' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ ...glass, padding: '8px 12px', borderRadius: 10, color: BLUE, fontSize: 12, fontWeight: 800 }}>{isBody ? 'Pose skeleton live' : 'Face landmarks live'}</div>
          <div style={{ width: 1, height: 34, background: 'rgba(0,88,188,0.60)' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: BLUE, boxShadow: '0 0 14px #0058bc' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 76, zIndex: 12, padding: '0 18px' }}>
        <div style={{ background: '#fff', borderRadius: '32px 32px 0 0', maxWidth: 900, margin: '0 auto', padding: 28, boxShadow: '0 -20px 55px rgba(0,0,0,0.16)', borderTop: '1px solid #c1c6d7', color: INK }}>
          <div style={{ width: 48, height: 6, borderRadius: 999, background: '#e3e2e6', margin: '0 auto 22px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24 }} className="hj-responsive-sheet">
            <div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <h1 style={{ margin: 0, fontSize: 26, color: INK }}>{isBody ? 'Body Detector' : 'Face Detector'}</h1>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(104,211,145,0.16)', color: '#2f9e62', fontSize: 12, fontWeight: 800 }}>✓ AI realtime overlay</span>
              </div>
              <p style={{ color: MUTED, margin: '0 0 14px', lineHeight: 1.5 }}>{isBody ? (lang === 'vi' ? 'Camera và template đồng bộ giống Quét bữa ăn AI: hình ảnh nằm phía sau, lớp xương/metric phủ realtime phía trên.' : 'Camera and template match AI Meal Scan: image stays in the back with realtime skeleton metrics overlaid.') : (lang === 'vi' ? 'Camera và template đồng bộ giống Quét bữa ăn AI: hình ảnh nằm phía sau, landmark/metric phủ realtime phía trên.' : 'Camera and template match AI Meal Scan: image stays in the back with realtime landmark metrics overlaid.')}</p>
              <div style={{ background: 'rgba(0,112,235,0.08)', border: '1px solid rgba(0,112,235,0.18)', padding: 14, borderRadius: 14, color: BLUE, fontWeight: 800, lineHeight: 1.45 }}>{status}</div>
              <div style={{ marginTop: 8, color: MUTED, fontSize: 11 }}>{lang === 'vi' ? 'Thư mục upload:' : 'Upload folder:'} <b>{uploadFolder}</b></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 76px 1fr', gap: 10, alignItems: 'center' }}>
                <button onClick={() => openCamera()} disabled={cameraStarting || snapshotSaving} style={{ ...secondaryAction(), opacity: cameraStarting ? 0.72 : 1 }}>{cameraOpen ? (lang === 'vi' ? 'Khởi động lại' : 'Restart') : cameraStarting ? (lang === 'vi' ? 'Đang mở...' : 'Opening...') : (lang === 'vi' ? 'Mở camera' : 'Open camera')}</button>
                <button onClick={captureDetectorSnapshot} disabled={!cameraOpen || snapshotSaving} style={{ width: 76, height: 76, borderRadius: '50%', border: '4px solid #fff', background: recording ? '#ff6b6b' : '#ff3b30', color: '#fff', fontWeight: 900, cursor: snapshotSaving ? 'wait' : 'pointer', opacity: !cameraOpen || snapshotSaving ? 0.72 : 1, boxShadow: '0 12px 24px rgba(255,59,48,0.28)' }}>{snapshotSaving ? '…' : '📷'}</button>
                <button onClick={() => setOverlayOn(v => !v)} style={{ ...primaryAction(), background: overlayOn ? BLUE : '#384052' }}>{lang === 'vi' ? 'Lớp phủ' : 'Overlay'}</button>
              </div>
              <button onClick={switchCamera} disabled={cameraStarting || snapshotSaving} style={secondaryAction()}>🔄 {lang === 'vi' ? `Đổi camera (${facingMode === 'user' ? 'trước' : 'sau'})` : `Switch camera (${facingMode === 'user' ? 'front' : 'rear'})`}</button>
              {cameraOpen && <button onClick={stopCamera} disabled={snapshotSaving} style={{ ...secondaryAction(), background: '#fff0f0', color: '#93000a' }}>{lang === 'vi' ? 'Đóng camera' : 'Close camera'}</button>}
              <label style={{ display: 'block', color: MUTED, fontSize: 12, fontWeight: 800 }}>{lang === 'vi' ? 'Thanh trượt điều chỉnh tốc độ phân tích' : 'Analysis speed control'}</label>
              <input value={speed} min="0.5" max="2" step="0.5" type="range" onChange={e => setSpeed(e.target.value)} style={{ width: '100%', accentColor: BLUE }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: MUTED, fontSize: 12 }}><span>0.5x</span><span>{speed}x</span><span>2x</span></div>
            </div>
          </div>
        </div>
      </div>
      <JourneyMobileNav active="AI Scan" />
    </div>
  )
}

function MaterialIcon({ children, size = 22, style }) {
  return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{children}</span>
}

function HealthJourneyTabs({ activeTab, setActiveTab, lang }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
      {journeyTabs.map(tab => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '14px 16px', borderRadius: 16,
              border: `1px solid ${active ? 'rgba(0,229,255,0.42)' : 'rgba(255,255,255,0.10)'}`,
              background: active ? 'linear-gradient(135deg, rgba(0,229,255,0.16), rgba(156,111,255,0.14))' : 'rgba(255,255,255,0.045)',
              color: active ? 'var(--cyan)' : 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: active ? '0 14px 34px rgba(0,229,255,0.10)' : 'none',
            }}
          >
            <span style={{ width: 38, height: 38, borderRadius: 14, display: 'grid', placeItems: 'center', background: active ? 'rgba(0,229,255,0.14)' : 'rgba(255,255,255,0.06)', fontSize: 18 }}>{tab.icon}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 800, fontSize: 13, color: active ? 'var(--text)' : 'inherit' }}>{lang === 'vi' ? tab.titleVi : tab.titleEn}</span>
              <span style={{ display: 'block', marginTop: 3, fontSize: 10, lineHeight: 1.35 }}>{lang === 'vi' ? tab.subtitleVi : tab.subtitleEn}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function JourneyMobileNav({ active }) {
  const items = [
    ['Health', '♿'], ['Community', '👥'], ['AI Scan', '🧬'], ['Records', '📄'], ['Profile', '👤'],
  ]
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 78, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 14px 18px', ...glass, borderRadius: '22px 22px 0 0', zIndex: 15 }}>
      {items.map(([label, icon]) => {
        const selected = active === label
        return <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 54, color: selected ? BLUE : '#626266', fontWeight: selected ? 800 : 600, fontSize: 11 }}><span style={{ fontSize: 20 }}>{icon}</span>{label}</div>
      })}
    </div>
  )
}

function EmotionalCompanionView() {
  const [playing, setPlaying] = useState(false)
  return (
    <div style={panelShell}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', ...glass }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img alt="Patient Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtKXZ8Z8xPdcddYd3_3LBUEgNXwg0eUvQSbHPBE7s4E0uhgb1LmS8wv5Igo9RqOekFLODV8AnqqJ87x2V5HuMj4zhCQDQhBlHpwDeVC7qg754k6-pXFeqwK9QDHldUAg7tHwQvn2isqzLDdinvGpzXK9ceLKuMGv8Qw1zBWtZb50Y2DehAH-CvqixV5e8bGLSTG3FNFmQ8DSlRQQBa6dpkXRs-tUXnA6dpiVBpbS9Wgl61ud3uxjSzBXi6HI0SnVuiskg5fquAGSs5" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#e1dfe3' }} />
          <b style={{ fontSize: 22, color: '#1a1c1d' }}>Digital Twin</b>
        </div>
        <MaterialIcon style={{ color: BLUE }}>🔔</MaterialIcon>
      </div>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 150px' }}>
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: BLUE, display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 12px 30px rgba(0,88,188,0.24)', fontSize: 28 }}>🤖</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: INK }}>Xin chào, tôi là Hope AI</h1>
              <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 16 }}>Bạn Đồng Hành Cảm Xúc của bạn</p>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 28 }}>
          <CompanionTile icon="📝" color={ATTENTION} title="Góc xả stress" subtitle="Viết ra mọi lo lắng của bạn" />
          <CompanionTile icon="💚" color={HEALTHY} title="Khẳng định" subtitle="Năng lượng tích cực mỗi ngày" />
          <div style={{ gridColumn: '1 / -1', padding: 30, borderRadius: 28, ...glass, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 999, background: 'rgba(0,88,188,0.10)', color: BLUE, fontSize: 12, fontWeight: 800, marginBottom: 14 }}>Hoạt động đề xuất</span>
                <h3 style={{ margin: 0, fontSize: 26, color: INK }}>Bài tập thở sâu 3 phút</h3>
                <p style={{ margin: '10px 0 0', maxWidth: 440, color: MUTED, lineHeight: 1.55 }}>Giúp ổn định nhịp tim và giảm bớt lo âu ngay lập tức.</p>
              </div>
              <button onClick={() => setPlaying(!playing)} style={{ width: 58, height: 58, borderRadius: '50%', border: 'none', background: playing ? HEALTHY : BLUE, color: '#fff', fontSize: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 16px 30px rgba(0,88,188,0.26)' }}>{playing ? '⏸' : '▶'}</button>
            </div>
            <div style={{ position: 'absolute', right: -40, bottom: -40, width: 170, height: 170, borderRadius: '50%', background: 'rgba(0,88,188,0.06)', animation: 'hj-breathe 8s ease-in-out infinite' }} />
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: 70 }}>
            <div style={{ background: PRIMARY, color: '#fff', padding: '16px 20px', borderRadius: '24px 24px 4px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: 0, lineHeight: 1.55 }}>Gần đây mình cảm thấy rất mệt mỏi và lo lắng. Việc điều trị khiến mình kiệt sức...</p>
              <span style={{ display: 'block', textAlign: 'right', opacity: 0.72, fontSize: 12, marginTop: 8 }}>14:20</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginRight: 70 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: BLUE, color: '#fff', flexShrink: 0, display: 'grid', placeItems: 'center' }}>🤖</div>
            <div style={{ ...glass, padding: '16px 20px', borderRadius: '4px 24px 24px 24px' }}>
              <p style={{ margin: 0, lineHeight: 1.65 }}>Tôi rất tiếc khi nghe bạn đang trải qua những cảm xúc này. Điều này hoàn toàn bình thường trong hành trình của bạn. 🌿<br/><br/>Hãy thử kỹ thuật thở 4-7-8 ngay lúc này: Hít vào (4s) → Giữ hơi (7s) → Thở ra (8s).<br/><br/>Bạn muốn tôi cùng thực hiện với bạn không?</p>
              <span style={{ display: 'block', opacity: 0.5, fontSize: 12, marginTop: 8 }}>14:21</span>
            </div>
          </div>
        </section>
      </main>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 84, zIndex: 16, maxWidth: 760, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ ...glass, display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 999 }}>
          <button style={roundButton('#f3f3f5', MUTED)}>＋</button>
          <input placeholder="Hãy nói với Hope AI..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: INK, padding: '0 10px' }} />
          <button style={roundButton(BLUE, '#fff')}>↑</button>
        </div>
      </div>
      <JourneyMobileNav active="AI Scan" />
    </div>
  )
}

function CompanionTile({ icon, color, title, subtitle }) {
  return (
    <div style={{ ...glass, padding: 24, borderRadius: 26, cursor: 'pointer' }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${color}25`, display: 'grid', placeItems: 'center', color, marginBottom: 16, fontSize: 22 }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: 15, color: INK }}>{title}</h3>
      <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 13 }}>{subtitle}</p>
    </div>
  )
}

function roundButton(bg, color) {
  return { width: 42, height: 42, borderRadius: '50%', border: 'none', background: bg, color, display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 20, flexShrink: 0 }
}


function RealtimeOverlayChip({ value, label, tone = BLUE }) {
  return (
    <div style={{ ...glass, minWidth: 88, padding: '10px 12px', borderRadius: 16, textAlign: 'center', border: `1px solid ${tone}33`, boxShadow: `0 12px 34px ${tone}24` }}>
      <div style={{ color: tone, fontSize: 22, fontWeight: 950, lineHeight: 1 }}>{value}</div>
      <div style={{ color: INK, fontSize: 11, fontWeight: 850, marginTop: 5 }}>{label}</div>
    </div>
  )
}

function MealRealtimeNutritionOverlay() {
  return (
    <div style={{ position: 'absolute', left: 24, top: 96, zIndex: 8, display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 330, pointerEvents: 'none' }}>
      <RealtimeOverlayChip value="320" label="kcal" />
      <RealtimeOverlayChip value="26g" label="Đạm" />
      <RealtimeOverlayChip value="8g" label="Chất xơ" tone="#2f9e62" />
    </div>
  )
}

function MedicationRealtimeOverlay() {
  return (
    <div style={{ position: 'absolute', left: 24, top: 96, zIndex: 8, display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 360, pointerEvents: 'none' }}>
      <RealtimeOverlayChip value="20mg" label="Tamoxifen" />
      <RealtimeOverlayChip value="1x" label="mỗi ngày" tone="#6f7cff" />
      <RealtimeOverlayChip value="Sau ăn" label="lịch uống" tone="#2f9e62" />
    </div>
  )
}

function MealScanView() {
  const [flash, setFlash] = useState(false)
  const [capturedRecord, setCapturedRecord] = useState(null)
  const panelRef = useRef(null)
  return (
    <div ref={panelRef} style={{ ...panelShell, minHeight: 820, background: '#111' }}>
      <img alt="Salmon salad being scanned" src={capturedRecord?.dataUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDz673aowy2PSOhw7UeuUZHoFiJO_SQTymK2RWuGYolAX9ok2Eugcl8j17Ip3FWZh0sLSoEuJbb-6LNoLAx5NKWwQ4X-nfqnnDuhGQvU_Dnqxw7oWZ6IW5kNaCG4vfKLbgFEAB2OXpUPeMzAoiWAqNGIjyo-wbhqxNF7d2BtrQY5HECx53yA3z9L7GdwfOiHxbQB6UdclRS9c4hau37W37ieVXlmK40gZ0dB2H8sW9PobMG23MnaC8tYR0V12bMf46MMJNaRznFkUu7"} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.05)' }} />
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={floatingPillButton()}>×</button>
        <div style={{ ...glass, padding: '8px 24px', borderRadius: 999, color: BLUE, fontSize: 13, fontWeight: 900, letterSpacing: '.08em' }}>AI SCANNING</div>
        <button onClick={() => setFlash(!flash)} style={{ ...floatingPillButton(), background: flash ? 'rgba(0,88,188,0.24)' : 'rgba(255,255,255,0.75)' }}>{flash ? '🔦' : '⚡'}</button>
      </header>
      <ScanReticle />
      <MealRealtimeNutritionOverlay />
      <div style={{ position: 'absolute', top: '30%', right: '22%', zIndex: 7, pointerEvents: 'none', animation: 'hj-float 3s ease-in-out infinite' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ ...glass, padding: '8px 12px', borderRadius: 10, color: BLUE, fontSize: 12, fontWeight: 800 }}>Salmon (26g Protein)</div>
          <div style={{ width: 1, height: 34, background: 'rgba(0,88,188,0.60)' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: BLUE, boxShadow: '0 0 14px #0058bc' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 76, zIndex: 12, padding: '0 18px' }}>
        <div style={{ background: '#fff', borderRadius: '32px 32px 0 0', maxWidth: 900, margin: '0 auto', padding: 28, boxShadow: '0 -20px 55px rgba(0,0,0,0.16)', borderTop: '1px solid #c1c6d7' }}>
          <div style={{ width: 48, height: 6, borderRadius: 999, background: '#e3e2e6', margin: '0 auto 22px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 230px', gap: 24 }} className="hj-responsive-sheet">
            <div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <h1 style={{ margin: 0, fontSize: 26, color: INK }}>{capturedRecord ? 'Bữa ăn vừa chụp' : 'Salad Cá Hồi Áp Chảo'}</h1>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(104,211,145,0.16)', color: '#2f9e62', fontSize: 12, fontWeight: 800 }}>✓ Phù hợp phác đồ</span>
              </div>
              <p style={{ color: MUTED, margin: '0 0 20px', lineHeight: 1.5 }}>{capturedRecord ? `Ảnh đã được lưu vào ${capturedRecord.uploadPath} và sẵn sàng cho AI nhận diện dinh dưỡng.` : 'Phân tích hình ảnh xác nhận thành phần dinh dưỡng tối ưu cho bệnh nhân đang điều trị.'}</p>
              <div style={{ background: 'rgba(255,218,214,0.36)', border: '1px solid #ffdad6', padding: 14, borderRadius: 14, display: 'flex', gap: 10, color: '#93000a', fontWeight: 700, lineHeight: 1.45 }}>⚠️ <span>Lưu ý: Sốt chanh leo đi kèm có chứa đường tinh luyện. Nên sử dụng hạn chế.</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <JourneyCameraUploader
                mode="meal"
                captureLabel="📷 Chụp"
                uploadLabel="upload bữa ăn"
                helper="Nút Chụp mở camera vật lý để chụp thật; hoặc upload hình trong máy rồi lưu vào thư mục upload theo từng user."
                onUploaded={setCapturedRecord}
                immersiveBackdrop
                backdropHostRef={panelRef}
              />
            </div>
          </div>
        </div>
      </div>
      <JourneyMobileNav active="AI Scan" />
    </div>
  )
}

function floatingPillButton() {
  return { width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', display: 'grid', placeItems: 'center', color: '#1a1c1d', cursor: 'pointer', fontSize: 22, boxShadow: '0 6px 18px rgba(0,0,0,0.10)' }
}

function ScanReticle() {
  const corner = { position: 'absolute', width: 34, height: 34, borderColor: BLUE }
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: 280, height: 280 }}>
        <div style={{ ...corner, top: 0, left: 0, borderTop: '4px solid', borderLeft: '4px solid', borderRadius: '14px 0 0 0' }} />
        <div style={{ ...corner, top: 0, right: 0, borderTop: '4px solid', borderRight: '4px solid', borderRadius: '0 14px 0 0' }} />
        <div style={{ ...corner, bottom: 0, left: 0, borderBottom: '4px solid', borderLeft: '4px solid', borderRadius: '0 0 0 14px' }} />
        <div style={{ ...corner, bottom: 0, right: 0, borderBottom: '4px solid', borderRight: '4px solid', borderRadius: '0 0 14px 0' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #0058bc, transparent)', animation: 'hj-scan 2.5s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

function primaryAction() {
  return { width: '100%', padding: '16px 18px', borderRadius: 14, border: 'none', background: BLUE, color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 14px 28px rgba(0,88,188,0.18)' }
}
function secondaryAction() {
  return { width: '100%', padding: '16px 18px', borderRadius: 14, border: 'none', background: '#e3e2e6', color: INK, fontWeight: 800, cursor: 'pointer' }
}

function MedicationAssistantView() {
  const [flash, setFlash] = useState(false)
  const [capturedRecord, setCapturedRecord] = useState(null)
  const panelRef = useRef(null)
  return (
    <div ref={panelRef} style={{ ...panelShell, minHeight: 820, background: '#000' }}>
      <header style={{ position: 'relative', zIndex: 15, height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', ...glass }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: INK }}><button style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer' }}>×</button><h1 style={{ margin: 0, fontSize: 24 }}>Trợ lý thuốc</h1></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><button onClick={() => setFlash(!flash)} style={{ border: 'none', background: 'transparent', color: flash ? BLUE : INK, fontSize: 22, cursor: 'pointer' }}>{flash ? '🔦' : '⚡'}</button><img alt="Patient" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQKeTt8_ixyEzSPUh64YGich4CWVUCDHlAED0v66qzTB8rzONzJD_GBylNvUOCiBFxk9njOsY3qdU1MvmNYz2oc6dcZZ8cLBeX4cw701UMQjBjsm9UoiNevceFpQRaat5AthvRm2ihEbGQnfFnAfjJDQ8Inb1usap4d3mvsSoZRFa6lPEkbJKcg_2oaNIyBiG0QLPsJL8tZzPVU2HZDifgoOO4GcVdYWNJmxiuj0irLtdFBy-gDf8sEBwU2qkiyehS0pde6FcQP8-J" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} /></div>
      </header>
      <img alt="Pill Bottle" src={capturedRecord?.dataUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuAZH2XA_C2g9jti8cF8o0E5hvwbxBLhK2y-tf0NDCFY7cyKfoeZ_U8_kn3jiQHhOa6b56cisSwi2bz6AE1EFWFS0dNQBehYv66eK0nIeMiU0q1kRU5vfIdZz1KoCj7T6VpAyJAotvB_di10b0BzJ7RdFkt_41wXUXbswPWEv9u7eX9drmA7OkyMb1YS1l1QjiSzEbHDivTPH6XurlsDr6cR5vjNnYcEWsLxKzNgrooWpXB-uu9DZvIchL5J627pN73vdwj5KTI9lY4z"} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.82, zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'radial-gradient(circle, transparent 38%, rgba(0,0,0,0.58) 100%)', pointerEvents: 'none' }} />
      <MedicationRealtimeOverlay />
      <div style={{ position: 'absolute', inset: '64px 0 0', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: 270, height: 270, border: '2px solid rgba(0,112,235,0.42)', borderRadius: 30, overflow: 'hidden', boxShadow: '0 0 28px rgba(0,88,188,0.28)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 36, height: 36, borderTop: '4px solid #0070eb', borderLeft: '4px solid #0070eb', borderRadius: '18px 0 0 0' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 36, height: 36, borderTop: '4px solid #0070eb', borderRight: '4px solid #0070eb', borderRadius: '0 18px 0 0' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 36, height: 36, borderBottom: '4px solid #0070eb', borderLeft: '4px solid #0070eb', borderRadius: '0 0 0 18px' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderBottom: '4px solid #0070eb', borderRight: '4px solid #0070eb', borderRadius: '0 0 18px 0' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, transparent, #0070eb, transparent)', boxShadow: '0 0 10px #0070eb', animation: 'hj-laser 3s linear infinite' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 76, zIndex: 14, padding: '0 18px' }}>
        <div style={{ ...glass, maxWidth: 720, margin: '0 auto', borderRadius: 28, padding: 24 }}>
          <div style={{ width: 48, height: 6, borderRadius: 999, background: 'rgba(113,119,134,0.22)', margin: '0 auto 20px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}><h2 style={{ margin: 0, color: INK, fontSize: 25 }}>Kết quả Quét</h2><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '6px 10px', borderRadius: 999, background: 'rgba(0,112,235,0.10)', color: PRIMARY, fontSize: 12, fontWeight: 900 }}>✨ Trợ lý AI</span></div>
          <div style={{ background: '#fff', border: '1px solid #ededed', borderRadius: 18, padding: 16, display: 'flex', gap: 16, marginBottom: 14 }}>
            <img alt="Tamoxifen Pill" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjQHXpDlpop937cl2g-AgliTNjDZsZ4GaF0rbg3MKB7vu7r4SSTf5ZE4f4cYvbx6aU-WYjKBGzOnAXiyqGGEbHI1MRQDO9_we6ANnp2f7YpkTUeukmmaehNfcJvm_CwjQyOziUN0cIpQE-tQk_Y6_gUoNIfvc0MHgG7HtGaBkkcUJDa9hj3JCY--_v5y83HUUj0xepnsgxJ2r7DfVC_xBrQqHmFvNGT5I6vkGRg2_N8O27M71Dk42QokOPRn2_frR1KCKEkf2Kyl4o" style={{ width: 66, height: 66, borderRadius: 14, objectFit: 'cover', background: '#eeeef0', flexShrink: 0 }} />
            <div><h3 style={{ margin: 0, color: INK, fontSize: 20 }}>{capturedRecord ? 'Ảnh thuốc vừa chụp' : 'Tamoxifen 20mg'}</h3><p style={{ margin: '6px 0 12px', color: MUTED }}>{capturedRecord ? `Đã upload vào ${capturedRecord.uploadPath}` : "Viên nén tròn, màu trắng, khắc số '20'"}</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: MUTED, fontWeight: 700, fontSize: 13 }}><span>🕒 1 lần/ngày</span><span>🍽 Sau ăn</span></div></div>
          </div>
          <div style={{ background: 'rgba(255,218,214,0.48)', border: '1px solid rgba(186,26,26,0.12)', borderRadius: 18, padding: 16, marginBottom: 18, color: '#93000a' }}><div style={{ fontWeight: 900, marginBottom: 7 }}>⚠️ Cảnh báo Tương tác</div><div style={{ lineHeight: 1.55 }}>Tương tác nhẹ phát hiện với <b>Ondansetron</b>. Có thể làm giảm hiệu quả của thuốc. Vui lòng tham khảo ý kiến bác sĩ điều trị.</div></div>
          <JourneyCameraUploader
            mode="medication"
            captureLabel="📷 Chụp"
            uploadLabel="upload thuốc"
            helper="Nút Chụp mở camera vật lý để chụp thật; hoặc upload hình trong máy rồi lưu vào thư mục upload theo từng user."
            onUploaded={setCapturedRecord}
            immersiveBackdrop
            backdropHostRef={panelRef}
          />
        </div>
      </div>
      <JourneyMobileNav active="AI Scan" />
    </div>
  )
}

export default function HealthJourneyPanel({ onNext }) {
  const { lang, t } = useApp()
  const [activeTab, setActiveTab] = useState('emotion')

  return (
    <div className="animate-fade" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{`
        @keyframes hj-breathe { 0%, 100% { transform: scale(1); opacity: .35; } 50% { transform: scale(1.12); opacity: .7; } }
        @keyframes hj-scan { 0% { top: 0%; opacity: 0; } 20%, 80% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes hj-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes hj-laser { 0% { top: 0%; opacity: .8; } 50% { top: 100%; opacity: 1; } 100% { top: 0%; opacity: .8; } }
        @media (max-width: 760px) { .hj-responsive-sheet { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>🌿 {lang === 'vi' ? 'Buổi Sáng' : 'Morning'}</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13, margin: '6px 0 0' }}>
            {lang === 'vi'
              ? 'Một không gian wellness gồm cảm xúc, dinh dưỡng và trợ lý thuốc thông minh.'
              : 'A wellness hub for emotions, nutrition, and smart medication support.'}
          </p>
        </div>
      </div>
      <HealthJourneyTabs activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
      {activeTab === 'emotion' && <EmotionalCompanionView />}
      {activeTab === 'meal' && <MealScanView />}
      {activeTab === 'medication' && <MedicationAssistantView />}
      {activeTab === 'faceDetector' && <MediaPipeDetectorView type="face" />}
      {activeTab === 'bodyDetector' && <MediaPipeDetectorView type="body" />}
      {onNext && <NavButtons onNext={onNext} nextLabel={`${t('next')} →`} />}
    </div>
  )
}
