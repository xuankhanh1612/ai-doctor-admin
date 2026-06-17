import React, { useState } from 'react'
import { HELP_ASSETS } from './helpContent'

/**
 * Right/below panel that actually shows the picture for the active tab:
 *  - "menu"  -> full health-journey-game-main-menu.png
 *  - a screen id -> the matching cropped & zoomed screenshot
 * Click/tap toggles a true full-screen lightbox zoom.
 */
export default function HelpScreenViewer({ mode, screen }) {
  const [zoomed, setZoomed] = useState(false)

  const src = mode === 'menu' ? HELP_ASSETS.mainMenu : screen?.image
  const alt = mode === 'menu' ? 'Menu chính Neuro Quest' : screen?.name
  const accent = mode === 'menu' ? '#38bdf8' : screen?.color

  if (!src) return null

  return (
    <>
      <div className="hj-screen-viewer" style={{ '--viewer-accent': accent }}>
        {mode !== 'menu' && (
          <div className="hj-screen-viewer-badge">
            <span className="hj-screen-viewer-num">{screen.num}</span>
            <span>{screen.icon} {screen.name}</span>
          </div>
        )}
        <div className="hj-screen-viewer-frame" onClick={() => setZoomed(true)}>
          <img src={src} alt={alt} className={mode === 'menu' ? 'hj-img-menu' : 'hj-img-screen'} />
          <div className="hj-screen-viewer-zoom-hint">🔍 Chạm để phóng to</div>
        </div>
      </div>

      {zoomed && (
        <div className="hj-lightbox" onClick={() => setZoomed(false)}>
          <img src={src} alt={alt} />
          <button type="button" className="hj-lightbox-close" onClick={() => setZoomed(false)} aria-label="Đóng">✕</button>
        </div>
      )}
    </>
  )
}
