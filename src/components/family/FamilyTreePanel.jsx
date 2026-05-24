import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import NavButtons from '../NavButtons.jsx'

// ─── Constants ──────────────────────────────────────────────────────────────
const RELATIONS = ['self','father','mother','spouse','sibling','child','grandparent','grandchild','uncle_aunt','cousin']

const RELATION_META = {
  grandparent: { row: 1, color: '#9c6fff', label: { vi: 'Ông/Bà',    en: 'Grandparent' } },
  father:      { row: 2, color: '#00b8cc', label: { vi: 'Cha',        en: 'Father'      } },
  mother:      { row: 2, color: '#f48fb1', label: { vi: 'Mẹ',         en: 'Mother'      } },
  uncle_aunt:  { row: 2, color: '#ce93d8', label: { vi: 'Chú/Cô',     en: 'Uncle/Aunt'  } },
  self:        { row: 3, color: '#00e5ff', label: { vi: 'Bệnh nhân',  en: 'Patient'     } },
  spouse:      { row: 3, color: '#ffb74d', label: { vi: 'Vợ/Chồng',   en: 'Spouse'      } },
  sibling:     { row: 3, color: '#00e676', label: { vi: 'Anh/Chị/Em', en: 'Sibling'     } },
  cousin:      { row: 3, color: '#80cbc4', label: { vi: 'Anh em họ',  en: 'Cousin'      } },
  child:       { row: 4, color: '#ff8a65', label: { vi: 'Con',         en: 'Child'       } },
  grandchild:  { row: 5, color: '#a5d6a7', label: { vi: 'Cháu',        en: 'Grandchild'  } },
}

const CONDITION_COLORS = {
  'Ung thư phổi':'#ff5252','Lung Cancer':'#ff5252',
  'Ung thư gan':'#ff5252','Liver Cancer':'#ff5252',
  'Ung thư vú':'#f48fb1','Breast Cancer':'#f48fb1',
  'Ung thư dạ dày':'#ff7043','Stomach Cancer':'#ff7043',
  'Ung thư đại tràng':'#ff5252','Colon Cancer':'#ff5252',
  'Tiểu đường':'#ffb74d','Diabetes':'#ffb74d',
  'Tăng huyết áp':'#ffd54f','Hypertension':'#ffd54f',
  'Tim mạch':'#f48fb1','Heart Disease':'#f48fb1',
  'Đột quỵ':'#ef9a9a','Stroke':'#ef9a9a',
  'Xơ gan':'#ffcc80','Cirrhosis':'#ffcc80',
  'Khỏe mạnh':'#00e676','Healthy':'#00e676',
}

const STORAGE_KEY = 'cdoc_family_members'

// ─── Persistence helpers ───────────────────────────────────────────────────
const loadMembers = (patientId) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return all[patientId] || null
  } catch { return null }
}

const saveMembers = (patientId, members) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    all[patientId] = members
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch (e) { console.error('FamilyTree save error:', e) }
}

