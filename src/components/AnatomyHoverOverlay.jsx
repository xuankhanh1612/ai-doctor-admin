import React, { useEffect, useState } from 'react';

// ============================================================================
// AnatomyHoverOverlay — Lớp phủ chú thích tương tác (Interactive Hotspots)
// đè lên ảnh giải phẫu người "Anatomy-Human-GiaiPhauHoc" (public/assets/
// anatomy/anatomy-human.jpg).
//
// Chuyển thể từ bản .js gốc (thuần demo trên nền ảnh giả lập /assets/
// fullbody.png) sang .jsx dùng thật trong dự án:
//  - Ảnh nền lấy trực tiếp từ thư mục public (không còn placeholder).
//  - Toạ độ hotspot (top/left tính theo %) được ước lượng khớp với đúng vị
//    trí từng bộ phận SẴN CÓ nhãn trên ảnh gốc (brain, lungs, liver, stomach,
//    kidneys, v.v.) — có thể tinh chỉnh lại số % trong mảng ANNOTATIONS bên
//    dưới nếu muốn khớp pixel-perfect hơn.
//  - Sửa lỗi Tailwind JIT không nhận diện được class ghép động dạng
//    `from-${status}-400` (bản gốc) bằng cách liệt kê class tĩnh tương ứng
//    cho từng trạng thái.
//  - Đổi bảng màu mặc định (Normal) từ cyan/sci-fi sang tông emerald để đồng
//    bộ với theme của "Anh Hùng Hiến Tặng".
// ============================================================================

// Danh sách các điểm chú thích (Hotspots) khớp với các nhãn có sẵn trên ảnh.
// Toạ độ top (y) và left (x) tính bằng % so với khung ảnh (ảnh gốc tỉ lệ
// 2461x2999 ~ 0.82:1, container bên dưới giữ đúng aspect-ratio này).
const ANNOTATIONS = [
  { id: 'brain', top: '11%', left: '50%', label: 'Não bộ (Brain)', info: 'Trung tâm điều khiển hệ thần kinh trung ương, nằm trong hộp sọ.', status: 'Normal', align: 'right' },
@@ -51,113 +51,127 @@ const STATUS_STYLES = {
    text: 'text-emerald-400',
  },
  Warning: {
    card: 'text-amber-300 border-amber-400/30 bg-amber-950/90 shadow-[0_0_15px_rgba(251,191,36,0.25)]',
    dot: 'bg-amber-500 shadow-[0_0_10px_#f59e0b]',
    line: 'from-amber-400/80 to-transparent',
    text: 'text-amber-400',
  },
  Critical: {
    card: 'text-red-300 border-red-400/30 bg-red-950/90 shadow-[0_0_15px_rgba(248,113,113,0.25)]',
    dot: 'bg-red-500 shadow-[0_0_10px_#ef4444]',
    line: 'from-red-400/80 to-transparent',
    text: 'text-red-400',
  },
};

/**
 * @param {string} imageSrc - đường dẫn ảnh nền (mặc định ảnh giải phẫu trong public/assets)
 * @param {Array}  annotations - override danh sách hotspot nếu cần (mặc định dùng ANNOTATIONS)
 * @param {string} className - class bổ sung cho khung chứa ngoài cùng
 */
const AnatomyHoverOverlay = ({
  imageSrc = '/assets/anatomy/anatomy-human.jpg',
  annotations = ANNOTATIONS,
  className = '',
  highlightedAnnotationIds = null,
  defaultActiveAnnotationId = null,
}) => {
  const [activeAnnotationId, setActiveAnnotationId] = useState(defaultActiveAnnotationId);
  const spotlightAnnotationIds = Array.isArray(highlightedAnnotationIds) ? highlightedAnnotationIds : [];
  const isSpotlightMode = spotlightAnnotationIds.length > 0;

  useEffect(() => {
    setActiveAnnotationId(defaultActiveAnnotationId);
  }, [defaultActiveAnnotationId]);

  const toggleAnnotation = (id) => {
    setActiveAnnotationId((currentId) => (currentId === id ? null : id));
  };

  return (
    // Khung chứa tổng — giữ đúng tỉ lệ ảnh gốc (2461x2999) để % top/left của
    // từng hotspot luôn khớp đúng vị trí trên ảnh dù co giãn kích thước.
    <div
      className={`relative w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl ${className}`}
      style={{ aspectRatio: '2461 / 2999' }}
      onClick={() => setActiveAnnotationId(null)}
    >
      {/* 1. NỀN — ảnh giải phẫu thật */}
      <img
        src={imageSrc}
        alt="Anatomy of the human body"
        className="absolute inset-0 w-full h-full object-contain bg-white"
        draggable={false}
      />

      {/* 2. CÁC ĐIỂM HOTSPOT & TEXT OVERLAY */}
      {annotations.map((ann) => {
        const style = STATUS_STYLES[ann.status] || STATUS_STYLES.Normal;
        const isHighlighted = !isSpotlightMode || spotlightAnnotationIds.includes(ann.id);
        const isActive = activeAnnotationId === ann.id || (isSpotlightMode && isHighlighted);
        const hoverPanelClasses = isHighlighted ? 'group-hover/hotspot:opacity-100 group-hover/hotspot:pointer-events-auto group-hover/hotspot:translate-x-0' : '';
        const hoverLineClasses = isHighlighted ? 'group-hover/hotspot:opacity-100' : '';
        const activePanelClasses = isActive
          ? 'opacity-100 pointer-events-auto translate-x-0'
          : `opacity-0 pointer-events-none ${ann.align === 'right' ? 'translate-x-3' : '-translate-x-3'}`;
        const activeLineClasses = isActive ? 'opacity-100' : 'opacity-0';

        return (
          <div
            key={ann.id}
            className={`absolute group/hotspot z-10 ${isSpotlightMode && !isHighlighted ? 'opacity-25 grayscale' : ''}`}
            style={{ top: ann.top, left: ann.left }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* --- Nút tròn nhấp nháy --- */}
            <button
              type="button"
              className="relative flex items-center justify-center w-5 h-5 -ml-2.5 -mt-2.5 cursor-crosshair rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label={`Hiển thị thông tin ${ann.label}`}
              aria-expanded={isActive}
              aria-disabled={!isHighlighted}
              onClick={() => {
                if (isHighlighted) toggleAnnotation(ann.id);
              }}
            >
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping ${isHighlighted ? 'group-hover/hotspot:opacity-100' : ''} ${isActive ? 'opacity-100' : ''} ${style.dot.split(' ')[0]}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`}></span>
            </button>

            {/* --- Bảng thông tin (hiện khi hover) --- */}
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 w-52 sm:w-60
                backdrop-blur-md border rounded-xl p-3
                ${hoverPanelClasses}
                transition-all duration-300 ease-out z-20
                ${ann.align === 'right' ? 'left-6' : 'right-6'}
                ${activePanelClasses}
                ${style.card}
              `}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${style.dot.split(' ')[0]}`}></div>
                <h4 className="font-bold text-xs tracking-wide text-white uppercase">{ann.label}</h4>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">{ann.info}</p>
            </div>

            {/* --- Đường kẻ nối --- */}
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 h-[1px] w-4
                ${hoverLineClasses} transition-all duration-300 delay-75
                ${activeLineClasses}
                ${ann.align === 'right' ? 'left-2.5 bg-gradient-to-r' : 'right-2.5 bg-gradient-to-l'}
                ${style.line}
              `}
            ></div>
          </div>
        );
      })}
    </div>
  );
};

export default AnatomyHoverOverlay;
