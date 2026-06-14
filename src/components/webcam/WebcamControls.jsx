import React from 'react'
import { RefreshCw, ImagePlus, Camera, Video, Download, Square } from 'lucide-react'

function ToolButton({ icon, label, onClick, disabled, primary, recording }) {
  return (
    <button type="button" className="wc-tool" onClick={onClick} disabled={disabled} title={label}>
      <span className={[
        'wc-tool-icon',
        primary ? 'wc-primary' : '',
        recording ? 'wc-recording' : '',
      ].filter(Boolean).join(' ')}>
        {icon}
      </span>
      <span className="wc-tool-label">{label}</span>
    </button>
  )
}

/**
 * Floating toolbar shown over the live camera frame.
 * Mirrors the "Final Toolbar" actions from WEBCAM_CONTROLS_GUIDE.md:
 * Switch Camera · Upload Image · Capture · Record · Save Image
 */
export default function WebcamControls({
  lang = 'vi',
  isRecording = false,
  recordSeconds = 0,
  capturing = false,
  saving = false,
  switching = false,
  onSwitchCamera,
  onUpload,
  onCapture,
  onRecord,
  onSave,
}) {
  const t = (vi, en) => (lang === 'vi' ? vi : en)
  const formatTime = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0')
    const sec = String(s % 60).padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <>
      {isRecording && <div className="wc-record-time">● REC {formatTime(recordSeconds)}</div>}
      <div className="wc-toolbar">
        <ToolButton
          icon={<RefreshCw size={18} />}
          label={t('Đổi camera', 'Switch')}
          onClick={onSwitchCamera}
          disabled={switching}
        />
        <ToolButton
          icon={<ImagePlus size={18} />}
          label={t('Tải ảnh lên', 'Upload')}
          onClick={onUpload}
        />
        <ToolButton
          icon={<Camera size={22} />}
          label={t('Chụp ảnh', 'Capture')}
          onClick={onCapture}
          disabled={capturing}
          primary
        />
        <ToolButton
          icon={isRecording ? <Square size={18} /> : <Video size={18} />}
          label={isRecording ? t('Dừng ghi', 'Stop') : t('Ghi video', 'Record')}
          onClick={onRecord}
          recording={isRecording}
        />
        <ToolButton
          icon={<Download size={18} />}
          label={t('Lưu ảnh', 'Save')}
          onClick={onSave}
          disabled={saving}
        />
      </div>
    </>
  )
}
