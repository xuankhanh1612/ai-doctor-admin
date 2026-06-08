import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { saveRecord } from '../lib/medicalStorage.js'
import { notifyUpload } from '../hooks/useMedicalData.js'
import NavButtons from './NavButtons.jsx'

const HUMAN_DOCTORS = [
  {
    id: 'dr-lan',
    name: 'BS. Nguyễn Mai Lan',
    specialty: 'Tim mạch can thiệp',
    role: 'Bác sĩ vật lý · Phòng khám A',
    status: 'online',
    accent: 'var(--cyan)',
    avatar: 'NL',
    vitals: '1080p · 32ms',
  },
  {
    id: 'dr-minh',
    name: 'BS. Trần Quốc Minh',
    specialty: 'Hồi sức cấp cứu',
    role: 'Bác sĩ vật lý · ICU',
    status: 'online',
    accent: 'var(--green)',
    avatar: 'TM',
    vitals: '720p · 45ms',
  },
  {
    id: 'dr-hoa',
    name: 'BS. Lê Thu Hoa',
    specialty: 'Chẩn đoán hình ảnh',
    role: 'Bác sĩ vật lý · PACS Room',
    status: 'offline',
    accent: 'var(--text3)',
    avatar: 'LH',
    vitals: 'Offline mode',
  },
]

const AI_DOCTORS = [
  { id: 'ai-cardio', name: 'Cardio Agent', specialty: 'ECG + Echo reasoning', status: 'online', load: 86, accent: 'var(--cyan)' },
  { id: 'ai-onco', name: 'Oncology Agent', specialty: 'Tumor board simulation', status: 'online', load: 91, accent: 'var(--violet)' },
  { id: 'ai-rad', name: 'Radiology Agent', specialty: 'CT/MRI livestream assist', status: 'online', load: 78, accent: 'var(--green)' },
  { id: 'ai-pharma', name: 'Pharma Agent', specialty: 'Drug interaction guardrail', status: 'online', load: 83, accent: 'var(--amber)' },
  { id: 'ai-neuro', name: 'Neuro Agent', specialty: 'Neurology fallback consult', status: 'offline', load: 0, accent: 'var(--text3)' },
]

const STATUS_LABEL = {
  online: 'ONLINE',
  offline: 'OFFLINE',
}

function StatusPill({ status }) {
  const isOnline = status === 'online'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 9px', borderRadius: 999,
      fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 800,
      letterSpacing: '0.08em',
      color: isOnline ? 'var(--green)' : 'var(--text3)',
      border: `1px solid ${isOnline ? 'rgba(0,230,118,0.3)' : 'var(--border2)'}`,
      background: isOnline ? 'rgba(0,230,118,0.08)' : 'var(--surface2)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: isOnline ? 'var(--green)' : 'var(--text3)',
        boxShadow: isOnline ? '0 0 10px var(--green)' : 'none',
      }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

function HumanVideoTile({ doctor, featured = false }) {
  const isOnline = doctor.status === 'online'
  return (
    <div style={{
      position: 'relative', minHeight: featured ? 330 : 190,
      borderRadius: 18, overflow: 'hidden',
      border: `1px solid ${isOnline ? 'rgba(0,229,255,0.22)' : 'var(--border)'}`,
      background: isOnline
        ? `radial-gradient(circle at 20% 15%, ${doctor.accent}38, transparent 32%), linear-gradient(135deg, rgba(8,12,26,0.96), rgba(4,6,15,0.98))`
        : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,0,0,0.18))',
      filter: isOnline ? 'none' : 'grayscale(0.88)',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: isOnline ? 0.24 : 0.08, backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      {isOnline && <div style={{ position: 'absolute', left: 0, right: 0, top: '44%', height: 2, background: `linear-gradient(90deg, transparent, ${doctor.accent}, transparent)`, animation: 'scan-line 3s ease-in-out infinite' }} />}
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <StatusPill status={doctor.status} />
        <span style={{ fontSize: 10, color: isOnline ? doctor.accent : 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{doctor.vitals}</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: featured ? 112 : 78, height: featured ? 112 : 78, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isOnline ? '#031018' : 'var(--text3)', fontSize: featured ? 34 : 24, fontWeight: 900,
          background: isOnline ? `linear-gradient(135deg, ${doctor.accent}, #ffffff)` : 'var(--surface2)',
          border: `1px solid ${isOnline ? 'rgba(255,255,255,0.36)' : 'var(--border2)'}`,
          boxShadow: isOnline ? `0 0 46px ${doctor.accent}55` : 'none',
        }}>{doctor.avatar}</div>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, padding: featured ? 22 : 16,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.82))',
      }}>
        <div style={{ color: '#fff', fontSize: featured ? 19 : 14, fontWeight: 800 }}>{doctor.name}</div>
        <div style={{ color: isOnline ? doctor.accent : 'var(--text3)', fontSize: 12, marginTop: 3 }}>{doctor.specialty}</div>
        <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: 10, marginTop: 6 }}>{doctor.role}</div>
      </div>
    </div>
  )
}

