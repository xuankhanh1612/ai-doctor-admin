import React from 'react'
import { Brain, Scan, HeartPulse, PersonStanding, Eye } from 'lucide-react'

function Clock({ now, inset }) {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return (
    <div className="wc-clock" style={inset ? { right: inset } : undefined}>
      {hh}:{mm}:{ss}
      <small>{date}</small>
    </div>
  )
}

function BorderCorners() {
  return (
    <div className="wc-border">
      <span className="wc-corner tl" />
      <span className="wc-corner tr" />
      <span className="wc-corner bl" />
      <span className="wc-corner br" />
    </div>
  )
}

/**
 * Cyber medical HUD overlay shared between the "Camera OFF" placeholder
 * and the "Camera ON" live view, following WEBCAM_CONTROLS_GUIDE.md.
 */
export default function CameraOverlay({
  lang = 'vi',
  cameraOpen,
  isLive,
  showOverlay,
  showClock,
  showBorder,
  now,
  canvasRef,
  clockInset,
  mirrorCanvas = false,
}) {
  const t = (vi, en) => (lang === 'vi' ? vi : en)

  return (
    <div className="wc-hud">
      {showOverlay && (
        <span className={isLive ? 'wc-live-badge' : 'wc-overlay-badge'}>
          <span className="wc-live-dot" />
          {isLive ? 'LIVE · AI SCAN' : t('LỚP PHỦ AI ĐANG CHẠY', 'AI OVERLAY ACTIVE')}
        </span>
      )}

      {showClock && <Clock now={now} inset={clockInset} />}

      {showBorder && <BorderCorners />}

      {/* Landmark / face-mesh / pose canvas, drawn by useMediaPipeVision results */}
      <canvas
        ref={canvasRef}
        className="wc-canvas"
        style={{ pointerEvents: 'none', transform: mirrorCanvas ? 'scaleX(-1)' : undefined }}
      />

      {!cameraOpen && (
        <div className="wc-placeholder">
          <div className="wc-placeholder-icon-row">
            <Brain size={46} />
            <Scan size={46} />
            <HeartPulse size={46} />
            <PersonStanding size={46} />
          </div>
          <div className="wc-placeholder-title">AI DOCTOR VISION</div>
          <div className="wc-placeholder-sub">
            {t('Lớp phủ AI đang chạy · Mở camera để bắt đầu quét', 'AI Overlay is running · Open camera to start')}
          </div>
          <div className="wc-feature-pills">
            <span className="wc-feature-pill"><Scan size={13} /> Face Mesh</span>
            <span className="wc-feature-pill"><PersonStanding size={13} /> {t('Khung xương', 'Skeleton')}</span>
            <span className="wc-feature-pill"><HeartPulse size={13} /> {t('Nhịp tim', 'Heart Rate')}</span>
            <span className="wc-feature-pill"><Eye size={13} /> {t('Tư thế', 'Posture')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
