import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import InBodyDashboard from '../inbody-khanh/components/InBodyDashboard.jsx'

export default function AIInbodyPortalPanel({ onPrev, prevLabel }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade ai-inbody-portal-page">
      <section className="ai-inbody-portal-header">
        <div>
          <div className="ai-healthcare-vision-kicker">INBODY-KHANH INTEGRATION</div>
          <h2>⚖️ AI inbody Portal</h2>
          <p>
            {lang === 'vi'
              ? 'Tích hợp dashboard InBody từ thư mục inbody-khanh: upload kết quả, xem chỉ số thành phần cơ thể, nhiệm vụ sức khỏe, lịch sử và huy hiệu thành tích.'
              : 'Integrates the InBody dashboard from the inbody-khanh source folder: upload results, review body composition metrics, quests, history, and achievement badges.'}
          </p>
        </div>
      </section>

      <section className="ai-inbody-portal-card" aria-label="AI inbody Portal dashboard">
        <InBodyDashboard userId="LXK-2024" />
      </section>

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
