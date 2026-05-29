import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import NavButtons from './NavButtons.jsx'

const SOURCE_URL = 'https://suckhoedoisong.vn/long-chau-tam-soat-hpv-mien-phi-cho-hang-tram-khach-hang-ra-mat-giai-phap-nhan-dien-som-nguy-co-ung-thu-co-tu-cung-169260313102804621.htm?utm_source=chatgpt.com'
const OUTCOME_URL = 'https://drive.google.com/file/d/1KhVVe3SVnSVXP1bBfEm5ePQB-z9bo3zG/view?usp=drive_link'

const SOURCE_FACTS = [
  { value: '>500', label: 'khách hàng nữ được tiếp cận kit test nhanh' },
  { value: '99%', label: 'ca ung thư cổ tử cung có sự hiện diện HPV' },
  { value: '80%', label: 'phụ nữ ước tính từng nhiễm HPV một lần trong đời' },
  { value: '28%', label: 'phụ nữ Việt 30–49 từng sàng lọc ung thư cổ tử cung' },
  { value: '70%', label: 'mục tiêu WHO về sàng lọc trước tuổi 35' },
]

const FILTERS = [
  {
    id: 'hpvPositive',
    label: 'HPV dương tính',
    color: 'var(--cyan)',
    description: 'Tụ ở nhóm 20–50 tuổi, khớp đỉnh dịch tễ học.',
  },
  {
    id: 'hpv1618',
    label: 'HPV 16/18 nguy cơ cao',
    color: 'var(--red)',
    description: 'Cụm dày giữa biểu đồ; 2 chủng liên quan khoảng 70% ung thư cổ tử cung.',
  },
  {
    id: 'unscreened',
    label: 'Chưa từng tầm soát',
    color: 'var(--amber)',
    description: 'Lan rộng vùng 30–49 tuổi, phản ánh khoảng trống khi chỉ 28% từng sàng lọc.',
  },
  {
    id: 'vaccinated',
    label: 'Đã tiêm vắc xin',
    color: 'var(--green)',
    description: 'Tập trung góc trái, nổi bật nhóm trẻ dưới 30.',
  },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makePoint(index, category, ageBase, ageWave, signalBase, signalWave, spread = 1) {
  const age = clamp(Math.round(ageBase + Math.sin(index * 1.7) * ageWave + (index % 5 - 2) * spread), 18, 55)
  const signal = clamp(Math.round(signalBase + Math.cos(index * 1.13) * signalWave + (index % 7 - 3) * spread * 2), 4, 98)
  return {
    id: `${category}-${index}`,
    age,
    signal,
    category,
  }
}

const SCATTER_POINTS = [
  ...Array.from({ length: 30 }, (_, i) => makePoint(i, 'hpvPositive', 35, 14, 64, 20, 1.8)),
  ...Array.from({ length: 22 }, (_, i) => makePoint(i, 'hpv1618', 38, 8, 78, 13, 1.2)),
  ...Array.from({ length: 28 }, (_, i) => makePoint(i, 'unscreened', 40, 10, 45, 23, 2.3)),
  ...Array.from({ length: 20 }, (_, i) => makePoint(i, 'vaccinated', 25, 6, 22, 14, 1.4)),
]

function Card({ children, style }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      borderRadius: 18,
      padding: 18,
      ...style,
    }}>
      {children}
    </div>
  )
}

function SourceMetric({ fact }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--cyan)', fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 900 }}>{fact.value}</div>
      <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 5, lineHeight: 1.45 }}>{fact.label}</div>
    </div>
  )
}

function FilterButton({ filter, active, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left', width: '100%', cursor: 'pointer', padding: 14,
        borderRadius: 14, fontFamily: 'inherit',
        background: active ? `${filter.color}18` : 'var(--surface)',
        border: `1px solid ${active ? filter.color : 'var(--border)'}`,
        color: 'var(--text)',
        transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 900 }}>{filter.label}</span>
        <span style={{ color: filter.color, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900 }}>{count}</span>
      </div>
      <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 7, lineHeight: 1.45 }}>{filter.description}</div>
    </button>
  )
}

