import React, { useEffect, useMemo, useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { completeHealthJourneyActivity, getTaskSnapshot, HEALTH_JOURNEY_EVENT } from './health-journey-game/services/healthJourneyStorage.js'
import { syncBeMeoWater, saveWaterProofImage } from './health-journey-game/services/waterProofUpload.js'
import { getAllRecords } from '../lib/medicalStorage.js'
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
  const { user, loading: authLoading } = useAuth()
  const isDark = theme === 'dark'

  const [snapshot, setSnapshot] = useState(() => getTaskSnapshot(user))
  const [reviewImageUrl, setReviewImageUrl] = useState(null)

  // Host <div> chứa Shadow DOM của Bé Mèo Nước (trước đây là iframe, giờ widget được inject
  // trực tiếp vào trang qua Shadow DOM để vẫn cách ly CSS/JS mà không cần <iframe>).
  const hostRef = useRef(null)
  // Ref tới <script> đã inject vào shadow root — dùng để gọi hook dọn dẹp khi unmount.
  const scriptElRef = useRef(null)

  // proofId cuối cùng nhận từ BE_MEO_WATER_ADDED (chờ ảnh camera gán vào)
  const pendingProofIdRef = useRef(null)

  // === FIX: Lưu toàn bộ proofId→dataUrl trong React memory để restore khi widget remount ===
  // Key: proofId, Value: dataUrl (base64 ảnh)
  const proofMapRef = useRef({})

  const html = useMemo(() => waterDrinkTrackerHtml
    .replaceAll('__MEO_NHAY_MAT__', meoNhayMatUrl)
    .replaceAll('__MEO_BU_AI__', meoBuAiUrl)
    .replaceAll('__MEO_NUOC_AI__', meoNuocAiUrl)
    .replaceAll('__ROBOT_TU_THE_1__', robotTuThe1Url)
    .replaceAll('__ROBOT_TU_THE_2__', robotTuThe2Url), [])

  // Tách HTML gốc (vốn dùng cho srcDoc của iframe) thành 3 phần để inject thẳng vào Shadow DOM:
  // style (CSS), bodyHtml (markup tĩnh), scriptText (toàn bộ logic JS của widget).
  const { styleText, bodyHtml, scriptText } = useMemo(() => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const styleEl = doc.querySelector('style')
    const scriptEl = doc.querySelector('script')
    const scriptContent = scriptEl ? scriptEl.textContent : ''
    if (scriptEl) scriptEl.remove() // tránh dangerouslySetInnerHTML chèn lại script (không tự chạy nhưng dư thừa)
    return {
      styleText: styleEl ? styleEl.textContent : '',
      bodyHtml: doc.body ? doc.body.innerHTML : '',
      scriptText: scriptContent,
    }
  }, [html])

  // === FIX: Khi component mount (kể cả sau khi quay lại trang, vì component bị unmount/remount
  // → proofMapRef reset về {}), nạp lại toàn bộ proofId→dataUrl từ IndexedDB (medicalStorage),
  // đây là nguồn dữ liệu bền vững nhất — không phụ thuộc localStorage quota hay React memory cũ.
  // Mỗi record uống nước được lưu qua saveWaterProofImage() đã có sẵn beMeoProofId + dataUrl.
  const [proofMapReady, setProofMapReady] = useState(false)
  // === FIX: ref song song với proofMapReady, đọc được ngay (không bị stale closure)
  // bên trong handler BE_MEO_PROOF_RESTORE_REQUEST ở effect khác bên dưới.
  const proofMapReadyRef = useRef(false)

  // === Inject widget Bé Mèo Nước vào Shadow DOM của hostRef — đây là phần thay thế cho
  // <iframe srcDoc={html}>. Shadow DOM vẫn cách ly CSS/JS của widget khỏi phần còn lại của trang
  // (CSS global như `* { box-sizing }`, `body {...}`, `button {...}` trong widget sẽ không rò ra
  // ngoài ảnh hưởng UI admin), nhưng không còn là document/window riêng như iframe nữa.
  // Vì vậy: postMessage giữa widget ↔ React giờ đi thẳng qua `window` (không qua contentWindow),
  // và mọi listener widget gắn trên `window` (resize, SYNC_EVENT, message) phải được gỡ tay lúc
  // unmount — xem window.__beMeoNuocPendingCleanup__ được định nghĩa trong waterdrink_tracker.html.
  const [widgetReady, setWidgetReady] = useState(false)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let shadow = host.shadowRoot
    if (!shadow) shadow = host.attachShadow({ mode: 'open' })
    // Reset nội dung mỗi lần effect chạy lại (idempotent — an toàn với React StrictMode
    // double-invoke effect ở dev: lần chạy trước đã được dọn dẹp ở cleanup bên dưới).
    shadow.innerHTML = `<style>${styleText}</style>${bodyHtml}`
    // FIX BUG: document.currentScript trả về null khi script được inject động qua appendChild()
    // → Expose shadow root qua window.__beMeoShadowRoot__ TRƯỚC khi script chạy,
    //   để script có thể tự xác định root node mà không cần currentScript.
    window.__beMeoShadowRoot__ = shadow
    const scriptEl = document.createElement('script')
    scriptEl.textContent = scriptText
    shadow.appendChild(scriptEl) // chèn xong là chạy ngay (script đồng bộ, không async/defer)
    // Dọn dẹp global sau khi script đã đọc xong (script chạy đồng bộ nên đây là an toàn)
    delete window.__beMeoShadowRoot__
    // FIX BUG: document.currentScript = null khi inject động → script không thể gán cleanup
    // vào scriptEl trực tiếp. Script gán vào window.__beMeoNuocPendingCleanup__ làm bridge;
    // chúng ta lấy ra ngay sau khi script chạy xong (đồng bộ) rồi xóa global để tránh leak.
    const cleanupFn = window.__beMeoNuocPendingCleanup__ ?? null
    delete window.__beMeoNuocPendingCleanup__
    scriptElRef.current = scriptEl
    setWidgetReady(true)
    return () => {
      cleanupFn?.()
      scriptElRef.current = null
      setWidgetReady(false)
    }
  }, [styleText, bodyHtml, scriptText])

  useEffect(() => {
    // === FIX: KHÔNG load proofMap khi AuthContext chưa khôi phục session xong (authLoading=true).
    // Lý do: useAuth() trả user=null ở lần render đầu tiên (AuthProvider khôi phục session trong
    // useEffect riêng, mà effect của component con luôn chạy TRƯỚC effect của component cha) →
    // nếu fetch ngay lúc này, getAllRecords({ ownerEmail: undefined }) sẽ luôn trả về RỖNG (canSeeRecord
    // yêu cầu ownerEmail khớp), khiến proofMapReady=true với proofMap rỗng → effect bulk-restore
    // authoritative bên dưới gửi validProofIds=[] cho widget → widget xoá sạch toàn bộ nút "Xem lại
    // ảnh" + proofId trong tin nhắn rồi lưu đè localStorage. Đây chính là lý do bug xảy ra ở MỌI lần
    // tải lại trang đầu tiên (vd: sau khi deploy lại web) — không phải race condition ngẫu nhiên.
    if (authLoading) return
    let cancelled = false
    setProofMapReady(false)
    proofMapReadyRef.current = false
    getAllRecords({ ownerEmail: user?.email })
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
        if (!cancelled) {
          // === FIX: KHÔNG đánh dấu ready khi load lỗi — nếu đánh dấu ready, effect bulk-restore
          // bên dưới sẽ gửi validProofIds RỖNG cho widget → widget hiểu nhầm "tất cả proof đã bị xoá"
          // và xoá sạch nút "Xem lại ảnh" + proofId trong tin nhắn (mất dữ liệu vĩnh viễn).
          // Cứ để proofMapReady = false, người dùng vẫn thấy ảnh cũ (qua sessionStorage trong widget).
        }
      })
    return () => { cancelled = true }
  }, [user, authLoading])

  // Gửi toàn bộ proofMap đã nạp vào widget ngay khi widget sẵn sàng VÀ proofMap đã load xong
  // (đợi cả 2 điều kiện vì thứ tự widget inject xong vs IndexedDB load không cố định)
  useEffect(() => {
    if (!widgetReady || !proofMapReady) return
    const entries = Object.entries(proofMapRef.current)
      .filter(([, dataUrl]) => dataUrl && dataUrl !== '__PENDING__')
      .map(([proofId, dataUrl]) => ({ proofId, dataUrl }))
    // Gửi cả validProofIds để widget xoá các proofId cũ không còn trong IndexedDB
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

    // Helper: gửi toàn bộ proofMap hiện tại vào widget (bulk restore)
    const bulkRestoreToWidget = (filterIds) => {
      const entries = Object.entries(proofMapRef.current)
        .filter(([pid, dataUrl]) => {
          if (!dataUrl || dataUrl === '__PENDING__') return false
          if (filterIds && !filterIds.includes(pid)) return false
          return true
        })
        .map(([proofId, dataUrl]) => ({ proofId, dataUrl }))
      const payload = { type: 'BE_MEO_PROOF_BULK_RESTORE', proofMapEntries: entries }
      // === FIX: CHỈ gửi validProofIds (báo widget xoá proofId không còn tồn tại) khi proofMap
      // ĐÃ CHẮC CHẮN load xong từ IndexedDB (proofMapReadyRef.current === true). Nếu gửi lúc
      // proofMap còn rỗng (vd: widget vừa inject xong đã hỏi ngay BE_MEO_PROOF_RESTORE_REQUEST,
      // trước khi getAllRecords() resolve) → widget sẽ hiểu nhầm TẤT CẢ proof đã bị xoá và xoá sạch
      // nút "Xem lại ảnh" + proofId trong tin nhắn, rồi lưu đè localStorage → mất dữ liệu vĩnh viễn.
      // Việc dọn dẹp proof thật sự đã bị xoá vẫn diễn ra an toàn ở effect bulk-restore "authoritative"
      // phía trên (chỉ chạy khi proofMapReady === true).
      if (proofMapReadyRef.current) {
        payload.validProofIds = entries.map(({ proofId }) => proofId)
      }
      window.postMessage(payload, '*')
    }

    const onMessage = (event) => {
      // Widget chạy trong Shadow DOM của cùng window/document — origin luôn khớp window.location.origin.
      if (event.origin !== window.location.origin) return

      // Chatbot ghi nhận uống nước (text chat hoặc nút +ml)
      // → lưu proofId đang pending, chờ ảnh camera gán vào
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
        // Lưu proofId để khi camera chụp xong sẽ gửi BE_MEO_PROOF_SAVED
        if (event.data.proofId) {
          pendingProofIdRef.current = event.data.proofId
        }
        refresh()
        return
      }

      // === FIX: Widget yêu cầu restore lại proofIds bị mất (sau khi tab mới / hard reload)
      if (event.data?.type === 'BE_MEO_PROOF_RESTORE_REQUEST') {
        bulkRestoreToWidget(event.data.pendingProofIds)
        return
      }

      // Widget yêu cầu xem lại ảnh đã chụp
      if (event.data?.type === 'BE_MEO_REVIEW_REQUEST' && event.data.dataUrl) {
        setReviewImageUrl(event.data.dataUrl)
        return
      }

      // Widget đóng xem lại
      if (event.data?.type === 'BE_MEO_REVIEW_CLOSE') {
        setReviewImageUrl(null)
        return
      }
    }

    window.addEventListener(HEALTH_JOURNEY_EVENT, refresh)
    window.addEventListener('message', onMessage)

    // Lắng nghe ảnh chụp từ TaskDetailPopup (popup nhiệm vụ uống nước trong Health Journey Game)
    // TaskDetailPopup đã patch proofId vào localStorage TRƯỚC khi syncBeMeoWater dispatch SYNC_EVENT
    // → widget đã reload messages với proofId đúng → chỉ cần gửi PROOF_SAVED để cập nhật proofMap
    //   trong bộ nhớ widget (phòng trường hợp widget chưa load proofMap từ localStorage kịp)
    const onTaskProof = (e) => {
      const { proofId, dataUrl, syncState } = e.detail || {}
      if (!proofId || !dataUrl) return
      // === FIX: Lưu vào proofMapRef để restore khi quay lại trang
      proofMapRef.current[proofId] = dataUrl
      // Gửi STATE_SYNC trước để widget cập nhật total/goal đúng trước khi renderChat
      if (syncState) {
        window.postMessage({
          type: 'BE_MEO_STATE_SYNC',
          total: syncState.total,
          goal: syncState.goal,
        }, '*')
      }
      // Gán dataUrl vào proofMap bộ nhớ widget → renderChat() → nút Xem lại hiện
      window.postMessage({ type: 'BE_MEO_PROOF_SAVED', proofId, dataUrl }, '*')
    }
    window.addEventListener('BE_MEO_TASK_PROOF_SAVED', onTaskProof)

    // === FIX: Lắng nghe sự kiện xoá ảnh từ trang Upload Record (MedicalUploader.handleDelete)
    // → gỡ proofId khỏi proofMapRef (React memory) và forward vào widget để gỡ nút "Xem lại"
    //   ngay lập tức, không cần đợi reload trang "Bé Mèo Nước"
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

  // Gửi proof vào widget — dùng '*' vì postMessage không cần targetOrigin chặt khi cùng window
  const sendProofToWidget = (proofId, dataUrl) => {
    window.postMessage(
      { type: 'BE_MEO_PROOF_SAVED', proofId, dataUrl },
      '*'
    )
  }

  // onSaveCapture — gọi bởi AIVisionWebcam khi user nhấn "💾 Lưu ảnh" trong preview.
  // Dùng saveWaterProofImage (có healthJourney metadata) thay vì lưu generic,
  // để Medical Records / proof lookup nhận đúng activityType='drink_water'.
  const onSaveCapture = (file, { kind }) => {
    // proofId đang pending (đã có trong chat) hoặc tạo mới để gắn vào record
    // → khi user xóa record ở trang Upload, beMeoProofId giúp xóa đồng bộ khỏi be_meo_nuoc_proof_map
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

  // Callback từ AIVisionWebcam: ảnh đã confirm lưu thành công
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
      // Tạo proofId trước (pending từ chat hoặc mới)
      const proofId = pendingProofIdRef.current || ('proof_cam_' + Date.now())

      // Bước 1: syncBeMeoWater push tin nhắn mới vào localStorage (chưa có proofId)
      const syncResult = syncBeMeoWater(150, 'Bé Mèo Nước AI Healthcare Vision')
      setSnapshot(getTaskSnapshot(user))

      if (record.dataUrl) {
        // Bước 2: Patch proofId + time vào tin nhắn CUỐI vừa push — cùng pattern TaskDetailPopup
        // → khi SYNC_EVENT trigger widget loadMessages(), tin nhắn đã có proofId
        try {
          const msgs = JSON.parse(localStorage.getItem('be-meo-nuoc-chat-v1') || '[]')
          if (Array.isArray(msgs) && msgs.length > 0) {
            const last = msgs[msgs.length - 1]
            msgs[msgs.length - 1] = {
              ...last,
              proofId,
              time: last.time || new Date().toISOString(),
            }
            localStorage.setItem('be-meo-nuoc-chat-v1', JSON.stringify(msgs.slice(-80)))
          }
        } catch (_) {}

        // Bước 3: Pre-populate proofMap localStorage để widget renderChat() thấy ngay
        try {
          const proofMap = JSON.parse(localStorage.getItem('be_meo_nuoc_proof_map') || '{}')
          proofMap[proofId] = record.dataUrl
          localStorage.setItem('be_meo_nuoc_proof_map',
            JSON.stringify(Object.fromEntries(Object.entries(proofMap).slice(-30))))
        } catch (_) {}

        // === FIX: Lưu vào proofMapRef (React memory) để restore khi quay lại trang
        proofMapRef.current[proofId] = record.dataUrl

        // Bước 4: Gửi STATE_SYNC vào widget để cập nhật total/goal trước khi render
        if (syncResult?.state) {
          window.postMessage({
            type: 'BE_MEO_STATE_SYNC',
            total: syncResult.state.total,
            goal: syncResult.state.goal,
          }, '*')
        }

        // Bước 5: Gửi PROOF_SAVED → widget cập nhật proofMap bộ nhớ + renderChat()
        // Lúc này widget loadMessages() từ localStorage đã có proofId → nút Xem lại hiện đúng
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
          /* Lưu ý: KHÔNG set background ở đây — style của trang ngoài luôn thắng rule :host bên
             trong Shadow DOM của widget, nên nền gradient thật của widget (định nghĩa trong
             waterdrink_tracker.html, áp cho :host) mới là nền hiển thị cuối cùng. */
          .bemeo-chatbot-host { width: 100%; min-height: 1100px; display: block; }
          @media (max-width: 860px) { .bemeo-chatbot-host { min-height: 1800px !important; } }
        `}</style>

        {/* ===== CHATBOT WIDGET (Shadow DOM — không còn dùng iframe) ===== */}
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
