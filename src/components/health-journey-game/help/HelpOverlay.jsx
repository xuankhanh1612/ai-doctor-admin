import React, { useMemo, useState } from 'react'
import HelpTabs from './HelpTabs'
import HelpRobot from './HelpRobot'
import HelpFlowMap from './HelpFlowMap'
import HelpScreenViewer from './HelpScreenViewer'
import { HELP_SCREENS, ROBOT_INTRO, NAV_ID_TO_TAB, findScreenById } from './helpContent'
import './help.css'

const ORDER = ['menu', 'flow', ...HELP_SCREENS.map((s) => s.id)]

export default function HelpOverlay({ open, onClose, onNavigate }) {
  const [activeTab, setActiveTab] = useState('menu')

  const activeScreen = useMemo(() => findScreenById(activeTab), [activeTab])
  const orderIndex = ORDER.indexOf(activeTab)

  if (!open) return null

  const goRelative = (delta) => {
    const next = ORDER[(orderIndex + delta + ORDER.length) % ORDER.length]
    setActiveTab(next)
  }

  const handleJumpToScreen = (navScreenId) => {
    const tab = NAV_ID_TO_TAB[navScreenId]
    setActiveTab(tab || 'menu')
  }

  const handleJumpToDetail = (detailId) => {
    setActiveTab(detailId)
  }

  const handleGoLive = () => {
    if (activeScreen?.target) {
      onNavigate?.(activeScreen.target)
    } else {
      onClose?.()
    }
  }

  const robotMessage =
    activeTab === 'menu' ? ROBOT_INTRO.menu :
    activeTab === 'flow' ? ROBOT_INTRO.flow :
    activeScreen?.robotScript || ''

  const robotAccent =
    activeTab === 'menu' ? '#38bdf8' :
    activeTab === 'flow' ? '#a78bfa' :
    activeScreen?.color || '#8b5cf6'

  return (
    <div className="hj-help-overlay" role="dialog" aria-modal="true" aria-label="Trung tâm trợ giúp Neuro Quest">
      <div className="hj-help-header">
        <div className="hj-help-title">
          <span className="hj-help-title-icon">🤖</span>
          <div>
            <h2>Trung tâm trợ giúp</h2>
            <p>Neuro Quest · Health Journey Game</p>
          </div>
        </div>
        <button type="button" className="hj-help-close" onClick={onClose} aria-label="Đóng">✕</button>
      </div>

      <HelpTabs activeTab={activeTab} onChange={setActiveTab} onNavigate={onNavigate} />

      <div className="hj-help-body">
        <div className="hj-help-body-main">
          {activeTab === 'flow' ? (
            <HelpFlowMap onJumpToScreen={handleJumpToScreen} onJumpToDetail={handleJumpToDetail} onNavigate={onNavigate} />
          ) : (
            <HelpScreenViewer mode={activeTab === 'menu' ? 'menu' : 'screen'} screen={activeScreen} />
          )}
        </div>

        <div className="hj-help-body-side">
          <HelpRobot
            message={robotMessage}
            accentColor={robotAccent}
            actionLabel={activeScreen ? 'Đi đến màn hình này' : undefined}
            onAction={activeScreen ? handleGoLive : undefined}
            onPrev={() => goRelative(-1)}
            onNext={() => goRelative(1)}
          />
        </div>
      </div>
    </div>
  )
}
