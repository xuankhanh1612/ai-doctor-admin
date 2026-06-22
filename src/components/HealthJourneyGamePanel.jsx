import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext' 

import HealthJourneyGameStandalone from './health-journey-game/HealthJourneyGameStandalone'
import HelpFlowMap from './health-journey-game/help/HelpFlowMap'
import './health-journey-game/help/help.css'

export default function HealthJourneyGamePanel({ onNext, nextLabel, onViewMedicalRecord }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade health-journey-game-page">
      <section className="health-journey-game-frame-card" aria-label="Health Journey Game embedded app">
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
          <HelpFlowMap flipped />
        </div>
      </section>

      <NavButtons onNext={onNext} nextLabel={nextLabel} />
    </div>
  )
}
