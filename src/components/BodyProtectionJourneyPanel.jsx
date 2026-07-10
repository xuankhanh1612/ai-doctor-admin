import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ShieldCheck, Maximize2, Minimize2, Hand } from 'lucide-react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import TouchlessHandCam from './webcam/TouchlessHandCam.jsx'
import { classifyGestureKey, GESTURE_KEY_LABELS } from './webcam/gestureToKey.js'

// ============================================================================
// BodyProtectionJourneyPanel — "Hành Trình Bảo Vệ Cơ Thể"
// Nhúng mini-game Y tế PvP/PvE/Co-op "Bảo Vệ Cơ Thể" (file HTML độc lập,
// canvas + vanilla JS) qua <iframe> tới file tĩnh đặt tại /public/games/,
// tương tự cách project đã nhúng src/mediapipe-khanh/index.html ở nơi khác.
// Dùng iframe (thay vì dán thẳng JS vào component) vì file game dùng rất
// nhiều hàm global (window.toggleAIMode, window.selectOrgan, window.setKey,
// ...) và các thẻ <style>/<script> nội tuyến — nhúng trực tiếp vào cây React
// sẽ dễ đụng độ tên biến/DOM với phần còn lại của app.
//
// CAMERA CỬ CHỈ (giống "Medical 3D Lab" — MedicalVisualPlayground.jsx):
// tái sử dụng NGUYÊN component TouchlessHandCam + useHandTracking (MediaPipe
// Hand Landmarker, 1 tay) đã có sẵn trong dự án. Khác với Medical 3D Lab
// (dùng landmark để tính góc xoay/pinch-zoom mô hình 3D), ở đây landmark mỗi
// khung hình được phân loại (xem gestureToKey.js) thành 1 trong 5 cử chỉ rồi
// ánh xạ trực tiếp sang phím của Player 1 (User 1) trong game:
//   👆 chỉ lên -> W (Nhảy) · 👈 chỉ trái -> A (Trái) · 🖐 xoè ≥3 ngón -> S (Khiên)
//   👉 chỉ phải -> D (Phải) · ✊ nắm đấm -> E (Bắn Lợi Khuẩn)
// Vì iframe game cùng-origin (file tĩnh trong public/games/) và bản thân
// game đã tự expose sẵn hàm global `setKey(key, boolean)` (dùng cho các nút
// bấm ảo P1/P2/Boss có sẵn trong game), nên component gọi thẳng
// `iframe.contentWindow.setKey(...)` thay vì phải giả lập KeyboardEvent.
// ============================================================================

const GAME_SRC = '/games/hanh-trinh-bao-ve-co-the.html'

// Giữ cử chỉ ổn định qua vài khung hình liên tiếp trước khi đổi phím, tránh
// nhận nhầm do rung tay / MediaPipe nhảy nhấp nháy giữa các khung hình.
const HOLD_FRAMES_TO_ACTIVATE = 3
const HOLD_FRAMES_TO_RELEASE = 5

