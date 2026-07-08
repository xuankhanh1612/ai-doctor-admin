import React from 'react';
import { ArrowRight, Mic, ShieldCheck, Lock, BookOpen, CheckCircle2 } from 'lucide-react';
import useHeroPanelPrefs from './heroPanels/useHeroPanelPrefs.js';
import HeroPanelPrefsToggle from './heroPanels/HeroPanelPrefsToggle.jsx';
import useHeroSelection from './heroPanels/useHeroSelection.js';
import { buildOrganLabels } from '../data/organs.js';

// ============================================================================
// ChooseUserRolePanel — màn hình "Chọn Vai Trò Anh Hùng", đứng TRƯỚC
// "Anh Hùng Hiến Tặng" trong menu. Cho người dùng chọn nhanh 1 trong 3 vai
// trò (Hiến tặng / Rèn luyện sức khỏe / Nhận tạng) và 1 cơ quan quan tâm,
// trước khi bước vào hành trình Anh Hùng Hiến Tặng (DonationHeroPanel).
//
// Giống DonationHeroPanel, đây là màn hình ĐỘC LẬP với theme sáng/tối
// chung của app — nhưng CÓ theme sáng/tối + ngôn ngữ Việt/Anh RIÊNG, đồng
// bộ với DonationHeroPanel thông qua useHeroPanelPrefs (localStorage).
// ============================================================================

const TEXT = {
  vi: {
    subtitleTop: 'Bạn đang muốn trong tương lai',
    titleDonate: 'HIẾN TẶNG',
    titleOr: 'hoặc',
    titleReceive: 'NHẬN',
    titleOrgan: 'nội tạng',
    titleTrain: 'hay chỉ đơn giản là rèn luyện sức khỏe?',
    subtitleChoose: 'Hãy chọn bên dưới nhé..',
    roleEyebrowDonate: 'TÔI MUỐN',
    roleTitleDonate: 'HIẾN TẶNG',
    roleEyebrowTrain: 'TÔI CHỈ MUỐN',
    roleTitleTrain: 'RÈN LUYỆN SỨC KHỎE',
    roleEyebrowReceive: 'TÔI MUỐN',
    roleTitleReceive: 'NHẬN TẠNG',
    roleNote: 'Tôi cũng có thể Hiến / Nhận Tạng trong tương lai.',
    quickOrganTitle: 'Chọn nhanh cơ quan có thể hiến / nhận',
    viewAll: 'Xem tất cả',
    legalText: 'Tất cả hoạt động hiến và nhận tạng đều theo quy trình cơ quan pháp luật tại quốc gia của bạn.',
    legalTags: ['An toàn', 'Minh bạch', 'Bảo mật', 'Nhân văn'],
    micLabel: 'Nhấn để nói',
    continueTitle: 'Tiếp tục tìm hiểu',
    continueSub: 'Học kiến thức · Hiểu quy trình · Chuẩn bị cho tương lai',
    privacy: 'Dữ liệu bạn cung cấp đều nằm ở máy của bạn, không bao giờ lưu vào server của chúng tôi. ',
    privacyBold: 'Tất cả dữ liệu là của bạn.',
  },
  en: {
    subtitleTop: "You're thinking about the future—",
    titleDonate: 'DONATE',
    titleOr: 'or',
    titleReceive: 'RECEIVE',
    titleOrgan: 'organs',
    titleTrain: 'or simply improving your health?',
    subtitleChoose: 'Please choose below..',
    roleEyebrowDonate: 'I WANT TO',
    roleTitleDonate: 'DONATE',
    roleEyebrowTrain: 'I JUST WANT TO',
    roleTitleTrain: 'IMPROVE MY HEALTH',
    roleEyebrowReceive: 'I WANT TO',
    roleTitleReceive: 'RECEIVE AN ORGAN',
    roleNote: 'I may also Donate / Receive an organ in the future.',
    quickOrganTitle: 'Quickly choose an organ to donate / receive',
    viewAll: 'View all',
    legalText: 'All organ donation and transplant activities follow the legal procedures of the authorities in your country.',
    legalTags: ['Safe', 'Transparent', 'Secure', 'Humane'],
    micLabel: 'Tap to speak',
    continueTitle: 'Continue learning',
    continueSub: 'Learn · Understand the process · Prepare for the future',
    privacy: 'The data you provide stays on your device and is never stored on our servers. ',
    privacyBold: 'All your data belongs to you.',
  },
};