function AgentCard({ agent }) {
  const isOnline = agent.status === 'online'
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: isOnline ? 'var(--surface)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isOnline ? 'var(--border2)' : 'var(--border)'}`,
      opacity: isOnline ? 1 : 0.52,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
          <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 2 }}>{agent.specialty}</div>
        </div>
        <StatusPill status={agent.status} />
      </div>
      <div style={{ marginTop: 12, height: 5, borderRadius: 999, overflow: 'hidden', background: 'var(--surface2)' }}>
        <div style={{ width: `${agent.load}%`, height: '100%', borderRadius: 999, background: agent.accent, animation: isOnline ? 'grow-bar 1s ease both' : 'none' }} />
      </div>
      <div style={{ marginTop: 7, color: isOnline ? agent.accent : 'var(--text3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
        {isOnline ? `${agent.load}% inference stream` : 'offline standby'}
      </div>
    </div>
  )
}

function livestreamTimestamp(date = new Date()) {
  return date.toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function dataUrlBase64(dataUrl) {
  return String(dataUrl || '').split(',')[1] || ''
}

function telemedicineFilename(prefix, ext) {
  return `${prefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`
}

function drawLivestreamScanOverlay(ctx, width, height, timestamp, capturedAt = '') {
  const pad = Math.max(18, Math.round(width * 0.035))
  const corner = Math.min(width, height) * 0.17
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.96)'
  ctx.lineWidth = Math.max(4, Math.round(width * 0.007))
  ctx.shadowColor = 'rgba(0,229,255,0.95)'
  ctx.shadowBlur = 18
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
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,12,24,0.76)'
  ctx.fillRect(pad, pad, 270, 42)
  ctx.strokeStyle = 'rgba(131,247,255,0.72)'
  ctx.lineWidth = 2
  ctx.strokeRect(pad, pad, 270, 42)
  ctx.fillStyle = '#83f7ff'
  ctx.font = `900 ${Math.max(15, width * 0.022)}px monospace`
  ctx.fillText('AI LIVESTREAM SCAN', pad + 12, pad + 27)
  const boxH = capturedAt ? 90 : 66
  const boxW = Math.min(width - pad * 2, 440)
  const boxX = width - pad - boxW
  const boxY = height - pad - boxH
  ctx.fillStyle = 'rgba(0,12,24,0.78)'
  ctx.fillRect(boxX, boxY, boxW, boxH)
  ctx.strokeStyle = 'rgba(131,247,255,0.74)'
  ctx.strokeRect(boxX, boxY, boxW, boxH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${Math.max(15, width * 0.022)}px sans-serif`
  ctx.fillText('REAL-TIME CAPTURE CLOCK', boxX + 14, boxY + 27)
  ctx.fillStyle = '#83f7ff'
  ctx.font = `800 ${Math.max(14, width * 0.020)}px monospace`
  ctx.fillText(timestamp, boxX + 14, boxY + 52)
  if (capturedAt) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)'
    ctx.font = `700 ${Math.max(12, width * 0.017)}px sans-serif`
    ctx.fillText(`Last capture · ${capturedAt}`, boxX + 14, boxY + 76)
  }
  ctx.restore()
}

function LivestreamScanOverlay({ timestamp, capturedAt }) {
  return (
    <div style={{ position: 'absolute', inset: 14, pointerEvents: 'none', zIndex: 4 }}>
      <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.94)', borderRadius: 16, boxShadow: '0 0 0 1px rgba(0,229,255,0.78), 0 0 34px rgba(0,229,255,0.28) inset' }} />
      {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
        <div key={`${v}-${h}`} style={{ position: 'absolute', [v]: 0, [h]: 0, width: 58, height: 58, borderColor: '#83f7ff', borderStyle: 'solid', borderWidth: `${v === 'top' ? 4 : 0}px ${h === 'right' ? 4 : 0}px ${v === 'bottom' ? 4 : 0}px ${h === 'left' ? 4 : 0}px`, borderRadius: `${v === 'top' && h === 'left' ? 16 : 0}px ${v === 'top' && h === 'right' ? 16 : 0}px ${v === 'bottom' && h === 'right' ? 16 : 0}px ${v === 'bottom' && h === 'left' ? 16 : 0}px` }} />
      ))}
      <div style={{ position: 'absolute', left: 16, top: 16, padding: '8px 10px', borderRadius: 999, background: 'rgba(0,12,24,0.72)', border: '1px solid rgba(131,247,255,0.64)', color: '#83f7ff', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 900, letterSpacing: '0.08em' }}>
        AI LIVESTREAM SCAN
      </div>
      <div style={{ position: 'absolute', right: 16, bottom: 16, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,12,24,0.78)', border: '1px solid rgba(131,247,255,0.68)', boxShadow: '0 0 18px rgba(0,229,255,0.24)' }}>
        <div style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>REAL-TIME CAPTURE CLOCK</div>
        <div style={{ color: '#83f7ff', fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 4, fontWeight: 800 }}>{timestamp}</div>
        {capturedAt && <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: 10, marginTop: 6 }}>Last capture · {capturedAt}</div>}
      </div>
    </div>
  )
}

function TelemedicineCameraPanel({ onViewMedicalRecord }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [overlayOn, setOverlayOn] = useState(true)
  const [timestamp, setTimestamp] = useState(livestreamTimestamp())
  const [capturedAt, setCapturedAt] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [savingStatus, setSavingStatus] = useState('')
  const [videoSaving, setVideoSaving] = useState(false)
  const [screenshotSaving, setScreenshotSaving] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
    setCameraStarting(false)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setTimestamp(livestreamTimestamp()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const openCamera = useCallback(async (nextFacingMode = facingMode) => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ mở camera live.')
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
      setFacingMode(nextFacingMode)
      setCameraOpen(true)
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
    } catch (error) {
      console.error('Telemedicine livestream camera failed:', error)
      setCameraError('Không thể mở camera. Vui lòng cấp quyền camera.')
      stopCamera()
    } finally {
      setCameraStarting(false)
    }
  }, [facingMode, stopCamera])

  const switchCamera = useCallback(() => {
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user'
    openCamera(nextFacingMode)
  }, [facingMode, openCamera])

  const saveTelemedicineRecord = useCallback(async ({ blob, dataUrl, mimeType, ext, prefix, label }) => {
    const finalDataUrl = dataUrl || await blobToDataUrl(blob)
    const filename = telemedicineFilename(prefix, ext)
    const record = {
      id: `tele_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename,
      name: filename,
      fileType: mimeType.startsWith('video/') ? 'video' : 'photo',
      type: mimeType.startsWith('video/') ? 'video' : 'photo',
      mimeType,
      size: blob?.size || Math.round((finalDataUrl.length * 3) / 4),
      uploadedAt: new Date().toISOString(),
      dataUrl: finalDataUrl,
      base64Data: dataUrlBase64(finalDataUrl),
      notes: `${label} · ${livestreamTimestamp()}`,
      ownerEmail: user?.email || null,
      ownerName: user?.name || '',
      ownerAvatar: user?.avatar || '',
      ownerProvider: user?.provider || '',
      sourceModule: 'telemedicine-livestream',
      uploadFolder: 'upload/telemedicine-livestream',
      uploadPath: `upload/telemedicine-livestream/${filename}`,
    }
    await saveRecord(record, {
      ownerEmail: user?.email,
      ownerName: user?.name,
      ownerAvatar: user?.avatar,
      ownerProvider: user?.provider,
    })
    notifyUpload()
    return record
  }, [user])

  const captureScreenshot = useCallback(async () => {
    const video = videoRef.current
    if (!cameraOpen || !video) {
      setSavingStatus('Vui lòng mở camera trước khi chụp màn hình.')
      return
    }
    setScreenshotSaving(true)
    setSavingStatus('Đang lưu ảnh chụp màn hình vào Upload Records...')
    try {
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
      if (overlayOn) drawLivestreamScanOverlay(ctx, canvas.width, canvas.height, timestamp, capturedAt)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      const record = await saveTelemedicineRecord({ blob, dataUrl, mimeType: 'image/jpeg', ext: 'jpg', prefix: 'telemedicine_screenshot', label: 'Telemedicine screenshot' })
      setCapturedAt(livestreamTimestamp())
      setSavingStatus(`Đã lưu ảnh chụp màn hình vào Upload Records: ${record.filename}`)
    } catch (error) {
      console.error('Telemedicine screenshot save failed:', error)
      setSavingStatus('Không thể lưu ảnh chụp màn hình.')
    } finally {
      setScreenshotSaving(false)
    }
  }, [cameraOpen, capturedAt, facingMode, overlayOn, saveTelemedicineRecord, timestamp])

  const captureMoment = useCallback(async () => {
    const stream = streamRef.current
    if (!cameraOpen || !stream) {
      setSavingStatus('Vui lòng mở camera trước khi ghi video.')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setSavingStatus('Trình duyệt không hỗ trợ MediaRecorder để lưu video.')
      return
    }
    setVideoSaving(true)
    const stamp = livestreamTimestamp()
    setCapturedAt(stamp)
    setSavingStatus('Đang ghi video 3 giây và lưu vào Upload Records...')
    try {
      const chunks = []
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = event => {
        if (event.data?.size) chunks.push(event.data)
      }
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve
        recorder.onerror = event => reject(event.error || new Error('MediaRecorder error'))
      })
      recorder.start()
      window.setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop()
      }, 3000)
      await stopped
      const blob = new Blob(chunks, { type: 'video/webm' })
      const record = await saveTelemedicineRecord({ blob, mimeType: 'video/webm', ext: 'webm', prefix: 'telemedicine_video', label: `Telemedicine livestream video · ${stamp}` })
      setSavingStatus(`Đã lưu video vào Upload Records: ${record.filename}`)
    } catch (error) {
      console.error('Telemedicine video save failed:', error)
      setSavingStatus('Không thể lưu video livestream.')
    } finally {
      setVideoSaving(false)
    }
  }, [cameraOpen, saveTelemedicineRecord])

  return (
    <div style={{ borderRadius: 18, border: '1px solid rgba(0,229,255,0.22)', background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(156,111,255,0.08)), var(--surface)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em' }}>AI LIVESTREAM CAMERA</div>
          <div style={{ color: 'var(--text)', fontSize: 17, fontWeight: 900, marginTop: 4 }}>Camera · AI Livestream Scan</div>
          <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 5 }}>Mở camera, đổi camera trước/sau và bật/tắt lớp phủ ghi thời gian realtime.</div>
        </div>
        <StatusPill status={cameraOpen ? 'online' : 'offline'} />
      </div>
      <div style={{ position: 'relative', minHeight: 320, borderRadius: 16, overflow: 'hidden', background: 'radial-gradient(circle at 50% 30%, rgba(0,229,255,0.18), rgba(4,6,15,0.98) 64%)', border: '1px solid var(--border)' }}>
        {cameraOpen ? (
          <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text2)', textAlign: 'center', padding: 24 }}>
            <div><div style={{ fontSize: 56, marginBottom: 10 }}>📹</div><b>Bấm “Mở camera” để bắt đầu livestream scan</b></div>
          </div>
        )}
        {overlayOn && <LivestreamScanOverlay timestamp={timestamp} capturedAt={capturedAt} />}
      </div>
      {cameraError && <div style={{ marginTop: 10, color: '#ff5252', fontSize: 12, fontWeight: 800 }}>⚠️ {cameraError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 10, marginTop: 12 }}>
        <button type="button" onClick={() => openCamera()} disabled={cameraStarting} style={telemedicineCameraButton(cameraOpen)}>{cameraStarting ? 'Đang mở…' : cameraOpen ? 'Khởi động lại' : 'Mở camera'}</button>
        <button type="button" onClick={switchCamera} disabled={!cameraOpen || cameraStarting} style={telemedicineCameraButton(false)}>🔄 Đổi camera</button>
        <button type="button" onClick={() => setOverlayOn(v => !v)} style={telemedicineCameraButton(overlayOn)}>▣ Lớp phủ</button>
        <button type="button" onClick={captureScreenshot} disabled={!cameraOpen || screenshotSaving} style={telemedicineCameraButton(false)}>{screenshotSaving ? 'Đang lưu…' : '📷 Chụp màn hình'}</button>
        <button type="button" onClick={captureMoment} disabled={!cameraOpen || videoSaving} style={telemedicineCameraButton(false)}>{videoSaving ? 'Đang ghi…' : '📸 Ghi giờ'}</button>
      </div>
      {savingStatus && <div style={{ marginTop: 10, color: savingStatus.startsWith('Đã') ? 'var(--green)' : 'var(--cyan)', fontSize: 12, fontWeight: 800 }}>{savingStatus}</div>}
      {cameraOpen && <button type="button" onClick={stopCamera} style={{ ...telemedicineCameraButton(false), width: '100%', marginTop: 10 }}>{lang === 'vi' ? 'Đóng camera' : 'Close camera'}</button>}
      {onViewMedicalRecord && <button type="button" onClick={onViewMedicalRecord} style={{ ...telemedicineCameraButton(true), width: '100%', marginTop: 10, background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: '0', color: '#fff', boxShadow: '0 14px 30px rgba(34,197,94,0.24)' }}>{lang === 'vi' ? 'Xem hình tại Medical Records' : 'View image in Medical Records'}</button>}
    </div>
  )
}

