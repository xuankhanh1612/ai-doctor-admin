import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import NavButtons from './NavButtons.jsx'
import { useMedicalData } from '../hooks/useMedicalData.js'
import { LXK_PATIENT_RECORD } from '../data/lxkPatientRecord.js'
import { DEFAULT_FAMILY_MEMBERS, loadFamilyMembers, saveFamilyMembers } from './family/familyData.js'



const PATIENT_RECORD_STORAGE_KEY = 'cdoc_patient_record_by_user'
const patientRecordOwnerKey = ownerId => String(ownerId || 'guest').trim().toLowerCase() || 'guest'
const clonePatientRecord = patient => JSON.parse(JSON.stringify(patient || LXK_PATIENT_RECORD))
const isLxkDemoRecord = patient => patient?.id === LXK_PATIENT_RECORD.id && !patient?.familyMemberId
const isPrimaryPatientRecord = patient => isLxkDemoRecord(patient) || patient?.familyMemberId === 'fm-3'
const patientAvatarUrl = (patient, user) => isPrimaryPatientRecord(patient) ? (user?.avatar || patient?.avatar_url || '') : (patient?.avatar_url || '')
const displayPatientName = patient => {
  const name = String(patient?.name || '').trim()
  if (isLxkDemoRecord(patient) && !/\bDemo$/i.test(name)) return `${name} Demo`
  return name
}


const patientInitialsFromName = name => String(name || 'Patient')
  .split(' ')
  .filter(Boolean)
  .slice(-2)
  .map(w => w[0])
  .join('')
  .toUpperCase() || 'PT'

const buildPrimaryPatientRecord = (patient, user, ownerId) => {
  const ownerKey = patientRecordOwnerKey(ownerId).replace(/[^a-z0-9]+/gi, '-').toUpperCase()
  const primaryName = String(user?.name || patient?.name || 'Patient').trim()
  return {
    ...patient,
    id: `PRIMARY-${ownerKey}`,
    sourceDemoId: patient?.id,
    familyMemberId: 'fm-3',
    name: primaryName,
    avatar_url: user?.avatar || patient?.avatar_url,
    avatar_initials: patientInitialsFromName(primaryName),
    _isPrimaryPatient: true,
    _isDemoTemplate: patient?.id === LXK_PATIENT_RECORD.id,
  }
}

const mergeUploadedRecords = (basePatient, uploadedPatient) => {
  if (!uploadedPatient) return basePatient

  const existingImaging = basePatient.imaging || []
  const existingImageIds = new Set(existingImaging.map(item => item.id))
  const uploadedImaging = (uploadedPatient.imaging || []).filter(item => !existingImageIds.has(item.id))

  const existingLabs = basePatient.labs || []
  const existingLabIds = new Set(existingLabs.map(item => item.id))
  const uploadedLabs = (uploadedPatient.labs || []).filter(item => !existingLabIds.has(item.id))

  const existingTimeline = basePatient.timeline || []
  const timelineIds = new Set(existingTimeline.map(item => item.id))
  const uploadedTimeline = (uploadedPatient.timeline || []).filter(item => !timelineIds.has(item.id))

  if (!uploadedImaging.length && !uploadedLabs.length && !uploadedTimeline.length) return basePatient

  return {
    ...basePatient,
    imaging: [...uploadedImaging, ...existingImaging],
    labs: [...uploadedLabs, ...existingLabs],
    timeline: [...uploadedTimeline, ...existingTimeline],
    _records: uploadedPatient._records || [],
    _hasUploadedImaging: uploadedImaging.length > 0,
    _hasUploadedLabs: uploadedLabs.length > 0,
  }
}

const loadSavedPatientRecord = (ownerId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    const byUser = JSON.parse(localStorage.getItem(PATIENT_RECORD_STORAGE_KEY) || '{}')
    const saved = byUser?.[patientRecordOwnerKey(ownerId)]
    return saved && typeof saved === 'object' ? saved : null
  } catch { return null }
}

const savePatientRecordForUser = (ownerId, patient) => {
  if (typeof localStorage === 'undefined') return
  try {
    const byUser = JSON.parse(localStorage.getItem(PATIENT_RECORD_STORAGE_KEY) || '{}')
    byUser[patientRecordOwnerKey(ownerId)] = patient
    localStorage.setItem(PATIENT_RECORD_STORAGE_KEY, JSON.stringify(byUser))
  } catch (e) { console.error('PatientRecord save error:', e) }
}

