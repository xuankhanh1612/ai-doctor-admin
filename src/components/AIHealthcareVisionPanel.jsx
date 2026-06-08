import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'

const VISION_URL = 'https://god-eyes-khanh.vercel.app/'

export default function AIHealthcareVisionPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade ai-healthcare-vision-page">
      <section className="ai-healthcare-vision-header">
        <div>
          <div className="ai-healthcare-vision-kicker">AI HEALTHCARE VISION</div>
          <h2>👁️ AI Healthcare Vision</h2>
          <p>
            {lang === 'vi'
              ? 'Màn hình cuối của Hành trình sức khỏe, nhúng trực tiếp website God Eyes để quan sát và trải nghiệm không gian AI Healthcare Vision trong một viewport tối ưu cho điện thoại và desktop.'
              : 'The final Health Journey screen embeds God Eyes directly, keeping the AI Healthcare Vision experience inside a phone- and desktop-friendly viewport.'}
          </p>
        </div>
        <a href={VISION_URL} target="_blank" rel="noreferrer" className="ai-healthcare-vision-open-link">
          {lang === 'vi' ? 'Mở tab mới ↗' : 'Open new tab ↗'}
        </a>
      </section>

      <section className="ai-healthcare-vision-frame-card" aria-label="AI Healthcare Vision embedded website">
        <iframe
          title="AI Healthcare Vision"
          src={VISION_URL}
          className="ai-healthcare-vision-frame"
          allow="camera; microphone; fullscreen; clipboard-read; clipboard-write; geolocation"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>

      <NavButtons onNext={onNext} nextLabel={nextLabel || (lang === 'vi' ? 'Góc xả stress' : 'Stress Relief Corner')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
