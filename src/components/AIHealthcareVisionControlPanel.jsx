import React, { useCallback, useEffect, useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { detectFileType, fileToBase64, fileToDataUrl, saveRecord } from '../lib/medicalStorage.js'
import { notifyUpload } from '../hooks/useMedicalData.js'

const MEDIAPIPE_APP_URL = '/src/mediapipe-khanh/index.html#/vision/object_detector'

function cameraTimestamp(lang, date = new Date()) {
  return date.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function safeUploadSegment(value) {
  return (value || 'guest')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest'
}

function makeVisionFilename(prefix, originalName = 'camera.jpg') {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}_${stamp}.${ext || 'jpg'}`
}

function getVisionUploadFolder(user) {
  return `upload/${safeUploadSegment(user?.email || user?.name || 'guest')}/ai-healthcare-vision-control`
}

function drawVisionControlOverlay(ctx, width, height, { lang, timestamp }) {
  const centerX = width / 2
  const centerY = height / 2
  const boxW = Math.min(width * 0.72, height * 0.82)
  const boxH = Math.min(height * 0.58, boxW * 0.74)
  const x = centerX - boxW / 2
  const y = centerY - boxH / 2
  const corner = Math.min(boxW, boxH) * 0.18

  ctx.save()
  ctx.strokeStyle = '#83f7ff'
  ctx.lineWidth = Math.max(4, width * 0.006)
  ctx.shadowColor = 'rgba(0,229,255,0.92)'
  ctx.shadowBlur = 18
  ;[
    [x, y, x + corner, y, x, y + corner],
    [x + boxW, y, x + boxW - corner, y, x + boxW, y + corner],
    [x, y + boxH, x + corner, y + boxH, x, y + boxH - corner],
    [x + boxW, y + boxH, x + boxW - corner, y + boxH, x + boxW, y + boxH - corner],
  ].forEach(([ax, ay, bx, by, cx, cy]) => {
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.moveTo(ax, ay)
    ctx.lineTo(cx, cy)
    ctx.stroke()
  })

  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,12,24,0.72)'
  ctx.strokeStyle = 'rgba(131,247,255,0.72)'
  ctx.lineWidth = 1
  const label = lang === 'vi' ? 'AI HEALTHCARE VISION SCAN' : 'AI HEALTHCARE VISION SCAN'
  const labelW = Math.min(width - 28, 330)
  const labelH = 58
  const labelX = width - labelW - 16
  const labelY = height - labelH - 16
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(labelX, labelY, labelW, labelH, 14)
  } else {
    ctx.rect(labelX, labelY, labelW, labelH)
  }
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${Math.max(13, width * 0.018)}px sans-serif`
  ctx.fillText(label, labelX + 14, labelY + 24)
  ctx.fillStyle = '#83f7ff'
  ctx.font = `700 ${Math.max(11, width * 0.014)}px monospace`
  ctx.fillText(timestamp, labelX + 14, labelY + 44)
  ctx.restore()
}

async function setCameraTorch(stream, enabled) {
  const track = stream?.getVideoTracks?.()[0]
  if (!track) return false
  const capabilities = track.getCapabilities?.() || {}
  if (!capabilities.torch) return false
  await track.applyConstraints({ advanced: [{ torch: enabled }] })
  return true
}

async function saveVisionControlImage(file, { user, lang, label }) {
  const [dataUrl, base64Data] = await Promise.all([fileToDataUrl(file), fileToBase64(file)])
  const uploadFolder = getVisionUploadFolder(user)
  const filename = makeVisionFilename('ai_healthcare_vision', file.name)
  const uploadPath = `${uploadFolder}/${filename}`
  const fileType = detectFileType(file.type, filename)
  const record = {
    id: `vision_control_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    filename,
    name: filename,
    fileType,
    type: fileType,
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
    sourceModule: 'ai-healthcare-vision-control',
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

function VisionCameraControls() {
  const { lang } = useApp()
  const { user } = useAuth()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const localInputRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const overlayOnRef = useRef(true)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')
  const [overlayOn, setOverlayOn] = useState(true)
  const [flash, setFlash] = useState(false)
  const [snapshotSaving, setSnapshotSaving] = useState(false)
  const [recording, setRecording] = useState(false)
  const [capturedRecord, setCapturedRecord] = useState(null)
  const [status, setStatus] = useState(lang === 'vi' ? 'Sẵn sàng mở camera và lưu ảnh vào trang Upload.' : 'Ready to open camera and save images to Upload.')

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
    setCameraStarting(false)
    setRecording(false)
    setFlash(false)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width))
    canvas.height = Math.max(1, Math.floor(rect.height))
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (overlayOnRef.current) {
      drawVisionControlOverlay(ctx, canvas.width, canvas.height, { lang, timestamp: cameraTimestamp(lang) })
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [lang])

  const openCamera = useCallback(async (nextFacingMode = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(lang === 'vi' ? 'Trình duyệt không hỗ trợ camera vật lý.' : 'This browser does not support the physical camera.')
      return
    }
    setCameraStarting(true)
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (flash) setCameraTorch(stream, true).catch(error => console.warn('Unable to enable torch:', error))
      setFacingMode(nextFacingMode)
      setCameraOpen(true)
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
        draw()
      }, 0)
      setStatus(lang === 'vi' ? `Camera ${nextFacingMode === 'user' ? 'trước' : 'sau'} đang chạy. Bấm nút tròn để chụp và lưu Upload.` : `${nextFacingMode === 'user' ? 'Front' : 'Rear'} camera is running. Press the round button to save to Upload.`)
    } catch (error) {
      console.error('AI Healthcare Vision camera failed:', error)
      setStatus(lang === 'vi' ? 'Không thể mở camera. Vui lòng cấp quyền camera.' : 'Could not open the camera. Please grant camera permission.')
      stopCamera()
    } finally {
      setCameraStarting(false)
    }
  }, [draw, facingMode, flash, lang, stopCamera])

  const switchCamera = useCallback(() => {
    openCamera(facingMode === 'user' ? 'environment' : 'user')
  }, [facingMode, openCamera])

  const toggleOverlay = useCallback(() => {
    setOverlayOn(current => {
      const next = !current
      overlayOnRef.current = next
      return next
    })
  }, [])

  const toggleFlash = useCallback(() => {
    const nextFlash = !flash
    setFlash(nextFlash)
    setCameraTorch(streamRef.current, nextFlash).catch(error => console.warn('Unable to toggle torch:', error))
  }, [flash])

  const captureSnapshot = useCallback(() => {
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
    if (overlayOnRef.current) {
      drawVisionControlOverlay(ctx, canvas.width, canvas.height, { lang, timestamp: cameraTimestamp(lang) })
    }

    setSnapshotSaving(true)
    setRecording(true)
    canvas.toBlob(async blob => {
      if (!blob) {
        setStatus(lang === 'vi' ? 'Không chụp được hình camera.' : 'Could not capture camera snapshot.')
        setSnapshotSaving(false)
        setRecording(false)
        return
      }
      try {
        const file = new File([blob], makeVisionFilename('camera'), { type: 'image/jpeg' })
        const record = await saveVisionControlImage(file, {
          user,
          lang,
          label: lang === 'vi' ? 'Ảnh AI Healthcare Vision Control' : 'AI Healthcare Vision Control image',
        })
        setCapturedRecord(record)
        setStatus(lang === 'vi' ? `Đã chụp và lưu vào Upload: ${record.uploadPath}` : `Captured and saved to Upload: ${record.uploadPath}`)
      } catch (error) {
        console.error('AI Healthcare Vision snapshot failed:', error)
        setStatus(lang === 'vi' ? 'Không thể lưu ảnh camera.' : 'Could not save the camera image.')
      } finally {
        setSnapshotSaving(false)
        window.setTimeout(() => setRecording(false), 520)
      }
    }, 'image/jpeg', 0.92)
  }, [cameraOpen, facingMode, lang, user])

  const uploadLocalImage = useCallback(async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus(lang === 'vi' ? 'Vui lòng chọn một hình ảnh.' : 'Please choose an image.')
      return
    }

    setSnapshotSaving(true)
    setStatus(lang === 'vi' ? 'Đang upload hình trong máy...' : 'Uploading local image...')
    try {
      const record = await saveVisionControlImage(file, {
        user,
        lang,
        label: lang === 'vi' ? 'Ảnh local từ AI Healthcare Vision Control' : 'Local image from AI Healthcare Vision Control',
      })
      setCapturedRecord(record)
      setStatus(lang === 'vi' ? `Đã upload hình trong máy: ${record.uploadPath}` : `Uploaded local image: ${record.uploadPath}`)
    } catch (error) {
      console.error('AI Healthcare Vision local upload failed:', error)
      setStatus(lang === 'vi' ? 'Không thể upload hình trong máy.' : 'Could not upload the local image.')
    } finally {
      setSnapshotSaving(false)
    }
  }, [lang, user])

  useEffect(() => {
    overlayOnRef.current = overlayOn
  }, [overlayOn])

  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <section className="ai-vision-camera-card" aria-label="AI Healthcare Vision camera controls">
      <div className="ai-vision-camera-copy">
        <div className="ai-healthcare-vision-kicker">CAMERA CONTROL · UPLOAD</div>
        <h3>{lang === 'vi' ? '📷 Một Webcam + điều khiển gắn liền' : '📷 One Webcam + attached controls'}</h3>
        <p>
          {lang === 'vi'
            ? 'Chỉ còn một khung Webcam. Các nút mở camera, chụp ảnh, lớp phủ, flash và lưu Upload Records nằm ngay dưới Webcam để thao tác nhanh.'
            : 'There is only one Webcam frame. Open, capture, overlay, torch, and Upload Records saving controls sit directly under the Webcam.'}
        </p>
        {capturedRecord && (
          <div className="ai-vision-upload-path">
            <b>{lang === 'vi' ? 'Đã lưu:' : 'Saved:'}</b> {capturedRecord.uploadPath}
          </div>
        )}
      </div>

      <div className="ai-vision-phone-frame">
        <div className="ai-vision-phone-topbar">
          <button type="button" onClick={stopCamera} className="ai-vision-icon-button" title={lang === 'vi' ? 'Đóng camera' : 'Close camera'}>×</button>
          <div className="ai-vision-phone-title">AI VISION SCAN</div>
          <button type="button" onClick={toggleFlash} className={`ai-vision-icon-button ${flash ? 'active' : ''}`} title={lang === 'vi' ? 'Bật/tắt đèn flash' : 'Toggle flash'}>{flash ? '🔦' : '⚡'}</button>
        </div>

        <div className="ai-vision-camera-viewport">
          {cameraOpen ? (
            <video ref={videoRef} autoPlay playsInline muted className="ai-vision-video" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
          ) : (
            <div className="ai-vision-camera-placeholder">
              <div>🧠</div>
              <b>{lang === 'vi' ? 'Bấm mở camera để bắt đầu' : 'Open camera to start'}</b>
            </div>
          )}
          <canvas ref={canvasRef} className="ai-vision-overlay-canvas" />
        </div>

        <div className="ai-vision-camera-controls">
          <input
            ref={localInputRef}
            type="file"
            accept="image/*"
            onChange={event => { uploadLocalImage(event.target.files?.[0]); event.target.value = '' }}
            hidden
          />
          <div className="ai-vision-primary-actions">
            <button type="button" onClick={() => openCamera()} disabled={cameraStarting || snapshotSaving}>
              {cameraOpen ? (lang === 'vi' ? 'Khởi động lại' : 'Restart') : cameraStarting ? (lang === 'vi' ? 'Đang mở...' : 'Opening...') : (lang === 'vi' ? 'Mở camera' : 'Open camera')}
            </button>
            <button type="button" className="ai-vision-capture-button" onClick={captureSnapshot} disabled={!cameraOpen || snapshotSaving}>{snapshotSaving ? '…' : '📷'}</button>
            <button type="button" onClick={toggleOverlay}>{overlayOn ? (lang === 'vi' ? 'Bỏ lớp phủ' : 'Remove overlay') : (lang === 'vi' ? 'Hiện lớp phủ' : 'Show overlay')}</button>
          </div>
          <div className="ai-vision-secondary-actions">
            <button type="button" onClick={() => localInputRef.current?.click()} disabled={snapshotSaving}>{lang === 'vi' ? 'upload hình trong máy' : 'upload local image'}</button>
            <button type="button" onClick={switchCamera} disabled={cameraStarting || snapshotSaving}>🔄 {lang === 'vi' ? 'Đổi camera' : 'Switch camera'}</button>
          </div>
          {cameraOpen && <button type="button" className="ai-vision-close-camera" onClick={stopCamera} disabled={snapshotSaving}>{lang === 'vi' ? 'Đóng camera' : 'Close camera'}</button>}
          <div className={`ai-vision-status ${recording ? 'recording' : ''}`}>{status}</div>
        </div>
      </div>
    </section>
  )
}


function MediaPipeTasksWithUpload() {
  const { lang } = useApp()
  const { user } = useAuth()
  const iframeRef = useRef(null)
  const localInputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(lang === 'vi' ? 'Mở camera trong MediaPipe, sau đó bấm chụp để lưu Upload Records.' : 'Open the MediaPipe camera, then capture to save in Upload Records.')

  const captureFromMediaPipeWebcam = useCallback(() => {
    const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
    const video = doc?.getElementById('webcam')
    if (!video || !video.srcObject || video.readyState < 2) {
      setStatus(lang === 'vi' ? 'Hãy bấm “Mở camera” trong MediaPipe trước khi lưu ảnh.' : 'Click “Mở camera” in MediaPipe before saving a snapshot.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    drawVisionControlOverlay(ctx, canvas.width, canvas.height, { lang, timestamp: cameraTimestamp(lang) })

    setSaving(true)
    canvas.toBlob(async blob => {
      if (!blob) {
        setStatus(lang === 'vi' ? 'Không chụp được frame từ Webcam MediaPipe.' : 'Could not capture a frame from the MediaPipe Webcam.')
        setSaving(false)
        return
      }
      try {
        const file = new File([blob], makeVisionFilename('mediapipe_webcam'), { type: 'image/jpeg' })
        const record = await saveVisionControlImage(file, {
          user,
          lang,
          label: lang === 'vi' ? 'Ảnh Webcam MediaPipe Tasks' : 'MediaPipe Tasks Webcam image',
        })
        setStatus(lang === 'vi' ? `Đã lưu ảnh Webcam vào Upload Records: ${record.uploadPath}` : `Saved Webcam image to Upload Records: ${record.uploadPath}`)
      } catch (error) {
        console.error('MediaPipe webcam capture failed:', error)
        setStatus(lang === 'vi' ? 'Không thể lưu ảnh Webcam MediaPipe.' : 'Could not save the MediaPipe Webcam image.')
      } finally {
        setSaving(false)
      }
    }, 'image/jpeg', 0.92)
  }, [lang, user])

  const uploadLocalImage = useCallback(async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/') && !file.name?.toLowerCase().match(/\.(heic|heif)$/)) {
      setStatus(lang === 'vi' ? 'Vui lòng chọn hình ảnh.' : 'Please choose an image.')
      return
    }
    setSaving(true)
    try {
      const record = await saveVisionControlImage(file, {
        user,
        lang,
        label: lang === 'vi' ? 'Ảnh upload trong máy từ MediaPipe Tasks' : 'Local image uploaded from MediaPipe Tasks',
      })
      setStatus(lang === 'vi' ? `Đã upload hình vào Upload Records: ${record.uploadPath}` : `Uploaded image to Upload Records: ${record.uploadPath}`)
    } catch (error) {
      console.error('MediaPipe local image upload failed:', error)
      setStatus(lang === 'vi' ? 'Không thể upload hình trong máy.' : 'Could not upload the local image.')
    } finally {
      setSaving(false)
    }
  }, [lang, user])

  return (
    <section className="ai-healthcare-vision-frame-card" aria-label="AI Healthcare Vision Control MediaPipe app">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div className="ai-healthcare-vision-kicker">MEDIAPIPE TASKS · WEBCAM UPLOAD</div>
          <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, marginTop: 4 }}>
            {lang === 'vi' ? 'Giữ nguyên các task Webcam/Image; cụm lưu ảnh bao quanh màn hình MediaPipe.' : 'Keeps all Webcam/Image tasks; upload controls wrap the MediaPipe screen.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={captureFromMediaPipeWebcam} disabled={saving} className="ai-healthcare-vision-open-link" style={{ cursor: saving ? 'wait' : 'pointer' }}>
            📷 {saving ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu hình Webcam vào Upload Records' : 'Save Webcam to Upload Records')}
          </button>
          <button type="button" onClick={() => localInputRef.current?.click()} disabled={saving} className="ai-healthcare-vision-open-link" style={{ cursor: saving ? 'wait' : 'pointer' }}>
            ⬆️ {lang === 'vi' ? 'upload hình trong máy' : 'upload local image'}
          </button>
          <input
            ref={localInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={event => { uploadLocalImage(event.target.files?.[0]); event.target.value = '' }}
            hidden
          />
        </div>
      </div>
      <div style={{ border: '1px solid rgba(131,247,255,0.18)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 0 30px rgba(0,229,255,0.08)' }}>
        <iframe
          ref={iframeRef}
          title="AI Healthcare Vision Control"
          src={MEDIAPIPE_APP_URL}
          className="ai-healthcare-vision-frame"
          allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="ai-vision-status" style={{ marginTop: 12 }}>{status}</div>
    </section>
  )
}

export default function AIHealthcareVisionControlPanel({ onNext, onPrev, prevLabel }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade ai-healthcare-vision-page">
      <section className="ai-healthcare-vision-header">
        <div>
          <div className="ai-healthcare-vision-kicker">AI HEALTHCARE VISION CONTROL</div>
          <h2>🧠 AI Healthcare Vision Control</h2>
          <p>
            {lang === 'vi'
              ? 'Giữ nguyên toàn bộ MediaPipe Tasks. Cụm điều khiển Camera được gắn quanh khung Webcam để chụp ảnh, thêm lớp phủ AI và lưu ngay vào trang Upload Records.'
              : 'Keeps the full MediaPipe Tasks experience. Camera controls wrap the Webcam frame so snapshots can be captured with the AI overlay and saved into Upload Records.'}
          </p>
        </div>
        <a href={MEDIAPIPE_APP_URL} target="_blank" rel="noreferrer" className="ai-healthcare-vision-open-link">
          {lang === 'vi' ? 'Mở MediaPipe Tasks ↗' : 'Open MediaPipe Tasks ↗'}
        </a>
      </section>

      <MediaPipeTasksWithUpload />

      <NavButtons onNext={onNext} nextLabel={`${lang === 'vi' ? 'Góc xả stress' : 'Stress Relief Corner'} →`} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
