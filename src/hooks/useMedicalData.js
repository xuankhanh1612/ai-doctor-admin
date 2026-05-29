// src/hooks/useMedicalData.js
// ─────────────────────────────────────────────────────────────────────────────
// Bridge dữ liệu từ MedicalUploader (IndexedDB) → AdminPanel, PatientRecord,
// Nhật ký hoạt động. Real-time sync qua storage event + polling fallback.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getAllRecords, deleteRecord, getMetaKey } from '../lib/medicalStorage.js'

const LS_META   = 'ai-clinic-patient-meta'
const LS_NOTIFY = 'ai-clinic-upload-notify'   // ping key để trigger cross-tab sync

// ── Đọc metadata bệnh nhân từ localStorage (từ medicalStorage.js) ──────────
function readMeta(ownerEmail) {
  try { return JSON.parse(localStorage.getItem(getMetaKey(ownerEmail)) || '{}') } catch { return {} }
}

// ── Tạo bệnh nhân từ hồ sơ upload ──────────────────────────────────────────
export function recordsToPatient(records, base = {}, ownerEmail = null) {
  if (!records.length) return null

  // Gộp tất cả AI analysis thành diseases / imaging / timeline
  const diseases  = []
  const imagingArr= []
  const timeline  = []
  const labsArr   = []

  records.forEach((r, i) => {
    const date = r.uploadedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    const label = r.filename || r.name || `File ${i + 1}`
    const ai    = r.aiAnalysis

    // Timeline entry cho mỗi file upload
    timeline.push({
      id:   `tl_${r.id}`,
      date,
      event: `Upload ${r.fileType?.toUpperCase() || 'FILE'}: ${label}`,
      type:  r.fileType === 'pdf' ? 'lab' : 'imaging',
    })

    // Nếu có AI analysis → parse thành imaging entry
    if (ai?.summary) {
      imagingArr.push({
        id:            `img_${r.id}`,
        type:          label,
        date,
        modality:      fileTypeToModality(r.fileType),
        ai_confidence: Math.round((ai.confidence || 0.85) * 100),
        findings:      ai.summary.slice(0, 300),
        impression:    ai.recommendation || ai.findings?.[0] || 'Xem chi tiết phân tích AI',
        dataUrl:       r.dataUrl,
        raw:           r,
      })

      // Nếu AI phát hiện bệnh → thêm vào diseases
      const severityKeywords = { critical: ['ung thư', 'cancer', 'tumor', 'khối u', 'malignant', 'metastasis', 'di căn'], moderate: ['viêm', 'inflammation', 'infiltrate', 'fibrosis'], mild: ['nhẹ', 'mild', 'minor'] }
      const summaryLower = ai.summary.toLowerCase()
      let severity = 'mild'
      if (severityKeywords.critical.some(k => summaryLower.includes(k))) severity = 'critical'
      else if (severityKeywords.moderate.some(k => summaryLower.includes(k))) severity = 'moderate'

      if (severity !== 'mild' || imagingArr.length <= 2) {
        diseases.push({
          id:       `d_${r.id}`,
          name:     `${fileTypeToModality(r.fileType)} — ${label}`,
          icd10:    'Z00.0',
          onset:    date.slice(0, 7),
          severity,
          primary_unknown: false,
        })
      }

      // Labs từ PDF
      if (r.fileType === 'pdf' && ai.findings?.length) {
        ai.findings.slice(0, 5).forEach((f, fi) => {
          labsArr.push({
            id:       `lab_${r.id}_${fi}`,
            name:     f.slice(0, 30),
            value:    '—', unit: '', ref_high: null,
            date, trend: 'stable', critical: false,
          })
        })
      }
    }
  })

  // Thêm timeline entry tổng
  timeline.push({
    id:    'tl_first',
    date:  records[records.length - 1]?.uploadedAt?.slice(0, 10) || '—',
    event: `Tổng cộng ${records.length} hồ sơ được tải lên`,
    type:  'consult',
  })

  const meta = readMeta(ownerEmail)
  return {
    id:               meta.patientId || `P-${Date.now()}`,
    name:             base.name      || 'Bệnh nhân Upload',
    age:              base.age       || '—',
    gender:           base.gender    || '—',
    dob:              base.dob       || '—',
    blood_type:       base.blood_type|| '—',
    avatar_initials:  base.name ? base.name.slice(0, 2).toUpperCase() : 'UP',
    diseases:         diseases.length ? diseases : [{ id: 'd0', name: 'Đang chờ phân tích', icd10: 'Z00.0', onset: '—', severity: 'mild' }],
    symptoms:         base.symptoms  || [],
    labs:             labsArr,
    imaging:          imagingArr,
    medications:      base.medications || [],
    allergies:        base.allergies   || [],
    genomics:         base.genomics    || [],
    risk_factors:     base.risk_factors|| [],
    timeline:         timeline.sort((a, b) => b.date.localeCompare(a.date)),
    // Raw records để render thumbnail
    _records:         records,
    _fromUpload:      true,
  }
}

