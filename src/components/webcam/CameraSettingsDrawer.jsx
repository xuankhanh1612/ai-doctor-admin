import React from 'react'
import { Eye, Clock, Square, Zap, Scan, Activity } from 'lucide-react'

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

const PRESETS = [
  { id: 'medical', label: { vi: 'Quét y tế', en: 'Medical Scan' }, values: { overlay: true, faceMesh: true, pose: true, clock: true, border: true } },
  { id: 'telemedicine', label: { vi: 'Khám từ xa', en: 'Telemedicine' }, values: { overlay: false, faceMesh: false, pose: false, clock: true, border: false } },
  { id: 'research', label: { vi: 'AI Research', en: 'AI Research' }, values: { overlay: true, faceMesh: true, pose: true, clock: true, border: true } },
  { id: 'screenshot', label: { vi: 'Chụp sạch', en: 'Screenshot' }, values: { overlay: false, faceMesh: false, pose: false, clock: false, border: false } },
]

/**
 * Glassmorphism drawer toggled by the ⚙ settings button.
 * Implements the toggles + presets from WEBCAM_CONTROLS_GUIDE.md.
 */
export default function CameraSettingsDrawer({
  lang = 'vi',
  open,
  showOverlay,
  onToggleOverlay,
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
  onApplyPreset,
}) {
  if (!open) return null
  const t = (vi, en) => (lang === 'vi' ? vi : en)

  return (
    <div className="wc-drawer">
      <div className="wc-drawer-title">{t('LỚP PHỦ AI', 'AI OVERLAY')}</div>

      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Eye size={15} /> {t('Lớp phủ AI', 'AI Overlay')}</span>
        <Switch on={showOverlay} onClick={onToggleOverlay} />
      </div>
      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Scan size={15} /> {t('Face Mesh', 'Face Mesh')}</span>
        <Switch on={showFaceMesh} onClick={onToggleFaceMesh} disabled={!showOverlay} />
      </div>
      <div className="wc-drawer-row">
        <span className="wc-drawer-row-label"><Activity size={15} /> {t('Khung xương', 'Pose Skeleton')}</span>
        <Switch on={showPose} onClick={onTogglePose} disabled={!showOverlay} />
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

      <div className="wc-drawer-divider" />

      <div className="wc-drawer-title">{t('CÀI ĐẶT NHANH', 'PRESETS')}</div>
      <div className="wc-presets">
        {PRESETS.map(preset => (
          <button key={preset.id} type="button" className="wc-preset-btn" onClick={() => onApplyPreset?.(preset.values)}>
            {preset.label[lang] || preset.label.en}
          </button>
        ))}
      </div>
    </div>
  )
}