// ─── Default demo data ─────────────────────────────────────────────────────
const DEFAULT_MEMBERS = [
  // ── Thế hệ ông bà ─────────────────────────────────────────────────────────
  { id:'fm-0', relation:'grandparent', name:'Lê Văn Tấn',     age:94, gender:'M', conditions:['Ung thư phổi'],          alive:false, note:'Ông nội · mất 1992' },
  { id:'fm-9', relation:'grandparent', name:'Trần Thị Ngọc',  age:88, gender:'F', conditions:['Tăng huyết áp'],         alive:false, note:'Bà nội · mất 2005' },
  // ── Thế hệ cha mẹ ─────────────────────────────────────────────────────────
  { id:'fm-1', relation:'father',      name:'Lê Văn Bình',    age:72, gender:'M', conditions:['Ung thư phổi','Tăng huyết áp'], alive:false, note:'Mất 2018 — ung thư phổi' },
  { id:'fm-2', relation:'mother',      name:'Nguyễn Thị Lan', age:68, gender:'F', conditions:['Tăng huyết áp'],         alive:true,  note:'' },
  { id:'fm-7', relation:'uncle_aunt',  name:'Lê Văn Hùng',    age:65, gender:'M', conditions:['Xơ gan'],               alive:true,  note:'Bác ruột · viêm gan B' },
  // ── Bệnh nhân chính + gia đình trực tiếp ──────────────────────────────────
  {
    id:'fm-3', relation:'self',
    name:'Lê Xuân Khánh',
    age:47, gender:'M',
    conditions:['NSCLC · Stage IIA','Ung thư gan di căn (HCC)','Xơ gan Child-Pugh A'],
    alive:true,
    note:'Bệnh nhân chính · EGFR Exon19del · T790M · Erlotinib Cycle 4',
    // Full merged medical record — synced from PatientRecordPanel
    medicalRecord: {
      blood_type: 'O+',
      dob: '1977-04-10',
      diagnoses: ['NSCLC Stage IIA (C34.1)','HCC T3N0M0 di căn (C22.0)','Xơ gan Child-Pugh A (K74.6)','Viêm gan B mãn tính (B18.1)'],
      key_labs: { AFP: '1840 ng/mL ↑↑↑', CEA: '28 ng/mL ↑', 'CA19-9': '980 U/mL ↑↑↑', ALT: '142 U/L ↑', ctDNA: '0.8%' },
      genomics: ['EGFR Exon 19 del (Pathogenic)', 'T790M (Pathogenic · resistance risk)', 'TP53 R248W (Pathogenic)', 'TERT C228T (Pathogenic)', 'CTNNB1 S45F (Likely Pathogenic)'],
      medications: ['Erlotinib 150mg/day (active)', 'Sorafenib 400mg 2×/day (active)', 'Entecavir 0.5mg (active)', 'Furosemide 40mg (active)'],
      allergies: ['Penicillin — mề đay (severe)', 'Ibuprofen — xuất huyết tiêu hoá (moderate)'],
    },
  },
  { id:'fm-4', relation:'spouse',   name:'Trần Thị Hoa',   age:44, gender:'F', conditions:['Khỏe mạnh'],            alive:true, note:'' },
  { id:'fm-5', relation:'sibling',  name:'Lê Xuân Nam',    age:44, gender:'M', conditions:['Viêm gan B mãn tính'], alive:true, note:'Anh trai · cần tầm soát AFP' },
  { id:'fm-8', relation:'sibling',  name:'Lê Thị Mai',     age:50, gender:'F', conditions:['Khỏe mạnh'],           alive:true, note:'Chị gái' },
  // ── Thế hệ con ────────────────────────────────────────────────────────────
  { id:'fm-6', relation:'child',    name:'Lê Minh Tú',     age:19, gender:'M', conditions:['Khỏe mạnh'],           alive:true, note:'Con trai · cần tầm soát EGFR từ 40 tuổi + xét nghiệm HBsAg' },
  { id:'fm-10',relation:'child',    name:'Lê Thị Bảo Nhi', age:15, gender:'F', conditions:['Khỏe mạnh'],           alive:true, note:'Con gái · theo dõi HBsAg định kỳ' },
]

