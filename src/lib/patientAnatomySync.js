// ============================================================================
// patientAnatomySync — Suy ra trạng thái từng cơ quan trên "Bản đồ giải phẫu
// cơ thể" (AnatomyHoverOverlayRight) dựa trên dữ liệu THẬT của bệnh nhân
// đang được chọn (diseases, labs, symptoms) trong Patient Record Visualizer.
//
// Mỗi khi user đổi bệnh nhân trong combobox ("Viewing member"), patient object
// đổi -> annotations được tính lại -> panel bên phải hiển thị đúng số liệu
// của người vừa chọn.
// ============================================================================

// Từ khoá để nhận diện bệnh lý / xét nghiệm liên quan tới từng cơ quan.
// (so khớp không phân biệt hoa/thường, bỏ dấu để bắt được cả bản không dấu)
const ORGAN_RULES = {
  brain: {
    diseaseKeywords: ['não', 'brain', 'đột quỵ', 'stroke', 'thần kinh trung ương'],
    labKeywords: [],
  },
  lungs: {
    diseaseKeywords: ['phổi', 'lung', 'nsclc', 'hô hấp', 'ho keo dai'],
    labKeywords: ['cea (phổi)', 'ctdna'],
  },
  heart: {
    diseaseKeywords: ['tim', 'heart', 'mạch vành', 'nhồi máu', 'huyết áp'],
    labKeywords: ['troponin', 'ck-mb', 'ldl', 'hdl', 'cholesterol'],
  },
  liver: {
    diseaseKeywords: ['gan', 'liver', 'hcc', 'xơ gan', 'viêm gan'],
    labKeywords: ['alt', 'ast', 'bilirubin', 'afp', 'ggt'],
  },
  kidneys: {
    diseaseKeywords: ['thận', 'kidney', 'suy thận', 'cầu thận'],
    labKeywords: ['creatinine', 'egfr', 'bun', 'ure', 'ca 19-9'],
  },
  stomach: {
    diseaseKeywords: ['dạ dày', 'stomach', 'viêm loét', 'trào ngược'],
    labKeywords: ['cea', 'pepsinogen'],
  },
}

const norm = (s) => String(s || '').toLowerCase()

function matchDiseases(diseases, keywords) {
  if (!keywords.length) return []
  return (diseases || []).filter((d) => {
    const hay = norm(d.name) + ' ' + norm(d.icd10)
    return keywords.some((k) => hay.includes(norm(k)))
  })
}

function matchLabs(labs, keywords) {
  if (!keywords.length) return []
  return (labs || []).filter((l) => keywords.some((k) => norm(l.name).includes(norm(k))))
}

function severityRank(sev) {
  if (sev === 'critical') return 3
  if (sev === 'moderate') return 2
  if (sev === 'mild') return 1
  return 0
}

/**
 * Tính annotation override cho 1 cơ quan dựa trên dữ liệu bệnh nhân.
 * Trả về null nếu bệnh nhân không có dữ liệu gì liên quan tới cơ quan này
 * (khi đó AnatomyHoverOverlayRight sẽ giữ nguyên nội dung mặc định).
 */
function buildOrganOverride(organId, patient) {
  const rules = ORGAN_RULES[organId]
  if (!rules) return null

  const diseases = matchDiseases(patient?.diseases, rules.diseaseKeywords)
  const labs = matchLabs(patient?.labs, rules.labKeywords)

  if (!diseases.length && !labs.length) return null

  const criticalLabs = labs.filter((l) => l.critical)
  const worstSeverity = diseases.reduce((max, d) => Math.max(max, severityRank(d.severity)), 0)

  let status = 'Normal'
  if (worstSeverity >= 3 || criticalLabs.length > 0) status = 'Critical'
  else if (worstSeverity >= 1 || labs.some((l) => l.trend === 'up' || l.trend === 'down')) status = 'Warning'

  const diseaseText = diseases.map((d) => d.name).join('; ')
  const labText = labs
    .map((l) => `${l.name} ${l.value}${l.unit || ''} (ngưỡng ≤${l.ref_high}${l.unit || ''})${l.critical ? ' ⚠️' : ''}`)
    .join(', ')

  const infoParts = []
  if (diseaseText) infoParts.push(`Bệnh lý ghi nhận: ${diseaseText}.`)
  if (labText) infoParts.push(`Xét nghiệm: ${labText}.`)
  const info = infoParts.length
    ? infoParts.join(' ')
    : 'Không phát hiện bất thường liên quan ở bệnh nhân này.'

  return {
    status,
    info,
    metrics: [
      { label: 'Bệnh lý liên quan', value: String(diseases.length), color: diseases.length ? 'text-amber-300' : 'text-white' },
      { label: 'XN bất thường', value: `${criticalLabs.length}/${labs.length || 0}`, color: criticalLabs.length ? 'text-red-400' : 'text-emerald-400' },
    ],
  }
}

/**
 * Ghép danh sách annotation mặc định (vị trí hotspot cố định trên ảnh) với
 * dữ liệu thật của bệnh nhân đang chọn. Cơ quan nào bệnh nhân không có dữ
 * liệu thì giữ nguyên nội dung tham khảo mặc định.
 *
 * @param {Array} defaultAnnotations - ANATOMY_DEFAULT_ANNOTATIONS từ AnatomyHoverOverlayRight
 * @param {Object} patient - hồ sơ bệnh nhân đang chọn (diseases, labs, ...)
 */
export function buildPatientAnatomyAnnotations(defaultAnnotations, patient) {
  return (defaultAnnotations || []).map((ann) => {
    const override = buildOrganOverride(ann.id, patient)
    return override ? { ...ann, ...override } : ann
  })
}
