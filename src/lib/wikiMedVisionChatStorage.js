// src/lib/wikiMedVisionChatStorage.js
// Wiki Med Vision Agent — lưu trữ lịch sử chat vào IndexedDB, khoá theo uuid của user + theo ngày.
// Theo cùng pattern raw IndexedDB như src/lib/medicalStorage.js (không thêm dependency mới).

// ─── IndexedDB ────────────────────────────────────────────────────────────────
const DB_NAME    = 'wiki-med-vision-db'
const DB_VERSION = 1
const STORE       = 'chat-days'        // 1 record = 1 (user, ngày) → { messages: [...] }
const LS_STREAK   = 'wmv_streak_meta'  // localStorage cache nhẹ cho streak (đọc nhanh, không cần mở IDB)

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

async function idbDelete(id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// uuid là field nhận diện thống nhất cho mọi loại user. Khách chưa có session vẫn dùng được — nhóm chung vào 'guest' thay vì mất dữ liệu.
function ownerKeyOf(uuid) {
  return uuid ? String(uuid).toLowerCase() : 'guest'
}

// YYYY-MM-DD theo giờ local của máy người dùng (không dùng UTC để tránh lệch ngày).
export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function recordId(ownerKey, date) {
  return `${ownerKey}::${date}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Lấy toàn bộ message đã lưu của user, cho một ngày cụ thể (mặc định hôm nay).
export async function getMessagesForDay(uuid, date = todayKey()) {
  try {
    const rec = await idbGet(recordId(ownerKeyOf(uuid), date))
    return rec?.messages || []
  } catch {
    return []
  }
}

// Ghi đè toàn bộ message của ngày hôm nay cho user này (gọi sau mỗi lần messages đổi).
export async function saveMessagesForDay(uuid, messages, date = todayKey()) {
  const ownerKey = ownerKeyOf(uuid)
  const id = recordId(ownerKey, date)
  try {
    const existing = await idbGet(id)
    await idbPut({
      id,
      ownerKey,
      date,
      messages,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    bumpStreakCache(ownerKey, date, messages.length)
  } catch (e) {
    console.error('[wikiMedVisionChatStorage] save error:', e)
  }
}

// Xoá lịch sử của một ngày (dùng cho nút "xoá ngày này" nếu cần).
export async function clearMessagesForDay(uuid, date = todayKey()) {
  const ownerKey = ownerKeyOf(uuid)
  try {
    await idbDelete(recordId(ownerKey, date))
    bumpStreakCache(ownerKey, date, 0)
  } catch (e) {
    console.error('[wikiMedVisionChatStorage] clear error:', e)
  }
}

// Trả về { 'YYYY-MM-DD': messageCount, ... } cho toàn bộ lịch sử của user — dùng để vẽ lịch streak.
export async function getActivityMap(uuid) {
  const ownerKey = ownerKeyOf(uuid)
  try {
    const records = await idbGetAllByOwner(ownerKey)
    const map = {}
    for (const r of records) {
      map[r.date] = Array.isArray(r.messages) ? r.messages.filter(m => m.role === 'user').length : 0
    }
    return map
  } catch {
    return {}
  }
}

// ─── Streak cache nhẹ trong localStorage ─────────────────────────────────────
// Tránh phải mở IndexedDB chỉ để vẽ lại số liệu streak khi component mount.
function streakCacheKey(ownerKey) {
  return `${LS_STREAK}:${ownerKey}`
}

function bumpStreakCache(ownerKey, date, userMsgCount) {
  try {
    const raw = localStorage.getItem(streakCacheKey(ownerKey))
    const cache = raw ? JSON.parse(raw) : {}
    cache[date] = userMsgCount
    localStorage.setItem(streakCacheKey(ownerKey), JSON.stringify(cache))
  } catch { /* best-effort cache; im lặng nếu lỗi */ }
}

export function getStreakCache(uuid) {
  try {
    const raw = localStorage.getItem(streakCacheKey(ownerKeyOf(uuid)))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Tính độ dài streak hiện tại (số ngày liên tiếp tính đến hôm nay có ít nhất 1 lượt chat).
export function computeCurrentStreak(activityMap, today = todayKey()) {
  let streak = 0
  const cursor = new Date(`${today}T00:00:00`)
  for (let i = 0; i < 366; i++) {
    const key = todayKey(cursor)
    if ((activityMap[key] || 0) > 0) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
