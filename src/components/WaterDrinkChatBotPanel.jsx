import React, { useMemo } from 'react'
import { useApp } from '../context/AppContext'
// @ts-ignore Vite raw HTML import
import waterDrinkTrackerHtml from '../waterdrink-khanh/waterdrink_tracker.html?raw'

export default function WaterDrinkChatBotPanel({ onNext, onPrev, prevLabel }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const html = useMemo(() => waterDrinkTrackerHtml, [])

  return (
    <div style={{ minHeight: '100%', background: isDark ? '#050b18' : '#eef8ff', padding: '22px clamp(14px, 3vw, 28px) 36px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={onPrev} style={navButton(isDark)}>
            ← {prevLabel || 'Quay lại'}
          </button>
          {onNext && (
            <button type="button" onClick={onNext} style={navButton(isDark, true)}>
              Tiếp theo →
            </button>
          )}
        </div>

        <div style={{ borderRadius: 28, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(125,211,252,0.26)' : 'rgba(14,165,233,0.24)'}`, boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.42)' : '0 24px 70px rgba(14,165,233,0.18)', background: '#fff' }}>
          <iframe
            title="Bé Mèo Nước chatbot"
            srcDoc={html}
            style={{ width: '100%', minHeight: '820px', border: 0, display: 'block', background: '#eef8ff' }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  )
}

function navButton(isDark, primary = false) {
  return {
    border: primary ? 'none' : `1px solid ${isDark ? 'rgba(125,211,252,0.26)' : 'rgba(14,165,233,0.22)'}`,
    background: primary ? 'linear-gradient(135deg, #0ea5e9, #14b8a6)' : (isDark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.88)'),
    color: primary ? '#fff' : (isDark ? '#e0f2fe' : '#0369a1'),
    borderRadius: 999,
    padding: '10px 16px',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: primary ? '0 14px 32px rgba(14,165,233,0.26)' : 'none',
  }
}