function fileTypeToModality(type) {
  return { xray: 'X-Ray', ct: 'CT', mri: 'MRI', pdf: 'PDF', photo: 'US' }[type] || 'IMG'
}

// ── Activity log từ records ──────────────────────────────────────────────────
export function recordsToActivity(records, lang = 'vi') {
  return records.map(r => {
    const elapsed = elapsedTime(r.uploadedAt, lang)
    const hasAI   = !!r.aiAnalysis
    return {
      id:     r.id,
      time:   elapsed,
      user:   'upload',
      action: lang === 'vi'
        ? `Tải lên ${r.fileType?.toUpperCase() || 'FILE'}: ${r.filename || r.name}${hasAI ? ' · ✓ AI phân tích' : ''}`
        : `Uploaded ${r.fileType?.toUpperCase() || 'FILE'}: ${r.filename || r.name}${hasAI ? ' · ✓ AI analyzed' : ''}`,
      type:   'upload',
      fileType: r.fileType,
      hasAI,
      raw:    r,
    }
  })
}

function elapsedTime(iso, lang = 'vi') {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (lang === 'vi') {
    if (mins < 1)  return 'Vừa xong'
    if (mins < 60) return `${mins} phút trước`
    if (hours < 24)return `${hours} giờ trước`
    return `${days} ngày trước`
  } else {
    if (mins < 1)  return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24)return `${hours}h ago`
    return `${days}d ago`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────────────────────
export function useMedicalData({ lang = 'vi', autoRefresh = true, ownerEmail: ownerEmailOverride = null, includeUnowned: includeUnownedOverride = null } = {}) {
  const { user } = useAuth()
  const ownerEmail = ownerEmailOverride ?? user?.email ?? null
  const includeUnowned = includeUnownedOverride ?? !!user?.isAdmin
  const [records, setRecords]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const pollRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const recs = await getAllRecords({ ownerEmail, includeUnowned })
      setRecords(recs)
      setLastUpdated(new Date())
    } catch (e) {
      console.warn('[useMedicalData] load error:', e)
    } finally {
      setLoading(false)
    }
  }, [ownerEmail, includeUnowned])

  useEffect(() => {
    load()

    if (!autoRefresh) return

    // Listen for cross-tab upload notifications
    const onStorage = (e) => {
      if (e.key === LS_NOTIFY || e.key === LS_META || e.key === getMetaKey(ownerEmail)) load()
    }
    window.addEventListener('storage', onStorage)

    // Polling fallback every 8s (catches same-tab updates)
    pollRef.current = setInterval(load, 8000)

    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(pollRef.current)
    }
  }, [load, autoRefresh])

  // Derived data
  const patientOwner   = records[0]?.ownerEmail || (records[0] ? null : ownerEmail)
  const patient        = recordsToPatient(records, {}, patientOwner)
  const activities     = recordsToActivity(records, lang)
  const totalFiles     = records.length
  const aiAnalyzed     = records.filter(r => r.aiAnalysis).length
  const byType         = records.reduce((acc, r) => { acc[r.fileType] = (acc[r.fileType] || 0) + 1; return acc }, {})
  const totalSizeMB    = (records.reduce((s, r) => s + (r.size || 0), 0) / 1048576).toFixed(1)

  const remove = useCallback(async (id) => {
    await deleteRecord(id, { ownerEmail, includeUnowned })
    await load()
    // Notify other tabs
    localStorage.setItem(LS_NOTIFY, Date.now().toString())
  }, [load, ownerEmail, includeUnowned])

  const refresh = load

  return {
    records,
    loading,
    lastUpdated,
    // Derived
    patient,        // patient object shaped for PatientRecordPanel
    activities,     // activity log for AdminPanel
    // Stats
    totalFiles,
    aiAnalyzed,
    byType,
    totalSizeMB,
    // Actions
    remove,
    refresh,
  }
}

// ── Notify hook: gọi từ MedicalUploader sau khi upload xong ─────────────────
export function notifyUpload() {
  localStorage.setItem(LS_NOTIFY, Date.now().toString())
}
