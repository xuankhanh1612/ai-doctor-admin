import React, { useMemo } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
// @ts-ignore Vite raw HTML import
import waterDrinkTrackerHtml from '../waterdrink-khanh/waterdrink_tracker.html?raw'
import meoNhayMatUrl from '../waterdrink-khanh/MeoNhayMat.JPG'
import meoBuAiUrl from '../waterdrink-khanh/MeoBuAI.JPG'
import meoNuocAiUrl from '../waterdrink-khanh/MeoNuocAI.JPG'
import robotTuThe1Url from '../waterdrink-khanh/Robot-mang-giong-noi-nguoi-thuong-ren-hoc-sinh-ngoi-dung-tu-the-1.jpg'
import robotTuThe2Url from '../waterdrink-khanh/Robot-mang-giong-noi-nguoi-thuong-ren-hoc-sinh-ngoi-dung-tu-the-2.jpg'

export default function WaterDrinkChatBotPanel({ onNext, onPrev, prevLabel, nextLabel }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const html = useMemo(() => waterDrinkTrackerHtml
    .replaceAll('__MEO_NHAY_MAT__', meoNhayMatUrl)
    .replaceAll('__MEO_BU_AI__', meoBuAiUrl)
    .replaceAll('__MEO_NUOC_AI__', meoNuocAiUrl)
    .replaceAll('__ROBOT_TU_THE_1__', robotTuThe1Url)
    .replaceAll('__ROBOT_TU_THE_2__', robotTuThe2Url), [meoBuAiUrl, meoNhayMatUrl, meoNuocAiUrl, robotTuThe1Url, robotTuThe2Url])

  return (
    <div style={{ minHeight: '100%', background: isDark ? '#050b18' : '#eef8ff', padding: '22px clamp(14px, 3vw, 28px) 36px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NavButtons
          onNext={onNext}
          nextLabel={nextLabel || 'Print Portal'}
          onPrev={onPrev}
          prevLabel={prevLabel}
        />

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
