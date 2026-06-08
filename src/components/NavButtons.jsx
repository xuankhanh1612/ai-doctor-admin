// src/components/NavButtons.jsx
// Reusable page-to-page navigation row rendered at the bottom of each panel.

import React from 'react'

const cleanPageLabel = (label) => String(label || '')
  .replace(/^(←|→)\s*/u, '')
  .replace(/\s*(←|→)$/u, '')
  .replace(/^(Tiếp tục tới|Continue to|Go to|Tới|Đến)\s+/iu, '')
  .trim()

export default function NavButtons({ onNext, nextLabel, onPrev, prevLabel, style }) {
  const safePrevLabel = cleanPageLabel(prevLabel)
  const safeNextLabel = cleanPageLabel(nextLabel)

  return (
    <div className="screen-nav-buttons" style={style} aria-label="Page navigation controls">
      {onPrev && safePrevLabel ? (
        <button
          type="button"
          onClick={onPrev}
          className="screen-nav-button screen-nav-button-prev"
          aria-label={`Quay lại ${safePrevLabel}`}
          title={`Quay lại ${safePrevLabel}`}
        >
          <span aria-hidden="true">←</span>
          <span>{safePrevLabel}</span>
        </button>
      ) : <span className="screen-nav-spacer" />}

      {onNext && safeNextLabel ? (
        <button
          type="button"
          onClick={onNext}
          className="screen-nav-button screen-nav-button-next"
          aria-label={`Đi tới ${safeNextLabel}`}
          title={`Đi tới ${safeNextLabel}`}
        >
          <span>{safeNextLabel}</span>
          <span aria-hidden="true">→</span>
        </button>
      ) : <span className="screen-nav-spacer" />}
    </div>
  )
}
