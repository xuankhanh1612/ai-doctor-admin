// src/lib/medicalStorage.js
// Ported từ ai-clinic-khanh-main/lib/medicalStorage.ts
// AI Clinic — Medical file storage via IndexedDB + localStorage metadata

// ─── IndexedDB ────────────────────────────────────────────────────────────────
const DB_NAME    = 'ai-clinic-medical-db'
const DB_VERSION = 1
const STORE      = 'medical-files'
const LS_META    = 'ai-clinic-patient-meta'


function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('SSR')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' })
        s.createIndex('uploadedAt', 'uploadedAt', { unique: false })
        s.createIndex('fileType',   'fileType',   { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function idbPut(file) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(file)
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

async function idbGetAll() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).index('uploadedAt').getAll()
    req.onsuccess = () => res([...req.result].reverse())
    req.onerror   = () => rej(req.error)
  })
}

async function idbDelete(id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

// ─── Normalize record (support cả old field names lẫn new) ──────────────────
function norm(partial, options = {}) {
  const filename = partial.filename || partial.name || 'unknown'
  const fileType = partial.fileType || partial.type || 'photo'
  const ownerEmail = partial.ownerEmail || options.ownerEmail || null
  return {
    ...partial,
    filename,  name: filename,
    fileType,  type: fileType,
    mimeType:  partial.mimeType   || 'image/jpeg',
    size:      partial.size       || 0,
    uploadedAt:partial.uploadedAt || new Date().toISOString(),
    ownerEmail,
    ownerName: partial.ownerName || options.ownerName || '',
    ownerAvatar: partial.ownerAvatar || options.ownerAvatar || '',
    ownerProvider: partial.ownerProvider || options.ownerProvider || '',
    isDemo:    partial.isDemo ?? (!ownerEmail && options.markAsDemo === true),
    sourceModule: partial.sourceModule || options.sourceModule || '',
    uploadFolder: partial.uploadFolder || options.uploadFolder || '',
    uploadPath: partial.uploadPath || options.uploadPath || '',
    dataUrl:   partial.dataUrl    || '',
    base64Data:partial.base64Data || '',
  }
}

// ─── localStorage metadata (không lưu base64 vào LS) ─────────────────────────
function metaKey(ownerEmail) {
  return ownerEmail ? `${LS_META}:${ownerEmail}` : LS_META
}

export function getMetaKey(ownerEmail) {
  return metaKey(ownerEmail)
}

function lsMeta(ownerEmail) {
  try {
    const raw = localStorage.getItem(metaKey(ownerEmail))
    return raw ? JSON.parse(raw) : { patientId: `p_${Date.now()}`, fileIds: [], updatedAt: '' }
  } catch {
    return { patientId: `p_${Date.now()}`, fileIds: [], updatedAt: '' }
  }
}

function lsSetMeta(patientId, fileIds, ownerEmail) {
  localStorage.setItem(metaKey(ownerEmail), JSON.stringify({ patientId, fileIds, ownerEmail: ownerEmail || null, updatedAt: new Date().toISOString() }))
}

// ─── Async API (chính) ────────────────────────────────────────────────────────

function canSeeRecord(record, { ownerEmail, includeUnowned = false, includeAll = false } = {}) {
  if (includeAll) return true
  if (ownerEmail && record.ownerEmail === ownerEmail) return true
  // Legacy/unowned records are treated as demo data. They are visible only when
  // explicitly requested (admin demo view), never to ordinary users.
  if (includeUnowned && !record.ownerEmail) return true
  return false
}

export async function getAllRecords(options = {}) {
  try {
    const records = await idbGetAll()
    return records.filter(record => canSeeRecord(record, options))
  } catch { return [] }
}

export async function saveRecord(file, options = {}) {
  const normalized = norm(file, options)
  await idbPut(normalized)
  const meta = lsMeta(normalized.ownerEmail)
  const ids  = [normalized.id, ...meta.fileIds.filter(i => i !== normalized.id)]
  lsSetMeta(meta.patientId, ids, normalized.ownerEmail)
}

export async function getRecord(id, options = {}) {
  const all = await getAllRecords(options)
  return all.find(f => f.id === id) || null
}

export async function updateAnalysis(id, analysis, options = {}) {
  const f = await getRecord(id, options)
  if (f) await idbPut({ ...f, aiAnalysis: analysis })
}

export async function deleteRecord(id, options = {}) {
  const f = await getRecord(id, options)
  if (!f) return
  await idbDelete(id)
  const meta = lsMeta(f.ownerEmail)
  lsSetMeta(meta.patientId, meta.fileIds.filter(i => i !== id), f.ownerEmail)
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

export function detectFileType(mimeType, filename) {
  if (mimeType === 'application/pdf') return 'pdf'
  const l = (filename || '').toLowerCase()
  if (l.match(/\bct\b|computed.tomography/)) return 'ct'
  if (l.match(/\bmri\b|magnetic.resonance/))  return 'mri'
  if (l.match(/xray|x.ray|chest|lung|phoi/))  return 'xray'
  return 'photo'
}

export function fileTypeLabel(type) {
  return { xray: 'X-Ray', ct: 'CT Scan', mri: 'MRI', pdf: 'PDF / Hồ sơ', photo: 'Ảnh chụp' }[type] || type
}

export function fileTypeIcon(type) {
  return { xray: '🩻', ct: '🔬', mri: '🧲', pdf: '📄', photo: '📷' }[type] || '📎'
}

export function formatBytes(bytes) {
  if (bytes < 1024)    return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export const formatSize = formatBytes

export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

export function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}
