import React, { useState } from 'react';

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
  { id: 'skull', top: '14.5%', left: '54%', label: 'Hộp sọ (Skull)', info: 'Khung xương bảo vệ não bộ, gồm nhiều xương dẹt gắn khít với nhau.', status: 'Normal', align: 'right' },
  { id: 'oesophagus', top: '19%', left: '50%', label: 'Thực quản (Oesophagus)', info: 'Ống dẫn thức ăn từ hầu họng xuống dạ dày, dài khoảng 25cm.', status: 'Normal', align: 'left' },
  { id: 'lymph-nodes', top: '23%', left: '41%', label: 'Hạch bạch huyết (Lymph nodes)', info: 'Cấu trúc nhỏ hình hạt đậu, lọc bạch huyết và chứa tế bào miễn dịch.', status: 'Normal', align: 'left' },
  { id: 'lungs', top: '27%', left: '50%', label: 'Phổi (Lungs)', info: 'Cơ quan hô hấp chính, trao đổi oxy và CO2 giữa không khí và máu.', status: 'Normal', align: 'right' },
  { id: 'lymph', top: '33%', left: '39%', label: 'Bạch huyết (Lymph)', info: 'Dịch trong suốt lưu thông trong hệ bạch huyết, hỗ trợ miễn dịch.', status: 'Normal', align: 'left' },
  { id: 'liver', top: '37%', left: '45%', label: 'Gan (Liver)', info: 'Cơ quan lớn nhất trong ổ bụng, đảm nhiệm chuyển hoá và thải độc.', status: 'Normal', align: 'left' },
  { id: 'stomach', top: '37%', left: '56%', label: 'Dạ dày (Stomach)', info: 'Túi cơ chứa và tiêu hoá thức ăn bằng dịch vị và enzym.', status: 'Normal', align: 'right' },
  { id: 'kidneys', top: '43%', left: '49%', label: 'Thận (Kidneys)', info: 'Cặp cơ quan lọc máu, tạo nước tiểu và điều hoà cân bằng nội môi.', status: 'Normal', align: 'left' },
  { id: 'blood-vessels', top: '45%', left: '58%', label: 'Mạch máu (Blood vessels)', info: 'Hệ thống động mạch, tĩnh mạch và mao mạch dẫn máu đi khắp cơ thể.', status: 'Normal', align: 'right' },
  { id: 'large-intestine', top: '49%', left: '40%', label: 'Ruột già (Large intestine)', info: 'Hấp thu nước và muối khoáng, tạo và đào thải phân.', status: 'Normal', align: 'left' },
  { id: 'small-intestine', top: '50%', left: '55%', label: 'Ruột non (Small intestine)', info: 'Nơi diễn ra phần lớn quá trình tiêu hoá và hấp thu dưỡng chất.', status: 'Normal', align: 'right' },
  { id: 'nerve', top: '64%', left: '46%', label: 'Dây thần kinh (Nerve)', info: 'Dẫn truyền tín hiệu điện giữa não, tuỷ sống và các bộ phận cơ thể.', status: 'Normal', align: 'left' },
  { id: 'bone', top: '64%', left: '56%', label: 'Xương (Bone)', info: 'Khung nâng đỡ cơ thể, bảo vệ nội tạng và là nơi sản sinh tế bào máu.', status: 'Normal', align: 'right' },
  { id: 'muscle', top: '82%', left: '44%', label: 'Cơ (Muscle)', info: 'Mô co giãn giúp vận động, giữ tư thế và lưu thông máu.', status: 'Normal', align: 'left' },
  { id: 'joint', top: '82%', left: '57%', label: 'Khớp (Joint)', info: 'Điểm nối giữa hai xương, cho phép cơ thể cử động linh hoạt.', status: 'Normal', align: 'right' },
];

// Class tĩnh theo trạng thái (tránh dùng template literal ghép động vì
// Tailwind JIT chỉ nhận diện được class đã viết sẵn nguyên vẹn trong code).
const STATUS_STYLES = {
  Normal: {
    card: 'text-emerald-300 border-emerald-400/30 bg-emerald-950/90 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    dot: 'bg-emerald-500 shadow-[0_0_10px_#10b981]',
    line: 'from-emerald-400/80 to-transparent',
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
}) => {
  const [activeAnnotationId, setActiveAnnotationId] = useState(null);

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
        const isActive = activeAnnotationId === ann.id;
        const activePanelClasses = isActive
          ? 'opacity-100 pointer-events-auto translate-x-0'
          : `opacity-0 pointer-events-none ${ann.align === 'right' ? 'translate-x-3' : '-translate-x-3'}`;
        const activeLineClasses = isActive ? 'opacity-100' : 'opacity-0';

        return (
          <div
            key={ann.id}
            className="absolute group/hotspot z-10"
            style={{ top: ann.top, left: ann.left }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* --- Nút tròn nhấp nháy --- */}
            <button
              type="button"
              className="relative flex items-center justify-center w-5 h-5 -ml-2.5 -mt-2.5 cursor-crosshair rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label={`Hiển thị thông tin ${ann.label}`}
              aria-expanded={isActive}
              onClick={() => toggleAnnotation(ann.id)}
            >
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping group-hover/hotspot:opacity-100 ${isActive ? 'opacity-100' : ''} ${style.dot.split(' ')[0]}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`}></span>
            </button>

            {/* --- Bảng thông tin (hiện khi hover) --- */}
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 w-52 sm:w-60
                backdrop-blur-md border rounded-xl p-3
                group-hover/hotspot:opacity-100 group-hover/hotspot:pointer-events-auto
                transition-all duration-300 ease-out z-20
                ${ann.align === 'right' ? 'left-6 group-hover/hotspot:translate-x-0' : 'right-6 group-hover/hotspot:translate-x-0'}
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
                group-hover/hotspot:opacity-100 transition-all duration-300 delay-75
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
