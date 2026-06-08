import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { SCENARIOS } from '../data/mockData.js'
import NavButtons from './NavButtons.jsx'

const Card = ({ title, children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

const ROADMAP = [
  { label: 'Erlotinib · Day 0',            desc: '150mg/day · EGFR inhibitor · Oral',              color: 'var(--cyan)'   },
  { label: 'Checkpoint assessment · Wk 6', desc: 'PET-CT re-staging + biomarker panel',             color: 'var(--violet)' },
  { label: 'L2 Biopsy · Week 8',           desc: 'Confirm/rule out clonal divergence',              color: 'var(--amber)'  },
  { label: 'Response confirmed · Month 3', desc: 'Continue maintenance · Adjust dose PRN',          color: 'var(--green)'  },
]

export default function SimulationPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const { t } = useApp()
  const [scenario, setScenario] = useState('B')
  const [months, setMonths] = useState(6)

  const sc = SCENARIOS[scenario]
  const value = sc.months[months] ?? sc.reduction

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{t('simulationTitle')}</h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>Rehearsing futures in a digital sandbox — god's-eye trajectory projection</p>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: 5, fontSize: 10, fontFamily: 'var(--font-mono)',
          background: 'rgba(255,183,77,0.1)', color: 'var(--amber)', border: '1px solid rgba(255,183,77,0.25)',
        }}>{t('simulationMode')}</span>
      </div>

      <Card title="Select Treatment Scenario">
        {/* Scenario buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {Object.entries(SCENARIOS).map(([key, sc]) => (
            <button key={key} onClick={() => setScenario(key)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
              background: scenario === key ? `${sc.color}18` : 'var(--surface2)',
              border: `1px solid ${scenario === key ? sc.color + '60' : 'var(--border)'}`,
              color: scenario === key ? sc.color : 'var(--text3)',
              fontSize: 12, fontFamily: 'var(--font-mono)', transition: 'all 0.18s',
            }}>
              <div style={{ fontWeight: 700 }}>{key}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>{sc.label}</div>
            </button>
          ))}
        </div>

        {/* Month slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{t('projectionHorizon')}</span>
          <input type="range" min={3} max={12} step={3} value={months}
            onChange={e => setMonths(Number(e.target.value))}
            style={{ flex: 1, accentColor: sc.color }} />
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: sc.color, minWidth: 36 }}>{months} mo</span>
        </div>

        {/* Result display */}
        <div style={{
          height: 110, background: 'rgba(0,0,0,0.4)', borderRadius: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{ fontSize: 44, fontWeight: 800, fontFamily: 'var(--font-mono)', color: sc.color, lineHeight: 1 }}>
            {value}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {scenario === 'A' ? 'Estimated lesion growth risk' : 'Estimated lesion reduction'} · Scenario {scenario} · {months} months
          </div>
        </div>
      </Card>

      {/* Scenario comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {Object.entries(SCENARIOS).map(([key, s]) => (
          <div key={key} style={{
            background: scenario === key ? `${s.color}0d` : 'var(--surface)',
            border: `1px solid ${scenario === key ? s.color + '40' : 'var(--border)'}`,
            borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.18s',
          }} onClick={() => setScenario(key)}>
            <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>SCENARIO {key}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.months[6]}%</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{s.label} · 6mo</div>
          </div>
        ))}
      </div>

      {/* Treatment roadmap */}
      <Card title="{t('treatmentRoadmap')} · Scenario B">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {ROADMAP.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < ROADMAP.length - 1 ? 0 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: step.color, marginTop: 14, flexShrink: 0 }} />
                {i < ROADMAP.length - 1 && <div style={{ flex: 1, width: 1, background: 'var(--border)', minHeight: 24, margin: '4px 0' }} />}
              </div>
              <div style={{ padding: '10px 0', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{step.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <NavButtons onNext={onNext} nextLabel={nextLabel || t('submitConsensus')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
