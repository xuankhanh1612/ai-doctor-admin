import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

// ─── API — Consensus Engine (https://ai-doctor-engine.vercel.app) ──────────
const API_BASE =
  import.meta.env.VITE_CONSENSUS_API_URL || 'https://ai-doctor-engine.vercel.app'

// ─── Patient demo data ────────────────────────────────────────────────────
const DEMO_PATIENT = {
  id: 'NTH-002', name: 'Nguyễn Thị Hồng', age: 55, gender: 'F',
  dob: '1969-03-12', blood_type: 'A+', avatar_initials: 'NH',
  diseases: [
    { id: 'd1', name: 'Ung thư gan di căn',  icd10: 'C22.0', onset: '2023-08', stage: 'IV', severity: 'critical', primary_unknown: true },
    { id: 'd2', name: 'Xơ gan Child-Pugh A', icd10: 'K74.6', onset: '2021-02', severity: 'moderate' },
    { id: 'd3', name: 'Viêm gan B mãn tính', icd10: 'B18.1', onset: '2009-00', severity: 'mild' },
  ],
  symptoms: [
    { id: 's1', name: 'Đau hạ sườn phải',  severity: 7, onset: '2023-07', active: true  },
    { id: 's2', name: 'Vàng da',            severity: 5, onset: '2023-10', active: true  },
    { id: 's3', name: 'Mệt mỏi kéo dài',   severity: 8, onset: '2023-06', active: true  },
    { id: 's4', name: 'Chán ăn, sụt cân',  severity: 6, onset: '2023-08', active: true  },
    { id: 's5', name: 'Sốt nhẹ về chiều',  severity: 4, onset: '2023-11', active: false },
  ],
  labs: [
    { id: 'l1', name: 'AFP',       value: 1840, unit: 'ng/mL', ref_high: 10,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l2', name: 'ALT',       value: 142,  unit: 'U/L',   ref_high: 56,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l3', name: 'AST',       value: 187,  unit: 'U/L',   ref_high: 40,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l4', name: 'Bilirubin', value: 3.2,  unit: 'mg/dL', ref_high: 1.2,  date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l5', name: 'CEA',       value: 28,   unit: 'ng/mL', ref_high: 5,    date: '2024-01-10', trend: 'stable', critical: false },
    { id: 'l6', name: 'CA 19-9',   value: 980,  unit: 'U/mL',  ref_high: 37,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l7', name: 'Hb',        value: 10.2, unit: 'g/dL',  ref_high: 16,   date: '2024-01-10', trend: 'down',   critical: false },
  ],
  imaging: [
    { id: 'i1', type: 'MRI Gan',      date: '2024-01-15', modality: 'MRI', ai_confidence: 91,
      findings: 'Khối u thuỳ phải 7.8×6.2cm. 3 tổn thương vệ tinh <2cm.',
      impression: 'HCC T3N0M0 — cần xác nhận ổ nguyên phát ngoài gan' },
    { id: 'i2', type: 'CT Ngực',      date: '2023-12-20', modality: 'CT',  ai_confidence: 78,
      findings: 'Hạch trung thất 1.2cm.',
      impression: 'Theo dõi hạch — chưa loại trừ di căn phổi' },
    { id: 'i3', type: 'Siêu âm Bụng', date: '2023-08-05', modality: 'US',  ai_confidence: 85,
      findings: 'Gan to 18cm. Khối 5.1cm thuỳ phải.',
      impression: 'Phù hợp HCC trên nền xơ gan' },
  ],
  medications: [
    { id: 'm1', name: 'Sorafenib',      dose: '400mg', frequency: '2×/ngày', route: 'PO', start: '2023-09', status: 'active',    category: 'targeted'  },
    { id: 'm2', name: 'Entecavir',      dose: '0.5mg', frequency: '1×/ngày', route: 'PO', start: '2020-03', status: 'active',    category: 'antiviral' },
    { id: 'm3', name: 'Furosemide',     dose: '40mg',  frequency: '1×/ngày', route: 'PO', start: '2023-12', status: 'active',    category: 'diuretic'  },
    { id: 'm4', name: 'TACE (Doxo)',    dose: '50mg',  frequency: '1 đợt',   route: 'IA', start: '2023-10', status: 'completed', category: 'chemo'     },
  ],
  allergies: [
    { id: 'a1', substance: 'Penicillin', reaction: 'Mề đay toàn thân',    severity: 'severe',   verified: true  },
    { id: 'a2', substance: 'Ibuprofen',  reaction: 'Xuất huyết tiêu hoá', severity: 'moderate', verified: true  },
  ],
  genomics: [
    { id: 'g1', gene: 'TP53',   variant: 'R248W',           effect: 'Gain-of-function', clinical_sig: 'Pathogenic',        vaf: 0.42 },
    { id: 'g2', gene: 'CTNNB1', variant: 'S45F',            effect: 'Activating',        clinical_sig: 'Likely Pathogenic', vaf: 0.31 },
    { id: 'g3', gene: 'TERT',   variant: 'C228T (promoter)',effect: 'Expression up',     clinical_sig: 'Pathogenic',        vaf: 0.58 },
  ],
  timeline: [
    { id: 't1', date: '2009',       event: 'Phát hiện viêm gan B mãn tính',         type: 'diagnosis' },
    { id: 't2', date: '2021-02',    event: 'Chẩn đoán xơ gan Child-Pugh A',         type: 'diagnosis', severity: 'moderate' },
    { id: 't3', date: '2023-09',    event: 'Chẩn đoán HCC, bắt đầu Sorafenib',     type: 'treatment' },
    { id: 't4', date: '2023-10',    event: 'TACE lần 1 — đáp ứng một phần',         type: 'procedure' },
    { id: 't5', date: '2024-01-10', event: 'AFP 1840 ng/mL, CA19-9 980 U/mL',       type: 'lab',       severity: 'critical' },
    { id: 't6', date: '2024-01-15', event: 'MRI: khối u 7.8cm, 3 vệ tinh',         type: 'imaging',   severity: 'critical' },
    { id: 't7', date: '2024-01-18', event: 'Hội chẩn — đề xuất PET-CT toàn thân',   type: 'consult' },
  ],
  risk_factors: [
    { id: 'r1', name: 'Viêm gan B mãn tính (HBsAg+)',         weight: 95, category: 'viral'     },
    { id: 'r2', name: 'Xơ gan nền',                           weight: 88, category: 'structural' },
    { id: 'r3', name: 'AFP liên tục tăng cao',                weight: 82, category: 'biomarker'  },
    { id: 'r4', name: 'TP53 R248W pathogenic',                weight: 78, category: 'genomic'    },
    { id: 'r5', name: 'TERT promoter mutation',               weight: 74, category: 'genomic'    },
    { id: 'r6', name: 'Tiền sử gia đình: cha ung thư dạ dày', weight: 65, category: 'genetic'    },
  ],
}

// ─── Build consensus payload from patient data ────────────────────────────
function buildConsensusPayload(patient) {
  const labConfidence = () => {
    const criticals = (patient.labs || []).filter(l => l.critical).length
    return Math.min(0.60 + criticals * 0.06, 0.97)
  }
  const imagingConfidence = () => {
    const avg = (patient.imaging || []).reduce((s, i) => s + i.ai_confidence, 0) / ((patient.imaging || []).length || 1)
    return avg / 100
  }
  const genomicsConfidence = () => {
    const pathogenic = (patient.genomics || []).filter(g => g.clinical_sig?.includes('Pathogenic')).length
    return Math.min(0.55 + pathogenic * 0.1, 0.95)
  }
  const symptomsConfidence = () => {
    const active = (patient.symptoms || []).filter(s => s.active)
    const avgSev = active.reduce((s, x) => s + x.severity, 0) / (active.length || 1)
    return Math.min(0.4 + avgSev * 0.05, 0.90)
  }
  const criticalDisease = (patient.diseases || []).find(d => d.severity === 'critical')
  const mainDiagnosis = criticalDisease?.name || (patient.diseases?.[0]?.name) || 'Unknown'
  const mainICD = criticalDisease?.icd10 || (patient.diseases?.[0]?.icd10) || 'Z00.0'

  return {
    patient_id: patient.id,
    session_id: `SESS-${Date.now()}`,
    method: 'bayesian',
    run_all: true,
    predictions: [
      { agent_id: 'lab-agent-v2',      specialty: 'lab',       diagnosis: mainDiagnosis, confidence: labConfidence(),       icd10_code: mainICD },
      { agent_id: 'radiology-agent-v2',specialty: 'radiology', diagnosis: mainDiagnosis, confidence: imagingConfidence(),   icd10_code: mainICD },
      { agent_id: 'oncology-agent-v1', specialty: 'oncology',  diagnosis: mainDiagnosis, confidence: genomicsConfidence(),  icd10_code: mainICD },
      { agent_id: 'pathology-agent-v1',specialty: 'pathology', diagnosis: mainDiagnosis, confidence: symptomsConfidence(),  icd10_code: mainICD },
    ],
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const SEV_COLOR = s => ({ critical: 'var(--red)', severe: 'var(--red)', moderate: 'var(--amber)', mild: 'var(--green)' }[s] || 'var(--text3)')
const TREND_ICON = t => ({ up: '↑', down: '↓', stable: '→' }[t] || '')
const TYPE_COLOR = t => ({ diagnosis: 'var(--red)', treatment: 'var(--cyan)', imaging: 'var(--violet)', lab: 'var(--amber)', procedure: 'var(--green)', consult: 'var(--pink)' }[t] || 'var(--text3)')
const MOD_COLOR  = m => ({ MRI: 'var(--violet)', CT: 'var(--cyan)', US: 'var(--amber)' }[m] || 'var(--text2)')
const CAT_COLOR  = c => ({ viral: 'var(--amber)', structural: 'var(--red)', genetic: 'var(--violet)', genomic: '#e8c97a', biomarker: 'var(--cyan)', demographic: 'var(--text2)' }[c] || 'var(--text3)')
const MED_COLOR  = c => ({ targeted: 'var(--violet)', antiviral: 'var(--cyan)', diuretic: 'var(--green)', chemo: 'var(--red)', ppi: 'var(--text2)' }[c] || 'var(--text2)')
const RISK_COLOR = w => w >= 80 ? 'var(--red)' : w >= 60 ? 'var(--amber)' : w >= 40 ? 'var(--violet)' : 'var(--text3)'
const labRatio = l => l.ref_high == null ? null : Math.min(Math.max(l.value / l.ref_high, 0), 5)
const labColor = l => { const r = labRatio(l); if (!r) return 'var(--text3)'; return r > 2 ? 'var(--red)' : r > 1.1 ? 'var(--amber)' : r < 0.5 ? 'var(--cyan)' : 'var(--green)' }

const Tag = ({ children, color = 'var(--cyan)', small }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: small ? '1px 6px' : '2px 8px', borderRadius: 4,
    fontSize: small ? 9 : 10, fontFamily: 'var(--font-mono)', letterSpacing: '.05em',
    background: color + '20', color, border: `1px solid ${color}35`, whiteSpace: 'nowrap',
  }}>{children}</span>
)

const BarLine = ({ value, max = 100, color = 'var(--cyan)', height = 3 }) => (
  <div style={{ flex: 1, height, background: 'var(--surface2)', borderRadius: height }}>
    <div style={{ height: '100%', width: `${Math.min((value / max) * 100, 100)}%`, background: color, borderRadius: height, transition: 'width 0.8s ease' }} />
  </div>
)

// ─── Section renderers ────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'diseases',     label: 'Diseases',     icon: '🦠', color: 'var(--red)'    },
  { id: 'symptoms',     label: 'Symptoms',     icon: '🌡', color: 'var(--amber)'  },
  { id: 'labs',         label: 'Labs',         icon: '🧪', color: 'var(--cyan)'   },
  { id: 'imaging',      label: 'Imaging',      icon: '🏥', color: 'var(--violet)' },
  { id: 'medications',  label: 'Medications',  icon: '💊', color: 'var(--green)'  },
  { id: 'allergies',    label: 'Allergies',    icon: '⚠️', color: 'var(--pink)'   },
  { id: 'genomics',     label: 'Genomics',     icon: '🧬', color: '#e8c97a'       },
  { id: 'timeline',     label: 'Timeline',     icon: '📅', color: 'var(--text2)'  },
  { id: 'risk_factors', label: 'Risk Factors', icon: '📊', color: 'var(--amber)'  },
]