function HpvScatterChart({ points, activeFilter, onSelectFilter }) {
  const width = 720
  const height = 430
  const pad = { left: 58, right: 24, top: 30, bottom: 58 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const ageMin = 18
  const ageMax = 55
  const signalMin = 0
  const signalMax = 100
  const activeMeta = FILTERS.find(filter => filter.id === activeFilter)

  const x = (age) => pad.left + ((age - ageMin) / (ageMax - ageMin)) * chartW
  const y = (signal) => pad.top + (1 - (signal - signalMin) / (signalMax - signalMin)) * chartH

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ tương tác tín hiệu HPV theo tuổi" style={{ width: '100%', minWidth: 620, display: 'block' }}>
        <defs>
          <radialGradient id="hpvGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height} rx="18" fill="rgba(0,0,0,0.16)" />
        {[20, 40, 60, 80, 100].map(signal => (
          <g key={signal}>
            <line x1={pad.left} x2={width - pad.right} y1={y(signal)} y2={y(signal)} stroke="var(--border)" strokeDasharray="4 8" />
            <text x={pad.left - 12} y={y(signal) + 4} textAnchor="end" fill="var(--text3)" fontSize="11" fontFamily="var(--font-mono)">{signal}</text>
          </g>
        ))}
        {[20, 30, 40, 50].map(age => (
          <g key={age}>
            <line x1={x(age)} x2={x(age)} y1={pad.top} y2={height - pad.bottom} stroke="var(--border)" strokeDasharray="2 10" />
            <text x={x(age)} y={height - 28} textAnchor="middle" fill="var(--text3)" fontSize="11" fontFamily="var(--font-mono)">{age}</text>
          </g>
        ))}

        <rect x={x(30)} y={pad.top} width={x(49) - x(30)} height={chartH} fill="rgba(255,183,77,0.06)" stroke="rgba(255,183,77,0.16)" strokeDasharray="6 8" />
        <text x={(x(30) + x(49)) / 2} y={pad.top + 18} textAnchor="middle" fill="var(--amber)" fontSize="11" fontFamily="var(--font-mono)">30–49: screening gap</text>

        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="var(--border2)" />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="var(--border2)" />
        <text x={width / 2} y={height - 8} textAnchor="middle" fill="var(--text2)" fontSize="12">Tuổi khách hàng</text>
        <text transform={`translate(16 ${height / 2}) rotate(-90)`} textAnchor="middle" fill="var(--text2)" fontSize="12">Tín hiệu HPV (0–100)</text>

        {points.map(point => {
          const filter = FILTERS.find(item => item.id === point.category)
          const isActive = point.category === activeFilter
          return (
            <g key={point.id} style={{ cursor: 'pointer' }} onClick={() => onSelectFilter(point.category)}>
              {isActive && <circle cx={x(point.age)} cy={y(point.signal)} r="13" fill="url(#hpvGlow)" opacity="0.18" />}
              <circle
                cx={x(point.age)}
                cy={y(point.signal)}
                r={isActive ? 7 : 4.6}
                fill={filter.color}
                opacity={isActive ? 0.96 : 0.22}
                stroke={isActive ? '#fff' : 'transparent'}
                strokeWidth={isActive ? 1.5 : 0}
              >
                <title>{`${filter.label}: tuổi ${point.age}, tín hiệu HPV ${point.signal}`}</title>
              </circle>
            </g>
          )
        })}

        <g transform={`translate(${width - 250} ${height - 82})`}>
          <rect width="222" height="52" rx="12" fill="rgba(4,6,15,0.78)" stroke="var(--border2)" />
          <circle cx="20" cy="26" r="7" fill={activeMeta.color} />
          <text x="36" y="22" fill="var(--text)" fontSize="12" fontWeight="800">{activeMeta.label}</text>
          <text x="36" y="39" fill="var(--text3)" fontSize="10">Click điểm hoặc bộ lọc để đổi lớp dữ liệu</text>
        </g>
      </svg>
    </div>
  )
}

