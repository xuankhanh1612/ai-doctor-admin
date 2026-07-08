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
const EVENT_NAME = 'heroPanelPrefsChange';

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function readLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
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
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      window.dispatchEvent(new Event(EVENT_NAME));
      return next;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'en' ? 'vi' : 'en';
      try { localStorage.setItem(LANG_KEY, next); } catch {}
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
