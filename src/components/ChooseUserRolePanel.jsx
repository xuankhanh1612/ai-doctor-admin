import React, { useState } from 'react';
import { ArrowRight, Mic, ShieldCheck, Lock, BookOpen, CheckCircle2 } from 'lucide-react';

// ============================================================================
// ChooseUserRolePanel — màn hình "Chọn Vai Trò Anh Hùng", đứng TRƯỚC
// "Anh Hùng Hiến Tặng" trong menu. Cho người dùng chọn nhanh 1 trong 3 vai
// trò (Hiến tặng / Rèn luyện sức khỏe / Nhận tạng) và 1 cơ quan quan tâm,
// trước khi bước vào hành trình Anh Hùng Hiến Tặng (DonationHeroPanel).
//
// Giống DonationHeroPanel, đây là màn hình ĐỘC LẬP với theme sáng/tối
// chung của app — dùng tông kem/mint nhẹ nhàng, thân thiện.
// ============================================================================

const ROLE_CARDS = [
  {
    id: 'donate',
    eyebrow: 'TÔI MUỐN',
    title: 'HIẾN TẶNG',
    emoji: '🫶',
    note: 'Cũng có thể\nHiến Tạng trong tương lai.',
    accent: '#059669',
    accentSoft: '#ecfdf5',
    border: '#a7f3d0',
    btn: '#16a34a',
  },
  {
    id: 'train',
    eyebrow: 'TÔI CHỈ MUỐN',
    title: 'RÈN LUYỆN SỨC KHỎE',
    emoji: '💪',
    note: 'Cũng có thể\nHiến / Nhận Tạng trong tương lai.',
    accent: '#d97706',
    accentSoft: '#fffbeb',
    border: '#fde68a',
    btn: '#f59e0b',
  },
  {
    id: 'receive',
    eyebrow: 'TÔI MUỐN',
    title: 'NHẬN TẠNG',
    emoji: '💙',
    note: 'Cũng có thể\nNhận Tạng trong tương lai.',
    accent: '#2563eb',
    accentSoft: '#eff6ff',
    border: '#bfdbfe',
    btn: '#2563eb',
  },
];

const ORGANS = [
  { id: 'gan', label: 'Gan', emoji: '🫘' },
  { id: 'tim', label: 'Tim', emoji: '❤️' },
  { id: 'phoi', label: 'Phổi', emoji: '🫁' },
  { id: 'than', label: 'Thận', emoji: '🟤' },
  { id: 'giacmac', label: 'Giác mạc', emoji: '👁️' },
  { id: 'xuong', label: 'Xương', emoji: '🦴' },
  { id: 'da', label: 'Da', emoji: '🧴' },
  { id: 'tuy', label: 'Tụy', emoji: '🟠' },
  { id: 'ruot', label: 'Ruột', emoji: '🌀' },
];

