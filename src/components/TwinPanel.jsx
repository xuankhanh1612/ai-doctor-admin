import React, { useEffect, useState } from 'react'
import { PATIENT } from '../data/mockData.js'

const Card = ({ title, children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

const MetricBox = ({ value, label, color }) => (
  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
    <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>{label}</div>
  </div>
)

const BiometricBar = ({ label, value, color }) => (
  <div style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--text3)', width: 110, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${value}%`, height: '100%', background: color, borderRadius: 2,
          animation: 'grow-bar 1.2s ease both',
        }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color, width: 36, textAlign: 'right' }}>{value}%</span>
    </div>
  </div>
)

export default function TwinPanel({ onNext }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const target = 1247
    const step = Math.ceil(target / 60)
    const timer = setInterval(() => {
      setCount(c => {
        if (c + step >= target) { clearInterval(timer); return target }
        return c + step
      })
    }, 30)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Medical Digital Twin</h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>High-fidelity parallel world model — swarm agents initialized</p>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: 5, fontSize: 10, fontFamily: 'var(--font-mono)',
          background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.25)',
        }}>TWIN ACTIVE</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <MetricBox value={count.toLocaleString()} label="Active agents"      color="var(--cyan)"   />
        <MetricBox value="94%"                    label="Twin fidelity"       color="var(--green)"  />
        <MetricBox value="483"                    label="Interactions / sec"  color="var(--violet)" />
        <MetricBox value="71%"                    label="Reality match score" color="var(--amber)"  />
      </div>

      <Card title="Biological Visualization · Cell Model">
        <div style={{
          height: 140, background: 'rgba(0,0,0,0.4)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, overflow: 'hidden', position: 'relative',
        }}>
          {/* Animated rings */}
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            {[50, 36, 22].map((r, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${50 - r}%`, left: `${50 - r}%`,
                width: `${r * 2}%`, height: `${r * 2}%`,
                borderRadius: '50%',
                border: `1px solid ${['rgba(0,229,255,0.3)','rgba(156,111,255,0.3)','rgba(0,229,255,0.6)'][i]}`,
                animation: `spin ${[8,5,3][i]}s linear infinite ${i % 2 === 1 ? 'reverse' : ''}`,
              }} />
            ))}
            {/* Satellites */}
            {[
              { top: '20%', left: '15%', color: 'var(--red)',    label: 'Ca+' },
              { top: '65%', left: '70%', color: 'var(--green)',  label: 'T-cell' },
              { top: '18%', left: '62%', color: 'var(--amber)', label: 'Drug' },
            ].map((s, i) => (
              <div key={i} style={{ position: 'absolute', top: s.top, left: s.left }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, opacity: 0.8 }} />
              </div>
            ))}
          </div>
          <div>
            {[
              { label: 'Tumor cell', status: 'mutating',   color: 'var(--red)'    },
              { label: 'T-cells',    status: 'responding', color: 'var(--green)'  },
              { label: 'Drug molecules', status: 'binding', color: 'var(--cyan)'  },
              { label: 'Fibroblasts', status: 'active',    color: 'var(--amber)'  },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>{item.label} · <span style={{ color: item.color }}>{item.status}</span></span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Body Composition Index">
        <BiometricBar label="Liver fat"       value={PATIENT.biomarkers.liverFat}      color="var(--amber)"  />
        <BiometricBar label="Lung capacity"   value={PATIENT.biomarkers.lungCapacity}  color="var(--cyan)"   />
        <BiometricBar label="Immune score"    value={PATIENT.biomarkers.immuneScore}   color="var(--green)"  />
        <BiometricBar label="Drug response"   value={PATIENT.biomarkers.drugResponse}  color="var(--violet)" />
      </Card>

      <button onClick={onNext} style={{
        padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
        background: 'linear-gradient(135deg, var(--cyan2), var(--violet2))',
        color: '#fff', fontSize: 13, fontWeight: 600,
        border: 'none', fontFamily: 'var(--font-display)', alignSelf: 'flex-start',
      }}>Run Treatment Simulations →</button>
    </div>
  )
}
