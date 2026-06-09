import React, { useMemo, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import gameConceptImage from './health-journey-game/health-journey-game.png'
import aiClinicConceptImage from '../inbody-khanh/DataInBody/AIClinicInBody.PNG'
import inBodyScanImage from '../inbody-khanh/DataInBody/IMG_2844.HEIC'
import inBodyCsvRaw from '../inbody-khanh/DataInBody/InBody-20260508 3.csv?raw'

const GAME_TABS = [
  { id: 'home', label: 'Trang chủ', icon: '🏠' },
  { id: 'missions', label: 'Nhiệm vụ', icon: '✅' },
  { id: 'journey', label: 'Hành trình', icon: '🗺️' },
  { id: 'coach', label: 'AI Coach', icon: '🎙️' },
  { id: 'store', label: 'Cửa hàng', icon: '🎁' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'stats', label: 'Thống kê', icon: '📈' },
  { id: 'taskDetail', label: 'Chi tiết nhiệm vụ', icon: '🛡️' },
  { id: 'chapter', label: 'Chapter', icon: '⚔️' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'reward', label: 'Daily Reward', icon: '💎' },
]

const MISSIONS = [
  { name: 'Uống đủ nước', detail: '2.2L hôm nay để giảm ECW strain', value: '5/7 ngày', xp: 100, status: 'done' },
  { name: 'Deep Work 90m', detail: 'Không snack, đi bộ nhẹ sau giờ làm', value: '70/90 phút', xp: 90, status: 'active' },
  { name: 'Cold Shower', detail: 'Tắm nước lạnh 2 phút để kích hoạt kỷ luật', value: '0/1', xp: 80, status: 'todo' },
  { name: 'Protein Target', detail: 'Ưu tiên 110g protein theo BMR 1451 kcal', value: '72/110g', xp: 120, status: 'active' },
]

const CHAPTERS = [
  { chapter: 'Chapter 1', title: 'The Awakening', progress: 66, color: '#00e5ff' },
  { chapter: 'Chapter 2', title: 'The Discipline', progress: 32, color: '#ff3d9a' },
  { chapter: 'Chapter 3', title: 'The Transformation', progress: 10, color: '#ffb74d' },
  { chapter: 'Chapter 4', title: 'The Mastery', progress: 0, color: '#9c6fff' },
]

const SHOP_ITEMS = [
  { name: 'Starter Pack', price: 200, icon: '📦' },
  { name: 'Focus Potion', price: 150, icon: '🧪' },
  { name: 'Streak Shield', price: 300, icon: '🛡️' },
  { name: 'Legend Chest', price: 500, icon: '🧰' },
]

const REWARD_DAYS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']

function parseCsv(raw) {
  const rows = raw.trim().split(/\r?\n/).filter(Boolean)
  const headers = rows[0].replace(/^\uFEFF/, '').split(',')
  return rows.slice(1).map(row => {
    const values = row.split(',')
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index]
      return acc
    }, {})
  })
}

function numberValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatScanTime(value) {
  if (!value || value.length < 14) return value
  const year = value.slice(0, 4)
  const month = value.slice(4, 6)
  const day = value.slice(6, 8)
  const hour = value.slice(8, 10)
  const minute = value.slice(10, 12)
  return `${day}/${month}/${year} · ${hour}:${minute}`
}

function getMetric(row, label) {
  return numberValue(row?.[label])
}

