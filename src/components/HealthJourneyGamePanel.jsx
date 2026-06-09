import React, { useMemo, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { parseInBodyCsv, summarizeInBodyRecords } from '../lib/inbodyCsv.js'
import gameConceptRef from './health-journey-game/health-journey-game.png'
import aiClinicProfileRef from '../inbody-khanh/DataInBody/AIClinicInBody.PNG'
import ocrScanRef from '../inbody-khanh/DataInBody/IMG_2844.HEIC'
import inBodyCsvRaw from '../inbody-khanh/DataInBody/InBody-20260508 3.csv?raw'

const GAME_TABS = [
  { id: 'mission', icon: '🗺️', label: 'Journey', caption: 'Bản đồ nhiệm vụ' },
  { id: 'quests', icon: '✅', label: 'Quests', caption: 'Daily & weekly' },
  { id: 'training', icon: '🏋️', label: 'Training', caption: 'Workout arena' },
  { id: 'nutrition', icon: '🥗', label: 'Nutrition', caption: 'Meal power-up' },
  { id: 'ranking', icon: '🏆', label: 'Ranking', caption: 'Leaderboards' },
  { id: 'profile', icon: '👤', label: 'Game Profile', caption: 'InBody OCR scan' },
  { id: 'rewards', icon: '🎁', label: 'Rewards', caption: 'Badges & shop' },
]

const DAILY_QUESTS = [
  { icon: '🚶', title: 'Đi bộ 8,000 bước', xp: 300, progress: 82, status: 'Gần hoàn tất' },
  { icon: '💧', title: 'Uống 2.2L nước', xp: 180, progress: 68, status: 'Đang streak 5 ngày' },
  { icon: '🧘', title: 'Thở sâu 10 phút', xp: 120, progress: 100, status: 'Đã nhận thưởng' },
  { icon: '😴', title: 'Ngủ trước 23:00', xp: 220, progress: 45, status: 'Nhắc lúc 22:15' },
]

const RANKING_ROWS = [
  { rank: 1, name: 'Kathy', score: 137, badge: 'Legend' },
  { rank: 2, name: 'LXK-2024', score: 64, badge: 'Comeback' },
  { rank: 3, name: '8418', score: 95, badge: 'Power' },
  { rank: 4, name: 'Carmen', score: 90, badge: 'Hydro' },
]

const OCR_SOURCES = [
  { name: 'AIClinicInBody.PNG', src: aiClinicProfileRef, type: 'profile concept', confidence: 97 },
  { name: 'IMG_2844.HEIC', src: ocrScanRef, type: 'health scan OCR', confidence: 92, heic: true },
]

function numberText(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}${suffix}`
}

function deltaText(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}${suffix}`
}

function calcGameStats(records) {
  const { first, latest, previous } = summarizeInBodyRecords(records)
  const scans = records.length
  const score = latest?.score || 0
  const muscleGain = latest?.muscle != null && first?.muscle != null ? latest.muscle - first.muscle : 0
  const fatChange = latest?.fat != null && first?.fat != null ? latest.fat - first.fat : 0
  const xp = Math.max(0, Math.round(scans * 140 + score * 12 + muscleGain * 160 - fatChange * 80))
  const level = Math.max(1, Math.floor(xp / 500) + 1)
  const levelProgress = Math.min(100, Math.round((xp % 500) / 5))
  const trend = latest?.score != null && previous?.score != null ? latest.score - previous.score : 0

  return { first, latest, previous, scans, score, muscleGain, fatChange, xp, level, levelProgress, trend }
}

