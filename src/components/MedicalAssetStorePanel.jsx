import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'; 
import marketData from '../data/medical_3d_market.json';
import { useAuth } from '../context/AuthContext';

// ============================================================================
// CHỦ ĐỀ (THEME) COMBOBOX — cùng ý tưởng với "Chủ đề (projects.json)" của
// trang Tạo Avatar: một danh sách "chủ đề" để chọn, mỗi chủ đề trỏ tới một
// nguồn dữ liệu JSON riêng. Ở đây item đầu tiên là kho nội bộ
// (medical_3d_market.json), 4 item còn lại là 4 link .json lấy trực tiếp từ
// README của modelscope/richdreamer (dataset gobjaverse):
// https://github.com/modelscope/richdreamer/blob/main/dataset/gobjaverse/README.md
// ============================================================================
const INTERNAL_THEME_ID = 'medical_internal';

const EXTERNAL_THEMES = [
  {
    id: 'gobjaverse_280k',
    name: 'G-Objaverse 280K',
    license: 'Objaverse (gobjaverse)',
    url: 'https://virutalbuy-public.oss-cn-hangzhou.aliyuncs.com/share/aigc3d/gobjaverse_280k.json',
  },
  {
    id: 'category_annotation',
    name: 'Category Annotation (10 nhóm)',
    license: 'Objaverse subset',
    url: 'https://virutalbuy-public.oss-cn-hangzhou.aliyuncs.com/share/aigc3d/category_annotation.json',
  },
  {
    id: 'text_captions_cap3d',
    name: 'Cap3D Text Captions',
    license: 'Cap3D',
    url: 'https://virutalbuy-public.oss-cn-hangzhou.aliyuncs.com/share/aigc3d/text_captions_cap3d.json',
  },
  {
    id: 'gobjaverse_alignment',
    name: 'Objaverse-XL Alignment',
    license: 'Objaverse-XL',
    url: 'https://virutalbuy-public.oss-cn-hangzhou.aliyuncs.com/share/aigc3d/gobjaverse_alignment.json',
  },
];

const MAX_EXTERNAL_PREVIEW = 100; // các file gốc có thể lên tới hàng trăm nghìn dòng -> chỉ xem trước

function externalThumbnail(themeName) {
  const initials = String(themeName || '3D').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="0" fill="#12182b"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="800" fill="#00e5ff">${initials}</text></svg>`)}`;
}

function fileNameFromUrl(url) {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split('/').filter(Boolean).pop() || url);
  } catch {
    return String(url || '').split('/').filter(Boolean).pop() || String(url || '');
  }
}

// Các file .json gốc có nhiều hình dạng khác nhau (mảng, object dạng
// dictionary_id -> [...], hoặc object dạng id -> caption). Hàm này quy về
// một mảng các entry {id, value} để xử lý đồng nhất, không giả định cấu trúc.
function toEntriesArray(data) {
  if (Array.isArray(data)) return data.map((value, index) => ({ id: `item-${index}`, value }));
  if (data && typeof data === 'object') return Object.entries(data).map(([id, value]) => ({ id, value }));
  return [];
}

function normalizeExternalItem(entry, theme, index) {
  const { id, value } = entry;
  let rawUrl = '';
  let titleFromValue = '';
  let downloads = 0;

  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) rawUrl = value;
    else titleFromValue = value.trim();
  } else if (Array.isArray(value)) {
    downloads = value.length;
  } else if (value && typeof value === 'object') {
    rawUrl = value.url || value.glb || value.model || value.path || '';
    titleFromValue = value.name || value.title || value.caption || '';
    downloads = Number(value.count || value.downloads || 0) || 0;
  } else if (typeof value === 'number') {
    downloads = value;
  }

  const title = titleFromValue || (rawUrl ? fileNameFromUrl(rawUrl) : String(id)).slice(0, 140);

  return {
    id: `${theme.id}-${index}-${String(id).slice(0, 40)}`,
    title,
    author: theme.name,
    price: 0,
    downloads,
    thumbnail: externalThumbnail(theme.name),
    modelUrl: rawUrl,
    tags: ['Open Dataset', theme.name],
    isExternal: true,
    sourceUrl: theme.url,
  };
}

