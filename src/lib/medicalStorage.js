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
function norm(partial) {
  const filename = partial.filename || partial.name || 'unknown'
  const fileType = partial.fileType || partial.type || 'photo'
  return {
    ...partial,
    filename,  name: filename,
    fileType,  type: fileType,
    mimeType:  partial.mimeType   || 'image/jpeg',
    size:      partial.size       || 0,
    uploadedAt:partial.uploadedAt || new Date().toISOString(),
    dataUrl:   partial.dataUrl    || '',
    base64Data:partial.base64Data || '',
  }
}

// ─── localStorage metadata (không lưu base64 vào LS) ─────────────────────────
function lsMeta() {
  try {
    const raw = localStorage.getItem(LS_META)
    return raw ? JSON.parse(raw) : { patientId: `p_${Date.now()}`, fileIds: [], updatedAt: '' }
  } catch {
    return { patientId: `p_${Date.now()}`, fileIds: [], updatedAt: '' }
  }
}

function lsSetMeta(patientId, fileIds) {
  localStorage.setItem(LS_META, JSON.stringify({ patientId, fileIds, updatedAt: new Date().toISOString() }))
}

// ─── Async API (chính) ────────────────────────────────────────────────────────

export async function getAllRecords() {
  try { return await idbGetAll() } catch { return [] }
}

export async function saveRecord(file) {
  await idbPut(norm(file))
  const meta = lsMeta()
  const ids  = [file.id, ...meta.fileIds.filter(i => i !== file.id)]
  lsSetMeta(meta.patientId, ids)
}

export async function getRecord(id) {
  const all = await getAllRecords()
  return all.find(f => f.id === id) || null
}

export async function updateAnalysis(id, analysis) {
  const f = await getRecord(id)
  if (f) await idbPut({ ...f, aiAnalysis: analysis })
}

export async function deleteRecord(id) {
  await idbDelete(id)
  const meta = lsMeta()
  lsSetMeta(meta.patientId, meta.fileIds.filter(i => i !== id))
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
