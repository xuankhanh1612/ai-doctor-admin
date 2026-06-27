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
function readMeta(ownerUuid) {
  try { return JSON.parse(localStorage.getItem(getMetaKey(ownerUuid)) || '{}') } catch { return {} }
}

// ── Tạo bệnh nhân từ hồ sơ upload ──────────────────────────────────────────
function translateMedicalData(lang, key, vars = {}) {
  const dict = {
    vi: {
      uploadedTimelineEvent: 'Upload {type}: {label}',
      uploadedSummary: 'Tổng cộng {count} hồ sơ được tải lên',
      uploadPatientName: 'Bệnh nhân Upload',
      pendingAnalysis: 'Đang chờ phân tích',
      aiDetailFallback: 'Xem chi tiết phân tích AI',
    },
    en: {
      uploadedTimelineEvent: 'Uploaded {type}: {label}',
      uploadedSummary: '{count} records uploaded in total',
      uploadPatientName: 'Upload Patient',
      pendingAnalysis: 'Pending analysis',
      aiDetailFallback: 'View detailed AI analysis',
    },
  }
  const template = dict[lang]?.[key] || dict.vi[key] || key
  return Object.entries(vars).reduce((text, [name, value]) => text.replace(`{${name}}`, value), template)
}

export function recordsToPatient(records, base = {}, ownerUuid = null, lang = 'vi') {
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
      event: translateMedicalData(lang, 'uploadedTimelineEvent', { type: r.fileType?.toUpperCase() || 'FILE', label }),
      type:  r.fileType === 'pdf' ? 'lab' : 'imaging',
    })

    // Image uploads are always reflected in Patient Record > Imaging, even before AI analysis.
    if (r.fileType !== 'pdf' && r.mimeType?.startsWith?.('image/')) {
      imagingArr.push({
        id:            `img_${r.id}`,
        type:          label,
        date,
        modality:      fileTypeToModality(r.fileType),
        ai_confidence: ai?.summary ? Math.round((ai.confidence || 0.85) * 100) : 0,
        findings:      ai?.summary?.slice(0, 300) || (lang === 'vi' ? `Ảnh do ${r.ownerName || 'user'} upload, đang chờ AI phân tích.` : `Image uploaded by ${r.ownerName || 'user'}, pending AI analysis.`),
        impression:    ai?.recommendation || ai?.findings?.[0] || (lang === 'vi' ? 'Đồng bộ từ Medical Upload Records.' : 'Synced from Medical Upload Records.'),
        dataUrl:       r.dataUrl,
        uploadedBy:    r.ownerUuid,
        uploadedByName:r.ownerName,
        uploadedAt:    r.uploadedAt,
        raw:           r,
      })
    }

    // PDF uploads from the primary patient become Labs / Documents immediately.
    if (r.fileType === 'pdf' || r.mimeType === 'application/pdf') {
      labsArr.push({
        id:       `labfile_${r.id}`,
        name:     label,
        value:    ai?.summary ? (lang === 'vi' ? 'Đã phân tích AI' : 'AI analyzed') : 'PDF',
        unit:     '',
        ref_high: null,
        date,
        trend:    'stable',
        critical: false,
        documentUrl: r.dataUrl,
        uploadedBy: r.ownerUuid,
        uploadedByName: r.ownerName,
        uploadedAt: r.uploadedAt,
        raw: r,
      })
    }

    // Nếu có AI analysis → parse thành disease / lab evidence
    if (ai?.summary) {
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
    event: translateMedicalData(lang, 'uploadedSummary', { count: records.length }),
    type:  'consult',
  })

  const meta = readMeta(ownerUuid)
  return {
    id:               meta.patientId || `P-${Date.now()}`,
    name:             base.name      || translateMedicalData(lang, 'uploadPatientName'),
    age:              base.age       || '—',
    gender:           base.gender    || '—',
    dob:              base.dob       || '—',
    blood_type:       base.blood_type|| '—',
    avatar_initials:  base.name ? base.name.slice(0, 2).toUpperCase() : 'UP',
    diseases:         diseases.length ? diseases : [{ id: 'd0', name: translateMedicalData(lang, 'pendingAnalysis'), icd10: 'Z00.0', onset: '—', severity: 'mild' }],
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
      user:   r.ownerName || 'upload',
      ownerUuid: r.ownerUuid || null,
      ownerName: r.ownerName || '',
      action: lang === 'vi'
        ? `${r.ownerName || 'User'} tải lên ${r.fileType?.toUpperCase() || 'FILE'}: ${r.filename || r.name}${hasAI ? ' · ✓ AI phân tích' : ''}`
        : `${r.ownerName || 'User'} uploaded ${r.fileType?.toUpperCase() || 'FILE'}: ${r.filename || r.name}${hasAI ? ' · ✓ AI analyzed' : ''}`,
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
export function useMedicalData({ lang = 'vi', autoRefresh = true, ownerUuid: ownerUuidOverride = null, includeUnowned: includeUnownedOverride = null, includeAll = false } = {}) {
  const { user } = useAuth()
  const ownerUuid = ownerUuidOverride ?? user?.uuid ?? null
  const includeUnowned = includeUnownedOverride ?? !!user?.isAdmin
  const [records, setRecords]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const pollRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const recs = await getAllRecords({ ownerUuid, includeUnowned, includeAll })
      setRecords(recs)
      setLastUpdated(new Date())
    } catch (e) {
      console.warn('[useMedicalData] load error:', e)
    } finally {
      setLoading(false)
    }
  }, [ownerUuid, includeUnowned, includeAll])

  useEffect(() => {
    load()

    if (!autoRefresh) return

    // Listen for cross-tab upload notifications
    const onStorage = (e) => {
      if (e.key === LS_NOTIFY || e.key === LS_META || e.key === getMetaKey(ownerUuid)) load()
    }
    const onUploadNotify = () => load()
    window.addEventListener('storage', onStorage)
    window.addEventListener('cdoc_medical_records_changed', onUploadNotify)

    // Polling fallback every 8s (catches same-tab updates)
    pollRef.current = setInterval(load, includeAll ? 2500 : 8000)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('cdoc_medical_records_changed', onUploadNotify)
      clearInterval(pollRef.current)
    }
  }, [load, autoRefresh, includeAll, ownerUuid])

  // Derived data
  const patientOwner   = records[0]?.ownerUuid || (records[0] ? null : ownerUuid)
  const patient        = recordsToPatient(records, {}, patientOwner, lang)
  const activities     = recordsToActivity(records, lang)
  const totalFiles     = records.length
  const aiAnalyzed     = records.filter(r => r.aiAnalysis).length
  const byType         = records.reduce((acc, r) => { acc[r.fileType] = (acc[r.fileType] || 0) + 1; return acc }, {})
  const totalSizeMB    = (records.reduce((s, r) => s + (r.size || 0), 0) / 1048576).toFixed(1)

  const remove = useCallback(async (id) => {
    await deleteRecord(id, { ownerUuid, includeUnowned, includeAll })
    await load()
    // Notify other tabs
    localStorage.setItem(LS_NOTIFY, Date.now().toString())
  }, [load, ownerUuid, includeUnowned, includeAll])

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
  window.dispatchEvent(new CustomEvent('cdoc_medical_records_changed'))
}
