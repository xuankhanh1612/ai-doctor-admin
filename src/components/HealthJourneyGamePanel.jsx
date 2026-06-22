import React, { useRef } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext' 

import HealthJourneyGameStandalone from './health-journey-game/HealthJourneyGameStandalone'
import HelpFlowMap from './health-journey-game/help/HelpFlowMap'
import { HELP_SCREENS } from './health-journey-game/help/helpContent'
import './health-journey-game/help/help.css'

export default function HealthJourneyGamePanel({ onNext, nextLabel, onViewMedicalRecord }) {
  const { lang } = useApp()
  const gameRef = useRef(null)

  // Gửi custom event xuống HealthJourneyGameStandalone và cuộn game vào tầm nhìn.
  const dispatchNavigate = (target) => {
    window.dispatchEvent(new CustomEvent('hjg-navigate', { detail: target }))
    gameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Nav-row click: { screen: 'screen-home' | 'screen-nhiem-vu' | … }
  const handleFlippedNavigate = ({ screen }) => {
    dispatchNavigate({ screen })
  }

  // Detail-badge click: resolves detailId → target từ HELP_SCREENS
  const handleFlippedJumpToDetail = (detailId) => {
    const found = HELP_SCREENS.find((s) => s.id === detailId)
    if (found?.target) dispatchNavigate(found.target)
  }

  return (
    <div className="animate-fade health-journey-game-page">
      <section ref={gameRef} className="health-journey-game-frame-card" aria-label="Health Journey Game embedded app">
        {/* <iframe
          title="Health Journey Game"
          src={healthJourneyGameUrl}
          className="health-journey-game-frame"
          loading="lazy"
        /> */}

<HealthJourneyGameStandalone onViewMedicalRecord={onViewMedicalRecord} />
      </section>

      <section className="ai-healthcare-vision-header health-journey-game-header health-journey-game-header-flow health-journey-game-header-flipped">
        <div className="health-journey-game-flow-map-box health-journey-game-flow-map-box--large">
          <HelpFlowMap
            flipped
            onNavigate={handleFlippedNavigate}
            onJumpToDetail={handleFlippedJumpToDetail}
          />
        </div>
      </section>

      <NavButtons onNext={onNext} nextLabel={nextLabel} />
    </div>
  )
}
