import React from 'react';
import { Sun, Moon, Languages } from 'lucide-react';

// ============================================================================
// HeroPanelPrefsToggle — cụm 2 nút nhỏ (đổi theme sáng/tối + đổi ngôn ngữ
// Việt/Anh) dùng chung cho ChooseUserRolePanel và DonationHeroPanel.
// ============================================================================

export default function HeroPanelPrefsToggle({ isDark, isEn, onToggleTheme, onToggleLang, className = '' }) {
  const pillBase = isDark
    ? 'bg-white/10 border-white/20 text-gray-100 hover:bg-white/20'
    : 'bg-white border-emerald-100 text-gray-600 hover:border-emerald-300';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onToggleTheme}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all ${pillBase}`}
        aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        title={isDark ? (isEn ? 'Switch to light mode' : 'Chuyển giao diện sáng') : (isEn ? 'Switch to dark mode' : 'Chuyển giao diện tối')}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
        {isDark ? (isEn ? 'Light' : 'Sáng') : (isEn ? 'Dark' : 'Tối')}
      </button>
      <button
        type="button"
        onClick={onToggleLang}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all ${pillBase}`}
        aria-label={isEn ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
        title={isEn ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
      >
        <Languages size={14} />
        {isEn ? 'EN' : 'VI'}
      </button>
    </div>
  );
}
