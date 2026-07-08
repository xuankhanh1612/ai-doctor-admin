import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// useHeroPanelPrefs — theme (sáng/tối) + ngôn ngữ (Việt/Anh) dùng CHUNG cho
// 2 màn hình độc lập "Chọn Vai Trò Anh Hùng" (ChooseUserRolePanel) và
// "Anh Hùng Hiến Tặng" (DonationHeroPanel). Lưu vào localStorage để khi
// người dùng chuyển từ màn này sang màn kia, lựa chọn theme/ngôn ngữ vẫn
// được giữ nguyên (đồng bộ), kể cả sau khi tải lại trang.
// ============================================================================

const THEME_KEY = 'heroPanel:theme';
const LANG_KEY = 'heroPanel:lang';
// Khoá theme/ngôn ngữ dùng CHUNG cho toàn bộ ứng dụng (đọc bởi AppContext.jsx
// sau khi đăng nhập). Ghi thêm vào đây khi người dùng đổi theme/ngôn ngữ ở
// các màn hình Anh Hùng Hiến Tặng để lựa chọn được giữ nguyên xuyên suốt cả
// dự án, kể cả sau khi đăng nhập vào ứng dụng chính.
const GLOBAL_THEME_KEY = 'cdoc_theme';
const GLOBAL_LANG_KEY = 'cdoc_lang';
const EVENT_NAME = 'heroPanelPrefsChange';

function readTheme() {
  try {
    const local = localStorage.getItem(THEME_KEY);
    if (local === 'dark' || local === 'light') return local;
  } catch {
    // ignore
  }
  return 'light';
}

function readLang() {
  try {
    const local = localStorage.getItem(LANG_KEY);
    if (local === 'en' || local === 'vi') return local;
  } catch {
    // ignore
  }
  return 'vi';
}

export default function useHeroPanelPrefs() {
  const [theme, setTheme] = useState(readTheme);
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    const onChange = () => {
      setTheme(readTheme());
      setLang(readLang());
    };
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
        // Đồng bộ toàn dự án: ứng dụng chính (AppContext.jsx) đọc 'cdoc_theme'
        // khi khởi động, nên ghi luôn vào đây để giữ đúng lựa chọn sau đăng nhập.
        localStorage.setItem(GLOBAL_THEME_KEY, next);
        document.documentElement.setAttribute('data-theme', next);
      } catch {}
      window.dispatchEvent(new Event(EVENT_NAME));
      return next;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'en' ? 'vi' : 'en';
      try {
        localStorage.setItem(LANG_KEY, next);
        // Đồng bộ toàn dự án: ứng dụng chính (AppContext.jsx) đọc 'cdoc_lang'
        // khi khởi động, nên ghi luôn vào đây để giữ đúng lựa chọn sau đăng nhập.
        localStorage.setItem(GLOBAL_LANG_KEY, next);
      } catch {}
      window.dispatchEvent(new Event(EVENT_NAME));
      return next;
    });
  }, []);

  return {
    theme,
    lang,
    isDark: theme === 'dark',
    isEn: lang === 'en',
    toggleTheme,
    toggleLang,
  };
}
