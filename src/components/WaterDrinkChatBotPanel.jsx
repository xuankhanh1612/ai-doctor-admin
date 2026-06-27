import React, { useEffect, useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { completeHealthJourneyActivity, getTaskSnapshot, HEALTH_JOURNEY_EVENT } from './health-journey-game/services/healthJourneyStorage.js'
import { syncBeMeoWater, saveWaterProofImage } from './health-journey-game/services/waterProofUpload.js'
import { getAllRecords } from '../lib/medicalStorage.js'
import AIVisionWebcam from './webcam/AIVisionWebcam.jsx'
import { mountBeMeoWidget } from '../waterdrink-khanh/beMeoWidget.js'

import meoNhayMatUrl from '../waterdrink-khanh/MeoNhayMat.JPG'
import meoBuAiUrl from '../waterdrink-khanh/MeoBuAI.JPG'
import meoNuocAiUrl from '../waterdrink-khanh/MeoNuocAI.JPG'
import robotTuThe1Url from '../waterdrink-khanh/Robot-mang-giong-noi-nguoi-thuong-ren-hoc-sinh-ngoi-dung-tu-the-1.jpg'
import robotTuThe2Url from '../waterdrink-khanh/Robot-mang-giong-noi-nguoi-thuong-ren-hoc-sinh-ngoi-dung-tu-the-2.jpg'

export default function WaterDrinkChatBotPanel({ onNext, onPrev, prevLabel, nextLabel, onViewMedicalRecord }) {
  const { theme } = useApp()
  const { user, loading: authLoading } = useAuth()
  const isDark = theme === 'dark'

  const [snapshot, setSnapshot] = useState(() => getTaskSnapshot(user))
  const [reviewImageUrl, setReviewImageUrl] = useState(null)

  // Host <div> chứa Shadow DOM của Bé Mèo Nước
  const hostRef = useRef(null)

  // proofId cuối cùng nhận từ BE_MEO_WATER_ADDED (chờ ảnh camera gán vào)
  const pendingProofIdRef = useRef(null)

  // Lưu toàn bộ proofId→dataUrl trong React memory để restore khi widget remount
  const proofMapRef = useRef({})

  // === Inject widget Bé Mèo Nước vào Shadow DOM — gọi mountBeMeoWidget() trực tiếp,
  // nhận cleanup function trả về ngay lập tức (không cần window.__beMeoNuocPendingCleanup__).
  // Đợi AuthContext khôi phục session xong (authLoading=false) trước khi mount, để widget
  // luôn nhận đúng uuid user ngay từ đầu — tránh lưu nhầm dữ liệu vào nhóm 'guest'.
  const [widgetReady, setWidgetReady] = useState(false)
  // `uuid` là field nhận diện thống nhất cho mọi loại user (guest hay đã đăng nhập),
  // dùng để khoá lưu trữ IndexedDB thay cho email.
  const userKey = user?.uuid || null
  useEffect(() => {
    if (authLoading) return // chờ session khôi phục xong, tránh mount với uuid=null rồi phải remount
    const host = hostRef.current
    if (!host) return
    let shadow = host.shadowRoot
    if (!shadow) shadow = host.attachShadow({ mode: 'open' })

    const cleanup = mountBeMeoWidget(shadow, {
      meoNhayMatUrl,
      meoBuAiUrl,
      meoNuocAiUrl,
      robotTuThe1Url,
      robotTuThe2Url,
    }, userKey)

    setWidgetReady(true)
    return () => {
      cleanup()
      setWidgetReady(false)
    }
  }, [authLoading, userKey]) // remount nếu user đăng nhập/đăng xuất/đổi user trong session

  // Nạp proofMap từ IndexedDB khi auth sẵn sàng
  const [proofMapReady, setProofMapReady] = useState(false)
  const proofMapReadyRef = useRef(false)

  useEffect(() => {
    // Chờ AuthContext khôi phục session xong để tránh fetch với user=null
    if (authLoading) return
    let cancelled = false
    setProofMapReady(false)
    proofMapReadyRef.current = false
    getAllRecords({ ownerUuid: user?.uuid })
      .then((records) => {
        if (cancelled) return
        records.forEach((record) => {
          if (record?.beMeoProofId && record?.dataUrl) {
            proofMapRef.current[record.beMeoProofId] = record.dataUrl
          }
        })
        proofMapReadyRef.current = true
        setProofMapReady(true)
      })
      .catch((err) => {
        console.error('WaterDrinkChatBotPanel: lỗi nạp proofMap từ IndexedDB', err)
        // KHÔNG đánh dấu ready khi lỗi — tránh gửi validProofIds rỗng làm widget xóa hết proof
      })
    return () => { cancelled = true }
  }, [user, authLoading])

  // Gửi toàn bộ proofMap vào widget khi cả widget và proofMap đều sẵn sàng
  useEffect(() => {
    if (!widgetReady || !proofMapReady) return
    const entries = Object.entries(proofMapRef.current)
      .filter(([, dataUrl]) => dataUrl && dataUrl !== '__PENDING__')
      .map(([proofId, dataUrl]) => ({ proofId, dataUrl }))
    const validProofIds = entries.map(({ proofId }) => proofId)
    window.postMessage({
      type: 'BE_MEO_PROOF_BULK_RESTORE',
      proofMapEntries: entries,
      validProofIds,
    }, '*')
  }, [widgetReady, proofMapReady])

  // Lắng nghe message từ widget
  useEffect(() => {
    const refresh = () => setSnapshot(getTaskSnapshot(user))

    const bulkRestoreToWidget = (filterIds) => {
      const entries = Object.entries(proofMapRef.current)
        .filter(([pid, dataUrl]) => {
          if (!dataUrl || dataUrl === '__PENDING__') return false
          if (filterIds && !filterIds.includes(pid)) return false
          return true
        })
        .map(([proofId, dataUrl]) => ({ proofId, dataUrl }))
      const payload = { type: 'BE_MEO_PROOF_BULK_RESTORE', proofMapEntries: entries }
      if (proofMapReadyRef.current) {
        payload.validProofIds = entries.map(({ proofId }) => proofId)
      }
      window.postMessage(payload, '*')
    }

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
        if (event.data.proofId) {
          pendingProofIdRef.current = event.data.proofId
        }
        refresh()
        return
      }

      if (event.data?.type === 'BE_MEO_PROOF_RESTORE_REQUEST') {
        bulkRestoreToWidget(event.data.pendingProofIds)
        return
      }

      if (event.data?.type === 'BE_MEO_REVIEW_REQUEST' && event.data.dataUrl) {
        setReviewImageUrl(event.data.dataUrl)
        return
      }

      if (event.data?.type === 'BE_MEO_REVIEW_CLOSE') {
        setReviewImageUrl(null)
        return
      }
    }

    window.addEventListener(HEALTH_JOURNEY_EVENT, refresh)
    window.addEventListener('message', onMessage)

    const onTaskProof = (e) => {
      const { proofId, dataUrl } = e.detail || {}
      if (!proofId || !dataUrl) return
      proofMapRef.current[proofId] = dataUrl
      // Widget Bé Mèo Nước đã tự cộng nước + tạo dòng chat qua SYNC_EVENT (syncBeMeoWater) rồi —
      // ở đây chỉ cần gửi ảnh để widget gắn vào đúng dòng chat khớp theo proofId.
      window.postMessage({ type: 'BE_MEO_PROOF_SAVED', proofId, dataUrl }, '*')
    }
    window.addEventListener('BE_MEO_TASK_PROOF_SAVED', onTaskProof)

    const onTaskProofDeleted = (e) => {
      const { proofId } = e.detail || {}
      if (!proofId) return
      delete proofMapRef.current[proofId]
      window.postMessage({ type: 'BE_MEO_PROOF_DELETED', proofId }, '*')
    }
    window.addEventListener('BE_MEO_TASK_PROOF_DELETED', onTaskProofDeleted)

    return () => {
      window.removeEventListener(HEALTH_JOURNEY_EVENT, refresh)
      window.removeEventListener('message', onMessage)
      window.removeEventListener('BE_MEO_TASK_PROOF_SAVED', onTaskProof)
      window.removeEventListener('BE_MEO_TASK_PROOF_DELETED', onTaskProofDeleted)
    }
  }, [user])

  const sendProofToWidget = (proofId, dataUrl) => {
    window.postMessage({ type: 'BE_MEO_PROOF_SAVED', proofId, dataUrl }, '*')
  }

  const onSaveCapture = (file, { kind }) => {
    const proofId = pendingProofIdRef.current || ('proof_cam_' + Date.now())
    if (!pendingProofIdRef.current) pendingProofIdRef.current = proofId
    return saveWaterProofImage(file, user, {
      source:        `be-meo-nuoc-ai-vision-${kind}`,
      notesPrefix:   'Bé Mèo Nước · AI Healthcare Vision',
      activityType:  'drink_water',
      taskId:        'water',
      xpEarned:      10,
      waterAmountMl: 150,
      proofType:     `ai_healthcare_vision_${kind}_overlay`,
      beMeoProofId:  proofId,
    })
  }

  const handleCaptureSaved = async (record) => {
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
      const proofId = pendingProofIdRef.current || ('proof_cam_' + Date.now())

      // syncBeMeoWater ghi trực tiếp vào IndexedDB (đúng theo user.uuid) — hoạt động
      // đúng dù widget Bé Mèo Nước có đang mount hay không, rồi phát event để widget
      // (nếu đang mount) cập nhật UI ngay với đúng proofId này.
      const syncResult = await syncBeMeoWater(150, 'Bé Mèo Nước AI Healthcare Vision', proofId, user?.uuid)
      setSnapshot(getTaskSnapshot(user))

      if (record.dataUrl) {
        proofMapRef.current[proofId] = record.dataUrl
        // Gửi ảnh để widget gắn vào đúng dòng chat (khớp theo proofId vừa truyền ở trên).
        sendProofToWidget(proofId, record.dataUrl)
        pendingProofIdRef.current = null
      }
    } catch (error) {
      console.error('WaterDrinkChatBotPanel handleCaptureSaved error:', error)
    }
  }

  const todayWater = snapshot.day?.tasks?.find((t) => t.taskId === 'water')
  const chapterWater = snapshot.journeyUser?.journeyProgress?.objectives?.find((o) => o.activityType === 'drink_water')

  return (
    <div style={{ minHeight: '100%', background: isDark ? '#050b18' : '#eef8ff', padding: '22px clamp(14px, 3vw, 28px) 36px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <style>{`
          .bemeo-chatbot-host { width: 100%; min-height: 1100px; display: block; }
          @media (max-width: 860px) { .bemeo-chatbot-host { min-height: 1800px !important; } }
        `}</style>

        {/* ===== CHATBOT WIDGET (Shadow DOM) ===== */}
        <div style={{
          borderRadius: 28, overflow: 'hidden',
          border: `1px solid ${isDark ? 'rgba(125,211,252,0.26)' : 'rgba(14,165,233,0.24)'}`,
          boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.42)' : '0 24px 70px rgba(14,165,233,0.18)',
          background: '#fff',
        }}>
          <div
            ref={hostRef}
            role="group"
            aria-label="Bé Mèo Nước chatbot"
            className="bemeo-chatbot-host"
          />
        </div>

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
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: isDark ? '#67e8f9' : '#0284c7', marginBottom: 4 }}>
              HEALTH JOURNEY GAME · WATER PROOF · AI HEALTHCARE VISION
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 26, color: isDark ? '#f0f9ff' : '#075985' }}>
              🐱💧 Bé Mèo Nước — Camera AI Healthcare Vision
            </h2>
            <p style={{ margin: 0, color: isDark ? '#bae6fd' : '#0369a1', lineHeight: 1.6, fontSize: 13 }}>
              Nhắn lượng nước trong chat → rồi chụp ảnh bằng <b>AI Healthcare Vision</b> để xác nhận proof →
              nút <b>🔍 Xem lại ảnh đã chụp</b> sẽ hiện ngay dưới dòng thời gian của tin nhắn đó trong chat.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              <span style={statPill(isDark)}>Hôm nay: {todayWater?.current || 0}/{todayWater?.target || 1}</span>
              <span style={statPill(isDark)}>Chapter 1: {chapterWater?.current || 0}/{chapterWater?.target || 30}</span>
              <span style={statPill(isDark)}>XP: {snapshot.journeyUser?.profile?.xp || 0}</span>
              <span style={statPill(isDark)}>Coin: {snapshot.journeyUser?.profile?.coins || 0}</span>
            </div>
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

          <div style={{ borderRadius: 22, overflow: 'hidden', background: '#020617', border: '1px solid rgba(125,211,252,0.28)' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(125,211,252,0.18)', background: 'rgba(8,47,73,0.55)', color: '#bae6fd', fontSize: 11, fontWeight: 700 }}>
              🎥 AI Healthcare Vision · Object Detection · Bé Mèo Nước Camera
            </div>
            <div style={{ padding: 14 }}>
              <AIVisionWebcam
                onViewMedicalRecord={onViewMedicalRecord}
                onCaptureSaved={handleCaptureSaved}
                onSaveCapture={onSaveCapture}
                reviewImageUrl={reviewImageUrl}
                onExitReview={() => setReviewImageUrl(null)}
              />
            </div>
          </div>
        </section>

        {/* ===== NAV BUTTONS BOTTOM ===== */}
        <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} />
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
