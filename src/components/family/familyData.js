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

export const FAMILY_RELATION_META = RELATION_META

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
  'Chưa rõ tiền sử':'#80cbc4','Unknown history':'#80cbc4',
}

export const LXK_PATIENT_PROFILE = {
  id: 'fm-3',
  relation: 'self',
  name: 'Lê Xuân Khánh',
  dob: '1982-12-16',
  displayDob: '16/12/1982',
  blood_type: 'OH-',
  gender: 'M',
}

export const calculateAgeFromDob = (dob, now = new Date()) => {
  const birthDate = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return 0

  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDelta = now.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) age -= 1
  return age
}

export const isNonDiseaseCondition = (condition) => /^(khỏe mạnh|healthy|chưa rõ tiền sử|unknown history)$/i.test(String(condition || '').trim())


export const FAMILY_STORAGE_KEY = 'cdoc_family_members'
export const FAMILY_USER_STORAGE_KEY = 'cdoc_family_members_by_user'
export const FAMILY_MEMBERS_CHANGED_EVENT = 'cdoc_family_members_changed'

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
    dob: typeof safeMember.dob === 'string' ? safeMember.dob : safeMember.medicalRecord?.dob,
    blood_type: typeof safeMember.blood_type === 'string' ? safeMember.blood_type : safeMember.medicalRecord?.blood_type,
    conditions: conditions.length ? conditions : ['Chưa rõ tiền sử'],
    alive: safeMember.alive !== false,
    note: String(safeMember.note || '').trim(),
  }
}

export const normalizeFamilyMembers = (members) => (
  Array.isArray(members) ? members.map(normalizeFamilyMember) : null
)

const isLegacyLxkDemoTree = (members) => {
  const self = members?.find(member => member.relation === 'self' || member.id === LXK_PATIENT_PROFILE.id)
  return self?.medicalRecord?.dob === '1977-04-10' || self?.dob === '1977-04-10' || /Erlotinib|T790M|Cycle 4/i.test(self?.note || '')
}

export const applyLxkPatientProfile = (members) => {
  const normalized = normalizeFamilyMembers(members)
  if (!normalized) return null

  const profileAge = calculateAgeFromDob(LXK_PATIENT_PROFILE.dob)
  return normalized.map(member => {
    if (member.relation !== 'self' && member.id !== LXK_PATIENT_PROFILE.id && member.name !== LXK_PATIENT_PROFILE.name) return member

    return {
      ...member,
      ...LXK_PATIENT_PROFILE,
      age: profileAge,
      alive: true,
      note: `Bệnh nhân chính · sinh ${LXK_PATIENT_PROFILE.displayDob} · nhóm máu ${LXK_PATIENT_PROFILE.blood_type}`,
      medicalRecord: {
        ...(member.medicalRecord || {}),
        dob: LXK_PATIENT_PROFILE.dob,
        blood_type: LXK_PATIENT_PROFILE.blood_type,
      },
    }
  })
}

export const getFamilyOwnerKey = (ownerId) => {
  const key = String(ownerId || 'guest').trim().toLowerCase()
  return key || 'guest'
}

const emitFamilyMembersChanged = (patientId, ownerId) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(FAMILY_MEMBERS_CHANGED_EVENT, {
    detail: { patientId, ownerId: getFamilyOwnerKey(ownerId) },
  }))
}

const readJsonObject = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}

const prepareFamilyMembersForPatient = (patientId, members) => {
  const normalized = normalizeFamilyMembers(members)
  if (!normalized) return null
  if (patientId === 'LXK-2024' && isLegacyLxkDemoTree(normalized)) return null
  return patientId === 'LXK-2024' ? applyLxkPatientProfile(normalized) : normalized
}

export const loadFamilyMembers = (patientId, ownerId = 'guest') => {
  try {
    const ownerKey = getFamilyOwnerKey(ownerId)
    const byUser = readJsonObject(FAMILY_USER_STORAGE_KEY)
    const userPatients = byUser[ownerKey] && typeof byUser[ownerKey] === 'object' ? byUser[ownerKey] : {}

    // Only load the current user's local database. If no saved row exists, callers show DEFAULT_FAMILY_MEMBERS.
    return prepareFamilyMembersForPatient(patientId, userPatients[patientId])
  } catch { return null }
}