function telemedicineCameraButton(active) {
  return {
    minHeight: 42,
    border: `1px solid ${active ? 'rgba(0,229,255,0.45)' : 'var(--border2)'}`,
    borderRadius: 11,
    background: active ? 'rgba(0,229,255,0.16)' : 'rgba(255,255,255,0.05)',
    color: active ? 'var(--cyan)' : 'var(--text)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 900,
    fontFamily: 'inherit',
  }
}

export default function TelemedicinePanel({ onNext, nextLabel, onPrev, prevLabel, onViewMedicalRecord }) {
  const { t } = useApp()
  const onlineHumans = HUMAN_DOCTORS.filter(d => d.status === 'online').length
  const onlineAgents = AI_DOCTORS.filter(d => d.status === 'online').length

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="telemedicine-hero" style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        padding: 20, borderRadius: 18, border: '1px solid var(--border)',
        background: 'radial-gradient(circle at 12% 15%, rgba(0,229,255,0.18), transparent 34%), radial-gradient(circle at 88% 10%, rgba(156,111,255,0.16), transparent 30%), var(--surface)',
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', fontWeight: 800 }}>TELEMEDICINE LIVESTREAM</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', marginTop: 8 }}>{t('telemedicineTitle')}</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 6, maxWidth: 720 }}>{t('telemedicineSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StatusPill status="online" />
          <span style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(0,229,255,0.09)', border: '1px solid rgba(0,229,255,0.2)', color: 'var(--cyan)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
            {onlineHumans}/3 REAL DOCTORS
          </span>
          <span style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(156,111,255,0.09)', border: '1px solid rgba(156,111,255,0.24)', color: 'var(--violet)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
            {onlineAgents}/5 AI AGENTS
          </span>
        </div>
      </div>

      <TelemedicineCameraPanel onViewMedicalRecord={onViewMedicalRecord} />

      <div className="telemedicine-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.65fr)', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <HumanVideoTile doctor={HUMAN_DOCTORS[0]} featured />
          <div className="telemedicine-doctor-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            {HUMAN_DOCTORS.slice(1).map(doctor => <HumanVideoTile key={doctor.id} doctor={doctor} />)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 16, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 900 }}>{t('aiAgentRoom')}</div>
                <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 2 }}>{t('aiAgentRoomHint')}</div>
              </div>
              <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900 }}>{onlineAgents}/5</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {AI_DOCTORS.map(agent => <AgentCard key={agent.id} agent={agent} />)}
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 16, background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(156,111,255,0.08))', border: '1px solid var(--border2)' }}>
            <div style={{ color: 'var(--text)', fontWeight: 900, fontSize: 14 }}>{t('handoffTitle')}</div>
            <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>{t('handoffCopy')}</div>
          </div>
        </div>
      </div>

      <NavButtons onNext={onNext} nextLabel={nextLabel || t('statAnalysis')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
