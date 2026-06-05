import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import InBodyDashboard from '../inbody-khanh/components/InBodyDashboard.jsx'

export default function AIInbodyPortalPanel({ onPrev, prevLabel }) {
  const { lang, theme } = useApp()
  const isDark = theme === 'dark'

  return (
    <div className="animate-fade" style={{ padding: 24, color: isDark ? '#e8f0f8' : '#1a2035' }}>
      <section style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}`, borderRadius: 24, padding: 22, background: isDark ? 'linear-gradient(135deg, rgba(0,230,118,.10), rgba(55,138,221,.10))' : 'linear-gradient(135deg, #edfdf5, #edf6ff)', marginBottom: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: '.16em', color: '#1D9E75', fontWeight: 900 }}>INBODY-KHANH INTEGRATION</div>
        <h2 style={{ margin: '8px 0', fontSize: 'clamp(24px, 4vw, 38px)' }}>💪 AI inbody Portal</h2>
        <p style={{ margin: 0, maxWidth: 850, lineHeight: 1.7, color: isDark ? 'rgba(232,240,248,.72)' : '#4b5563' }}>
          {lang === 'vi'
            ? 'Menu cuối cùng tích hợp dashboard InBody gamification từ src/inbody-khanh: upload kết quả, nhiệm vụ, huy hiệu và biểu đồ lịch sử thành phần cơ thể.'
            : 'The final menu integrates the InBody gamification dashboard from src/inbody-khanh: upload results, quests, badges, and body-composition history charts.'}
        </p>
      </section>

      <div style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}`, borderRadius: 22, padding: 18, background: isDark ? '#f8fafc' : '#fff', color: '#111827', boxShadow: isDark ? '0 24px 80px rgba(0,0,0,.28)' : '0 18px 50px rgba(15,23,42,.08)' }}>
        <InBodyDashboard userId="LXK-2024" />
      </div>

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
