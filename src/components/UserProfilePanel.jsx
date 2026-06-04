import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const PROVIDER_META = {
  google: {
    label: 'Google',
    icon: 'G',
    color: '#4285F4',
    gradient: 'linear-gradient(135deg,#4285F4,#34A853,#FBBC05,#EA4335)',
    soft: 'rgba(66,133,244,0.12)',
    border: 'rgba(66,133,244,0.35)',
  },
  apple: {
    label: 'Apple',
    icon: '',
    color: '#f5f5f7',
    gradient: 'linear-gradient(135deg,#111,#555)',
    soft: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.22)',
  },
  email: {
    label: 'Email',
    icon: '✉',
    color: '#6b3fd4',
    gradient: 'linear-gradient(135deg,#6b3fd4,#00b8cc)',
    soft: 'rgba(107,63,212,0.12)',
    border: 'rgba(107,63,212,0.35)',
  },
}

const initialsAvatar = name => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=6b3fd4&color=fff&size=256&bold=true&rounded=true`
const isDataImage = value => /^data:image\//.test(String(value || ''))


function profileCameraTimestamp(lang, date = new Date()) {
  return date.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function drawProfileCameraOverlay(ctx, width, height, label, timestamp) {
  const pad = Math.max(14, Math.round(width * 0.035))
  const corner = Math.min(width, height) * 0.18
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.96)'
  ctx.lineWidth = Math.max(3, Math.round(width * 0.007))
  ctx.shadowColor = 'rgba(0,229,255,0.95)'
  ctx.shadowBlur = 14
  ;[
    [pad, pad, pad + corner, pad, pad, pad + corner],
    [width - pad, pad, width - pad - corner, pad, width - pad, pad + corner],
    [pad, height - pad, pad + corner, height - pad, pad, height - pad - corner],
    [width - pad, height - pad, width - pad - corner, height - pad, width - pad, height - pad - corner],
  ].forEach(([ax, ay, bx, by, cx, cy]) => {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.moveTo(ax, ay); ctx.lineTo(cx, cy); ctx.stroke()
  })
  const boxH = Math.max(56, height * 0.12)
  const boxY = height - pad - boxH
  const boxW = Math.min(width - pad * 2, Math.max(260, width * 0.56))
  const boxX = width - pad - boxW
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,12,24,0.76)'
  ctx.fillRect(boxX, boxY, boxW, boxH)
  ctx.strokeStyle = 'rgba(131,247,255,0.78)'
  ctx.lineWidth = 2
  ctx.strokeRect(boxX, boxY, boxW, boxH)
  ctx.fillStyle = '#fff'
  ctx.font = `900 ${Math.max(14, width * 0.032)}px sans-serif`
  ctx.fillText(label, boxX + 12, boxY + 24)
  ctx.fillStyle = '#83f7ff'
  ctx.font = `800 ${Math.max(12, width * 0.026)}px monospace`
  ctx.fillText(timestamp, boxX + 12, boxY + 46)
  ctx.restore()
}

function ProfileCameraOverlayBadge({ label, timestamp }) {
  return (
    <div style={{ position: 'absolute', inset: 8, zIndex: 3, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.94)', borderRadius: 12, boxShadow: '0 0 0 1px rgba(0,229,255,0.78), 0 0 22px rgba(0,229,255,0.28) inset' }} />
      <div style={{ position: 'absolute', right: 10, bottom: 10, padding: '7px 9px', borderRadius: 9, background: 'rgba(0,12,24,0.76)', border: '1px solid rgba(131,247,255,0.72)' }}>
        <div style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>{label}</div>
        <div style={{ color: '#83f7ff', fontSize: 9, marginTop: 3, fontFamily: 'monospace', fontWeight: 800 }}>{timestamp}</div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
    </svg>
  )
}

function ProviderBadge({ provider }) {
  if (provider === 'google') return <GoogleIcon />
  if (provider === 'apple') return <span style={{ fontSize: 17, lineHeight: 1 }}></span>
  return <span style={{ fontSize: 13 }}>✉</span>
}

function ProfileActionButton({ active, children, onClick, disabled, accent = '#00b8cc' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 12px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${active ? accent : 'var(--border,rgba(255,255,255,0.12))'}`,
        background: active ? `${accent}1f` : 'transparent',
        color: disabled ? 'var(--text3,#888)' : active ? accent : 'var(--text2,#aaa)',
        fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .18s',
      }}
    >
      {children}
    </button>
  )
}

