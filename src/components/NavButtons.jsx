// src/components/NavButtons.jsx
// Reusable bottom navigation row: Next + Back pinned to the bottom viewport area.

import React from 'react'

export default function NavButtons({ onNext, nextLabel, onPrev, prevLabel, style }) {
  return (
    <div className="screen-nav-buttons" style={style}>
      {/* Next button */}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          className="screen-nav-button screen-nav-button-next"
          onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {nextLabel || 'Tiếp theo →'}
        </button>
      )}

      {/* Spacer when no next button */}
      {!onNext && <span />}

      {/* Back button — only when there is a previous panel */}
      {onPrev && prevLabel && (
        <button
          type="button"
          onClick={onPrev}
          className="screen-nav-button screen-nav-button-prev"
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
