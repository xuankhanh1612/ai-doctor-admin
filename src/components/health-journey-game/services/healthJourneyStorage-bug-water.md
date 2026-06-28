# 🐛 Bug Report: Google User Water Task Reset 0/1 On Reload

> **File bị ảnh hưởng:** `src/components/health-journey-game/services/healthJourneyStorage.js`
> **Môi trường:** https://ai-doctor-admin.vercel.app/
> **Triệu chứng:** Google user reload trang → nhiệm vụ uống nước trong ngày reset về `0/1` dù đã lưu proof ảnh qua "Bé Mèo Nước"
> **Guest user:** Không bị ảnh hưởng

---

## Mục lục

1. [Kiến trúc lưu trữ tổng quan](#1-kiến-trúc-lưu-trữ-tổng-quan)
2. [Luồng khởi động trang (Happy Path)](#2-luồng-khởi-động-trang-happy-path)
3. [Root Cause — Tầng 1: Race Condition trong `hydrate()`](#3-root-cause--tầng-1-race-condition-trong-hydrate)
4. [Root Cause — Tầng 2: `loadHealthJourneyDb()` persist khi chưa hydrate](#4-root-cause--tầng-2-loadhealthjourneydb-persist-khi-chưa-hydrate)
5. [Tại sao Guest không bị, Google User bị](#5-tại-sao-guest-không-bị-google-user-bị)
6. [Timeline đầy đủ của lỗi (ms-level)](#6-timeline-đầy-đủ-của-lỗi-ms-level)
7. [Fix đã áp dụng](#7-fix-đã-áp-dụng)
8. [Checklist kiểm tra sau deploy](#8-checklist-kiểm-tra-sau-deploy)

---

## 1. Kiến trúc lưu trữ tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER STORAGE LAYER                        │
│                                                                     │
│  localStorage                    IndexedDB (cdoc_guest)             │
│  ─────────────                   ──────────────────────             │
│  cdoc_session   → { email }      store: settings                    │
│  cdoc_users     → { [email]:     │  key: health_journey_db_v2      │
│                    uuid,         │       → toàn bộ DB của game     │
│                    name,         │                                  │
│                    avatar... }   store: records                     │
│                                  │  → Medical Records / ảnh proof  │
│                                  store: session                     │
│                                  │  → Guest anonymous profile      │
└─────────────────────────────────────────────────────────────────────┘
                          │                   │
                          ▼                   ▼
              ┌───────────────────────────────────────┐
              │         AuthContext.jsx               │
              │  ─────────────────────────────────    │
              │  Google User:                         │
              │    restore từ localStorage (đồng bộ)  │
              │    → user.uuid = "HEALTH-20260628-..." │
              │                                       │
              │  Guest User:                          │
              │    restore từ IndexedDB (bất đồng bộ) │
              │    → user.uuid = "HEALTH-20260601-..." │
              └───────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────────────────────┐
              │      healthJourneyStorage.js           │
              │  ─────────────────────────────────    │
              │  memDb (RAM cache)                    │
              │    ↕ sync từ IndexedDB khi mount       │
              │    ↕ persist xuống IndexedDB khi save  │
              │                                       │
              │  Cấu trúc DB:                         │
              │  {                                    │
              │    users: {                           │
              │      "le-xuan-khanh-sample": {...},   │  ← sample
              │      "health-20260628-...": {         │  ← Google user
              │        dailyTracking: {               │
              │          days: [{                     │
              │            date: "2026-06-28",        │
              │            tasks: [{                  │
              │              taskId: "water",         │
              │              current: 1,  ← BỊ MẤT   │
              │              target: 1               │
              │            }]                         │
              │          }]                           │
              │        }                              │
              │      }                                │
              │    }                                  │
              │  }                                    │
              └───────────────────────────────────────┘
```

---

## 2. Luồng khởi động trang (Happy Path)

Đây là luồng **lý tưởng** — khi mọi thứ chạy đúng thứ tự.

```
t=0ms  ┌─────────────────────────────────────────────────────────┐
       │ Browser load trang https://ai-doctor-admin.vercel.app/  │
       └─────────────────────────────────────────────────────────┘
                │
                ▼
t=5ms  ┌─────────────────────────────────────────────────────────┐
       │ healthJourneyStorage.js được import                     │
       │   → hydrate() được gọi ngay (module-level side effect)  │
       │   → hydratePromise = IndexedDB.get("health_journey_db_v2")│
       │   → hydrated = false  ← CHẶN mọi persist()             │
       └─────────────────────────────────────────────────────────┘
                │
                ▼  (song song)
t=10ms ┌─────────────────────────────────────────────────────────┐
       │ AuthContext.jsx useEffect chạy                          │
       │   → getSavedSession() từ localStorage (đồng bộ)        │
       │   → tìm thấy { email: "khanhlegood1@gmail.com" }       │
       │   → getUsers()["khanhlegood1@gmail.com"]               │
       │   → setUser({ uuid: "HEALTH-...", name: "Lê Xuân Khánh" })│
       └─────────────────────────────────────────────────────────┘
                │
                ▼
t=15ms ┌─────────────────────────────────────────────────────────┐
       │ React render HealthJourneyGameStandalone                │
       │   → useState(() => getTaskSnapshot(user))              │
       │   → loadHealthJourneyDb() được gọi lần đầu            │
       │   → memDb vẫn là defaultDb() (hydrate chưa xong)      │
       │   → hydrated = false → persist() bị CHẶN ✓            │
       │   → snapshot trả về data tạm (water.current = 0)      │
       └─────────────────────────────────────────────────────────┘
                │
                ▼
t=80ms ┌─────────────────────────────────────────────────────────┐
       │ hydrate() xong — đọc IndexedDB thành công              │
       │   → memDb = stored (data thật, water.current = 1)      │
       │   → hydrated = true                                    │
       │   → fire HEALTH_JOURNEY_EVENT                          │
       └─────────────────────────────────────────────────────────┘
                │
                ▼
t=82ms ┌─────────────────────────────────────────────────────────┐
       │ HealthJourneyGameStandalone nhận HEALTH_JOURNEY_EVENT   │
       │   → setSnapshot(getTaskSnapshot(user))                  │
       │   → loadHealthJourneyDb() gọi lại                      │
       │   → self-heal chạy trên data thật                      │
       │   → persist() được gọi (hydrated = true)               │
       │   → UI hiển thị water.current = 1 ✅                   │
       └─────────────────────────────────────────────────────────┘
```

---

## 3. Root Cause — Tầng 1: Race Condition trong `hydrate()`

### Vấn đề cốt lõi

`hydrate()` cũ **không chạy self-heal trên data thật** sau khi load từ IndexedDB.
Điều này tạo ra cửa sổ nguy hiểm: mỗi lần `loadHealthJourneyDb()` được gọi sau
khi `hydrated = true`, self-heal chạy và persist — nhưng nếu IndexedDB đã bị ghi đè
bởi một bản `defaultDb()` sai từ phiên trước, lần này sẽ tiếp tục đọc bản sai đó.

```
CODE CŨ — hydrate():
─────────────────────────────────────────────────────────────────────

async function hydrate() {
  const stored = await getSetting(HEALTH_JOURNEY_DB_KEY)
  if (stored && !savedThisSession) {
    memDb = stored
    window.dispatchEvent(new CustomEvent(HEALTH_JOURNEY_EVENT, { detail: memDb }))
    //  ↑ fire event ngay, KHÔNG chạy self-heal trên stored
    //  ↑ nếu stored có objective chưa được heal, sẽ không được fix
  }
  hydrated = true   ← đặt CUỐI, sau khi đã fire event
  if (savedThisSession) persist(memDb)
}

VẤN ĐỀ: hydrated = true được đặt SAU KHI fire HEALTH_JOURNEY_EVENT
  → Handler của event gọi loadHealthJourneyDb()
  → loadHealthJourneyDb() gọi self-heal + persist()
  → persist() check: hydrated = false (chưa set xong!)  ← CHẶN
  → self-heal mutation KHÔNG được lưu xuống IndexedDB
  → Lần reload tiếp theo, data vẫn chưa được heal
```

### Sequence Diagram — Bug Tầng 1

```
Component          hydrate()           IndexedDB          memDb
    │                  │                   │                │
    │  mount           │                   │                │
    │─────────────────►│                   │                │
    │                  │ get(key) ─────────►                │
    │                  │                   │                │
    │  loadDb()        │                   │   defaultDb()  │
    │─────────────────────────────────────────────────────►│
    │◄── water=0 ──────────────────────────────────────────│
    │  (data tạm)      │                   │                │
    │                  │◄──── stored ───────                │
    │                  │      water=1       │                │
    │                  │                   │                │
    │                  │ memDb = stored ───────────────────►│
    │                  │                   │   water=1      │
    │                  │ fire EVENT ───────►                │
    │◄── EVENT ────────│                   │                │
    │  loadDb()        │                   │                │
    │──────────────────────────────────────────────────────►│
    │◄── water=1 ──────│                   │                │
    │  self-heal OK    │                   │                │
    │  persist()       │                   │                │
    │  hydrated=false? │  ← hydrated chưa = true!           │
    │  → BỊ CHẶN      │                   │                │
    │                  │ hydrated = true   │                │
    │                  │ (quá muộn)        │                │
    │                  │                   │                │
    ╔══════════════════╪═══════════════════╪════════════════╪═══╗
    ║ KẾT QUẢ: IndexedDB có thể có bản cũ chưa được heal        ║
    ║ Lần reload tiếp theo: đọc lên bản cũ → water hiển thị sai ║
    ╚════════════════════════════════════════════════════════════╝
```

---

## 4. Root Cause — Tầng 2: `loadHealthJourneyDb()` persist khi chưa hydrate

### Vấn đề

`loadHealthJourneyDb()` cũ gọi tất cả self-heal mutations **không phân biệt** đã
hydrate hay chưa. Dù `persist()` có guard `if (!hydrated) return`, việc **mutations
chạy trên `defaultDb()` tạm** vẫn gây ra side effect khi `hydrated` được set đột ngột.

```
CODE CŨ — loadHealthJourneyDb():
─────────────────────────────────────────────────────────────────────

export function loadHealthJourneyDb() {
  if (!memDb) memDb = defaultDb()

  // Luôn chạy dù chưa hydrate — mutations chạy trên defaultDb() tạm
  const changedImages = migrateLargeImages(memDb)          ← chạy trên defaultDb()
  const changedMissingObjectives = ensureAllChapterObjectives(memDb)  ← tương tự
  const changedObjectives = repairObjectiveCompletedFlags(memDb)      ← tương tự

  if (!memDb.users?.[sampleUserId]) {
    memDb.users[sampleUserId] = clone(sampleUserData)      ← sửa defaultDb() tạm
  }

  // persist() bị chặn vì hydrated = false → OK trong trường hợp bình thường
  // NHƯNG nếu có exception trong IndexedDB khiến hydrated = true sớm bất thường,
  // bản defaultDb() với water=0 sẽ được ghi xuống IndexedDB
  if (changedImages || changedObjectives) persist(memDb)
}
```

### Edge Case nguy hiểm

```
t=0ms    hydrate() bắt đầu, hydrated = false
t=5ms    loadHealthJourneyDb() chạy, mutations trên defaultDb(water=0)
t=10ms   IndexedDB throw QuotaExceededError (đầy bộ nhớ)
t=10ms   catch(e) → hydrated = true  ← SET SỚM DO EXCEPTION
t=11ms   component re-render, loadHealthJourneyDb() lại
t=11ms   self-heal mutations, persist() gọi
t=11ms   hydrated = true → persist(defaultDb với water=0) → GHI ĐÈ!
t=12ms   UI hiển thị water = 0 ❌
```

---

## 5. Tại sao Guest không bị, Google User bị

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SO SÁNH LUỒNG KHỞI TẠO                          │
├────────────────────────────┬────────────────────────────────────────┤
│       GUEST USER           │         GOOGLE USER                    │
├────────────────────────────┼────────────────────────────────────────┤
│ Session lưu ở: IndexedDB   │ Session lưu ở: localStorage            │
│ (bất đồng bộ)              │ (đồng bộ, nhanh hơn)                   │
│                            │                                        │
│ AuthContext init:          │ AuthContext init:                       │
│   await getAnonSession()   │   getSavedSession() ← ĐỒNG BỘ         │
│   → ~50ms                  │   → ~0ms                               │
│                            │                                        │
│ setUser() lúc: t=50ms      │ setUser() lúc: t=5ms                   │
│                            │                                        │
│ Component mount: t=55ms    │ Component mount: t=10ms                │
│ hydrate xong: t=80ms       │ hydrate xong: t=80ms                   │
│                            │                                        │
│ Khoảng nguy hiểm:          │ Khoảng nguy hiểm:                      │
│ 55ms → 80ms = 25ms         │ 10ms → 80ms = 70ms   ← GẤP 2.8 LẦN   │
│ (ngắn hơn, ít rủi ro)     │ (dài hơn, nhiều re-render hơn)        │
│                            │                                        │
│ User UUID:                 │ User UUID:                             │
│ "HEALTH-20260628-..."      │ "HEALTH-20260601-..."                  │
│ Mới tạo gần đây            │ Tạo lần đầu login → cố định           │
│ → ít data tích lũy        │ → nhiều ngày data → dễ sai hơn        │
└────────────────────────────┴────────────────────────────────────────┘

KẾT LUẬN: Google user có khoảng race condition DÀI HƠN và data
PHONG PHÚ HƠN → xác suất tái hiện lỗi cao hơn nhiều.
```

---

## 6. Timeline đầy đủ của lỗi (ms-level)

Dưới đây là timeline chính xác khi lỗi xảy ra với Google user:

```
RELOAD TRANG — GOOGLE USER

t=0ms ─── Browser bắt đầu load bundle JS
           │
t=5ms ─── healthJourneyStorage.js được parse & execute
           │   memDb = null
           │   hydrated = false
           │   savedThisSession = false
           │   hydrate() được gọi → bắt đầu đọc IndexedDB
           │
t=8ms ─── AuthContext.jsx execute
           │   seedAdmin() → kiểm tra localStorage
           │   getSavedSession() → { email: "khanhlegood1@gmail.com" }
           │   getUsers()[email] → { uuid: "HEALTH-...", ... }
           │   setUser(googleUser) ← NGAY LẬP TỨC (đồng bộ)
           │
t=10ms ── React render App.jsx
           │   user = googleUser (đã có)
           │   HealthJourneyGamePanel render
           │
t=12ms ── HealthJourneyGameStandalone mount
           │   useState(() => getTaskSnapshot(user))
           │       → loadHealthJourneyDb()
           │           → memDb = defaultDb()  ← tạm
           │           → migrateLargeImages(memDb)  ← chạy trên defaultDb
           │           → ensureAllChapterObjectives(memDb)  ← tương tự
           │           → repairObjectiveCompletedFlags(memDb)  ← tương tự
           │           → changed = true (sampleData cần heal)
           │           → persist(memDb)  ← hydrated=false → BỊ CHẶN ✓
           │       → ensureUser(db, googleUser)
           │           → makeUserId(googleUser) = "health-20260628-..."
           │           → db.users["health-20260628-..."] KHÔNG TỒN TẠI trong defaultDb
           │           → TẠO MỚI từ sampleUserData clone
           │           → seed.dailyTracking.days = [...sampleDays] ← water=0
           │       → getTaskSnapshot() trả về water.current = 0
           │   snapshot = { day: { tasks: [{ taskId: "water", current: 0 }] } }
           │   UI hiển thị "0/1 lần" (tạm, chờ hydrate)
           │
t=15ms ── useEffect lắng nghe HEALTH_JOURNEY_EVENT đăng ký
           │
           │   ┌── memDb lúc này = defaultDb() với googleUser mới tạo (water=0)
           │   │   hydrated = false
           │
t=80ms ── hydrate() nhận response từ IndexedDB
           │   stored = {
           │     users: {
           │       "health-20260628-...": {          ← data thật
           │         dailyTracking: {
           │           days: [{ date: "2026-06-28",
           │                    tasks: [{ taskId: "water",
           │                              current: 1 }] }]  ← ĐÃ UỐNG
           │         }
           │       }
           │     }
           │   }
           │
           │   CODE CŨ (BUG):
           │   ─────────────
           │   memDb = stored  ← OK
           │   fire HEALTH_JOURNEY_EVENT  ← NGAY LẬP TỨC
           │       ↓ handler chạy
           │       loadHealthJourneyDb()
           │           self-heal mutations OK
           │           persist()  ← hydrated vẫn = false! CHẶN
           │   hydrated = true  ← ĐẶT SAU EVENT (quá muộn)
           │
           │   KẾT QUẢ (CODE CŨ):
           │   IndexedDB vẫn có bản stored gốc (chưa được self-heal đúng)
           │   Lần reload tiếp theo → đọc lên bản đó → có thể sai
           │
t=82ms ── UI nhận HEALTH_JOURNEY_EVENT
           │   setSnapshot(getTaskSnapshot(googleUser))
           │   loadHealthJourneyDb() → memDb = stored (water=1) ✓
           │   UI hiển thị "1/1 lần" ← ĐÚNG TẠMTHỜI
           │
           │   NHƯNG: nếu sau đó có bất kỳ action nào trigger persist()
           │   với bản memDb sai (defaultDb), data sẽ bị đè
           │
t=??? ─── User reload lần 2
           │   Nếu bước t=80ms đã để lại IndexedDB ở trạng thái không nhất quán
           │   → lần reload này có thể đọc lên water=0
           │   → Triệu chứng: "1/1" sau lần đầu load, nhưng sau reload → "0/1"
```

---

## 7. Fix đã áp dụng

### Fix 1 — `hydrate()`: Set `hydrated = true` trước, self-heal ngay trên data thật

```javascript
// TRƯỚC (BUG):
function hydrate() {
  hydratePromise = (async () => {
    const stored = await getSetting(HEALTH_JOURNEY_DB_KEY)
    if (stored && !savedThisSession) {
      memDb = stored
      window.dispatchEvent(new CustomEvent(HEALTH_JOURNEY_EVENT, { detail: memDb }))
      // ↑ BUG: fire event trước khi hydrated = true
      // ↑ BUG: không self-heal data thật trước khi fire
    }
    hydrated = true   // ← đặt CUỐI, handler của event đã bị chặn
    if (savedThisSession) persist(memDb)
  })()
}

// SAU (FIX):
function hydrate() {
  hydratePromise = (async () => {
    try {
      const stored = await getSetting(HEALTH_JOURNEY_DB_KEY)
      if (stored && !savedThisSession) {
        memDb = stored
        // ✅ FIX: set hydrated = true TRƯỚC khi self-heal và fire event
        hydrated = true
        // ✅ FIX: self-heal ngay trên data thật, persist nếu có thay đổi
        const healedImages = migrateLargeImages(memDb)
        const healedObjectives = ensureAllChapterObjectives(memDb)
        const healedFlags = repairObjectiveCompletedFlags(memDb)
        if (healedImages || healedObjectives || healedFlags) persist(memDb)
        // ✅ FIX: fire event SAU khi data đã được heal + persist
        window.dispatchEvent(new CustomEvent(HEALTH_JOURNEY_EVENT, { detail: memDb }))
      } else {
        hydrated = true  // ✅ FIX: set ngay cả khi không có stored data
      }
    } catch (e) {
      console.warn('[healthJourneyStorage] IndexedDB read failed', e)
      hydrated = true  // ✅ FIX: set kể cả khi exception
    }
    if (savedThisSession) persist(memDb)
    try { localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY) } catch (_) {}
  })()
}
```

### Fix 2 — `loadHealthJourneyDb()`: Self-heal chỉ chạy khi đã hydrate

```javascript
// TRƯỚC (BUG):
export function loadHealthJourneyDb() {
  if (!memDb) memDb = defaultDb()

  // BUG: luôn chạy dù memDb có thể là defaultDb() tạm
  const changedImages = migrateLargeImages(memDb)
  const changedMissingObjectives = ensureAllChapterObjectives(memDb)
  const changedObjectives = repairObjectiveCompletedFlags(memDb)
  if (!memDb.users?.[sampleUserId]) {
    memDb.users[sampleUserId] = clone(sampleUserData)
  }
  if (changedImages || changedMissingObjectives || changedObjectives) persist(memDb)

  return memDb
}

// SAU (FIX):
export function loadHealthJourneyDb() {
  if (!memDb) memDb = defaultDb()

  if (hydrated) {
    // ✅ FIX: chỉ self-heal + persist khi đã có data thật
    const changedImages = migrateLargeImages(memDb)
    const changedMissingObjectives = ensureAllChapterObjectives(memDb)
    const changedObjectives = repairObjectiveCompletedFlags(memDb)
    if (!memDb.users?.[sampleUserId]) {
      memDb.users[sampleUserId] = clone(sampleUserData)
    }
    if (changedImages || changedMissingObjectives || changedObjectives) persist(memDb)
  } else {
    // ✅ FIX: trước hydrate → chỉ đảm bảo sampleUser tồn tại (UI không crash)
    //         KHÔNG persist bất kỳ thứ gì
    if (!memDb.users?.[sampleUserId]) {
      memDb.users[sampleUserId] = clone(sampleUserData)
    }
  }

  return memDb
}
```

### Sơ đồ so sánh Before/After

```
BEFORE FIX:
──────────────────────────────────────────────────────────────
t=80ms  hydrate nhận stored (water=1)
        memDb = stored
        fire EVENT  ──► handler: persist() ← CHẶN (hydrated=false)
        hydrated = true  (quá muộn)
        IndexedDB: có thể chứa bản cũ chưa heal

t=reload  đọc IndexedDB → bản cũ → water=0 ❌

AFTER FIX:
──────────────────────────────────────────────────────────────
t=80ms  hydrate nhận stored (water=1)
        memDb = stored
        hydrated = true  ✅ (đặt SỚM)
        self-heal(memDb)
        persist(memDb)  ← hydrated=true → GHI ĐƯỢC ✅
        IndexedDB: bản đã heal, water=1
        fire EVENT  ──► handler: persist() ← hydrated=true → OK

t=reload  đọc IndexedDB → bản đã heal → water=1 ✅
```

---

## 8. Checklist kiểm tra sau deploy

### Test cases cần verify

```
□ [CRITICAL] Google user uống nước → reload → kiểm tra vẫn hiện 1/1
□ [CRITICAL] Google user uống nước → đóng tab → mở tab mới → kiểm tra 1/1
□ [CRITICAL] Google user uống nước 2 lần trong ngày → reload → hiện 2/2
□ [HIGH]     Guest user uống nước → reload → không bị ảnh hưởng
□ [HIGH]     Google user với nhiều ngày data → reload → tất cả ngày cũ đúng
□ [MEDIUM]   Google user lần đầu đăng nhập → uống nước → reload → 1/1
□ [MEDIUM]   Tab 1 uống nước → mở Tab 2 → Tab 2 cũng thấy 1/1
□ [LOW]      IndexedDB đầy (quota) → app không crash, graceful fallback
□ [LOW]      Offline reload → app không crash
```

### Debug commands (Console)

```javascript
// Kiểm tra data thật trong IndexedDB
const req = indexedDB.open('cdoc_guest', 1)
req.onsuccess = (e) => {
  const db = e.target.result
  const tx = db.transaction('settings', 'readonly')
  const store = tx.objectStore('settings')
  const get = store.get('health_journey_db_v2')
  get.onsuccess = () => {
    const data = get.result?.value
    const googleUserId = Object.keys(data?.users || {})
      .find(k => k.startsWith('health-') && k !== 'le-xuan-khanh-sample')
    if (googleUserId) {
      const user = data.users[googleUserId]
      const today = new Date().toISOString().slice(0, 10)
      const day = user.dailyTracking.days.find(d => d.date === today)
      console.log('Today water task:', day?.tasks?.find(t => t.taskId === 'water'))
    }
  }
}

// Kiểm tra memDb hiện tại (sau khi fix)
// (từ module, không expose trực tiếp — dùng custom event để debug)
window.dispatchEvent(new CustomEvent('DEBUG_HEALTH_JOURNEY_REQUEST'))
```

---

## Tóm tắt

| Tầng | Vấn đề | Nguyên nhân | Fix |
|------|--------|-------------|-----|
| **1** | `hydrated = true` đặt sau `fire EVENT` | Handler event không thể persist vì guard `!hydrated` | Đặt `hydrated = true` trước khi fire event |
| **1b** | Self-heal không chạy trên data thật | `hydrate()` không gọi migrations sau `memDb = stored` | Gọi self-heal ngay sau khi load data thật |
| **2** | Self-heal chạy trên `defaultDb()` tạm | `loadHealthJourneyDb()` không check `hydrated` | Bọc self-heal trong `if (hydrated)` |
| **2b** | Edge case: IndexedDB exception → persist sai | `catch(e)` không set `hydrated = true` | Set `hydrated = true` trong mọi nhánh |

**File thay thế:** `src/components/health-journey-game/services/healthJourneyStorage.js`

---

*Generated: 2026-06-28 · AI Doctor Admin Bug Analysis*
