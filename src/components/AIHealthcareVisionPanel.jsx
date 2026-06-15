import React, { useEffect, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import AIVisionWebcam from './webcam/AIVisionWebcam.jsx'
import { saveVisionControlImage, dataUrlToFile, makeVisionFilename } from './webcam/visionStorage.js'

const MEDIAPIPE_APP_URL = '/src/mediapipe-khanh/index.html?mode=webcam#/vision/object_detector'

export default function AIHealthcareVisionPanel({ onNext, nextLabel, onPrev, prevLabel, onViewMedicalRecord }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const [lastMediaPipeRecord, setLastMediaPipeRecord] = useState(null)
  const [activeTab, setActiveTab] = useState('webcam') // 'webcam' | 'advanced'

  useEffect(() => {
    const onMessage = async (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'AI_CLINIC_OPEN_UPLOAD_RECORDS') {
        onViewMedicalRecord?.()
        return
      }

      const isWebcamCapture = event.data?.type === 'AI_CLINIC_MEDIAPIPE_WEBCAM_CAPTURE'
      const isImageCapture = event.data?.type === 'AI_CLINIC_MEDIAPIPE_IMAGE_CAPTURE'
      if (!isWebcamCapture && !isImageCapture) return

      const captureKind = isWebcamCapture ? 'webcam' : 'image'
      try {
        const file = dataUrlToFile(
          event.data.dataUrl,
          event.data.filename || makeVisionFilename(`mediapipe_${captureKind}`)
        )
        const record = await saveVisionControlImage(file, {
          user,
          lang,
          label: isWebcamCapture
            ? (lang === 'vi' ? 'Ảnh Webcam từ MediaPipe Tasks' : 'Webcam image from MediaPipe Tasks')
            : (lang === 'vi' ? 'Ảnh Image tab từ MediaPipe Tasks' : 'Image tab capture from MediaPipe Tasks'),
        })
        setLastMediaPipeRecord(record)
        event.source?.postMessage?.({
          type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVED',
          captureKind,
          uploadPath: record.uploadPath,
        }, event.origin)
      } catch (error) {
        console.error('Could not save MediaPipe capture:', error)
        event.source?.postMessage?.({
          type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVE_FAILED',
          captureKind,
          message: error?.message || String(error),
        }, event.origin)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [lang, user, onViewMedicalRecord])

  return (
    <div className="animate-fade ai-healthcare-vision-page">
      <section className="ai-healthcare-vision-header">
        <div>
          <div className="ai-healthcare-vision-kicker">AI HEALTHCARE VISION</div>
          <h2>🧠 AI Healthcare Vision</h2>
          <p>
            {lang === 'vi'
              ? 'Camera AI mặc định TẮT — màn hình AI DOCTOR VISION hiển thị HUD AI ngay cả khi chưa mở camera. Mở camera để chạy Face Mesh / Pose realtime bằng MediaPipe, chụp ảnh, ghi video hoặc tải ảnh lên để quét.'
              : 'AI camera is OFF by default — the AI DOCTOR VISION HUD is visible even before the camera starts. Open the camera to run realtime Face Mesh / Pose with MediaPipe, capture photos, record video, or upload an image to scan.'}
          </p>
          {lastMediaPipeRecord && (
            <div className="ai-vision-upload-path" style={{ marginTop: 10 }}>
              <b>{lang === 'vi' ? 'Advanced Lab đã lưu:' : 'Advanced Lab saved:'}</b> {lastMediaPipeRecord.uploadPath}
            </div>
          )}
        </div>
      </section>

      <div className="wc-tabs">
        <button type="button" className={`wc-tab-btn${activeTab === 'webcam' ? ' active' : ''}`} onClick={() => setActiveTab('webcam')}>
          🎥 AI Vision Webcam
        </button>
        <button type="button" className={`wc-tab-btn${activeTab === 'advanced' ? ' active' : ''}`} onClick={() => setActiveTab('advanced')}>
          🧪 Advanced Lab (MediaPipe)
        </button>
      </div>

      {activeTab === 'webcam' && (
        <AIVisionWebcam onViewMedicalRecord={onViewMedicalRecord} />
      )}

      {activeTab === 'advanced' && (
        <>
          <button type="button" className="ai-vision-medical-record-button inline" onClick={onViewMedicalRecord} style={{ marginBottom: 4 }}>
            {lang === 'vi' ? 'Xem hình tại Medical Records' : 'View image in Medical Records'}
          </button>
          <section className="ai-healthcare-vision-frame-card" aria-label="AI Healthcare Vision MediaPipe app">
            <iframe
              title="AI Healthcare Vision"
              src={MEDIAPIPE_APP_URL}
              className="ai-healthcare-vision-frame"
              allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </section>
        </>
      )}

      <NavButtons onNext={onNext} nextLabel={nextLabel || (lang === 'vi' ? 'Góc xả stress' : 'Stress Relief Corner')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