function StatCard({ label, value, sub, accent = '#00e5ff' }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)', borderRadius: 22, padding: 16, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
      <div style={{ color: 'rgba(232,240,248,0.60)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ marginTop: 8, color: accent, fontSize: 30, lineHeight: 1, fontWeight: 1000 }}>{value}</div>
      {sub && <div style={{ marginTop: 8, color: 'rgba(232,240,248,0.68)', fontSize: 12, fontWeight: 700 }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ value, color = '#00e5ff' }) {
  return (
    <div style={{ height: 9, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.10)' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${color}, #9c6fff)`, boxShadow: `0 0 18px ${color}` }} />
    </div>
  )
}

function GamePhonePreview({ stats, activeTab }) {
  const checkpoints = ['Start', 'Hydrate', 'Workout', 'InBody', 'Boss']
  return (
    <div style={{ borderRadius: 36, padding: 12, background: 'linear-gradient(160deg, #151b34, #050812)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 28px 80px rgba(0,0,0,0.38)' }}>
      <div style={{ minHeight: 620, borderRadius: 28, overflow: 'hidden', position: 'relative', background: 'radial-gradient(circle at 50% 0%, rgba(0,229,255,0.26), transparent 34%), linear-gradient(180deg, #111b38 0%, #060915 62%, #05060c 100%)' }}>
        <img src={gameConceptRef} alt="Health Journey Game concept" style={{ width: '100%', height: 210, objectFit: 'cover', opacity: 0.78, filter: 'saturate(1.08)' }} />
        <div style={{ position: 'absolute', top: 18, left: 18, right: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 1000, fontSize: 18 }}>Health Journey</div>
          <div style={{ padding: '7px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.42)', color: '#00e5ff', fontWeight: 1000 }}>Lv.{stats.level}</div>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: -48, position: 'relative', zIndex: 2 }}>
            <StatCard label="XP" value={stats.xp} sub={`${stats.levelProgress}% tới level kế`} />
            <StatCard label="InBody" value={stats.score} sub={`${deltaText(stats.trend)} điểm lần gần nhất`} accent="#00e676" />
          </div>
          <div style={{ marginTop: 18, borderRadius: 24, padding: 16, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 1000 }}>
              <span>Quest map</span><span>{activeTab}</span>
            </div>
            <div style={{ position: 'relative', marginTop: 26, padding: '0 10px 10px' }}>
              <div style={{ position: 'absolute', left: 28, right: 28, top: 22, height: 4, borderRadius: 999, background: 'linear-gradient(90deg, #00e5ff, #00e676, #ffb74d)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                {checkpoints.map((point, index) => (
                  <div key={point} style={{ textAlign: 'center', width: 58 }}>
                    <div style={{ width: 46, height: 46, margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: index < 3 ? 'linear-gradient(135deg, #00e5ff, #00e676)' : 'rgba(255,255,255,0.13)', border: '2px solid rgba(255,255,255,0.38)', boxShadow: index < 3 ? '0 0 24px rgba(0,229,255,0.42)' : 'none' }}>{index < 3 ? '✓' : index + 1}</div>
                    <div style={{ marginTop: 8, color: 'rgba(232,240,248,0.78)', fontSize: 10, fontWeight: 900 }}>{point}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
            {GAME_TABS.slice(0, 4).map(tab => (
              <div key={tab.id} style={{ borderRadius: 16, padding: '10px 6px', textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div style={{ fontSize: 22 }}>{tab.icon}</div>
                <div style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>{tab.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfilePanel({ stats, records }) {
  const latest = stats.latest || {}
  const ocrMetrics = [
    { label: 'Cân nặng', value: numberText(latest.weight, ' kg') },
    { label: 'Cơ xương', value: numberText(latest.skeletalMuscle, ' kg') },
    { label: 'Mỡ cơ thể', value: numberText(latest.fat, '%') },
    { label: 'BMI', value: numberText(latest.bmi) },
    { label: 'BMR', value: numberText(latest.bmr, ' kcal') },
    { label: 'ECW Ratio', value: numberText(latest.ecwRatio) },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.92fr) minmax(0, 1.08fr)', gap: 18 }} className="health-game-profile-grid">
      <div style={{ borderRadius: 30, overflow: 'hidden', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}>
        <img src={aiClinicProfileRef} alt="AIClinic InBody profile concept" style={{ width: '100%', display: 'block', maxHeight: 520, objectFit: 'cover' }} />
        <div style={{ padding: 18 }}>
          <div style={{ color: '#00e5ff', fontSize: 12, fontWeight: 1000, letterSpacing: '0.12em' }}>GAME PROFILE CONCEPT</div>
          <h3 style={{ color: '#fff', fontSize: 24, marginTop: 6 }}>LXK-2024 · InBody Avatar</h3>
          <p style={{ color: 'rgba(232,240,248,0.70)', marginTop: 8 }}>Tab profile lấy concept từ AIClinicInBody.PNG, đồng bộ dữ liệu CSV và các chỉ số scan OCR để biến hồ sơ sức khoẻ thành avatar nhiệm vụ.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ borderRadius: 26, padding: 18, background: 'linear-gradient(135deg, rgba(0,229,255,0.16), rgba(156,111,255,0.10))', border: '1px solid rgba(0,229,255,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'rgba(232,240,248,0.62)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>CSV input</div>
              <h3 style={{ color: '#fff', fontSize: 22, marginTop: 4 }}>InBody-20260508 3.csv</h3>
            </div>
            <div style={{ color: '#00e676', fontWeight: 1000 }}>{records.length} scans parsed</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 14 }} className="health-game-metric-grid">
            {ocrMetrics.map(metric => <StatCard key={metric.label} label={metric.label} value={metric.value} />)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }} className="health-game-ocr-grid">
          {OCR_SOURCES.map(source => (
            <div key={source.name} style={{ borderRadius: 24, padding: 14, background: 'rgba(0,0,0,0.24)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ height: 170, borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center' }}>
                {source.heic ? (
                  <div style={{ padding: 18, textAlign: 'center', color: '#fff' }}>
                    <div style={{ fontSize: 40 }}>📷</div>
                    <div style={{ marginTop: 8, fontWeight: 1000 }}>HEIC OCR source</div>
                    <div style={{ color: 'rgba(232,240,248,0.62)', fontSize: 12 }}>Browser preview may depend on device support.</div>
                  </div>
                ) : (
                  <img src={source.src} alt={source.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ marginTop: 12, color: '#fff', fontWeight: 1000 }}>{source.name}</div>
              <div style={{ color: 'rgba(232,240,248,0.62)', fontSize: 12 }}>{source.type} · OCR confidence {source.confidence}%</div>
              <ProgressBar value={source.confidence} color={source.confidence > 95 ? '#00e676' : '#ffb74d'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function HealthJourneyGamePanel({ onPrev, prevLabel }) {
  const [activeTab, setActiveTab] = useState('mission')
  const records = useMemo(() => parseInBodyCsv(inBodyCsvRaw), [])
  const stats = useMemo(() => calcGameStats(records), [records])
  const latest = stats.latest || {}

  return (
    <div className="animate-fade" style={{ minHeight: '100%', padding: 'clamp(16px, 3vw, 34px)', background: 'radial-gradient(circle at 12% 4%, rgba(0,229,255,0.18), transparent 34%), radial-gradient(circle at 92% 10%, rgba(156,111,255,0.20), transparent 38%), linear-gradient(180deg, #081026, #050712 62%, #04060f)' }}>
      <section style={{ width: 'min(100%, 1480px)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 0.85fr)', gap: 22 }} className="health-game-layout">
        <div>
          <div style={{ borderRadius: 34, padding: 'clamp(22px, 4vw, 42px)', background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.035))', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 32px 90px rgba(0,0,0,0.30)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#00e5ff', fontSize: 12, fontWeight: 1000, letterSpacing: '0.16em' }}>HEALTH JOURNEY GAME</div>
                <h1 style={{ color: '#fff', fontSize: 'clamp(34px, 5vw, 72px)', lineHeight: 0.95, marginTop: 10 }}>Game động lực rèn luyện sức khoẻ</h1>
                <p style={{ color: 'rgba(232,240,248,0.72)', maxWidth: 760, marginTop: 16, fontSize: 16 }}>Concept hoá menu game từ ảnh mẫu thành một hành trình có nhiệm vụ, XP, ranking, phần thưởng và hồ sơ InBody OCR. Dữ liệu profile lấy trực tiếp từ CSV và các ảnh scan sức khoẻ.</p>
              </div>
              <div style={{ minWidth: 180, alignSelf: 'start', borderRadius: 24, padding: 16, background: 'rgba(0,0,0,0.26)', border: '1px solid rgba(0,229,255,0.22)' }}>
                <div style={{ color: 'rgba(232,240,248,0.62)', fontSize: 11, fontWeight: 900 }}>PLAYER LEVEL</div>
                <div style={{ color: '#00e5ff', fontSize: 44, fontWeight: 1000, lineHeight: 1 }}>{stats.level}</div>
                <ProgressBar value={stats.levelProgress} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 28 }} className="health-game-metric-grid">
              <StatCard label="InBody score" value={numberText(latest.score)} sub={`${deltaText(stats.trend)} so với scan trước`} />
              <StatCard label="Cân nặng" value={numberText(latest.weight, 'kg')} sub={latest.date || 'Latest scan'} accent="#00e676" />
              <StatCard label="Cơ xương" value={numberText(latest.skeletalMuscle, 'kg')} sub={`${deltaText(stats.muscleGain, 'kg')} từ scan đầu`} accent="#ffb74d" />
              <StatCard label="Mỡ cơ thể" value={numberText(latest.fat, '%')} sub={`${deltaText(stats.fatChange, '%')} từ scan đầu`} accent="#f48fb1" />
            </div>

            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingTop: 24, paddingBottom: 4 }}>
              {GAME_TABS.map(tab => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={{ minWidth: 128, border: `1px solid ${activeTab === tab.id ? 'rgba(0,229,255,0.55)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 18, padding: '12px 14px', background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(0,229,255,0.24), rgba(156,111,255,0.18))' : 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 22 }}>{tab.icon}</div>
                  <div style={{ fontWeight: 1000 }}>{tab.label}</div>
                  <div style={{ color: 'rgba(232,240,248,0.58)', fontSize: 11 }}>{tab.caption}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20, borderRadius: 32, padding: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {activeTab === 'profile' ? (
              <ProfilePanel stats={stats} records={records} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18 }} className="health-game-content-grid">
                <div>
                  <h2 style={{ color: '#fff', fontSize: 28 }}>Bộ menu game đầy đủ</h2>
                  <p style={{ color: 'rgba(232,240,248,0.66)', marginTop: 8 }}>Mỗi tab là một vòng lặp động lực: làm nhiệm vụ → nhận XP → tăng level → mở phần thưởng → scan InBody để cập nhật avatar sức khoẻ.</p>
                  <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                    {DAILY_QUESTS.map(quest => (
                      <div key={quest.title} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, alignItems: 'center', borderRadius: 20, padding: 14, background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 14, background: 'rgba(0,229,255,0.12)', fontSize: 24 }}>{quest.icon}</div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: '#fff', fontWeight: 1000 }}><span>{quest.title}</span><span>{quest.xp} XP</span></div>
                          <div style={{ color: 'rgba(232,240,248,0.58)', fontSize: 12, margin: '4px 0 8px' }}>{quest.status}</div>
                          <ProgressBar value={quest.progress} color={quest.progress >= 100 ? '#00e676' : '#00e5ff'} />
                        </div>
                        <div style={{ color: '#00e5ff', fontWeight: 1000 }}>{quest.progress}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ borderRadius: 26, padding: 16, background: 'linear-gradient(180deg, rgba(255,183,77,0.14), rgba(244,143,177,0.08))', border: '1px solid rgba(255,183,77,0.18)' }}>
                  <h3 style={{ color: '#fff', fontSize: 22 }}>🏆 Ranking board</h3>
                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    {RANKING_ROWS.map(row => (
                      <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, background: row.name === 'LXK-2024' ? 'rgba(0,229,255,0.16)' : 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: row.rank === 1 ? '#ffb74d' : 'rgba(255,255,255,0.12)', color: '#111', fontWeight: 1000 }}>{row.rank}</div>
                        <div style={{ flex: 1 }}><div style={{ color: '#fff', fontWeight: 1000 }}>{row.name}</div><div style={{ color: 'rgba(232,240,248,0.58)', fontSize: 12 }}>{row.badge}</div></div>
                        <div style={{ color: '#00e676', fontWeight: 1000 }}>{row.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <GamePhonePreview stats={stats} activeTab={GAME_TABS.find(tab => tab.id === activeTab)?.label || activeTab} />
      </section>
      <style>{`
        @media (max-width: 1180px) {
          .health-game-layout { grid-template-columns: 1fr !important; }
          .health-game-content-grid, .health-game-profile-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .health-game-metric-grid, .health-game-ocr-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ width: 'min(100%, 1480px)', margin: '18px auto 0' }}>
        <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
      </div>
    </div>
  )
}