export default function ChooseUserRolePanel({ onSelectRole, onEnterAction, onMicPress }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedOrgan, setSelectedOrgan] = useState('gan');

  const handlePickRole = (roleId) => {
    setSelectedRole(roleId);
    if (typeof onSelectRole === 'function') onSelectRole(roleId);
  };

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-[#f6faf7] to-[#eef7f1] text-[#16241c] px-5 py-8 md:px-10 md:py-10">
      <div className="max-w-4xl mx-auto">

        {/* Tạo tài khoản */}
        <div className="flex justify-end mb-6">
          <div className="text-right">
            <button
              onClick={onEnterAction}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
            >
              <ShieldCheck size={16} />
              Tạo tài khoản
            </button>
            <p className="mt-2 text-xs text-gray-500 leading-snug max-w-[200px] ml-auto">
              Lưu hành trình học tập và<br />nâng cấp siêu anh hùng
            </p>
          </div>
        </div>

        {/* Tiêu đề */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-lg text-gray-600">Bạn đang muốn trong tương lai</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold leading-snug mb-2">
            <span className="text-emerald-600">HIẾN TẶNG</span> hoặc{' '}
            <span className="text-sky-600">NHẬN</span> nội tạng
            <br />
            hay chỉ đơn giản là rèn luyện sức khỏe?
          </h1>
          <p className="text-base text-gray-600 mb-4">Hãy chọn bên dưới nhé..</p>

          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-emerald-100 shadow-sm px-4 py-2 text-sm text-gray-600">
            <ShieldCheck size={16} className="text-emerald-600" />
            Mọi hoạt động đều thông qua <span className="font-bold text-emerald-700">pháp luật</span> và{' '}
            <span className="font-bold text-emerald-700">cơ sở y tế hợp pháp</span>.
          </div>
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
                  background: card.accentSoft,
                  border: `1.5px solid ${isSelected ? card.accent : card.border}`,
                  boxShadow: isSelected ? `0 0 0 3px ${card.accentSoft}, 0 8px 24px rgba(0,0,0,0.08)` : undefined,
                }}
              >
                <div className="text-xs font-bold tracking-wide" style={{ color: card.accent }}>{card.eyebrow}</div>
                <div className="text-lg font-extrabold mb-3" style={{ color: card.accent }}>{card.title}</div>

                <div className="w-20 h-20 rounded-full bg-white/70 flex items-center justify-center text-4xl mb-3 group-hover:scale-105 transition-transform">
                  {card.emoji}
                </div>

                <div className="text-xs text-gray-500 whitespace-pre-line leading-snug mb-4 min-h-[32px]">
                  {card.note}
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
            <span className="h-px w-8 bg-gray-300" />
            <h2 className="text-xs font-bold tracking-[0.15em] text-gray-500 uppercase">
              Chọn nhanh cơ quan có thể hiến / nhận
            </h2>
            <span className="h-px w-8 bg-gray-300" />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {ORGANS.map((organ) => {
              const isActive = selectedOrgan === organ.id;
              return (
                <button
                  key={organ.id}
                  onClick={() => setSelectedOrgan(organ.id)}
                  className="flex flex-col items-center gap-1.5 w-[76px]"
                >
                  <span
                    className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm transition-all"
                    style={{ border: `2px solid ${isActive ? '#16a34a' : 'transparent'}` }}
                  >
                    {organ.emoji}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: isActive ? '#16a34a' : '#4b5563' }}>
                    {organ.label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => typeof onSelectRole === 'function' && onSelectRole('viewAll')}
              className="flex flex-col items-center gap-1.5 w-[76px]"
            >
              <span className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <span className="grid grid-cols-2 gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-emerald-500" />
                  ))}
                </span>
              </span>
              <span className="text-xs font-semibold text-emerald-600">Xem tất cả</span>
            </button>
          </div>
        </div>

        {/* Băng pháp lý */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-emerald-100 bg-white/70 px-6 py-5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-3xl">
            🏥
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm text-gray-700 leading-snug mb-2">
              Tất cả hoạt động hiến và nhận tạng<br className="hidden sm:block" />
              đều thông qua <span className="font-bold text-[#16241c]">pháp luật</span> và{' '}
              <span className="font-bold text-[#16241c]">cơ sở y tế hợp pháp</span>.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-1.5">
              {['An toàn', 'Minh bạch', 'Bảo mật', 'Nhân văn'].map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
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
            className="w-16 h-16 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center hover:bg-emerald-50 transition-colors shadow-sm"
            aria-label="Nhấn để nói"
          >
            <Mic className="text-emerald-600" size={24} />
          </button>
        </div>

        {/* Tiếp tục tìm hiểu */}
        <button
          onClick={onEnterAction}
          className="w-full mt-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 text-white px-6 py-4 flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <BookOpen size={20} />
          <span className="text-left">
            <span className="block font-extrabold text-base leading-tight">Tiếp tục tìm hiểu</span>
            <span className="block text-xs text-white/85 font-medium">Học kiến thức · Hiểu quy trình · Chuẩn bị cho tương lai</span>
          </span>
          <ArrowRight size={20} className="ml-auto" />
        </button>

        {/* Ghi chú quyền riêng tư */}
        <div className="mt-6 flex items-center gap-3 justify-center text-xs text-gray-500">
          <Lock size={14} />
          <span>
            Mọi dữ liệu bạn cung cấp đều nằm ở máy của bạn, không bao giờ lưu vào server của chúng tôi.{' '}
            <span className="font-bold text-[#16241c]">Quyền là của bạn.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
