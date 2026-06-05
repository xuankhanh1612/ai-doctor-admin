import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext.jsx'

const STRESS_RELIEF_URL = 'https://castle.xyz/d/t8p9l7o0N'

export default function StressReliefPanel({ onPrev, prevLabel }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minHeight: 'calc(100vh - 96px)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0 }}>
            {lang === 'en' ? 'Stress Relief Corner' : 'Góc xả stress'}
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
            {lang === 'en'
              ? 'A calming embedded experience for quick decompression, breathing space, and emotional reset.'
              : 'Không gian nhúng để xả stress nhanh, thở chậm và cân bằng lại cảm xúc.'}
          </p>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(0,229,255,0.10)', color: 'var(--cyan)', border: '1px solid rgba(0,229,255,0.20)', fontSize: 11, fontWeight: 900 }}>
          🌿 {lang === 'en' ? 'RELAX MODE' : 'CHẾ ĐỘ THƯ GIÃN'}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 720, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', background: '#05070d', boxShadow: '0 24px 80px rgba(0,0,0,0.24)' }}>
        <iframe
          title={lang === 'en' ? 'Stress Relief Corner' : 'Góc xả stress'}
          src={STRESS_RELIEF_URL}
          style={{ width: '100%', height: '100%', minHeight: 720, border: 0, display: 'block' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
        />
      </div>

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
