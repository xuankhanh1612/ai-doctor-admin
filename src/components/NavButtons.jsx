// src/components/NavButtons.jsx
// Reusable bottom navigation row: Next (left) + Back (bottom-right)

import React from 'react'

export default function NavButtons({ onNext, nextLabel, onPrev, prevLabel, style }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      gap: 12,
      ...style,
    }}>
      {/* Next button — left side */}
      {onNext && (
        <button
          onClick={onNext}
          style={{
            padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--cyan2, #00b8cc), var(--violet2, #6b3fd4))',
            color: '#fff', fontSize: 13, fontWeight: 600,
            border: 'none', fontFamily: 'inherit',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {nextLabel || 'Tiếp theo →'}
        </button>
      )}

      {/* Spacer when no next button */}
      {!onNext && <span />}

      {/* Back button — right side, only when there is a previous panel */}
      {onPrev && prevLabel && (
        <button
          onClick={onPrev}
          style={{
            padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent',
            border: '1px solid var(--border2, rgba(255,255,255,0.14))',
            color: 'var(--text2, rgba(232,240,248,0.55))',
            fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.18s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--surface2, rgba(255,255,255,0.06))'
            e.currentTarget.style.color = 'var(--text, #e8f0f8)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text2, rgba(232,240,248,0.55))'
          }}
        >
          ← {prevLabel}
        </button>
      )}
    </div>
  )
}