export default function StatisticalAnalysisPanel({ onNext, onPrev, prevLabel }) {
  const { t } = useApp()
  const [activeFilter, setActiveFilter] = useState('hpvPositive')

  const filteredStats = useMemo(() => {
    const activePoints = SCATTER_POINTS.filter(point => point.category === activeFilter)
    const avgAge = Math.round(activePoints.reduce((sum, point) => sum + point.age, 0) / activePoints.length)
    const avgSignal = Math.round(activePoints.reduce((sum, point) => sum + point.signal, 0) / activePoints.length)
    return { count: activePoints.length, avgAge, avgSignal }
  }, [activeFilter])

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card style={{
        background: 'radial-gradient(circle at 12% 15%, rgba(0,229,255,0.18), transparent 34%), radial-gradient(circle at 86% 12%, rgba(255,82,82,0.12), transparent 28%), var(--surface)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '0.14em' }}>AI AGENT STATISTICAL ANALYSIS</div>
            <h2 style={{ color: 'var(--text)', fontSize: 26, fontWeight: 900, marginTop: 8 }}>{t('statAnalysisTitle')}</h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 7, lineHeight: 1.65 }}>{t('statAnalysisSubtitle')}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 230 }}>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none', fontSize: 11, fontFamily: 'var(--font-mono)', border: '1px solid rgba(0,229,255,0.28)', borderRadius: 999, padding: '8px 11px', background: 'rgba(0,229,255,0.07)' }}>INPUT · suckhoedoisong.vn ↗</a>
            <a href={OUTCOME_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--violet)', textDecoration: 'none', fontSize: 11, fontFamily: 'var(--font-mono)', border: '1px solid rgba(156,111,255,0.3)', borderRadius: 999, padding: '8px 11px', background: 'rgba(156,111,255,0.08)' }}>OUTPUT · hpv_longchau_scatter.html ↗</a>
          </div>
        </div>
      </Card>

      <div className="stat-analysis-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        {SOURCE_FACTS.map(fact => <SourceMetric key={fact.label} fact={fact} />)}
      </div>

      <div className="stat-analysis-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', gap: 16 }}>
        <Card style={{ padding: 12 }}>
          <HpvScatterChart points={SCATTER_POINTS} activeFilter={activeFilter} onSelectFilter={setActiveFilter} />
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 900 }}>{t('statFiltersTitle')}</div>
            <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 4 }}>{t('statFiltersHint')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 13 }}>
              {FILTERS.map(filter => (
                <FilterButton
                  key={filter.id}
                  filter={filter}
                  active={activeFilter === filter.id}
                  count={SCATTER_POINTS.filter(point => point.category === filter.id).length}
                  onClick={() => setActiveFilter(filter.id)}
                />
              ))}
            </div>
          </Card>

          <Card style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(255,183,77,0.08))' }}>
            <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 900 }}>{t('statOutcomeTitle')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
              <div><div style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900 }}>{filteredStats.count}</div><div style={{ color: 'var(--text3)', fontSize: 9 }}>điểm</div></div>
              <div><div style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900 }}>{filteredStats.avgAge}</div><div style={{ color: 'var(--text3)', fontSize: 9 }}>tuổi TB</div></div>
              <div><div style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900 }}>{filteredStats.avgSignal}</div><div style={{ color: 'var(--text3)', fontSize: 9 }}>HPV TB</div></div>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 12, lineHeight: 1.55 }}>{t('statOutcomeCopy')}</p>
          </Card>
        </div>
      </div>

      <NavButtons onNext={onNext} nextLabel={t('continueAiCouncil')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
