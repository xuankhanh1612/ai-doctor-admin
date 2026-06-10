import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import healthJourneyGameUrl from './health-journey-game/health-journey-game.html?url'

const GAME_SCREENS = [
  'Home',
  'Nhiệm vụ',
  'Hành trình',
  'AI Coach',
  'Cửa hàng',
  'Rewards',
  'Profile',
]

export default function HealthJourneyGamePanel({ onNext, nextLabel }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade health-journey-game-page">
      <section className="ai-healthcare-vision-header health-journey-game-header">
        <div>
          <div className="ai-healthcare-vision-kicker">HEALTH JOURNEY GAME</div>
          <h2>🎮 Health Journey Game</h2>
          <p>
            {lang === 'vi'
              ? 'Game động lực rèn luyện sức khoẻ gồm 7 màn hình chính, tối ưu responsive cho điện thoại. Các nút trong game mở được màn hình chính và màn hình chi tiết liên quan từ file HTML gốc.'
              : 'A motivational health-training game with 7 primary mobile-first screens. In-game buttons navigate across the main screens and related detail screens from the source HTML.'}
          </p>
        </div>
        <div className="health-journey-game-screen-list" aria-label="7 main Health Journey Game screens">
          {GAME_SCREENS.map((screen, index) => (
            <span key={screen}>{index + 1}. {screen}</span>
          ))}
        </div>
      </section>

      <section className="health-journey-game-frame-card" aria-label="Health Journey Game embedded app">
        <iframe
          title="Health Journey Game"
          src={healthJourneyGameUrl}
          className="health-journey-game-frame"
          loading="lazy"
        />
      </section>

      <NavButtons onNext={onNext} nextLabel={nextLabel} />
    </div>
  )
}