export default function UserProfilePanel() {
  const { user, updateProfile } = useAuth()
  const { theme, lang, t } = useApp()
  const isDark = theme === 'dark'
  const vi = lang === 'vi'
  const provider = PROVIDER_META[user?.provider] ? user.provider : 'email'
  const providerMeta = PROVIDER_META[provider]
  const providerAvatar = user?.googleAvatar || null

  const [name, setName] = useState(user?.name || '')
  const [specialty, setSpecialty] = useState(user?.specialty || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || providerAvatar || initialsAvatar(user?.name))
  const [avatarCustomized, setAvatarCustomized] = useState(!!user?.avatarCustomized || isDataImage(user?.avatar))
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraFacingMode, setCameraFacingMode] = useState('user')
  const [cameraOverlayOn, setCameraOverlayOn] = useState(true)
  const [cameraNow, setCameraNow] = useState(new Date())
  const [cameraError, setCameraError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const surface = isDark ? 'rgba(255,255,255,0.04)' : '#fff'
  const surface2 = isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc'
  const text = isDark ? '#e8f0f8' : '#1a2035'
  const text2 = isDark ? 'rgba(232,240,248,0.62)' : '#555'
  const text3 = isDark ? 'rgba(232,240,248,0.38)' : '#888'

  useEffect(() => () => stopCamera(), [])

  useEffect(() => {
    if (!cameraActive) return undefined
    setCameraNow(new Date())
    const timer = window.setInterval(() => setCameraNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [cameraActive])

  const stopCamera = () => {
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  const useAccountAvatar = () => {
    if (!providerAvatar) return
    setAvatarPreview(providerAvatar)
    setAvatarCustomized(false)
    setCameraError('')
  }

  const useGeneratedAvatar = () => {
    setAvatarPreview(initialsAvatar(name || user?.name))
    setAvatarCustomized(true)
    setCameraError('')
  }

  const handleFile = (file) => {
    if (!file?.type?.startsWith('image/')) {
      setCameraError(vi ? 'Vui lòng chọn file hình ảnh.' : 'Please choose an image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(reader.result)
      setAvatarCustomized(true)
      setCameraError('')
      stopCamera()
    }
    reader.onerror = () => setCameraError(vi ? 'Không đọc được ảnh này.' : 'Could not read this image.')
    reader.readAsDataURL(file)
  }

  const startCamera = async (nextFacingMode = cameraFacingMode) => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(vi ? 'Trình duyệt không hỗ trợ camera.' : 'Camera is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacingMode } }, audio: false })
      streamRef.current = stream
      setCameraFacingMode(nextFacingMode)
      setCameraActive(true)
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
    } catch (e) {
      setCameraError(vi ? 'Không thể mở camera. Kiểm tra quyền truy cập camera.' : 'Unable to open camera. Please check camera permission.')
    }
  }

  const switchCamera = () => {
    const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user'
    startCamera(nextFacingMode)
  }

  const captureCamera = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (cameraFacingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (cameraFacingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (cameraOverlayOn) {
      drawProfileCameraOverlay(ctx, canvas.width, canvas.height, 'AI Profile Scan', profileCameraTimestamp(lang, cameraNow))
    }
    setAvatarPreview(canvas.toDataURL('image/jpeg', 0.9))
    setAvatarCustomized(true)
    setCameraError('')
    stopCamera()
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await new Promise(resolve => setTimeout(resolve, 250))
    updateProfile({
      name: name.trim() || user?.name,
      specialty: specialty.trim(),
      phone: phone.trim(),
      avatar: avatarPreview || initialsAvatar(name || user?.name),
      avatarCustomized,
    })
    setSaving(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="animate-fade" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, color: text }}>
      <div style={{
        borderRadius: 24, overflow: 'hidden', border: `1px solid ${border}`,
        background: surface, boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.35)' : '0 24px 70px rgba(35,45,80,0.08)',
      }}>
        <div style={{
          padding: '24px 28px', background: providerMeta.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', fontFamily: 'var(--font-mono)' }}>
              {vi ? 'Tài khoản cá nhân' : 'User account'}
            </div>
            <h2 style={{ margin: '6px 0 4px', fontSize: 28, fontWeight: 900, color: '#fff' }}>{t('profile')}</h2>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>
              {vi ? `Đồng bộ hồ sơ từ ${providerMeta.label}, tùy chỉnh avatar và thông tin hiển thị.` : `Sync from ${providerMeta.label}, customize your avatar and display information.`}
            </div>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999,
            background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontWeight: 800,
          }}>
            <ProviderBadge provider={provider} />
            <span>{providerMeta.label}</span>
          </div>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 22 }}>
          <div style={{ border: `1px solid ${border}`, borderRadius: 20, padding: 20, background: surface2 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 154, height: 154, margin: '0 auto 14px' }}>
                <img
                  src={avatarPreview || initialsAvatar(name)}
                  alt={vi ? 'Ảnh đại diện người dùng' : 'User avatar'}
                  style={{ width: 154, height: 154, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${providerMeta.border}`, boxShadow: `0 16px 45px ${providerMeta.border}` }}
                />
                <div style={{
                  position: 'absolute', right: 8, bottom: 8, width: 38, height: 38, borderRadius: '50%',
                  background: provider === 'apple' ? '#111' : '#fff', border: `3px solid ${surface2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                }}>
                  <ProviderBadge provider={provider} />
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>{name || user?.name}</div>
              <div style={{ fontSize: 12, color: text3, marginBottom: 16 }}>{user?.email}</div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <ProfileActionButton active={!avatarCustomized && !!providerAvatar} disabled={!providerAvatar} onClick={useAccountAvatar} accent={provider === 'google' ? '#4285F4' : '#111'}>
                <ProviderBadge provider={provider} />
                {providerAvatar
                  ? (vi ? `Dùng ảnh ${providerMeta.label}` : `Use ${providerMeta.label} photo`)
                  : (vi ? `Chưa có ảnh ${providerMeta.label}` : `No ${providerMeta.label} photo`)}
              </ProfileActionButton>
              <ProfileActionButton active={avatarCustomized && isDataImage(avatarPreview)} onClick={() => fileInputRef.current?.click()} accent="#9c6fff">
                🖼️ {vi ? 'Upload ảnh từ máy' : 'Upload from device'}
              </ProfileActionButton>
              <ProfileActionButton active={cameraActive} onClick={cameraActive ? stopCamera : startCamera} accent="#00b8cc">
                📷 {cameraActive ? (vi ? 'Tắt camera' : 'Stop camera') : (vi ? 'Chụp bằng camera' : 'Take camera photo')}
              </ProfileActionButton>
              <ProfileActionButton active={avatarCustomized && !isDataImage(avatarPreview) && !providerAvatar} onClick={useGeneratedAvatar} accent="#6b3fd4">
                ✨ {vi ? 'Tạo avatar chữ cái' : 'Generate initials avatar'}
              </ProfileActionButton>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />

            {cameraActive && (
              <div style={{ marginTop: 14, border: `1px solid ${border}`, borderRadius: 16, padding: 10, background: isDark ? '#070b18' : '#fff' }}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ display: 'block', width: '100%', background: '#000', transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                  {cameraOverlayOn && <ProfileCameraOverlayBadge label="AI Profile Scan" timestamp={profileCameraTimestamp(lang, cameraNow)} />}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <button type="button" onClick={switchCamera} style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${border}`, cursor: 'pointer', color: text, fontWeight: 800, background: surface2, fontFamily: 'inherit' }}>🔄 {vi ? 'Đổi camera' : 'Switch camera'}</button>
                  <button type="button" onClick={() => setCameraOverlayOn(v => !v)} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(0,229,255,0.32)', cursor: 'pointer', color: cameraOverlayOn ? '#00b8cc' : text2, fontWeight: 800, background: cameraOverlayOn ? 'rgba(0,229,255,0.10)' : surface2, fontFamily: 'inherit' }}>▣ {vi ? 'Lớp phủ' : 'Overlay'}</button>
                </div>
                <button
                  type="button"
                  onClick={captureCamera}
                  style={{ marginTop: 10, width: '100%', padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 800, background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', fontFamily: 'inherit' }}
                >
                  📸 {vi ? 'Chụp và dùng ảnh này' : 'Capture and use photo'}
                </button>
              </div>
            )}
            {cameraError && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,82,82,0.28)', background: 'rgba(255,82,82,0.08)', color: '#ff5252', fontSize: 12, lineHeight: 1.5 }}>
                {cameraError}
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${border}`, borderRadius: 20, padding: 22, background: surface2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, color: providerMeta.color, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                  {vi ? 'Thông tin hiển thị' : 'Display information'}
                </div>
                <div style={{ fontSize: 12, color: text3, marginTop: 5 }}>
                  {vi ? 'Tên ở đây sẽ đồng bộ vào Patient chính trong Family Medical Tree.' : 'This name syncs to the primary Patient in Family Medical Tree.'}
                </div>
              </div>
              <div style={{ padding: '7px 10px', borderRadius: 999, background: providerMeta.soft, border: `1px solid ${providerMeta.border}`, color: provider === 'apple' && !isDark ? '#111' : providerMeta.color, fontSize: 11, fontWeight: 800 }}>
                {user?.email_verified ? (vi ? '✓ Email đã xác thực' : '✓ Verified email') : (vi ? 'Email nội bộ' : 'Local email')}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: text3, fontWeight: 700 }}>
                {t('name')}
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle(border, surface, text)} placeholder={vi ? 'Nguyễn Văn A' : 'John Doe'} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: text3, fontWeight: 700 }}>
                {vi ? 'Vai trò / chuyên khoa' : 'Role / specialty'}
                <input value={specialty} onChange={e => setSpecialty(e.target.value)} style={inputStyle(border, surface, text)} placeholder={vi ? 'Bệnh nhân, Bác sĩ ung thư...' : 'Patient, Oncologist...'} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: text3, fontWeight: 700 }}>
                {vi ? 'Số điện thoại' : 'Phone'}
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={inputStyle(border, surface, text)} placeholder="+84 xxx xxx xxx" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: text3, fontWeight: 700 }}>
                {vi ? 'Nhà cung cấp đăng nhập' : 'Sign-in provider'}
                <input value={`${providerMeta.label} · ${user?.email || ''}`} disabled style={{ ...inputStyle(border, surface, text), opacity: 0.72, cursor: 'not-allowed' }} />
              </label>
            </div>

            <div style={{ marginTop: 18, padding: '13px 14px', borderRadius: 14, background: isDark ? 'rgba(0,184,204,0.08)' : 'rgba(0,184,204,0.06)', border: '1px solid rgba(0,184,204,0.22)', color: text2, fontSize: 12, lineHeight: 1.65 }}>
              ℹ️ {vi
                ? 'Bạn có thể lấy lại ảnh đại diện từ Google/Apple bất cứ lúc nào, hoặc dùng ảnh upload/camera để tùy chỉnh riêng. Khi lưu, Sidebar và Patient chính sẽ cập nhật theo.'
                : 'You can restore the Google/Apple account avatar anytime, or customize with device upload/camera. Saving updates the Sidebar and primary Patient.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
              {saved && <span style={{ color: '#00e676', fontSize: 12, fontWeight: 800 }}>{vi ? 'Đã lưu hồ sơ' : 'Profile saved'}</span>}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                style={{
                  padding: '12px 22px', borderRadius: 12, border: 'none', cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', color: '#fff', fontSize: 14, fontWeight: 900,
                  opacity: saving || !name.trim() ? 0.58 : 1, fontFamily: 'inherit', boxShadow: '0 12px 30px rgba(0,184,204,0.22)',
                }}
              >
                {saving ? '...' : t('saveProfile')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .animate-fade > div > div:nth-child(2) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function inputStyle(border, background, color) {
  return {
    width: '100%', padding: '12px 13px', borderRadius: 12, border: `1px solid ${border}`,
    background, color, outline: 'none', boxSizing: 'border-box', fontSize: 14, fontFamily: 'inherit',
  }
}