// ─── Build patient record for Patient Record Visualizer ───────────────────
const buildMemberRecord = (member) => ({
  id: 'FM-' + member.id,
  name: member.name,
  age: member.age,
  gender: member.gender || (member.relation === 'mother' || member.relation === 'spouse' ? 'F' : 'M'),
  blood_type: '—',
  dob: member.age ? `${new Date().getFullYear() - member.age}-01-01` : '—',
  avatar_initials: member.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase(),

  diseases: member.conditions
    .filter(c => c !== 'Khỏe mạnh' && c !== 'Healthy')
    .map((c, i) => ({
      id: 'd'+i, name: c,
      icd10: /ung thư|cancer/i.test(c) ? 'C80.1' : /tiểu đường|diabetes/i.test(c) ? 'E11' : /huyết áp|hypertension/i.test(c) ? 'I10' : 'Z00.0',
      onset: '—',
      severity: /ung thư|cancer/i.test(c) ? 'critical' : /tiểu đường|diabetes|huyết áp|hypertension/i.test(c) ? 'moderate' : 'mild',
    })),

  symptoms: /ung thư|cancer/i.test(member.conditions.join(' '))
    ? [
        { id:'s1', name:'Mệt mỏi kéo dài',             severity:6, onset:'—', active: member.alive !== false },
        { id:'s2', name:'Sụt cân không rõ nguyên nhân', severity:5, onset:'—', active: member.alive !== false },
      ]
    : [],

  labs: /ung thư|cancer/i.test(member.conditions.join(' '))
    ? [
        { id:'l1', name:'CEA',    value:18,  unit:'ng/mL', ref_high:5,  date:'—', trend:'up', critical:true  },
        { id:'l2', name:'CA19-9', value:120, unit:'U/mL',  ref_high:37, date:'—', trend:'up', critical:true  },
      ]
    : /tiểu đường|diabetes/i.test(member.conditions.join(' '))
    ? [
        { id:'l1', name:'HbA1c',  value:8.2, unit:'%',     ref_high:5.7, date:'—', trend:'up', critical:true  },
        { id:'l2', name:'Glucose',value:210,  unit:'mg/dL', ref_high:100, date:'—', trend:'up', critical:false },
      ]
    : [],

  imaging: [], medications: [], allergies: [],

  genomics: /ung thư|cancer/i.test(member.conditions.join(' '))
    ? [{ id:'g1', gene:'TP53', variant:'Suspected', effect:'Unknown', clinical_sig:'VUS', vaf:null, assoc:'Liên quan ung thư gia đình' }]
    : [],

  timeline: [
    { id:'t1', date:'—', event:`Thành viên gia đình · ${RELATION_META[member.relation]?.label?.vi || member.relation}`, type:'diagnosis' },
    ...(member.medicalRecord?.diagnoses?.map((d,i) => ({ id:'td'+i, date:'—', event:d, type:'diagnosis', severity: /ung thư|cancer|hcc|nsclc/i.test(d)?'critical':'moderate' })) || []),
    ...(member.note ? [{ id:'t2', date:'—', event: member.note, type:'consult' }] : []),
    ...(member.alive === false ? [{ id:'t3', date:'—', event:'Đã mất', type:'consult' }] : []),
  ],

  risk_factors: member.conditions
    .filter(c => c !== 'Khỏe mạnh' && c !== 'Healthy')
    .map((c, i) => ({
      id: 'r'+i, name: c,
      weight: /ung thư|cancer/i.test(c) ? 85 : /tiểu đường|diabetes|huyết áp|hypertension/i.test(c) ? 55 : 40,
      category: /ung thư|cancer/i.test(c) ? 'genetic' : 'chronic',
    })),
})

// ─── Empty form state ──────────────────────────────────────────────────────
const EMPTY_FORM = { name:'', age:'', gender:'M', relation:'child', conditions:'', alive:true, note:'' }

