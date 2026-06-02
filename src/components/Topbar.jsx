import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export default function Topbar({ activePanel, onNavigateProfile }) {
  const { user, logout } = useAuth()
  const { t, theme, toggleTheme, lang, setLang } = useApp()
  const [showMenu, setShowMenu] = useState(false)
  const isDark = theme === 'dark'

  const headerBg = isDark ? 'rgba(4,6,15,0.92)' : 'rgba(255,255,255,0.92)'
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const textColor = isDark ? '#e8f0f8' : '#1a2035'
  const text2 = isDark ? 'rgba(232,240,248,0.55)' : '#666'
  const text3 = isDark ? 'rgba(232,240,248,0.35)' : '#aaa'
  const menuBg = isDark ? '#080c1a' : '#fff'

  // Provider badge colours
  const providerLabel = { google: 'Google', apple: 'Apple', email: 'Email' }
  const providerColor = { google: '#4285F4', apple: '#555', email: '#6b3fd4' }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 24px', borderBottom: `1px solid ${borderColor}`,
      background: headerBg, backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo */}
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

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Live agents indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676' }} />
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

        {/* User avatar + dropdown */}
        {user && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(m => !m)}
              title={user.name}
              style={{
                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', padding: 0,
                border: `2px solid ${user.isAdmin ? '#ff5252' : '#00b8cc'}`,
                background: 'none', overflow: 'hidden', flexShrink: 0,
              }}
            >
              {user.avatar
                ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', color: '#fff', fontWeight: 700, fontSize: 13,
                  }}>
                    {(user.name || 'U').slice(0, 1)}
                  </div>
              }
            </button>

            {showMenu && (
              <div style={{
                position: 'absolute', top: 44, right: 0, width: 220,
                background: menuBg, border: `1px solid ${borderColor}`,
                borderRadius: 14, padding: 8,
                boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 12px 40px rgba(0,0,0,0.15)',
                zIndex: 200,
              }}
                onMouseLeave={() => setShowMenu(false)}
              >
                {/* User info block */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px 12px', borderBottom: `1px solid ${borderColor}`, marginBottom: 6,
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${borderColor}` }}>
                    {user.avatar
                      ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                          {(user.name || 'U').slice(0,1)}
                        </div>
                    }
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: 10, color: text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      {/* Provider badge */}
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                        background: `${providerColor[user.provider] || '#555'}18`,
                        color: providerColor[user.provider] || '#555',
                        border: `1px solid ${providerColor[user.provider] || '#555'}33`,
                      }}>
                        {providerLabel[user.provider] || 'Email'}
                      </span>
                      {user.isAdmin && (
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                          background: 'rgba(255,82,82,0.12)', color: '#ff5252', border: '1px solid rgba(255,82,82,0.25)',
                        }}>ADMIN</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specialty if set */}
                {user.specialty && (
                  <div style={{ padding: '4px 12px 8px', fontSize: 11, color: text2, borderBottom: `1px solid ${borderColor}`, marginBottom: 6 }}>
                    🩺 {user.specialty}
                  </div>
                )}

                {/* Google/Apple photo note */}
                {user.googleAvatar && (user.provider === 'google' || user.provider === 'apple') && (
                  <div style={{ padding: '4px 12px 8px', fontSize: 10, color: text3, borderBottom: `1px solid ${borderColor}`, marginBottom: 6 }}>
                    📷 {lang === 'vi' ? `Ảnh từ ${providerLabel[user.provider]} Account` : `Photo from ${providerLabel[user.provider]} Account`}
                  </div>
                )}

                <button onClick={() => { onNavigateProfile?.(); setShowMenu(false) }} style={{
                  width: '100%', padding: '9px 12px', textAlign: 'left', cursor: 'pointer',
                  border: 'none', background: 'none', color: textColor, fontSize: 13,
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
                }}>
                  👤 {t('profile')}
                </button>

                <button onClick={() => { logout(); setShowMenu(false) }} style={{
                  width: '100%', padding: '9px 12px', textAlign: 'left', cursor: 'pointer',
                  border: 'none', background: 'none', color: '#ff5252', fontSize: 13,
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
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
