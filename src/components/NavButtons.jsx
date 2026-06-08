// src/components/NavButtons.jsx
// Reusable page navigation: previous + next buttons fixed near the bottom.

import React from 'react'

export default function NavButtons({ onNext, nextLabel, onPrev, prevLabel, style }) {
  if (!onNext && !(onPrev && prevLabel)) return null

  return (
    <div className="screen-nav-buttons" style={style} aria-label="Điều hướng trang">
      {onPrev && prevLabel ? (
        <button
          type="button"
          onClick={onPrev}
          className="screen-nav-button screen-nav-button-prev"
          aria-label={`Lùi lại ${prevLabel}`}
        >
          ← {prevLabel}
        </button>
      ) : <span aria-hidden="true" />}

      {onNext && nextLabel ? (
        <button
          type="button"
          onClick={onNext}
          className="screen-nav-button screen-nav-button-next"
          aria-label={`Sang ${nextLabel}`}
        >
          {nextLabel} →
        </button>
      ) : <span aria-hidden="true" />}
    </div>
  )
}