export const saveFamilyMembers = (patientId, members, ownerId = 'guest') => {
  try {
    const ownerKey = getFamilyOwnerKey(ownerId)
    const byUser = readJsonObject(FAMILY_USER_STORAGE_KEY)
    const normalized = patientId === 'LXK-2024' ? applyLxkPatientProfile(members) : normalizeFamilyMembers(members)

    byUser[ownerKey] = byUser[ownerKey] && typeof byUser[ownerKey] === 'object' ? byUser[ownerKey] : {}
    byUser[ownerKey][patientId] = normalized || []
    localStorage.setItem(FAMILY_USER_STORAGE_KEY, JSON.stringify(byUser))
    emitFamilyMembersChanged(patientId, ownerId)
  } catch (e) { console.error('FamilyTree save error:', e) }
}

export const clearFamilyMembers = (patientId, ownerId = 'guest') => {
  try {
    const ownerKey = getFamilyOwnerKey(ownerId)
    const byUser = readJsonObject(FAMILY_USER_STORAGE_KEY)
    if (byUser[ownerKey]) {
      delete byUser[ownerKey][patientId]
      localStorage.setItem(FAMILY_USER_STORAGE_KEY, JSON.stringify(byUser))
      emitFamilyMembersChanged(patientId, ownerId)
    }
  } catch (e) { console.error('FamilyTree clear error:', e) }
}

// ─── Default demo data ─────────────────────────────────────────────────────
export const DEFAULT_FAMILY_MEMBERS = applyLxkPatientProfile([
  // ── Thế hệ ông bà ─────────────────────────────────────────────────────────
  { id:'fm-0', relation:'grandparent', name:'Chưa nhập tên ông nội',  age:0, gender:'M', conditions:['Chưa rõ tiền sử'], alive:true, note:'Ông nội · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
  { id:'fm-9', relation:'grandparent', name:'Chưa nhập tên bà nội',   age:0, gender:'F', conditions:['Chưa rõ tiền sử'], alive:true, note:'Bà nội · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
  { id:'fm-11',relation:'grandparent', name:'Chưa nhập tên ông ngoại', age:0, gender:'M', conditions:['Chưa rõ tiền sử'], alive:true, note:'Ông ngoại · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
  { id:'fm-12',relation:'grandparent', name:'Chưa nhập tên bà ngoại',  age:0, gender:'F', conditions:['Chưa rõ tiền sử'], alive:true, note:'Bà ngoại · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
  // ── Thế hệ cha mẹ ─────────────────────────────────────────────────────────
  { id:'fm-1', relation:'father',      name:'Chưa nhập tên cha',       age:0, gender:'M', conditions:['Chưa rõ tiền sử'], alive:true, note:'Cha · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
  { id:'fm-2', relation:'mother',      name:'Chưa nhập tên mẹ',        age:0, gender:'F', conditions:['Chưa rõ tiền sử'], alive:true, note:'Mẹ · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
  // ── Bệnh nhân chính + gia đình trực tiếp ──────────────────────────────────
  {
    id: LXK_PATIENT_PROFILE.id,
    relation: 'self',
    name: LXK_PATIENT_PROFILE.name,
    age: calculateAgeFromDob(LXK_PATIENT_PROFILE.dob),
    gender: LXK_PATIENT_PROFILE.gender,
    dob: LXK_PATIENT_PROFILE.dob,
    blood_type: LXK_PATIENT_PROFILE.blood_type,
    conditions: ['Chưa rõ tiền sử'],
    alive: true,
    note: `Bệnh nhân chính · sinh ${LXK_PATIENT_PROFILE.displayDob} · nhóm máu ${LXK_PATIENT_PROFILE.blood_type}`,
    medicalRecord: {
      blood_type: LXK_PATIENT_PROFILE.blood_type,
      dob: LXK_PATIENT_PROFILE.dob,
      diagnoses: [],
      key_labs: {},
      genomics: [],
      medications: [],
      allergies: [],
    },
  },
  { id:'fm-4', relation:'spouse',   name:'Chưa nhập tên vợ/chồng',     age:0, gender:'F', conditions:['Chưa rõ tiền sử'], alive:true, note:'Vợ/chồng · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
  { id:'fm-5', relation:'sibling',  name:'Chưa nhập tên anh/chị/em',   age:0, gender:'M', conditions:['Chưa rõ tiền sử'], alive:true, note:'Anh/chị/em · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
  // ── Thế hệ con ────────────────────────────────────────────────────────────
  { id:'fm-6', relation:'child',    name:'Chưa nhập tên con',          age:0, gender:'M', conditions:['Chưa rõ tiền sử'], alive:true, note:'Con · cần cập nhật họ tên, ngày sinh, nhóm máu và tiền sử bệnh' },
])