export default function HealthJourneyGamePanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const [activeTab, setActiveTab] = useState('home')
  const records = useMemo(() => parseCsv(inBodyCsvRaw), [])
  const latest = records[0] || {}
  const previous = records[1] || records[0] || {}

  const healthProfile = useMemo(() => {
    const weight = getMetric(latest, 'Cân nặng(kg)')
    const prevWeight = getMetric(previous, 'Cân nặng(kg)')
    const muscle = getMetric(latest, 'Khối lượng cơ xương(kg)')
    const bodyFat = getMetric(latest, 'Tỷ lệ mỡ cơ thể(%)')
    const bmr = getMetric(latest, 'Tỷ lệ trao đổi chất cơ bản(kcal)')
    const score = getMetric(latest, 'Điểm InBody')
    const visceral = getMetric(latest, 'Mức độ chất béo nội tạng(Level)')
    const water = getMetric(latest, 'Lượng nước trong cơ thể(L)')
    const phaseAngle = getMetric(latest, 'Góc pha toàn bộ cơ thể(°)')
    const bmi = getMetric(latest, 'BMI(kg/m²)')
    const weightDelta = weight !== null && prevWeight !== null ? Number((weight - prevWeight).toFixed(1)) : 0

    return {
      weight,
      weightDelta,
      muscle,
      bodyFat,
      bmr,
      score,
      visceral,
      water,
      phaseAngle,
      bmi,
      scanTime: formatScanTime(latest['ngày']),
      device: latest['Thiết bị đo'] || 'InBody 380',
      bodyCellMass: getMetric(latest, 'Khối lượng tế bào cơ thể(kg)'),
      mineral: getMetric(latest, 'Khoáng chất(kg)'),
      protein: getMetric(latest, 'Protein(kg)'),
      waistRatio: getMetric(latest, 'Tỷ lệ mỡ bụng'),
    }
  }, [latest, previous])

  const ocrSignals = [
    { label: 'Cân nặng', value: `${healthProfile.weight ?? '-'} kg`, note: `${healthProfile.weightDelta >= 0 ? '+' : ''}${healthProfile.weightDelta} kg so với lần trước` },
    { label: 'Cơ xương', value: `${healthProfile.muscle ?? '-'} kg`, note: 'Mục tiêu tăng sức mạnh chân + thân mình' },
    { label: 'Mỡ cơ thể', value: `${healthProfile.bodyFat ?? '-'}%`, note: 'Ưu tiên deficit nhẹ + protein cao' },
    { label: 'BMR', value: `${healthProfile.bmr ?? '-'} kcal`, note: 'Dùng làm ngân sách nhiệm vụ dinh dưỡng' },
    { label: 'Mỡ nội tạng', value: `Level ${healthProfile.visceral ?? '-'}`, note: 'Boss “Belly Fat” cần hạ dần' },
    { label: 'Góc pha', value: `${healthProfile.phaseAngle ?? '-'}°`, note: 'Tín hiệu phục hồi tế bào' },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case 'missions':
        return <MissionsTab />
      case 'journey':
        return <JourneyTab />
      case 'coach':
        return <CoachTab healthProfile={healthProfile} />
      case 'store':
        return <StoreTab />
      case 'profile':
        return <ProfileTab healthProfile={healthProfile} ocrSignals={ocrSignals} records={records} />
      case 'stats':
        return <StatsTab records={records} healthProfile={healthProfile} />
      case 'taskDetail':
        return <TaskDetailTab />
      case 'chapter':
        return <ChapterTab />
      case 'leaderboard':
        return <LeaderboardTab />
      case 'reward':
        return <RewardTab />
      default:
        return <HomeTab healthProfile={healthProfile} setActiveTab={setActiveTab} />
    }
  }

  return (
    <section className="health-game-shell animate-fade">
      <div className="health-game-hero">
        <div className="health-game-brand">
          <div className="health-game-logo">🧠</div>
          <div>
            <p>AI Habit + Gamification</p>
            <h1>Health Journey Game</h1>
            <span>Warrior journey dùng dữ liệu InBody + OCR scan để biến rèn luyện sức khoẻ thành game động lực.</span>
          </div>
        </div>
        <div className="health-game-hero-card">
          <img src={gameConceptImage} alt="Neuro Quest reference concept for Health Journey Game" />
          <div>
            <strong>Concept reference</strong>
            <span>Menu game được dựng lại từ hình mẫu: Home · Mission · Journey · AI Coach · Store · Profile · Stats · Detail · Chapter · Leaderboard · Reward.</span>
          </div>
        </div>
      </div>

      <div className="health-game-top-nav" aria-label="Health Journey Game menu">
        {GAME_TABS.map(tab => (
          <button key={tab.id} className={activeTab === tab.id ? 'is-active' : ''} type="button" onClick={() => setActiveTab(tab.id)}>
            <span>{tab.icon}</span>
            <small>{tab.label}</small>
          </button>
        ))}
      </div>

      {renderTab()}

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} onNext={onNext} nextLabel={nextLabel} style={{ marginTop: 20 }} />
    </section>
  )
}

