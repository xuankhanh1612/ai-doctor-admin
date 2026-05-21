import React from 'react'
import { AGENTS } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const COLOR_MAP = {
  cyan:   { bg: 'rgba(0,229,255,0.12)',   color: '#00e5ff' },
  violet: { bg: 'rgba(156,111,255,0.12)', color: '#9c6fff' },
  pink:   { bg: 'rgba(244,143,177,0.12)', color: '#f48fb1' },
  green:  { bg: 'rgba(0,230,118,0.12)',   color: '#00e676' },
}

export default function Sidebar({ active, onNavigate }) {
  const { user } = useAuth()
  const { t, theme } = useApp()
  const isDark = theme === 'dark'

  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const bg = isDark ? 'rgba(4,6,15,0.6)' : 'rgba(255,255,255,0.7)'
  const text = isDark ? '#e8f0f8' : '#1a2035'
  const text2 = isDark ? 'rgba(232,240,248,0.55)' : '#666'
  const text3 = isDark ? 'rgba(232,240,248,0.28)' : '#aaa'
  const surface = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const surface2 = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const STEPS = [
    { id: 'imaging',    label: t('imaging'),    step: '01' },
    { id: 'checkin',    label: t('checkin'),    step: '02' },
    { id: 'upload',     label: t('uploadRecords'), step: '03' },
    { id: 'family',     label: t('familyTree'), step: '04' },
    { id: 'twin',       label: t('twin'),       step: '05' },
    { id: 'simulation', label: t('simulation'), step: '06' },
    { id: 'consensus',  label: t('consensus'),  step: '07' },
  ]

  const ADMIN_STEPS = user?.isAdmin ? [
    { id: 'admin', label: t('adminPanel'), step: '★' },
  ] : []

  return (
    <aside style={{
      width: 228, borderRight: `1px solid ${border}`,
      background: bg, backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 4,
      flexShrink: 0, overflowY: 'auto',
    }}>
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

      <SectionLabel color={text3}>Patient Journey</SectionLabel>
      {STEPS.map(s => (
        <NavItem key={s.id} active={active === s.id} onClick={() => onNavigate(s.id)} text={text} text2={text2} isDark={isDark}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: active === s.id ? '#00e5ff' : text3, flexShrink: 0, transition: 'background 0.2s' }} />
          <span style={{ flex: 1 }}>{s.label}</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: text3 }}>{s.step}</span>
        </NavItem>
      ))}

      {ADMIN_STEPS.length > 0 && (
        <>
          <SectionLabel color={text3} style={{ marginTop: 16 }}>Admin</SectionLabel>
          {ADMIN_STEPS.map(s => (
            <NavItem key={s.id} active={active === s.id} onClick={() => onNavigate(s.id)} text="#ff5252" text2={text2} isDark={isDark} isAdmin>
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
