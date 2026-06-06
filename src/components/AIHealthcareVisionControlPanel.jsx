import React, { useEffect, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { detectFileType, fileToBase64, fileToDataUrl, saveRecord } from '../lib/medicalStorage.js'
import { notifyUpload } from '../hooks/useMedicalData.js'

const MEDIAPIPE_APP_URL = '/src/mediapipe-khanh/index.html#/vision/object_detector'


function safeUploadSegment(value) {
  return (value || 'guest')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest'
}

function makeVisionFilename(prefix, originalName = 'camera.jpg') {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}_${stamp}.${ext || 'jpg'}`
}

function getVisionUploadFolder(user) {
  return `upload/${safeUploadSegment(user?.email || user?.name || 'guest')}/ai-healthcare-vision-control`
}

function dataUrlToFile(dataUrl, filename) {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta?.match(/data:(.*?);base64/)?.[1] || 'image/jpeg'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

async function saveVisionControlImage(file, { user, lang, label }) {
  const [dataUrl, base64Data] = await Promise.all([fileToDataUrl(file), fileToBase64(file)])
  const uploadFolder = getVisionUploadFolder(user)
  const filename = makeVisionFilename('ai_healthcare_vision', file.name)
  const uploadPath = `${uploadFolder}/${filename}`
  const fileType = detectFileType(file.type, filename)
  const record = {
    id: `vision_control_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    filename,
    name: filename,
    fileType,
    type: fileType,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl,
    base64Data,
    notes: lang === 'vi' ? `${label} · lưu tại ${uploadPath}` : `${label} · saved at ${uploadPath}`,
    ownerEmail: user?.email || null,
    ownerName: user?.name || '',
    ownerAvatar: user?.avatar || '',
    ownerProvider: user?.provider || '',
    sourceModule: 'ai-healthcare-vision-control',
    uploadFolder,
    uploadPath,
  }

  await saveRecord(record, {
    ownerEmail: user?.email,
    ownerName: user?.name,
    ownerAvatar: user?.avatar,
    ownerProvider: user?.provider,
  })
  notifyUpload()
  return record
}

export default function AIHealthcareVisionControlPanel({ onNext, onPrev, prevLabel, onViewMedicalRecord }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const [lastMediaPipeRecord, setLastMediaPipeRecord] = useState(null)

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
  }, [lang, user])

  return (
    <div className="animate-fade ai-healthcare-vision-page">
      <section className="ai-healthcare-vision-header">
        <div>
          <div className="ai-healthcare-vision-kicker">AI HEALTHCARE VISION CONTROL</div>
          <h2>🧠 AI Healthcare Vision Control</h2>
          <p>
            {lang === 'vi'
              ? 'Giữ toàn bộ MediaPipe Tasks trong một màn hình điều khiển. Cụm nút Camera được gắn quanh Webcam của MediaPipe để mở camera, lưu ảnh Webcam vào Upload Records và upload hình trong máy.'
              : 'Keeps the full MediaPipe Tasks console. Camera controls are attached around the MediaPipe Webcam so users can open the camera, save Webcam captures into Upload Records, and upload local images.'}
          </p>
          {lastMediaPipeRecord && (
            <>
              <div className="ai-vision-upload-path" style={{ marginTop: 10 }}>
                <b>{lang === 'vi' ? 'MediaPipe đã lưu:' : 'MediaPipe saved:'}</b> {lastMediaPipeRecord.uploadPath}
              </div>
              <button type="button" className="ai-vision-medical-record-button inline" onClick={onViewMedicalRecord}>
                {lang === 'vi' ? 'Xem hình tại Medical Records' : 'View image in Medical Records'}
              </button>
            </>
          )}
        </div>
      </section>

      <VisionCameraControls onViewMedicalRecord={onViewMedicalRecord} />

      <section className="ai-healthcare-vision-frame-card" aria-label="AI Healthcare Vision Control MediaPipe app">
        <iframe
          title="AI Healthcare Vision Control"
          src={MEDIAPIPE_APP_URL}
          className="ai-healthcare-vision-frame"
          allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>

      <NavButtons onNext={onNext} nextLabel={`${lang === 'vi' ? 'Góc xả stress' : 'Stress Relief Corner'} →`} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
