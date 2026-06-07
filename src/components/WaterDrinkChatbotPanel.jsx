import React from 'react'
import { useApp } from '../context/AppContext'
import waterDrinkTrackerHtml from '../waterdrink-khanh/waterdrink_tracker.html?raw'

export default function WaterDrinkChatbotPanel({ onNext, onPrev, prevLabel }) {
  const { theme, t, lang } = useApp()
  const isDark = theme === 'dark'
  const bg = isDark ? 'linear-gradient(135deg, #04131d, #071c2d)' : 'linear-gradient(135deg, #eefaff, #f8fcff)'
  const text = isDark ? '#e8f0f8' : '#102236'
  const muted = isDark ? 'rgba(232,240,248,0.66)' : '#5b7184'
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,120,170,0.14)'

  return (
    <section style={{ minHeight: '100%', background: bg, padding: '28px clamp(14px, 3vw, 34px) 42px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#00a8d8', fontSize: 12, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Water drink assistant
            </div>
            <h1 style={{ margin: '8px 0 8px', color: text, fontSize: 'clamp(30px, 5vw, 56px)', letterSpacing: '-0.06em', lineHeight: 0.95 }}>
              🐱💧 Bé Mèo Nước
            </h1>
            <p style={{ margin: 0, color: muted, maxWidth: 720, fontSize: 16, lineHeight: 1.65, fontWeight: 650 }}>
              {lang === 'en'
                ? 'A friendly water-tracking chatbot built from src/waterdrink-khanh/waterdrink_tracker.html. It logs your cups, tracks today’s goal, and nudges you with cat-like reminders.'
                : 'Chat bot nhắc uống nước được dựng từ source src/waterdrink-khanh/waterdrink_tracker.html. Bé Mèo Nước ghi nhận từng ly, theo dõi mục tiêu hôm nay và nhắc bạn uống nước nhẹ nhàng.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {prevLabel && (
              <button type="button" onClick={onPrev} style={navButton(isDark, false)}>
                ← {prevLabel}
              </button>
            )}
            <button type="button" onClick={onNext} style={navButton(isDark, true)}>
              {t('next')} →
            </button>
          </div>
        </header>

        <div style={{ border: `1px solid ${border}`, borderRadius: 30, overflow: 'hidden', boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.36)' : '0 24px 80px rgba(0,95,145,0.18)', background: isDark ? '#061522' : '#ffffff' }}>
          <iframe
            title="Bé Mèo Nước water drink chatbot"
            srcDoc={waterDrinkTrackerHtml}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: '100%', height: 'min(880px, calc(100vh - 190px))', minHeight: 720, border: 0, display: 'block' }}
          />
        </div>
      </div>
    </section>
  )
}

function navButton(isDark, primary) {
  return {
    border: primary ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)'}`,
    borderRadius: 999,
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 900,
    color: primary ? '#ffffff' : (isDark ? '#e8f0f8' : '#102236'),
    background: primary ? 'linear-gradient(135deg, #00a8d8, #38d6ff)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)'),
    boxShadow: primary ? '0 12px 28px rgba(0,168,216,0.24)' : 'none',
    fontFamily: 'inherit',
  }
}
