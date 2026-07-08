import React from 'react';
import { ArrowLeft } from 'lucide-react';

// ============================================================================
// BackButton — nút điều hướng "Quay lại" dùng CHUNG cho các màn hình độc
// lập (không nằm trong luồng onNext/onPrev của NavButtons.jsx ở layout
// chính): DonationHeroPanel ("Anh Hùng Hiến Tặng") và LoginPage. Luôn đặt ở
// dưới cùng màn hình để đồng bộ vị trí + hình dạng (mũi tên + nhãn) với các
// nút điều hướng khác trong toàn dự án.
// ============================================================================

export default function BackButton({ isDark, label = 'Quay lại', onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isDark
          ? 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
      } ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
