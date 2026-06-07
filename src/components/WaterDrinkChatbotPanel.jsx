import React from 'react'
import { useApp } from '../context/AppContext'
// @ts-ignore
import waterDrinkTrackerHtml from '../waterdrink-khanh/waterdrink_tracker.html?raw'

export default function WaterDrinkChatbotPanel({ onNext, onPrev, prevLabel }) {
  const { theme, t } = useApp()
  const isDark = theme === 'dark'
  const text = isDark ? '#e8f0f8' : '#172033'
  const muted = isDark ? 'rgba(232,240,248,0.62)' : '#64748b'
  const panelBg = isDark ? 'linear-gradient(135deg, #050816, #0b1730)' : 'linear-gradient(135deg, #effcff, #f8fbff)'
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.78)'
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,49,79,0.10)'

  return (
    <div style={{ minHeight: '100%', padding: '28px clamp(14px, 3vw, 34px) 36px', background: panelBg }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          marginBottom: 18, padding: 18, borderRadius: 24, background: cardBg, border: `1px solid ${border}`,
          boxShadow: isDark ? '0 18px 55px rgba(0,0,0,0.28)' : '0 18px 55px rgba(37,99,235,0.12)',
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 999,
              background: 'rgba(0,194,255,0.13)', color: '#00b8cc', fontSize: 12, fontWeight: 900,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              🐱💧 Water Drink Chat Bot
            </div>
            <h1 style={{ margin: '12px 0 6px', color: text, fontSize: 'clamp(30px, 5vw, 52px)', letterSpacing: '-0.05em', lineHeight: 1 }}>
              Bé Mèo Nước
            </h1>
            <p style={{ margin: 0, maxWidth: 760, color: muted, lineHeight: 1.65, fontSize: 15 }}>
              Chat bot theo dõi uống nước được nhúng từ source <code>src/waterdrink-khanh/waterdrink_tracker.html</code>.
              Bé Mèo Nước giúp ghi lượng nước, đổi mục tiêu ml/ngày và động viên người dùng uống nước đều hơn.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {onPrev && (
              <button type="button" onClick={onPrev} style={navButton(isDark, 'secondary')}>
                ← {prevLabel || t('back')}
              </button>
            )}
            {onNext && (
              <button type="button" onClick={onNext} style={navButton(isDark, 'primary')}>
                {t('next')} →
              </button>
            )}
          </div>
        </header>

        <div style={{
          height: 'min(820px, calc(100vh - 190px))', minHeight: 680, borderRadius: 28, overflow: 'hidden',
          border: `1px solid ${border}`, background: '#eefcff', boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.35)' : '0 24px 70px rgba(37,99,235,0.16)',
        }}>
          <iframe
            title="Bé Mèo Nước water drink tracker chatbot"
            srcDoc={waterDrinkTrackerHtml}
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        </div>
      </div>
    </div>
  )
}

function navButton(isDark, variant) {
  const primary = variant === 'primary'
  return {
    border: primary ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(20,49,79,0.12)'}`,
    borderRadius: 999,
    padding: '11px 16px',
    cursor: 'pointer',
    fontWeight: 900,
    color: primary ? '#00131a' : (isDark ? '#e8f0f8' : '#17324d'),
    background: primary ? 'linear-gradient(135deg, #67e8f9, #38bdf8)' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)'),
    boxShadow: primary ? '0 12px 28px rgba(14,165,233,0.25)' : 'none',
    fontFamily: 'inherit',
  }
}
