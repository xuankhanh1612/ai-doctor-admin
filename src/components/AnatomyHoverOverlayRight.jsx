import React, { useEffect, useState } from 'react';

// ============================================================================
// AnatomyHoverOverlayRight — Lớp phủ chú thích tương tác có Panel bên phải
// Chuyển thể từ file AnatomyHoverOverlayRight.js do người dùng cung cấp,
// dùng chung ảnh giải phẫu thật trong public/assets/anatomy/anatomy-human.jpg
// (đã bỏ class `animate-in` vì project chưa cài plugin tailwindcss-animate).
// ============================================================================

const ANNOTATIONS = [
  { id: 'brain', top: '11%', left: '50%', label: 'Não bộ (Brain)', info: 'Trung tâm điều khiển hệ thần kinh trung ương, nằm trong hộp sọ. Đảm nhiệm xử lý thông tin, cảm giác và vận động.', status: 'Normal', align: 'right' },
  { id: 'skull', top: '14.5%', left: '54%', label: 'Hộp sọ (Skull)', info: 'Khung xương bảo vệ não bộ, gồm nhiều xương dẹt gắn khít với nhau tạo thành hộp vững chắc.', status: 'Normal', align: 'right' },
  { id: 'oesophagus', top: '19%', left: '50%', label: 'Thực quản (Oesophagus)', info: 'Ống dẫn thức ăn từ hầu họng xuống dạ dày, dài khoảng 25cm. Hoạt động co bóp bình thường.', status: 'Normal', align: 'left' },
  { id: 'lymph-nodes', top: '23%', left: '41%', label: 'Hạch bạch huyết (Lymph nodes)', info: 'Cấu trúc nhỏ hình hạt đậu, lọc bạch huyết và chứa tế bào miễn dịch chống lại nhiễm trùng.', status: 'Normal', align: 'left' },
  { id: 'cornea', top: '9.5%', left: '47%', label: 'Giác mạc (Cornea)', info: 'Lớp mô trong suốt phía trước mắt, giúp hội tụ ánh sáng để nhìn rõ.', status: 'Normal', align: 'left' },
  { id: 'lungs', top: '27%', left: '50%', label: 'Phổi (Lungs)', info: 'Cơ quan hô hấp chính, trao đổi oxy và CO2 giữa không khí và máu. Dung tích phổi ổn định.', status: 'Normal', align: 'right' },
  { id: 'heart', top: '32%', left: '52%', label: 'Tim (Heart)', info: 'Cơ quan bơm máu liên tục để đưa oxy và dưỡng chất đi khắp cơ thể. Nhịp tim và huyết áp đang ở mức cảnh báo nhẹ.', status: 'Warning', align: 'right' },
  { id: 'lymph', top: '33%', left: '39%', label: 'Bạch huyết (Lymph)', info: 'Dịch trong suốt lưu thông trong hệ bạch huyết, hỗ trợ hệ miễn dịch đào thải độc tố.', status: 'Normal', align: 'left' },
  { id: 'liver', top: '37%', left: '45%', label: 'Gan (Liver)', info: 'Cơ quan lớn nhất trong ổ bụng, đảm nhiệm chuyển hoá, lưu trữ năng lượng và thải độc máu.', status: 'Normal', align: 'left' },
  { id: 'stomach', top: '37%', left: '56%', label: 'Dạ dày (Stomach)', info: 'Túi cơ chứa và tiêu hoá thức ăn bằng dịch vị và enzym. Không phát hiện dấu hiệu viêm loét.', status: 'Normal', align: 'right' },
  { id: 'pancreas', top: '40%', left: '54%', label: 'Tụy (Pancreas)', info: 'Tuyến tiêu hoá và nội tiết giúp tiết enzym, insulin và điều hoà lượng đường trong máu.', status: 'Normal', align: 'right' },
  { id: 'kidneys', top: '43%', left: '49%', label: 'Thận (Kidneys)', info: 'Cặp cơ quan lọc máu, tạo nước tiểu và điều hoà cân bằng nội môi. Chức năng lọc cầu thận suy giảm.', status: 'Critical', align: 'left' },
  { id: 'blood-vessels', top: '45%', left: '58%', label: 'Mạch máu (Blood vessels)', info: 'Hệ thống động mạch, tĩnh mạch và mao mạch dẫn máu đi khắp cơ thể.', status: 'Normal', align: 'right' },
  { id: 'large-intestine', top: '49%', left: '40%', label: 'Ruột già (Large intestine)', info: 'Hấp thu nước và muối khoáng, tạo và đào thải phân.', status: 'Normal', align: 'left' },
  { id: 'small-intestine', top: '50%', left: '55%', label: 'Ruột non (Small intestine)', info: 'Nơi diễn ra phần lớn quá trình tiêu hoá và hấp thu dưỡng chất thiết yếu.', status: 'Normal', align: 'right' },
  { id: 'nerve', top: '64%', left: '46%', label: 'Dây thần kinh (Nerve)', info: 'Dẫn truyền tín hiệu điện giữa não, tuỷ sống và các bộ phận cơ thể.', status: 'Normal', align: 'left' },
  { id: 'bone', top: '64%', left: '56%', label: 'Xương (Bone)', info: 'Khung nâng đỡ cơ thể, bảo vệ nội tạng và là nơi sản sinh tế bào máu.', status: 'Normal', align: 'right' },
  { id: 'skin', top: '72%', left: '59%', label: 'Da (Skin)', info: 'Hàng rào bảo vệ lớn nhất của cơ thể, giúp cảm nhận và điều hoà thân nhiệt.', status: 'Normal', align: 'right' },
  { id: 'muscle', top: '82%', left: '44%', label: 'Cơ (Muscle)', info: 'Mô co giãn giúp vận động, giữ tư thế và lưu thông máu.', status: 'Normal', align: 'left' },
  { id: 'joint', top: '82%', left: '57%', label: 'Khớp (Joint)', info: 'Điểm nối giữa hai xương, cho phép cơ thể cử động linh hoạt.', status: 'Normal', align: 'right' },
];

