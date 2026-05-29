import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import NavButtons from './NavButtons.jsx'
import { useMedicalData, recordsToPatient } from '../hooks/useMedicalData.js'


const EMPTY_PATIENT = {
  id: 'NO-UPLOADS',
  name: 'Chưa có hồ sơ upload',
  age: '—',
  gender: '—',
  dob: '—',
  blood_type: '—',
  avatar_initials: 'UP',
  diseases: [{ id: 'empty', name: 'Upload hồ sơ để tạo bệnh án cá nhân', icd10: 'Z00.0', onset: '—', severity: 'mild' }],
  symptoms: [],
  labs: [],
  imaging: [],
  medications: [],
  allergies: [],
  genomics: [],
  risk_factors: [],
  timeline: [],
}

// ─── API — Consensus Engine (https://ai-doctor-engine.vercel.app) ──────────
const API_BASE =
  import.meta.env.VITE_CONSENSUS_API_URL || 'https://ai-doctor-engine.vercel.app'

// ─── Patient demo data ────────────────────────────────────────────────────
const DEMO_PATIENT = {
  id: 'LXK-2024',
  name: 'Lê Xuân Khánh',
  age: 47,
  gender: 'M',
  dob: '1977-04-10',
  blood_type: 'O+',
  avatar_initials: 'LK',

  // ── Diseases (từ hồ sơ bệnh án đầy đủ) ──────────────────────────────────
  diseases: [
    { id: 'd1', name: 'NSCLC · Stage IIA (Ung thư phổi không tế bào nhỏ)', icd10: 'C34.1', onset: '2022-06', stage: 'IIA', severity: 'critical', primary_unknown: false },
    { id: 'd2', name: 'Ung thư gan di căn (HCC T3N0M0)',                    icd10: 'C22.0', onset: '2023-08', stage: 'III', severity: 'critical', primary_unknown: false },
    { id: 'd3', name: 'Xơ gan Child-Pugh A',                               icd10: 'K74.6', onset: '2021-02', severity: 'moderate' },
    { id: 'd4', name: 'Viêm gan B mãn tính',                               icd10: 'B18.1', onset: '2009-00', severity: 'mild' },
  ],

  // ── Symptoms ──────────────────────────────────────────────────────────────
  symptoms: [
    { id: 's1', name: 'Ho kéo dài',           severity: 7, onset: '2022-05', active: true  },
    { id: 's2', name: 'Khó thở nhẹ',          severity: 5, onset: '2022-06', active: true  },
    { id: 's3', name: 'Đau hạ sườn phải',     severity: 7, onset: '2023-07', active: true  },
    { id: 's4', name: 'Mệt mỏi kéo dài',      severity: 8, onset: '2022-04', active: true  },
    { id: 's5', name: 'Chán ăn, sụt cân',     severity: 6, onset: '2023-08', active: true  },
    { id: 's6', name: 'Vàng da nhẹ',          severity: 4, onset: '2023-10', active: true  },
    { id: 's7', name: 'Đổ mồ hôi đêm',       severity: 4, onset: '2022-08', active: false },
  ],

  // ── Lab results (toàn bộ + adapt: bỏ các chỉ số đặc thù nữ giới) ────────
  labs: [
    { id: 'l1',  name: 'AFP',       value: 1840, unit: 'ng/mL', ref_high: 10,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l2',  name: 'CEA',       value: 28,   unit: 'ng/mL', ref_high: 5,    date: '2024-01-10', trend: 'stable', critical: false },
    { id: 'l3',  name: 'CA 19-9',   value: 980,  unit: 'U/mL',  ref_high: 37,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l4',  name: 'ALT',       value: 142,  unit: 'U/L',   ref_high: 56,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l5',  name: 'AST',       value: 187,  unit: 'U/L',   ref_high: 40,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l6',  name: 'Bilirubin', value: 3.2,  unit: 'mg/dL', ref_high: 1.2,  date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l7',  name: 'Hb',        value: 12.1, unit: 'g/dL',  ref_high: 17.5, date: '2024-01-10', trend: 'down',   critical: false },
    { id: 'l8',  name: 'ctDNA',     value: 0.8,  unit: '%',     ref_high: 0.1,  date: '2024-01-08', trend: 'up',     critical: true  },
    { id: 'l9',  name: 'CEA (phổi)',value: 18.4, unit: 'ng/mL', ref_high: 5,    date: '2024-01-08', trend: 'stable', critical: false },
    { id: 'l10', name: 'PSA',       value: 2.1,  unit: 'ng/mL', ref_high: 4.0,  date: '2024-01-08', trend: 'stable', critical: false },
  ],

  // ── Imaging ───────────────────────────────────────────────────────────────
  imaging: [
    { id: 'i1', type: 'MRI Gan',       date: '2024-01-15', modality: 'MRI', ai_confidence: 91,
      findings: 'Khối u thuỳ phải 7.8×6.2cm. 3 tổn thương vệ tinh <2cm.',
      impression: 'HCC T3N0M0 — di căn từ ổ phổi, cần PET-CT toàn thân xác nhận' },
    { id: 'i2', type: 'CT Ngực',       date: '2023-12-20', modality: 'CT',  ai_confidence: 92,
      findings: 'L1: khối 2.3cm thuỳ trên phải, giảm 18% so T-3Mo. L2: 1.1cm tăng 8%.',
      impression: 'NSCLC đáp ứng Erlotinib. L2 cần sinh thiết tuần 8' },
    { id: 'i3', type: 'CT Bụng',       date: '2023-12-20', modality: 'CT',  ai_confidence: 88,
      findings: 'Hạch trung thất 1.2cm. Gan: 3 tổn thương phù hợp di căn.',
      impression: 'Di căn gan từ NSCLC — theo dõi sát' },
    { id: 'i4', type: 'Siêu âm Bụng',  date: '2023-08-05', modality: 'US',  ai_confidence: 85,
      findings: 'Gan to 18cm. Khối 5.1cm thuỳ phải.',
      impression: 'Phù hợp HCC trên nền xơ gan' },
  ],

  // ── Medications ───────────────────────────────────────────────────────────
  medications: [
    { id: 'm1', name: 'Erlotinib',  dose: '150mg', frequency: '1×/ngày',   route: 'PO', start: '2022-09', status: 'active',    category: 'targeted'  },
    { id: 'm2', name: 'Sorafenib',  dose: '400mg', frequency: '2×/ngày',   route: 'PO', start: '2023-09', status: 'active',    category: 'targeted'  },
    { id: 'm3', name: 'Entecavir',  dose: '0.5mg', frequency: '1×/ngày',   route: 'PO', start: '2020-03', status: 'active',    category: 'antiviral' },
    { id: 'm4', name: 'Furosemide', dose: '40mg',  frequency: '1×/ngày',   route: 'PO', start: '2023-12', status: 'active',    category: 'diuretic'  },
    { id: 'm5', name: 'TACE (Doxo)',dose: '50mg',  frequency: '1 đợt',     route: 'IA', start: '2023-10', status: 'completed', category: 'chemo'     },
    { id: 'm6', name: 'Bevacizumab',dose: 'TBD',   frequency: 'Tuần 8 TBD',route: 'IV', start: 'pending', status: 'planned',   category: 'targeted'  },
  ],

  // ── Allergies ─────────────────────────────────────────────────────────────
  allergies: [
    { id: 'a1', substance: 'Penicillin', reaction: 'Mề đay toàn thân',    severity: 'severe',   verified: true  },
    { id: 'a2', substance: 'Ibuprofen',  reaction: 'Xuất huyết tiêu hoá', severity: 'moderate', verified: true  },
  ],

  // ── Genomics (NSCLC + HCC combined) ──────────────────────────────────────
  genomics: [
    { id: 'g1', gene: 'EGFR',   variant: 'Exon 19 del',     effect: 'TKI sensitive',      clinical_sig: 'Pathogenic',        vaf: 0.45 },
    { id: 'g2', gene: 'T790M',  variant: 'p.T790M (EGFR)',  effect: 'TKI resistance risk', clinical_sig: 'Pathogenic',        vaf: 0.08 },
    { id: 'g3', gene: 'TP53',   variant: 'R248W',           effect: 'Gain-of-function',   clinical_sig: 'Pathogenic',        vaf: 0.42 },
    { id: 'g4', gene: 'CTNNB1', variant: 'S45F',            effect: 'Activating',         clinical_sig: 'Likely Pathogenic', vaf: 0.31 },
    { id: 'g5', gene: 'TERT',   variant: 'C228T (promoter)',effect: 'Expression up',      clinical_sig: 'Pathogenic',        vaf: 0.58 },
    { id: 'g6', gene: 'KRAS',   variant: 'Wild-type',       effect: 'No KRAS resistance', clinical_sig: 'Benign',            vaf: null  },
  ],

  // ── Timeline (merged NSCLC + HCC) ────────────────────────────────────────
  timeline: [
    { id: 't1', date: '2009',       event: 'Phát hiện viêm gan B mãn tính',             type: 'diagnosis' },
    { id: 't2', date: '2021-02',    event: 'Chẩn đoán xơ gan Child-Pugh A',             type: 'diagnosis', severity: 'moderate' },
    { id: 't3', date: '2022-06',    event: 'Phát hiện NSCLC Stage IIA — EGFR Exon 19 del', type: 'diagnosis', severity: 'critical' },
    { id: 't4', date: '2022-09',    event: 'Bắt đầu Erlotinib 150mg · Cycle 1',         type: 'treatment' },
    { id: 't5', date: '2023-08',    event: 'Phát hiện tổn thương gan — nghi di căn',    type: 'diagnosis', severity: 'critical' },
    { id: 't6', date: '2023-09',    event: 'Bổ sung Sorafenib cho tổn thương gan',      type: 'treatment' },
    { id: 't7', date: '2023-10',    event: 'TACE lần 1 — đáp ứng một phần',             type: 'procedure' },
    { id: 't8', date: '2023-12-20', event: 'CT: L1 −18%, L2 +8% — theo dõi L2',        type: 'imaging' },
    { id: 't9', date: '2024-01-10', event: 'AFP 1840 ng/mL · CA19-9 980 U/mL · ALT↑',  type: 'lab', severity: 'critical' },
    { id: 't10',date: '2024-01-15', event: 'MRI: khối gan 7.8cm · 3 vệ tinh',           type: 'imaging', severity: 'critical' },
    { id: 't11',date: '2024-01-18', event: 'Hội chẩn — đề xuất PET-CT toàn thân + sinh thiết L2', type: 'consult' },
  ],

  // ── Risk factors (tổng hợp cả 2 bệnh) ───────────────────────────────────
  risk_factors: [
    { id: 'r1', name: 'EGFR Exon 19 del + T790M đồng tồn tại',    weight: 95, category: 'genomic'    },
    { id: 'r2', name: 'Viêm gan B mãn tính (HBsAg+)',              weight: 92, category: 'viral'      },
    { id: 'r3', name: 'Di căn gan từ NSCLC — đa tổn thương',       weight: 90, category: 'structural' },
    { id: 'r4', name: 'AFP 1840 ng/mL liên tục tăng cao',          weight: 85, category: 'biomarker'  },
    { id: 'r5', name: 'Xơ gan nền (Child-Pugh A)',                 weight: 82, category: 'structural' },
    { id: 'r6', name: 'TP53 R248W pathogenic',                     weight: 78, category: 'genomic'    },
    { id: 'r7', name: 'TERT C228T promoter mutation',              weight: 74, category: 'genomic'    },
    { id: 'r8', name: 'Tiền sử gia đình: cha ung thư phổi',        weight: 68, category: 'genetic'    },
    { id: 'r9', name: 'Hút thuốc 8 năm (đã bỏ)',                  weight: 55, category: 'lifestyle'   },
    { id: 'r10',name: 'AQI TPHCM 128 — ô nhiễm không khí',        weight: 48, category: 'environmental'},
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
  { id: 'diseases',     label: 'Diseases',     labelVi: 'Bệnh',        icon: '🦠', color: 'var(--red)'    },
  { id: 'symptoms',     label: 'Symptoms',     labelVi: 'Triệu chứng', icon: '🌡', color: 'var(--amber)'  },
  { id: 'labs',         label: 'Labs',         labelVi: 'Xét nghiệm',  icon: '🧪', color: 'var(--cyan)'   },
  { id: 'imaging',      label: 'Imaging',      labelVi: 'Hình ảnh',    icon: '🏥', color: 'var(--violet)' },
  { id: 'medications',  label: 'Medications',  labelVi: 'Thuốc',       icon: '💊', color: 'var(--green)'  },
  { id: 'allergies',    label: 'Allergies',    labelVi: 'Dị ứng',      icon: '⚠️', color: 'var(--pink)'   },
  { id: 'genomics',     label: 'Genomics',     labelVi: 'Gen',         icon: '🧬', color: '#e8c97a'       },
  { id: 'timeline',     label: 'Timeline',     labelVi: 'Lịch sử',     icon: '📅', color: 'var(--cyan2)'  },
  { id: 'risk_factors', label: 'Risk Factors', labelVi: 'Rủi ro',      icon: '📊', color: 'var(--amber)'  },
]

// CSS injected once for section tab animations
const SECTION_STYLE = `
  .sec-tab { position: relative; overflow: hidden; transition: all 0.18s cubic-bezier(.4,0,.2,1) !important; }
  .sec-tab::after {
    content: '';
    position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
    height: 2px; border-radius: 2px;
    width: 0; transition: width 0.22s ease;
    background: currentColor;
  }
  .sec-tab.sec-active::after { width: 70%; }
  .sec-tab:hover:not(.sec-active) { background: rgba(255,255,255,0.04) !important; }
  .sec-tab-ripple {
    position: absolute; inset: 0; border-radius: inherit;
    background: currentColor; opacity: 0;
    animation: sec-ripple 0.38s ease-out forwards;
    pointer-events: none;
  }
  @keyframes sec-ripple {
    from { opacity: 0.18; transform: scale(0.6); }
    to   { opacity: 0;    transform: scale(1.1); }
  }
  .mini-chip { transition: all 0.15s ease !important; }
  .mini-chip:hover { transform: translateY(-1px); }
  .mini-chip.mini-active {
    box-shadow: 0 0 10px currentColor;
    transform: translateY(-1px);
  }
  .section-content-panel {
    animation: sec-fade-in 0.22s ease;
  }
  @keyframes sec-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`

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

export default function PatientRecordPanel({ onNext, onPrev, prevLabel, selectedMember }) {
  const { theme, t, lang } = useApp()
  const { user } = useAuth()
  const isDark = theme === 'dark'

  // ── Sync từ IndexedDB (MedicalUploader) ────────────────────────────────
  const { records, patient: uploadPatient, loading: uploadLoading } = useMedicalData({ lang })

  // Merge: selectedMember (gia phả) > user upload records > admin-only demo data.
  const fallbackPatient = user?.isAdmin ? DEMO_PATIENT : EMPTY_PATIENT
  const basePatient = selectedMember
    ? selectedMember
    : (uploadPatient || fallbackPatient)

  const [patient, setPatient] = useState(basePatient)

  // Cập nhật khi upload records thay đổi (real-time sync)
  useEffect(() => {
    if (!selectedMember) {
      setPatient(uploadPatient || fallbackPatient)
    }
  }, [uploadPatient, selectedMember, fallbackPatient])

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
  const [rippleId, setRippleId]           = useState(null)
  const [sectionKey, setSectionKey]       = useState(0)
  const sectionContentRef                 = useRef(null)
  const tabsRef                           = useRef(null)

  // Inject animation CSS once
  useEffect(() => {
    if (!document.getElementById('sec-tab-style')) {
      const el = document.createElement('style')
      el.id = 'sec-tab-style'
      el.textContent = SECTION_STYLE
      document.head.appendChild(el)
    }
  }, [])

  const handleSectionClick = useCallback((id) => {
    if (id === activeSection) return
    setSection(id)
    setSectionKey(k => k + 1)  // triggers content animation
    setRippleId(id)
    setTimeout(() => setRippleId(null), 400)
    // Smooth scroll to content
    setTimeout(() => {
      sectionContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 60)
  }, [activeSection])
  const [consensusData, setConsensusData] = useState(null)
  const [consensusLoading, setCLoading]   = useState(false)
  const [consensusError, setCError]       = useState('')
  const [activeMethod, setActiveMethod]   = useState('bayesian')
  const [showConsensus, setShowConsensus] = useState(false)
  const isFromFamily = !!(selectedMember)
  const isFromUpload = !!(patient?._fromUpload)

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
            {consensusLoading ? '⟳ ' + (lang === 'vi' ? 'Đang chạy…' : 'Running…') : '🤖 ' + t('runConsensus')}
          </button>
          {onNext && (
            <NavButtons onNext={onNext} nextLabel={`${t('next')} →`} onPrev={onPrev} prevLabel={prevLabel} style={{ marginTop: 0 }} />
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
            onClick={() => { setPatient(fallbackPatient); setConsensusData(null); setShowConsensus(false) }}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(0,229,255,0.3)',
              background: 'transparent', color: 'var(--cyan)', fontSize: 11,
              fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}
          >{user?.isAdmin ? '← Quay lại Demo' : '← Hồ sơ của tôi'}</button>
        </div>
      )}

      {/* Upload data banner */}
      {isFromUpload && !isFromFamily && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)',
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 16 }}>📁</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
              Dữ liệu từ Hồ Sơ Upload
            </span>
            <span style={{ fontSize: 12, color: text2, marginLeft: 8 }}>
              {patient._records?.length || 0} file · {patient.imaging?.length || 0} ảnh có AI phân tích
            </span>
          </div>
          <button
            onClick={() => { setPatient(fallbackPatient); setConsensusData(null); setShowConsensus(false) }}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(0,230,118,0.3)',
              background: 'transparent', color: 'var(--green)', fontSize: 11,
              fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}
          >{user?.isAdmin ? '← Demo Patient' : '← Hồ sơ của tôi'}</button>
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
          {SECTIONS.map(s => {
            const isActive = activeSection === s.id
            const count = (patient[s.id] || []).length
            const hasCritical = s.id === 'labs' && (patient.labs||[]).some(l=>l.critical)
                             || s.id === 'diseases' && (patient.diseases||[]).some(d=>d.severity==='critical')
            return (
              <div
                key={s.id}
                className={`mini-chip${isActive ? ' mini-active' : ''}`}
                onClick={() => handleSectionClick(s.id)}
                title={s.labelVi}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                  background: isActive ? s.color + '22' : s.color + '10',
                  border: `1.5px solid ${isActive ? s.color : s.color + '30'}`,
                  color: s.color,
                  boxShadow: isActive ? `0 0 8px ${s.color}55` : 'none',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: 12 }}>{s.icon}</span>
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: isActive ? 700 : 400 }}>
                  {count}
                </span>
                {hasCritical && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--red)',
                    boxShadow: '0 0 6px var(--red)',
                    animation: 'pulse-dot 1.2s ease infinite',
                  }}/>
                )}
              </div>
            )
          })}
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
      <div
        ref={tabsRef}
        style={{
          display: 'flex', gap: 3, flexWrap: 'wrap',
          background: surfaceBg,
          border: `1px solid ${borderCol}`,
          borderRadius: 14, padding: 5,
          position: 'sticky', top: 0, zIndex: 10,
          backdropFilter: 'blur(12px)',
        }}
      >
        {SECTIONS.map(s => {
          const isActive = activeSection === s.id
          const isRippling = rippleId === s.id
          const count = (patient[s.id] || []).length
          const hasCritical = (s.id === 'labs' && (patient.labs||[]).some(l=>l.critical))
                           || (s.id === 'diseases' && (patient.diseases||[]).some(d=>d.severity==='critical'))
          return (
            <button
              key={s.id}
              className={`sec-tab${isActive ? ' sec-active' : ''}`}
              onClick={() => handleSectionClick(s.id)}
              style={{
                flex: '1 1 auto', padding: '9px 5px', borderRadius: 9,
                border: isActive ? `1px solid ${s.color}45` : '1px solid transparent',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                background: isActive ? s.color + '15' : 'transparent',
                color: isActive ? s.color : text3,
                fontSize: 11, fontFamily: 'var(--font-mono)',
                boxShadow: isActive ? `0 2px 12px ${s.color}30, inset 0 0 12px ${s.color}08` : 'none',
                transform: isActive ? 'translateY(-1px)' : 'none',
              }}
            >
              {/* Ripple on click */}
              {isRippling && <span className="sec-tab-ripple" style={{ color: s.color }} />}

              {/* Critical dot */}
              {hasCritical && (
                <span style={{
                  position: 'absolute', top: 5, right: 5,
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--red)',
                  animation: isActive ? 'none' : 'pulse-dot 1.5s ease infinite',
                  boxShadow: '0 0 5px var(--red)',
                }}/>
              )}

              {/* Icon */}
              <div style={{
                fontSize: 16, marginBottom: 3,
                filter: isActive ? `drop-shadow(0 0 4px ${s.color}90)` : 'none',
                transition: 'filter 0.2s',
              }}>
                {s.icon}
              </div>

              {/* Label */}
              <div style={{ lineHeight: 1.2, fontWeight: isActive ? 700 : 400, letterSpacing: isActive ? '.04em' : '.02em' }}>
                {s.labelVi}
              </div>

              {/* Count badge */}
              <div style={{
                marginTop: 3, fontSize: 9, fontWeight: 700,
                color: isActive ? s.color : text3,
                opacity: isActive ? 1 : 0.5,
              }}>
                {count}
              </div>
            </button>
          )
        })}
      </div>

      {/* Section content */}
      <div
        ref={sectionContentRef}
        key={sectionKey}
        className="section-content-panel"
        style={{
          background: surfaceBg,
          border: `1.5px solid ${sec?.color + '35' || borderCol}`,
          borderRadius: 14, padding: 20, minHeight: 300,
          boxShadow: sec?.color ? `0 0 20px ${sec.color}10, inset 0 0 30px ${sec.color}04` : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 16, paddingBottom: 12,
          borderBottom: `1px solid ${sec?.color + '25' || borderCol}`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: (sec?.color || 'var(--cyan)') + '18',
            border: `1.5px solid ${sec?.color || 'var(--cyan)'}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
            filter: `drop-shadow(0 0 5px ${sec?.color || 'var(--cyan)'}60)`,
          }}>
            {sec?.icon}
          </div>
          <div>
            <div style={{
              fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '.15em',
              textTransform: 'uppercase', fontWeight: 700,
              color: sec?.color || 'var(--text)',
            }}>
              {sec?.label}
            </div>
            <div style={{ fontSize: 10, color: text3, fontFamily: 'var(--font-mono)' }}>
              {sec?.labelVi}
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '50%',
              background: (sec?.color || 'var(--cyan)') + '20',
              border: `1px solid ${sec?.color || 'var(--cyan)'}35`,
              fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)',
              color: sec?.color || 'var(--text)',
            }}>
              {sectionData.length}
            </span>
            <span style={{ fontSize: 9, color: text3, fontFamily: 'var(--font-mono)' }}>items</span>
          </div>
        </div>
        {renderSection(activeSection, sectionData)}
      </div>
    </div>
  )
}
