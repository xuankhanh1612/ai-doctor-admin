import React, { useRef } from 'react';
import { Mic } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGlobalAIChatbotEngine } from '../../lib/useGlobalAIChatbotEngine.js';

// ============================================================================
// HeroMicVoiceButton — nút mic "trao đổi thoại trực tiếp" dùng riêng cho 2
// trang "Anh Hùng" (ChooseUserRolePanel / DonationHeroPanel).
//
// Bấm vào đây KHÔNG mở popup chat (GlobalAIChatbot) — chỉ:
//   1. Ghi âm ngay tại chỗ (nút chuyển thành bong bóng màu đỏ đang ghi âm).
//   2. Chuyển giọng nói thành chữ rồi GỬI THẲNG cho AI (autoSubmitVoice —
//      không có ô để sửa vì không có chatbox hiển thị ở đây).
//   3. AI trả lời và được ĐỌC TO (TTS) ngay tại trang này.
//   4. Trạng thái hiện tại (Đang nghe / Đang xử lý / Đang suy nghĩ / Đang
//      trả lời) hiện ngay dưới nút mic này — không phải ở góc màn hình nơi
//      popup chat nằm.
//
// Nội dung hội thoại vẫn dùng CHUNG hook + kho lưu trữ với GlobalAIChatbot
// (useGlobalAIChatbotEngine → globalChatbotStorage.js), nên tự động đồng bộ
// ngầm vào popup chat. Popup chỉ xử lý khi người dùng chủ động mở nó ra và
// bấm nút trong đó — component này không đụng vào trạng thái mở/đóng của
// popup.
// ============================================================================

export default function HeroMicVoiceButton({
  mode = 'guest',
  activePanelLabel,
  isVi,
  isDark,
  micLabel,
  variant = 'compact', // 'compact' (chỉ icon, không có label hiện sẵn) | 'expanded' (có label dưới nút)
  buttonSize = 64,
  iconSize = 24,
}) {
  const { user, loginAnonymous } = useAuth();
  const userKey = user?.uuid || null;
  const audioElementRef = useRef(null);

  const {
    busy,
    speaking, stop: stopSpeaking,
    recording, transcribing, toggleMic,
  } = useGlobalAIChatbotEngine({ userKey, activePanelLabel, isVi, audioElementRef, autoSubmitVoice: true });

  // Khách (guest) cần có 1 phiên anonymous thật (uuid) TRƯỚC khi ghi âm, để
  // lịch sử hội thoại gắn với đúng danh tính ngay từ câu đầu tiên (đồng bộ
  // với menu "Lịch sử Chat với AI") — loginAnonymous() tự tái sử dụng phiên
  // cũ nếu đã có, không tạo trùng. Không setActive/điều hướng gì thêm: người
  // dùng vẫn đứng nguyên tại trang này.
  const handlePress = async () => {
    if (mode === 'guest') {
      try { await loginAnonymous(); } catch (e) { console.warn('Không tạo được phiên khách khi bấm mic:', e); }
    }
    toggleMic();
  };

  const isActive = recording || transcribing || busy || speaking;
  const icon = recording ? '🎙️' : transcribing ? '⏳' : busy ? '💭' : speaking ? '🔊' : null;
  const label = recording
    ? (isVi ? 'Đang nghe...' : 'Listening...')
    : transcribing
      ? (isVi ? 'Đang xử lý...' : 'Processing...')
      : busy
        ? (isVi ? 'Đang suy nghĩ...' : 'Thinking...')
        : speaking
          ? (isVi ? 'Đang trả lời...' : 'Speaking...')
          : null;

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <audio ref={audioElementRef} preload="none" style={{ display: 'none' }} />
      <button
        type="button"
        onClick={handlePress}
        disabled={transcribing || busy}
        aria-label={micLabel}
        className={`relative rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${
          isActive
            ? 'border-red-500 bg-red-500'
            : isDark
              ? 'border-emerald-500 bg-white/5 hover:bg-white/10'
              : 'border-emerald-500 bg-white hover:bg-emerald-50'
        }`}
        style={{ width: buttonSize, height: buttonSize, cursor: (transcribing || busy) ? 'wait' : 'pointer' }}
      >
        {isActive && recording && (
          <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
        )}
        <Mic className={isActive ? 'text-white' : (isDark ? 'text-emerald-400' : 'text-emerald-600')} size={iconSize} />
      </button>

      {/* Label tĩnh (chỉ hiện ở variant 'expanded', và chỉ khi KHÔNG đang có hoạt động thoại nào) */}
      {variant === 'expanded' && !isActive && (
        <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-[#16241c]'}`}>{micLabel}</span>
      )}

      {/* Bong bóng trạng thái — ngay dưới nút mic của TRANG NÀY, không phải góc màn hình popup chat */}
      {isActive && (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm ${isDark ? 'bg-white/10 text-gray-100' : 'bg-white text-gray-700 border border-gray-100'}`}>
          <span>{icon}</span>
          <span>{label}</span>
        </span>
      )}

      {speaking && (
        <button
          type="button"
          onClick={stopSpeaking}
          className="text-xs font-semibold text-red-500 hover:text-red-600 underline underline-offset-2"
        >
          {isVi ? 'Dừng giọng đọc' : 'Stop voice'}
        </button>
      )}
    </div>
  );
}