export const ANATOMY_DEFAULT_ANNOTATIONS = ANNOTATIONS;

const STATUS_STYLES = {
  Normal: {
    card: 'text-emerald-300 border-emerald-400/30 bg-emerald-950/90 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    dot: 'bg-emerald-500 shadow-[0_0_10px_#10b981]',
    line: 'from-emerald-400/80 to-transparent',
    text: 'text-emerald-400',
    panelBg: 'bg-emerald-500/5 border-emerald-500/20',
  },
  Warning: {
    card: 'text-amber-300 border-amber-400/30 bg-amber-950/90 shadow-[0_0_15px_rgba(251,191,36,0.25)]',
    dot: 'bg-amber-500 shadow-[0_0_10px_#f59e0b]',
    line: 'from-amber-400/80 to-transparent',
    text: 'text-amber-400',
    panelBg: 'bg-amber-500/5 border-amber-500/20',
  },
  Critical: {
    card: 'text-red-300 border-red-400/30 bg-red-950/90 shadow-[0_0_15px_rgba(248,113,113,0.25)]',
    dot: 'bg-red-500 shadow-[0_0_10px_#ef4444]',
    line: 'from-red-400/80 to-transparent',
    text: 'text-red-400',
    panelBg: 'bg-red-500/5 border-red-500/20',
  },
};

const AnatomyHoverOverlayRight = ({
  imageSrc = '/assets/anatomy/anatomy-human.jpg',
  annotations = ANNOTATIONS,
  className = '',
  focusAnnotationId = null,
  showOnlyFocus = false,
  subtitle = null,
  footerLabel = 'AI Doctor Scan System',
}) => {
  const [activeAnnotationId, setActiveAnnotationId] = useState(focusAnnotationId);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState(null);

  useEffect(() => {
    if (focusAnnotationId) {
      setActiveAnnotationId(focusAnnotationId);
    }
  }, [focusAnnotationId]);

  const visibleAnnotations = showOnlyFocus && focusAnnotationId
    ? annotations.filter((ann) => ann.id === focusAnnotationId)
    : annotations;

  // Lấy data của bộ phận đang tương tác (ưu tiên bộ phận đang hover, nếu không hover thì lấy cái đang click/active)
  const currentDisplayAnnotation = annotations.find(
    (ann) => ann.id === (hoveredAnnotationId || activeAnnotationId)
  );

  return (
    // Bọc toàn bộ vào một thẻ flex để chia đôi màn hình: Trái (Ảnh) - Phải (Nội dung text)
    <div className={`flex flex-col md:flex-row gap-6 w-full h-full max-h-[85vh] ${className}`}>

      {/* ========================================================================= */}
      {/* CỘT TRÁI: ẢNH GIẢI PHẪU & HOTSPOTS                                        */}
      {/* ========================================================================= */}
      <div
        className="relative flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center"
        onClick={() => setActiveAnnotationId(null)}
      >
        {/* Giữ nguyên logic tỉ lệ ảnh để các điểm toạ độ không bị xô lệch */}
        <div className="relative h-full" style={{ aspectRatio: '2461 / 2999' }}>

          <img
            src={imageSrc}
            alt="Anatomy of the human body"
            className="absolute inset-0 w-full h-full object-contain bg-slate-900/50"
            draggable={false}
          />

          {visibleAnnotations.map((ann) => {
            const style = STATUS_STYLES[ann.status] || STATUS_STYLES.Normal;
            // Hotspot sáng lên khi đang click (active) hoặc đang rê chuột (hovered)
            const isActiveOrHovered = (activeAnnotationId === ann.id) || (hoveredAnnotationId === ann.id);

            return (
              <div
                key={ann.id}
                className="absolute z-10"
                style={{ top: ann.top, left: ann.left }}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveAnnotationId(ann.id);
                }}
                onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                onMouseLeave={() => setHoveredAnnotationId(null)}
              >
                {/* Dấu chấm nhấp nháy */}
                <button
                  type="button"
                  className="relative flex items-center justify-center w-6 h-6 -ml-3 -mt-3 cursor-crosshair rounded-full transition-transform hover:scale-125"
                >
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-50 ${isActiveOrHovered ? 'animate-none opacity-80 scale-150' : 'animate-ping'} transition-all ${style.dot.split(' ')[0]}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.dot}`}></span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CỘT PHẢI: VÙNG NỘI DUNG TEXT (INFO PANEL)                                 */}
      {/* ========================================================================= */}
      <div className="w-full md:w-96 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden shrink-0">

        {/* Header của Panel */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="text-emerald-400">⚡</span> Thông tin sinh tồn
          </h2>
          <p className="text-xs text-slate-400 mt-1">{subtitle || 'Trỏ chuột vào cơ quan để xem phân tích'}</p>
        </div>

        {/* Nội dung chi tiết */}
        <div className="flex-1 p-5 overflow-y-auto">
          {currentDisplayAnnotation ? (
            <div className={`p-6 rounded-xl border ${STATUS_STYLES[currentDisplayAnnotation.status].panelBg} transition-all duration-300`}>

              {/* Trạng thái Status (Normal, Warning, Critical) */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Trạng thái</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold tracking-wider uppercase border bg-slate-950 ${STATUS_STYLES[currentDisplayAnnotation.status].card}`}>
                  {currentDisplayAnnotation.status}
                </span>
              </div>

              {/* Tên bộ phận */}
              <h3 className={`text-2xl font-black mb-3 tracking-tight ${STATUS_STYLES[currentDisplayAnnotation.status].text}`}>
                {currentDisplayAnnotation.label}
              </h3>

              {/* Đường kẻ ngang */}
              <div className="h-px w-12 bg-white/20 mb-4"></div>

              {/* Phân tích AI */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Phân tích AI</h4>
                  <p className="text-sm text-slate-300 leading-relaxed font-mono">
                    {currentDisplayAnnotation.info}
                  </p>
                </div>

                {/* Số liệu liên quan — lấy từ dữ liệu hồ sơ bệnh nhân thực tế nếu có (annotation.metrics),
                    nếu không có (bộ phận chưa có dữ liệu riêng) thì hiển thị số liệu tham khảo mặc định. */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/10">
                  {(currentDisplayAnnotation.metrics || [
                    { label: 'Mật độ mô', value: '98.5%', color: 'text-white' },
                    { label: 'Độ chính xác', value: 'Cao', color: 'text-emerald-400' },
                  ]).slice(0, 2).map((m, i) => (
                    <div key={i} className="bg-black/30 p-3 rounded-lg border border-white/5">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">{m.label}</div>
                      <div className={`font-mono text-sm font-semibold ${m.color || 'text-white'}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            // Trạng thái rỗng khi chưa trỏ chuột vào đâu
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mb-4">
                <span className="text-2xl">🏥</span>
              </div>
              <p className="text-slate-400 text-sm font-medium">Đang chờ tín hiệu quét...</p>
              <p className="text-slate-500 text-xs mt-1">Hãy trỏ chuột hoặc chạm vào các điểm sáng trên cơ thể</p>
            </div>
          )}
        </div>

        {/* Footer của Panel */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          <span>{footerLabel}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnatomyHoverOverlayRight;
