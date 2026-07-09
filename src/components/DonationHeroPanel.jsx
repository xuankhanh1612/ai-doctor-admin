import React, { useState } from 'react';
import { UserPlus, ShieldCheck, HeartHandshake, BookOpen, Lock, Leaf, Sparkles, Award, Star, Zap, ArrowRight, LogIn } from 'lucide-react';
import useHeroPanelPrefs from './heroPanels/useHeroPanelPrefs.js';
import HeroPanelPrefsToggle from './heroPanels/HeroPanelPrefsToggle.jsx';
import useHeroSelection from './heroPanels/useHeroSelection.js';
import HeroMicVoiceButton from './heroPanels/HeroMicVoiceButton.jsx';
import { getOrganById, lowerFirst } from '../data/organs.js';
import BackButton from './common/BackButton.jsx';
import ExploreButton from './common/ExploreButton.jsx';

// ============================================================================
// DonationHeroPanel — màn hình chào mừng cho tính năng "Anh Hùng Hiến Tặng"
// (hỗ trợ tìm hiểu & đăng ký hiến tặng gan). Dựng theo bản thiết kế tham
// khảo: avatar trợ lý ở giữa, 3 lối vào nhanh (Hiến tặng ngay / Nhấn để nói
// / Nâng cao kiến thức), và "Hành trình Siêu Anh Hùng" gồm 5 cấp độ để
// khuyến khích người dùng quay lại tìm hiểu dần từng bước.
//
// Đây là màn hình ĐỘC LẬP với theme sáng/tối chung của app — nhưng CÓ theme
// sáng/tối + ngôn ngữ Việt/Anh RIÊNG, đồng bộ với ChooseUserRolePanel thông
// qua useHeroPanelPrefs (localStorage).
// ============================================================================

const TEXT = {
  vi: {
    createAccountBtn: 'Tạo tài khoản',
    createAccountNote: 'Để lưu hành trình học tập\nvà nâng cấp siêu anh hùng',
    greeting: 'Xin chào! Tôi ở đây để',
    titlePre: 'đồng hành cùng bạn tìm hiểu',
    titleHighlight: (organLabel) => `hiến tặng ${lowerFirst(organLabel)}`,
    titleHighlightGeneral: 'chăm sóc sức khỏe bền vững',
    titlePost: '.',
    levelBadge: (level) => (
      <>Bạn đang là <span className="font-bold">siêu anh hùng cấp độ {level}</span> 💚</>
    ),
    donateTitle: 'Tìm hiểu hiến tặng',
    donateTitleGeneral: 'Khám phá lối sống khoẻ',
    donateSub: (organLabel) => `Tôi muốn đăng ký hiến tặng ${lowerFirst(organLabel)}`,
    donateSubGeneral: 'Tôi muốn tìm hiểu cách chăm sóc sức khỏe mỗi ngày',
    micLabel: 'Nhấn để nói',
    knowledgeTitle: 'Kiến thức y khoa',
    knowledgeSub: (organLabel) => `Tôi muốn tìm hiểu về hiến tặng ${lowerFirst(organLabel)}`,
    knowledgeSubGeneral: 'Tôi muốn tìm hiểu kiến thức y khoa tổng quát',
    organBadgePrefix: 'Đang tìm hiểu về',
    exploreBtn: 'Khám phá ngay',
    journeyTitle: 'Hành trình Siêu Anh Hùng',
    levelLabel: 'Cấp',
    current: 'Đang ở đây',
    unlocked: 'Đã mở khoá',
    locked: 'Chưa mở khoá',
    privacy: 'Dữ liệu bạn cung cấp đều nằm ở máy của bạn, không bao giờ lưu vào server của chúng tôi. ',
    privacyBold: 'Tất cả dữ liệu là của bạn.',
    footer: 'Anh Hùng Hiến Tặng · Cùng nhau lan toả sự sống',
    back: 'Quay lại',
    login: 'Đăng nhập',
    levels: [
      { level: 1, title: 'Người Tìm Hiểu', icon: '🥷', ring: 'from-emerald-400 to-emerald-600', badge: 'bg-emerald-500' },
      { level: 2, title: 'Người Quan Tâm', icon: '💚', ring: 'from-emerald-300 to-emerald-500', badge: 'bg-emerald-400' },
      { level: 3, title: 'Người Có Kiến Thức', icon: '📖', ring: 'from-sky-300 to-sky-500', badge: 'bg-sky-500' },
      { level: 4, title: 'Người Sẵn Sàng', icon: '🌱', ring: 'from-violet-300 to-violet-500', badge: 'bg-violet-500' },
      { level: 5, title: 'Đại Sứ Hiến Tặng', icon: '🛡️', ring: 'from-amber-300 to-amber-500', badge: 'bg-amber-500' },
    ],
  },
  en: {
    createAccountBtn: 'Create account',
    createAccountNote: 'To save your learning journey\nand level up your superhero',
    greeting: "Hi! I'm here to",
    titlePre: 'guide you through',
    titleHighlight: (organLabel) => `${lowerFirst(organLabel)} donation`,
    titleHighlightGeneral: 'sustainable health & wellness',
    titlePost: '.',
    levelBadge: (level) => (
      <>You're a <span className="font-bold">level {level} superhero</span> 💚</>
    ),
    donateTitle: 'Explore donation',
    donateTitleGeneral: 'Explore healthy living',
    donateSub: (organLabel) => `I want to register to donate my ${lowerFirst(organLabel)}`,
    donateSubGeneral: 'I want to learn how to take care of my health',
    micLabel: 'Tap to speak',
    knowledgeTitle: 'Medical knowledge',
    knowledgeSub: (organLabel) => `I want to learn about ${lowerFirst(organLabel)} donation`,
    knowledgeSubGeneral: 'I want to learn general medical knowledge',
    organBadgePrefix: 'Currently exploring',
    exploreBtn: 'Explore now',
    journeyTitle: 'Superhero Journey',
    levelLabel: 'Level',
    current: 'You are here',
    unlocked: 'Unlocked',
    locked: 'Locked',
    privacy: 'The data you provide stays on your device and is never stored on our servers. ',
    privacyBold: 'All your data belongs to you.',
    footer: 'Donation Hero · Spreading life together',
    back: 'Back',
    login: 'Log in',
    levels: [
      { level: 1, title: 'Learner', icon: '🥷', ring: 'from-emerald-400 to-emerald-600', badge: 'bg-emerald-500' },
      { level: 2, title: 'Interested Person', icon: '💚', ring: 'from-emerald-300 to-emerald-500', badge: 'bg-emerald-400' },
      { level: 3, title: 'Knowledgeable Person', icon: '📖', ring: 'from-sky-300 to-sky-500', badge: 'bg-sky-500' },
      { level: 4, title: 'Ready Person', icon: '🌱', ring: 'from-violet-300 to-violet-500', badge: 'bg-violet-500' },
      { level: 5, title: 'Donation Ambassador', icon: '🛡️', ring: 'from-amber-300 to-amber-500', badge: 'bg-amber-500' },
    ],
  },
};