// ─── Member Card ───────────────────────────────────────────────────────────
function MemberCard({ member, lang, isDark, c, onViewRecord, onEdit, onDelete }) {
  const meta     = RELATION_META[member.relation] || { color:'#888', label:{ vi:'Khác', en:'Other' } }
  const relColor = meta.color
  const hasDisease = member.conditions.some(cd => cd !== 'Khỏe mạnh' && cd !== 'Healthy')

  return (
    <div style={{ position:'relative', flexShrink:0, width:148 }}>
      {/* Hover badge */}
      <div className="member-hover-badge" style={{
        position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
        background: relColor, color:'#fff',
        fontSize:8, fontWeight:700, fontFamily:'monospace',
        padding:'2px 8px', borderRadius:20, letterSpacing:'.06em', whiteSpace:'nowrap',
        opacity:0, transition:'opacity 0.18s', pointerEvents:'none', zIndex:10,
      }}>Xem hồ sơ →</div>

      {/* Main card */}
      <div
        onClick={() => onViewRecord(buildMemberRecord(member))}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = `0 10px 28px ${relColor}30`
          e.currentTarget.style.borderColor = relColor
          const b = e.currentTarget.parentElement.querySelector('.member-hover-badge')
          if (b) b.style.opacity = '1'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.borderColor = hasDisease ? relColor+'55' : c.border
          const b = e.currentTarget.parentElement.querySelector('.member-hover-badge')
          if (b) b.style.opacity = '0'
        }}
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
          border: `1.5px solid ${hasDisease ? relColor+'55' : c.border}`,
          borderRadius:12, padding:'14px 10px', textAlign:'center',
          cursor:'pointer', transition:'all 0.18s',
          opacity: member.alive === false ? 0.65 : 1,
        }}
      >
        {/* Avatar */}
        <div style={{
          width:44, height:44, borderRadius:'50%', margin:'0 auto 8px',
          background:`${relColor}20`, border:`2px solid ${relColor}55`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
        }}>
          {member.alive === false ? '🕊️' : member.gender === 'F' ? '👩' : member.relation === 'child' || member.relation === 'grandchild' ? '🧒' : '👨'}
        </div>

        <div style={{ fontSize:12, fontWeight:700, color:c.text, marginBottom:2, lineHeight:1.3 }}>{member.name}</div>
        <div style={{ fontSize:10, color:relColor, fontWeight:600, marginBottom:6 }}>
          {meta.label[lang] || meta.label.vi}{member.age ? ` · ${member.age}t` : ''}
        </div>

        {member.conditions.map((cond, i) => {
          const cc = CONDITION_COLORS[cond] || (hasDisease && cond !== 'Khỏe mạnh' ? '#ff8a65' : '#888')
          return (
            <div key={i} style={{
              fontSize:9, padding:'2px 5px', borderRadius:4, marginBottom:2,
              background:`${cc}15`, color:cc, border:`1px solid ${cc}30`,
              textAlign:'left',
            }}>{cond}</div>
          )
        })}

        {member.note && (
          <div style={{ fontSize:9, color:c.text3, marginTop:5, fontStyle:'italic', textAlign:'left', lineHeight:1.4 }}>
            📝 {member.note}
          </div>
        )}
        {member.alive === false && <div style={{ fontSize:9, color:c.text3, marginTop:4 }}>† Đã mất</div>}
      </div>

      {/* Edit / Delete buttons */}
      <div style={{ display:'flex', gap:4, marginTop:6, justifyContent:'center' }}>
        <button
          onClick={e => { e.stopPropagation(); onEdit(member) }}
          style={{
            flex:1, padding:'4px 0', borderRadius:6, border:`1px solid ${c.border}`,
            background: isDark ? 'rgba(255,255,255,0.05)' : '#f0f4f8',
            color:c.text2, fontSize:10, cursor:'pointer', transition:'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#00b8cc'; e.currentTarget.style.color='#00b8cc' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=c.border; e.currentTarget.style.color=c.text2 }}
        >✏️ Sửa</button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(member.id) }}
          style={{
            flex:1, padding:'4px 0', borderRadius:6, border:'1px solid rgba(255,82,82,0.2)',
            background:'rgba(255,82,82,0.06)',
            color:'#ff5252', fontSize:10, cursor:'pointer', transition:'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,82,82,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,82,82,0.06)' }}
        >🗑️ Xoá</button>
      </div>
    </div>
  )
}

