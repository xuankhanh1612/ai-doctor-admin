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
  })).filter(record => record.weight !== null && (record.rawDate || record.date)).sort((a, b) => (a.rawDate || a.date).localeCompare(b.rawDate || b.date))
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

function compactTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function csvValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return String(value)
}

export function inBodyRecordToCsvRow(record = {}) {
  return [
    // IMPORTANT: do NOT fall back to compactTimestamp() (today) when rawDate is empty.
    // An empty rawDate means the date could not be read from the image; leaving it blank
    // is far better than recording the wrong measurement date.
    record.rawDate || '', record.device || 'image-convert', record.weight, record.skeletalMuscle ?? record.muscle, record.muscleRaw ?? '-', record.bodyFatMass, record.bmi, record.fat, record.bmr, record.score,
    record.rightArmMuscle, record.leftArmMuscle, record.trunkMuscle, record.rightLegMuscle, record.leftLegMuscle,
    record.rightArmFat, record.leftArmFat, record.trunkFat, record.rightLegFat, record.leftLegFat,
    record.rightArmEcwRatio, record.leftArmEcwRatio, record.trunkEcwRatio, record.rightLegEcwRatio, record.leftLegEcwRatio,
    record.waistHipRatio, record.waist, record.visceralFatArea, record.visceralFatLevel, record.water, record.intracellularWater, record.extracellularWater, record.ecwRatio,
    record.upperLower, record.upper, record.lower, record.legMuscleLevel, record.calfMuscle, record.protein, record.minerals, record.boneMineral, record.bodyCellMass, record.smi, record.phaseAngle,
  ].map(csvValue)
}

export function recordsToInBodyCsv(records = []) {
  return [INBODY_CSV_HEADERS.join(','), ...records.map(record => inBodyRecordToCsvRow(record).join(','))].join('\n')
}

