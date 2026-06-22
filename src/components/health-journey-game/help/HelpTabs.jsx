import React from 'react'
import { INTRO_TABS, HELP_SCREENS } from './helpContent'

const MAIN_SCREENS = HELP_SCREENS.filter((s) => s.group === 'main')
const DETAIL_SCREENS = HELP_SCREENS.filter((s) => s.group === 'detail')

/**
 * Tab bar laid out as 4 centered rows:
 *   1. "Menu chính"          — alone, centered
 *   2. "Sơ đồ liên kết"      — alone, centered
 *   3. 7 main-menu buttons   — Trang chủ … Profile (real bottom-nav order)
 *   4. 6 detail-screen tabs  — in the order they branch down from row 3
 */
export default function HelpTabs({ activeTab, onChange, onNavigate }) {
  const introMenu = INTRO_TABS[0]
  const introFlow = INTRO_TABS[1]

  return (
    <div className="hj-help-tabs">
      <div className="hj-tab-row hj-tab-row-single">
        <button
          type="button"
          className={`hj-tab-pill hj-tab-pill-intro ${activeTab === introMenu.id ? 'active' : ''}`}
          style={{ '--tab-color': introMenu.color }}
          onClick={() => onChange(introMenu.id)}
        >
          <span className="hj-tab-icon">{introMenu.icon}</span>
          <span className="hj-tab-label">{introMenu.label}</span>
        </button>
      </div>

      <div className="hj-tab-row hj-tab-row-single">
        <button
          type="button"
          className={`hj-tab-pill hj-tab-pill-intro ${activeTab === introFlow.id ? 'active' : ''}`}
          style={{ '--tab-color': introFlow.color }}
          onClick={() => onChange(introFlow.id)}
        >
          <span className="hj-tab-icon">{introFlow.icon}</span>
          <span className="hj-tab-label">{introFlow.label}</span>
        </button>
      </div>

      <div className="hj-tab-row hj-tab-row-wrap hj-tab-row-main">
        {MAIN_SCREENS.map((screen) => (
          <button
            key={screen.id}
            type="button"
            className={`hj-tab-pill hj-tab-pill-main ${activeTab === screen.id ? 'active' : ''}`}
            style={{ '--tab-color': screen.color }}
            onClick={() => {
              if (screen.target && onNavigate) {
                // điều hướng thẳng đến trang và đóng popup
                onNavigate(screen.target)
              } else {
                onChange(screen.id)
              }
            }}
          >
            <span className="hj-tab-icon">{screen.icon}</span>
            <span className="hj-tab-label">{screen.name}</span>
          </button>
        ))}
      </div>

      <div className="hj-tab-row hj-tab-row-wrap hj-tab-row-detail">
        {DETAIL_SCREENS.map((screen) => (
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
    </div>
  )
}
