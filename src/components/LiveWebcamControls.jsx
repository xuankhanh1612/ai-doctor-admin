/**
 * LiveWebcamControls.jsx
 * AI Doctor — Webcam Control System v2.0
 *
 * Architecture:
 *   LiveWebcamControls        ← default export, drop-in for TelemedicineCameraPanel
 *   ├── CameraViewport    ← video / placeholder / uploaded-image area
 *   ├── OverlayCanvas     ← HUD, grid, clock, border drawn on canvas
 *   ├── CameraSettingsDrawer ← glassmorphism slide-in drawer
 *   └── ToolbarBottom     ← all action buttons
 *
 * Props:
 *   onSaveRecord(blob, meta) → async — caller (TelemedicinePanel) persists to storage
 *   onViewMedicalRecord()   → navigate to records page
 *   lang                    → 'vi' | 'en'
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function padZ(n) { return String(n).padStart(2, '0') }

function nowClock(showMs = false) {
  const d = new Date()
  const base = `${padZ(d.getHours())}:${padZ(d.getMinutes())}:${padZ(d.getSeconds())}`
  return showMs ? `${base}.${String(d.getMilliseconds()).padStart(3, '0')}` : base
}

function nowDate() {
  const d = new Date()
  return `${padZ(d.getDate())}/${padZ(d.getMonth() + 1)}/${d.getFullYear()}`
}

function telemedicineFilename(prefix, ext) {
  return `${prefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`
}

/* ─── canvas draw helpers ─────────────────────────────────────────────────── */

function drawMedicalBorder(ctx, w, h) {
  const arm = Math.min(w, h) * 0.13
  const pad = 14
  ctx.save()
  ctx.strokeStyle = '#00e5ff'
  ctx.lineWidth = 3
  ctx.shadowColor = 'rgba(0,229,255,0.85)'
  ctx.shadowBlur = 18
  const corners = [
    [pad, pad, pad + arm, pad, pad, pad + arm],
    [w - pad, pad, w - pad - arm, pad, w - pad, pad + arm],
    [pad, h - pad, pad + arm, h - pad, pad, h - pad - arm],
    [w - pad, h - pad, w - pad - arm, h - pad, w - pad, h - pad - arm],
  ]
  corners.forEach(([ax, ay, bx, by, cx, cy]) => {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
    ctx.moveTo(ax, ay); ctx.lineTo(cx, cy); ctx.stroke()
  })
  ctx.restore()
}

