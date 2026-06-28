// src/lib/generalPractitionerChatStorage.js
// AI Bác sĩ đa khoa / Đồng hành cảm xúc (CheckinPanel + EmotionalCompanionView)
// — lưu trữ lịch sử chat vào IndexedDB, khoá theo uuid của user (field nhận diện
// thống nhất cho mọi loại user — guest hay đã đăng nhập).
// CheckinPanel và EmotionalCompanionView dùng CHUNG 1 lịch sử (cùng 1 AI), nên
// cả 2 nơi gọi cùng các hàm này với cùng uuid.
// Cùng pattern raw IndexedDB như src/lib/globalChatbotStorage.js.

const DB_NAME    = 'gp-chat-db'
const DB_VERSION = 1
const STORE      = 'chat-sessions' // 1 record = 1 ownerKey → { messages: [...] }

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) { reject(new Error('IndexedDB unavailable')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'ownerKey' })
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

async function idbGet(ownerKey) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(ownerKey)
    req.onsuccess = () => res(req.result || null)
    req.onerror   = () => rej(req.error)
  })
}

async function idbDelete(ownerKey) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(ownerKey)
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

// uuid là field nhận diện thống nhất cho mọi loại user (guest hay đã đăng nhập).
// Khách chưa có session vẫn dùng được — nhóm chung vào 'guest' thay vì mất dữ liệu.
function ownerKeyOf(uuid) {
  return uuid ? String(uuid).toLowerCase() : 'guest'
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Lấy toàn bộ lịch sử chat GP đã lưu của user (theo uuid). Trả về [] nếu chưa có.
export async function getGpChatHistory(uuid) {
  try {
    const rec = await idbGet(ownerKeyOf(uuid))
    return rec?.messages || []
  } catch {
    return []
  }
}

// Ghi đè toàn bộ lịch sử chat GP của user (gọi sau mỗi lần messages đổi).
export async function saveGpChatHistory(uuid, messages) {
  const ownerKey = ownerKeyOf(uuid)
  try {
    const existing = await idbGet(ownerKey)
    await idbPut({
      ownerKey,
      messages,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[generalPractitionerChatStorage] save error:', e)
  }
}

// Xoá toàn bộ lịch sử chat GP của user.
export async function clearGpChatHistory(uuid) {
  try {
    await idbDelete(ownerKeyOf(uuid))
  } catch (e) {
    console.error('[generalPractitionerChatStorage] clear error:', e)
  }
}
