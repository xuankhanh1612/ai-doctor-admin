import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext' 

import HealthJourneyGameStandalone from './health-journey-game/HealthJourneyGameStandalone'

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

      <section className="ai-healthcare-vision-header health-journey-game-header">
        <div>
          <div className="ai-healthcare-vision-kicker">HEALTH JOURNEY GAME</div>
          <h2>🎮 Health Journey Game</h2>
          <ul className="health-journey-game-flow-links">
            <li>🏠 Trang chủ → 📊 Thống kê</li>
            <li>📋 Nhiệm vụ → 📝 Chi tiết nhiệm vụ</li>
            <li>⚔️ Hành trình → 📖 Hành trình – Chapter</li>
            <li>🎤 AI Coach → 💡 AI Coach – Gợi ý</li>
            <li>🏪 Cửa hàng</li>
            <li>🎁 Rewards → 🎁 Daily Reward, 🏆 Leaderboard</li>
            <li>👤 Profile</li>
          </ul>
        </div>
        <div className="health-journey-game-screen-list" aria-label="7 main Health Journey Game screens">
          {GAME_SCREENS.map((screen, index) => (
            <span key={screen}>{index + 1}. {screen}</span>
          ))}
        </div>
      </section>

      <NavButtons onNext={onNext} nextLabel={nextLabel} />
    </div>
  )
}