// ─── Standalone Field wrapper (must be outside modal to avoid remount) ───────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:'block', fontSize:11, color:'var(--text3,#aaa)', marginBottom:5, fontWeight:600 }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Member Form Modal ─────────────────────────────────────────────────────
function MemberFormModal({ mode, initialForm, onSave, onClose, lang, isDark, c }) {
  // Use local ref-backed state so typing never causes parent re-render
  const [localForm, setLocalForm] = useState(initialForm)
  const title = mode === 'add'
    ? (lang === 'vi' ? '+ Thêm thành viên' : '+ Add Member')
    : (lang === 'vi' ? '✏️ Sửa thành viên' : '✏️ Edit Member')

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:8,
    border:`1px solid ${c.border}`, background: isDark ? '#0d1226' : '#f8fafc',
    color:c.text, fontSize:13, boxSizing:'border-box', outline:'none',
    fontFamily:'inherit',
  }
  const selectStyle = { ...inputStyle, cursor:'pointer' }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: isDark ? '#080c1a' : '#fff',
        border:`1px solid ${c.border}`, borderRadius:18,
        padding:'28px 28px 22px', width:'100%', maxWidth:440,
        boxShadow:'0 32px 80px rgba(0,0,0,0.5)',
        maxHeight:'90vh', overflowY:'auto',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <h3 style={{ fontSize:16, fontWeight:800, color:c.text, margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:c.text3, cursor:'pointer', fontSize:20, lineHeight:1 }}>✕</button>
        </div>

        <Field label={lang === 'vi' ? 'Họ và tên *' : 'Full Name *'}>
          <input
            value={localForm.name} onChange={e => setLocalForm(p => ({ ...p, name:e.target.value }))}
            placeholder={lang === 'vi' ? 'Nguyễn Văn A' : 'John Doe'}
            style={inputStyle}
          />
        </Field>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label={lang === 'vi' ? 'Tuổi' : 'Age'}>
            <input
              type="number" value={localForm.age} onChange={e => setLocalForm(p => ({ ...p, age:e.target.value }))}
              placeholder="45" min={0} max={120} style={inputStyle}
            />
          </Field>
          <Field label={lang === 'vi' ? 'Giới tính' : 'Gender'}>
            <select value={localForm.gender} onChange={e => setLocalForm(p => ({ ...p, gender:e.target.value }))} style={selectStyle}>
              <option value="M">{lang === 'vi' ? 'Nam' : 'Male'}</option>
              <option value="F">{lang === 'vi' ? 'Nữ' : 'Female'}</option>
            </select>
          </Field>
        </div>

        <Field label={lang === 'vi' ? 'Quan hệ với bệnh nhân' : 'Relation to Patient'}>
          <select value={localForm.relation} onChange={e => setLocalForm(p => ({ ...p, relation:e.target.value }))} style={selectStyle}>
            {RELATIONS.map(r => (
              <option key={r} value={r}>{RELATION_META[r]?.label?.[lang] || RELATION_META[r]?.label?.vi || r}</option>
            ))}
          </select>
        </Field>

        <Field label={lang === 'vi' ? 'Bệnh lý (phân cách bằng dấu phẩy)' : 'Conditions (comma-separated)'}>
          <input
            value={localForm.conditions}
            onChange={e => setLocalForm(p => ({ ...p, conditions:e.target.value }))}
            placeholder={lang === 'vi' ? 'Ung thư phổi, Tăng huyết áp' : 'Lung Cancer, Hypertension'}
            style={inputStyle}
          />
          <div style={{ fontSize:10, color:c.text3, marginTop:4 }}>
            {lang === 'vi' ? 'VD: Ung thư phổi, Tiểu đường, Khỏe mạnh' : 'E.g: Lung Cancer, Diabetes, Healthy'}
          </div>
        </Field>

        <Field label={lang === 'vi' ? 'Ghi chú thêm' : 'Additional Notes'}>
          <input
            value={localForm.note} onChange={e => setLocalForm(p => ({ ...p, note:e.target.value }))}
            placeholder={lang === 'vi' ? 'Ví dụ: cần tầm soát định kỳ từ 40 tuổi' : 'E.g: needs annual screening from age 40'}
            style={inputStyle}
          />
        </Field>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div
            onClick={() => setLocalForm(p => ({ ...p, alive:!p.alive }))}
            style={{
              width:40, height:22, borderRadius:11, cursor:'pointer', transition:'all .2s',
              background: localForm.alive ? '#00b8cc' : 'rgba(255,255,255,0.15)',
              position:'relative', flexShrink:0,
            }}
          >
            <div style={{
              width:16, height:16, borderRadius:'50%', background:'#fff',
              position:'absolute', top:3, transition:'left .2s',
              left: localForm.alive ? 21 : 3,
            }} />
          </div>
          <span style={{ fontSize:12, color:c.text2 }}>
            {localForm.alive ? (lang === 'vi' ? '✅ Còn sống' : '✅ Alive') : (lang === 'vi' ? '✝ Đã mất' : '✝ Deceased')}
          </span>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button
            onClick={() => onSave(localForm)} disabled={!localForm.name.trim()}
            style={{
              flex:1, padding:'11px', borderRadius:9, cursor: localForm.name.trim() ? 'pointer' : 'not-allowed',
              border:'none', background:'linear-gradient(135deg,#00b8cc,#6b3fd4)',
              color:'#fff', fontWeight:700, fontSize:13, opacity: localForm.name.trim() ? 1 : 0.5,
              fontFamily:'inherit',
            }}
          >{mode === 'add' ? (lang === 'vi' ? '+ Thêm' : '+ Add') : (lang === 'vi' ? '💾 Lưu' : '💾 Save')}</button>
          <button onClick={onClose} style={{
            flex:1, padding:'11px', borderRadius:9, cursor:'pointer',
            border:`1px solid ${c.border}`, background:'none', color:c.text2,
            fontSize:13, fontFamily:'inherit',
          }}>{lang === 'vi' ? 'Huỷ' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function FamilyTreePanel({ patientId, onNext, onPrev, prevLabel, onViewRecord }) {
  const { theme, lang, t } = useApp()
  const isDark    = theme === 'dark'

  // Load from localStorage, fallback to DEFAULT_MEMBERS
  const [members, setMembersState] = useState(() => loadMembers(patientId) || DEFAULT_MEMBERS)

  // Persist every change
  const setMembers = useCallback((updater) => {
    setMembersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveMembers(patientId, next)
      return next
    })
  }, [patientId])

  const [modal, setModal]   = useState(null)   // null | 'add' | 'edit'
  const [form, setForm]     = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const isDark2 = isDark
  const c = isDark ? {
    bg:'transparent', border:'rgba(255,255,255,0.08)',
    text:'#e8f0f8', text2:'rgba(232,240,248,0.55)', text3:'rgba(232,240,248,0.28)',
    surface:'rgba(255,255,255,0.03)', surface2:'rgba(255,255,255,0.06)',
  } : {
    bg:'transparent', border:'rgba(0,0,0,0.09)',
    text:'#1a2035', text2:'#555', text3:'#aaa',
    surface:'rgba(0,0,0,0.02)', surface2:'rgba(0,0,0,0.05)',
  }

  // ── CRUD handlers ────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setModal('add')
  }

  const openEdit = (member) => {
    setForm({
      name:       member.name,
      age:        member.age?.toString() || '',
      gender:     member.gender || 'M',
      relation:   member.relation,
      conditions: member.conditions.join(', '),
      alive:      member.alive !== false,
      note:       member.note || '',
    })
    setEditId(member.id)
    setModal('edit')
  }

  const handleSave = (localForm) => {
    const parsed = {
      name:       localForm.name.trim(),
      age:        parseInt(localForm.age) || 0,
      gender:     localForm.gender,
      relation:   localForm.relation,
      conditions: localForm.conditions.split(',').map(s => s.trim()).filter(Boolean),
      alive:      localForm.alive,
      note:       localForm.note.trim(),
    }
    if (!parsed.name) return

    if (modal === 'add') {
      setMembers(prev => [...prev, { id:`fm-${Date.now()}`, ...parsed }])
    } else {
      setMembers(prev => prev.map(m => m.id === editId ? { ...m, ...parsed } : m))
    }
    setModal(null)
  }

  const handleDelete = (id) => {
    setMembers(prev => prev.filter(m => m.id !== id))
    setDeleteConfirm(null)
  }

  // ── Group by row ──────────────────────────────────────────────────────────
  const rows = [1,2,3,4,5]
  const byRow = members.reduce((acc, m) => {
    const row = RELATION_META[m.relation]?.row || 3
    if (!acc[row]) acc[row] = []
    acc[row].push(m)
    return acc
  }, {})

  // ── Risk calc ─────────────────────────────────────────────────────────────
  const cancerCount = members.filter(m =>
    m.conditions.some(cd => /ung thư|cancer/i.test(cd))
  ).length
  const riskLevel  = cancerCount >= 3 ? 'high' : cancerCount >= 1 ? 'medium' : 'low'
  const riskColor  = { high:'#ff5252', medium:'#ffb74d', low:'#00e676' }[riskLevel]
  const riskLabel  = lang === 'vi'
    ? { high:'Nguy cơ cao', medium:'Nguy cơ trung bình', low:'Nguy cơ thấp' }[riskLevel]
    : { high:'High Risk',   medium:'Medium Risk',        low:'Low Risk'      }[riskLevel]

  return (
    <div style={{ padding:28, display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:c.text, margin:0 }}>
            🌳 {t('familyTreeTitle')}
          </h2>
          <p style={{ color:c.text2, fontSize:12, marginTop:4 }}>
            {`${members.length} ${t('membersCount')} · ${t('aiHereditary')} · ${lang === 'vi' ? 'Nhấn thẻ để xem hồ sơ' : 'Click a card to view record'}`}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:`${riskColor}18`, color:riskColor, border:`1px solid ${riskColor}30` }}>
            🧬 {riskLabel}
          </div>
          <button onClick={openAdd} style={{
            padding:'8px 18px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
            background:'linear-gradient(135deg,#00b8cc22,#6b3fd422)',
            border:'1px solid rgba(0,180,200,0.35)', color:'#00b8cc',
            transition:'all .15s', fontFamily:'inherit',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(0,180,200,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background='linear-gradient(135deg,#00b8cc22,#6b3fd422)' }}
          >+ {t('addMember')}</button>
        </div>
      </div>

      {/* ── Tree ───────────────────────────────────────────────────────────── */}
      <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:'28px 20px', overflowX:'auto' }}>
        {rows.filter(r => byRow[r]?.length).map((row, ri, arr) => (
          <div key={row} style={{ marginBottom: ri < arr.length-1 ? 40 : 0, position:'relative' }}>
            {/* Row label */}
            <div style={{ fontSize:9, color:c.text3, fontFamily:'monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:14, textAlign:'center' }}>
              {{ 1:'Generation I', 2:'Generation II', 3:'Generation III (Patient)', 4:'Generation IV', 5:'Generation V' }[row]}
            </div>

            {/* Connector line down */}
            {ri < arr.length-1 && (
              <div style={{ position:'absolute', bottom:-32, left:'50%', width:1, height:30, background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
            )}

            {/* Cards row */}
            <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
              {byRow[row].map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  lang={lang}
                  isDark={isDark}
                  c={c}
                  onViewRecord={onViewRecord || (() => {})}
                  onEdit={openEdit}
                  onDelete={id => setDeleteConfirm(id)}
                />
              ))}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:c.text3 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🌳</div>
            <div style={{ fontSize:14, marginBottom:16 }}>{lang === 'vi' ? 'Chưa có thành viên gia đình nào' : 'No family members yet'}</div>
            <button onClick={openAdd} style={{ padding:'10px 24px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#00b8cc,#6b3fd4)', color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              + {lang === 'vi' ? 'Thêm thành viên đầu tiên' : 'Add first member'}
            </button>
          </div>
        )}
      </div>

      {/* ── Member list table ───────────────────────────────────────────────── */}
      <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${c.border}`, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:c.text3, fontFamily:'monospace', flex:1 }}>
            {t('memberList')} ({members.length})
          </span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                {[
                  lang === 'vi' ? 'Họ tên' : 'Name',
                  lang === 'vi' ? 'Quan hệ' : 'Relation',
                  lang === 'vi' ? 'Tuổi' : 'Age',
                  lang === 'vi' ? 'Bệnh lý' : 'Conditions',
                  lang === 'vi' ? 'Trạng thái' : 'Status',
                  lang === 'vi' ? 'Ghi chú' : 'Note',
                  lang === 'vi' ? 'Thao tác' : 'Actions',
                ].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:9, color:c.text3, fontFamily:'monospace', letterSpacing:'.08em', textTransform:'uppercase', whiteSpace:'nowrap', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member, i) => {
                const meta = RELATION_META[member.relation]
                const relColor = meta?.color || '#888'
                const hasDisease = member.conditions.some(cd => cd !== 'Khỏe mạnh' && cd !== 'Healthy')
                return (
                  <tr key={member.id} style={{ borderTop:`1px solid ${c.border}`, transition:'background .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:`${relColor}20`, border:`1.5px solid ${relColor}50`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                          {member.alive === false ? '🕊️' : member.gender === 'F' ? '👩' : '👨'}
                        </div>
                        <span style={{ fontWeight:600, color:c.text }}>{member.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, background:`${relColor}18`, color:relColor, border:`1px solid ${relColor}30`, fontFamily:'monospace' }}>
                        {meta?.label?.[lang] || meta?.label?.vi || member.relation}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', color:c.text2 }}>{member.age ? `${member.age}t` : '—'}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {member.conditions.map((cd, ci) => {
                          const cc = CONDITION_COLORS[cd] || (cd !== 'Khỏe mạnh' && cd !== 'Healthy' ? '#ff8a65' : '#00e676')
                          return (
                            <span key={ci} style={{ padding:'1px 6px', borderRadius:3, fontSize:9, background:`${cc}15`, color:cc, border:`1px solid ${cc}30` }}>{cd}</span>
                          )
                        })}
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ fontSize:10, color: member.alive === false ? c.text3 : '#00e676', fontFamily:'monospace' }}>
                        {member.alive === false ? '✝ Đã mất' : '● Sống'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', color:c.text2, fontSize:11, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {member.note || '—'}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => onViewRecord && onViewRecord(buildMemberRecord(member))} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid rgba(0,229,255,0.25)`, background:'rgba(0,229,255,0.08)', color:'var(--cyan,#00e5ff)', fontSize:10, cursor:'pointer', whiteSpace:'nowrap' }}>
                          📋 Hồ sơ
                        </button>
                        <button onClick={() => openEdit(member)} style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${c.border}`, background:'transparent', color:c.text2, fontSize:10, cursor:'pointer' }}>
                          ✏️
                        </button>
                        <button onClick={() => setDeleteConfirm(member.id)} style={{ padding:'4px 8px', borderRadius:6, border:'1px solid rgba(255,82,82,0.2)', background:'rgba(255,82,82,0.06)', color:'#ff5252', fontSize:10, cursor:'pointer' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AI Risk panel ───────────────────────────────────────────────────── */}
      <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:14, padding:16 }}>
        <div style={{ fontSize:10, letterSpacing:'.12em', color:c.text3, marginBottom:12, textTransform:'uppercase', fontFamily:'monospace' }}>
          🤖 {t('aiHereditary')}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ background:'rgba(255,82,82,0.06)', border:'1px solid rgba(255,82,82,0.2)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#ff5252', marginBottom:6 }}>🧬 {lang === 'vi' ? 'Gen nguy cơ phát hiện' : 'Risk Genes Detected'}</div>
            <div style={{ fontSize:11, color:c.text2, lineHeight:1.6 }}>
              {cancerCount > 0
                ? (lang === 'vi' ? `${cancerCount} thành viên mắc ung thư → nguy cơ di truyền cao. Khuyến nghị xét nghiệm BRCA1/BRCA2, EGFR.` : `${cancerCount} members with cancer → high hereditary risk. Recommend BRCA1/BRCA2, EGFR genetic testing.`)
                : (lang === 'vi' ? 'Không phát hiện yếu tố ung thư di truyền rõ ràng trong gia đình.' : 'No clear hereditary cancer factors detected in family.')}
            </div>
          </div>
          <div style={{ background:'rgba(255,183,77,0.06)', border:'1px solid rgba(255,183,77,0.2)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#ffb74d', marginBottom:6 }}>📋 {t('screeningRec')}</div>
            <div style={{ fontSize:11, color:c.text2, lineHeight:1.6 }}>
              {lang === 'vi'
                ? 'Con cái: CT ngực low-dose hàng năm từ 40 tuổi. Anh/em: xét nghiệm gen. Toàn gia đình: cai thuốc lá, giảm phơi nhiễm AQI.'
                : 'Children: Annual low-dose chest CT from age 40. Siblings: Genetic testing. Whole family: Smoking cessation, reduce AQI exposure.'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <NavButtons onNext={onNext} nextLabel={`${t('next')} →`} onPrev={onPrev} prevLabel={prevLabel} />

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {modal && (
        <MemberFormModal
          key={editId || 'add'}
          mode={modal} initialForm={form}
          onSave={handleSave} onClose={() => setModal(null)}
          lang={lang} isDark={isDark} c={c}
        />
      )}

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background: isDark ? '#080c1a' : '#fff', border:`1px solid rgba(255,82,82,0.3)`, borderRadius:16, padding:28, maxWidth:380, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🗑️</div>
            <h3 style={{ fontSize:16, fontWeight:800, color:c.text, marginBottom:8 }}>
              {t('confirmDelete')}
            </h3>
            <p style={{ fontSize:12, color:c.text2, marginBottom:24 }}>
              {lang === 'vi'
                ? `Thành viên "${members.find(m=>m.id===deleteConfirm)?.name}" sẽ bị xoá vĩnh viễn.`
                : `Member "${members.find(m=>m.id===deleteConfirm)?.name}" will be permanently deleted.`}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#ff5252', color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                {lang === 'vi' ? '🗑️ Xoá' : '🗑️ Delete'}
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex:1, padding:'10px', borderRadius:8, border:`1px solid ${c.border}`, background:'none', color:c.text2, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                {lang === 'vi' ? 'Huỷ' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
