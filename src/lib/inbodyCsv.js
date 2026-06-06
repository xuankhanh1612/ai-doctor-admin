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
  })).filter(record => record.rawDate && record.weight !== null).sort((a, b) => a.rawDate.localeCompare(b.rawDate))
}

export function summarizeInBodyRecords(records = []) {
  const first = records[0]
  const latest = records[records.length - 1]
  const previous = records[records.length - 2] || first
  const diff = (key, base = first) => latest?.[key] != null && base?.[key] != null ? latest[key] - base[key] : null
  return { first, latest, previous, diff }
}
