// Shared Family Medical Tree data, metadata, and persistence helpers.
export const RELATIONS = ['self','father','mother','spouse','sibling','child','grandparent','grandchild','uncle_aunt','cousin']

export const RELATION_META = {
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

export const CONDITION_COLORS = {
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

export const FAMILY_STORAGE_KEY = 'cdoc_family_members'

// ─── Persistence helpers ───────────────────────────────────────────────────
export const normalizeConditions = (conditions) => {
  if (Array.isArray(conditions)) {
    return conditions.map(condition => String(condition || '').trim()).filter(Boolean)
  }
  if (typeof conditions === 'string') {
    return conditions.split(',').map(condition => condition.trim()).filter(Boolean)
  }
  return []
}

export const normalizeFamilyMember = (member, index = 0) => {
  const safeMember = member && typeof member === 'object' ? member : {}
  const relation = RELATION_META[safeMember.relation] ? safeMember.relation : 'self'
  const conditions = normalizeConditions(safeMember.conditions)

  return {
    ...safeMember,
    id: safeMember.id || `fm-import-${index}`,
    relation,
    name: String(safeMember.name || `Family Member ${index + 1}`).trim(),
    age: Number.parseInt(safeMember.age, 10) || 0,
    gender: safeMember.gender === 'F' ? 'F' : 'M',
    conditions: conditions.length ? conditions : ['Khỏe mạnh'],
    alive: safeMember.alive !== false,
    note: String(safeMember.note || '').trim(),
  }
}

export const normalizeFamilyMembers = (members) => (
  Array.isArray(members) ? members.map(normalizeFamilyMember) : null
)

export const loadFamilyMembers = (patientId) => {
  try {
    const all = JSON.parse(localStorage.getItem(FAMILY_STORAGE_KEY) || '{}')
    return normalizeFamilyMembers(all[patientId])
  } catch { return null }
}

export const saveFamilyMembers = (patientId, members) => {
  try {
    const all = JSON.parse(localStorage.getItem(FAMILY_STORAGE_KEY) || '{}')
    all[patientId] = normalizeFamilyMembers(members) || []
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(all))
  } catch (e) { console.error('FamilyTree save error:', e) }
}

// ─── Default demo data ─────────────────────────────────────────────────────
export const DEFAULT_FAMILY_MEMBERS = [
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