const syncPatientRecordToFamily = (patientId, ownerId, patient) => {
  if (!patient?.familyMemberId) return
  const members = loadFamilyMembers(patientId, ownerId) || DEFAULT_FAMILY_MEMBERS
  const nextMembers = members.map(member => member.id === patient.familyMemberId ? {
    ...member,
    name: patient.name,
    age: Number.parseInt(patient.age, 10) || member.age || 0,
    gender: patient.gender === 'F' ? 'F' : 'M',
    dob: patient.dob === '—' ? '' : patient.dob,
    blood_type: patient.blood_type === '—' ? '' : patient.blood_type,
    conditions: (patient.diseases || []).map(d => d.name).filter(Boolean).length ? (patient.diseases || []).map(d => d.name).filter(Boolean) : member.conditions,
    medicalRecord: {
      ...(member.medicalRecord || {}),
      ...patient,
      id: patient.id,
      familyMemberId: patient.familyMemberId,
    },
  } : member)
  saveFamilyMembers(patientId, nextMembers, ownerId)
}

// ─── API — Consensus Engine (https://ai-doctor-engine.vercel.app) ──────────
const API_BASE =
  import.meta.env.VITE_CONSENSUS_API_URL || 'https://ai-doctor-engine.vercel.app'

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

const splitCommaItems = value => (value || '').split(',').map(v => v.trim()).filter(Boolean)
const patientInitials = name => (name || 'Patient')
  .split(' ')
  .filter(Boolean)
  .slice(-2)
  .map(w => w[0])
  .join('')
  .toUpperCase() || 'PT'

const serializePatientForEdit = patient => ({
  name: patient?.name || '',
  age: patient?.age === '—' ? '' : String(patient?.age ?? ''),
  gender: patient?.gender || 'M',
  dob: patient?.dob === '—' ? '' : String(patient?.dob ?? ''),
  blood_type: patient?.blood_type === '—' ? '' : String(patient?.blood_type ?? ''),
  diseases: (patient?.diseases || []).map(d => d.name || d).join(', '),
  symptoms: (patient?.symptoms || []).map(s => s.name || s).join(', '),
  labs: (patient?.labs || []).map(l => l.name || l).join(', '),
  imaging: (patient?.imaging || []).map(i => i.type || i.name || i).join(', '),
  medications: (patient?.medications || []).map(m => m.name || m).join(', '),
  allergies: (patient?.allergies || []).map(a => a.substance || a.name || a).join(', '),
  genomics: (patient?.genomics || []).map(g => g.gene ? `${g.gene}${g.variant ? ` · ${g.variant}` : ''}` : (g.name || g)).join(', '),
  timeline: (patient?.timeline || []).map(t => t.event || t.name || t).join(', '),
  risk_factors: (patient?.risk_factors || []).map(r => r.name || r).join(', '),
})

const buildEditedPatient = (current, form) => ({
  ...current,
  name: form.name.trim() || current.name,
  age: form.age.trim() || '—',
  gender: form.gender || '—',
  dob: form.dob.trim() || '—',
  blood_type: form.blood_type.trim() || '—',
  avatar_initials: patientInitials(form.name.trim() || current.name),
  diseases: splitCommaItems(form.diseases).map((name, i) => ({ id: `ed-d-${i}`, name, icd10: current.diseases?.[i]?.icd10 || 'Z00.0', onset: current.diseases?.[i]?.onset || '—', severity: current.diseases?.[i]?.severity || 'moderate' })),
  symptoms: splitCommaItems(form.symptoms).map((name, i) => ({ id: `ed-s-${i}`, name, severity: current.symptoms?.[i]?.severity || 5, onset: current.symptoms?.[i]?.onset || '—', active: current.symptoms?.[i]?.active ?? true })),
  labs: splitCommaItems(form.labs).map((name, i) => ({ id: `ed-l-${i}`, name, value: current.labs?.[i]?.value ?? '—', unit: current.labs?.[i]?.unit || '', ref_high: current.labs?.[i]?.ref_high, date: current.labs?.[i]?.date || '—', trend: current.labs?.[i]?.trend || 'stable', critical: current.labs?.[i]?.critical || false })),
  imaging: splitCommaItems(form.imaging).map((type, i) => ({ id: `ed-i-${i}`, type, date: current.imaging?.[i]?.date || '—', modality: current.imaging?.[i]?.modality || '—', ai_confidence: current.imaging?.[i]?.ai_confidence || 0, findings: current.imaging?.[i]?.findings || '', impression: current.imaging?.[i]?.impression || '' })),
  medications: splitCommaItems(form.medications).map((name, i) => ({ id: `ed-m-${i}`, name, dose: current.medications?.[i]?.dose || '—', class: current.medications?.[i]?.class || 'other', adherence: current.medications?.[i]?.adherence ?? 100 })),
  allergies: splitCommaItems(form.allergies).map((substance, i) => ({ id: `ed-a-${i}`, substance, reaction: current.allergies?.[i]?.reaction || '—', severity: current.allergies?.[i]?.severity || 'moderate', verified: current.allergies?.[i]?.verified || false })),
  genomics: splitCommaItems(form.genomics).map((name, i) => ({ id: `ed-g-${i}`, gene: name.split('·')[0].trim(), variant: name.split('·')[1]?.trim() || current.genomics?.[i]?.variant || '—', effect: current.genomics?.[i]?.effect || '—', clinical_sig: current.genomics?.[i]?.clinical_sig || '—', assoc: current.genomics?.[i]?.assoc || '' })),
  timeline: splitCommaItems(form.timeline).map((event, i) => ({ id: `ed-t-${i}`, date: current.timeline?.[i]?.date || '—', event, type: current.timeline?.[i]?.type || 'consult', severity: current.timeline?.[i]?.severity })),
  risk_factors: splitCommaItems(form.risk_factors).map((name, i) => ({ id: `ed-r-${i}`, name, weight: current.risk_factors?.[i]?.weight || 50, category: current.risk_factors?.[i]?.category || 'clinical' })),
})

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
            {img.dataUrl ? (
              <img src={img.dataUrl} alt={img.type} style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 8, background: '#050912', border: `1px solid ${mc}30` }} />
            ) : (
              <ScanSVG modality={img.modality} color={mc} />
            )}
            {img.uploadedBy && (
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                UPLOADED BY: {img.uploadedByName || img.uploadedBy} · {img.uploadedAt ? new Date(img.uploadedAt).toLocaleString('vi-VN') : img.date}
              </div>
            )}
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

