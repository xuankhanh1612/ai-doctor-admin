import React from 'react';
import { X } from 'lucide-react';

const CORNERS = [
  { key: 'top-left', className: 'top-2 left-2' },
  { key: 'top-right', className: 'top-2 right-2' },
  { key: 'bottom-left', className: 'bottom-2 left-2' },
  { key: 'bottom-right', className: 'bottom-2 right-2' },
];

export default function HeroPopupCornerCloseButtons({ onClose, isDark, label = 'Đóng popup' }) {
  return (
    <>
      {CORNERS.map((corner) => (
        <button
          key={corner.key}
          type="button"
          aria-label={label}
          title={label}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClose?.();
          }}
          className={`absolute ${corner.className} z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs shadow-lg backdrop-blur transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
            isDark
              ? 'border-white/15 bg-slate-950/80 text-white hover:bg-slate-900'
              : 'border-emerald-100 bg-white/90 text-slate-700 hover:bg-emerald-50'
          }`}
        >
          <X size={15} strokeWidth={2.4} />
        </button>
      ))}
    </>
  );
}
