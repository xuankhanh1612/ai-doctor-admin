import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext.jsx'

const STRESS_RELIEF_URL = 'https://castle.xyz/d/t8p9l7o0N'

export default function StressReliefPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade stress-relief-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minHeight: 'calc(100vh - 96px)' }}>
      <style>{`
        .stress-relief-frame-card {
          position: relative;
          flex: 1;
          min-height: clamp(560px, 74vh, 920px);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #05070d;
          box-shadow: 0 24px 80px rgba(0,0,0,0.24);
        }
        .stress-relief-frame {
          width: 100%;
          height: 100%;
          min-height: clamp(560px, 74vh, 920px);
          border: 0;
          display: block;
        }
        .stress-relief-mask {
          position: absolute;
          left: max(8px, env(safe-area-inset-left));
          right: max(8px, env(safe-area-inset-right));
          z-index: 2;
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          color: rgba(255,255,255,0.92);
          border: 1px solid rgba(255,255,255,0.16);
          background: linear-gradient(135deg, rgba(4,9,19,0.96), rgba(0,88,188,0.86));
          box-shadow: 0 18px 46px rgba(0,0,0,0.34);
          backdrop-filter: blur(18px);
        }
        .stress-relief-mask::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 18% 45%, rgba(131,247,255,0.34), transparent 32%), radial-gradient(circle at 82% 52%, rgba(104,211,145,0.20), transparent 34%);
        }
        .stress-relief-mask span {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.18);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .stress-relief-mask-top {
          top: 8px;
          height: clamp(54px, 7.5vw, 82px);
          border-radius: 16px 16px 28px 28px;
        }
        .stress-relief-mask-bottom {
          bottom: 8px;
          height: clamp(64px, 8.6vw, 102px);
          border-radius: 28px 28px 16px 16px;
        }
        @media (max-width: 760px) {
          .stress-relief-page { padding: 16px !important; }
          .stress-relief-frame-card, .stress-relief-frame { min-height: 70vh; }
          .stress-relief-mask { left: 6px; right: 6px; }
          .stress-relief-mask-top { top: 6px; height: 58px; border-radius: 14px 14px 22px 22px; }
          .stress-relief-mask-bottom { bottom: 6px; height: 76px; border-radius: 22px 22px 14px 14px; }
          .stress-relief-mask span { font-size: 10px; padding: 6px 10px; }
        }
      `}</style>
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

      <div className="stress-relief-frame-card">
        <iframe
          title={lang === 'en' ? 'Stress Relief Corner' : 'Góc xả stress'}
          src={STRESS_RELIEF_URL}
          className="stress-relief-frame"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
        />
        <div className="stress-relief-mask stress-relief-mask-top" aria-hidden="true">
          <span>🌿 {lang === 'en' ? 'Focus breathing space' : 'Không gian thở chậm'}</span>
        </div>
        <div className="stress-relief-mask stress-relief-mask-bottom" aria-hidden="true">
          <span>✨ {lang === 'en' ? 'Stay relaxed in app' : 'Thư giãn ngay trong trang'}</span>
        </div>
      </div>

      <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
