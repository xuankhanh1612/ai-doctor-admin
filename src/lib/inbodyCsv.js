function parseNumber(value) {
  if (value === undefined || value === null) return null
  const normalized = String(value).replace(/\ufeff/g, '').replace(',', '.').trim()
  if (!normalized || normalized === '-') return null
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseCsvLine(line) {
  const cells = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

export function formatInBodyDate(raw, { short = false } = {}) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length < 8) return String(raw || '')
  const date = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  if (digits.length < 12 || short) return date
  return `${date} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`
}

export function parseInBodyCsv(csvText = '') {
  const lines = String(csvText).replace(/^data:[^,]+,/, '').replace(/\r/g, '').split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map(header => header.replace(/\ufeff/g, '').trim())
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce((row, header, index) => ({ ...row, [header]: values[index] }), {})
  })

  return rows.map((row) => ({
    date: formatInBodyDate(row['ngày']),
    shortDate: formatInBodyDate(row['ngày'], { short: true }),
    rawDate: String(row['ngày'] || ''),
    device: row['Thiết bị đo'] || '',
    weight: parseNumber(row['Cân nặng(kg)']),
    skeletalMuscle: parseNumber(row['Khối lượng cơ xương(kg)']),
    muscle: parseNumber(row['Khối lượng cơ xương(kg)']) ?? parseNumber(row['Khối lượng cơ(kg)']),
    bodyFatMass: parseNumber(row['Khối lượng mỡ trong cơ thể(kg)']),
    bmi: parseNumber(row['BMI(kg/m²)']),
    fat: parseNumber(row['Tỷ lệ mỡ cơ thể(%)']),
    bmr: parseNumber(row['Tỷ lệ trao đổi chất cơ bản(kcal)']),
    score: parseNumber(row['Điểm InBody']),
    water: parseNumber(row['Lượng nước trong cơ thể(L)']),
    intracellularWater: parseNumber(row['Nước nội bào(L)']),
    extracellularWater: parseNumber(row['Nước ngoại bào(L)']),
    ecwRatio: parseNumber(row['Tỷ lệ ECW']),
    visceralFatLevel: parseNumber(row['Mức độ chất béo nội tạng(Level)']),
    waistHipRatio: parseNumber(row['Tỷ lệ mỡ bụng']),
    protein: parseNumber(row['Protein(kg)']),
    minerals: parseNumber(row['Khoáng chất(kg)']),
    boneMineral: parseNumber(row['Hàm lượng khoáng trong xương(kg)']),
    bodyCellMass: parseNumber(row['Khối lượng tế bào cơ thể(kg)']),
    smi: parseNumber(row['Chỉ số khối cơ xương(kg/m²)']),
    phaseAngle: parseNumber(row['Góc pha toàn bộ cơ thể(°)']),
    rightArmMuscle: parseNumber(row['Khối lượng cơ ở cánh tay phải(kg)']),
    leftArmMuscle: parseNumber(row['Khối lượng cơ ở cánh tay trái(kg)']),
    trunkMuscle: parseNumber(row['Khối lượng cơ ở thân mình(kg)']),
    rightLegMuscle: parseNumber(row['Khối lượng cơ ở chân phải(kg)']),
    leftLegMuscle: parseNumber(row['Khối lượng cơ ở chân trái(kg)']),
  })).filter(record => record.rawDate).sort((a, b) => a.rawDate.localeCompare(b.rawDate))
}

export function summarizeInBodyRecords(records = []) {
  const first = records[0]
  const latest = records[records.length - 1]
  const previous = records[records.length - 2] || first
  const diff = (key, base = first) => latest?.[key] != null && base?.[key] != null ? latest[key] - base[key] : null
  return { first, latest, previous, diff }
}

export const INBODY_CSV_HEADERS = [
  'ngày','Thiết bị đo','Cân nặng(kg)','Khối lượng cơ xương(kg)','Khối lượng cơ(kg)','Khối lượng mỡ trong cơ thể(kg)','BMI(kg/m²)','Tỷ lệ mỡ cơ thể(%)','Tỷ lệ trao đổi chất cơ bản(kcal)','Điểm InBody','Khối lượng cơ ở cánh tay phải(kg)','Khối lượng cơ ở cánh tay trái(kg)','Khối lượng cơ ở thân mình(kg)','Khối lượng cơ ở chân phải(kg)','Khối lượng cơ ở chân trái(kg)','Mỡ ở cánh tay phải(kg)','Mỡ ở cánh tay trái(kg)','Mỡ ở thân mình(kg)','Khối lượng mỡ ở chân phải(kg)','Khối lượng mỡ ở chân trái(kg)','Cánh tay phải Tỷ lệ ECW','Cánh tay trái Tỷ lệ ECW','Thân hình Tỷ lệ ECW','Chân phải Tỷ lệ ECW','Chân trái Tỷ lệ ECW','Tỷ lệ mỡ bụng','Vòng eo(cm)','Diện tích mỡ nội tạng(cm²)','Mức độ chất béo nội tạng(Level)','Lượng nước trong cơ thể(L)','Nước nội bào(L)','Nước ngoại bào(L)','Tỷ lệ ECW','Trên-Dưới','Phần trên','Phần dưới','Mức độ cơ chân(Level)','Khối lượng cơ bắp chân(kg)','Protein(kg)','Khoáng chất(kg)','Hàm lượng khoáng trong xương(kg)','Khối lượng tế bào cơ thể(kg)','Chỉ số khối cơ xương(kg/m²)','Góc pha toàn bộ cơ thể(°)'
]

function formatCsvValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-'
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function compactDateForCsv(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value || '').replace(/\D/g, '').slice(0, 14) || `${Date.now()}`
  const pad = part => String(part).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export function inBodyRecordToCsvRow(record = {}) {
  const byHeader = {
    'ngày': record.rawDate || compactDateForCsv(record.date || record.uploadedAt),
    'Thiết bị đo': record.device || 'AIClinic',
    'Cân nặng(kg)': record.weight,
    'Khối lượng cơ xương(kg)': record.skeletalMuscle ?? record.muscle,
    'Khối lượng cơ(kg)': record.bodyMuscle,
    'Khối lượng mỡ trong cơ thể(kg)': record.bodyFatMass,
    'BMI(kg/m²)': record.bmi,
    'Tỷ lệ mỡ cơ thể(%)': record.fat,
    'Tỷ lệ trao đổi chất cơ bản(kcal)': record.bmr,
    'Điểm InBody': record.score,
    'Khối lượng cơ ở cánh tay phải(kg)': record.rightArmMuscle,
    'Khối lượng cơ ở cánh tay trái(kg)': record.leftArmMuscle,
    'Khối lượng cơ ở thân mình(kg)': record.trunkMuscle,
    'Khối lượng cơ ở chân phải(kg)': record.rightLegMuscle,
    'Khối lượng cơ ở chân trái(kg)': record.leftLegMuscle,
    'Tỷ lệ mỡ bụng': record.waistHipRatio,
    'Mức độ chất béo nội tạng(Level)': record.visceralFatLevel,
    'Lượng nước trong cơ thể(L)': record.water,
    'Nước nội bào(L)': record.intracellularWater,
    'Nước ngoại bào(L)': record.extracellularWater,
    'Tỷ lệ ECW': record.ecwRatio,
    'Protein(kg)': record.protein,
    'Khoáng chất(kg)': record.minerals,
    'Hàm lượng khoáng trong xương(kg)': record.boneMineral,
    'Khối lượng tế bào cơ thể(kg)': record.bodyCellMass,
    'Chỉ số khối cơ xương(kg/m²)': record.smi,
    'Góc pha toàn bộ cơ thể(°)': record.phaseAngle,
  }
  return INBODY_CSV_HEADERS.map(header => formatCsvValue(byHeader[header]))
}

export function buildInBodyCsv(records = []) {
  const rows = records
    .filter(Boolean)
    .sort((a, b) => String(a.rawDate || a.date || '').localeCompare(String(b.rawDate || b.date || '')))
    .map(record => inBodyRecordToCsvRow(record).join(','))
  return `\ufeff${INBODY_CSV_HEADERS.join(',')}\n${rows.join('\n')}\n`
}

export function extractInBodyMetricsFromText(text = '') {
  const source = String(text)
  const find = (...labels) => {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const match = source.match(new RegExp(`${escaped}[^0-9+-]*([0-9]+(?:[.,][0-9]+)?)`, 'i'))
      if (match) return parseNumber(match[1])
    }
    return null
  }
  return {
    weight: find('Cân nặng', 'Weight'),
    muscle: find('Khối lượng cơ xương', 'Skeletal Muscle Mass', 'SMM'),
    bodyFatMass: find('Khối lượng mỡ', 'Body Fat Mass'),
    bmi: find('BMI'),
    fat: find('Tỷ lệ mỡ cơ thể', 'Percent Body Fat', 'PBF'),
    bmr: find('Tỷ lệ trao đổi chất cơ bản', 'BMR'),
    score: find('Điểm InBody', 'InBody Score'),
    water: find('Lượng nước trong cơ thể', 'Total Body Water'),
    protein: find('Protein'),
    minerals: find('Khoáng chất', 'Minerals'),
    visceralFatLevel: find('Mức độ chất béo nội tạng', 'Visceral Fat Level'),
  }
}
