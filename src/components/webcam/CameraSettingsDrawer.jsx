import React from 'react'
import { Eye, Clock, Square, Zap, Scan, Activity, Boxes } from 'lucide-react'

function Switch({ on, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`wc-switch${on ? ' on' : ''}`}
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={on}
    >
      <span className="wc-switch-knob" />
    </button>
  )
}

/**
 * Glassmorphism drawer toggled by the ⚙ settings button.
 * Implements the toggles from WEBCAM_CONTROLS_GUIDE.md.
 */
export default function CameraSettingsDrawer({
  lang = 'vi',
  open,
  showObjectDetection,
  onToggleObjectDetection,
  showClock,
  onToggleClock,
  showBorder,
  onToggleBorder,
  showFaceMesh,
  onToggleFaceMesh,
  showPose,
  onTogglePose,
  flashEnabled,
  onToggleFlash,
  flashSupported,
  selectedCamera,
  onSelectCamera,
  resolution,
  onSelectResolution,
}) {
  if (!open) return null
  const t = (vi, en) => (lang === 'vi' ? vi : en)

  return (
    <div className="wc-drawer">
      <div className="wc-drawer-title">{t('LỚP PHỦ AI', 'AI OVERLAY')}</div>

      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Boxes size={15} /> {t('Object Detection', 'Object Detection')}</span>
        <Switch on={showObjectDetection} onClick={onToggleObjectDetection} />
      </div>
      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Scan size={15} /> {t('AI Mesh', 'AI Mesh')}</span>
        <Switch on={showFaceMesh} onClick={onToggleFaceMesh} />
      </div>
      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Activity size={15} /> {t('AI Pose', 'AI Pose')}</span>
        <Switch on={showPose} onClick={onTogglePose} />
      </div>
      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Clock size={15} /> {t('Đồng hồ', 'Clock')}</span>
        <Switch on={showClock} onClick={onToggleClock} />
      </div>
      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Square size={15} /> {t('Viền', 'Border')}</span>
        <Switch on={showBorder} onClick={onToggleBorder} />
      </div>
      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Zap size={15} /> {t('Đèn flash', 'Flash')}</span>
        <Switch on={flashEnabled} onClick={onToggleFlash} disabled={!flashSupported} />
      </div>
      {!flashSupported && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: -6 }}>
          {t('Flash không khả dụng trên thiết bị này', 'Flash unavailable on this device')}
        </div>
      )}

      <div className="wc-drawer-divider" />

      <div className="wc-drawer-title">{t('CAMERA', 'CAMERA')}</div>
      <div className="wc-drawer-select">
        <button type="button" className={`wc-drawer-chip${selectedCamera === 'front' ? ' active' : ''}`} onClick={() => onSelectCamera?.('front')}>
          {t('Trước', 'Front')}
        </button>
        <button type="button" className={`wc-drawer-chip${selectedCamera === 'rear' ? ' active' : ''}`} onClick={() => onSelectCamera?.('rear')}>
          {t('Sau', 'Rear')}
        </button>
      </div>

      <div className="wc-drawer-title">{t('ĐỘ PHÂN GIẢI', 'RESOLUTION')}</div>
      <div className="wc-drawer-select">
        {['720', '1080'].map(res => (
          <button
            key={res}
            type="button"
            className={`wc-drawer-chip${resolution === res ? ' active' : ''}`}
            onClick={() => onSelectResolution?.(res)}
          >
            {res}p
          </button>
        ))}
      </div>
    </div>
  )
}