function HomeTab({ healthProfile, setActiveTab }) {
  return (
    <div className="health-game-grid health-game-grid-main">
      <article className="health-game-card health-game-warrior-card">
        <div className="health-game-avatar-ring"><span>🥷</span></div>
        <h2>Shadow Warrior · Lv. 12</h2>
        <p>Điểm InBody {healthProfile.score}/100 · BMI {healthProfile.bmi} · mục tiêu Chapter 1: giảm mỡ, tăng cơ, giữ streak.</p>
        <div className="health-game-progress"><span style={{ width: '66%' }} /></div>
        <button type="button" onClick={() => setActiveTab('missions')}>Bắt đầu nhiệm vụ hôm nay</button>
        <div className="health-game-currencies"><span>🪙 2,450</span><span>💎 340</span><span>⚡ 6,000</span></div>
      </article>
      <article className="health-game-card">
        <h3>Health Radar</h3>
        <div className="health-game-radar">
          <span style={{ '--x': '50%', '--y': '9%' }}>Cơ {healthProfile.muscle}</span>
          <span style={{ '--x': '91%', '--y': '45%' }}>Score {healthProfile.score}</span>
          <span style={{ '--x': '70%', '--y': '86%' }}>BMR {healthProfile.bmr}</span>
          <span style={{ '--x': '22%', '--y': '82%' }}>Nước {healthProfile.water}</span>
          <span style={{ '--x': '10%', '--y': '38%' }}>Mỡ {healthProfile.bodyFat}%</span>
        </div>
      </article>
      <article className="health-game-card">
        <h3>AI đề xuất hôm nay</h3>
        <ul className="health-game-list">
          <li><span>💧</span><div>Uống đủ nước theo lịch 6 mốc <b>+100 XP</b></div></li>
          <li><span>🚶</span><div>Đi bộ 25 phút sau bữa tối <b>+120 XP</b></div></li>
          <li><span>🥚</span><div>Thêm protein nạc để bảo vệ cơ xương <b>+90 XP</b></div></li>
        </ul>
      </article>
    </div>
  )
}

function MissionsTab() {
  return (
    <div className="health-game-grid">
      <article className="health-game-card health-game-wide">
        <h3>Nhiệm vụ hôm nay</h3>
        {MISSIONS.map(mission => (
          <div className={`health-game-mission ${mission.status}`} key={mission.name}>
            <div><strong>{mission.name}</strong><span>{mission.detail}</span></div>
            <b>{mission.value}</b>
            <em>+{mission.xp} XP</em>
          </div>
        ))}
      </article>
      <article className="health-game-card">
        <h3>Rương nhiệm vụ</h3>
        <div className="health-game-chest-row"><span>🧰</span><span>🧰</span><span>🎁</span></div>
        <p>Hoàn thành 3 nhiệm vụ để mở Warrior Chest và nhận Focus Potion.</p>
      </article>
    </div>
  )
}

function JourneyTab() {
  return (
    <div className="health-game-grid">
      {CHAPTERS.map(chapter => (
        <article className="health-game-card health-game-chapter" key={chapter.title} style={{ '--chapter-color': chapter.color }}>
          <small>{chapter.chapter}</small>
          <h3>{chapter.title}</h3>
          <div className="health-game-progress"><span style={{ width: `${chapter.progress}%`, background: chapter.color }} /></div>
          <p>{chapter.progress}% hoàn thành</p>
        </article>
      ))}
    </div>
  )
}

function CoachTab({ healthProfile }) {
  return (
    <div className="health-game-grid health-game-grid-main">
      <article className="health-game-card health-game-ai-orb"><div>AI</div><span>Đang phân tích dữ liệu scan...</span></article>
      <article className="health-game-card health-game-wide">
        <h3>AI Coach gợi ý</h3>
        <ul className="health-game-list">
          <li><span>🎯</span><div>Vì tỷ lệ mỡ {healthProfile.bodyFat}%, ưu tiên giảm 300 kcal/ngày thay vì cắt sâu.</div></li>
          <li><span>🦵</span><div>Khối cơ chân đang là nhiệm vụ cốt lõi: squat nhẹ, stair walk, calf raise.</div></li>
          <li><span>😴</span><div>Giữ giấc ngủ 7–8h để cải thiện phase angle {healthProfile.phaseAngle}°.</div></li>
        </ul>
      </article>
    </div>
  )
}

function StoreTab() {
  return (
    <div className="health-game-grid">
      {SHOP_ITEMS.map(item => (
        <article className="health-game-card health-game-shop-item" key={item.name}>
          <div>{item.icon}</div><h3>{item.name}</h3><p>🪙 {item.price}</p><button type="button">Đổi thưởng</button>
        </article>
      ))}
    </div>
  )
}

