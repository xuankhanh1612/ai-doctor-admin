/**
 * anonDB.js — IndexedDB storage for anonymous (guest) users
 *
 * Why IndexedDB instead of localStorage?
 *   • localStorage: ~5 MB quota, synchronous, blocks main thread
 *   • IndexedDB:   ~50-500 MB+ quota (origin-based), async, non-blocking
 *
 * Database layout:
 *   DB name : "cdoc_guest"
 *   Version : 1
 *   Stores  :
 *     "session"   — keyPath: "id" (always one row, id="anon")  → guest profile
 *     "journey"   — keyPath: "id", autoIncrement               → health journey entries
 *     "inventory" — keyPath: "id"                              → inventory items
 *     "records"   — keyPath: "id", autoIncrement               → medical records / uploads
 *     "settings"  — keyPath: "key"                             → arbitrary key/value config
 */

const DB_NAME = 'cdoc_guest'
const DB_VERSION = 1

// ─── Open / upgrade ───────────────────────────────────────────────────────────
let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result

      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('journey')) {
        const s = db.createObjectStore('journey', { keyPath: 'id', autoIncrement: true })
        s.createIndex('by_date', 'date')
      }
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('records')) {
        const s = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true })
        s.createIndex('by_type', 'type')
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror   = (e) => reject(e.target.error)
  })
}

// ─── Generic helpers ──────────────────────────────────────────────────────────
function tx(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  }))
}

function getAll(storeName) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const req = transaction.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  }))
}

function clearStore(storeName) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const req = transaction.objectStore(storeName).clear()
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  }))
}

// ─── Session (guest profile) ─────────────────────────────────────────────────
export async function getAnonSession() {
  try {
    return await tx('session', 'readonly', s => s.get('anon'))
  } catch {
    return null
  }
}

export async function saveAnonSession(data) {
  if (!data) return clearStore('session')
  return tx('session', 'readwrite', s => s.put({ ...data, id: 'anon' }))
}

export async function deleteAnonSession() {
  return tx('session', 'readwrite', s => s.delete('anon'))
}

// ─── Journey entries ──────────────────────────────────────────────────────────
export async function getJourneyEntries() {
  return getAll('journey')
}

export async function addJourneyEntry(entry) {
  return tx('journey', 'readwrite', s => s.add({ ...entry, createdAt: new Date().toISOString() }))
}

export async function putJourneyEntry(entry) {
  return tx('journey', 'readwrite', s => s.put(entry))
}

export async function deleteJourneyEntry(id) {
  return tx('journey', 'readwrite', s => s.delete(id))
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export async function getInventory() {
  return getAll('inventory')
}

export async function putInventoryItem(item) {
  return tx('inventory', 'readwrite', s => s.put(item))
}

export async function deleteInventoryItem(id) {
  return tx('inventory', 'readwrite', s => s.delete(id))
}

// ─── Medical records / file uploads ──────────────────────────────────────────
export async function getRecords() {
  return getAll('records')
}

export async function addRecord(record) {
  // `record.file` can be an ArrayBuffer or Blob — IndexedDB handles binary natively
  return tx('records', 'readwrite', s => s.add({ ...record, createdAt: new Date().toISOString() }))
}

export async function deleteRecord(id) {
  return tx('records', 'readwrite', s => s.delete(id))
}

// ─── Settings (arbitrary key/value) ──────────────────────────────────────────
export async function getSetting(key) {
  try {
    const row = await tx('settings', 'readonly', s => s.get(key))
    return row?.value ?? null
  } catch {
    return null
  }
}

export async function setSetting(key, value) {
  return tx('settings', 'readwrite', s => s.put({ key, value }))
}

// ─── Nuke everything (on logout / account upgrade) ───────────────────────────
export async function clearAllGuestData() {
  await Promise.all(['session', 'journey', 'inventory', 'records', 'settings'].map(clearStore))
}

// ─── Export size estimate (for display in UI) ─────────────────────────────────
export async function estimateGuestStorageBytes() {
  if (navigator.storage?.estimate) {
    const { usage } = await navigator.storage.estimate()
    return usage ?? 0
  }
  return 0
}
