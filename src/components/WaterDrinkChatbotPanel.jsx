import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext.jsx'
import waterDrinkTrackerHtml from '../waterdrink-khanh/waterdrink_tracker.html?raw'

export default function WaterDrinkChatbotPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade waterdrink-chatbot-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, minHeight: 'calc(100vh - 96px)' }}>
      <style>{`
        .waterdrink-frame-card {
          flex: 1;
          min-height: clamp(680px, 78vh, 980px);
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #07111f;
          box-shadow: 0 24px 80px rgba(0,0,0,0.24);
        }
        .waterdrink-frame {
          width: 100%;
          height: 100%;
          min-height: clamp(680px, 78vh, 980px);
          border: 0;
          display: block;
          background: #07111f;
        }
        @media (max-width: 760px) {
          .waterdrink-chatbot-page { padding: 16px !important; }
          .waterdrink-frame-card, .waterdrink-frame { min-height: 82vh; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0 }}>
            🐱💧 Bé Mèo Nước
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
            {lang === 'en'
              ? 'A friendly water-drinking chatbot and daily hydration tracker embedded from the waterdrink source.'
              : 'Chat bot nhắc uống nước và theo dõi lượng nước mỗi ngày, nhúng từ source waterdrink.'}
          </p>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(93,231,255,0.10)', color: '#5de7ff', border: '1px solid rgba(93,231,255,0.22)', fontSize: 11, fontWeight: 900 }}>
          💧 {lang === 'en' ? 'HYDRATION CHATBOT' : 'CHAT BOT UỐNG NƯỚC'}
        </span>
      </div>

      <div className="waterdrink-frame-card">
        <iframe
          title="Bé Mèo Nước Water Drink Tracker"
          srcDoc={waterDrinkTrackerHtml}
          className="waterdrink-frame"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
