// src/lib/globalChatbotStorage.js
// GlobalAIChatbot — lưu trữ lịch sử chat vào IndexedDB, khoá theo uuid của user
// (field nhận diện thống nhất cho mọi loại user — guest hay đã đăng nhập).
// Cùng pattern raw IndexedDB như src/lib/wikiMedVisionChatStorage.js, nhưng
// đơn giản hơn: 1 record = 1 user (không tách theo ngày, không streak).

const DB_NAME    = 'global-ai-chatbot-db'
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

// Lấy toàn bộ lịch sử chat đã lưu của user (theo uuid).
export async function getGlobalChatHistory(uuid) {
  try {
    const rec = await idbGet(ownerKeyOf(uuid))
    return rec?.messages || []
  } catch {
    return []
  }
}

// Ghi đè toàn bộ lịch sử chat của user (gọi sau mỗi lần messages đổi).
export async function saveGlobalChatHistory(uuid, messages) {
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
    console.error('[globalChatbotStorage] save error:', e)
  }
}

// Xoá toàn bộ lịch sử chat của user (dùng cho nút "xoá lịch sử" nếu cần).
export async function clearGlobalChatHistory(uuid) {
  try {
    await idbDelete(ownerKeyOf(uuid))
  } catch (e) {
    console.error('[globalChatbotStorage] clear error:', e)
  }
}