export function buildImageConvertedInBodyRecord({ analysis, fallback, sourceName, ocrRow } = {}) {
  const metrics = analysis?.metrics || {}
  const pick = (...keys) => {
    for (const key of keys) {
      const raw = metrics[key]
      const parsed = parseNumber(raw)
      if (parsed !== null) return parsed
    }
    return null
  }
  const base = fallback || {}

  // If we have a real OCR-parsed row, use it directly
  const ocr = ocrRow || {}
  const ocrNum = (key) => {
    const v = ocr[key]
    const n = parseNumber(v)
    return n !== null ? n : null
  }

  // Priority: ocrRow['ngày'] → metrics['Ngày đo'] (from Groq vision) → '' (unknown, do NOT use today)
  // IMPORTANT: Never fall back to today's date (compactTimestamp) for image-converted records,
  // because that would record the wrong measurement date. Leave it blank/unknown instead.
  // Note: Groq may use various key names — cover all known variants.
  const metricDate = metrics['Ngày đo'] || metrics['Ngày'] || metrics['Date'] ||
    metrics['Ngày/Giờ kiểm tra'] || metrics['Ngày kiểm tra'] || metrics['Thời gian đo'] ||
    metrics['datetime'] || metrics['date'] || ''
  const metricDateDigits = String(metricDate).replace(/[-/ :T]/g, '').replace(/\D/g, '').slice(0, 14)

  // Validate: metricDateDigits must be a plausible calendar date (not a future date artifact)
  let validatedMetricDateDigits = ''
  if (metricDateDigits.length >= 8) {
    const y = parseInt(metricDateDigits.slice(0, 4), 10)
    const m = parseInt(metricDateDigits.slice(4, 6), 10)
    const d = parseInt(metricDateDigits.slice(6, 8), 10)
    // Accept years 2000–2030, months 1–12, days 1–31
    if (y >= 2000 && y <= 2030 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      validatedMetricDateDigits = metricDateDigits
    }
  }

  const rawDate = ocr['ngày']
    ? String(ocr['ngày']).replace(/\D/g, '').slice(0, 14)
    : validatedMetricDateDigits || ''   // blank = unknown date (never use today as fallback)

  return {
    ...base,
    rawDate,
    date: formatInBodyDate(rawDate),
    shortDate: formatInBodyDate(rawDate, { short: true }),
    device: ocr['Thiết bị đo'] || 'image-ocr',
    sourceName,
    weight:             ocrNum('Cân nặng(kg)')                      ?? pick('Cân nặng', 'Weight', 'Cân nặng(kg)')         ?? base.weight ?? 74.5,
    skeletalMuscle:     ocrNum('Khối lượng cơ xương(kg)')           ?? pick('Cơ xương', 'Skeletal Muscle Mass')            ?? base.skeletalMuscle ?? base.muscle ?? 27.7,
    muscle:             ocrNum('Khối lượng cơ xương(kg)')           ?? pick('Cơ bắp', 'Cơ xương', 'Skeletal Muscle Mass') ?? base.muscle ?? base.skeletalMuscle ?? 27.7,
    bodyFatMass:        ocrNum('Khối lượng mỡ trong cơ thể(kg)')    ?? pick('Khối lượng mỡ', 'Body Fat Mass')             ?? base.bodyFatMass ?? 24.5,
    bmi:                ocrNum('BMI(kg/m²)')                         ?? pick('BMI')                                         ?? base.bmi ?? 27.4,
    fat:                ocrNum('Tỷ lệ mỡ cơ thể(%)')                ?? pick('Mỡ (%)', 'Tỷ lệ mỡ', 'Percent Body Fat')    ?? base.fat ?? 32.8,
    bmr:                ocrNum('Tỷ lệ trao đổi chất cơ bản(kcal)')  ?? pick('BMR', 'Tỷ lệ trao đổi chất cơ bản')         ?? base.bmr ?? 1451,
    score:              ocrNum('Điểm InBody')                         ?? pick('Điểm InBody', 'InBody Score')                ?? base.score ?? 64,
    water:              ocrNum('Lượng nước trong cơ thể(L)')         ?? pick('Nước', 'Lượng nước trong cơ thể')            ?? base.water ?? 36.7,
    intracellularWater: ocrNum('Nước nội bào(L)')                    ?? base.intracellularWater ?? 22.8,
    extracellularWater: ocrNum('Nước ngoại bào(L)')                  ?? base.extracellularWater ?? 13.9,
    ecwRatio:           ocrNum('Tỷ lệ ECW')                          ?? base.ecwRatio ?? 0.379,
    visceralFatLevel:   ocrNum('Mức độ chất béo nội tạng(Level)')    ?? pick('Mỡ nội tạng', 'Visceral Fat Level')          ?? base.visceralFatLevel ?? 10,
    protein:            ocrNum('Protein(kg)')                         ?? base.protein ?? 9.9,
    minerals:           ocrNum('Khoáng chất(kg)')                    ?? base.minerals ?? 3.4,
    boneMineral:        base.boneMineral ?? 2.84,
    bodyCellMass:       base.bodyCellMass ?? 32.7,
    smi:                base.smi ?? 7.7,
    phaseAngle:         ocrNum('Góc pha toàn bộ cơ thể(°)')          ?? base.phaseAngle ?? 5.7,
    rightArmMuscle:     ocrNum('Khối lượng cơ ở cánh tay phải(kg)') ?? base.rightArmMuscle,
    leftArmMuscle:      ocrNum('Khối lượng cơ ở cánh tay trái(kg)') ?? base.leftArmMuscle,
    trunkMuscle:        ocrNum('Khối lượng cơ ở thân mình(kg)')      ?? base.trunkMuscle,
    rightLegMuscle:     ocrNum('Khối lượng cơ ở chân phải(kg)')      ?? base.rightLegMuscle,
    leftLegMuscle:      ocrNum('Khối lượng cơ ở chân trái(kg)')      ?? base.leftLegMuscle,
  }
}