export default function DonationHeroPanel({ mode = 'guest', onEnterAction, onBack, onLogin }) {
  const [currentLevel] = useState(1);
  const isGuest = mode === 'guest';
  const { isDark, isEn, toggleTheme, toggleLang } = useHeroPanelPrefs();
  // "Trang sau" của ChooseUserRolePanel: đọc lại đúng Cơ quan người dùng đã
  // chọn (lưu trong IndexedDB) để hiển thị đúng tên + hình (emoji) — mặc
  // định 'gan' (Liver) nếu chưa từng chọn.
  const { organId, role } = useHeroSelection();
  const organ = getOrganById(organId);
  const t = isEn ? TEXT.en : TEXT.vi;
  const JOURNEY_LEVELS = t.levels;
  const organLabel = isEn ? organ.en : organ.vi;
  // Nếu ở màn hình trước người dùng chọn "Tôi chưa muốn hiến tặng"
  // (role === 'notDonate') HOẶC chọn thẻ "Rèn luyện sức khỏe"
  // (role === 'train'), trang này không nên nói "tìm hiểu hiến tặng
  // <cơ quan>" nữa (cơ quan lúc đó chỉ là giá trị mặc định/cũ từ lần chọn
  // trước, không còn là ý định thật của người dùng) — thay bằng nội dung
  // tổng quát về chăm sóc sức khỏe, đồng bộ hành vi giữa 2 lựa chọn này.
  const isNotDonate = role === 'notDonate' || role === 'train';
  const titleHighlight = isNotDonate ? t.titleHighlightGeneral : t.titleHighlight(organLabel);
  const donateTitleText = isNotDonate ? t.donateTitleGeneral : t.donateTitle;
  const donateSubText = isNotDonate ? t.donateSubGeneral : t.donateSub(organLabel);
  const knowledgeSubText = isNotDonate ? t.knowledgeSubGeneral : t.knowledgeSub(organLabel);
  // guest (chưa đăng nhập): bấm Tạo tài khoản / Hiến tặng ngay / Nâng cao
  // kiến thức đều dẫn sang trang Login (onEnterAction do App.jsx truyền
  // xuống). member (đã đăng nhập, vào từ menu Sidebar): ẩn nút Tạo tài
  // khoản vì đã có tài khoản rồi; 2 nút hành động tạm chưa có trang đích
  // riêng nên không gắn onClick (không cần đưa người đã đăng nhập quay lại
  // Login), chỉ nút mic vẫn hoạt động như nhau ở cả 2 chế độ.
  const handleEnterAction = isGuest ? onEnterAction : undefined;

  return (
    <div
      className={`min-h-full w-full px-4 py-6 sm:px-5 sm:py-8 md:px-10 md:py-10 transition-colors ${
        isDark
          ? 'bg-gradient-to-b from-[#0b1220] to-[#0f172a] text-gray-100'
          : 'bg-gradient-to-b from-[#f6faf7] to-[#eef7f1] text-[#16241c]'
      }`}
      style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-2xl lg:max-w-3xl mx-auto">

        {/* Đổi giao diện sáng/tối + ngôn ngữ, và Tạo tài khoản (chỉ khách) */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <HeroPanelPrefsToggle
            isDark={isDark}
            isEn={isEn}
            onToggleTheme={toggleTheme}
            onToggleLang={toggleLang}
          />

          {isGuest && (
            <div className="text-right">
              <button
                onClick={onEnterAction}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm hover:shadow-md transition-all ${
                  isDark
                    ? 'border-emerald-400/30 bg-white/5 text-emerald-300 hover:border-emerald-400/60'
                    : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300'
                }`}
              >
                <UserPlus size={16} />
                {t.createAccountBtn}
              </button>
              <p className={`mt-2 text-xs leading-snug max-w-[190px] ml-auto whitespace-pre-line ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t.createAccountNote}
              </p>
            </div>
          )}
        </div>

        {/* Avatar trợ lý */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-40 h-40 mb-6">
            <Sparkles className="absolute -top-2 -left-6 text-emerald-400" size={22} />
            <Sparkles className="absolute -bottom-1 -right-5 text-emerald-400" size={16} />
            <div className="absolute inset-0 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.9),0_0_28px_rgba(16,185,129,0.35)]" />
            <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-slate-800 via-indigo-700 to-slate-900 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-40" style={{
                backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,180,80,0.5), transparent 55%), radial-gradient(circle at 70% 70%, rgba(56,189,248,0.5), transparent 55%)'
              }} />
              <span className="text-5xl relative">🧑‍⚕️</span>
            </div>
          </div>

          <p className={`text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>{t.greeting}</p>
          <h1 className={`mt-3 text-2xl sm:text-[28px] md:text-[32px] font-extrabold leading-[1.25] tracking-[-0.01em] mb-5 ${isDark ? 'text-gray-100' : 'text-[#16241c]'}`}>
            {t.titlePre}{' '}
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${isDark ? 'from-emerald-300 to-sky-300' : 'from-emerald-600 to-sky-600'}`}>
              {titleHighlight}
            </span>
            {t.titlePost}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className={`inline-flex items-center gap-2 rounded-full border shadow-sm px-4 py-2 text-sm ${isDark ? 'bg-white/5 border-white/10 text-gray-200' : 'bg-white border-emerald-100 text-gray-600'}`}>
              <ShieldCheck size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              {t.levelBadge(currentLevel)}
            </div>

            {/* Cơ quan đang chọn — tên + hình (emoji), load từ IndexedDB, đồng bộ với
            ChooseUserRolePanel. Ẩn khi người dùng đã chọn "Tôi chưa muốn hiến tặng"
            vì lúc đó cơ quan không còn liên quan đến lựa chọn của họ. */}
            {!isNotDonate && (
              <div className={`inline-flex items-center gap-2 rounded-full border shadow-sm px-4 py-2 text-sm ${isDark ? 'bg-white/5 border-white/10 text-gray-200' : 'bg-white border-emerald-100 text-gray-600'}`}>
                <span className="text-lg leading-none">{organ.emoji}</span>
                <span>{t.organBadgePrefix}: <span className="font-bold">{organLabel}</span></span>
              </div>
            )}
          </div>

          {/* CTA nổi bật kiểu "Sci-Fi / Hologram" — dẫn cùng hành động với 2 nút
          "Hiến tặng ngay" / "Nâng cao kiến thức" bên dưới (onEnterAction cho
          khách, không gắn onClick cho member vì chưa có trang đích riêng). */}
          <ExploreButton
            text={t.exploreBtn}
            onClick={handleEnterAction}
            className="mt-7"
          />
        </div>

        {/* 3 lối vào nhanh: trái = Hiến tặng ngay, giữa = mic, phải = Nâng cao kiến thức */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 items-stretch">
          <button
            onClick={handleEnterAction}
            className={`group text-left rounded-2xl border p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${
              isDark ? 'border-emerald-400/20 bg-gradient-to-b from-emerald-500/10 to-transparent' : 'border-emerald-100 bg-gradient-to-b from-emerald-50 to-white'
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-100'}`}>
              <HeartHandshake className={isDark ? 'text-emerald-400' : 'text-emerald-600'} size={26} />
            </div>
            <div className={`font-bold inline-flex items-center gap-1.5 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {donateTitleText}
              <Zap size={16} className={isDark ? 'text-emerald-300' : 'text-emerald-600'} fill="currentColor" />
            </div>
            <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{donateSubText}</div>
          </button>

          {/* Mic: trao đổi thoại trực tiếp NGAY TẠI TRANG NÀY — không mở popup
          chat. Nội dung vẫn tự đồng bộ ngầm vào popup chat (kho lưu trữ +
          sự kiện đồng bộ dùng chung với GlobalAIChatbot); lịch sử hội thoại
          tự đồng bộ với menu "Lịch sử Chat với AI" vì cả 2 dùng chung 1 kho
          lưu trữ (globalChatbotStorage.js). Popup chỉ xử lý khi người dùng
          chủ động mở nó ra. */}
          <HeroMicVoiceButton
            mode={mode}
            activePanelLabel="Anh Hùng Hiến Tặng"
            isVi={!isEn}
            isDark={isDark}
            micLabel={t.micLabel}
            variant="expanded"
            buttonSize={128}
            iconSize={48}
          />

          <button
            onClick={handleEnterAction}
            className={`group text-left rounded-2xl border p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${
              isDark ? 'border-sky-400/20 bg-gradient-to-b from-sky-500/10 to-transparent' : 'border-sky-100 bg-gradient-to-b from-sky-50 to-white'
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform ${isDark ? 'bg-sky-500/15' : 'bg-sky-100'}`}>
              <BookOpen className={isDark ? 'text-sky-400' : 'text-sky-600'} size={26} />
            </div>
            <div className={`font-bold inline-flex items-center gap-1.5 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
              {t.knowledgeTitle}
              <ArrowRight size={16} className={isDark ? 'text-sky-300' : 'text-sky-600'} />
            </div>
            <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{knowledgeSubText}</div>
          </button>
        </div>

        {/* Hành trình siêu anh hùng */}
        <div className="mt-14">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className={`h-px w-8 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
            <h2 className={`text-xs font-bold tracking-[0.15em] uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.journeyTitle}</h2>
            <span className={`h-px w-8 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
          </div>

          <div className="flex flex-wrap justify-center gap-x-2 gap-y-8 sm:gap-x-4">
            {JOURNEY_LEVELS.map((lvl) => {
              const unlocked = lvl.level <= currentLevel;
              const isCurrent = lvl.level === currentLevel;
              return (
                <div key={lvl.level} className="flex flex-col items-center w-[150px] text-center">
                  <div className="relative mb-3">
                    <div
                      className={`w-16 h-16 flex items-center justify-center text-2xl bg-gradient-to-br ${unlocked ? lvl.ring : (isDark ? 'from-white/10 to-white/5' : 'from-gray-200 to-gray-300')} shadow-sm`}
                      style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }}
                    >
                      <span className={unlocked ? '' : 'opacity-40 grayscale'}>{lvl.icon}</span>
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-[11px] font-bold text-white flex items-center justify-center border-2 ${isDark ? 'border-[#0f172a]' : 'border-white'} ${unlocked ? lvl.badge : 'bg-gray-400'}`}>
                      {lvl.level}
                    </span>
                  </div>
                  <div className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-[#16241c]'}`}>{t.levelLabel} {lvl.level}</div>
                  <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lvl.title}</div>
                  {isCurrent ? (
                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                      {t.current}
                    </span>
                  ) : unlocked ? (
                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1 ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Star size={11} /> {t.unlocked}
                    </span>
                  ) : (
                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1 ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                      {t.locked} <Lock size={11} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ghi chú quyền riêng tư */}
        <div className={`mt-12 flex items-center gap-4 rounded-2xl px-5 py-4 shadow-sm ${isDark ? 'border border-white/10 bg-white/5' : 'border border-emerald-100 bg-white/70'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            <Lock className={isDark ? 'text-emerald-400' : 'text-emerald-600'} size={18} />
          </div>
          <p className={`text-sm leading-snug ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {t.privacy}
            <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-[#16241c]'}`}>{t.privacyBold}</span>
          </p>
          <Leaf className="text-emerald-500 ml-auto flex-shrink-0 hidden sm:block" size={22} />
        </div>

        {/* Quay lại (trái) — đồng bộ vị trí/hình dạng với các nút điều hướng
        khác trong toàn dự án, luôn đặt ở dưới cùng màn hình. Đăng nhập
        (phải, chỉ hiển thị với khách) — cùng hàng với nút Quay lại. */}
        {(onBack || (isGuest && onLogin)) && (
          <div className="mt-8 flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-3">
            {onBack ? <BackButton isDark={isDark} label={t.back} onClick={onBack} /> : <span />}

            {isGuest && onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isDark
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/60'
                    : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300'
                }`}
              >
                <LogIn size={16} />
                {t.login}
              </button>
            )}
          </div>
        )}

        <div className={`flex items-center gap-1.5 justify-center mt-6 text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Award size={12} />
          {t.footer}
        </div>
      </div>
    </div>
  );
}
