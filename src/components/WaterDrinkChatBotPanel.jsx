import React, { useEffect, useMemo, useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { completeHealthJourneyActivity, getTaskSnapshot, HEALTH_JOURNEY_EVENT } from './health-journey-game/services/healthJourneyStorage.js'
import { dataUrlToFile, drawAIWaterBottleOverlay, saveWaterProofImage, syncBeMeoWater } from './health-journey-game/services/waterProofUpload.js'
// @ts-ignore Vite raw HTML import
import waterDrinkTrackerHtml from '../waterdrink-khanh/waterdrink_tracker.html?raw'

import meoNhayMatUrl from '../waterdrink-khanh/MeoNhayMat.JPG'
import meoBuAiUrl from '../waterdrink-khanh/MeoBuAI.JPG'
import meoNuocAiUrl from '../waterdrink-khanh/MeoNuocAI.JPG'
import robotTuThe1Url from '../waterdrink-khanh/Robot-mang-giong-noi-nguoi-thuong-ren-hoc-sinh-ngoi-dung-tu-the-1.jpg'
import robotTuThe2Url from '../waterdrink-khanh/Robot-mang-giong-noi-nguoi-thuong-ren-hoc-sinh-ngoi-dung-tu-the-2.jpg'

const MEDIAPIPE_OBJECT_DETECTION_WEBCAM_URL = '/src/mediapipe-khanh/index.html?mode=webcam#/vision/object_detector'

export default function WaterDrinkChatBotPanel({ onNext, onPrev, prevLabel, nextLabel }) {
  const { theme } = useApp()
  const { user } = useAuth()
  const isDark = theme === 'dark'
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [snapshot, setSnapshot] = useState(() => getTaskSnapshot(user))

  useEffect(() => {
    const refresh = () => setSnapshot(getTaskSnapshot(user))
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'BE_MEO_WATER_ADDED') return
      completeHealthJourneyActivity({
        user,
        activityType: 'drink_water',
        value: 1,
        metadata: { source: event.data.source || 'be-meo-nuoc-chat', waterAmountMl: event.data.amount || 150, flow: 'Bé Mèo Nước -> Health Journey Game sync' },
      })
    }
    window.addEventListener(HEALTH_JOURNEY_EVENT, refresh)
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener(HEALTH_JOURNEY_EVENT, refresh)
      window.removeEventListener('message', onMessage)
    }
  }, [user])

  useEffect(() => () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop())
  }, [])


  useEffect(() => {
    const onMediaPipeCapture = async (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'AI_CLINIC_MEDIAPIPE_WEBCAM_CAPTURE' || !event.data?.dataUrl) return

      setSaving(true)
      setCameraError('')
      try {
        const file = dataUrlToFile(event.data.dataUrl, event.data.filename || 'be_meo_nuoc_ai_webcam.jpg')
        const record = await saveWaterProofImage(file, user, {
          source: 'be-meo-nuoc-ai-healthcare-vision-webcam',
          notesPrefix: 'Bé Mèo Nước · AI Healthcare Vision Control · Object Detection Webcam',
          activityType: 'drink_water',
          taskId: 'water',
          xpEarned: 10,
          waterAmountMl: 150,
          proofType: 'ai_healthcare_vision_object_detection_webcam_overlay',
        })
        const result = completeHealthJourneyActivity({
          user,
          activityType: 'drink_water',
          value: 1,
          proofImage: record.uploadPath,
          uploadRecord: record,
          metadata: { source: 'be-meo-nuoc-ai-healthcare-vision-webcam', flow: 'Bé Mèo Nước -> AI Healthcare Vision Object Detection Webcam -> drink_water proof' },
        })
        const beMeoSync = syncBeMeoWater(150, 'Bé Mèo Nước AI Healthcare Vision')
        setLastResult({ record, beMeoSync, ...result })
        event.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVED', captureKind: 'webcam', uploadPath: record.uploadPath }, event.origin)
      } catch (error) {
        setCameraError(error?.message || 'Không thể lưu ảnh AI Healthcare Vision proof.')
        event.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVE_FAILED', captureKind: 'webcam', message: error?.message || String(error) }, event.origin)
      } finally {
        setSaving(false)
      }
    }

    window.addEventListener('message', onMediaPipeCapture)
    return () => window.removeEventListener('message', onMediaPipeCapture)
  }, [user])

  const html = useMemo(() => waterDrinkTrackerHtml
    .replaceAll('__MEO_NHAY_MAT__', meoNhayMatUrl)
    .replaceAll('__MEO_BU_AI__', meoBuAiUrl)
    .replaceAll('__MEO_NUOC_AI__', meoNuocAiUrl)
    .replaceAll('__ROBOT_TU_THE_1__', robotTuThe1Url)
    .replaceAll('__ROBOT_TU_THE_2__', robotTuThe2Url), [])

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch (error) {
      setCameraError(error?.message || 'Không thể mở Webcam. Hãy cấp quyền camera cho trình duyệt.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  const captureBottle = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setSaving(true)
    setCameraError('')
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      drawAIWaterBottleOverlay(ctx, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const file = dataUrlToFile(dataUrl, 'water_bottle.jpg')
      const record = await saveWaterProofImage(file, user)
      const result = completeHealthJourneyActivity({
        user,
        activityType: 'drink_water',
        value: 1,
        proofImage: record.uploadPath,
        uploadRecord: record,
        metadata: { source: 'be-meo-nuoc-webcam', flow: 'User chụp ảnh chai nước -> drink_water -> +10 XP' },
      })
      const beMeoSync = syncBeMeoWater(150, 'Bé Mèo Nước Webcam')
      setLastResult({ record, beMeoSync, ...result })
      stopCamera()
    } catch (error) {
      setCameraError(error?.message || 'Không thể lưu ảnh chai nước.')
    } finally {
      setSaving(false)
    }
  }

  const todayWater = snapshot.day?.tasks?.find((task) => task.taskId === 'water')
  const chapterWater = snapshot.journeyUser?.journeyProgress?.objectives?.find((objective) => objective.activityType === 'drink_water')

  return (
    <div style={{ minHeight: '100%', background: isDark ? '#050b18' : '#eef8ff', padding: '22px clamp(14px, 3vw, 28px) 36px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NavButtons
          onNext={onNext}
          nextLabel={nextLabel || 'Print Portal'}
          onPrev={onPrev}
          prevLabel={prevLabel}
        />

        <section style={{ borderRadius: 28, border: `1px solid ${isDark ? 'rgba(125,211,252,0.28)' : 'rgba(14,165,233,0.24)'}`, background: isDark ? 'linear-gradient(135deg, rgba(8,47,73,0.94), rgba(15,23,42,0.96))' : 'linear-gradient(135deg, #fff, #e0f7ff)', padding: 18, boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.35)' : '0 24px 70px rgba(14,165,233,0.16)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(280px, 0.95fr)', gap: 16, alignItems: 'stretch' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: isDark ? '#67e8f9' : '#0284c7' }}>HEALTH JOURNEY GAME · WATER PROOF</div>
              <h2 style={{ margin: '6px 0 8px', fontSize: 28, color: isDark ? '#f0f9ff' : '#075985' }}>🐱💧 Bé Mèo Nước Webcam</h2>
              <p style={{ margin: 0, color: isDark ? '#bae6fd' : '#0369a1', lineHeight: 1.55 }}>
                User chụp ảnh chai nước → AI overlay Object Detection → Activity <b>drink_water</b> → Task Uống nước hoàn thành → <b>+10 XP</b> → Journey Chapter 1 +1/30 → Bé Mèo chat <b>+150ml</b> → ảnh được lưu sang Upload Records.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                <span style={statPill(isDark)}>Hôm nay: {todayWater?.current || 0}/{todayWater?.target || 1}</span>
                <span style={statPill(isDark)}>Chapter 1: {chapterWater?.current || 0}/{chapterWater?.target || 30}</span>
                <span style={statPill(isDark)}>XP: {snapshot.journeyUser?.profile?.xp || 0}</span>
                <span style={statPill(isDark)}>Coin: {snapshot.journeyUser?.profile?.coins || 0}</span>
              </div>
              {lastResult && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 16, background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.28)', color: isDark ? '#bbf7d0' : '#166534', fontWeight: 800 }}>
                  ✓ Đã xác nhận uống nước: +{lastResult.activity.xpEarned} XP · Bé Mèo +150ml · ảnh AI overlay lưu tại {lastResult.record.uploadPath}
                </div>
              )}
              {cameraError && <div style={{ marginTop: 12, color: '#fecaca', background: 'rgba(239,68,68,.18)', padding: 10, borderRadius: 12 }}>{cameraError}</div>}
            </div>

            <div style={{ borderRadius: 22, overflow: 'hidden', background: '#020617', border: '1px solid rgba(125,211,252,0.28)', minHeight: 560, position: 'relative' }}>
              <div style={{ padding: 10, borderBottom: '1px solid rgba(125,211,252,0.22)', background: 'rgba(8,47,73,0.42)', color: '#bae6fd', fontSize: 12, lineHeight: 1.45 }}>
                <b>AI Healthcare Vision Control · Object Detection · Webcam</b><br />
                Mở Webcam, xem nhận diện realtime trên lớp phủ AI thật, rồi bấm <b>Lưu Hình</b> để lưu ảnh kèm overlay và cộng thêm lượt uống nước.
              </div>
              <iframe
                title="Bé Mèo Nước AI Healthcare Vision Object Detection Webcam"
                src={MEDIAPIPE_OBJECT_DETECTION_WEBCAM_URL}
                style={{ width: '100%', minHeight: 520, border: 0, display: 'block', background: '#020617' }}
                allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </section>

        <div style={{ borderRadius: 28, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(125,211,252,0.26)' : 'rgba(14,165,233,0.24)'}`, boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.42)' : '0 24px 70px rgba(14,165,233,0.18)', background: '#fff' }}>
          <iframe
            title="Bé Mèo Nước chatbot"
            srcDoc={html}
            style={{ width: '100%', minHeight: '820px', border: 0, display: 'block', background: '#eef8ff' }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  )
}

function statPill(isDark) {
  return {
    border: `1px solid ${isDark ? 'rgba(125,211,252,0.30)' : 'rgba(14,165,233,0.22)'}`,
    color: isDark ? '#e0f2fe' : '#075985',
    background: isDark ? 'rgba(15,23,42,0.74)' : 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    padding: '8px 11px',
    fontSize: 12,
    fontWeight: 900,
  }
}

function cameraButton(primary) {
  return {
    flex: 1,
    border: primary ? 'none' : '1px solid rgba(125,211,252,0.36)',
    background: primary ? 'linear-gradient(135deg,#0ea5e9,#14b8a6)' : 'rgba(15,23,42,0.9)',
    color: '#fff',
    borderRadius: 12,
    padding: '11px 14px',
    fontWeight: 900,
    cursor: 'pointer',
  }
}
