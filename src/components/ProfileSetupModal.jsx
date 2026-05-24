import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

/**
 * ProfileSetupModal — shown right after first Google/Apple/Email login.
 * Pre-fills name & avatar from the OAuth profile. User can tweak then save.
 */
export default function ProfileSetupModal() {
  const { user, updateProfile, dismissProfileSetup } = useAuth()
  const { t, theme, lang } = useApp()
  const isDark = theme === 'dark'

  const [name, setName] = useState(user?.name || '')
  const [specialty, setSpecialty] = useState(user?.specialty || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [useGooglePhoto, setUseGooglePhoto] = useState(true)
  const [saving, setSaving] = useState(false)

  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const bg = isDark ? '#080c1a' : '#fff'
  const text = isDark ? '#e8f0f8' : '#1a2035'
  const sub = isDark ? 'rgba(232,240,248,0.45)' : '#888'
  const inputBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'

  const isGoogle = user?.provider === 'google' || user?.provider === 'apple'
  const avatarSrc = useGooglePhoto && user?.googleAvatar
    ? user.googleAvatar
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6b3fd4&color=fff&size=128&bold=true&rounded=true`

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400)) // subtle UX pause
    updateProfile({
      name: name.trim() || user?.name,
      specialty: specialty.trim(),
      phone: phone.trim(),
      avatar: avatarSrc,
      avatarCustomized: !useGooglePhoto,
    })
    dismissProfileSetup()
    setSaving(false)
  }

  const handleSkip = () => {
    // Save current values as-is and dismiss
    updateProfile({
      name: user?.name,
      avatar: user?.avatar,
      profileComplete: true,
    })
    dismissProfileSetup()
  }

  const vi = lang === 'vi'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: bg, border: `1px solid ${border}`,
        borderRadius: 20, padding: '32px 28px',
        boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.7)' : '0 32px 80px rgba(0,0,0,0.15)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, borderRadius: 8,
            background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)',
            marginBottom: 14,
          }}>
            <span style={{ fontSize: 28 }}>👋</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: text, margin: '8px 0 6px' }}>
            {t('welcomeTitle')}
          </h2>
          <p style={{ fontSize: 13, color: sub, lineHeight: 1.6 }}>
            {t('profileCreated')}
          </p>
        </div>

        {/* Avatar section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={avatarSrc}
              alt="avatar"
              style={{ width: 72, height: 72, borderRadius: '50%', border: `3px solid #00b8cc`, objectFit: 'cover' }}
            />
            {/* Provider badge */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: user?.provider === 'google' ? '#fff' : '#1c1c1e',
              border: `2px solid ${bg}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
            }}>
              {user?.provider === 'google' ? (
                <svg width="14" height="14" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
                </svg>
              ) : user?.provider === 'apple' ? '🍎' : '✉️'}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 4 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: sub, marginBottom: 8 }}>{user?.email}</div>
            {isGoogle && user?.googleAvatar && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: sub }}>
                <input
                  type="checkbox"
                  checked={useGooglePhoto}
                  onChange={e => setUseGooglePhoto(e.target.checked)}
                  style={{ accentColor: '#00b8cc' }}
                />
                {lang === 'vi' ? `Dùng ảnh từ ${user.provider === 'google' ? 'Google' : 'Apple'}` : `Use ${user.provider} photo`}
              </label>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 5 }}>
              {t('name')}
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                border: `1px solid ${border}`, background: inputBg, color: text, outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder={lang === 'vi' ? 'Nguyễn Văn A' : 'John Doe'}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 5 }}>
              {t('specialtyRole')} <span style={{ color: sub, fontWeight: 400 }}>({t('optional')})</span>
            </label>
            <input
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                border: `1px solid ${border}`, background: inputBg, color: text, outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder={lang === 'vi' ? 'VD: Bác sĩ ung thư, Bệnh nhân...' : 'E.g.: Oncologist, Patient...'}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 5 }}>
              {t('phone')} <span style={{ color: sub, fontWeight: 400 }}>({t('optional')})</span>
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                border: `1px solid ${border}`, background: inputBg, color: text, outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="+84 xxx xxx xxx"
              type="tel"
            />
          </div>
        </div>

        {/* Info note */}
        <div style={{
          marginTop: 14, padding: '10px 14px',
          background: isDark ? 'rgba(0,184,204,0.07)' : 'rgba(0,184,204,0.06)',
          border: `1px solid rgba(0,184,204,0.2)`, borderRadius: 10,
          fontSize: 11, color: sub, lineHeight: 1.6,
        }}>
          ℹ️ {t('editAnytime')}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={handleSkip}
            style={{
              flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
              border: `1px solid ${border}`, background: 'none',
              color: sub, fontSize: 14, fontWeight: 500,
            }}
          >
            {t('skip')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: '12px', borderRadius: 12, cursor: saving ? 'wait' : 'pointer',
              border: 'none', background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              opacity: saving ? 0.8 : 1, transition: 'opacity 0.2s',
            }}
          >
            {saving ? '...' : (t('saveProfile'))}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
