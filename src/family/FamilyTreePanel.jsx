import React, { useState } from 'react'
import { useAuth } from '/src/context/AuthContext'
import { useApp } from '/src/context/AppContext'

const RELATIONS = ['self', 'father', 'mother', 'sibling', 'child', 'spouse', 'grandparent']

const RELATION_POSITIONS = {
  grandparent: { gridRow: 1, color: '#9c6fff' },
  father: { gridRow: 2, color: '#00b8cc' },
  mother: { gridRow: 2, color: '#f48fb1' },
  self: { gridRow: 3, color: '#00e5ff' },
  spouse: { gridRow: 3, color: '#ffb74d' },
  sibling: { gridRow: 3, color: '#00e676' },
  child: { gridRow: 4, color: '#ff5252' },
}

const CONDITION_COLORS = {
  'Ung thư phổi': '#ff5252', 'Lung Cancer': '#ff5252',
  'Ung thư gan': '#ff5252', 'Liver Cancer': '#ff5252',
  'Tiểu đường': '#ffb74d', 'Diabetes': '#ffb74d',
  'Tăng huyết áp': '#ffb74d', 'Hypertension': '#ffb74d',
  'Tim mạch': '#f48fb1', 'Heart Disease': '#f48fb1',
  'Khỏe mạnh': '#00e676', 'Healthy': '#00e676',
}


// ── Demo patient records for each family member ─────────────────────────────
const buildMemberRecord = (member) => ({
  id: 'FM-' + member.id,
  name: member.name,
  age: member.age,
  gender: member.relation === 'mother' || member.relation === 'spouse' ? 'F' : 'M',
  blood_type: '—',
  dob: member.age ? `${new Date().getFullYear() - member.age}-01-01` : '—',
  avatar_initials: member.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase(),

  diseases: member.conditions
    .filter(c => c !== 'Khỏe mạnh' && c !== 'Healthy')
    .map((c, i) => ({
      id: 'd' + i,
      name: c,
      icd10: c.toLowerCase().includes('ung thư') || c.toLowerCase().includes('cancer') ? 'C80.1' : 'Z00.0',
      onset: '—',
      severity: c.toLowerCase().includes('ung thư') || c.toLowerCase().includes('cancer') ? 'critical'
              : c.toLowerCase().includes('tiểu đường') || c.toLowerCase().includes('diabetes') ? 'moderate'
              : 'mild',
    })),

  symptoms: member.conditions.some(c => c.toLowerCase().includes('ung thư') || c.toLowerCase().includes('cancer'))
    ? [
        { id: 's1', name: 'Mệt mỏi',           severity: 6, onset: '—', active: member.alive !== false },
        { id: 's2', name: 'Sụt cân không rõ nguyên nhân', severity: 5, onset: '—', active: member.alive !== false },
      ]
    : [],

  labs: member.conditions.some(c => c.toLowerCase().includes('ung thư') || c.toLowerCase().includes('cancer'))
    ? [
        { id: 'l1', name: 'CEA',   value: 18,  unit: 'ng/mL', ref_high: 5,  date: '—', trend: 'up', critical: true  },
        { id: 'l2', name: 'CA19-9',value: 120, unit: 'U/mL',  ref_high: 37, date: '—', trend: 'up', critical: true  },
      ]
    : member.conditions.some(c => c.toLowerCase().includes('tiểu đường') || c.toLowerCase().includes('diabetes'))
    ? [
        { id: 'l1', name: 'HbA1c',  value: 8.2, unit: '%',      ref_high: 5.7, date: '—', trend: 'up', critical: true  },
        { id: 'l2', name: 'Glucose',value: 210,  unit: 'mg/dL',  ref_high: 100, date: '—', trend: 'up', critical: false },
      ]
    : [],

  imaging: [],
  medications: [],
  allergies: [],
  genomics: member.conditions.some(c => c.toLowerCase().includes('ung thư') || c.toLowerCase().includes('cancer'))
    ? [{ id: 'g1', gene: 'TP53', variant: 'Suspected', effect: 'Unknown', clinical_sig: 'VUS', vaf: null, assoc: 'Liên quan ung thư gia đình' }]
    : [],

  timeline: [
    { id: 't1', date: '—', event: 'Thành viên gia đình · ' + member.relation, type: 'diagnosis' },
    ...(member.alive === false ? [{ id: 't2', date: '—', event: 'Đã mất', type: 'consult' }] : []),
  ],

  risk_factors: member.conditions
    .filter(c => c !== 'Khỏe mạnh' && c !== 'Healthy')
    .map((c, i) => ({
      id: 'r' + i,
      name: c,
      weight: c.toLowerCase().includes('ung thư') || c.toLowerCase().includes('cancer') ? 85 : 55,
      category: c.toLowerCase().includes('ung thư') || c.toLowerCase().includes('cancer') ? 'genetic' : 'chronic',
    })),
})

