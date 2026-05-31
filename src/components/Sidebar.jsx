import React, { useState, useEffect } from 'react'
import { AGENTS } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const COLOR_MAP = {
  cyan:   { bg: 'rgba(0,229,255,0.12)',   color: '#00e5ff' },
  violet: { bg: 'rgba(156,111,255,0.12)', color: '#9c6fff' },
  pink:   { bg: 'rgba(244,143,177,0.12)', color: '#f48fb1' },
  green:  { bg: 'rgba(0,230,118,0.12)',   color: '#00e676' },
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Sidebar({ active, onNavigate }) {
  const { user, logout } = useAuth()
  const { t, theme } = useApp()
  const isDark = theme === 'dark'
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  const border   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const bg       = isDark ? 'rgba(4,6,15,0.97)'      : 'rgba(255,255,255,0.97)'
  const text     = isDark ? '#e8f0f8'                 : '#1a2035'
  const text2    = isDark ? 'rgba(232,240,248,0.55)'  : '#666'
  const text3    = isDark ? 'rgba(232,240,248,0.28)'  : '#aaa'
  const surface  = isDark ? 'rgba(255,255,255,0.03)'  : 'rgba(0,0,0,0.03)'
  const surface2 = isDark ? 'rgba(255,255,255,0.06)'  : 'rgba(0,0,0,0.06)'

  const STEPS = [
    { id: 'upload',    label: t('uploadRecords'),   step: '01' },
    { id: 'imaging',    label: t('imaging'),        step: '02' },
    { id: 'checkin',   label: t('checkin'),         step: '03' },
    { id: 'family',    label: t('familyTree'),      step: '04' },
    { id: 'familyRelationship', label: t('familyRelationshipTitle'), step: '05' },
    { id: 'record',    label: t('patientRecord'),   step: '06' },
    { id: 'matrix3dBody', label: t('matrix3dBody'), step: '07' },
    { id: 'omnidirectional3dBody', label: t('omnidirectional3dBody'), step: '08' },
    { id: 'twin',      label: t('twin'),            step: '09' },
    { id: 'telemedicine', label: t('telemedicine'), step: '10' },
    { id: 'statAnalysis', label: t('statAnalysis'), step: '11' },
    { id: 'swarm',      label: t('swarmCouncil'),    step: '12' },
    { id: 'consensus', label: t('consensus'),       step: '13' },
  ]

  const ADMIN_STEPS = user?.isAdmin ? [
    { id: 'admin', label: t('adminPanel'), step: '★' },
  ] : []

  const handleNavigate = (id) => {
    onNavigate(id)
    if (isMobile) setOpen(false)
  }

  const sidebarContent = (
    <>
      {/* User card */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px',
          background: surface, border: `1px solid ${border}`, borderRadius: 10, marginBottom: 12,
        }}>
          <img src={user.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${user.isAdmin ? '#ff5252' : '#00b8cc'}` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ fontSize: 9, color: user.isAdmin ? '#ff5252' : '#00b8cc', fontWeight: 600 }}>{user.isAdmin ? '★ ADMIN' : '● USER'}</div>
          </div>
        </div>
      )}

      <SectionLabel color={text3}>{t('patients')} Journey</SectionLabel>
      {STEPS.map(s => (
        <NavItem key={s.id} active={active === s.id} onClick={() => handleNavigate(s.id)} text={text} text2={text2} isDark={isDark}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: active === s.id ? '#00e5ff' : text3, flexShrink: 0, transition: 'background 0.2s' }} />
          <span style={{ flex: 1 }}>{s.label}</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: text3 }}>{s.step}</span>
        </NavItem>
      ))}

      {ADMIN_STEPS.length > 0 && (
        <>
          <SectionLabel color={text3} style={{ marginTop: 16 }}>Admin</SectionLabel>
          {ADMIN_STEPS.map(s => (
            <NavItem key={s.id} active={active === s.id} onClick={() => handleNavigate(s.id)} text="#ff5252" text2={text2} isDark={isDark} isAdmin>
              <span style={{ fontSize: 12 }}>🛡️</span>
              <span style={{ flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#ff5252' }}>{s.step}</span>
            </NavItem>
          ))}
        </>
      )}

      <SectionLabel color={text3} style={{ marginTop: 16 }}>AI Agents</SectionLabel>
      {AGENTS.map(agent => {
        const c = COLOR_MAP[agent.color]
        return (
          <div key={agent.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 8,
            background: surface, border: `1px solid ${border}`, marginBottom: 4,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: c.bg, color: c.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0,
            }}>{agent.abbr}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
              <div style={{ marginTop: 4, height: 3, background: surface2, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${agent.confidence}%`, borderRadius: 2, background: c.color, animation: 'grow-bar 1s ease both' }} />
              </div>
            </div>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: c.color, flexShrink: 0 }}>{agent.confidence}%</span>
          </div>
        )
      })}

      {/* Logout */}
      {user && (
        <button
          onClick={() => { logout(); setOpen(false) }}
          style={{
            marginTop: 16, width: '100%', padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(255,82,82,0.25)',
            background: 'rgba(255,82,82,0.06)',
            color: '#ff5252', fontFamily: 'inherit', textAlign: 'left',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,82,82,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,82,82,0.06)'}
        >
          <span style={{ fontSize: 15 }}>🚪</span>
          <span>{t('logout')}</span>
        </button>
      )}
    </>
  )

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 300,
            width: 40, height: 40, borderRadius: 10,
            background: isDark ? 'rgba(4,6,15,0.92)' : 'rgba(255,255,255,0.92)',
            border: `1px solid ${border}`,
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: 0,
          }}
          aria-label="Toggle menu"
        >
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: open ? '#00e5ff' : text, transition: 'all 0.2s', transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: open ? '#00e5ff' : text, transition: 'all 0.2s', opacity: open ? 0 : 1 }} />
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: open ? '#00e5ff' : text, transition: 'all 0.2s', transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
        </button>
        {open && (
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
        )}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 250,
          width: 260, background: bg, backdropFilter: 'blur(12px)',
          borderRight: `1px solid ${border}`,
          display: 'flex', flexDirection: 'column',
          padding: '64px 12px 20px', gap: 4, overflowY: 'auto',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {sidebarContent}
        </aside>
      </>
    )
  }

  return (
    <aside style={{
      width: 228, borderRight: `1px solid ${border}`,
      background: bg, backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 4,
      flexShrink: 0, overflowY: 'auto',
    }}>
      {sidebarContent}
    </aside>
  )
}

function SectionLabel({ children, color, style }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color, fontFamily: 'monospace', marginBottom: 8, ...style }}>
      {children}
    </div>
  )
}

function NavItem({ active, onClick, children, text, text2, isDark, isAdmin }) {
  const activeColor = isAdmin ? '#ff5252' : '#00e5ff'
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
      cursor: 'pointer',
      background: active ? `${isAdmin ? 'rgba(255,82,82,0.07)' : 'rgba(0,229,255,0.07)'}` : 'transparent',
      border: `1px solid ${active ? (isAdmin ? 'rgba(255,82,82,0.3)' : 'rgba(0,229,255,0.25)') : 'transparent'}`,
      color: active ? activeColor : text2,
      fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
      textAlign: 'left', width: '100%', transition: 'all 0.18s',
    }}>{children}</button>
  )
}
