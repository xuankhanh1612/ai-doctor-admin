import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '../../lib/anonDB.js';
import { DEFAULT_ORGAN_ID } from '../../data/organs.js';

// ============================================================================
// useHeroSelection — đọc/ghi lựa chọn "Vai trò" (donate / train / receive / notDonate)
// và "Cơ quan quan tâm" của người dùng vào IndexedDB (DB "cdoc_guest" ›
// store "settings", dùng lại getSetting/setSetting có sẵn trong
// lib/anonDB.js) để dùng lại sau này:
//   - ChooseUserRolePanel: ghi lựa chọn mỗi khi người dùng bấm chọn Vai trò
//     hoặc Cơ quan, và tự khôi phục lựa chọn cũ khi quay lại màn hình.
//     Nút "Tôi chưa muốn hiến tặng" lưu role = 'notDonate' để đồng bộ
//     lựa chọn không hiến tạng sang các màn hình tiếp theo.
//   - DonationHeroPanel ("trang sau"): đọc lại đúng Cơ quan đã chọn để hiển
//     thị đúng tên + hình (emoji) — mặc định 'gan' nếu chưa từng chọn.
// IndexedDB là bất đồng bộ nên lần render đầu tiên sẽ tạm dùng giá trị mặc
// định (organId = 'gan', role = null) rồi cập nhật lại ngay khi đọc xong.
// ============================================================================

const ROLE_KEY = 'heroSelection:role';
const ORGAN_KEY = 'heroSelection:organ';

export default function useHeroSelection() {
  const [role, setRoleState] = useState(null);
  const [organId, setOrganState] = useState(DEFAULT_ORGAN_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [savedRole, savedOrgan] = await Promise.all([
          getSetting(ROLE_KEY),
          getSetting(ORGAN_KEY),
        ]);
        if (cancelled) return;
        if (savedRole) setRoleState(savedRole);
        if (savedOrgan) setOrganState(savedOrgan);
      } catch (e) {
        console.warn('Không đọc được lựa chọn Vai trò/Cơ quan từ IndexedDB:', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true };
  }, []);

  const setRole = useCallback((value) => {
    setRoleState(value);
    setSetting(ROLE_KEY, value).catch((e) => {
      console.warn('Không lưu được Vai trò vào IndexedDB:', e);
    });
  }, []);

  const setOrgan = useCallback((value) => {
    setOrganState(value);
    setSetting(ORGAN_KEY, value).catch((e) => {
      console.warn('Không lưu được Cơ quan vào IndexedDB:', e);
    });
  }, []);

  return { role, organId, setRole, setOrgan, ready };
}