async function loadExternalTheme(theme) {
  const response = await fetch(theme.url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const entries = toEntriesArray(data);
  const total = entries.length;
  const preview = entries.slice(0, MAX_EXTERNAL_PREVIEW).map((entry, index) => normalizeExternalItem(entry, theme, index));
  return { assets: preview, total };
}

// ============================================================================
// 1. MODULE INDEXED-DB (Lưu trữ vĩnh viễn dữ liệu tài khoản, ví tiền, kho đồ và avatar)
// ============================================================================
const DB_NAME = 'AiDoctor_Store_DB';
const STORE_NAME = 'user_assets_store';
const DB_VERSION = 1;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveDataToDB = async (key, value) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Lỗi lưu IndexedDB:", error);
  }
};

const loadDataFromDB = async (key, defaultValue) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result !== undefined ? request.result : defaultValue);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Lỗi đọc IndexedDB:", error);
    return defaultValue;
  }
};

// Cấu hình phân trang
const PAGE_SIZE_OPTIONS = [8, 16, 32];

// ============================================================================

export default function MedicalAssetStorePanel() {
  const { updateProfile } = useAuth();

  // --- STATE MANAGEMENT ---
  const [viewMode, setViewMode] = useState("store"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("Tất cả");
  const [sortBy, setSortBy] = useState("popular");
  const [previewAsset, setPreviewAsset] = useState(null);

  // --- CHỦ ĐỀ (THEME) COMBOBOX ---
  const [selectedTheme, setSelectedTheme] = useState(INTERNAL_THEME_ID);
  const [externalAssets, setExternalAssets] = useState([]);
  const [externalTotal, setExternalTotal] = useState(0);
  const [themeStatus, setThemeStatus] = useState('idle'); // idle | loading | ok | error
  const [themeError, setThemeError] = useState('');
  
  // States Phân trang
  const [pageSize, setPageSize] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Quản lý dữ liệu người dùng
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [userCoins, setUserCoins] = useState(2500); 
  const [unlockedAssets, setUnlockedAssets] = useState([4, 7]); 
  const [toast, setToast] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState('');

  // 1. Tự động load dữ liệu từ IndexedDB
  useEffect(() => {
    const fetchUserData = async () => {
      const savedCoins = await loadDataFromDB('user_health_coins', 2500);
      const savedAssets = await loadDataFromDB('unlocked_medical_assets', [4, 7]);
      
      setUserCoins(savedCoins);
      setUnlockedAssets(savedAssets);
      setIsDbLoaded(true);
    };
    fetchUserData();
  }, []);

  // 2. Load thư viện Google Model Viewer
  useEffect(() => {
    const scriptId = 'google-model-viewer-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
      document.body.appendChild(script);
    }
  }, []);

  // 3. Reset phân trang về Trang 1 khi điều kiện lọc thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag, sortBy, viewMode, pageSize, selectedTheme]);

  // 4. Tải dữ liệu chủ đề (theme) đang chọn trong combobox — nếu là chủ đề
  // ngoài (1 trong 4 link .json của gobjaverse) thì fetch trực tiếp; chủ đề
  // nội bộ dùng luôn medical_3d_market.json đã import sẵn.
  useEffect(() => {
    if (selectedTheme === INTERNAL_THEME_ID) {
      setThemeStatus('ok');
      setThemeError('');
      setExternalAssets([]);
      setExternalTotal(0);
      setSelectedTag('Tất cả');
      return;
    }
    const theme = EXTERNAL_THEMES.find((t) => t.id === selectedTheme);
    if (!theme) return;

    let cancelled = false;
    setThemeStatus('loading');
    setThemeError('');
    setSelectedTag('Tất cả');

    loadExternalTheme(theme)
      .then(({ assets, total }) => {
        if (cancelled) return;
        setExternalAssets(assets);
        setExternalTotal(total);
        setThemeStatus('ok');
      })
      .catch((err) => {
        if (cancelled) return;
        setExternalAssets([]);
        setExternalTotal(0);
        setThemeStatus('error');
        setThemeError(err?.message || 'Không thể tải dữ liệu');
      });

    return () => { cancelled = true; };
  }, [selectedTheme]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- LOGIC MUA / MỞ KHÓA TÀI NGUYÊN ---
  const handleUnlockAsset = async (asset) => {
    if (unlockedAssets.includes(asset.id)) {
      showToast(`Đang tải xuống tệp nguồn "${asset.title}"...`, 'info');
      return;
    }

    if (userCoins < asset.price) {
      showToast("Bạn không đủ Health Coins! Hãy kiếm thêm từ các Hành trình sức khỏe.", "error");
      return;
    }

    const newCoins = userCoins - asset.price;
    const newUnlocked = [...unlockedAssets, asset.id];
    
    setUserCoins(newCoins);
    setUnlockedAssets(newUnlocked);
    
    await saveDataToDB('user_health_coins', newCoins);
    await saveDataToDB('unlocked_medical_assets', newUnlocked);
    
    showToast(`Đã lưu "${asset.title}" vào Kho đồ cá nhân!`, "success");
  };

  // --- LOGIC THIẾT LẬP AVATAR HỒ SƠ ---
  const handleSetAsAvatar = async (asset) => {
    if (!asset) return;
    
    setSaving(true);
    try {
      await saveDataToDB('user_current_avatar_asset', asset);
      
      updateProfile({
        avatar: asset.thumbnail,
        avatarCustomized: true,
        openSourceAvatar: {
          id: asset.id,
          name: asset.title,
          collectionId: 'medical_asset_store',
          collectionName: 'Medical 3D Store',
          license: 'Purchased Asset',
          thumbnailUrl: asset.thumbnail || '',
          modelFileUrl: asset.modelUrl || '',
          source: 'internal_store',
        },
      });
      
      setSaveNote('Đã lưu làm avatar hồ sơ!');
      showToast(`✨ Đã thiết lập thành công "${asset.title}" làm hình đại diện!`, "success");
      
      setTimeout(() => {
        setSaving(false);
        setSaveNote('');
        setPreviewAsset(null); 
      }, 1500);

    } catch (err) {
      console.error("Lỗi thiết lập avatar:", err);
      showToast("Không thể thiết lập avatar, vui lòng thử lại.", "error");
      setSaving(false);
    }
  };

  const isInternalTheme = selectedTheme === INTERNAL_THEME_ID;
  const activeThemeData = isInternalTheme ? marketData : externalAssets;
  const activeThemeMeta = isInternalTheme
    ? { id: INTERNAL_THEME_ID, name: 'Kho Y Tế (Nội bộ)', license: 'Consensus Doctor' }
    : EXTERNAL_THEMES.find((t) => t.id === selectedTheme);

  const quickCategories = isInternalTheme
    ? ["Tất cả", "3D Model", "In 3D", "Digital Twin", "Avatar VRM", "Gamification"]
    : ["Tất cả", "Open Dataset", activeThemeMeta?.name].filter(Boolean);

  // --- LỌC DỮ LIỆU ---
  const filteredAssets = activeThemeData
    .filter(asset => {
      if (viewMode === "inventory" && !unlockedAssets.includes(asset.id)) {
        return false;
      }
      const matchesSearch = 
        asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTab = selectedTag === "Tất cả" || asset.tags.includes(selectedTag);
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      if (sortBy === "popular") return b.downloads - a.downloads;
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return 0;
    });

  // --- TÍNH TOÁN PHÂN TRANG ---
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  // Cắt mảng dữ liệu để lấy đúng số lượng item của trang hiện tại
  const pagedAssets = filteredAssets.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (!isDbLoaded) {
    return <div className="p-6 text-center text-white h-full flex items-center justify-center font-mono tracking-widest">ĐANG TẢI DỮ LIỆU Y TẾ AN TOÀN...</div>;
  }

  return (
    <div className="p-6 min-h-screen text-gray-200 w-full rounded-xl bg-[#04060f] relative font-sans animate-fade">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[110] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md border border-white/10 text-sm font-semibold transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500/90 text-white shadow-emerald-500/20' :
          toast.type === 'error' ? 'bg-rose-500/90 text-white shadow-rose-500/20' : 'bg-blue-500/90 text-white shadow-blue-500/20'
        }`}>
          <span>{toast.type === 'success' ? '🎉' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          {toast.message}
        </div>
      )}

      {/* HEADER STORE & VÍ TIỀN */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#00e5ff] to-[#9c6fff] bg-clip-text text-transparent">
            {viewMode === "store" ? "Chợ Tài Nguyên Y Tế v4" : "Kho Đồ Sinh Học Của Tôi"}
          </h1>
          <p className="text-gray-400 mt-1 text-sm max-w-xl">
            {viewMode === "store" 
              ? "Khám phá cấu trúc giải phẫu 3D, tệp tin in mô hình sinh học STL hoặc đổi thiết kế Avatar." 
              : `Hệ thống ghi nhận bạn đang sở hữu ${unlockedAssets.length} tài nguyên số được bảo mật lâu dài.`}
          </p>
        </div>
        
        {/* TIỀN XU */}
        <div className="flex items-center gap-3 bg-black/40 px-5 py-2.5 rounded-xl border border-[#ffb74d]/30 shadow-[0_0_15px_rgba(255,183,77,0.1)] shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black font-black text-lg shadow-inner">
            🪙
          </div>
          <div>
            <div className="text-[10px] text-amber-400 uppercase tracking-widest font-mono font-bold">Số dư của bạn</div>
            <div className="text-xl font-black text-white font-mono">{userCoins.toLocaleString()} <span className="text-xs text-amber-300">Coins</span></div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/10 w-full sm:w-fit mb-8 mx-auto sm:mx-0 shadow-inner">
        <button 
          onClick={() => setViewMode("store")}
          className={`flex-1 sm:px-8 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
            viewMode === "store" 
              ? 'bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          🛒 Chợ Mua Sắm 
          <span className={`px-2 py-0.5 rounded-md text-[10px] ${viewMode === "store" ? "bg-black/20 text-black" : "bg-white/20 text-gray-300"}`}>
            {activeThemeData.length}
          </span>
        </button>
        <button 
          onClick={() => setViewMode("inventory")}
          className={`flex-1 sm:px-8 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
            viewMode === "inventory" 
              ? 'bg-gradient-to-r from-[#9c6fff] to-[#804dee] text-white shadow-[0_0_15px_rgba(156,111,255,0.4)]' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          🎒 Kho Đồ 
          <span className={`px-2 py-0.5 rounded-md text-[10px] ${viewMode === "inventory" ? "bg-white/20 text-white" : "bg-white/20 text-gray-300"}`}>
            {unlockedAssets.length}
          </span>
        </button>
      </div>

      {/* SEARCH BAR & FILTER OPTIONS */}
      <div className="flex flex-col gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/5">

        {/* CHỦ ĐỀ COMBOBOX — item đầu tiên là kho nội bộ, 4 item sau lấy từ
            4 link .json trong README của modelscope/richdreamer (gobjaverse) */}
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Chủ đề (projects.json):</span>
          <select
            className="bg-black/50 border border-white/10 text-white px-3 py-1.5 rounded-lg text-sm focus:ring-1 focus:ring-[#00e5ff] focus:outline-none cursor-pointer w-full md:w-auto"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
          >
            <option value={INTERNAL_THEME_ID}>Kho Y Tế (Nội bộ) · medical_3d_market.json</option>
            {EXTERNAL_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>{theme.name} · {theme.license}</option>
            ))}
          </select>

          {!isInternalTheme && themeStatus === 'loading' && (
            <span className="text-[11px] text-amber-400 font-mono">⏳ Đang tải {activeThemeMeta?.name}...</span>
          )}
          {!isInternalTheme && themeStatus === 'ok' && (
            <span className="text-[11px] text-emerald-400 font-mono">
              ✓ Xem trước {externalAssets.length}/{externalTotal.toLocaleString()} mục (giới hạn bản xem trước)
            </span>
          )}
          {!isInternalTheme && themeStatus === 'error' && (
            <span className="text-[11px] text-rose-400 font-mono" title={activeThemeMeta?.url}>
              ⚠️ Không tải được: {themeError}
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm cấu trúc, tác giả, tag..."
              className="w-full pl-9 pr-4 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00e5ff] bg-black/40 text-white placeholder-gray-500 text-sm transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Sắp xếp:</span>
            <select
              className="bg-black/50 border border-white/10 text-white px-3 py-1.5 rounded-lg text-sm focus:ring-1 focus:ring-[#00e5ff] focus:outline-none cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="popular">🔥 Lượt tải nhiều nhất</option>
              <option value="price-low">🪙 Giá: Thấp đến Cao</option>
              <option value="price-high">🪙 Giá: Cao đến Thấp</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickCategories.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border whitespace-nowrap transition-all ${
                selectedTag === tag
                  ? 'bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] text-black border-transparent shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* HIỂN THỊ SỐ LƯỢNG ITEM */}
      <div className="text-xs text-gray-400 mb-4 font-mono">
        Tìm thấy <strong className="text-[#00e5ff]">{filteredAssets.length}</strong> tài nguyên
      </div>

      {/* ASSET ITEMS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        {pagedAssets.map((asset) => {
          const isOwned = unlockedAssets.includes(asset.id);
          
          return (
            <div 
              key={asset.id} 
              className="bg-gradient-to-b from-white/10 to-white/5 rounded-2xl shadow-xl hover:shadow-[0_15px_30px_rgba(0,229,255,0.15)] transition-all duration-300 border border-white/10 flex flex-col overflow-hidden group group-hover:border-[#00e5ff]/40"
            >
              <div className="relative h-48 bg-black/40 overflow-hidden cursor-pointer">
                <img
                  src={asset.thumbnail}
                  alt={asset.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onClick={() => setPreviewAsset(asset)}
                />
                <div 
                  onClick={() => setPreviewAsset(asset)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-xs font-bold tracking-wider text-[#00e5ff] gap-1.5"
                >
                  <span>👁️</span> XEM TƯƠNG TÁC 3D
                </div>
                
                {viewMode === "store" && isOwned && (
                  <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[10px] font-black px-2 py-1 rounded shadow-md z-10">
                    ĐÃ SỞ HỮU
                  </div>
                )}

                <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap max-w-[90%]">
                  {asset.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="bg-black/70 text-[10px] text-white font-semibold px-2 py-0.5 rounded backdrop-blur-md border border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 flex flex-col flex-grow">
                <h3 
                  onClick={() => setPreviewAsset(asset)}
                  className="font-bold text-base text-white line-clamp-2 mb-1.5 cursor-pointer hover:text-[#00e5ff] transition-colors" 
                  title={asset.title}
                >
                  {asset.title}
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  tác giả <span className="font-semibold text-gray-300 cursor-pointer hover:underline">{asset.author}</span>
                </p>

                <div className="mt-auto pt-3 border-t border-white/10 flex justify-between items-center font-mono">
                  {viewMode === "store" ? (
                    <div className={`flex items-center font-bold text-sm ${asset.price === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <span className="mr-1">{asset.price === 0 ? '🎁' : '🪙'}</span>
                      {asset.price === 0 ? "Miễn phí" : `${asset.price.toLocaleString()} Coins`}
                    </div>
                  ) : (
                    <div className="flex items-center font-bold text-sm text-purple-400">
                      <span className="mr-1">💼</span> Trong kho lưu trữ
                    </div>
                  )}

                  <div className="flex items-center text-xs text-gray-400 font-medium">
                    <span className="mr-1">📥</span>{asset.downloads.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="px-4 pb-4">
                 <button 
                    onClick={() => {
                      if (isOwned) {
                        setPreviewAsset(asset);
                      } else {
                        handleUnlockAsset(asset);
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all duration-300 border flex justify-center items-center gap-1.5 ${
                      isOwned 
                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white hover:border-transparent shadow-lg shadow-purple-500/5'
                        : asset.price === 0 
                        ? 'bg-transparent border-[#00e5ff] text-[#00e5ff] hover:bg-[#00e5ff] hover:text-black'
                        : 'bg-transparent border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black'
                    }`}
                 >
                    {isOwned ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        Ứng Dụng Vật Phẩm
                      </>
                    ) : (
                      asset.price === 0 ? "Tải miễn phí" : `Mở khóa vật phẩm`
                    )}
                 </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINATION CONTROLS (Thanh Điều Khiển Phân Trang) */}
      {filteredAssets.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 mb-8 bg-white/5 p-4 rounded-xl border border-white/5 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-gray-400 font-mono uppercase tracking-widest whitespace-nowrap">Hiển thị</span>
            <select
              className="bg-black/50 border border-white/10 text-white px-3 py-1.5 rounded-lg text-sm focus:ring-1 focus:ring-[#00e5ff] focus:outline-none cursor-pointer w-full sm:w-auto"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size} / trang</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-black/40 text-gray-400 hover:text-[#00e5ff] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-mono text-gray-400 tracking-widest">
              <strong className="text-white text-base">{safePage}</strong> / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-black/40 text-gray-400 hover:text-[#00e5ff] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* EMPTY STATE CONTAINER */}
      {filteredAssets.length === 0 && (
        <div className="text-center py-24 text-gray-500 border border-dashed border-gray-700 rounded-2xl bg-gray-900/20">
          <span className="text-4xl block mb-2">{viewMode === "inventory" ? "🎒" : "🔍"}</span>
          <p className="text-lg font-medium">
            {viewMode === "inventory" ? "Kho đồ sinh học đang trống." : "Không tìm thấy tài nguyên phù hợp."}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {viewMode === "inventory" ? "Hãy truy cập Chợ Mua Sắm để trang bị các mô hình 3D cao cấp nhé!" : "Thử tìm kiếm theo nhãn tag như 'In 3D', 'Avatar'..."}
          </p>
        </div>
      )}

      {/* POPUP MODAL DETAIL */}
      {previewAsset && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade">
          <div className="bg-[#0b101d] text-white rounded-2xl border border-cyan-500/20 max-w-3xl w-full p-6 relative shadow-[0_0_60px_rgba(0,229,255,0.15)] flex flex-col h-[85vh]">
            
            <button 
              onClick={() => setPreviewAsset(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-lg z-10"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-white pr-8 mb-4 tracking-tight">{previewAsset.title}</h2>
            
            <div className="flex-grow bg-black/40 rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center shadow-inner">
              {previewAsset.modelUrl ? (
                <model-viewer
                  src={previewAsset.modelUrl}
                  alt={previewAsset.title}
                  auto-rotate
                  camera-controls
                  touch-action="pan-y"
                  style={{ width: '100%', height: '100%', '--poster-color': 'transparent', outline: 'none' }}
                ></model-viewer>
              ) : (
                <div className="text-center p-6 max-w-sm">
                  <span className="text-5xl mb-3 block">{previewAsset.isExternal ? '🗂️' : '📜'}</span>
                  <h4 className="font-bold text-sm text-gray-200 mb-1">
                    {previewAsset.isExternal ? 'Bản ghi dữ liệu mở (Open Dataset)' : 'Gói Logic Sức Khỏe'}
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {previewAsset.isExternal
                      ? 'Mục này đến từ tập dữ liệu JSON mở (gobjaverse/Objaverse), không có model 3D xem trực tiếp được.'
                      : 'Tài nguyên là hệ thống trò chơi và danh sách nhiệm vụ, không bao gồm cấu trúc hình học tĩnh.'}
                  </p>
                  {previewAsset.isExternal && previewAsset.sourceUrl && (
                    <a href={previewAsset.sourceUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-[11px] font-bold text-[#00e5ff] hover:underline">
                      Xem nguồn JSON gốc ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 text-center border-t border-b border-white/5 py-3 my-4 text-xs font-mono text-gray-400">
              <div>Tác giả: <span className="text-cyan-400 font-semibold">{previewAsset.author}</span></div>
              <div>Tệp tin: <span className="text-purple-400 font-semibold">{previewAsset.modelUrl ? 'glb' : 'json'}</span></div>
              <div>Lượt tải: <span className="text-amber-400 font-semibold">{previewAsset.downloads.toLocaleString()}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              
              <div className="w-full sm:w-auto flex flex-col items-center sm:items-start gap-1">
                {unlockedAssets.includes(previewAsset.id) ? (
                  <>
                    <button
                      onClick={() => handleSetAsAvatar(previewAsset)}
                      disabled={saving}
                      style={{ 
                        background: 'linear-gradient(135deg, #00e5ff, #00e676)',
                        color: '#001018'
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs tracking-wider flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-wait"
                    >
                      {saving ? (
                        "Đang lưu..."
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Dùng làm avatar hồ sơ
                        </>
                      )}
                    </button>
                    {saveNote && <div className="text-[#00e676] text-[11px] font-bold text-center sm:text-left mt-1 w-full">{saveNote}</div>}
                  </>
                ) : (
                  <div className="text-xs font-mono text-gray-500 italic pl-1">
                    Mở khóa tài nguyên để kích hoạt Avatar hồ sơ
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => handleUnlockAsset(previewAsset)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold font-mono border flex items-center justify-center gap-1.5 transition-all ${
                    unlockedAssets.includes(previewAsset.id)
                      ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                      : 'bg-amber-500 border-transparent text-black hover:brightness-110 shadow-lg shadow-amber-500/10'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  {unlockedAssets.includes(previewAsset.id) ? "Tải về nguồn" : `Mở khóa (${previewAsset.price} Xu)`}
                </button>
                
                <button 
                  onClick={() => setPreviewAsset(null)} 
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-bold text-xs tracking-wide uppercase transition-colors"
                >
                  Đóng
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}