function drawScanGrid(ctx, w, h) {
  ctx.save()
  ctx.strokeStyle = 'rgba(0,229,255,0.07)'
  ctx.lineWidth = 1
  const cols = 12; const rows = 8
  for (let i = 1; i < cols; i++) {
    const x = (w / cols) * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let j = 1; j < rows; j++) {
    const y = (h / rows) * j; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
  ctx.restore()
}

function drawHUDLabels(ctx, w) {
  ctx.save()
  ctx.fillStyle = 'rgba(0,8,20,0.76)'
  ctx.fillRect(14, 14, 180, 34)
  ctx.strokeStyle = 'rgba(0,229,255,0.55)'
  ctx.lineWidth = 1
  ctx.strokeRect(14, 14, 180, 34)
  ctx.fillStyle = '#00e5ff'
  ctx.font = '900 12px monospace'
  ctx.fillText('AI DOCTOR VISION', 24, 36)
  ctx.restore()
}

function drawClock(ctx, w, h, clock, date) {
  const bw = 210; const bh = 50; const bx = w - bw - 14; const by = 14
  ctx.save()
  ctx.fillStyle = 'rgba(0,8,20,0.78)'
  ctx.fillRect(bx, by, bw, bh)
  ctx.strokeStyle = 'rgba(0,229,255,0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(bx, by, bw, bh)
  ctx.fillStyle = '#fff'
  ctx.font = '900 20px monospace'
  ctx.fillText(clock, bx + 12, by + 29)
  ctx.fillStyle = 'rgba(0,229,255,0.85)'
  ctx.font = '700 11px monospace'
  ctx.fillText(date, bx + 12, by + 44)
  ctx.restore()
}

function drawFullOverlay(canvas, { showBorder, showGrid, showHUD, showClock, clockMs }) {
  const ctx = canvas.getContext('2d')
  const w = canvas.width; const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  if (showGrid) drawScanGrid(ctx, w, h)
  if (showBorder) drawMedicalBorder(ctx, w, h)
  if (showHUD) drawHUDLabels(ctx, w)
  if (showClock) drawClock(ctx, w, h, nowClock(clockMs), nowDate())
}

/* ─── Placeholder (camera OFF state) ─────────────────────────────────────── */

function CameraOffPlaceholder({ onOpen, cameraStarting }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(circle at 50% 35%, rgba(0,229,255,0.12), rgba(4,6,18,0.98) 64%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 18, padding: 24,
    }}>
      {/* scan grid background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.15,
        backgroundImage: 'linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)',
        backgroundSize: '32px 32px' }} />

      {/* cyber corners */}
      {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
        <div key={`${v}-${h}`} style={{
          position: 'absolute', [v]: 14, [h]: 14, width: 52, height: 52,
          borderColor: 'rgba(0,229,255,0.72)', borderStyle: 'solid',
          borderWidth: `${v==='top'?3:0}px ${h==='right'?3:0}px ${v==='bottom'?3:0}px ${h==='left'?3:0}px`,
          borderRadius: `${v==='top'&&h==='left'?12:0}px ${v==='top'&&h==='right'?12:0}px ${v==='bottom'&&h==='right'?12:0}px ${v==='bottom'&&h==='left'?12:0}px`,
          boxShadow: '0 0 12px rgba(0,229,255,0.4)',
        }} />
      ))}

      {/* AI overlay badge */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        padding: '6px 12px', borderRadius: 999,
        background: 'rgba(0,8,24,0.82)', border: '1px solid rgba(0,229,255,0.5)',
        color: '#00e5ff', fontSize: 10, fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.1em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 8px #00e5ff', display: 'inline-block', animation: 'wc-pulse 2s ease-in-out infinite' }} />
        AI OVERLAY ACTIVE
      </div>

      {/* clock top-right */}
      <div style={{
        position: 'absolute', top: 20, right: 20,
        padding: '6px 14px', borderRadius: 10,
        background: 'rgba(0,8,24,0.82)', border: '1px solid rgba(0,229,255,0.45)',
        color: '#fff', fontSize: 13, fontFamily: 'monospace', fontWeight: 900, lineHeight: 1.4,
        textAlign: 'right',
      }}>
        <LiveClock />
      </div>

      {/* centre body / logo */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        {/* skeleton icon placeholder */}
        <div style={{ fontSize: 56, marginBottom: 2, filter: 'drop-shadow(0 0 18px rgba(0,229,255,0.5))' }}>🫀</div>
        <div style={{ color: '#00e5ff', fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: '0.06em', textShadow: '0 0 24px rgba(0,229,255,0.8)' }}>
          AI DOCTOR VISION
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 6 }}>
          AI Overlay is running · Open camera to start
        </div>

        {/* AI feature tags */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
          {['🧠 Face Mesh','🦴 Skeleton','❤️ Heart Rate','🏃 Posture'].map(label => (
            <span key={label} style={{
              padding: '5px 11px', borderRadius: 999,
              background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.35)',
              color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 700,
            }}>{label}</span>
          ))}
        </div>

        {/* open camera button */}
        <button
          type="button"
          onClick={onOpen}
          disabled={cameraStarting}
          style={{
            marginTop: 24, padding: '14px 40px', borderRadius: 14,
            background: cameraStarting ? 'rgba(0,229,255,0.12)' : 'linear-gradient(135deg, rgba(0,229,255,0.22), rgba(0,229,255,0.10))',
            border: '2px solid rgba(0,229,255,0.7)',
            color: '#00e5ff', fontSize: 15, fontWeight: 900, fontFamily: 'inherit',
            cursor: cameraStarting ? 'wait' : 'pointer',
            letterSpacing: '0.06em',
            boxShadow: '0 0 28px rgba(0,229,255,0.25)',
            display: 'flex', alignItems: 'center', gap: 10, margin: '24px auto 0',
          }}
        >
          <span style={{ fontSize: 18 }}>📷</span>
          {cameraStarting ? 'STARTING...' : 'OPEN CAMERA'}
          <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>Start AI Livestream Scan</span>
        </button>
      </div>
    </div>
  )
}