function renderSection(id, data) {
  if (!data?.length) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Không có dữ liệu</div>

  if (id === 'diseases') return data.map(d => (
    <div key={d.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR(d.severity), flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</span>
        {d.primary_unknown && <Tag color="var(--red)" small>PRIMARY UNKNOWN</Tag>}
        {d.stage && <Tag color="var(--amber)" small>Stage {d.stage}</Tag>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 15 }}>
        <Tag color="var(--text3)" small>{d.icd10}</Tag>
        <Tag color={SEV_COLOR(d.severity)} small>{d.severity?.toUpperCase()}</Tag>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Onset: {d.onset}</span>
      </div>
    </div>
  ))

  if (id === 'symptoms') return data.map(s => (
    <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{s.name}</span>
        <Tag color={s.active ? 'var(--green)' : 'var(--text3)'} small>{s.active ? 'ACTIVE' : 'RESOLVED'}</Tag>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{s.onset}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, color: 'var(--text3)', width: 50, fontFamily: 'var(--font-mono)' }}>Severity</span>
        <BarLine value={s.severity} max={10} color={s.severity >= 7 ? 'var(--red)' : s.severity >= 5 ? 'var(--amber)' : 'var(--green)'} />
        <span style={{ fontSize: 10, color: s.severity >= 7 ? 'var(--red)' : 'var(--text2)', fontFamily: 'var(--font-mono)', width: 28 }}>{s.severity}/10</span>
      </div>
    </div>
  ))

  if (id === 'labs') return data.map(l => {
    const ratio = labRatio(l)
    const bc = labColor(l)
    const pct = ratio != null ? Math.min((ratio / 4) * 100, 100) : null
    return (
      <div key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', borderLeft: ratio > 1.1 ? `2px solid ${bc}` : '2px solid transparent', paddingLeft: ratio > 1.1 ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pct ? 5 : 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', flex: 1 }}>{l.name}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: bc }}>{l.value}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{l.unit}</span>
          <span style={{ fontSize: 12, color: bc }}>{TREND_ICON(l.trend)}</span>
          {l.critical && <Tag color="var(--red)" small>!</Tag>}
          <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{l.date}</span>
        </div>
        {pct != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', width: 56 }}>ref ≤{l.ref_high}</span>
            <BarLine value={pct} color={bc} />
          </div>
        )}
      </div>
    )
  })

  if (id === 'imaging') return <ImagingView data={data} />

  if (id === 'medications') return data.map(m => (
    <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${m.status === 'active' ? MED_COLOR(m.category) : 'var(--border2)'}`, paddingLeft: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{m.name}</span>
        <Tag color={MED_COLOR(m.category)} small>{m.category?.toUpperCase()}</Tag>
        <Tag color={m.status === 'active' ? 'var(--green)' : 'var(--text3)'} small>{m.status?.toUpperCase()}</Tag>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{m.dose} · {m.frequency} · {m.route} · từ {m.start}</div>
    </div>
  ))

  if (id === 'allergies') return data.map(a => (
    <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{a.substance}</span>
          <Tag color={SEV_COLOR(a.severity)} small>{a.severity?.toUpperCase()}</Tag>
          {a.verified && <Tag color="var(--green)" small>VERIFIED</Tag>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{a.reaction}</div>
      </div>
    </div>
  ))

  if (id === 'genomics') return data.map(g => {
    const sc = g.clinical_sig === 'Pathogenic' ? 'var(--red)' : g.clinical_sig === 'Likely Pathogenic' ? 'var(--amber)' : 'var(--text3)'
    return (
      <div key={g.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e8c97a', fontFamily: 'var(--font-mono)' }}>{g.gene}</span>
          <Tag color="var(--text2)" small>{g.variant}</Tag>
          <Tag color={sc} small>{g.clinical_sig}</Tag>
          {g.vaf != null && <Tag color="var(--violet)" small>VAF {(g.vaf*100).toFixed(0)}%</Tag>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: g.vaf ? 6 : 0 }}>Effect: <span style={{ color: 'var(--text)' }}>{g.effect}</span></div>
        {g.vaf != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', width: 28 }}>VAF</span>
            <BarLine value={g.vaf * 100} color="#e8c97a" />
            <span style={{ fontSize: 10, color: '#e8c97a', fontFamily: 'var(--font-mono)', width: 30 }}>{(g.vaf*100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    )
  })

  if (id === 'timeline') return (
    <div style={{ position: 'relative', paddingLeft: 22 }}>
      <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 1, background: 'var(--border2)' }} />
      {[...data].reverse().map((item, i) => (
        <div key={item.id} style={{ position: 'relative', marginBottom: i < data.length-1 ? 12 : 0 }}>
          <div style={{ position: 'absolute', left: -18, top: 5, width: 8, height: 8, borderRadius: '50%', background: TYPE_COLOR(item.type), boxShadow: item.severity === 'critical' ? '0 0 8px var(--red)' : 'none' }} />
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: TYPE_COLOR(item.type) }}>{item.date}</span>
              <Tag color={TYPE_COLOR(item.type)} small>{item.type?.toUpperCase()}</Tag>
              {item.severity === 'critical' && <Tag color="var(--red)" small>CRITICAL</Tag>}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>{item.event}</div>
          </div>
        </div>
      ))}
    </div>
  )

  if (id === 'risk_factors') return [...data].sort((a,b) => b.weight-a.weight).map((r, i) => (
    <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', width: 20 }}>#{i+1}</span>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{r.name}</span>
        <Tag color={CAT_COLOR(r.category)} small>{r.category}</Tag>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 28 }}>
        <BarLine value={r.weight} color={RISK_COLOR(r.weight)} height={4} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, width: 32, textAlign: 'right', color: RISK_COLOR(r.weight) }}>{r.weight}%</span>
      </div>
    </div>
  ))

  return null
}

function ImagingView({ data }) {
  const [expanded, setExpanded] = useState(null)
  return data.map(img => {
    const mc = MOD_COLOR(img.modality)
    const isOpen = expanded === img.id
    return (
      <div key={img.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }} onClick={() => setExpanded(isOpen ? null : img.id)}>
          <Tag color={mc}>{img.modality}</Tag>
          <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{img.type}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{img.date}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isOpen ? 10 : 0 }}>
          <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>AI</span>
          <BarLine value={img.ai_confidence} color={mc} />
          <span style={{ fontSize: 10, color: mc, fontFamily: 'var(--font-mono)' }}>{img.ai_confidence}%</span>
        </div>
        {isOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ScanSVG modality={img.modality} color={mc} />
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
              <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 2 }}>FINDINGS</span>
              {img.findings}
            </div>
            <div style={{ background: mc + '10', border: `1px solid ${mc}25`, borderRadius: 8, padding: '9px 12px' }}>
              <span style={{ fontSize: 9, color: mc, fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 3 }}>IMPRESSION</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{img.impression}</span>
            </div>
          </div>
        )}
      </div>
    )
  })
}

function ScanSVG({ modality, color }) {
  const W = 500, H = 110
  if (modality === 'MRI') return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ borderRadius: 8, background: '#060a14', display: 'block' }}>
      <rect width={W} height={H} fill="#060a14"/>
      {[0.25,0.5,0.75].map(f=><line key={f} x1={W*f} y1={0} x2={W*f} y2={H} stroke={color+'10'} strokeWidth="0.5"/>)}
      <ellipse cx="260" cy="55" rx="130" ry="44" fill="none" stroke={color+'30'} strokeWidth="1"/>
      <circle cx="300" cy="47" r="28" fill={color+'22'} stroke={color} strokeWidth="1.5"/>
      <circle cx="270" cy="33" r="6" fill={color+'28'} stroke={color+'70'} strokeWidth="1"/>
      <circle cx="322" cy="68" r="5" fill={color+'28'} stroke={color+'70'} strokeWidth="1"/>
      <text x="300" y="47" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="9" fontFamily="monospace" fontWeight="700">7.8cm</text>
      <text x="12" y="18" fill={color+'80'} fontSize="9" fontFamily="monospace">MRI T1 · Liver · Axial · 2024-01-15</text>
    </svg>
  )
  if (modality === 'CT') return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ borderRadius: 8, background: '#050a12', display: 'block' }}>
      <rect width={W} height={H} fill="#050a12"/>
      {Array.from({length:14}).map((_,i)=><line key={i} x1={i*37} y1={0} x2={i*37} y2={H} stroke={color+'08'} strokeWidth="0.5"/>)}
      <ellipse cx="250" cy="55" rx="210" ry="44" fill="none" stroke={color+'20'} strokeWidth="1"/>
      <ellipse cx="185" cy="47" rx="22" ry="18" fill={color+'18'} stroke={color+'60'} strokeWidth="1"/>
      <text x="185" y="47" textAnchor="middle" dominantBaseline="central" fill={color+'90'} fontSize="8" fontFamily="monospace">1.2cm</text>
      <text x="12" y="18" fill={color+'80'} fontSize="9" fontFamily="monospace">CT Chest · 2023-12-20</text>
    </svg>
  )
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ borderRadius: 8, background: '#050912', display: 'block' }}>
      <rect width={W} height={H} fill="#050912"/>
      {Array.from({length:12}).map((_,i)=><ellipse key={i} cx="250" cy="55" rx={20+i*18} ry={10+i*7} fill="none" stroke={color+(i%2===0?'15':'08')} strokeWidth="0.5"/>)}
      <circle cx="295" cy="48" r="18" fill={color+'20'} stroke={color} strokeWidth="1"/>
      <text x="295" y="48" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="8" fontFamily="monospace">5.1cm</text>
      <text x="12" y="18" fill={color+'80'} fontSize="9" fontFamily="monospace">US Abdomen · Liver RUQ · 2023-08-05</text>
    </svg>
  )
}

// ─── Consensus result card ─────────────────────────────────────────────────
function ConsensusCard({ result, method, color }) {
  if (!result) return null
  const conf = result.fused_confidence || 0
  const agree = result.agreement_score || 0
  const riskColors = { low: 'var(--green)', moderate: 'var(--amber)', high: 'var(--amber)', critical: 'var(--red)' }
  return (
    <div style={{ background: color + '08', border: `1px solid ${color}30`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Tag color={color}>{method.toUpperCase()}</Tag>
        <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{result.diagnosis}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>CONFIDENCE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{(conf * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>AGREEMENT</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{(agree * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>RISK</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: riskColors[result.risk_level] || 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{(result.risk_level || '—').toUpperCase()}</div>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <BarLine value={conf * 100} color={color} height={4} />
      </div>
      {result.recommendation && (
        <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>{result.recommendation}</div>
      )}
      {result.requires_doctor_review && (
        <div style={{ marginTop: 8 }}>
          <Tag color="var(--red)" small>⚕ REQUIRES DOCTOR REVIEW</Tag>
        </div>
      )}
      {result.agent_weights?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>AGENT WEIGHTS</div>
          {result.agent_weights.map(aw => (
            <div key={aw.agent_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: 'var(--text2)', width: 110, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aw.agent_id}</span>
              <BarLine value={(aw.confidence || 0) * 100} color={color} />
              <span style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', width: 34, textAlign: 'right' }}>{((aw.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────
const METHOD_COLORS = { bayesian: 'var(--cyan)', weighted: 'var(--violet)', majority: 'var(--green)', graph: 'var(--amber)' }

export default function PatientRecordPanel({ onNext, selectedMember }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'

  const [patient, setPatient]             = useState(selectedMember || DEMO_PATIENT)

  // When a family member is passed in, switch to their data
  useEffect(() => {
    if (selectedMember) {
      setPatient(selectedMember)
      setSection('diseases')
      setConsensusData(null)
      setCError('')
      setShowConsensus(false)
    }
  }, [selectedMember])
  const [activeSection, setSection]       = useState('diseases')
  const [consensusData, setConsensusData] = useState(null)
  const [consensusLoading, setCLoading]   = useState(false)
  const [consensusError, setCError]       = useState('')
  const [activeMethod, setActiveMethod]   = useState('bayesian')
  const [showConsensus, setShowConsensus] = useState(false)
  const isFromFamily = !!(selectedMember)

  const surfaceBg = isDark ? 'var(--bg2)' : '#ffffff'
  const borderCol = isDark ? 'var(--border)' : 'rgba(0,0,0,0.08)'
  const text2     = isDark ? 'var(--text2)' : '#555'
  const text3     = isDark ? 'var(--text3)' : '#aaa'

  // Run consensus analysis
  async function runConsensus() {
    setCLoading(true); setCError(''); setShowConsensus(true)
    try {
      const payload = buildConsensusPayload(patient)
      const res = await fetch(`${API_BASE}/api/v1/consensus/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`HTTP ${res.status}: ${err.detail || err.message || 'API error'}`)
      }
      const data = await res.json()
      setConsensusData(data)
      setActiveMethod('bayesian')
    } catch (e) {
      setCError(e.message)
    } finally {
      setCLoading(false)
    }
  }

  const sec = SECTIONS.find(s => s.id === activeSection)
  const sectionData = patient[activeSection] || []
  const criticalCount = (patient.labs || []).filter(l => l.critical).length + (patient.diseases || []).filter(d => d.severity === 'critical').length

  // Flatten all_results from compare response
  const allResults = consensusData?.all_results || {}
  const currentResult = allResults[activeMethod] || (consensusData?.result?.method === activeMethod ? consensusData.result : null)

  return (
    <div className="animate-fade" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Patient Record Visualizer</h2>
          <p style={{ color: text2, fontSize: 12 }}>AI Consensus Engine · {API_BASE}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runConsensus} disabled={consensusLoading} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: 'linear-gradient(135deg,var(--cyan2),var(--violet2))', color: '#fff', opacity: consensusLoading ? 0.7 : 1,
          }}>
            {consensusLoading ? '⟳ Đang chạy…' : '🤖 Run Consensus'}
          </button>
          {onNext && (
            <button onClick={onNext} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface)', color: text2, fontSize: 12, cursor: 'pointer' }}>
              Next →
            </button>
          )}
        </div>
      </div>

      {/* From-family banner */}
      {isFromFamily && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 16 }}>🌳</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cyan)' }}>
              Từ Gia phả
            </span>
            <span style={{ fontSize: 12, color: text2, marginLeft: 8 }}>
              Đang xem hồ sơ thành viên gia đình: <b>{patient.name}</b>
            </span>
          </div>
          <button
            onClick={() => { setPatient(DEMO_PATIENT); setConsensusData(null); setShowConsensus(false) }}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(0,229,255,0.3)',
              background: 'transparent', color: 'var(--cyan)', fontSize: 11,
              fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}
          >← Quay lại Cô Hồng</button>
        </div>
      )}

      {/* Patient card */}
      <div style={{ background: surfaceBg, border: '1px solid rgba(255,82,82,0.25)', borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,82,82,0.12)', border: '2px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>
            {patient.avatar_initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{patient.name}</h3>
              <Tag color="var(--red)">CRITICAL CASE</Tag>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[['ID', patient.id], ['Age', patient.age], ['Sex', patient.gender === 'F' ? 'Female' : 'Male'], ['Blood', patient.blood_type]].map(([l, v]) => (
                <div key={l} style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: text3 }}>{l}: </span><span style={{ color: 'var(--cyan)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--red)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{criticalCount}</div>
            <div style={{ fontSize: 9, color: text3, fontFamily: 'var(--font-mono)' }}>CRITICAL</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {SECTIONS.map(s => (
            <div key={s.id} onClick={() => setSection(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: s.color + '15', border: `1px solid ${s.color}25`, cursor: 'pointer' }}>
              <span style={{ fontSize: 11 }}>{s.icon}</span>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: s.color }}>{(patient[s.id] || []).length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Consensus result panel */}
      {showConsensus && (
        <div style={{ background: surfaceBg, border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${borderCol}` }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '.15em', color: 'var(--cyan)' }}>AI CONSENSUS ANALYSIS</span>
            {consensusLoading && <span style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', animation: 'spin 1s linear infinite' }}>⟳</span>}
            <button onClick={() => setShowConsensus(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: text3, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          {consensusError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,82,82,0.08)', color: 'var(--red)', fontSize: 12, border: '1px solid rgba(255,82,82,0.2)', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
              ⚠ {consensusError}
            </div>
          )}

          {!consensusLoading && consensusData && (
            <>
              {/* Method tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {Object.keys(METHOD_COLORS).map(m => {
                  const r = allResults[m]
                  const mc = METHOD_COLORS[m]
                  return (
                    <button key={m} onClick={() => setActiveMethod(m)} style={{
                      flex: '1 1 auto', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: activeMethod === m ? mc + '18' : 'var(--surface)',
                      color: activeMethod === m ? mc : text3, fontSize: 11,
                      fontFamily: 'var(--font-mono)', fontWeight: activeMethod === m ? 700 : 400,
                      outline: activeMethod === m ? `1px solid ${mc}35` : 'none',
                    }}>
                      {m.toUpperCase()}
                      {r && <span style={{ marginLeft: 6, fontSize: 10 }}>{(r.fused_confidence * 100).toFixed(0)}%</span>}
                    </button>
                  )
                })}
              </div>
              {currentResult && (
                <ConsensusCard result={currentResult} method={activeMethod} color={METHOD_COLORS[activeMethod]} />
              )}

              {/* Compare all methods bar chart */}
              {Object.keys(allResults).length > 1 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 9, color: text3, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>COMPARISON — ALL METHODS</div>
                  {Object.entries(allResults).map(([method, r]) => (
                    <div key={method} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: METHOD_COLORS[method], width: 70 }}>{method}</span>
                      <BarLine value={(r.fused_confidence || 0) * 100} color={METHOD_COLORS[method]} height={5} />
                      <span style={{ fontSize: 11, color: METHOD_COLORS[method], fontFamily: 'var(--font-mono)', fontWeight: 700, width: 38, textAlign: 'right' }}>
                        {((r.fused_confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {consensusLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
              {['Gửi predictions đến Consensus Engine…', 'Bayesian fusion đang tính toán…', 'So sánh 4 algorithms…'].map((msg, i) => (
                <div key={i} style={{ fontSize: 12, color: text2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)', animation: `pulse-dot ${1 + i * 0.3}s ease infinite` }} />
                  {msg}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: surfaceBg, border: `1px solid ${borderCol}`, borderRadius: 14, padding: 6 }}>
        {SECTIONS.map(s => {
          const isActive = activeSection === s.id
          return (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              flex: '1 1 auto', padding: '8px 6px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? s.color + '18' : 'transparent',
              color: isActive ? s.color : text3, fontSize: 11, fontFamily: 'var(--font-mono)',
              outline: isActive ? `1px solid ${s.color}30` : 'none', transition: 'all .15s',
            }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
              {s.label}
              <span style={{ marginLeft: 4, fontSize: 9, opacity: .55 }}>{(patient[s.id] || []).length}</span>
            </button>
          )
        })}
      </div>

      {/* Section content */}
      <div style={{ background: surfaceBg, border: `1px solid ${borderCol}`, borderRadius: 14, padding: 20, minHeight: 300 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${borderCol}` }}>
          <span style={{ fontSize: 18 }}>{sec?.icon}</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '.15em', textTransform: 'uppercase', color: sec?.color }}>{sec?.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: text3, fontFamily: 'var(--font-mono)' }}>{sectionData.length} items</span>
        </div>
        {renderSection(activeSection, sectionData)}
      </div>
    </div>
  )
}
