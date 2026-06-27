// src/lib/beMeoChatStorage.js
// Bé Mèo Nước — lưu trữ TOÀN BỘ (100%) chat + lượng nước uống hàng ngày vào IndexedDB,
// theo uuid của user (field nhận diện thống nhất cho mọi loại user) + theo ngày (YYYY-MM-DD).
// Thay thế localStorage cũ
// (be-meo-nuoc-water-state-v1 / be-meo-nuoc-chat-v1) để không còn giới hạn 80 tin nhắn
// và không còn bị trộn dữ liệu giữa các user dùng chung máy.
// Theo cùng pattern raw IndexedDB như src/lib/medicalStorage.js và wikiMedVisionChatStorage.js.

const DB_NAME    = 'be-meo-nuoc-db'
const DB_VERSION = 1
const STORE      = 'days' // 1 record = 1 (user, ngày) → { messages: [...], water: { total, goal } }

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) { reject(new Error('IndexedDB unavailable')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' }) // id = `${ownerKey}::${date}`
        s.createIndex('ownerKey', 'ownerKey', { unique: false })
        s.createIndex('date',     'date',     { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function idbPut(record) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

async function idbGet(id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => res(req.result || null)
    req.onerror   = () => rej(req.error)
  })
}

async function idbGetAllByOwner(ownerKey) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).index('ownerKey').getAll(ownerKey)
    req.onsuccess = () => res(req.result || [])
    req.onerror   = () => rej(req.error)
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Khách chưa đăng nhập vẫn dùng được widget — nhóm chung vào 'guest' thay vì mất dữ liệu.
function ownerKeyOf(uuid) {
  return uuid ? String(uuid).toLowerCase() : 'guest'
}

// YYYY-MM-DD theo giờ local của máy (không dùng UTC để tránh lệch ngày qua nửa đêm).
export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function recordId(ownerKey, date) {
  return `${ownerKey}::${date}`
}

// Số ngày thực tế của một tháng dương lịch — tự đúng cho năm nhuận (28/29/30/31).
export function daysInMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Lấy dữ liệu 1 ngày của user: { messages, water: { total, goal } } — null nếu chưa có gì.
export async function getDay(uuid, date) {
  try {
    return await idbGet(recordId(ownerKeyOf(uuid), date))
  } catch {
    return null
  }
}

// Ghi đè toàn bộ dữ liệu 1 ngày (messages đầy đủ — KHÔNG cắt bớt — + lượng nước).
export async function saveDay(uuid, date, { messages, water }) {
  const ownerKey = ownerKeyOf(uuid)
  const id = recordId(ownerKey, date)
  try {
    const existing = await idbGet(id)
    await idbPut({
      id,
      ownerKey,
      date,
      messages: Array.isArray(messages) ? messages : (existing?.messages || []),
      water: water || existing?.water || { total: 0, goal: 2000 },
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[beMeoChatStorage] saveDay error:', e)
  }
}

// Lấy bản đồ { 'YYYY-MM-DD': { total, goal } } cho TOÀN BỘ lịch sử của user
// — dùng để vẽ calendar của bất kỳ tháng/năm nào mà không cần load lại mỗi lần đổi tháng.
export async function getAllWaterHistory(uuid) {
  const ownerKey = ownerKeyOf(uuid)
  try {
    const records = await idbGetAllByOwner(ownerKey)
    const map = {}
    for (const r of records) {
      map[r.date] = r.water || { total: 0, goal: 2000 }
    }
    return map
  } catch {
    return {}
  }
}

// Lấy toàn bộ message đã lưu của user cho một ngày cụ thể — không giới hạn số lượng.
export async function getMessagesForDay(uuid, date) {
  const day = await getDay(uuid, date)
  return day?.messages || []
}
