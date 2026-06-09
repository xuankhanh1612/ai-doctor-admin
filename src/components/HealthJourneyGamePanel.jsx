import React, { useMemo, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext.jsx'
import { parseInBodyCsv, summarizeInBodyRecords } from '../lib/inbodyCsv.js'
import gameConceptUrl from './health-journey-game/health-journey-game.png'
import aiClinicProfileUrl from '../inbody-khanh/DataInBody/AIClinicInBody.PNG'
import inBodyCsvText from '../inbody-khanh/DataInBody/InBody-20260508 3.csv?raw'

const heicScanSource = 'src/inbody-khanh/DataInBody/IMG_2844.HEIC'

const gameTabs = [
  { id: 'profile', icon: '🧬', label: 'Game Profile' },
  { id: 'journey', icon: '🗺️', label: 'Journey Map' },
  { id: 'quests', icon: '✅', label: 'Daily Quests' },
  { id: 'training', icon: '🏃', label: 'Workout Arena' },
  { id: 'nutrition', icon: '🥗', label: 'Nutrition Lab' },
  { id: 'scan', icon: '📸', label: 'OCR Scan' },
  { id: 'rewards', icon: '🏆', label: 'Rewards' },
  { id: 'leaderboard', icon: '👥', label: 'Leaderboard' },
  { id: 'shop', icon: '🛒', label: 'Avatar Shop' },
]

const badgeSet = [
  { icon: '💧', title: 'Hydration Hero', detail: '7 ngày đủ nước' },
  { icon: '🔥', title: 'Fat Burn Quest', detail: 'Giảm vòng mỡ bụng' },
  { icon: '🦵', title: 'Leg Power', detail: 'Tăng cơ chân' },
  { icon: '🧘', title: 'Recovery Mind', detail: 'Thiền 5 phút/ngày' },
]

function fmt(value, unit = '', fallback = '—') {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return `${Number.isInteger(value) ? value : value.toFixed(value < 10 ? 1 : 1)}${unit}`
}

function diffLabel(value, unit = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return '0'
  const rounded = Math.abs(value) < 10 ? value.toFixed(1) : value.toFixed(0)
  return `${value > 0 ? '+' : ''}${rounded}${unit}`
}

function buildQuestPlan(latest) {
  const fatHigh = (latest?.fat ?? 0) >= 30
  const visceralHigh = (latest?.visceralFatLevel ?? 0) >= 10
  const score = latest?.score ?? 0

  return [
    {
      title: 'Đi bộ thông minh',
      target: '6.000 bước + 10 phút giãn cơ',
      xp: 120,
      progress: fatHigh ? 64 : 76,
      hint: fatHigh ? 'Ưu tiên vận động vùng aerobic để giảm % mỡ.' : 'Duy trì nhịp tim nhẹ để giữ streak.',
    },
    {
      title: 'Protein cân bằng',
      target: `${fmt(latest?.protein, 'kg')} protein body marker`,
      xp: 90,
      progress: score >= 65 ? 72 : 58,
      hint: 'Thêm nguồn đạm nạc vào bữa chính và theo dõi phục hồi cơ.',
    },
    {
      title: 'Giảm mỡ nội tạng',
      target: `Level ${fmt(latest?.visceralFatLevel, '')} → mục tiêu < 10`,
      xp: 150,
      progress: visceralHigh ? 48 : 80,
      hint: visceralHigh ? 'Giảm đường lỏng, ngủ trước 23:00 và đi bộ sau ăn.' : 'Tiếp tục duy trì thói quen hiện tại.',
    },
  ]
}

function MetricCard({ label, value, delta, tone = 'cyan' }) {
  return (
    <div className={`hjg-metric hjg-tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{delta}</em>
    </div>
  )
}

function GameMenu({ activeTab, onSelect }) {
  return (
    <div className="hjg-game-menu" aria-label="Health Journey Game menu">
      {gameTabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? 'is-active' : ''}
          onClick={() => onSelect(tab.id)}
        >
          <span>{tab.icon}</span>
          <strong>{tab.label}</strong>
        </button>
      ))}
    </div>
  )
}

function GameProfile({ records, latest, previous, first }) {
  const quests = buildQuestPlan(latest)
  const level = Math.max(1, Math.round((latest?.score ?? 60) / 8))
  const xp = Math.round(((latest?.score ?? 60) * 17) + ((latest?.skeletalMuscle ?? 27) * 9))

  return (
    <div className="hjg-profile-grid">
      <section className="hjg-profile-phone" aria-label="Game profile concept from AIClinicInBody image">
        <img src={aiClinicProfileUrl} alt="AI Clinic InBody game profile concept" />
        <div className="hjg-phone-overlay">
          <span>AI CLINIC GAME PROFILE</span>
          <strong>Lv.{level} · {xp} XP</strong>
          <small>CSV feed: {records.length} InBody scans</small>
        </div>
      </section>

      <section className="hjg-card hjg-profile-card">
        <div className="hjg-card-kicker">PLAYER VITALS · INBODY CSV</div>
        <h3>Lê Xuân Khánh · Health Ranger</h3>
        <div className="hjg-level-track"><span style={{ width: `${Math.min(100, (xp % 1000) / 10)}%` }} /></div>
        <div className="hjg-metric-grid">
          <MetricCard label="Cân nặng" value={fmt(latest?.weight, 'kg')} delta={diffLabel((latest?.weight ?? 0) - (first?.weight ?? 0), 'kg')} />
          <MetricCard label="Cơ xương" value={fmt(latest?.skeletalMuscle, 'kg')} delta={diffLabel((latest?.skeletalMuscle ?? 0) - (first?.skeletalMuscle ?? 0), 'kg')} tone="green" />
          <MetricCard label="Mỡ cơ thể" value={fmt(latest?.fat, '%')} delta={diffLabel((latest?.fat ?? 0) - (previous?.fat ?? 0), '%')} tone="amber" />
          <MetricCard label="InBody Score" value={fmt(latest?.score)} delta={`${fmt(latest?.bmr, ' kcal')} BMR`} tone="violet" />
        </div>
        <div className="hjg-quest-stack">
          {quests.map(quest => (
            <article key={quest.title}>
              <div><strong>{quest.title}</strong><span>+{quest.xp} XP</span></div>
              <p>{quest.target}</p>
              <div className="hjg-mini-progress"><span style={{ width: `${quest.progress}%` }} /></div>
              <small>{quest.hint}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function TabContent({ activeTab, records, latest, previous, first }) {
  if (activeTab === 'profile') return <GameProfile records={records} latest={latest} previous={previous} first={first} />

  if (activeTab === 'scan') {
    const scanMetrics = [
      ['OCR cân nặng', fmt(latest?.weight, 'kg')],
      ['OCR BMI', fmt(latest?.bmi)],
      ['OCR PBF', fmt(latest?.fat, '%')],
      ['OCR BMR', fmt(latest?.bmr, ' kcal')],
      ['OCR ECW Ratio', fmt(latest?.ecwRatio)],
      ['OCR Phase Angle', fmt(latest?.phaseAngle, '°')],
    ]
    return (
      <div className="hjg-tab-panel hjg-scan-panel">
        <section className="hjg-card">
          <div className="hjg-card-kicker">IMAGE OCR SOURCES</div>
          <h3>Scan ảnh sức khoẻ + chuẩn hoá vào game stats</h3>
          <p>Tab này mô phỏng luồng OCR: ảnh PNG làm concept profile, ảnh HEIC là nguồn scan, còn số đo được hydrate từ CSV để đồng bộ game loop.</p>
          <div className="hjg-source-list">
            <div><strong>PNG profile concept</strong><span>src/inbody-khanh/DataInBody/AIClinicInBody.PNG</span></div>
            <div><strong>HEIC health scan</strong><span>{heicScanSource}</span></div>
            <div><strong>CSV input</strong><span>src/inbody-khanh/DataInBody/InBody-20260508 3.csv</span></div>
          </div>
        </section>
        <section className="hjg-card hjg-ocr-grid">
          {scanMetrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </section>
      </div>
    )
  }

  if (activeTab === 'journey') {
    return (
      <div className="hjg-tab-panel hjg-map-panel">
        {['Morning Mobility', 'Protein Gate', 'Cardio Forest', 'Sleep Castle'].map((node, index) => (
          <article key={node} className="hjg-map-node">
            <span>{index + 1}</span>
            <strong>{node}</strong>
            <p>{index < 2 ? 'Unlocked' : 'Next milestone'} · sync từ scan {latest?.shortDate}</p>
          </article>
        ))}
      </div>
    )
  }

  if (activeTab === 'rewards') {
    return <div className="hjg-tab-panel hjg-badge-grid">{badgeSet.map(badge => <article key={badge.title}><span>{badge.icon}</span><strong>{badge.title}</strong><p>{badge.detail}</p></article>)}</div>
  }

  if (activeTab === 'leaderboard') {
    return (
      <div className="hjg-tab-panel hjg-card">
        <div className="hjg-card-kicker">COMMUNITY MOTIVATION</div>
        <h3>Bảng xếp hạng tuần</h3>
        {['Khánh · 2.480 XP', 'AI Coach Team · 2.120 XP', 'Family Squad · 1.960 XP'].map((row, index) => <div className="hjg-rank" key={row}><span>#{index + 1}</span><strong>{row}</strong><em>{index === 0 ? '🔥 Streak' : 'Active'}</em></div>)}
      </div>
    )
  }

  return (
    <div className="hjg-tab-panel hjg-card">
      <div className="hjg-card-kicker">{gameTabs.find(tab => tab.id === activeTab)?.label}</div>
      <h3>Nhiệm vụ động lực cá nhân hoá</h3>
      <p>Dựa trên lần đo gần nhất: {latest?.date}. Game AI ưu tiên giảm mỡ, giữ cơ xương, tăng nước cơ thể và biến mỗi hành động thành XP.</p>
      <div className="hjg-action-grid">
        <MetricCard label="Water" value={fmt(latest?.water, 'L')} delta="+60 XP" />
        <MetricCard label="Visceral Fat" value={`Lv.${fmt(latest?.visceralFatLevel)}`} delta="Boss target" tone="amber" />
        <MetricCard label="Muscle Balance" value={fmt(((latest?.rightLegMuscle ?? 0) + (latest?.leftLegMuscle ?? 0)), 'kg')} delta="Leg quest" tone="green" />
      </div>
    </div>
  )
}

export default function HealthJourneyGamePanel({ onPrev, prevLabel }) {
  const { lang } = useApp()
  const [activeTab, setActiveTab] = useState('profile')
  const records = useMemo(() => parseInBodyCsv(inBodyCsvText), [])
  const { latest, previous, first } = useMemo(() => summarizeInBodyRecords(records), [records])

  return (
    <div className="animate-fade hjg-page">
      <section className="hjg-hero">
        <div className="hjg-hero-art">
          <img src={gameConceptUrl} alt="Health Journey Game concept" />
          <div className="hjg-orbit hjg-orbit-one" />
          <div className="hjg-orbit hjg-orbit-two" />
        </div>
        <div className="hjg-hero-copy">
          <div className="hjg-kicker">HEALTH JOURNEY GAME · FINAL MENU</div>
          <h2>🎮 Health Journey Game</h2>
          <p>
            {lang === 'vi'
              ? 'Trang game động lực rèn luyện sức khoẻ: biến dữ liệu InBody, ảnh scan OCR và nhiệm vụ hằng ngày thành XP, level, huy hiệu và bản đồ hành trình.'
              : 'A motivational health-training game that turns InBody data, OCR health scans, and daily actions into XP, levels, badges, and a journey map.'}
          </p>
          <div className="hjg-hero-stats">
            <MetricCard label="Latest Scan" value={latest?.shortDate || '—'} delta={`${records.length} CSV rows`} />
            <MetricCard label="InBody Score" value={fmt(latest?.score)} delta={diffLabel((latest?.score ?? 0) - (previous?.score ?? 0))} tone="violet" />
            <MetricCard label="Body Fat" value={fmt(latest?.fat, '%')} delta="Boss HP" tone="amber" />
          </div>
        </div>
      </section>

      <GameMenu activeTab={activeTab} onSelect={setActiveTab} />
      <TabContent activeTab={activeTab} records={records} latest={latest} previous={previous} first={first} />

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