function ProfileTab({ healthProfile, ocrSignals, records }) {
  return (
    <div className="health-game-profile-layout">
      <article className="health-game-card health-game-profile-card">
        <div className="health-game-profile-head">
          <div className="health-game-avatar-ring small"><span>👤</span></div>
          <div><h2>Shadow Warrior</h2><p>Scan lúc {healthProfile.scanTime} · Device {healthProfile.device}</p></div>
        </div>
        <div className="health-game-profile-stats">
          <span>InBody Score <b>{healthProfile.score}</b></span>
          <span>Weight <b>{healthProfile.weight}kg</b></span>
          <span>SMM <b>{healthProfile.muscle}kg</b></span>
          <span>PBF <b>{healthProfile.bodyFat}%</b></span>
        </div>
        <img className="health-game-profile-concept" src={aiClinicConceptImage} alt="AI Clinic InBody profile concept" />
      </article>

      <article className="health-game-card health-game-wide">
        <h3>Game Profile · dữ liệu input CSV + scan OCR</h3>
        <p className="health-game-muted">Nguồn dữ liệu: <code>InBody-20260508 3.csv</code> có {records.length} lần đo; ảnh scan OCR: <code>IMG_2844.HEIC</code>. Nếu trình duyệt không hiển thị HEIC, hệ thống vẫn giữ URL tài liệu và hiển thị kết quả OCR chuẩn hoá từ dữ liệu sức khoẻ.</p>
        <div className="health-game-ocr-layout">
          <div className="health-game-scan-frame">
            <img src={inBodyScanImage} alt="InBody health scan source IMG_2844.HEIC" />
            <div className="health-game-scan-fallback">IMG_2844.HEIC · Health scan source</div>
          </div>
          <div className="health-game-ocr-grid">
            {ocrSignals.map(signal => (
              <div key={signal.label}>
                <small>{signal.label}</small>
                <strong>{signal.value}</strong>
                <span>{signal.note}</span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  )
}

function StatsTab({ records, healthProfile }) {
  const scorePoints = records.slice().reverse().map((record, index) => ({
    index,
    score: getMetric(record, 'Điểm InBody') || 0,
    fat: getMetric(record, 'Tỷ lệ mỡ cơ thể(%)') || 0,
  }))
  return (
    <div className="health-game-grid health-game-grid-main">
      <article className="health-game-card health-game-wide">
        <h3>Biến động InBody</h3>
        <div className="health-game-chart">
          {scorePoints.map(point => <span key={point.index} style={{ height: `${point.score}%` }} title={`Score ${point.score}`} />)}
        </div>
        <p>Score hiện tại {healthProfile.score}; mỡ cơ thể {healthProfile.bodyFat}%; BMI {healthProfile.bmi}.</p>
      </article>
      <article className="health-game-card">
        <h3>Tổng quan tuần</h3>
        <div className="health-game-kpis"><span>32 nhiệm vụ</span><span>8,450 XP</span><span>12 ngày streak</span><span>21h30 focus</span></div>
      </article>
    </div>
  )
}

function TaskDetailTab() {
  return (
    <article className="health-game-card health-game-detail-card">
      <h3>Deep Work 90m</h3><p>Tập trung làm việc 90 phút, đi bộ 10 phút sau phiên, tránh snack ngọt.</p>
      <div className="health-game-progress"><span style={{ width: '78%' }} /></div>
      <button type="button">Bắt đầu</button>
    </article>
  )
}

function ChapterTab() {
  return (
    <article className="health-game-card health-game-detail-card">
      <h3>Chapter 1 · The Awakening</h3><p>Boss hiện tại: Belly Fat Level. Mục tiêu: giữ cơ xương, giảm PBF và tăng nước nội bào.</p>
      <div className="health-game-stage-row"><span>1-1 First Step ✅</span><span>1-2 The Breath ✅</span><span>1-3 The Focus ⚡</span><span>1-4 Challenge 🔒</span></div>
    </article>
  )
}

function LeaderboardTab() {
  const players = ['Titan', 'Shadow', 'Phoenix', 'Samurai', 'You']
  return (
    <article className="health-game-card health-game-detail-card">
      <h3>Leaderboard</h3>
      {players.map((player, index) => <div className="health-game-rank" key={player}><b>#{index + 1}</b><span>{player}</span><em>{18450 - index * 2110} XP</em></div>)}
    </article>
  )
}

function RewardTab() {
  return (
    <article className="health-game-card health-game-detail-card health-game-reward">
      <h3>Daily Reward</h3>
      <div className="health-game-days">{REWARD_DAYS.map((day, index) => <span className={index < 6 ? 'done' : ''} key={day}>{day}<b>{index < 6 ? '✓' : '🎁'}</b></span>)}</div>
      <div className="health-game-big-chest">🧰</div><button type="button">Nhận thưởng</button>
    </article>
  )
}
