import React, { useState } from 'react'
import { ShieldCheck, Maximize2, Minimize2 } from 'lucide-react'
import BackButton from './common/BackButton.jsx'
import { useApp } from '../context/AppContext'

// ============================================================================
// BodyProtectionJourneyPanel — "Hành Trình Bảo Vệ Cơ Thể"
// Nhúng mini-game Y tế PvP/PvE "Kill Cancer Boss" (file HTML độc lập, canvas
// + vanilla JS) qua <iframe> tới file tĩnh đặt tại /public/games/, tương tự
// cách project đã nhúng src/mediapipe-khanh/index.html ở nơi khác. Dùng
// iframe (thay vì dán thẳng JS vào component) vì file game dùng rất nhiều
// hàm global (window.toggleAIMode, window.selectOrgan, ...) và các thẻ
// <style>/<script> nội tuyến — nhúng trực tiếp vào cây React sẽ dễ đụng độ
// tên biến/DOM với phần còn lại của app.
// ============================================================================

const GAME_SRC = '/games/hanh-trinh-bao-ve-co-the.html'

export default function BodyProtectionJourneyPanel({ onBack }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const [fullscreen, setFullscreen] = useState(false)

  const cardBg = isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-gray-200'
  const pageBg = isDark ? 'bg-[#05070f]' : 'bg-[#f4f7fb]'
  const textMain = isDark ? 'text-gray-100' : 'text-gray-900'
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500'

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
                Mini-game PvP/PvE: chọn hệ cơ quan, chiến đấu với BOSS UNG THƯ, thu thập Lợi Khuẩn và né Virus.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
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

        <div
          className={`overflow-hidden rounded-3xl border shadow-2xl ${cardBg}`}
          style={{ height: fullscreen ? 'calc(100vh - 160px)' : 'min(900px, 82vh)' }}
        >
          <iframe
            title="Hành Trình Bảo Vệ Cơ Thể — Kill Cancer Boss PvP/PvE"
            src={GAME_SRC}
            className="h-full w-full"
            style={{ border: 'none', display: 'block' }}
            allow="autoplay; fullscreen"
          />
        </div>

        {onBack && (
          <div className="flex justify-start">
            <BackButton isDark={isDark} onClick={onBack} label="Quay lại" />
          </div>
        )}
      </div>
    </div>
  )
}
