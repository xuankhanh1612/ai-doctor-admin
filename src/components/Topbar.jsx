import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export default function Topbar({ activePanel }) {
  const { user, logout } = useAuth()
  const { t, theme, toggleTheme, lang, setLang } = useApp()
  const [showMenu, setShowMenu] = useState(false)
  const isDark = theme === 'dark'

  const headerBg = isDark
    ? 'rgba(4,6,15,0.92)'
    : 'rgba(255,255,255,0.92)'
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const textColor = isDark ? '#e8f0f8' : '#1a2035'
  const text3 = isDark ? 'rgba(232,240,248,0.35)' : '#aaa'

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px', borderBottom: `1px solid ${borderColor}`,
      background: headerBg, backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>Rx</div>
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', color: '#00e5ff' }}>
            CONSENSUS DOCTOR
          </div>
          <div style={{ fontSize: 10, color: text3, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
            AI AGENTS PLATFORM · MEDICAL DIGITAL TWIN
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676', animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: 11, color: '#00e676', fontFamily: 'monospace' }}>4 {t('agentsActive')}</span>
        </div>

        {/* Lang toggle */}
        <button onClick={() => setLang(l => l === 'vi' ? 'en' : 'vi')} style={{
          padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          border: `1px solid ${borderColor}`, background: 'none', color: textColor,
        }}>
          {lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
        </button>

        {/* Theme toggle */}
        <button onClick={toggleTheme} style={{
          width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 16,
          border: `1px solid ${borderColor}`, background: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* User avatar */}
        {user && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(m => !m)} style={{
              width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
              border: `2px solid ${user.isAdmin ? '#ff5252' : '#00b8cc'}`,
              overflow: 'hidden', padding: 0, background: 'none',
            }}>
              <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%' }} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', top: 44, right: 0, width: 200,
                background: isDark ? '#080c1a' : '#fff',
                border: `1px solid ${borderColor}`, borderRadius: 12, padding: 8,
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)', zIndex: 200,
              }}>
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${borderColor}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: text3 }}>{user.email}</div>
                  {user.isAdmin && <div style={{ fontSize: 9, color: '#ff5252', fontWeight: 700, marginTop: 4 }}>● ADMIN</div>}
                </div>
                <button onClick={() => { logout(); setShowMenu(false) }} style={{
                  width: '100%', padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                  border: 'none', background: 'none', color: '#ff5252', fontSize: 13, borderRadius: 6,
                }}>
                  🚪 {t('logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