/* ─── Live clock component ─────────────────────────────────────────────────── */
function LiveClock({ showMs = false }) {
  const [time, setTime] = useState(nowClock(showMs))
  const [date, setDate] = useState(nowDate())
  useEffect(() => {
    const id = setInterval(() => { setTime(nowClock(showMs)); setDate(nowDate()) }, showMs ? 50 : 1000)
    return () => clearInterval(id)
  }, [showMs])
  return <><div>{time}</div><div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{date}</div></>
}

/* ─── Settings Drawer ─────────────────────────────────────────────────────── */
function CameraSettingsDrawer({ open, onClose, settings, onSettings, cameras, selectedCamera, onSelectCamera }) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 260, zIndex: 20,
      transform: open ? 'translateX(0)' : 'translateX(102%)',
      transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
      background: 'rgba(4,8,24,0.88)',
      backdropFilter: 'blur(18px)',
      borderLeft: '1px solid rgba(0,229,255,0.25)',
      boxShadow: '-12px 0 48px rgba(0,0,0,0.55)',
      padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#00e5ff', fontFamily: 'monospace', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em' }}>⚙ SETTINGS</div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>

      <DrawerDivider label="OVERLAY" />
      {[
        { key: 'showOverlay', label: '👁 AI Overlay' },
        { key: 'showClock',   label: '🕒 Clock' },
        { key: 'showBorder',  label: '⬜ Cyber Border' },
        { key: 'showGrid',    label: '⊞ Scan Grid' },
        { key: 'clockMs',     label: '⏱ Milliseconds' },
      ].map(({ key, label }) => (
        <DrawerToggle key={key} label={label} value={settings[key]} onChange={v => onSettings(key, v)} />
      ))}

      <DrawerDivider label="CAMERA" />
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Resolution</div>
      {['720p','1080p'].map(r => (
        <DrawerRadio key={r} label={r} active={settings.resolution === r} onSelect={() => onSettings('resolution', r)} />
      ))}

      {cameras.length > 1 && (
        <>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>Camera device</div>
          {cameras.map((cam, i) => (
            <DrawerRadio key={cam.deviceId} label={cam.label || `Camera ${i + 1}`} active={selectedCamera === cam.deviceId} onSelect={() => onSelectCamera(cam.deviceId)} />
          ))}
        </>
      )}

      <DrawerDivider label="PRESETS" />
      {[
        { label: '🏥 Medical Scan', preset: { showOverlay: true, showClock: true, showBorder: true } },
        { label: '📡 Telemedicine', preset: { showOverlay: false, showClock: true, showBorder: false } },
        { label: '🔬 AI Research',  preset: { showOverlay: true, showClock: true, showBorder: true, showGrid: true } },
        { label: '📸 Screenshot',   preset: { showOverlay: false, showClock: false, showBorder: false } },
      ].map(({ label, preset }) => (
        <button key={label} type="button" onClick={() => onSettings('__preset', preset)} style={{
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)',
          color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}>{label}</button>
      ))}
    </div>
  )
}

function DrawerDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.2)' }} />
      <span style={{ color: 'rgba(0,229,255,0.6)', fontSize: 9, fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.1em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.2)' }} />
    </div>
  )
}

function DrawerToggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12 }}>{label}</span>
      <button type="button" onClick={() => onChange(!value)} style={{
        width: 42, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: value ? '#00e5ff' : 'rgba(255,255,255,0.12)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: value ? 20 : 3, width: 18, height: 18,
          borderRadius: '50%', background: value ? '#031018' : 'rgba(255,255,255,0.5)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

function DrawerRadio({ label, active, onSelect }) {
  return (
    <button type="button" onClick={onSelect} style={{
      padding: '6px 10px', borderRadius: 7, border: `1px solid ${active ? 'rgba(0,229,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
      background: active ? 'rgba(0,229,255,0.12)' : 'transparent',
      color: active ? '#00e5ff' : 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
    }}>{label}</button>
  )
}

/* ─── Toolbar button ───────────────────────────────────────────────────────── */
function TBtn({ icon, label, active, disabled, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4, padding: '8px 6px', minWidth: 60, borderRadius: 12,
        background: danger ? 'rgba(255,82,82,0.13)'
          : active ? 'rgba(0,229,255,0.16)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${danger ? 'rgba(255,82,82,0.4)' : active ? 'rgba(0,229,255,0.45)' : 'rgba(255,255,255,0.10)'}`,
        color: danger ? '#ff5252' : active ? '#00e5ff' : 'rgba(255,255,255,0.75)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.38 : 1,
        fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
        transition: 'all 0.18s',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function WebcamControls({
  onSaveRecord,
  onViewMedicalRecord,
  lang = 'vi',
}) {
  /* camera state */
  const videoRef     = useRef(null)
  const streamRef    = useRef(null)
  const overlayRef   = useRef(null)  // HUD canvas
  const animRef      = useRef(null)
  const recorderRef  = useRef(null)
  const chunksRef    = useRef([])
  const uploadInputRef = useRef(null)

  const [isCameraOpen,  setIsCameraOpen]  = useState(false)
  const [cameraStarting,setCameraStarting]= useState(false)
  const [facingMode,    setFacingMode]    = useState('user')
  const [cameras,       setCameras]       = useState([])
  const [selectedCamera,setSelectedCamera]= useState('')

  const [isRecording,   setIsRecording]   = useState(false)
  const [recordTime,    setRecordTime]    = useState(0)
  const recordTimerRef = useRef(null)

  const [flashEnabled,  setFlashEnabled]  = useState(false)
  const [flashMsg,      setFlashMsg]      = useState('')

  const [uploadedImage, setUploadedImage] = useState(null) // dataUrl

  const [showSettings,  setShowSettings]  = useState(false)
  const [status,        setStatus]        = useState('')

  /* overlay toggles */
  const [settings, setSettings] = useState({
    showOverlay: true,
    showClock:   true,
    showBorder:  true,
    showGrid:    false,
    clockMs:     false,
    resolution:  '1080p',
  })

  const updateSetting = useCallback((key, value) => {
    if (key === '__preset') {
      setSettings(prev => ({ ...prev, ...value }))
    } else {
      setSettings(prev => ({ ...prev, [key]: value }))
    }
  }, [])

  /* ── enumerate cameras ── */
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then(devs => {
      const vids = devs.filter(d => d.kind === 'videoinput')
      setCameras(vids)
    }).catch(() => {})
  }, [])

  /* ── HUD animation loop ── */
  useEffect(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    let running = true
    const loop = () => {
      if (!running) return
      drawFullOverlay(canvas, {
        showBorder: settings.showBorder,
        showGrid:   settings.showGrid,
        showHUD:    settings.showOverlay,
        showClock:  settings.showClock,
        clockMs:    settings.clockMs,
      })
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [settings])

  /* ── stop camera cleanup ── */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks?.().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraOpen(false)
    setCameraStarting(false)
    setFlashEnabled(false)
    clearInterval(recordTimerRef.current)
    setIsRecording(false)
    setRecordTime(0)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  /* ── open camera ── */
  const openCamera = useCallback(async (opts = {}) => {
    const facing = opts.facingMode ?? facingMode
    const deviceId = opts.deviceId ?? selectedCamera
    setStatus('')
    setFlashMsg('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(lang === 'vi' ? 'Trình duyệt không hỗ trợ camera.' : 'Browser does not support camera.')
      return
    }
    setCameraStarting(true)
    streamRef.current?.getTracks?.().forEach(t => t.stop())
    try {
      const resW = settings.resolution === '1080p' ? 1920 : 1280
      const resH = settings.resolution === '1080p' ? 1080 : 720
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: resW }, height: { ideal: resH } }
          : { facingMode: { ideal: facing }, width: { ideal: resW }, height: { ideal: resH } },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setFacingMode(facing)
      setIsCameraOpen(true)
      setUploadedImage(null)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
    } catch (err) {
      setStatus(lang === 'vi' ? 'Không thể mở camera. Kiểm tra quyền truy cập.' : 'Cannot open camera. Check permissions.')
      stopCamera()
    } finally {
      setCameraStarting(false)
    }
  }, [facingMode, selectedCamera, settings.resolution, stopCamera, lang])

  /* ── switch camera (front/rear) ── */
  const switchCamera = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    openCamera({ facingMode: next })
  }, [facingMode, openCamera])

  /* ── flash / torch ── */
  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks?.()?.[0]
    if (!track) { setFlashMsg('Open camera first.'); return }
    const next = !flashEnabled
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setFlashEnabled(next)
      setFlashMsg('')
    } catch {
      setFlashMsg('Flash unavailable on this device.')
    }
  }, [flashEnabled])

  /* ── upload image ── */
  const handleUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      stopCamera()
      setUploadedImage(ev.target.result)
      setStatus(lang === 'vi' ? 'Đã tải ảnh lên. Có thể lưu màn hình với overlay.' : 'Image loaded. You can save with overlay.')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [stopCamera, lang])

  /* ── capture frame → save ── */
  const captureAndSave = useCallback(async () => {
    const canvas = document.createElement('canvas')
    const overlay = overlayRef.current

    if (uploadedImage) {
      const img = new window.Image()
      img.onload = async () => {
        canvas.width = img.naturalWidth || 1280
        canvas.height = img.naturalHeight || 720
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        if (overlay) {
          canvas.getContext('2d').drawImage(overlay, 0, 0, canvas.width, canvas.height)
        }
        const dataUrl = canvas.toDataURL('image/png')
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
        const filename = telemedicineFilename('webcam_capture', 'png')
        await onSaveRecord?.(blob, { dataUrl, filename, mimeType: 'image/png', label: 'Webcam capture' })
        setStatus(lang === 'vi' ? '✅ Đã lưu ảnh vào Records.' : '✅ Saved to Medical Records.')
      }
      img.src = uploadedImage
      return
    }

    const video = videoRef.current
    if (!isCameraOpen || !video) {
      setStatus(lang === 'vi' ? 'Mở camera trước khi chụp.' : 'Open camera first.')
      return
    }
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (facingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (overlay) ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92))
    const filename = telemedicineFilename('webcam_capture', 'jpg')
    await onSaveRecord?.(blob, { dataUrl, filename, mimeType: 'image/jpeg', label: 'Webcam capture' })
    setStatus(lang === 'vi' ? '✅ Đã lưu ảnh vào Records.' : '✅ Saved to Medical Records.')
  }, [isCameraOpen, facingMode, uploadedImage, onSaveRecord, lang])

  /* ── save uploaded image / screenshot ── */
  const saveImage = captureAndSave

  /* ── recording ── */
  const toggleRecord = useCallback(async () => {
    if (isRecording) {
      recorderRef.current?.stop()
      return
    }
    const stream = streamRef.current
    if (!stream) { setStatus(lang === 'vi' ? 'Mở camera trước khi ghi.' : 'Open camera first.'); return }
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder
    chunksRef.current = []
    recorder.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      clearInterval(recordTimerRef.current)
      setIsRecording(false)
      setRecordTime(0)
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const filename = telemedicineFilename('webcam_record', 'webm')
      await onSaveRecord?.(blob, { filename, mimeType: 'video/webm', label: 'Webcam recording' })
      setStatus(lang === 'vi' ? '✅ Đã lưu video vào Records.' : '✅ Video saved to Records.')
    }
    recorder.start()
    setIsRecording(true)
    setRecordTime(0)
    recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
  }, [isRecording, onSaveRecord, lang])

  /* ── viewport size for overlay canvas ── */
  const viewportRef = useRef(null)
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!viewportRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setVpSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(viewportRef.current)
    return () => ro.disconnect()
  }, [])

  /* ─── render ─────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes wc-pulse { 0%,100%{opacity:1;box-shadow:0 0 8px #00e5ff} 50%{opacity:.5;box-shadow:0 0 3px #00e5ff} }
        @keyframes wc-rec-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div style={{
        borderRadius: 20, overflow: 'hidden',
        border: '1px solid rgba(0,229,255,0.22)',
        background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(156,111,255,0.06)), var(--surface)',
        boxShadow: '0 4px 40px rgba(0,229,255,0.08)',
      }}>

        {/* ─── header ─── */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,229,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ color: 'var(--cyan)', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em' }}>AI LIVESTREAM CAMERA</div>
            <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 900, marginTop: 3 }}>Camera · AI Vision Scan</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isRecording && (
              <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,82,82,0.15)', border: '1px solid rgba(255,82,82,0.5)', color: '#ff5252', fontSize: 10, fontFamily: 'monospace', fontWeight: 900, animation: 'wc-rec-blink 1s ease-in-out infinite' }}>
                ● REC {padZ(Math.floor(recordTime/60))}:{padZ(recordTime%60)}
              </span>
            )}
            <span style={{ padding: '4px 10px', borderRadius: 999, background: isCameraOpen ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isCameraOpen ? 'rgba(0,230,118,0.4)' : 'var(--border2)'}`, color: isCameraOpen ? 'var(--green)' : 'var(--text3)', fontSize: 10, fontFamily: 'monospace', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCameraOpen ? 'var(--green)' : 'var(--text3)', boxShadow: isCameraOpen ? '0 0 8px var(--green)' : 'none' }} />
              {isCameraOpen ? 'LIVE' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* ─── viewport ─── */}
        <div ref={viewportRef} style={{ position: 'relative', aspectRatio: '16/9', background: '#030810', overflow: 'hidden' }}>

          {/* video element (always mounted) */}
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              display: isCameraOpen ? 'block' : 'none',
            }}
          />

          {/* uploaded image */}
          {uploadedImage && !isCameraOpen && (
            <img src={uploadedImage} alt="uploaded" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#030810' }} />
          )}

          {/* camera-off placeholder */}
          {!isCameraOpen && !uploadedImage && (
            <CameraOffPlaceholder onOpen={() => openCamera()} cameraStarting={cameraStarting} />
          )}

          {/* HUD overlay canvas */}
          <canvas
            ref={overlayRef}
            width={vpSize.w || 1280}
            height={vpSize.h || 720}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
          />

          {/* settings drawer */}
          <CameraSettingsDrawer
            open={showSettings}
            onClose={() => setShowSettings(false)}
            settings={settings}
            onSettings={updateSetting}
            cameras={cameras}
            selectedCamera={selectedCamera}
            onSelectCamera={id => { setSelectedCamera(id); openCamera({ deviceId: id }) }}
          />

          {/* flash message inside viewport */}
          {flashMsg && (
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', borderRadius: 10, background: 'rgba(255,82,82,0.22)', border: '1px solid rgba(255,82,82,0.5)', color: '#ff5252', fontSize: 12, fontWeight: 800, zIndex: 10, whiteSpace: 'nowrap' }}>
              ⚡ {flashMsg}
            </div>
          )}
        </div>

        {/* ─── toolbar bottom ─── */}
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid rgba(0,229,255,0.1)', overflowX: 'auto' }}>

          {/* row 1: settings + flash + switch + upload */}
          <TBtn icon="⚡" label="Flash"    active={flashEnabled}  onClick={toggleFlash}  disabled={!isCameraOpen} />
          <TBtn icon="⚙" label="Settings" active={showSettings}   onClick={() => setShowSettings(v => !v)} />
          <TBtn icon="🔄" label="Switch"   active={false}         onClick={switchCamera} disabled={!isCameraOpen && !cameraStarting} />
          <TBtn icon="🖼" label="Upload"   active={!!uploadedImage} onClick={() => uploadInputRef.current?.click()} />

          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {/* overlay toggles */}
          <TBtn icon="👁" label="Overlay" active={settings.showOverlay} onClick={() => updateSetting('showOverlay', !settings.showOverlay)} />
          <TBtn icon="🕒" label="Clock"   active={settings.showClock}   onClick={() => updateSetting('showClock', !settings.showClock)} />
          <TBtn icon="⬜" label="Border"  active={settings.showBorder}  onClick={() => updateSetting('showBorder', !settings.showBorder)} />

          <div style={{ flex: 1 }} />

          {/* primary actions */}
          <TBtn icon="💾" label="Save"    active={false}       onClick={saveImage}     disabled={!isCameraOpen && !uploadedImage} />

          {/* capture — large */}
          <button
            type="button"
            onClick={captureAndSave}
            disabled={!isCameraOpen && !uploadedImage}
            title="◉ Capture"
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 38%, #fff 20%, rgba(255,255,255,0.88) 100%)',
              border: '4px solid rgba(0,229,255,0.6)',
              boxShadow: '0 0 24px rgba(0,229,255,0.45)',
              cursor: (!isCameraOpen && !uploadedImage) ? 'not-allowed' : 'pointer',
              opacity: (!isCameraOpen && !uploadedImage) ? 0.35 : 1,
              flexShrink: 0,
            }}

          />

          <TBtn icon={isRecording ? '⏹' : '🎥'} label={isRecording ? 'Stop' : 'Record'} active={isRecording} onClick={toggleRecord} disabled={!isCameraOpen} danger={isRecording} />

          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {/* open / close camera */}
          {!isCameraOpen ? (
            <TBtn icon="📷" label="Open Cam" active={false} onClick={() => openCamera()} disabled={cameraStarting} />
          ) : (
            <TBtn icon="✕" label="Close" active={false} onClick={stopCamera} danger />
          )}
        </div>

        {/* ─── status bar ─── */}
        {status && (
          <div style={{ padding: '8px 18px', borderTop: '1px solid rgba(0,229,255,0.08)', fontSize: 12, fontWeight: 800, color: status.startsWith('✅') ? 'var(--green)' : status.startsWith('❌') ? '#ff5252' : 'var(--cyan)', fontFamily: 'monospace' }}>
            {status}
          </div>
        )}

        {/* view records link */}
        {onViewMedicalRecord && (
          <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,229,255,0.06)' }}>
            <button type="button" onClick={onViewMedicalRecord} style={{
              width: '100%', padding: '10px 0', borderRadius: 11,
              background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer',
            }}>
              {lang === 'vi' ? '📁 Xem ảnh tại Medical Records' : '📁 View in Medical Records'}
            </button>
          </div>
        )}

        {/* hidden file input */}
        <input ref={uploadInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
      </div>
    </>
  )
}
