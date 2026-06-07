import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import InBodyDashboard from '../inbody-khanh/components/InBodyDashboard.jsx'

export default function AIInbodyPortalPanel({ onNext, nextLabel, onPrev, prevLabel, onViewMedicalRecord }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade ai-inbody-portal-page">
      <section className="ai-healthcare-vision-header ai-inbody-portal-header">
        <div>
          <div className="ai-healthcare-vision-kicker">AI INBODY PORTAL</div>
          <h2>⚖️ AI inbody Portal</h2>
          <p>
            {lang === 'vi'
              ? 'Tích hợp source code inbody-khanh vào dự án: upload kết quả InBody, gamification XP/level, nhiệm vụ sức khỏe, lịch sử đo và huy hiệu thành tích trong một portal cuối menu.'
              : 'Integrates the inbody-khanh source into this project: InBody uploads, gamified XP/levels, health quests, measurement history, and achievement badges in the final menu portal.'}
          </p>
        </div>
      </section>

      <section className="ai-inbody-portal-card" aria-label="AI inbody Portal dashboard">
        <InBodyDashboard userId="LXK-2024" onViewMedicalRecord={onViewMedicalRecord} />
      </section>

      <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