export default function FamilyTreePanel({ patientId, onNext, onViewRecord }) {
  const { getPatients, savePatient } = useAuth()
  const { t, lang, theme } = useApp()
  const isDark = theme === 'dark'

  const [members, setMembers] = useState(() => {
    const patients = getPatients()
    const patient = patients.find(p => p.id === patientId)
    return patient?.familyMembers || [
      { id: 'fm-1', relation: 'father', name: 'Lê Văn Bình', age: 72, conditions: ['Ung thư phổi', 'Tăng huyết áp'], alive: false },
      { id: 'fm-2', relation: 'mother', name: 'Nguyễn Thị Lan', age: 68, conditions: ['Tăng huyết áp'], alive: true },
      { id: 'fm-3', relation: 'self', name: 'Lê Xuân Khánh', age: 47, conditions: ['NSCLC · Stage IIA'], alive: true },
      { id: 'fm-4', relation: 'sibling', name: 'Lê Xuân Nam', age: 44, conditions: ['Khỏe mạnh'], alive: true },
    ]
  })

  const [showAdd, setShowAdd] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', age: '', relation: 'child', conditions: '', alive: true })

  const c = isDark ? {
    bg: 'transparent', border: 'rgba(255,255,255,0.08)',
    text: '#e8f0f8', text2: 'rgba(232,240,248,0.55)', text3: 'rgba(232,240,248,0.28)',
    surface: 'rgba(255,255,255,0.03)', surface2: 'rgba(255,255,255,0.06)',
  } : {
    bg: 'transparent', border: 'rgba(0,0,0,0.1)',
    text: '#1a2035', text2: '#555', text3: '#999',
    surface: 'rgba(0,0,0,0.02)', surface2: 'rgba(0,0,0,0.05)',
  }

  const addMember = () => {
    const member = {
      id: `fm-${Date.now()}`,
      ...newMember,
      age: parseInt(newMember.age) || 0,
      conditions: newMember.conditions.split(',').map(s => s.trim()).filter(Boolean),
    }
    const updated = [...members, member]
    setMembers(updated)
    // Save to patient
    const patients = getPatients()
    const idx = patients.findIndex(p => p.id === patientId)
    if (idx >= 0) { patients[idx].familyMembers = updated; savePatient(patients[idx]) }
    setNewMember({ name: '', age: '', relation: 'child', conditions: '', alive: true })
    setShowAdd(false)
  }

  // Group by relation for tree display
  const byRow = members.reduce((acc, m) => {
    const row = RELATION_POSITIONS[m.relation]?.gridRow || 3
    if (!acc[row]) acc[row] = []
    acc[row].push(m)
    return acc
  }, {})

  // AI risk analysis based on family history
  const cancerCount = members.filter(m => m.conditions.some(c => c.toLowerCase().includes('ung thư') || c.toLowerCase().includes('cancer'))).length
  const riskLevel = cancerCount >= 2 ? 'high' : cancerCount === 1 ? 'medium' : 'low'
  const riskColors = { high: '#ff5252', medium: '#ffb74d', low: '#00e676' }
  const riskLabels = { vi: { high: 'Nguy cơ cao', medium: 'Nguy cơ trung bình', low: 'Nguy cơ thấp' }, en: { high: 'High Risk', medium: 'Medium Risk', low: 'Low Risk' } }

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{t('familyTree')}</h2>
          <p style={{ color: c.text2, fontSize: 12, marginTop: 4 }}>
            {lang === 'vi' ? 'Phân tích bệnh lý di truyền theo gia phả · Hỗ trợ AI' : 'Hereditary disease analysis by family tree · AI-powered'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: `${riskColors[riskLevel]}18`, color: riskColors[riskLevel],
            border: `1px solid ${riskColors[riskLevel]}30`,
          }}>
            🧬 {riskLabels[lang]?.[riskLevel]}
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: 'rgba(0,180,200,0.12)', border: '1px solid rgba(0,180,200,0.3)', color: '#00b8cc',
          }}>
            + {t('addFamilyMember')}
          </button>
        </div>
      </div>

      {/* Tree visualization */}
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, overflowX: 'auto' }}>
        {[1,2,3,4].map(row => byRow[row] && (
          <div key={row} style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: row < 4 ? 32 : 0, position: 'relative' }}>
            {/* Connection lines */}
            {row > 1 && <div style={{
              position: 'absolute', top: -28, left: '50%', width: 1, height: 28,
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }} />}
            {byRow[row].map(member => {
              const relColor = RELATION_POSITIONS[member.relation]?.color || '#888'
              const hasCondition = member.conditions.some(c => c !== 'Khỏe mạnh' && c !== 'Healthy')
              return (
                <div
                  key={member.id}
                  onClick={() => onViewRecord && onViewRecord(buildMemberRecord(member))}
                  title={onViewRecord ? `Xem hồ sơ ${member.name}` : ''}
                  style={{
                    width: 140, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                    border: `1.5px solid ${hasCondition ? relColor + '60' : c.border}`,
                    borderRadius: 12, padding: '14px 12px', textAlign: 'center',
                    position: 'relative', flexShrink: 0,
                    opacity: member.alive === false ? 0.6 : 1,
                    cursor: onViewRecord ? 'pointer' : 'default',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { if (onViewRecord) { e.currentTarget.style.border = `1.5px solid ${relColor}`; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${relColor}25`; const b = e.currentTarget.querySelector('.member-hover-badge'); if(b) b.style.opacity='1' }}}
                  onMouseLeave={e => { if (onViewRecord) { e.currentTarget.style.border = `1.5px solid ${hasCondition ? relColor + '60' : c.border}`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; const b = e.currentTarget.querySelector('.member-hover-badge'); if(b) b.style.opacity='0' }}}
                >
                  {onViewRecord && (
                    <div style={{
                      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                      background: relColor, color: '#fff',
                      fontSize: 8, fontWeight: 700, fontFamily: 'monospace',
                      padding: '2px 7px', borderRadius: 20,
                      letterSpacing: '.06em', whiteSpace: 'nowrap',
                      opacity: 0, transition: 'opacity 0.18s',
                      pointerEvents: 'none',
                    }} className="member-hover-badge">Xem hồ sơ →</div>
                  )}
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', margin: '0 auto 8px',
                    background: `${relColor}20`, border: `2px solid ${relColor}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {member.alive === false ? '🕊️' : member.relation === 'self' ? '👤' : member.relation === 'child' ? '🧒' : '👤'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.text, marginBottom: 2 }}>{member.name}</div>
                  <div style={{ fontSize: 10, color: relColor, fontWeight: 600, marginBottom: 6 }}>
                    {t('relation_' + member.relation)} · {member.age}t
                  </div>
                  {member.conditions.map((cond, i) => {
                    const condColor = CONDITION_COLORS[cond] || '#888'
                    return (
                      <div key={i} style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 4, marginBottom: 2,
                        background: `${condColor}15`, color: condColor, border: `1px solid ${condColor}30`,
                      }}>{cond}</div>
                    )
                  })}
                  {member.alive === false && <div style={{ fontSize: 9, color: c.text3, marginTop: 4 }}>✝</div>}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* AI Risk Analysis */}
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', color: c.text3, marginBottom: 12, textTransform: 'uppercase' }}>
          🤖 {lang === 'vi' ? 'Phân tích nguy cơ di truyền AI' : 'AI Hereditary Risk Analysis'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.2)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ff5252', marginBottom: 6 }}>
              🧬 {lang === 'vi' ? 'Gen nguy cơ phát hiện' : 'Risk Genes Detected'}
            </div>
            <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.6 }}>
              {lang === 'vi'
                ? 'EGFR Exon 19 del có thể mang tính chất gia đình. Cha bị ung thư phổi → tăng nguy cơ 50% cho thế hệ sau. Khuyến nghị xét nghiệm gen cho anh/em/con.'
                : 'EGFR Exon 19 del may have hereditary nature. Father had lung cancer → 50% increased risk for next generation. Recommend genetic testing for siblings/children.'}
            </div>
          </div>
          <div style={{ background: 'rgba(255,183,77,0.06)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ffb74d', marginBottom: 6 }}>
              📋 {lang === 'vi' ? 'Khuyến nghị tầm soát' : 'Screening Recommendations'}
            </div>
            <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.6 }}>
              {lang === 'vi'
                ? 'Con cái: CT ngực low-dose hàng năm từ 40 tuổi. Anh/em: xét nghiệm gen EGFR. Toàn gia đình: cai thuốc lá, giảm phơi nhiễm AQI.'
                : 'Children: Annual low-dose chest CT from age 40. Siblings: EGFR genetic testing. Whole family: smoking cessation, reduce AQI exposure.'}
            </div>
          </div>
        </div>
      </div>

      {/* Add member modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: isDark ? '#080c1a' : '#fff', border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, width: 400, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 20 }}>{t('addFamilyMember')}</h3>
            {[
              { key: 'name', label: lang === 'vi' ? 'Họ tên' : 'Name', type: 'text' },
              { key: 'age', label: lang === 'vi' ? 'Tuổi' : 'Age', type: 'number' },
              { key: 'conditions', label: lang === 'vi' ? 'Bệnh lý (phân cách bằng dấu phẩy)' : 'Conditions (comma-separated)', type: 'text' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: c.text3, marginBottom: 6 }}>{field.label}</label>
                <input type={field.type} value={newMember[field.key]} onChange={e => setNewMember(p => ({ ...p, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.surface, color: c.text, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: c.text3, marginBottom: 6 }}>{t('familyRelation')}</label>
              <select value={newMember.relation} onChange={e => setNewMember(p => ({ ...p, relation: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: isDark ? '#0d1226' : '#fff', color: c.text, fontSize: 13 }}>
                {RELATIONS.map(r => <option key={r} value={r}>{t('relation_' + r)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={newMember.alive} onChange={e => setNewMember(p => ({ ...p, alive: e.target.checked }))} />
              <label style={{ fontSize: 12, color: c.text2 }}>{lang === 'vi' ? 'Còn sống' : 'Alive'}</label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addMember} style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)', color: '#fff', fontWeight: 600 }}>{t('save')}</button>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${c.border}`, background: 'none', color: c.text2 }}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {onNext && (
        <button onClick={onNext} style={{
          padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
          background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)',
          color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', alignSelf: 'flex-start',
        }}>
          {t('next')} →
        </button>
      )}
    </div>
  )
}
