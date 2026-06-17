import React, { useEffect, useState } from 'react'

/**
 * Chatbot guide: a small robot avatar with a speech-bubble that explains
 * whatever tab is currently active, plus a CTA to jump straight to that
 * screen inside the live app.
 */
export default function HelpRobot({ message, accentColor = '#8b5cf6', actionLabel, onAction, prevLabel, nextLabel, onPrev, onNext }) {
  const [displayedMessage, setDisplayedMessage] = useState(message)
  const [animKey, setAnimKey] = useState(0)

  // Re-trigger the "typing" fade/slide animation every time the message changes.
  useEffect(() => {
    setDisplayedMessage(message)
    setAnimKey((k) => k + 1)
  }, [message])

  return (
    <div className="hj-robot-panel">
      <div className="hj-robot-avatar-wrap">
        <div className="hj-robot-avatar" style={{ '--robot-glow': accentColor }}>
          <span className="hj-robot-face">🤖</span>
          <span className="hj-robot-eye hj-robot-eye-l" />
          <span className="hj-robot-eye hj-robot-eye-r" />
        </div>
        <div className="hj-robot-name">AI Coach</div>
      </div>

      <div className="hj-speech-bubble" style={{ '--bubble-accent': accentColor }}>
        <div className="hj-speech-tick" />
        <p key={animKey} className="hj-speech-text hj-fade-in">
          {displayedMessage}
        </p>

        {(onAction || onPrev || onNext) && (
          <div className="hj-speech-actions">
            {onPrev && (
              <button type="button" className="hj-btn-ghost" onClick={onPrev}>
                ◀ {prevLabel || 'Trước'}
              </button>
            )}
            {onAction && (
              <button
                type="button"
                className="hj-btn-primary"
                style={{ '--btn-accent': accentColor }}
                onClick={onAction}
              >
                🚀 {actionLabel || 'Đi đến màn hình này'}
              </button>
            )}
            {onNext && (
              <button type="button" className="hj-btn-ghost" onClick={onNext}>
                {nextLabel || 'Tiếp theo'} ▶
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
