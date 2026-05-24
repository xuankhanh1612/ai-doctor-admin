import React from 'react'
import { PATIENT } from '../data/mockData.js'
import { useApp } from '../context/AppContext'
import NavButtons from './NavButtons.jsx'

const Tag = ({ children, color = 'cyan' }) => {
  const colors = {
    cyan:   { bg: 'rgba(0,229,255,0.1)',   color: 'var(--cyan)',   border: 'rgba(0,229,255,0.2)'   },
    violet: { bg: 'rgba(156,111,255,0.1)', color: 'var(--violet)', border: 'rgba(156,111,255,0.2)' },
    green:  { bg: 'rgba(0,230,118,0.1)',   color: 'var(--green)',  border: 'rgba(0,230,118,0.2)'   },
    amber:  { bg: 'rgba(255,183,77,0.1)',  color: 'var(--amber)',  border: 'rgba(255,183,77,0.2)'  },
    red:    { bg: 'rgba(255,82,82,0.1)',   color: 'var(--red)',    border: 'rgba(255,82,82,0.2)'   },
  }
  const c = colors[color]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 11px',
      borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>{children}</span>
  )
}

const Row = ({ k, v, vColor }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: '1px solid var(--border)',
  }}>
    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{k}</span>
    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, color: vColor || 'var(--cyan)' }}>{v}</span>
  </div>
)

const Card = ({ title, children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

export default function CheckinPanel({ onNext, onPrev, prevLabel }) {
  const { t } = useApp()
  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{t('checkinTitle')}</h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>Seed data extraction for digital twin construction</p>
        </div>
        <Tag color="violet">{t('seedCollection')}</Tag>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title={t('personalHistory')}>
          <Row k={t('name')}     v={PATIENT.name} />
          <Row k="Age"           v={PATIENT.age} />
          <Row k="Location"      v={PATIENT.location} />
          <Row k="Smoker"        v={PATIENT.smoker} vColor="var(--amber)" />
          <Row k="Exercise"      v={PATIENT.exercise} vColor="var(--green)" />
          <Row k="BMI"           v={PATIENT.bmi} />
        </Card>
        <Card title={t('familyHistory')}>
          <Row k={t('relation_father')}  v={PATIENT.familyHistory.father}  vColor="var(--red)" />
          <Row k={t('relation_mother')}  v={PATIENT.familyHistory.mother}  vColor="var(--amber)" />
          <Row k={t('relation_sibling')} v={PATIENT.familyHistory.sibling} vColor="var(--green)" />
          <Row k="BRCA"    v={PATIENT.genomics.brca}         vColor="var(--green)" />
          <Row k="EGFR"    v={PATIENT.genomics.egfr}         vColor="var(--red)" />
          <Row k="T790M"   v={PATIENT.genomics.t790m}        vColor="var(--amber)" />
        </Card>
      </div>

      <Card title={t('currentSymptoms')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {PATIENT.symptoms.map(s => (
            <Tag key={s} color={s.includes('cough') ? 'red' : 'amber'}>{s}</Tag>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          Duration: {PATIENT.symptomDuration} · Severity: {PATIENT.symptomSeverity}
        </div>
      </Card>

      <Card title={t('envSignals')}>
        {[
          { icon: '📍', text: `HCMC Air Quality Index: ${PATIENT.aqi} · Unhealthy for Sensitive Groups`, color: 'var(--amber)' },
          { icon: '📰', text: 'New EGFR inhibitor trial results — Nature Medicine, May 2026', color: 'var(--cyan)' },
          { icon: '💊', text: PATIENT.currentDrug, color: 'var(--green)' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
            }}>{item.icon}</div>
            <span style={{ fontSize: 12, color: item.color }}>{item.text}</span>
          </div>
        ))}
      </Card>

      <NavButtons onNext={onNext} nextLabel={t('buildTwin')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