export default function BodyProtectionJourneyPanel({ onNext, nextLabel, onPrev, prevLabel, onFullscreenChange }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const [fullscreen, setFullscreen] = useState(false)
  const [gestureOn, setGestureOn] = useState(false)
  const [activeGestureKey, setActiveGestureKey] = useState(null)

  const iframeRef = useRef(null)
  const touchlessCameraRef = useRef(null)
  const activeKeyRef = useRef(null)
  const pendingRef = useRef({ key: null, count: 0 })
  const handMappingRef = useRef({ mirrored: true, facingMode: 'user' })

  const cardBg = isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-gray-200'
  const pageBg = isDark ? 'bg-[#05070f]' : 'bg-[#f4f7fb]'
  const textMain = isDark ? 'text-gray-100' : 'text-gray-900'
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500'

  // Gọi hàm global `setKey` bên trong iframe game (chỉ hoạt động vì iframe
  // cùng-origin — file tĩnh trong public/games/ của cùng ứng dụng).
  const sendKeyToGame = useCallback((key, isDown) => {
    if (!key) return
    try {
      iframeRef.current?.contentWindow?.setKey?.(key, isDown)
    } catch (err) {
      console.warn('[BodyProtectionJourneyPanel] Không gọi được setKey() trong game iframe:', err)
    }
  }, [])

  const releaseActiveKey = useCallback(() => {
    if (activeKeyRef.current) sendKeyToGame(activeKeyRef.current, false)
    activeKeyRef.current = null
    pendingRef.current = { key: null, count: 0 }
    setActiveGestureKey(null)
  }, [sendKeyToGame])

  const handleHandMappingChange = useCallback((nextMapping) => {
    handMappingRef.current = nextMapping
  }, [])

  // Mỗi khung hình MediaPipe: phân loại cử chỉ -> yêu cầu giữ ổn định vài
  // khung hình -> nếu khác phím đang giữ thì nhả phím cũ + bấm phím mới.
  const handleHandTrack = useCallback((landmarksArr) => {
    const hand = landmarksArr?.[0]
    const candidate = classifyGestureKey(hand, { mirrored: handMappingRef.current.mirrored })
    const pending = pendingRef.current

    if (candidate === pending.key) {
      pending.count += 1
    } else {
      pending.key = candidate
      pending.count = 1
    }

    const threshold = candidate ? HOLD_FRAMES_TO_ACTIVATE : HOLD_FRAMES_TO_RELEASE
    if (pending.count < threshold) return
    if (candidate === activeKeyRef.current) return

    if (activeKeyRef.current) sendKeyToGame(activeKeyRef.current, false)
    if (candidate) sendKeyToGame(candidate, true)
    activeKeyRef.current = candidate
    setActiveGestureKey(candidate)
  }, [sendKeyToGame])

  const handleHandLost = useCallback(() => {
    releaseActiveKey()
  }, [releaseActiveKey])

  // Bật "Toàn màn hình" -> báo lên App.jsx để ẩn menu chính (Sidebar) bên
  // trái, nhường toàn bộ chiều ngang cho khung game. Tắt lại -> hiện menu.
  const toggleFullscreen = useCallback(() => {
    setFullscreen((v) => {
      const next = !v
      onFullscreenChange?.(next)
      return next
    })
  }, [onFullscreenChange])

  // Rời khỏi trang này khi đang ở chế độ toàn màn hình -> luôn trả lại
  // Sidebar cho App.jsx, tránh trường hợp bị ẩn menu vĩnh viễn.
  useEffect(() => () => onFullscreenChange?.(false), [onFullscreenChange])

  // Tắt camera cử chỉ (toggle off hoặc rời trang) -> luôn nhả phím đang giữ,
  // tránh trường hợp game bị "kẹt phím" (ví dụ Khiên bật mãi không tắt).
  useEffect(() => {
    if (!gestureOn) releaseActiveKey()
  }, [gestureOn, releaseActiveKey])

  useEffect(() => () => releaseActiveKey(), [releaseActiveKey])

  return (
    <div className={`animate-fade min-h-full w-full px-4 py-6 sm:px-8 ${pageBg}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h1 className={`text-xl font-black leading-tight sm:text-2xl ${textMain}`}>
                🛡️ Hành Trình Bảo Vệ Cơ Thể
              </h1>
              <p className={`text-xs sm:text-sm ${textSub}`}>
                Mini-game PvP/PvE/Co-op: chọn hệ cơ quan, chiến đấu với BOSS UNG THƯ, thu thập Lợi Khuẩn và né Virus.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setGestureOn((v) => !v)}
              className={`inline-flex w-fit items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                gestureOn
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
                  : isDark
                    ? 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
              title="Điều khiển User 1 bằng cử chỉ tay qua camera (giống Medical 3D Lab)"
            >
              <Hand size={16} />
              {gestureOn ? '🔴 Tắt Camera Cử Chỉ' : '🖐️ Bật Camera Cử Chỉ (User 1)'}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className={`inline-flex w-fit items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isDark
                  ? 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {fullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            </button>
          </div>
        </div>

        <div
          className={`relative overflow-hidden rounded-3xl border shadow-2xl ${cardBg}`}
          style={{ height: fullscreen ? 'calc(100vh - 160px)' : 'min(900px, 82vh)' }}
        >
          <iframe
            ref={iframeRef}
            title="Hành Trình Bảo Vệ Cơ Thể — Bảo Vệ Cơ Thể PvP/PvE/Co-op"
            src={GAME_SRC}
            className="h-full w-full"
            style={{ border: 'none', display: 'block' }}
            allow="autoplay; fullscreen"
          />

          {gestureOn && (
            <div className="fixed bottom-6 left-6 z-50 w-56 overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl sm:w-64">
              <div className="aspect-video">
                <TouchlessHandCam
                  ref={touchlessCameraRef}
                  onHandTrack={handleHandTrack}
                  onHandLost={handleHandLost}
                  onMappingChange={handleHandMappingChange}
                  onClose={() => setGestureOn(false)}
                />
              </div>
              <div className="flex items-center justify-between gap-2 bg-black/80 px-2 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  User 1 · Gesture Control
                </div>
                <button
                  type="button"
                  onClick={() => setGestureOn(false)}
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-red-300 hover:bg-red-500/20"
                  title="Tắt camera cử chỉ"
                >
                  ✕
                </button>
              </div>
              {activeGestureKey && (
                <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold text-emerald-300">
                  {GESTURE_KEY_LABELS[activeGestureKey]?.icon} {GESTURE_KEY_LABELS[activeGestureKey]?.action}
                </div>
              )}
            </div>
          )}
        </div>

        <NavButtons
          onNext={onNext}
          nextLabel={nextLabel || 'Health Journey Game'}
          onPrev={onPrev}
          prevLabel={prevLabel}
        />
      </div>
    </div>
  )
}
