import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export default function LoginPage({ onSuccess }) {
  const { loginAsGuest, loginWithGoogle, loginWithApple, loginWithEmail } = useAuth()
  const { t, theme, toggleTheme, lang, setLang } = useApp()
  const [mode, setMode] = useState('welcome') // 'welcome' | 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isDark = theme === 'dark'
  const vi = lang === 'vi'

  const handle = async (fn) => {
    setError('')
    setLoading(true)
    try { await fn(); onSuccess?.() }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ─── Shared styles ─────────────────────────────────────────────────────────
  const themeBtn = {
    background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: `1px solid rgba(255,255,255,0.22)`, borderRadius: 8, padding: '5px 11px',
    color: '#fff', fontFamily: 'inherit',
  }

  // ─── WELCOME SCREEN ────────────────────────────────────────────────────────
  if (mode === 'welcome') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse 100% 70% at 50% -10%, rgba(45,138,94,0.35) 0%, transparent 60%), linear-gradient(180deg,#0a1a10 0%,#04060f 100%)',
        padding: 24, position: 'relative', overflow: 'hidden',
      }}>
        {/* Top controls */}
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }}>
          <button style={themeBtn} onClick={() => setLang(l => l === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</button>
          <button style={themeBtn} onClick={toggleTheme}>{isDark ? '☀️' : '🌙'}</button>
        </div>

        {/* Decorative background elements */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {/* Floating leaves */}
          {['🌿','🍃','🌱','🍀','🌿','🍃'].map((leaf, i) => (
            <div key={i} style={{
              position: 'absolute', fontSize: 28 + (i % 3) * 8, opacity: 0.18 + (i % 4) * 0.05,
              top: `${[8, 15, 60, 72, 35, 85][i]}%`,
              left: `${[5, 88, 2, 92, 48, 12][i]}%`,
              transform: `rotate(${[-20, 15, -35, 25, -10, 30][i]}deg)`,
              animation: `float-leaf ${3 + i * 0.7}s ease-in-out infinite alternate`,
            }}>{leaf}</div>
          ))}
          {/* Road/path illustration hint */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
            background: 'linear-gradient(to top, rgba(30,90,50,0.25), transparent)',
          }} />
        </div>

        <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 2 }}>
          {/* App logo + title */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24, margin: '0 auto 18px',
              background: 'linear-gradient(135deg, #2d8a5e, #00b8cc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 16px 48px rgba(45,138,94,0.45)',
              fontSize: 36,
            }}>🌿</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#5ef5a0', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              HEALTH<br />JOURNEY
            </div>
            <div style={{ marginTop: 14, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>
              {vi ? 'Bắt đầu hành trình!' : 'Start your adventure!'}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              {vi
                ? 'Không cần tài khoản.\nTiến trình được lưu trên thiết bị này.'
                : 'No account required.\nYour progress is safely stored on this device.'}
            </div>
          </div>

          {/* Start Now (guest) */}
          <button
            onClick={() => handle(loginAsGuest)}
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: 16, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg, #2d8a5e, #00b8cc)',
              color: '#fff', fontSize: 16, fontWeight: 900, marginBottom: 16,
              boxShadow: '0 12px 36px rgba(45,138,94,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit',
            }}
          >
            🌿 {vi ? 'Bắt đầu ngay' : 'Start Now'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* Social login */}
          <button
            onClick={() => handle(() => loginWithGoogle())}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'inherit',
            }}
          >
            <GoogleIcon /> {vi ? 'Tiếp tục với Google' : 'Continue with Google'}
          </button>

          <button
            onClick={() => handle(loginWithApple)}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'inherit',
            }}
          >
            <AppleIcon isDark={true} /> {vi ? 'Tiếp tục với Apple' : 'Continue with Apple'}
          </button>

          {error && <div style={{ color: '#ff7070', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{error}</div>}

          <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>
            {vi ? 'Chưa có tài khoản? Có thể nâng cấp sau.' : 'Need an account later? You can upgrade anytime.'}
          </div>

          {/* Email login link */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              style={{ background: 'none', border: 'none', color: 'rgba(94,245,160,0.7)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
              onClick={() => setMode('login')}
            >
              {vi ? '📧 Đăng nhập bằng Email' : '📧 Sign in with Email'}
            </button>
          </div>

          {/* Admin shortcut */}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button
              style={{ background: 'none', border: 'none', color: 'rgba(156,111,255,0.7)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}
              onClick={() => handle(() => loginWithGoogle('khanhlegood1@gmail.com'))}
            >
              🔑 {vi ? 'Đăng nhập Admin (demo)' : 'Admin login (demo)'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes float-leaf { from { transform: translateY(0) rotate(var(--r, -20deg)); } to { transform: translateY(-12px) rotate(calc(var(--r, -20deg) + 10deg)); } }
        `}</style>
      </div>
    )
  }

  // ─── EMAIL LOGIN / REGISTER SCREEN ─────────────────────────────────────────
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
    input: {
      width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 12,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`,
      background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
      color: isDark ? '#e8f0f8' : '#1a2035', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    },
    primaryBtn: {
      width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer', border: 'none',
      background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)',
      color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 4, opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
    },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(232,240,248,0.6)' : '#555', marginBottom: 6 },
    text: { color: isDark ? '#e8f0f8' : '#1a2035' },
  }

  return (
    <div style={s.page}>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }}>
        <button style={{ ...themeBtn, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', color: isDark ? '#e8f0f8' : '#1a2035', background: 'none' }} onClick={() => setLang(l => l === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</button>
        <button style={{ ...themeBtn, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', color: isDark ? '#e8f0f8' : '#1a2035', background: 'none' }} onClick={toggleTheme}>{isDark ? '☀️' : '🌙'}</button>
      </div>

      <div style={s.card}>
        <button onClick={() => setMode('welcome')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? 'rgba(232,240,248,0.5)' : '#888', fontSize: 13, marginBottom: 16, padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← {vi ? 'Quay lại' : 'Back'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, ...s.text }}>{mode === 'login' ? t('login') : t('register')}</div>
          <div style={{ fontSize: 12, color: isDark ? 'rgba(232,240,248,0.4)' : '#888', marginTop: 4 }}>{t('tagline')}</div>
        </div>

        {/* Social buttons */}
        <button style={{ width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', color: isDark ? '#e8f0f8' : '#1a2035', fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }} onClick={() => handle(() => loginWithGoogle())}>
          <GoogleIcon /> {t('continueGoogle')}
        </button>
        <button style={{ width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', color: isDark ? '#e8f0f8' : '#1a2035', fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }} onClick={() => handle(loginWithApple)}>
          <AppleIcon isDark={isDark} /> {t('continueApple')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px', color: isDark ? 'rgba(232,240,248,0.28)' : '#bbb', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }} />
          {t('orEmail')}
          <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }} />
        </div>

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

        {error && <div style={{ color: '#ff5252', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{error}</div>}

        <button style={s.primaryBtn} onClick={() => handle(() => loginWithEmail(email, password, mode === 'register' ? name : null))}>
          {loading ? '...' : (mode === 'login' ? t('login') : t('register'))}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: isDark ? 'rgba(232,240,248,0.5)' : '#888' }}>
          {mode === 'login' ? t('noAccount') : t('hasAccount')}{' '}
          <button style={{ color: '#00b8cc', cursor: 'pointer', fontWeight: 600, background: 'none', border: 'none', fontSize: 13, fontFamily: 'inherit' }} onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? t('register') : t('login')}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button style={{ background: 'none', border: 'none', color: '#9c6fff', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }} onClick={() => handle(() => loginWithGoogle('khanhlegood1@gmail.com'))}>
            🔑 {t('adminLoginGoogle')}
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
