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

function AppleIcon({ isDark }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={isDark ? '#fff' : '#000'} aria-hidden="true">
      <path d="M12.52 9.12a3.8 3.8 0 011.82-3.2 3.9 3.9 0 00-3.08-1.66c-1.3-.14-2.56.77-3.22.77-.67 0-1.69-.75-2.78-.73A4.1 4.1 0 001.8 6.56c-1.5 2.6-.38 6.43 1.06 8.53.72 1.03 1.56 2.18 2.66 2.14 1.08-.04 1.49-.69 2.79-.69 1.3 0 1.67.69 2.8.67 1.15-.02 1.88-1.03 2.58-2.07a8.56 8.56 0 001.17-2.4 3.68 3.68 0 01-2.34-3.62zM10.48 3.12A3.75 3.75 0 0011.42.5a3.8 3.8 0 00-2.46 1.27 3.56 3.56 0 00-.88 2.57 3.14 3.14 0 002.4-1.22z"/>
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
  const { user, updateProfile, loginWithGoogle, loginWithApple, linkProvider, unlinkProvider, logout, deleteAccount } = useAuth()
  const { theme, lang, t } = useApp()
  const isDark = theme === 'dark'
  const vi = lang === 'vi'

  // If anonymous user, show anonymous profile view
  if (user?.isAnonymous) {
    return <AnonymousProfilePanel user={user} isDark={isDark} vi={vi} lang={lang} t={t} loginWithGoogle={loginWithGoogle} loginWithApple={loginWithApple} updateProfile={updateProfile} deleteAccount={deleteAccount} />
  }

  // ─── Real user profile ───────────────────────────────────────────────────
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
  const [linkingProvider, setLinkingProvider] = useState(null)
  const [linkError, setLinkError] = useState('')
  const [copiedUUID, setCopiedUUID] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

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
  useEffect(() => { if (!cameraActive) return; setCameraNow(new Date()); const t = setInterval(() => setCameraNow(new Date()), 1000); return () => clearInterval(t) }, [cameraActive])

  const stopCamera = () => { streamRef.current?.getTracks?.().forEach(t => t.stop()); streamRef.current = null; setCameraActive(false) }
  const useAccountAvatar = () => { if (!providerAvatar) return; setAvatarPreview(providerAvatar); setAvatarCustomized(false); setCameraError('') }
  const useGeneratedAvatar = () => { setAvatarPreview(initialsAvatar(name || user?.name)); setAvatarCustomized(true); setCameraError('') }

  const handleFile = (file) => {
    if (!file?.type?.startsWith('image/')) { setCameraError(vi ? 'Vui lòng chọn file hình ảnh.' : 'Please choose an image file.'); return }
    const reader = new FileReader()
    reader.onload = () => { setAvatarPreview(reader.result); setAvatarCustomized(true); setCameraError(''); stopCamera() }
    reader.readAsDataURL(file)
  }

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch (e) { setCameraError(vi ? `Không thể truy cập camera: ${e.message}` : `Cannot access camera: ${e.message}`) }
  }

  const switchCamera = async () => {
    stopCamera()
    const next = cameraFacingMode === 'user' ? 'environment' : 'user'
    setCameraFacingMode(next)
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: false })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCameraActive(true)
      } catch (e) { setCameraError(vi ? `Không thể đổi camera: ${e.message}` : `Cannot switch camera: ${e.message}`) }
    }, 200)
  }

  const captureCamera = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (cameraFacingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (cameraFacingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (cameraOverlayOn) drawProfileCameraOverlay(ctx, canvas.width, canvas.height, 'AI Profile Scan', profileCameraTimestamp(lang, cameraNow))
    setAvatarPreview(canvas.toDataURL('image/jpeg', 0.9)); setAvatarCustomized(true); setCameraError(''); stopCamera()
  }

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    await new Promise(r => setTimeout(r, 250))
    updateProfile({ name: name.trim() || user?.name, specialty: specialty.trim(), phone: phone.trim(), avatar: avatarPreview || initialsAvatar(name || user?.name), avatarCustomized })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1800)
  }

  const linkedProviders = user?.linkedProviders || [user?.provider]

  const copyUUIDReal = () => {
    navigator.clipboard?.writeText(user?.uuid).then(() => { setCopiedUUID(true); setTimeout(() => setCopiedUUID(false), 1800) }).catch(() => {})
  }

  return (
    <div className="animate-fade" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, color: text }}>
      <div style={{ borderRadius: 24, overflow: 'hidden', border: `1px solid ${border}`, background: surface, boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.35)' : '0 24px 70px rgba(35,45,80,0.08)' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', background: providerMeta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', fontFamily: 'var(--font-mono)' }}>{vi ? 'Tài khoản cá nhân' : 'User account'}</div>
            <h2 style={{ margin: '6px 0 4px', fontSize: 28, fontWeight: 900, color: '#fff' }}>{t('profile')}</h2>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>{vi ? `Đồng bộ hồ sơ từ ${providerMeta.label}, tùy chỉnh avatar và thông tin hiển thị.` : `Sync from ${providerMeta.label}, customize your avatar and display information.`}</div>
            {user?.upgradedFromUUID && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                {vi ? 'Nâng cấp từ:' : 'Upgraded from:'} {user.upgradedFromUUID}
              </div>
            )}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontWeight: 800 }}>
            <ProviderBadge provider={provider} />
            <span>{providerMeta.label}</span>
          </div>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 22 }}>
          {/* Avatar column */}
          <div style={{ border: `1px solid ${border}`, borderRadius: 20, padding: 20, background: surface2 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 154, height: 154, margin: '0 auto 14px' }}>
                <img src={avatarPreview || initialsAvatar(name)} alt={vi ? 'Ảnh đại diện' : 'Avatar'} style={{ width: 154, height: 154, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${providerMeta.border}`, boxShadow: `0 16px 45px ${providerMeta.border}` }} />
                <div style={{ position: 'absolute', right: 8, bottom: 8, width: 38, height: 38, borderRadius: '50%', background: provider === 'apple' ? '#111' : '#fff', border: `3px solid ${surface2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                  <ProviderBadge provider={provider} />
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>{name || user?.name}</div>
              <div style={{ fontSize: 12, color: text3, marginBottom: 16 }}>{user?.email}</div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <ProfileActionButton active={!avatarCustomized && !!providerAvatar} disabled={!providerAvatar} onClick={useAccountAvatar} accent={provider === 'google' ? '#4285F4' : '#111'}>
                <ProviderBadge provider={provider} />
                {providerAvatar ? (vi ? `Dùng ảnh ${providerMeta.label}` : `Use ${providerMeta.label} photo`) : (vi ? `Chưa có ảnh ${providerMeta.label}` : `No ${providerMeta.label} photo`)}
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
                <button type="button" onClick={captureCamera} style={{ marginTop: 10, width: '100%', padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 800, background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', fontFamily: 'inherit' }}>
                  📸 {vi ? 'Chụp và dùng ảnh này' : 'Capture and use photo'}
                </button>
              </div>
            )}
            {cameraError && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,82,82,0.28)', background: 'rgba(255,82,82,0.08)', color: '#ff5252', fontSize: 12, lineHeight: 1.5 }}>{cameraError}</div>}

            {/* UUID box */}
            {user?.uuid && (
              <div style={{ border: `1px solid ${providerMeta.border}`, borderRadius: 16, padding: 16, background: isDark ? `${providerMeta.soft}` : `${providerMeta.soft}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: providerMeta.color, marginBottom: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  {vi ? 'Mã tài khoản (UUID)' : 'Account ID (UUID)'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: isDark ? '#c0d8ff' : providerMeta.color, wordBreak: 'break-all', flex: 1, lineHeight: 1.5 }}>
                    {user.uuid}
                  </code>
                  <button onClick={copyUUIDReal} style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${providerMeta.border}`, background: 'none', cursor: 'pointer', color: copiedUUID ? '#00e676' : providerMeta.color, fontSize: 13, flexShrink: 0 }}>
                    {copiedUUID ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            )}

            {/* Level progress bar — only show when level data exists */}
            {(user?.level !== undefined && user?.level !== null && user?.journeyProgress !== undefined && user?.journeyProgress !== null) && (
              <div style={{ border: `1px solid ${border}`, borderRadius: 14, padding: 14, background: surface2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: text2 }}>🌱 {vi ? 'Cấp độ' : 'Level'} {user.level}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: providerMeta.color }}>{user.journeyProgress}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : '#e8f0fb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${user.journeyProgress}%`, borderRadius: 4, background: providerMeta.gradient, transition: 'width 0.5s ease' }} />
                </div>
                {user?.achievements != null && (
                  <div style={{ marginTop: 10, fontSize: 11, color: text3 }}>⭐ {vi ? `${user.achievements} huy hiệu đạt được` : `${user.achievements} achievements earned`}</div>
                )}
              </div>
            )}
          </div>

          {/* Info column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ border: `1px solid ${border}`, borderRadius: 20, padding: 22, background: surface2 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 11, color: providerMeta.color, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{vi ? 'Thông tin hiển thị' : 'Display information'}</div>
                  <div style={{ fontSize: 12, color: text3, marginTop: 5 }}>{vi ? 'Tên ở đây sẽ đồng bộ vào Patient chính trong Family Medical Tree.' : 'This name syncs to the primary Patient in Family Medical Tree.'}</div>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
                {saved && <span style={{ color: '#00e676', fontSize: 12, fontWeight: 800 }}>{vi ? 'Đã lưu hồ sơ' : 'Profile saved'}</span>}
                <button type="button" onClick={handleSave} disabled={saving || !name.trim()} style={{ padding: '12px 22px', borderRadius: 12, border: 'none', cursor: saving || !name.trim() ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', color: '#fff', fontSize: 14, fontWeight: 900, opacity: saving || !name.trim() ? 0.58 : 1, fontFamily: 'inherit', boxShadow: '0 12px 30px rgba(0,184,204,0.22)' }}>
                  {saving ? '...' : t('saveProfile')}
                </button>
              </div>
            </div>

            {/* Linked Accounts section */}
            <div style={{ border: `1px solid ${border}`, borderRadius: 20, padding: 22, background: surface2 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 14 }}>{vi ? 'Tài khoản liên kết' : 'Linked Accounts'}</div>
              <div style={{ fontSize: 12, color: text3, marginBottom: 14 }}>{vi ? 'Bạn có thể liên kết nhiều tài khoản. Tài khoản chính sẽ được dùng để đăng nhập.' : 'You can link multiple accounts, but one main account will be used to login.'}</div>
              {linkError && <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,82,82,0.28)', background: 'rgba(255,82,82,0.08)', color: '#ff5252', fontSize: 12, lineHeight: 1.5 }}>{linkError}</div>}
              {['google', 'apple'].map(p => {
                const isLinked = linkedProviders.includes(p)
                const meta = PROVIDER_META[p]
                return (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.soft, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ProviderBadge provider={p} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: text }}>{meta.label}</span>
                    </div>
                    {isLinked ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#00e676', fontSize: 12, fontWeight: 700 }}>{vi ? 'Đã kết nối ✓' : 'Connected ✓'}</span>
                        {linkedProviders.length > 1 && (
                          <button onClick={() => unlinkProvider(p)} style={{ background: 'none', border: '1px solid rgba(255,82,82,0.35)', color: '#ff5252', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                            {vi ? 'Ngắt' : 'Unlink'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => {
                        setLinkingProvider(p); setLinkError('')
                        linkProvider(p).catch(e => setLinkError(e?.message || (vi ? 'Liên kết thất bại.' : 'Linking failed.'))).finally(() => setLinkingProvider(null))
                      }} disabled={linkingProvider === p} style={{ background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: linkingProvider === p ? 0.6 : 1 }}>
                        {linkingProvider === p ? '...' : (vi ? 'Kết nối' : 'Connect')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Danger Zone — permanently delete account (everyone except Admin) */}
            {!user?.isAdmin && (
              <div style={{ border: '1px solid rgba(255,82,82,0.3)', borderRadius: 20, padding: 22, background: isDark ? 'rgba(255,82,82,0.05)' : 'rgba(255,82,82,0.03)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ff5252', marginBottom: 8 }}>{vi ? '⚠️ Khu vực nguy hiểm' : '⚠️ Danger Zone'}</div>
                <div style={{ fontSize: 12, color: text3, marginBottom: 14, lineHeight: 1.6 }}>
                  {vi ? 'Xoá tài khoản sẽ xoá vĩnh viễn hồ sơ, dữ liệu gia phả và hồ sơ bệnh án liên quan. Hành động này không thể hoàn tác.' : 'Deleting your account permanently removes your profile, family tree data, and related medical records. This action cannot be undone.'}
                </div>
                <button type="button" onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true) }} style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(255,82,82,0.4)', background: 'rgba(255,82,82,0.1)', color: '#ff5252', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑️ {vi ? 'Xoá tài khoản vĩnh viễn' : 'Delete account permanently'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          isDark={isDark} vi={vi} border={border} text={text} text2={text2} text3={text3} surface2={surface2}
          confirmWord={vi ? 'XOÁ' : 'DELETE'}
          confirmText={deleteConfirmText} setConfirmText={setDeleteConfirmText}
          deleting={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => {
            setDeleting(true)
            try {
              deleteAccount()
              setShowDeleteModal(false)
            } catch (e) {
              console.error(e)
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}
      <style>{`@media (max-width: 900px) { .animate-fade > div > div:nth-child(2) { grid-template-columns: 1fr !important; } }`}</style>
      {/* Profile banner image */}
      <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${border}` }}>
        <img
          src="/src/pages/AnonymousProfileUUID-Avatar-1080x720.png"
          alt="Anonymous Profile UUID Avatar"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>
    </div>
  )
}

// ─── Anonymous Profile Panel ────────────────────────────────────────────────────
function AnonymousProfilePanel({ user, isDark, vi, lang, t, loginWithGoogle, loginWithApple, updateProfile, deleteAccount }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeProvider, setUpgradeProvider] = useState(null)
  const [upgradeStep, setUpgradeStep] = useState('confirm') // 'confirm' | 'success'
  const [upgrading, setUpgrading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ── Editable profile fields (same shape as a real account, so the guest can
  // fill them in gradually before/without ever upgrading) ──────────────────
  const [name, setName] = useState(user?.name || '')
  const [specialty, setSpecialty] = useState(user?.specialty || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || initialsAvatar(user?.name))
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
  useEffect(() => { if (!cameraActive) return; setCameraNow(new Date()); const t = setInterval(() => setCameraNow(new Date()), 1000); return () => clearInterval(t) }, [cameraActive])

  const stopCamera = () => { streamRef.current?.getTracks?.().forEach(t => t.stop()); streamRef.current = null; setCameraActive(false) }
  const useGeneratedAvatar = () => { setAvatarPreview(initialsAvatar(name || user?.name)); setAvatarCustomized(true); setCameraError('') }

  const handleFile = (file) => {
    if (!file?.type?.startsWith('image/')) { setCameraError(vi ? 'Vui lòng chọn file hình ảnh.' : 'Please choose an image file.'); return }
    const reader = new FileReader()
    reader.onload = () => { setAvatarPreview(reader.result); setAvatarCustomized(true); setCameraError(''); stopCamera() }
    reader.readAsDataURL(file)
  }

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch (e) { setCameraError(vi ? `Không thể truy cập camera: ${e.message}` : `Cannot access camera: ${e.message}`) }
  }

  const switchCamera = async () => {
    stopCamera()
    const next = cameraFacingMode === 'user' ? 'environment' : 'user'
    setCameraFacingMode(next)
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: false })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCameraActive(true)
      } catch (e) { setCameraError(vi ? `Không thể đổi camera: ${e.message}` : `Cannot switch camera: ${e.message}`) }
    }, 200)
  }

  const captureCamera = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (cameraFacingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (cameraFacingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (cameraOverlayOn) drawProfileCameraOverlay(ctx, canvas.width, canvas.height, 'AI Profile Scan', profileCameraTimestamp(lang, cameraNow))
    setAvatarPreview(canvas.toDataURL('image/jpeg', 0.9)); setAvatarCustomized(true); setCameraError(''); stopCamera()
  }

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    await new Promise(r => setTimeout(r, 250))
    updateProfile({ name: name.trim() || user?.name, specialty: specialty.trim(), phone: phone.trim(), avatar: avatarPreview || initialsAvatar(name || user?.name), avatarCustomized })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1800)
  }

  const copyUUID = () => {
    navigator.clipboard?.writeText(user.uuid).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  const handleUpgrade = async (provider) => {
    setUpgrading(true)
    try {
      if (provider === 'google') await loginWithGoogle()
      else await loginWithApple()
      setUpgradeStep('success')
    } catch (e) {
      console.error(e)
    } finally {
      setUpgrading(false)
    }
  }

  const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(vi ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const createdTime = user.createdAt ? new Date(user.createdAt).toLocaleTimeString(vi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="animate-fade" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, color: text }}>
      {/* Single unified Guest Profile card: identity, editable info, UUID, and upgrade — all in one place */}
      <div style={{ borderRadius: 24, overflow: 'hidden', border: `1px solid ${border}`, background: surface, boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.35)' : '0 24px 70px rgba(35,45,80,0.08)' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg,#1a6640,#2d8a5e,#00b8cc)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>
              {vi ? 'Hồ sơ ẩn danh (Khách)' : 'Anonymous Profile (Guest)'}
            </div>
            <h2 style={{ margin: '6px 0 4px', fontSize: 26, fontWeight: 900, color: '#fff' }}>{name || user.name}</h2>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>
              {vi ? 'Bạn có thể cập nhật thông tin này dần và tiến trình được lưu trên thiết bị này.' : 'You can fill this in gradually — your progress is saved on this device.'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>Lv.{user.level}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{vi ? 'Cấp độ' : 'Level'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{user.journeyProgress}%</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{vi ? 'Tiến trình' : 'Journey'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{user.achievements}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{vi ? 'Huy hiệu' : 'Badges'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: 22 }}>
          {/* Left column: avatar + UUID + level progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ border: `1px solid ${border}`, borderRadius: 20, padding: 20, background: surface2 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 14px' }}>
                  <img src={avatarPreview || initialsAvatar(name || user.name)} alt={vi ? 'Ảnh đại diện' : 'Avatar'} style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '4px solid rgba(45,138,94,0.5)', boxShadow: '0 16px 45px rgba(45,138,94,0.35)' }} />
                  <div style={{ position: 'absolute', right: 6, bottom: 6, width: 34, height: 34, borderRadius: '50%', background: '#fff', border: `3px solid ${surface2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', fontSize: 15 }}>
                    🌿
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>{name || user.name}</div>
                <div style={{ fontSize: 11, color: text3, marginBottom: 16 }}>{vi ? 'Khách (chưa đăng nhập)' : 'Guest (not signed in)'}</div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <ProfileActionButton active={avatarCustomized && isDataImage(avatarPreview)} onClick={() => fileInputRef.current?.click()} accent="#9c6fff">
                  🖼️ {vi ? 'Upload ảnh từ máy' : 'Upload from device'}
                </ProfileActionButton>
                <ProfileActionButton active={cameraActive} onClick={cameraActive ? stopCamera : startCamera} accent="#00b8cc">
                  📷 {cameraActive ? (vi ? 'Tắt camera' : 'Stop camera') : (vi ? 'Chụp bằng camera' : 'Take camera photo')}
                </ProfileActionButton>
                <ProfileActionButton active={avatarCustomized && !isDataImage(avatarPreview)} onClick={useGeneratedAvatar} accent="#2d8a5e">
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
                  <button type="button" onClick={captureCamera} style={{ marginTop: 10, width: '100%', padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 800, background: 'linear-gradient(135deg,#2d8a5e,#00b8cc)', fontFamily: 'inherit' }}>
                    📸 {vi ? 'Chụp và dùng ảnh này' : 'Capture and use photo'}
                  </button>
                </div>
              )}
              {cameraError && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,82,82,0.28)', background: 'rgba(255,82,82,0.08)', color: '#ff5252', fontSize: 12, lineHeight: 1.5 }}>{cameraError}</div>}
            </div>

            {/* UUID box */}
            <div style={{ border: `1px solid rgba(45,138,94,0.35)`, borderRadius: 16, padding: 16, background: isDark ? 'rgba(45,138,94,0.08)' : 'rgba(45,138,94,0.05)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2d8a5e', marginBottom: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                {vi ? 'Mã ẩn danh (UUID)' : 'Anonymous ID (UUID)'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: isDark ? '#5ef5a0' : '#1a6640', wordBreak: 'break-all', flex: 1, lineHeight: 1.5 }}>
                  {user.uuid}
                </code>
                <button onClick={copyUUID} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(45,138,94,0.4)', background: 'none', cursor: 'pointer', color: copied ? '#00e676' : '#2d8a5e', fontSize: 13, flexShrink: 0 }}>
                  {copied ? '✓' : '📋'}
                </button>
              </div>
              <div style={{ fontSize: 10, color: text3, marginTop: 8 }}>
                {vi ? `Tạo lúc: ${createdDate} • ${createdTime}` : `Created: ${createdDate} • ${createdTime}`}
              </div>
            </div>

            {/* Level progress bar */}
            <div style={{ border: `1px solid ${border}`, borderRadius: 14, padding: 14, background: surface2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: text2 }}>🌱 {vi ? 'Cấp độ' : 'Level'} {user.level}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2d8a5e' }}>{user.journeyProgress}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : '#e8f5e9', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${user.journeyProgress}%`, borderRadius: 4, background: 'linear-gradient(90deg,#2d8a5e,#00b8cc)', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: text3 }}>⭐ {vi ? `${user.achievements} huy hiệu đạt được` : `${user.achievements} achievements earned`}</div>
            </div>
          </div>

          {/* Right column: editable display info + upgrade section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Display information form */}
            <div style={{ border: `1px solid ${border}`, borderRadius: 20, padding: 22, background: surface2 }}>
              <div style={{ fontSize: 11, color: '#2d8a5e', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 800, marginBottom: 18 }}>{vi ? 'Thông tin hiển thị' : 'Display information'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: text3, fontWeight: 700 }}>
                  {t ? t('name') : (vi ? 'Tên' : 'Name')}
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
                  <input value={vi ? 'Khách — chưa liên kết tài khoản' : 'Guest — no linked account'} disabled style={{ ...inputStyle(border, surface, text), opacity: 0.72, cursor: 'not-allowed' }} />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
                {saved && <span style={{ color: '#00e676', fontSize: 12, fontWeight: 800 }}>{vi ? 'Đã lưu hồ sơ' : 'Profile saved'}</span>}
                <button type="button" onClick={handleSave} disabled={saving || !name.trim()} style={{ padding: '12px 22px', borderRadius: 12, border: 'none', cursor: saving || !name.trim() ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#2d8a5e,#00b8cc)', color: '#fff', fontSize: 14, fontWeight: 900, opacity: saving || !name.trim() ? 0.58 : 1, fontFamily: 'inherit', boxShadow: '0 12px 30px rgba(45,138,94,0.22)' }}>
                  {saving ? '...' : (t ? t('saveProfile') : (vi ? 'Lưu hồ sơ' : 'Save profile'))}
                </button>
              </div>
            </div>

            {/* Upgrade CTA */}
            <div style={{ border: '2px solid rgba(45,138,94,0.4)', borderRadius: 20, padding: 22, background: isDark ? 'rgba(45,138,94,0.08)' : 'rgba(45,138,94,0.04)' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: text, marginBottom: 6 }}>
                {vi ? '🔗 Nâng cấp lên Tài khoản Thật' : '🔗 Upgrade to Real Account'}
              </div>
              <div style={{ fontSize: 13, color: text2, marginBottom: 16, lineHeight: 1.6 }}>
                {vi ? 'Kết nối tài khoản thật để giữ tiến trình an toàn trên mọi thiết bị.' : 'Connect a real account to keep your progress safe across devices.'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => { setUpgradeProvider('google'); setUpgradeStep('confirm'); setShowUpgradeModal(true) }} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer', border: '1px solid rgba(66,133,244,0.3)', background: isDark ? 'rgba(66,133,244,0.1)' : '#fff', color: isDark ? '#e8f0f8' : '#1a2035', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
                  <GoogleIcon /> {vi ? 'Kết nối Google' : 'Connect Google'}
                </button>
                <button onClick={() => { setUpgradeProvider('apple'); setUpgradeStep('confirm'); setShowUpgradeModal(true) }} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer', border: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', color: isDark ? '#e8f0f8' : '#1a2035', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
                  <AppleIcon isDark={isDark} /> {vi ? 'Kết nối Apple' : 'Connect Apple'}
                </button>
              </div>
            </div>

            {/* Benefits + storage info, side by side on wide screens */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              <div style={{ border: `1px solid ${border}`, borderRadius: 16, padding: 18, background: surface2 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 12 }}>{vi ? '✨ Lợi ích khi nâng cấp' : '✨ Benefits of upgrading'}</div>
                {[
                  vi ? '✅ Tiến trình không bị mất' : '✅ Progress will NOT be lost',
                  vi ? '✅ Tất cả dữ liệu được bảo toàn an toàn' : '✅ All your data will be safely preserved',
                  vi ? '✅ Tiếp tục trên mọi thiết bị' : '✅ You can continue on any device',
                ].map((b, i) => (
                  <div key={i} style={{ fontSize: 13, color: text2, marginBottom: 8, lineHeight: 1.5 }}>{b}</div>
                ))}
              </div>

              <div style={{ border: `1px solid ${border}`, borderRadius: 14, padding: 14, background: surface2, fontSize: 12, color: text3, lineHeight: 1.7 }}>
                💾 {vi
                  ? 'Thông tin và UUID của bạn được lưu trên thiết bị này (IndexedDB). Khi nâng cấp lên tài khoản thật, tất cả sẽ được giữ lại — chỉ liên kết với tài khoản của bạn.'
                  : 'Your info and UUID are saved on this device (IndexedDB). When you upgrade to a real account, everything carries over — we only connect it to your account.'}
              </div>
            </div>

            {/* Danger Zone — permanently delete guest data (everyone except Admin) */}
            <div style={{ border: '1px solid rgba(255,82,82,0.3)', borderRadius: 20, padding: 22, background: isDark ? 'rgba(255,82,82,0.05)' : 'rgba(255,82,82,0.03)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ff5252', marginBottom: 8 }}>{vi ? '⚠️ Khu vực nguy hiểm' : '⚠️ Danger Zone'}</div>
              <div style={{ fontSize: 12, color: text3, marginBottom: 14, lineHeight: 1.6 }}>
                {vi ? 'Xoá sẽ xoá vĩnh viễn hồ sơ khách và toàn bộ tiến trình đã lưu trên thiết bị này. Hành động này không thể hoàn tác.' : 'Deleting permanently removes your guest profile and all progress saved on this device. This action cannot be undone.'}
              </div>
              <button type="button" onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true) }} style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(255,82,82,0.4)', background: 'rgba(255,82,82,0.1)', color: '#ff5252', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑️ {vi ? 'Xoá tài khoản vĩnh viễn' : 'Delete account permanently'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          isDark={isDark} vi={vi} border={border} text={text} text2={text2} text3={text3} surface2={surface2}
          confirmWord={vi ? 'XOÁ' : 'DELETE'}
          confirmText={deleteConfirmText} setConfirmText={setDeleteConfirmText}
          deleting={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => {
            setDeleting(true)
            try {
              deleteAccount()
              setShowDeleteModal(false)
            } catch (e) {
              console.error(e)
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: 400, margin: 24, background: isDark ? '#0c1220' : '#fff', borderRadius: 24, padding: 32, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${border}`, position: 'relative' }}>
            {upgradeStep === 'confirm' ? (
              <>
                <button onClick={() => setShowUpgradeModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: text3 }}>✕</button>
                {/* Shield icon */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 52, marginBottom: 8 }}>🛡️</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: text }}>{vi ? 'Nâng cấp Hồ sơ Guest' : 'Upgrade Guest Profile'}</div>
                  <div style={{ fontSize: 13, color: text2, marginTop: 6 }}>{vi ? 'Bạn sắp kết nối hồ sơ guest với:' : 'You are about to connect your guest profile to:'}</div>
                </div>
                {/* Provider target */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, border: `1px solid ${border}`, background: surface2, marginBottom: 20 }}>
                  {upgradeProvider === 'google' ? <GoogleIcon /> : <AppleIcon isDark={isDark} />}
                  <span style={{ fontSize: 14, fontWeight: 700, color: text }}>
                    {upgradeProvider === 'google'
                      ? (vi ? 'Chọn tài khoản Google của bạn' : 'Choose your Google Account')
                      : (vi ? 'Tài khoản Apple của bạn' : 'Your Apple Account')}
                  </span>
                </div>
                {/* Benefits */}
                <div style={{ marginBottom: 20 }}>
                  {[
                    vi ? '✅ Tiến trình KHÔNG bị mất' : '✅ Your progress will NOT be lost',
                    vi ? '✅ Tất cả dữ liệu được bảo toàn an toàn' : '✅ All your data will be safely preserved',
                    vi ? '✅ Tiếp tục trên mọi thiết bị' : '✅ You can continue on any device',
                  ].map((b, i) => <div key={i} style={{ fontSize: 13, color: text2, marginBottom: 6 }}>{b}</div>)}
                </div>
                {/* Flow viz */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 14, borderRadius: 14, border: `1px solid ${border}`, background: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc', marginBottom: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#2d8a5e,#00b8cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', fontSize: 20 }}>🌿</div>
                    <div style={{ fontSize: 10, color: text3, maxWidth: 80 }}>{vi ? 'Hồ sơ Guest' : 'Guest Profile'}</div>
                    <div style={{ fontSize: 9, fontFamily: 'monospace', color: text3, marginTop: 2 }}>{user.uuid?.substring(0, 20)}…</div>
                  </div>
                  <div style={{ fontSize: 20, color: text3 }}>→</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: upgradeProvider === 'google' ? '#4285F4' : '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                      {upgradeProvider === 'google' ? <GoogleIcon /> : <AppleIcon isDark />}
                    </div>
                    <div style={{ fontSize: 10, color: text3 }}>{upgradeProvider === 'google' ? 'Google Account' : 'Apple Account'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowUpgradeModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${border}`, background: 'none', color: text2, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {vi ? 'Huỷ' : 'Cancel'}
                  </button>
                  <button onClick={() => handleUpgrade(upgradeProvider)} disabled={upgrading} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#2d8a5e,#00b8cc)', color: '#fff', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', opacity: upgrading ? 0.7 : 1 }}>
                    {upgrading ? '...' : (vi ? 'Xác nhận' : 'Confirm')}
                  </button>
                </div>
              </>
            ) : (
              /* Success */
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#00e676', marginBottom: 8 }}>{vi ? 'Tài khoản đã kết nối!' : 'Account Connected!'}</div>
                <div style={{ fontSize: 13, color: text2 }}>{vi ? 'Hồ sơ guest của bạn đã được kết nối thành công.' : 'Your guest profile has been successfully connected.'}</div>
                <button onClick={() => setShowUpgradeModal(false)} style={{ marginTop: 24, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#2d8a5e,#00b8cc)', color: '#fff', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>
                  {vi ? 'Tiếp tục chơi' : 'Continue to Game'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Profile banner image */}
      <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${border}` }}>
        <img
          src="/src/pages/AnonymousProfileUUID-Avatar-1080x720.png"
          alt="Anonymous Profile UUID Avatar"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>
    </div>
  )
}



function inputStyle(border, background, color) {
  return { width: "100%", padding: "12px 13px", borderRadius: 12, border: `1px solid ${border}`, background, color, outline: "none", boxSizing: "border-box", fontSize: 14, fontFamily: "inherit" }
}

// ─── Shared "permanently delete account" confirmation modal ───────────────────
// Requires the person to type a confirm word before the button activates, so the
// destructive action can't be triggered by an accidental click.
function DeleteAccountModal({ isDark, vi, border, text, text2, text3, surface2, confirmWord, confirmText, setConfirmText, deleting, onCancel, onConfirm }) {
  const canConfirm = confirmText.trim().toUpperCase() === confirmWord && !deleting
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 420, margin: 24, background: isDark ? '#0c1220' : '#fff', borderRadius: 24, padding: 32, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,82,82,0.3)', position: 'relative' }}>
        <button onClick={onCancel} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: text3 }}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🗑️</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: text }}>{vi ? 'Xoá tài khoản vĩnh viễn?' : 'Permanently delete account?'}</div>
          <div style={{ fontSize: 13, color: text2, marginTop: 6, lineHeight: 1.6 }}>
            {vi ? 'Toàn bộ hồ sơ, gia phả bệnh lý và hồ sơ bệnh án liên quan sẽ bị xoá vĩnh viễn. Không thể hoàn tác.' : 'Your profile, family tree, and related medical records will be permanently deleted. This cannot be undone.'}
          </div>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: text3, fontWeight: 700, marginBottom: 20 }}>
          {vi ? `Nhập "${confirmWord}" để xác nhận` : `Type "${confirmWord}" to confirm`}
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            style={inputStyle(border, surface2, text)}
            placeholder={confirmWord}
            autoFocus
          />
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${border}`, background: 'none', color: text2, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {vi ? 'Huỷ' : 'Cancel'}
          </button>
          <button onClick={onConfirm} disabled={!canConfirm} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#ff5252', color: '#fff', fontWeight: 900, cursor: canConfirm ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: canConfirm ? 1 : 0.5 }}>
            {deleting ? '...' : (vi ? 'Xoá vĩnh viễn' : 'Delete permanently')}
          </button>
        </div>
      </div>
    </div>
  )
}
