import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export default function LoginPage({ onSuccess }) {
  const { loginWithGoogle, loginWithApple, loginWithEmail, loginAnonymous } = useAuth()
  const { t, theme, toggleTheme, lang, setLang } = useApp()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isDark = theme === 'dark'

  const handle = async (fn) => {
    setError('')
    setLoading(true)
    try { await fn(); onSuccess?.() }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const s = {
    page: {
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isDark
        ? 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,180,200,0.08) 0%, transparent 60%), #04060f'
        : 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,180,200,0.06) 0%, transparent 60%), #f0f4f8',
      padding: 24, position: 'relative',
    },
    card: {
      width: '100%', maxWidth: 420,
      background: isDark ? 'rgba(8,12,26,0.95)' : 'rgba(255,255,255,0.98)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
      borderRadius: 20, padding: '36px 32px',
      boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.6)' : '0 24px 80px rgba(0,0,0,0.12)',
    },
    logo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, justifyContent: 'center' },
    logoIcon: {
      width: 44, height: 44, borderRadius: 12,
      background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#fff',
    },
    title: { fontSize: 22, fontWeight: 800, color: isDark ? '#e8f0f8' : '#1a2035', textAlign: 'center', marginBottom: 4 },
    sub: { fontSize: 12, color: isDark ? 'rgba(232,240,248,0.4)' : '#888', textAlign: 'center', marginBottom: 28 },
    socialBtn: () => ({
      width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
      background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
      color: isDark ? '#e8f0f8' : '#1a2035',
      fontSize: 14, fontWeight: 600, marginBottom: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      transition: 'all 0.18s',
    }),
    divider: {
      display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0',
      color: isDark ? 'rgba(232,240,248,0.28)' : '#bbb', fontSize: 12,
    },
    line: { flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' },
    input: {
      width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 12,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`,
      background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
      color: isDark ? '#e8f0f8' : '#1a2035', fontSize: 14, outline: 'none',
      boxSizing: 'border-box',
    },
    primaryBtn: {
      width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer', border: 'none',
      background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)',
      color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 4,
      opacity: loading ? 0.7 : 1,
    },
    error: { color: '#ff5252', fontSize: 12, marginBottom: 10, textAlign: 'center' },
    switch: { textAlign: 'center', marginTop: 20, fontSize: 13, color: isDark ? 'rgba(232,240,248,0.5)' : '#888' },
    switchBtn: { color: '#00b8cc', cursor: 'pointer', fontWeight: 600, background: 'none', border: 'none', fontSize: 13 },
    themeBtn: {
      background: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
      borderRadius: 8, padding: '6px 12px',
      color: isDark ? '#e8f0f8' : '#1a2035',
    },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(232,240,248,0.6)' : '#555', marginBottom: 6 },
  }

  return (
    <div style={s.page}>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={s.themeBtn} onClick={() => setLang(l => l === 'vi' ? 'en' : 'vi')}>
          {lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
        </button>
        <button style={s.themeBtn} onClick={toggleTheme} title="Toggle theme">
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIcon}>Rx</div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#00e5ff', letterSpacing: '0.08em' }}>CONSENSUS DOCTOR</div>
            <div style={{ fontSize: 10, color: isDark ? 'rgba(232,240,248,0.35)' : '#aaa', letterSpacing: '0.1em' }}>AI MEDICAL PLATFORM</div>
          </div>
        </div>

        <div style={s.title}>{mode === 'login' ? t('login') : t('register')}</div>
        <div style={s.sub}>{t('tagline')}</div>

        {/* ── Start Now (Anonymous) ── */}
        <button
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer', border: 'none',
            background: 'linear-gradient(135deg, #1a6640, #2d8a5e, #00b8cc)',
            color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,184,204,0.3)',
            opacity: loading ? 0.7 : 1,
          }}
          onClick={() => handle(loginAnonymous)}
          disabled={loading}
        >
          🌿 {lang === 'vi' ? 'Bắt đầu ngay' : 'Start Now'}
        </button>
        <div style={{ textAlign: 'center', fontSize: 11, color: isDark ? 'rgba(232,240,248,0.4)' : '#999', marginBottom: 18 }}>
          {lang === 'vi' ? 'Không cần tài khoản · Tiến trình lưu trên thiết bị này' : 'No account required · Progress saved on this device'}
        </div>

        <div style={s.divider}><div style={s.line}/>{lang === 'vi' ? 'HOẶC' : 'OR'}<div style={s.line}/></div>

        {/* Google — profile auto-filled from OAuth */}
        <button style={s.socialBtn()} onClick={() => handle(() => loginWithGoogle())}>
          <GoogleIcon />
          {t('continueGoogle')}
          <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>
            {t('autoAvatar')}
          </span>
        </button>

        <button style={s.socialBtn()} onClick={() => handle(loginWithApple)}>
          <AppleIcon isDark={isDark} />
          {t('continueApple')}
        </button>

        <div style={s.divider}><div style={s.line}/>{t('orEmail')}<div style={s.line}/></div>

        {mode === 'register' && (
          <>
            <label style={s.label}>{t('name')}</label>
            <input style={s.input} placeholder="Nguyễn Văn A" value={name} onChange={e => setName(e.target.value)} />
          </>
        )}
        <label style={s.label}>{t('email')}</label>
        <input style={s.input} type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        <label style={s.label}>{t('password')}</label>
        <input
          style={s.input} type="password" placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle(() => loginWithEmail(email, password, mode === 'register' ? name : null))}
        />

        {error && <div style={s.error}>{error}</div>}

        <button style={s.primaryBtn} onClick={() => handle(() => loginWithEmail(email, password, mode === 'register' ? name : null))}>
          {loading ? '...' : (mode === 'login' ? t('login') : t('register'))}
        </button>

        {/* Admin shortcut — uses Google OAuth profile for khanhlegood1@gmail.com */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            style={{ ...s.switchBtn, fontSize: 11, color: '#9c6fff' }}
            onClick={() => handle(() => loginWithGoogle('khanhlegood1@gmail.com'))}
          >
            🔑 {t('adminLoginGoogle')}
          </button>
        </div>

        <div style={s.switch}>
          {mode === 'login' ? t('noAccount') : t('hasAccount')}{' '}
          <button style={s.switchBtn} onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? t('register') : t('login')}
          </button>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
    </svg>
  )
}

function AppleIcon({ isDark }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={isDark ? '#fff' : '#000'}>
      <path d="M12.52 9.12a3.8 3.8 0 011.82-3.2 3.9 3.9 0 00-3.08-1.66c-1.3-.14-2.56.77-3.22.77-.67 0-1.69-.75-2.78-.73A4.1 4.1 0 001.8 6.56c-1.5 2.6-.38 6.43 1.06 8.53.72 1.03 1.56 2.18 2.66 2.14 1.08-.04 1.49-.69 2.79-.69 1.3 0 1.67.69 2.8.67 1.15-.02 1.88-1.03 2.58-2.07a8.56 8.56 0 001.17-2.4 3.68 3.68 0 01-2.34-3.62zM10.48 3.12A3.75 3.75 0 0011.42.5a3.8 3.8 0 00-2.46 1.27 3.56 3.56 0 00-.88 2.57 3.14 3.14 0 002.4-1.22z"/>
    </svg>
  )
}
