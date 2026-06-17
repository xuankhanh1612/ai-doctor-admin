import React, { useEffect, useMemo, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { completeHealthJourneyActivity, getTaskSnapshot, HEALTH_JOURNEY_EVENT } from './health-journey-game/services/healthJourneyStorage.js'
import { syncBeMeoWater } from './health-journey-game/services/waterProofUpload.js'
import AIVisionWebcam from './webcam/AIVisionWebcam.jsx'
// @ts-ignore Vite raw HTML import
import waterDrinkTrackerHtml from '../waterdrink-khanh/waterdrink_tracker.html?raw'

import meoNhayMatUrl from '../waterdrink-khanh/MeoNhayMat.JPG'
import meoBuAiUrl from '../waterdrink-khanh/MeoBuAI.JPG'
import meoNuocAiUrl from '../waterdrink-khanh/MeoNuocAI.JPG'
import robotTuThe1Url from '../waterdrink-khanh/Robot-mang-giong-noi-nguoi-thuong-ren-hoc-sinh-ngoi-dung-tu-the-1.jpg'
import robotTuThe2Url from '../waterdrink-khanh/Robot-mang-giong-noi-nguoi-thuong-ren-hoc-sinh-ngoi-dung-tu-the-2.jpg'

export default function WaterDrinkChatBotPanel({ onNext, onPrev, prevLabel, nextLabel, onViewMedicalRecord }) {
  const { theme } = useApp()
  const { user } = useAuth()
  const isDark = theme === 'dark'

  const [snapshot, setSnapshot] = useState(() => getTaskSnapshot(user))

  // Danh sách các lần uống nước đã lưu ảnh: { id, uploadPath, dataUrl, timestamp, ml }
  const [waterProofList, setWaterProofList] = useState([])

  // URL ảnh đang xem lại — truyền vào AIVisionWebcam để hiện chế độ review
  const [reviewImageUrl, setReviewImageUrl] = useState(null)

  // Lắng nghe sự kiện Health Journey & chatbot uống nước
  useEffect(() => {
    const refresh = () => setSnapshot(getTaskSnapshot(user))
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'BE_MEO_WATER_ADDED') {
        completeHealthJourneyActivity({
          user,
          activityType: 'drink_water',
          value: 1,
          metadata: {
            source: event.data.source || 'be-meo-nuoc-chat',
            waterAmountMl: event.data.amount || 150,
            flow: 'Bé Mèo Nước -> Health Journey Game sync',
          },
        })
        refresh()
      }
    }
    window.addEventListener(HEALTH_JOURNEY_EVENT, refresh)
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener(HEALTH_JOURNEY_EVENT, refresh)
      window.removeEventListener('message', onMessage)
    }
  }, [user])

  // Callback từ AIVisionWebcam: ảnh đã được confirm lưu thành công
  const handleCaptureSaved = (record) => {
    try {
      completeHealthJourneyActivity({
        user,
        activityType: 'drink_water',
        value: 1,
        proofImage: record.uploadPath,
        uploadRecord: record,
        metadata: {
          source: 'be-meo-nuoc-ai-vision-webcam',
          flow: 'Bé Mèo Nước -> AI Healthcare Vision Webcam -> drink_water proof',
        },
      })
      syncBeMeoWater(150, 'Bé Mèo Nước AI Healthcare Vision')
      setWaterProofList(prev => [...prev, {
        id: Date.now(),
        uploadPath: record.uploadPath,
        dataUrl: record.dataUrl || null,
        timestamp: new Date(),
        ml: 150,
        kind: record.fileType || 'webcam',
      }])
      setSnapshot(getTaskSnapshot(user))
    } catch (error) {
      console.error('WaterDrinkChatBotPanel handleCaptureSaved error:', error)
    }
  }

  const html = useMemo(() => waterDrinkTrackerHtml
    .replaceAll('__MEO_NHAY_MAT__', meoNhayMatUrl)
    .replaceAll('__MEO_BU_AI__', meoBuAiUrl)
    .replaceAll('__MEO_NUOC_AI__', meoNuocAiUrl)
    .replaceAll('__ROBOT_TU_THE_1__', robotTuThe1Url)
    .replaceAll('__ROBOT_TU_THE_2__', robotTuThe2Url), [])

  const todayWater = snapshot.day?.tasks?.find((t) => t.taskId === 'water')
  const chapterWater = snapshot.journeyUser?.journeyProgress?.objectives?.find((o) => o.activityType === 'drink_water')

  return (
    <div style={{ minHeight: '100%', background: isDark ? '#050b18' : '#eef8ff', padding: '22px clamp(14px, 3vw, 28px) 36px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NavButtons onNext={onNext} nextLabel={nextLabel || 'Buổi Sáng'} onPrev={onPrev} prevLabel={prevLabel} />

        <style>{`
          @media (max-width: 860px) { .bemeo-chatbot-iframe { min-height: 1800px !important; } }
          .bemeo-proof-btn {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 7px 14px; border-radius: 10px; border: none; cursor: pointer;
            font-size: 12px; font-weight: 800; font-family: inherit;
            color: #fff; box-shadow: 0 4px 12px rgba(14,165,233,0.28);
            transition: opacity 0.15s; align-self: flex-start;
          }
          .bemeo-proof-btn:hover { opacity: 0.85; }
          .bemeo-proof-entry {
            padding: 10px 14px; border-radius: 14px;
            border: 1px solid rgba(34,197,94,0.30);
            background: rgba(34,197,94,0.07);
            display: flex; flex-direction: column; gap: 8px;
          }
          .bemeo-proof-meta {
            font-size: 11px; font-weight: 700; color: #22c55e;
            display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          }
        `}</style>

        {/* ===== CAMERA: AI Healthcare Vision ===== */}
        <section style={{
          borderRadius: 28,
          border: `1px solid ${isDark ? 'rgba(125,211,252,0.28)' : 'rgba(14,165,233,0.24)'}`,
          background: isDark
            ? 'linear-gradient(135deg, rgba(8,47,73,0.94), rgba(15,23,42,0.96))'
            : 'linear-gradient(135deg, #fff, #e0f7ff)',
          padding: 20,
          boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.35)' : '0 24px 70px rgba(14,165,233,0.16)',
        }}>

          {/* Header */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: isDark ? '#67e8f9' : '#0284c7', marginBottom: 4 }}>
              HEALTH JOURNEY GAME · WATER PROOF · AI HEALTHCARE VISION
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 26, color: isDark ? '#f0f9ff' : '#075985' }}>
              🐱💧 Bé Mèo Nước — Camera AI Healthcare Vision
            </h2>
            <p style={{ margin: 0, color: isDark ? '#bae6fd' : '#0369a1', lineHeight: 1.6, fontSize: 13 }}>
              Chụp ảnh chai nước bằng <b>AI Healthcare Vision</b> → Object Detection overlay →
              Activity <b>drink_water</b> → <b>+10 XP</b> → <b>+150ml</b> Bé Mèo → lưu sang Upload Records.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              <span style={statPill(isDark)}>Hôm nay: {todayWater?.current || 0}/{todayWater?.target || 1}</span>
              <span style={statPill(isDark)}>Chapter 1: {chapterWater?.current || 0}/{chapterWater?.target || 30}</span>
              <span style={statPill(isDark)}>XP: {snapshot.journeyUser?.profile?.xp || 0}</span>
              <span style={statPill(isDark)}>Coin: {snapshot.journeyUser?.profile?.coins || 0}</span>
            </div>

            {/* Danh sách lần uống nước có ảnh */}
            {waterProofList.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: isDark ? '#67e8f9' : '#0284c7' }}>
                  📸 Ảnh uống nước đã chụp hôm nay ({waterProofList.length} lần):
                </div>
                {waterProofList.map((entry, idx) => (
                  <div key={entry.id} className="bemeo-proof-entry">
                    <div className="bemeo-proof-meta">
                      <span>✅ Lần {idx + 1}</span>
                      <span>+{entry.ml}ml</span>
                      <span>+10 XP</span>
                      <span>
                        {entry.timestamp.toLocaleTimeString('vi-VN', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </span>
                      {entry.uploadPath && (
                        <span style={{ color: isDark ? '#7dd3fc' : '#0369a1', fontSize: 10, fontWeight: 600 }}>
                          📁 {entry.uploadPath}
                        </span>
                      )}
                    </div>
                    {/* Nút Xem lại ảnh đã chụp — chỉ hiện nếu có dataUrl */}
                    {entry.dataUrl && (
                      <button
                        type="button"
                        className="bemeo-proof-btn"
                        onClick={() => setReviewImageUrl(reviewImageUrl === entry.dataUrl ? null : entry.dataUrl)}
                        style={{
                          background: reviewImageUrl === entry.dataUrl
                            ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
                            : 'linear-gradient(135deg,#0ea5e9,#0284c7)',
                        }}
                      >
                        {reviewImageUrl === entry.dataUrl ? '✕ Đóng xem lại' : '🔍 Xem lại ảnh đã chụp'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onViewMedicalRecord?.() ?? window.dispatchEvent(new CustomEvent('navigate-to-upload'))}
              style={{
                marginTop: 14, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#0ea5e9,#14b8a6)', color: '#fff', fontWeight: 700, fontSize: 12,
              }}
            >
              Xem hình tại Medical Records
            </button>
          </div>

          {/* AI Healthcare Vision Webcam */}
          <div style={{
            borderRadius: 22, overflow: 'hidden',
            background: '#020617',
            border: '1px solid rgba(125,211,252,0.28)',
          }}>
            <div style={{
              padding: '8px 14px',
              borderBottom: '1px solid rgba(125,211,252,0.18)',
              background: 'rgba(8,47,73,0.55)',
              color: '#bae6fd', fontSize: 11, fontWeight: 700,
            }}>
              🎥 AI Healthcare Vision · Object Detection · Bé Mèo Nước Camera
            </div>
            <div style={{ padding: 14 }}>
              <AIVisionWebcam
                onViewMedicalRecord={onViewMedicalRecord}
                onCaptureSaved={handleCaptureSaved}
                reviewImageUrl={reviewImageUrl}
                onExitReview={() => setReviewImageUrl(null)}
              />
            </div>
          </div>
        </section>

        {/* ===== CHATBOT IFRAME ===== */}
        <div style={{
          borderRadius: 28, overflow: 'hidden',
          border: `1px solid ${isDark ? 'rgba(125,211,252,0.26)' : 'rgba(14,165,233,0.24)'}`,
          boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.42)' : '0 24px 70px rgba(14,165,233,0.18)',
          background: '#fff',
        }}>
          <iframe
            title="Bé Mèo Nước chatbot"
            srcDoc={html}
            className="bemeo-chatbot-iframe"
            style={{ width: '100%', minHeight: '1100px', border: 0, display: 'block', background: '#eef8ff' }}
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
