import React from 'react'

/**
 * Floating "HELP" button — fixed to the top-right corner of the game
 * container, visible on every main screen. Tapping it opens <HelpOverlay/>.
 */
export default function HelpButton({ onClick }) {
  return (
    <button
      type="button"
      className="hj-help-fab"
      onClick={onClick}
      aria-label="Mở trung tâm trợ giúp"
    >
      <span className="hj-help-fab-icon" aria-hidden="true">🤖</span>
      <span className="hj-help-fab-text">HELP</span>
      <span className="hj-help-fab-ping" aria-hidden="true" />
    </button>
  )
}
