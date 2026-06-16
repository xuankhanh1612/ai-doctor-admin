import React from 'react'
import { Brain, Scan, HeartPulse, PersonStanding, Eye } from 'lucide-react'

function Clock({ now, clockStyle }) {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return (
    <div className="wc-clock" style={clockStyle}>
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
 *
 * imageRect: { left, top, width, height } — khi upload ảnh (object-fit:contain),
 * canvas và clock phải được định vị đúng vùng ảnh thực tế, không phải toàn frame.
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
  imageRect,  // { left, top, width, height } | null
}) {
  const t = (vi, en) => (lang === 'vi' ? vi : en)

  // Canvas style: khi có imageRect → đặt đúng vùng letterbox; khi live → inset:0 toàn frame
  const canvasStyle = imageRect
    ? {
        position: 'absolute',
        left:   imageRect.left,
        top:    imageRect.top,
        width:  imageRect.width,
        height: imageRect.height,
        pointerEvents: 'none',
      }
    : { pointerEvents: 'none' }  // class wc-canvas xử lý inset:0

  // Clock style khi upload mode: góc dưới phải của vùng ảnh thực tế
  // imageRect.top + imageRect.height = khoảng cách từ top frame đến đáy ảnh
  // CSS bottom = khoảng cách từ bottom frame = frameH - (top + height)
  // Nhưng vì không biết frameH trong render, dùng top absolute rồi offset xuống
  const clockStyle = imageRect
    ? {
        position: 'absolute',
        top:   imageRect.top + imageRect.height - 62,  // 62 ≈ chiều cao clock
        right: imageRect.left === 0 ? 8 : `calc(100% - ${imageRect.left + imageRect.width}px + 8px)`,
        left:  'auto',
        bottom: 'auto',
      }
    : undefined

  return (
    <div className="wc-hud">
      {showOverlay && (
        <span className={isLive ? 'wc-live-badge' : 'wc-overlay-badge'} style={{ left: 60 }}>
          <span className="wc-live-dot" />
          {isLive ? 'LIVE · AI SCAN' : t('LỚP PHỦ AI ĐANG CHẠY', 'AI OVERLAY ACTIVE')}
        </span>
      )}

      {showClock && <Clock now={now} clockStyle={clockStyle} />}

      {showBorder && <BorderCorners />}

      {/* Canvas: vị trí theo imageRect khi upload, inset:0 khi live */}
      <canvas
        ref={canvasRef}
        className={imageRect ? undefined : 'wc-canvas'}
        style={canvasStyle}
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