export default function PatientRecordPanel({ onNext, onPrev, prevLabel, selectedMember, storageOwnerId = 'guest', onBackToPatient }) {
  const { theme, t, lang } = useApp()
  const { user } = useAuth()
  const isDark = theme === 'dark'

  // Keep uploader hook subscribed and merge each user's uploaded images into Patient Record > Imaging.
  const { patient: uploadedPatient } = useMedicalData({ lang })

  const ownerId = storageOwnerId || user?.email || 'guest'
  const mainPatient = useMemo(() => {
    const savedOrTemplate = clonePatientRecord(loadSavedPatientRecord(ownerId) || LXK_PATIENT_RECORD)
    const primaryPatient = buildPrimaryPatientRecord(savedOrTemplate, user, ownerId)
    return mergeUploadedRecords(primaryPatient, uploadedPatient)
  }, [ownerId, uploadedPatient, user?.name, user?.avatar])
  const basePatient = selectedMember ? selectedMember : mainPatient

  const [patient, setPatient] = useState(basePatient)
  const [isEditingRecord, setIsEditingRecord] = useState(false)
  const [editForm, setEditForm] = useState(() => serializePatientForEdit(basePatient))

  useEffect(() => {
    if (!selectedMember) {
      setPatient(mainPatient)
      setEditForm(serializePatientForEdit(mainPatient))
      setIsEditingRecord(false)
      setConsensusData(null)
      setCError('')
      setShowConsensus(false)
    }
  }, [mainPatient, selectedMember])

  // When a family member is passed in, switch to their data.
  useEffect(() => {
    if (selectedMember) {
      setPatient(selectedMember)
      setEditForm(serializePatientForEdit(selectedMember))
      setIsEditingRecord(false)
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
  const isDemoRecord = isLxkDemoRecord(patient)
  const displayedPatientAvatar = patientAvatarUrl(patient, user)
  const canSaveEditedRecord = editForm.name.trim() && !isDemoRecord

  const startEditRecord = () => {
    setEditForm(serializePatientForEdit(patient))
    setIsEditingRecord(true)
  }

  const cancelEditRecord = () => {
    setEditForm(serializePatientForEdit(patient))
    setIsEditingRecord(false)
  }

  const saveEditedRecord = () => {
    if (isDemoRecord) return
    const nextPatient = buildEditedPatient(patient, editForm)
    setPatient(nextPatient)
    setEditForm(serializePatientForEdit(nextPatient))
    if (selectedMember) {
      syncPatientRecordToFamily('LXK-2024', ownerId, nextPatient)
    } else {
      savePatientRecordForUser(ownerId, nextPatient)
    }
    setConsensusData(null)
    setShowConsensus(false)
    setIsEditingRecord(false)
  }

  const surfaceBg = isDark ? 'var(--bg2)' : '#ffffff'
  const borderCol = isDark ? 'var(--border)' : 'rgba(0,0,0,0.08)'
  const text2     = isDark ? 'var(--text2)' : '#555'
  const text3     = isDark ? 'var(--text3)' : '#aaa'
  const recordInputStyle = {
    width: '100%', padding: '9px 10px', borderRadius: 8,
    border: `1px solid ${borderCol}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, boxSizing: 'border-box',
  }
  const recordTextareaStyle = { ...recordInputStyle, minHeight: 76, resize: 'vertical', lineHeight: 1.45 }


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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            onClick={isEditingRecord ? cancelEditRecord : startEditRecord}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,229,255,0.28)',
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: isEditingRecord ? 'rgba(255,82,82,0.08)' : 'rgba(0,229,255,0.08)',
              color: isEditingRecord ? 'var(--red)' : 'var(--cyan)',
              fontFamily: 'inherit',
            }}
          >
            {isEditingRecord ? (lang === 'vi' ? 'Huỷ sửa' : 'Cancel edit') : '📋 Sửa Hồ sơ'}
          </button>
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
              {t('fromFamily')}
            </span>
            <span style={{ fontSize: 12, color: text2, marginLeft: 8 }}>
              {t('viewingMember')}: <b>{displayPatientName(patient)}</b>
            </span>
          </div>
          <button
            onClick={() => {
              setPatient(mainPatient)
              setEditForm(serializePatientForEdit(mainPatient))
              setConsensusData(null)
              setShowConsensus(false)
              setIsEditingRecord(false)
              onBackToPatient?.()
            }}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(0,229,255,0.3)',
              background: 'transparent', color: 'var(--cyan)', fontSize: 11,
              fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}
          >← Back to Patient</button>
        </div>
      )}

      {/* Patient card */}
      <div style={{ background: surfaceBg, border: '1px solid rgba(255,82,82,0.25)', borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,82,82,0.12)', border: '2px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'var(--red)', overflow: 'hidden' }}>
            {displayedPatientAvatar ? (
              <img src={displayedPatientAvatar} alt={displayPatientName(patient)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : patient.avatar_initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{displayPatientName(patient)}</h3>
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

      {/* Inline edit form */}
      {isEditingRecord && (
        <div style={{ background: surfaceBg, border: '1px solid rgba(0,229,255,0.25)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '.14em', color: 'var(--cyan)', fontWeight: 700 }}>
                📋 SỬA HỒ SƠ BỆNH NHÂN
              </div>
              <div style={{ fontSize: 11, color: text3, marginTop: 4 }}>
                {lang === 'vi' ? 'Nhập các mục lâm sàng, phân cách bằng dấu phẩy.' : 'Enter clinical items separated by commas.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={saveEditedRecord}
                disabled={!canSaveEditedRecord}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg,var(--cyan2),var(--violet2))',
                  color: '#fff', fontWeight: 700, fontSize: 12, cursor: canSaveEditedRecord ? 'pointer' : 'not-allowed',
                  opacity: canSaveEditedRecord ? 1 : 0.55, fontFamily: 'inherit',
                }}
              >💾 Lưu hồ sơ</button>
              <button
                onClick={cancelEditRecord}
                style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${borderCol}`, background: 'transparent', color: text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >Huỷ</button>
            </div>
          </div>

          {isDemoRecord && (
            <div style={{
              marginBottom: 16, padding: '12px 14px', borderRadius: 12,
              border: '1px solid rgba(255,183,77,0.35)', background: 'rgba(255,183,77,0.12)',
              color: 'var(--amber)', fontSize: 12, lineHeight: 1.6, fontWeight: 600,
            }}>
              ⚠️ {lang === 'vi'
                ? 'Tài khoản Demo này chỉ dùng để copy/sao chép nhanh dữ liệu và chỉnh sửa tạm, giúp user học cách thao tác sửa dữ liệu. Nút Lưu hồ sơ đã được khóa để không ghi đè dữ liệu demo gốc.'
                : 'This Demo account is only for quickly copying data and temporary edits so users can learn record editing. Save is disabled to protect the original demo data.'}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              ['name', 'Họ tên'],
              ['age', 'Tuổi'],
              ['dob', 'Ngày sinh'],
              ['blood_type', 'Nhóm máu'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: text3, fontWeight: 600 }}>
                {label}
                <input
                  value={editForm[key]}
                  onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={label}
                  style={recordInputStyle}
                />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: text3, fontWeight: 600 }}>
              Giới tính
              <select
                value={editForm.gender}
                onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                style={recordInputStyle}
              >
                <option value="M">Nam</option>
                <option value="F">Nữ</option>
                <option value="—">Khác / Chưa rõ</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {[
              ['diseases', 'Bệnh / chẩn đoán'],
              ['symptoms', 'Triệu chứng'],
              ['labs', 'Xét nghiệm'],
              ['imaging', 'Hình ảnh'],
              ['medications', 'Thuốc'],
              ['allergies', 'Dị ứng'],
              ['genomics', 'Genomics'],
              ['timeline', 'Lịch sử điều trị'],
              ['risk_factors', 'Yếu tố rủi ro'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: text3, fontWeight: 600 }}>
                {label}
                <textarea
                  value={editForm[key]}
                  onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`${label} — phân cách bằng dấu phẩy`}
                  style={recordTextareaStyle}
                />
              </label>
            ))}
          </div>
        </div>
      )}

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
