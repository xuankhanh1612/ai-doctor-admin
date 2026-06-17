import React, { useRef } from 'react'
import { INTRO_TABS, HELP_SCREENS } from './helpContent'

/**
 * Horizontal, scrollable pill-tab bar.
 * First the two "intro" tabs (Main menu / Flow map), then a divider,
 * then the 12 numbered detail-screen tabs (matching
 * health-journey-game-detail-name-all-page.png).
 */
export default function HelpTabs({ activeTab, onChange }) {
  const scrollerRef = useRef(null)

  return (
    <div className="hj-help-tabs" ref={scrollerRef}>
      {INTRO_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`hj-tab-pill hj-tab-pill-intro ${activeTab === tab.id ? 'active' : ''}`}
          style={{ '--tab-color': tab.color }}
          onClick={() => onChange(tab.id)}
        >
          <span className="hj-tab-icon">{tab.icon}</span>
          <span className="hj-tab-label">{tab.label}</span>
        </button>
      ))}

      <span className="hj-tab-divider" aria-hidden="true" />

      {HELP_SCREENS.map((screen) => (
        <button
          key={screen.id}
          type="button"
          className={`hj-tab-pill ${activeTab === screen.id ? 'active' : ''}`}
          style={{ '--tab-color': screen.color }}
          onClick={() => onChange(screen.id)}
        >
          <span className="hj-tab-num">{screen.num}</span>
          <span className="hj-tab-icon">{screen.icon}</span>
          <span className="hj-tab-label">{screen.name}</span>
        </button>
      ))}
    </div>
  )
}
