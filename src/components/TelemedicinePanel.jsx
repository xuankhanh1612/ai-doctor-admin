import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
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
      <div style={{ position: 'absolute', left: 16, bottom: 16, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,12,24,0.78)', border: '1px solid rgba(131,247,255,0.68)', boxShadow: '0 0 18px rgba(0,229,255,0.24)' }}>
        <div style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>REAL-TIME CAPTURE CLOCK</div>
        <div style={{ color: '#83f7ff', fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 4, fontWeight: 800 }}>{timestamp}</div>
        {capturedAt && <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: 10, marginTop: 6 }}>Last capture · {capturedAt}</div>}
      </div>
    </div>
  )
}

function TelemedicineCameraPanel() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [overlayOn, setOverlayOn] = useState(true)
  const [timestamp, setTimestamp] = useState(livestreamTimestamp())
  const [capturedAt, setCapturedAt] = useState('')
  const [cameraError, setCameraError] = useState('')

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

  const captureMoment = useCallback(() => {
    setCapturedAt(livestreamTimestamp())
  }, [])

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
        <button type="button" onClick={() => openCamera()} disabled={cameraStarting} style={telemedicineCameraButton(cameraOpen)}>{cameraStarting ? 'Đang mở…' : cameraOpen ? 'Khởi động lại' : 'Mở camera'}</button>
        <button type="button" onClick={switchCamera} disabled={!cameraOpen || cameraStarting} style={telemedicineCameraButton(false)}>🔄 Đổi camera</button>
        <button type="button" onClick={() => setOverlayOn(v => !v)} style={telemedicineCameraButton(overlayOn)}>▣ Lớp phủ</button>
        <button type="button" onClick={captureMoment} disabled={!cameraOpen} style={telemedicineCameraButton(false)}>📸 Ghi giờ</button>
      </div>
      {cameraOpen && <button type="button" onClick={stopCamera} style={{ ...telemedicineCameraButton(false), width: '100%', marginTop: 10 }}>Đóng camera</button>}
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

export default function TelemedicinePanel({ onNext, onPrev, prevLabel }) {
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

      <TelemedicineCameraPanel />

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

      <NavButtons onNext={onNext} nextLabel={t('continueAiCouncil')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
