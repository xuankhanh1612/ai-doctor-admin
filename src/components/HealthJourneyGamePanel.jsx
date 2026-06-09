import React, { useMemo, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { parseInBodyCsv, summarizeInBodyRecords } from '../lib/inbodyCsv.js'
import gameConceptImage from './health-journey-game/health-journey-game.png'
import aiClinicConceptImage from '../inbody-khanh/DataInBody/AIClinicInBody.PNG'
import inbodyScanImage from '../inbody-khanh/DataInBody/IMG_2844.HEIC'
import inbodyCsvText from '../inbody-khanh/DataInBody/InBody-20260508 3.csv?raw'

const GAME_TABS = [
  { id: 'home', label: 'Trang chủ', icon: '🏠' },
  { id: 'missions', label: 'Nhiệm vụ', icon: '✅' },
  { id: 'journey', label: 'Hành trình', icon: '🗺️' },
  { id: 'coach', label: 'AI Coach', icon: '🎙️' },
  { id: 'store', label: 'Cửa hàng', icon: '🎁' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'stats', label: 'Thống kê', icon: '📈' },
  { id: 'details', label: 'Chi tiết NV', icon: '🛡️' },
  { id: 'chapter', label: 'Chapter', icon: '⚔️' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'reward', label: 'Daily Reward', icon: '💎' },
]

const DAILY_MISSIONS = [
  { title: 'Breath Activation', subtitle: 'Thở sâu 5 phút', progress: '5/5', xp: 100, done: true, icon: '🫁' },
  { title: 'No Sugar Challenge', subtitle: 'Không đường 1 ngày', progress: '1/1', xp: 90, done: true, icon: '🍯' },
  { title: 'Deep Work 90m', subtitle: 'Tập trung làm việc 90 phút', progress: '70/90', xp: 120, done: false, icon: '🧠' },
  { title: 'Cold Shower', subtitle: 'Tắm nước lạnh', progress: '0/1', xp: 80, done: false, icon: '🚿' },
  { title: 'Read 20 Pages', subtitle: 'Đọc ít nhất 20 trang sách', progress: '10/20', xp: 70, done: false, icon: '📖' },
]

const CHAPTERS = [
  { name: 'The Awakening', percent: 66, color: '#00e5ff' },
  { name: 'The Discipline', percent: 0, color: '#f48fb1' },
  { name: 'The Transformation', percent: 0, color: '#ff8f00' },
  { name: 'The Mastery', percent: 0, color: '#306bff' },
  { name: 'The Legend', percent: 0, color: '#7f8999', locked: true },
]

const HEALTH_STATS = [
  { label: 'Focus', value: 81, color: '#9c6fff' },
  { label: 'Discipline', value: 92, color: '#00e5ff' },
  { label: 'Energy', value: 63, color: '#00e676' },
  { label: 'Health', value: 74, color: '#ff9d2e' },
]

const REWARDS = [
  { name: 'Starter Pack', price: 200, icon: '🟣' },
  { name: 'Warrior Pack', price: 490, icon: '🔵' },
  { name: 'Master Pack', price: 990, icon: '🟠' },
]

function fmt(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value}${suffix}`
}

function deltaClass(value) {
  if (value > 0) return 'is-up'
  if (value < 0) return 'is-down'
  return ''
}

function MiniTrend({ records, metric = 'score', color = '#7c4dff' }) {
  const points = records.map(record => record[metric]).filter(value => value !== null && value !== undefined)
  if (points.length < 2) return <div className="hjg-empty-chart">Chưa đủ dữ liệu</div>
  const min = Math.min(...points) - 2
  const max = Math.max(...points) + 2
  const step = points.length > 1 ? 100 / (points.length - 1) : 100
  const path = points.map((value, index) => {
    const x = index * step
    const y = 92 - ((value - min) / Math.max(max - min, 1)) * 78
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')

  return (
    <svg className="hjg-mini-trend" viewBox="0 0 100 100" role="img" aria-label={`Biểu đồ ${metric}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`trend-${metric}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 100 100 L 0 100 Z`} fill={`url(#trend-${metric})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((value, index) => {
        const x = index * step
        const y = 92 - ((value - min) / Math.max(max - min, 1)) * 78
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="2.8" fill={color} />
      })}
    </svg>
  )
}

function GameCard({ id, title, children, accent = '#00e5ff' }) {
  return (
    <article className="hjg-phone-card" id={`hjg-${id}`} style={{ '--accent': accent }}>
      <div className="hjg-phone-title"><span>{id.padStart(2, '0')}.</span> {title}</div>
      {children}
    </article>
  )
}

function ProfileInBodyTab({ records, summary }) {
  const latest = summary.latest || {}
  const previous = summary.previous || summary.first || {}
  const bodyFatDelta = latest.fat != null && previous.fat != null ? +(latest.fat - previous.fat).toFixed(1) : 0
  const scoreDelta = latest.score != null && previous.score != null ? latest.score - previous.score : 0
  const scanMetrics = [
    { label: 'InBody Score', value: fmt(latest.score, '/100'), note: `${scoreDelta >= 0 ? '+' : ''}${scoreDelta} so với lần trước`, tone: scoreDelta >= 0 ? 'good' : 'warn' },
    { label: 'Cân nặng', value: fmt(latest.weight, ' kg'), note: `BMI ${fmt(latest.bmi)}`, tone: 'info' },
    { label: 'Cơ xương', value: fmt(latest.skeletalMuscle, ' kg'), note: `SMI ${fmt(latest.smi)}`, tone: 'good' },
    { label: 'Mỡ cơ thể', value: fmt(latest.fat, '%'), note: `${bodyFatDelta >= 0 ? '+' : ''}${bodyFatDelta}%`, tone: bodyFatDelta > 0 ? 'warn' : 'good' },
  ]

  return (
    <div className="hjg-profile-tab">
      <div className="hjg-profile-sidebar">
        <div className="hjg-ai-logo">✺ AI CLINIC</div>
        <div className="hjg-avatar-row">
          <div className="hjg-avatar">LXK</div>
          <div>
            <strong>Lê Xuân Khánh</strong>
            <span>Level 12 · 4,250 / 6,000 XP</span>
          </div>
        </div>
        {['Tổng quan', 'Check-in', 'InBody', 'AI Coach', 'Lịch sử', 'Nhiệm vụ'].map((item, index) => (
          <div key={item} className={`hjg-side-pill ${index === 2 ? 'active' : ''}`}>{item}</div>
        ))}
      </div>

      <div className="hjg-profile-main">
        <div className="hjg-profile-hero">
          <div>
            <div className="hjg-kicker">GAME PROFILE · INBODY OCR SCAN</div>
            <h3>Profile sức khoẻ đọc từ CSV + ảnh scan</h3>
            <p>
              Concept mô phỏng tab Profile/InBody theo AI Clinic: dữ liệu chính lấy từ file <strong>InBody-20260508 3.csv</strong>, kèm ảnh scan OCR <strong>IMG_2844.HEIC</strong> để người chơi kiểm tra nguồn chỉ số.
            </p>
          </div>
          <button type="button">Check-in hôm nay</button>
        </div>

        <div className="hjg-profile-grid">
          {scanMetrics.map(metric => (
            <div key={metric.label} className={`hjg-health-metric ${metric.tone}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.note}</em>
            </div>
          ))}
        </div>

        <div className="hjg-profile-content">
          <div className="hjg-inbody-upload-card">
            <h4>Upload kết quả InBody</h4>
            <p>Kéo thả ảnh hoặc file CSV để AI phân tích chỉ số cơ thể, nhiệm vụ XP và lộ trình rèn luyện.</p>
            <div className="hjg-dropzone">☁️<span>Scan InBody / .csv / image</span></div>
            <ul>
              <li>CSV rows: <strong>{records.length}</strong> lần đo</li>
              <li>Lần mới nhất: <strong>{latest.date}</strong></li>
              <li>OCR source: <strong>IMG_2844.HEIC</strong></li>
            </ul>
          </div>

          <div className="hjg-scan-preview">
            <img src={inbodyScanImage} alt="Ảnh scan InBody dùng cho OCR" />
            <div className="hjg-scan-overlay">OCR SCAN · Health metrics</div>
          </div>
        </div>

        <div className="hjg-profile-content bottom">
          <div className="hjg-result-card">
            <h4>Kết quả InBody</h4>
            <div className="hjg-score-ring" style={{ '--score': `${latest.score || 0}%` }}><span>{latest.score}</span><em>/100</em></div>
            <p>AI đánh giá: cần tăng lịch vận động nhịp nhàng, giảm mỡ cơ thể và duy trì nước/protein đủ để giữ khối cơ.</p>
          </div>
          <div className="hjg-history-card">
            <h4>Lịch sử InBody</h4>
            <MiniTrend records={records} metric="score" color="#9c6fff" />
            <div className="hjg-history-stats">
              <span>Cao nhất <strong>{Math.max(...records.map(r => r.score || 0))}</strong></span>
              <span>Trung bình <strong>{Math.round(records.reduce((sum, r) => sum + (r.score || 0), 0) / Math.max(records.length, 1))}</strong></span>
              <span>Thay đổi <strong className={deltaClass(scoreDelta)}>{scoreDelta >= 0 ? '+' : ''}{scoreDelta}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HealthJourneyGamePanel({ onPrev, prevLabel }) {
  const { lang } = useApp()
  const [activeTab, setActiveTab] = useState('profile')
  const records = useMemo(() => parseInBodyCsv(inbodyCsvText), [])
  const summary = useMemo(() => summarizeInBodyRecords(records), [records])
  const latest = summary.latest || {}

  return (
    <div className="animate-fade hjg-page">
      <section className="hjg-hero">
        <div className="hjg-brand">
          <div className="hjg-brand-mark">⚔️</div>
          <div>
            <div className="hjg-kicker">HEALTH JOURNEY GAME</div>
            <h2>Neuro Quest · Rèn luyện sức khoẻ bằng game động lực</h2>
            <p>
              {lang === 'vi'
                ? 'Menu cuối mới biến hành trình sức khoẻ thành chiến dịch gamification: nhiệm vụ hằng ngày, chapter rèn luyện, AI Coach, cửa hàng thưởng và Profile InBody đọc từ CSV/ảnh scan OCR.'
                : 'A final-menu motivational health game concept with daily quests, journey chapters, AI Coach, reward shop, and an InBody profile powered by CSV/OCR scan assets.'}
            </p>
          </div>
        </div>
        <img className="hjg-reference" src={gameConceptImage} alt="Concept Health Journey Game menu" />
      </section>

      <nav className="hjg-game-nav" aria-label="Health Journey Game menu">
        {GAME_TABS.map(tab => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'profile' ? (
        <ProfileInBodyTab records={records} summary={summary} />
      ) : (
        <div className="hjg-grid">
          <GameCard id="1" title="Trang chủ" accent="#00e5ff">
            <div className="hjg-warrior-art"><span>🧘‍♂️</span></div>
            <h3>Bắt đầu hành trình chiến binh</h3>
            <p>Nâng cấp thể chất, tinh thần và trí tuệ để chinh phục phiên bản tốt nhất.</p>
            <button type="button" className="hjg-primary">BẮT ĐẦU</button>
          </GameCard>
          <GameCard id="2" title="Nhiệm vụ" accent="#00e676">
            {DAILY_MISSIONS.map(mission => (
              <div key={mission.title} className="hjg-mission-row">
                <span>{mission.icon}</span><div><strong>{mission.title}</strong><em>{mission.subtitle}</em></div><b>{mission.progress}</b>
              </div>
            ))}
          </GameCard>
          <GameCard id="3" title="Hành trình" accent="#ff9d2e">
            {CHAPTERS.map(chapter => (
              <div key={chapter.name} className="hjg-chapter-row">
                <span style={{ background: chapter.color }} />
                <div><strong>{chapter.name}</strong><em>{chapter.locked ? 'Locked' : `${chapter.percent}%`}</em></div>
              </div>
            ))}
          </GameCard>
          <GameCard id="4" title="AI Coach" accent="#9c6fff">
            <div className="hjg-ai-orb">AI</div>
            <p>AI đang phân tích chỉ số InBody, thói quen và mục tiêu để tạo lịch luyện tập cá nhân.</p>
            <div className="hjg-progress"><span style={{ width: '66%' }} /></div>
          </GameCard>
          <GameCard id="5" title="Cửa hàng" accent="#00b8ff">
            {REWARDS.map(reward => <div key={reward.name} className="hjg-shop-row"><span>{reward.icon}</span><strong>{reward.name}</strong><em>🪙 {reward.price}</em></div>)}
          </GameCard>
          <GameCard id="6" title="Profile" accent="#ff2ea6">
            <div className="hjg-profile-mini"><strong>Shadow Warrior</strong><span>Lv. 12 · {fmt(latest.score, ' InBody Score')}</span></div>
            {HEALTH_STATS.map(stat => <div key={stat.label} className="hjg-stat-bar"><span>{stat.label}</span><i><b style={{ width: `${stat.value}%`, background: stat.color }} /></i><em>{stat.value}</em></div>)}
          </GameCard>
          <GameCard id="7" title="Thống kê" accent="#00e5ff">
            <MiniTrend records={records} metric="fat" color="#00e5ff" />
            <div className="hjg-stat-summary"><span>Nhiệm vụ hoàn thành <strong>32</strong></span><span>XP nhận được <strong>8,450</strong></span></div>
          </GameCard>
          <GameCard id="8" title="Chi tiết nhiệm vụ" accent="#306bff">
            <h3>Deep Work 90m</h3><p>Đã hoàn thành 70 phút · thưởng +90 XP và 20 Energy.</p><button type="button" className="hjg-primary">BẮT ĐẦU</button>
          </GameCard>
          <GameCard id="9" title="Chapter" accent="#7c4dff">
            <div className="hjg-warrior-art small"><span>⚡</span></div><p>Chapter 1 · The Awakening · Tiến độ 66%</p><button type="button" className="hjg-primary">TIẾP TỤC 1-3</button>
          </GameCard>
          <GameCard id="10" title="AI Coach - Gợi ý" accent="#00e676">
            {['Uống đủ nước +100 XP', 'Ngủ 7-8 tiếng +120 XP', 'Thiền 10 phút +80 XP'].map(item => <div key={item} className="hjg-coach-tip">✨ {item}</div>)}
          </GameCard>
          <GameCard id="11" title="Leaderboard" accent="#ffb74d">
            {['Titan', 'Shadow', 'Phoenix', 'Samurai', 'You'].map((name, index) => <div key={name} className={name === 'You' ? 'hjg-rank you' : 'hjg-rank'}><span>{index + 1}</span><strong>{name}</strong><em>Lv. {18 - index}</em></div>)}
          </GameCard>
          <GameCard id="12" title="Daily Reward" accent="#f48fb1">
            <div className="hjg-chest">🎁</div><h3>Rương huyền thoại</h3><p>Nhận thưởng ngày 7: 💎 500 · 🪙 100 · ⭐ 1</p>
          </GameCard>
        </div>
      )}

      <section className="hjg-clinic-reference">
        <div>
          <div className="hjg-kicker">PROFILE CONCEPT REFERENCE</div>
          <h3>AI Clinic InBody layout</h3>
          <p>Tab Profile dùng moodboard từ AIClinicInBody.PNG: sidebar clinic, cards check-in, upload InBody, kết quả phân tích và lịch sử chỉ số.</p>
        </div>
        <img src={aiClinicConceptImage} alt="AI Clinic InBody concept" />
      </section>

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
