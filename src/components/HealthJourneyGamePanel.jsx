import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext' 

import HealthJourneyGameStandalone from './health-journey-game/HealthJourneyGameStandalone'
import HelpFlowMap from './health-journey-game/help/HelpFlowMap'
import './health-journey-game/help/help.css'

const GAME_SCREENS = [
  'Home',
  'Nhiệm vụ',
  'Hành trình',
  'AI Coach',
  'Cửa hàng',
  'Rewards',
  'Profile',
]

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

      <section className="ai-healthcare-vision-header health-journey-game-header health-journey-game-header-flow">
        <div className="health-journey-game-header-top">
          <div>
            <div className="ai-healthcare-vision-kicker">HEALTH JOURNEY GAME</div>
            <h2>🎮 Health Journey Game</h2>
          </div>
          <div className="health-journey-game-screen-list" aria-label="7 main Health Journey Game screens">
            {GAME_SCREENS.map((screen, index) => (
              <span key={screen}>{index + 1}. {screen}</span>
            ))}
          </div>
        </div>
        <div className="health-journey-game-flow-map-box">
          <HelpFlowMap />
        </div>
      </section>

      <NavButtons onNext={onNext} nextLabel={nextLabel} />
    </div>
  )
}