function buildRoleCards(t) {
  return [
    {
      id: 'donate',
      eyebrow: t.roleEyebrowDonate,
      title: t.roleTitleDonate,
      emoji: '🫶',
      accent: '#059669',
      accentSoft: '#ecfdf5',
      accentSoftDark: 'rgba(5,150,105,0.14)',
      border: '#a7f3d0',
      btn: '#16a34a',
    },
    {
      id: 'train',
      eyebrow: t.roleEyebrowTrain,
      title: t.roleTitleTrain,
      emoji: '💪',
      accent: '#d97706',
      accentSoft: '#fffbeb',
      accentSoftDark: 'rgba(217,119,6,0.14)',
      border: '#fde68a',
      btn: '#f59e0b',
    },
    {
      id: 'receive',
      eyebrow: t.roleEyebrowReceive,
      title: t.roleTitleReceive,
      emoji: '💙',
      accent: '#2563eb',
      accentSoft: '#eff6ff',
      accentSoftDark: 'rgba(37,99,235,0.14)',
      border: '#bfdbfe',
      btn: '#2563eb',
    },
  ];
}

export default function ChooseUserRolePanel({ mode = 'guest', onSelectRole, onEnterAction, onMicPress }) {
  // selectedRole / selectedOrgan được đọc + ghi vào IndexedDB (thay vì chỉ
  // useState nội bộ) để trang sau (DonationHeroPanel) load lại đúng lựa
  // chọn, và để quay lại màn hình này sau cũng thấy đúng lựa chọn cũ.
  const { role: selectedRole, organId: selectedOrgan, setRole: setSelectedRole, setOrgan: setSelectedOrgan } = useHeroSelection();
  const { isDark, isEn, toggleTheme, toggleLang } = useHeroPanelPrefs();
  const t = isEn ? TEXT.en : TEXT.vi;
  const ROLE_CARDS = buildRoleCards(t);
  const ORGANS = buildOrganLabels(isEn);

  const handlePickRole = (roleId) => {
    setSelectedRole(roleId);
    if (typeof onSelectRole === 'function') onSelectRole(roleId);
  };

  return (
    <div
      className={`min-h-full w-full px-4 py-6 sm:px-5 sm:py-8 md:px-10 md:py-10 transition-colors ${
        isDark
          ? 'bg-gradient-to-b from-[#0b1220] to-[#0f172a] text-gray-100'
          : 'bg-gradient-to-b from-[#f6faf7] to-[#eef7f1] text-[#16241c]'
      }`}
      style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-4xl lg:max-w-5xl mx-auto">

        {/* Đổi giao diện sáng/tối + ngôn ngữ */}
        <div className="flex flex-wrap justify-end gap-2 mb-6">
          <HeroPanelPrefsToggle
            isDark={isDark}
            isEn={isEn}
            onToggleTheme={toggleTheme}
            onToggleLang={toggleLang}
          />
        </div>

        {/* Tiêu đề */}
        <div className="text-center max-w-2xl mx-auto">
          <p className={isDark ? 'text-lg text-gray-300' : 'text-lg text-gray-600'}>{t.subtitleTop}</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold leading-snug mb-2">
            <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>{t.titleDonate}</span>{' '}
            {t.titleOr}{' '}
            <span className={isDark ? 'text-sky-400' : 'text-sky-600'}>{t.titleReceive}</span> {t.titleOrgan}
            <br />
            {t.titleTrain}
          </h1>
          <p className={isDark ? 'text-base text-gray-300 mb-4' : 'text-base text-gray-600 mb-4'}>{t.subtitleChoose}</p>
        </div>

        {/* 3 thẻ vai trò */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8 items-stretch">
          {ROLE_CARDS.map((card) => {
            const isSelected = selectedRole === card.id;
            return (
              <button
                key={card.id}
                onClick={() => handlePickRole(card.id)}
                className="group text-center rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col items-center"
                style={{
                  background: isDark ? card.accentSoftDark : card.accentSoft,
                  border: `1.5px solid ${isSelected ? card.accent : (isDark ? 'rgba(255,255,255,0.12)' : card.border)}`,
                  boxShadow: isSelected ? `0 0 0 3px ${isDark ? card.accentSoftDark : card.accentSoft}, 0 8px 24px rgba(0,0,0,0.08)` : undefined,
                }}
              >
                <div className="text-xs font-bold tracking-wide" style={{ color: card.accent }}>{card.eyebrow}</div>
                <div className="text-lg font-extrabold mb-3" style={{ color: card.accent }}>{card.title}</div>

                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-3 group-hover:scale-105 transition-transform ${isDark ? 'bg-white/10' : 'bg-white/70'}`}>
                  {card.emoji}
                </div>

                <div
                  className="text-xs leading-snug mb-4 min-h-[32px] font-bold px-2 py-1 rounded-lg"
                  style={{ color: card.accent, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)' }}
                >
                  {t.roleNote}
                </div>

                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white mt-auto"
                  style={{ background: card.btn }}
                >
                  {isSelected ? <CheckCircle2 size={18} /> : <ArrowRight size={16} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chọn nhanh cơ quan */}
        <div className="mt-10">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className={`h-px w-8 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
            <h2 className={`text-xs font-bold tracking-[0.15em] uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t.quickOrganTitle}
            </h2>
            <span className={`h-px w-8 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {ORGANS.map((organ) => {
              const isActive = selectedOrgan === organ.id;
              return (
                <button
                  key={organ.id}
                  onClick={() => setSelectedOrgan(organ.id)}
                  className="flex flex-col items-center gap-1.5 w-[76px] sm:w-[84px]"
                >
                  <span
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all ${isDark ? 'bg-white/10' : 'bg-white'}`}
                    style={{ border: `2px solid ${isActive ? '#16a34a' : 'transparent'}` }}
                  >
                    {organ.emoji}
                  </span>
                  <span
                    className="text-xs font-semibold text-center leading-tight"
                    style={{ color: isActive ? '#16a34a' : (isDark ? '#9ca3af' : '#4b5563') }}
                  >
                    {organ.label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => typeof onSelectRole === 'function' && onSelectRole('viewAll')}
              className="flex flex-col items-center gap-1.5 w-[76px] sm:w-[84px]"
            >
              <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                <span className="grid grid-cols-2 gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-emerald-500" />
                  ))}
                </span>
              </span>
              <span className={isDark ? 'text-xs font-semibold text-emerald-400' : 'text-xs font-semibold text-emerald-600'}>{t.viewAll}</span>
            </button>
          </div>
        </div>

        {/* Băng pháp lý */}
        <div className={`mt-10 flex flex-col sm:flex-row items-center gap-5 rounded-2xl px-6 py-5 shadow-sm ${isDark ? 'border border-white/10 bg-white/5' : 'border border-emerald-100 bg-white/70'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-3xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            🏥
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className={`text-sm leading-snug mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.legalText}
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-1.5">
              {t.legalTags.map((label) => (
                <span key={label} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Mic */}
        <div className="flex items-center justify-center mt-8">
          <button
            onClick={onMicPress}
            className={`w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center transition-colors shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-emerald-50'}`}
            aria-label={t.micLabel}
          >
            <Mic className={isDark ? 'text-emerald-400' : 'text-emerald-600'} size={24} />
          </button>
        </div>

        {/* Tiếp tục tìm hiểu */}
        <button
          onClick={onEnterAction}
          className="w-full mt-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 text-white px-6 py-4 flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <BookOpen size={20} />
          <span className="text-left">
            <span className="block font-extrabold text-base leading-tight">{t.continueTitle}</span>
            <span className="block text-xs text-white/85 font-medium">{t.continueSub}</span>
          </span>
          <ArrowRight size={20} className="ml-auto" />
        </button>

        {/* Ghi chú quyền riêng tư */}
        <div className={`mt-6 flex items-center gap-3 justify-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Lock size={14} />
          <span>
            {t.privacy}
            <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-[#16241c]'}`}>{t.privacyBold}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
