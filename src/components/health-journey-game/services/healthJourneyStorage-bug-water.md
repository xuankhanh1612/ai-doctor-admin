# Bug Report: Google User Water Task Reset 0/1 — Phân Tích Toàn Bộ
### `healthJourneyStorage.js` · ai-doctor-admin · 2026-06-28

> **Triệu chứng:** Google user reload trang → nhiệm vụ uống nước trong ngày
> hiển thị `0/1 lần`, dù đã lưu proof ảnh qua Upload & "Bé Mèo Nước"  
> **Guest user:** Không bị ảnh hưởng  
> **Trạng thái:** Đã fix hoàn toàn sau 2 vòng điều tra

---

## Mục lục

1. [Kiến trúc hệ thống](#1-kiến-trúc-hệ-thống)
2. [Luồng dữ liệu end-to-end (Happy Path)](#2-luồng-dữ-liệu-end-to-end-happy-path)
3. [Tại sao Guest không bị, Google User bị](#3-tại-sao-guest-không-bị-google-user-bị)
4. [Bug #1 — `savedThisSession` Poison (Root Cause Chính)](#4-bug-1--savedthissession-poison-root-cause-chính)
5. [Bug #2 — `ensureUser` không reset `dailyTracking.days`](#5-bug-2--ensureuser-không-reset-dailytrackingdays)
6. [Bug #3 — `todayISODate()` dùng UTC thay vì local time](#6-bug-3--todayisodate-dùng-utc-thay-vì-local-time)
7. [Bug #4 — `hydrate()` đặt `hydrated = true` sau khi fire event (Vòng 1)](#7-bug-4--hydrate-đặt-hydrated--true-sau-khi-fire-event-vòng-1)
8. [Bug #5 — `loadHealthJourneyDb()` self-heal trước khi hydrate (Vòng 1)](#8-bug-5--loadhealthjourneydb-self-heal-trước-khi-hydrate-vòng-1)
9. [Timeline Tổng hợp — Toàn Bộ Luồng Lỗi](#9-timeline-tổng-hợp--toàn-bộ-luồng-lỗi)
10. [Tất cả Fix đã áp dụng](#10-tất-cả-fix-đã-áp-dụng)
11. [Checklist kiểm tra sau deploy](#11-checklist-kiểm-tra-sau-deploy)

---

## 1. Kiến trúc hệ thống

```
╔══════════════════════════════════════════════════════════════════════╗
║                     BROWSER STORAGE LANDSCAPE                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  localStorage (sync, ~5MB)        IndexedDB (async, ~500MB)         ║
║  ──────────────────────────       ─────────────────────────         ║
║  cdoc_session → { email }         DB: cdoc_guest                    ║
║  cdoc_users   → {                 ├─ store: settings                ║
║    [email]: {                     │    key: health_journey_db_v2    ║
║      uuid: "HEALTH-...",          │    val: { users: { ... } }      ║
║      name: "Lê Xuân Khánh"        │         ← TOÀN BỘ game state   ║
║    }                              ├─ store: records                  ║
║  }                                │    → Medical Records / proof    ║
║                                   └─ store: session                  ║
║                                        → Guest anonymous profile    ║
║                                                                      ║
║                                   DB: be-meo-nuoc-db                ║
║                                   └─ store: days                    ║
║                                        → Chat + lượng nước/ngày    ║
║                                                                      ║
║                                   DB: ai-clinic-medical-db          ║
║                                   └─ store: medical-files           ║
║                                        → Proof images (dataUrl)     ║
╚══════════════════════════════════════════════════════════════════════╝
                    │                          │
                    ▼                          ▼
        ┌───────────────────────────────────────────┐
        │              AuthContext.jsx              │
        │  ─────────────────────────────────────    │
        │                                           │
        │  Google User restore:                     │
        │    getSavedSession() ← localStorage       │
        │    → ĐỒNG BỘ, hoàn thành ~0ms             │
        │    → setUser({ uuid, name, email })        │
        │                                           │
        │  Guest User restore:                      │
        │    await getAnonSession() ← IndexedDB     │
        │    → BẤT ĐỒNG BỘ, hoàn thành ~50ms        │
        │    → setUser({ uuid, isAnonymous: true }) │
        └───────────────────────────────────────────┘
                           │
                           ▼
        ┌───────────────────────────────────────────┐
        │         healthJourneyStorage.js            │
        │  ─────────────────────────────────────    │
        │                                           │
        │  RAM:  memDb (in-memory cache)            │
        │         ↕ hydrate()  ← IndexedDB          │
        │         ↕ persist()  → IndexedDB          │
        │                                           │
        │  DB structure:                            │
        │  {                                        │
        │    users: {                               │
        │      "le-xuan-khanh-sample": { ... },    │
        │      "health-20260628-xxxxx": {           │  ← Google user
        │        dailyTracking: {                   │
        │          days: [{                         │
        │            date: "2026-06-28",            │
        │            tasks: [{                      │
        │              taskId: "water",             │
        │              current: 1,  ← BỊ MẤT       │
        │              target: 1                    │
        │            }]                             │
        │          }]                               │
        │        }                                  │
        │      }                                    │
        │    }                                      │
        │  }                                        │
        └───────────────────────────────────────────┘
```

---

## 2. Luồng dữ liệu end-to-end (Happy Path)

Luồng từ khi user uống nước đến khi data được lưu và hiển thị lại sau reload:

```
USER nhấn "💾 Lưu ảnh" trong TaskDetailPopup
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  TaskDetailPopup.jsx — onSaveCapture()                   │
│  → saveWaterProofImage(file, user, { activityType,       │
│      taskId: 'water', waterAmountMl: 150, ... })         │
└──────────────────────────────────────────────────────────┘
        │                             │
        ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│  medicalStorage.js  │    │  Callback: handleCaptureSaved│
│  saveRecord(record) │    │                             │
│  → ai-clinic-       │    │  1. completeHealthJourney-  │
│    medical-db       │    │     Activity({ user,        │
│  (proof image +     │    │     activityType:           │
│   dataUrl saved)    │    │     'drink_water', ... })   │
│                     │    │                             │
│  notifyUpload()     │    │  2. syncBeMeoWater(150ml,   │
│  → Upload panel     │    │     proofId, user.uuid)     │
│    refresh          │    └─────────────────────────────┘
└─────────────────────┘              │
                                     ▼
                        ┌────────────────────────────────┐
                        │  healthJourneyStorage.js       │
                        │  completeHealthJourneyActivity │
                        │                                │
                        │  1. ensureUser(db, user)       │
                        │  2. updateDailyTask()          │
                        │     water.current += 1 → 1     │
                        │  3. updateJourney()            │
                        │     objective.current += 1     │
                        │  4. saveHealthJourneyDb(db)    │
                        │     → persist() → IndexedDB   │
                        │     → fire HEALTH_JOURNEY_EVENT│
                        └────────────────────────────────┘
                                     │
                        ┌────────────┴────────────────┐
                        │                             │
                        ▼                             ▼
             ┌──────────────────┐         ┌──────────────────────┐
             │  be-meo-nuoc-db  │         │  cdoc_guest/settings │
             │  saveDay(uuid,   │         │  health_journey_db_v2│
             │  today, {        │         │  water.current = 1   │
             │  messages,       │         │  ← ĐÃ LƯU ĐÚNG      │
             │  water: {        │         └──────────────────────┘
             │  total: 150 })   │
             └──────────────────┘
                        │
USER RELOAD TRANG ──────┘ (data đã lưu, nhưng có thể bị mất khi reload)
```

---

## 3. Tại sao Guest không bị, Google User bị

```
┌─────────────────────────────────────────────────────────────────────┐
│              RACE CONDITION WINDOW — so sánh thực tế               │
├──────────────────────────────┬──────────────────────────────────────┤
│         GUEST USER           │           GOOGLE USER                │
├──────────────────────────────┼──────────────────────────────────────┤
│ Auth storage: IndexedDB      │ Auth storage: localStorage           │
│ Restore: BẤT ĐỒNG BỘ        │ Restore: ĐỒNG BỘ                    │
│                              │                                      │
│ t=0   hydrate() bắt đầu      │ t=0   hydrate() bắt đầu             │
│ t=5   Auth init              │ t=5   Auth init                      │
│ t=55  await getAnonSession() │ t=6   getSavedSession() ← sync      │
│       → setUser() xong       │       → setUser() xong              │
│ t=58  Component mount        │ t=8   Component mount               │
│ t=80  hydrate() xong         │ t=80  hydrate() xong                │
│                              │                                      │
│ Khoảng nguy hiểm:            │ Khoảng nguy hiểm:                   │
│ t=58 → t=80 = 22ms           │ t=8 → t=80 = 72ms  ← 3.3× DÀI HƠN │
│                              │                                      │
│ Component gọi getTaskSnapshot│ Component gọi getTaskSnapshot       │
│ 1-2 lần trước hydrate        │ 5-8 lần trước hydrate               │
│                              │                                      │
│ Guest UUID mới tạo:          │ Google UUID tạo từ lần login đầu:   │
│ "HEALTH-20260628-..."         │ "HEALTH-20260101-..."               │
│ → ít/không có data cũ        │ → data tích lũy nhiều ngày          │
│ → ít rủi ro                  │ → rủi ro cao hơn                    │
├──────────────────────────────┴──────────────────────────────────────┤
│ THÊM: Guest user identity = IndexedDB (cùng cơ chế với game data)  │
│ → cả 2 đọc xong gần như cùng lúc → ít race condition hơn           │
│                                                                      │
│ Google user identity = localStorage (đồng bộ, siêu nhanh) →        │
│ component mount ngay, getTaskSnapshot() chạy nhiều lần trước        │
│ IndexedDB (async) đọc xong → race condition cực kỳ nhất quán       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Bug #1 — `savedThisSession` Poison (Root Cause Chính)

**Mức độ:** 🔴 Critical — trực tiếp gây mất data mỗi lần reload

### Cơ chế

```
MODULE-LEVEL STATE (reset về false mỗi khi trang reload):
  let memDb = null
  let savedThisSession = false   ← đây là "chốt an toàn" nhưng bị phá vỡ
  let hydrated = false

LUỒNG LỖI:
─────────────────────────────────────────────────────────────────

t=0ms   Browser load trang
        → healthJourneyStorage.js execute
        → hydrate() được gọi (module-level side effect)
        → IndexedDB.get("health_journey_db_v2") bắt đầu (async ~80ms)
        → savedThisSession = false
        → hydrated = false

t=5ms   AuthContext.jsx khởi tạo
        → getSavedSession() từ localStorage (đồng bộ)
        → tìm thấy { email: "khanhlegood1@gmail.com" }
        → setUser({ uuid: "HEALTH-...", name: "Lê Xuân Khánh" })
        ← XONG NGAY, không cần đợi IndexedDB

t=8ms   React render HealthJourneyGameStandalone
        → useState(() => getTaskSnapshot(user))
        → getTaskSnapshot() gọi getHealthJourneyUser(user)
        → getHealthJourneyUser() gọi loadHealthJourneyDb()
        → loadHealthJourneyDb(): memDb = defaultDb()
          (hydrate chưa xong, chỉ có sampleUser "le-xuan-khanh-sample")
        → makeUserId(googleUser) = "health-20260628-xxxxx"
        → ensureUser(): db.users["health-20260628-xxxxx"] KHÔNG TỒN TẠI
          (defaultDb chỉ có sampleUser)
        → Tạo user mới từ clone(sampleUserData) với water=0
        → existed = false
        → saveHealthJourneyDb(db) ĐƯỢC GỌI! ← ĐIỂM KÍCH HOẠT
          → savedThisSession = TRUE  ← POISON SET
          → persist(db): hydrated=false → BỊ CHẶN (OK bước này)
          → fire HEALTH_JOURNEY_EVENT (với memDb rỗng tạm)

t=80ms  hydrate() nhận stored từ IndexedDB:
        stored = { users: { "health-20260628-xxxxx": { water.current: 1 } } }

        CODE CŨ kiểm tra:
        ┌─────────────────────────────────────────────┐
        │  if (stored && !savedThisSession) {         │
        │               ↑                             │
        │      savedThisSession = TRUE (đã bị set)    │
        │      → điều kiện FALSE → BỎ QUA stored!    │
        └─────────────────────────────────────────────┘

        memDb vẫn = defaultDb với water=0
        hydrated = true
        if (savedThisSession) persist(memDb) ← GHI ĐÈ!
        → IndexedDB bị ghi: { water.current: 0 }
        → DATA THẬT BỊ XÓA

t=82ms  UI hiển thị "0/1 lần" ❌
        (dù đã uống nước và lưu proof)
```

### Sơ đồ trạng thái

```
                    RELOAD
                      │
                      ▼
         ┌────────────────────────┐
         │  savedThisSession=false│
         │  hydrated=false        │
         │  memDb=null            │
         └────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │ (song song)             │
         ▼                         ▼
  hydrate() starts          AuthContext restore
  IndexedDB.get()           (localStorage, sync)
  ~80ms                     ~0ms → setUser()
         │                         │
         │              React mount component
         │              getTaskSnapshot(user)
         │                         │
         │              ensureUser: user NOT in defaultDb
         │              saveHealthJourneyDb() ← TRIGGER
         │              savedThisSession = TRUE ←──────────┐
         │                                                  │
         ▼                                                  │
  IndexedDB returns                                         │
  stored = { water: 1 }                                     │
         │                                                  │
         ▼                                                  │
  if (stored && !savedThisSession)                          │
         = (true && !TRUE)                                  │
         = FALSE                                            │
         │                                                  │
         ▼                                                  │
  stored IGNORED ◄──────────────────────────────────────────┘
         │
         ▼
  if (savedThisSession) persist(memDb=defaultDb)
         │
         ▼
  IndexedDB ← { water: 0 }  ← DATA THẬT BỊ ĐÈ
```

### Fix

```javascript
// TRƯỚC (BUG):
if (stored && !savedThisSession) {
  memDb = stored
  // ...
}

// SAU (FIX):
if (stored) {
  // LUÔN load stored bất kể savedThisSession
  const currentMemDb = memDb
  memDb = stored

  // MERGE: chỉ thêm user thật sự mới (chưa có trong stored)
  // User đã có trong stored → stored là nguồn sự thật, giữ nguyên
  if (currentMemDb?.users) {
    Object.entries(currentMemDb.users).forEach(([uid, userData]) => {
      if (!memDb.users[uid]) {
        const freshUser = clone(userData)
        // Reset sample days để không ô nhiễm data mới
        if (uid !== sampleUserData.user.userId) {
          freshUser.dailyTracking.days = []
        }
        memDb.users[uid] = freshUser
      }
    })
  }

  hydrated = true
  savedThisSession = false  // reset: stored đã load, cho phép UI refresh
  // self-heal + persist + fire event...
}
```

---

## 5. Bug #2 — `ensureUser` không reset `dailyTracking.days`

**Mức độ:** 🟠 High — gây fallback sai ngay cả khi data thật đã được load đúng

### Cơ chế

```
sampleUserData (le_xuan_khanh_sample_tracking.json):
  dailyTracking.days = [
    { date: "2026-05-12", tasks: [...] },
    { date: "2026-05-13", tasks: [...] },
    ...
    { date: "2026-06-11", tasks: [{ taskId: "water", current: 1 }] },
    { date: "2026-06-12", tasks: [{ taskId: "water", current: 0 }] },  ← .at(-1)
  ]  // 31 ngày dữ liệu mẫu

ensureUser() CỦ khi tạo Google user:
  const seed = clone(sampleUserData)
  seed.activityLog = []        ← reset
  seed.proofImages = []        ← reset
  seed.rewards.claimed = []    ← reset
  seed.profile.xp = 0          ← reset
  // seed.dailyTracking.days ← KHÔNG RESET! ← giữ nguyên 31 ngày sample

getTaskSnapshot(user):
  const today = todayISODate()   // "2026-06-28"
  const day = journeyUser.dailyTracking.days
    .find(entry => entry.date === today)  // → không tìm thấy "2026-06-28"
    || journeyUser.dailyTracking.days.at(-1)  // → "2026-06-12" với water=0 ❌
  return { journeyUser, day }

TaskDetailPopup hiển thị:
  todayRec = snapshot.day.tasks.find(t => t.taskId === "water")
           = { current: 0, target: 1 }  ← từ ngày sample, không phải hôm nay
  → "0/1 lần" ❌
```

### Visualize

```
dailyTracking.days của Google user mới (BUG — không reset):

  ┌──────────────┐
  │ 2026-05-12   │  sample data
  │ water: 1     │
  ├──────────────┤
  │ 2026-05-13   │  sample data
  │ water: 0     │
  ├──────────────┤
  │    ...       │  29 ngày nữa
  ├──────────────┤
  │ 2026-06-11   │  sample data
  │ water: 1     │
  ├──────────────┤
  │ 2026-06-12   │ ← .at(-1) ← fallback về đây  ❌
  │ water: 0     │   khi không tìm thấy "2026-06-28"
  └──────────────┘

  "2026-06-28" ← KHÔNG CÓ → find() trả về undefined → at(-1) = ngày cũ với water=0

────────────────────────────────────────────────────

dailyTracking.days của Google user mới (FIX — reset về []):

  [] ← trống

  "2026-06-28" ← KHÔNG CÓ → find() trả về undefined → at(-1) = undefined
  → day = undefined
  → todayRec = undefined
  → TaskDetailPopup hiển thị "0/1 lần" nhưng từ fallback an toàn
     (không phải từ sample data gây nhầm lẫn)
  → Sau khi user lưu proof, day "2026-06-28" được tạo với water=1 ✅
```

### Fix

```javascript
// TRƯỚC (BUG):
const ensureUser = (db, user) => {
  const seed = clone(sampleUserData)
  seed.activityLog = []
  seed.proofImages = []
  // dailyTracking.days không được reset → giữ 31 ngày sample!
  // ...
}

// SAU (FIX):
const ensureUser = (db, user) => {
  const seed = clone(sampleUserData)
  seed.dailyTracking.days = []  // ← thêm dòng này
  seed.activityLog = []
  seed.proofImages = []
  // ...
}
```

---

## 6. Bug #3 — `todayISODate()` dùng UTC thay vì local time

**Mức độ:** 🟠 High — gây mất task hàng ngày trước 7:00 sáng (Vietnam UTC+7)

### Cơ chế

```
healthJourneyStorage.js:
  const todayISODate = () => new Date().toISOString().slice(0, 10)
  //                         ↑ .toISOString() = UTC

beMeoChatStorage.js:
  export function dateKey(d = new Date()) {
    const y = d.getFullYear()      // local
    const m = d.getMonth() + 1     // local
    const day = d.getDate()        // local
    return `${y}-${m}-${day}`
  }

Tình huống trước 7:00 sáng giờ Vietnam (UTC+7):
  Local time:  06:30 ngày 2026-06-28
  UTC time:    23:30 ngày 2026-06-27

  todayISODate()  = "2026-06-27"  ← UTC  (ngày HÔM QUA)
  beMeoDateKey()  = "2026-06-28"  ← local (ngày HÔM NAY)

User uống nước lúc 06:30:
  - syncBeMeoWater lưu vào key "2026-06-28" (local) ✓
  - completeHealthJourneyActivity dùng timestamp UTC
    → updateDailyTask: today = "2026-06-27"
    → day được lưu với date = "2026-06-27"

getTaskSnapshot sau đó:
  today = todayISODate() = "2026-06-27" (UTC)
  → find(entry => entry.date === "2026-06-27") ← tìm thấy (vừa lưu)
  → OK... trừ khi đây là kết quả từ ngày hôm qua

User reload lúc 07:30 (UTC+7 = 00:30 UTC ngày 2026-06-28):
  todayISODate() = "2026-06-28" (UTC)
  → find(entry => entry.date === "2026-06-28") → undefined
  → at(-1) → ngày "2026-06-27" (ngày hôm qua) hoặc ngày sample
  → Tùy data, có thể hiện đúng hoặc sai

Inconsistency log:
  ┌─────────────────┬──────────────────┬────────────────┐
  │ Lúc uống nước   │ todayISODate()   │ beMeoDateKey() │
  ├─────────────────┼──────────────────┼────────────────┤
  │ 06:00 VN (UTC+7)│ 2026-06-27 (UTC) │ 2026-06-28     │ ← KHÁC NHAU ❌
  │ 08:00 VN        │ 2026-06-28       │ 2026-06-28     │ ← khớp ✓
  │ 23:00 VN        │ 2026-06-28       │ 2026-06-28     │ ← khớp ✓
  └─────────────────┴──────────────────┴────────────────┘
```

### Fix

```javascript
// TRƯỚC (BUG):
const todayISODate = () => new Date().toISOString().slice(0, 10)
// → "2026-06-27" lúc 06:30 VN (UTC)

// SAU (FIX — nhất quán với beMeoChatStorage.dateKey()):
const todayISODate = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
// → "2026-06-28" lúc 06:30 VN (local) ← đúng
```

---

## 7. Bug #4 — `hydrate()` đặt `hydrated = true` sau khi fire event (Vòng 1)

**Mức độ:** 🟡 Medium — phát hiện ở vòng điều tra đầu, đã fix trong vòng 1

### Cơ chế

```
CODE VÒ GIẢI 1 (bug):
  async function hydrate() {
    const stored = await getSetting(...)
    if (stored && !savedThisSession) {
      memDb = stored
      window.dispatchEvent(HEALTH_JOURNEY_EVENT)  // ← fire event
      //                                          ← handler chạy NGAY
      //                                          ← handler: loadDb → self-heal → persist()
      //                                          ← persist(): hydrated = false → CHẶN
    }
    hydrated = true  ← đặt SAU KHI fire event, quá muộn
  }

  Event handler chạy:
    refreshSnapshot() → loadHealthJourneyDb()
    → self-heal mutations OK
    → persist(memDb) ← hydrated = false → BỊ CHẶN
    → self-heal đúng nhưng KHÔNG được lưu xuống IndexedDB

  Hậu quả: IndexedDB có thể chứa bản chưa được self-heal
  → lần reload tiếp theo đọc lên bản cũ chưa heal
  → objective completed flags sai → UI sai

FIX (vòng 1):
  hydrated = true  ← đặt TRƯỚC khi fire event
  // self-heal ngay trên stored data
  const healed = migrateLargeImages(memDb) || ...
  if (healed) persist(memDb)  // ← hydrated=true → GHI ĐƯỢC
  window.dispatchEvent(HEALTH_JOURNEY_EVENT)  // ← fire sau
```

---

## 8. Bug #5 — `loadHealthJourneyDb()` self-heal trước khi hydrate (Vòng 1)

**Mức độ:** 🟡 Medium — phát hiện ở vòng điều tra đầu, đã fix trong vòng 1

### Cơ chế

```
CODE VÒ GIẢI 1 (bug):
  export function loadHealthJourneyDb() {
    if (!memDb) memDb = defaultDb()

    // Luôn chạy dù memDb có thể là defaultDb() tạm
    const changed = migrateLargeImages(memDb)    // ← chạy trên defaultDb()
                  || ensureAllChapterObjectives(memDb)
                  || repairObjectiveCompletedFlags(memDb)
    if (changed) persist(memDb)  // ← persist() có guard hydrated nhưng...
    // Edge case: nếu IndexedDB throw error → catch → hydrated = true sớm
    // → persist() chạy với defaultDb() → ghi đè data thật
  }

FIX (vòng 1):
  export function loadHealthJourneyDb() {
    if (!memDb) memDb = defaultDb()

    if (hydrated) {  // ← chỉ self-heal khi có data thật
      const changed = migrateLargeImages(memDb) || ...
      if (changed) persist(memDb)
    } else {
      // Chỉ đảm bảo sampleUser tồn tại (UI không crash), KHÔNG persist
      if (!memDb.users?.[sampleUserId]) {
        memDb.users[sampleUserId] = clone(sampleUserData)
      }
    }
  }
```

---

## 9. Timeline Tổng hợp — Toàn Bộ Luồng Lỗi

```
RELOAD TRANG — GOOGLE USER — TẤT CẢ 5 BUG CÙNG LÚC

t=0ms ──── Browser load JS bundle
           │
           │  healthJourneyStorage.js execute:
t=5ms ─────┤  memDb = null
           │  savedThisSession = false
           │  hydrated = false
           │  hydrate() bắt đầu → IndexedDB.get("health_journey_db_v2")
           │
           │  AuthContext.jsx execute:
t=6ms ─────┤  getSavedSession() → localStorage ["cdoc_session"]
           │  → { email: "khanhlegood1@gmail.com" }
           │  → getUsers()["khanhlegood1@gmail.com"]
           │  → setUser({ uuid: "HEALTH-20260101-xxx", name: "Khánh" })
           │  ← XONG NGAY (đồng bộ)
           │
           │  React render App → HealthJourneyGameStandalone:
t=8ms ─────┤  useState(() => getTaskSnapshot(user))
           │      ↓
           │  getHealthJourneyUser(user)
           │      ↓
           │  loadHealthJourneyDb()
           │      → memDb = defaultDb()  ← hydrate chưa xong
           │      → [BUG #5] self-heal chạy trên defaultDb tạm
           │        (bị chặn bởi persist guard — OK bước này)
           │      ↓
           │  makeUserId(user) = "health-20260101-xxx"
           │  db.users["health-20260101-xxx"] → không có trong defaultDb
           │  ensureUser():
           │      → seed = clone(sampleUserData)
           │      → [BUG #2] seed.dailyTracking.days = [31 ngày sample]
           │        (không reset → mang theo ngày 2026-06-12, water=0)
           │      → db.users["health-20260101-xxx"] = seed
           │  existed = false
           │  [BUG #1] saveHealthJourneyDb(db) được gọi!
           │      → savedThisSession = TRUE  ← POISON
           │      → persist(): hydrated=false → CHẶN (OK)
           │      → fire HEALTH_JOURNEY_EVENT (memDb rỗng)
           │
           │  getTaskSnapshot():
t=9ms ─────┤  [BUG #3] today = todayISODate() = "2026-06-27" (UTC)
           │            (local = "2026-06-28", lệch nếu trước 7am)
           │  days.find(d => d.date === "2026-06-27") → undefined
           │  .at(-1) → { date: "2026-06-12", water: { current: 0 } }
           │  snapshot.day.tasks.find(water) = { current: 0 }
           │  UI: "0/1 lần" (tạm thời, chờ hydrate)
           │
           │ ... nhiều re-render với memDb rỗng ...
           │
           │  hydrate() nhận response từ IndexedDB:
t=80ms ────┤  stored = {
           │    users: {
           │      "health-20260101-xxx": {
           │        dailyTracking.days: [{
           │          date: "2026-06-28",
           │          tasks: [{ taskId: "water", current: 1 }]
           │        }]
           │      }
           │    }
           │  }
           │
           │  [BUG #1 KÍCH HOẠT]:
           │  if (stored && !savedThisSession)  ← savedThisSession = TRUE
           │               ↑ điều kiện FALSE → BỎ QUA stored!
           │
           │  hydrated = true
           │  [BUG #4] (nếu chưa fix vòng 1):
           │    fire event trước khi hydrated = true
           │    → handler persist() bị chặn
           │
           │  if (savedThisSession) persist(memDb)
           │  → memDb = defaultDb với water=0
           │  → IndexedDB GHI ĐÈ: { "health-20260101-xxx": { water: 0 } }
           │  ← DATA THẬT BỊ XÓA
           │
t=82ms ────┤  UI nhận HEALTH_JOURNEY_EVENT
           │  setSnapshot(getTaskSnapshot(user))
           │  → loadHealthJourneyDb() → memDb rỗng, water=0
           │  → "0/1 lần" ❌ (final, không còn thay đổi nữa)
           │
           └── RELOAD LẦN 2:
               → IndexedDB đọc lên { water: 0 } (đã bị ghi đè)
               → "0/1 lần" ❌ (vĩnh viễn cho đến khi uống lại)
```

---

## 10. Tất cả Fix đã áp dụng

### Tổng quan

```
┌─────┬──────────────────────────────────────────┬────────────┬───────┐
│ Bug │ Vị trí                                   │ Mức độ     │ Vòng  │
├─────┼──────────────────────────────────────────┼────────────┼───────┤
│ #1  │ hydrate() — savedThisSession poison       │ 🔴 Critical│   2   │
│ #2  │ ensureUser() — days không reset           │ 🟠 High    │   2   │
│ #3  │ todayISODate() — UTC vs local             │ 🟠 High    │   2   │
│ #4  │ hydrate() — hydrated=true quá muộn        │ 🟡 Medium  │   1   │
│ #5  │ loadHealthJourneyDb() — self-heal sớm     │ 🟡 Medium  │   1   │
└─────┴──────────────────────────────────────────┴────────────┴───────┘
```

---

### Fix #1 — `hydrate()`: LUÔN load stored, MERGE thay vì bỏ qua

```javascript
// TRƯỚC:
if (stored && !savedThisSession) {
  memDb = stored
}

// SAU:
if (stored) {
  const currentMemDb = memDb  // snapshot trước khi bị replace
  memDb = stored              // stored luôn là nguồn sự thật

  // Merge: chỉ thêm user thật sự mới chưa có trong stored
  if (currentMemDb?.users) {
    Object.entries(currentMemDb.users).forEach(([uid, userData]) => {
      if (!memDb.users) memDb.users = {}
      if (!memDb.users[uid]) {  // chỉ user CHƯA có trong stored
        const freshUser = clone(userData)
        // Đảm bảo user mới không mang sample days
        if (uid !== sampleUserData.user.userId) {
          freshUser.dailyTracking = { ...freshUser.dailyTracking, days: [] }
        }
        memDb.users[uid] = freshUser
      }
      // User đã có trong stored → KHÔNG ghi đè → giữ data thật
    })
  }

  hydrated = true
  savedThisSession = false  // reset: stored đã load xong
  // self-heal + persist + fire event
}
```

---

### Fix #2 — `ensureUser()`: Reset `dailyTracking.days`

```javascript
// TRƯỚC:
const seed = clone(sampleUserData)
seed.activityLog = []
seed.proofImages = []
// dailyTracking.days không reset → giữ 31 ngày sample!

// SAU:
const seed = clone(sampleUserData)
seed.dailyTracking.days = []  // ← thêm
seed.activityLog = []
seed.proofImages = []
```

---

### Fix #3 — `todayISODate()`: Dùng local time

```javascript
// TRƯỚC:
const todayISODate = () => new Date().toISOString().slice(0, 10)
// → UTC: "2026-06-27" lúc 06:30 VN ❌

// SAU:
const todayISODate = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
// → local: "2026-06-28" lúc 06:30 VN ✅
```

---

### Fix #4 — `hydrate()`: `hydrated = true` trước khi fire event

```javascript
// TRƯỚC:
window.dispatchEvent(HEALTH_JOURNEY_EVENT)  // fire trước
hydrated = true  // đặt sau → handler không thể persist ❌

// SAU:
hydrated = true  // đặt trước
// self-heal + persist
window.dispatchEvent(HEALTH_JOURNEY_EVENT)  // fire sau ✅
```

---

### Fix #5 — `loadHealthJourneyDb()`: Self-heal chỉ khi hydrated

```javascript
// TRƯỚC:
export function loadHealthJourneyDb() {
  // Luôn chạy self-heal dù memDb có thể là defaultDb tạm
  const changed = migrate() || ensureObjectives() || repairFlags()
  if (changed) persist(memDb)  // edge case: có thể ghi đè ❌
}

// SAU:
export function loadHealthJourneyDb() {
  if (hydrated) {
    // Chỉ chạy sau khi có data thật
    const changed = migrate() || ensureObjectives() || repairFlags()
    if (changed) persist(memDb)
  } else {
    // Chỉ đảm bảo sampleUser tồn tại, KHÔNG persist
    if (!memDb.users?.[sampleUserId]) { ... }
  }
}
```

---

### Fix #6 — `getHealthJourneyUser()`: Không save trước khi hydrate

```javascript
// TRƯỚC:
if (!existed) saveHealthJourneyDb(db)  // gây savedThisSession=true sớm ❌

// SAU:
if (!existed && hydrated) saveHealthJourneyDb(db)  // chỉ save khi hydrate xong ✅
```

---

### Before / After Flow Diagram

```
BEFORE (tất cả bugs):
──────────────────────────────────────────────────────────────────
t=8ms    component mount → ensureUser (user không có trong defaultDb)
         → saveHealthJourneyDb() → savedThisSession = TRUE ← POISON

t=80ms   hydrate nhận stored (water=1)
         → !savedThisSession = FALSE → BỎ QUA stored
         → persist(defaultDb với water=0) → GHI ĐÈ IndexedDB

t=82ms   UI: "0/1 lần" ❌
next load IndexedDB = { water: 0 } → "0/1 lần" ❌ vĩnh viễn

AFTER (tất cả bugs đã fix):
──────────────────────────────────────────────────────────────────
t=8ms    component mount → ensureUser
         → getHealthJourneyUser: existed=false && hydrated=false
         → saveHealthJourneyDb KHÔNG được gọi ← FIX #6
         → savedThisSession vẫn = false

t=80ms   hydrate nhận stored (water=1)
         → LUÔN load stored (FIX #1)
         → merge: google user đã có trong stored → giữ nguyên
         → hydrated = true, savedThisSession = false
         → self-heal, persist (water=1 → IndexedDB)
         → fire HEALTH_JOURNEY_EVENT

t=82ms   component refresh snapshot
         → today = "2026-06-28" (local, FIX #3)
         → days.find("2026-06-28") → { current: 1 } ← tìm thấy
         → UI: "1/1 lần" ✅

next load IndexedDB = { water: 1 } → "1/1 lần" ✅
```

---

## 11. Checklist kiểm tra sau deploy

### Test cases cần verify

```
CRITICAL:
  □ Google user uống nước → reload → vẫn hiện "1/1 lần"
  □ Google user uống nước → đóng tab → mở tab mới → "1/1 lần"
  □ Google user uống nước lúc 06:00 sáng → reload lúc 07:00 → "1/1 lần"
  □ Google user uống nước nhiều ngày → mỗi ngày đúng count

HIGH:
  □ Guest user uống nước → reload → không bị ảnh hưởng
  □ Google user lần đầu đăng nhập → không thấy sample data (0 ngày)
  □ Google user với data nhiều ngày → reload → tất cả ngày cũ đúng
  □ Proof ảnh + mốc thời gian trong TaskDetailPopup đúng ngày

MEDIUM:
  □ Tab 1 uống nước → Tab 2 cũng hiện "1/1" sau refresh
  □ Bé Mèo Nước water state nhất quán với game state
  □ Medical Records có proof ảnh → TaskDetailPopup nhận ra
  □ Offline → app không crash, fallback graceful
```

### Debug console (để verify data thật trong IndexedDB)

```javascript
// Kiểm tra data thật ngay trong browser console:
(async () => {
  const req = indexedDB.open('cdoc_guest', 1)
  req.onsuccess = (e) => {
    const db = e.target.result
    const tx = db.transaction('settings', 'readonly')
    const get = tx.objectStore('settings').get('health_journey_db_v2')
    get.onsuccess = () => {
      const data = get.result?.value
      if (!data) { console.log('No stored data'); return }
      const googleUser = Object.entries(data.users || {})
        .find(([k]) => k !== 'le-xuan-khanh-sample')
      if (!googleUser) { console.log('No google user'); return }
      const [uid, u] = googleUser
      const today = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD local
      const day = u.dailyTracking.days.find(d => d.date === today)
      console.log('User ID:', uid)
      console.log('Today:', today)
      console.log('Today water task:', day?.tasks?.find(t => t.taskId === 'water'))
      console.log('All days count:', u.dailyTracking.days.length)
    }
  }
})()
```

---

## Tóm tắt một trang

```
┌──────────────────────────────────────────────────────────────────────┐
│                   5 BUG → 6 FIX → 1 FILE THAY THẾ                   │
├──────┬────────────────────────────┬──────────────────────────────────┤
│ Bug  │ Vấn đề                     │ Fix                              │
├──────┼────────────────────────────┼──────────────────────────────────┤
│ #1   │ savedThisSession poison:   │ hydrate() luôn load stored,      │
│      │ ensureUser() save sớm →    │ merge memDb vào stored thay vì   │
│      │ hydrate bỏ qua stored      │ bỏ qua. Reset savedThisSession.  │
├──────┼────────────────────────────┼──────────────────────────────────┤
│ #2   │ ensureUser không reset     │ Thêm seed.dailyTracking.days=[]  │
│      │ days → 31 ngày sample data │ để user mới bắt đầu sạch        │
│      │ → fallback sai ngày        │                                  │
├──────┼────────────────────────────┼──────────────────────────────────┤
│ #3   │ todayISODate() dùng UTC    │ Dùng getDate/getMonth/getFullYear│
│      │ → lệch ngày trước 7am VN  │ (local time) như beMeoDateKey()  │
├──────┼────────────────────────────┼──────────────────────────────────┤
│ #4   │ hydrated=true đặt sau khi  │ Đặt hydrated=true trước fire     │
│      │ fire event → handler       │ event, self-heal ngay trên       │
│      │ không thể persist          │ stored data                      │
├──────┼────────────────────────────┼──────────────────────────────────┤
│ #5   │ loadHealthJourneyDb()      │ Bọc self-heal trong if(hydrated) │
│      │ self-heal trên defaultDb   │ → chỉ chạy khi có data thật     │
│      │ tạm trước khi hydrate      │                                  │
├──────┼────────────────────────────┼──────────────────────────────────┤
│ #6*  │ getHealthJourneyUser()     │ if (!existed && hydrated)        │
│      │ save trước hydrate →       │ saveHealthJourneyDb(db)          │
│      │ trigger poison chain       │ (guard thêm tầng phòng thủ)      │
└──────┴────────────────────────────┴──────────────────────────────────┘
*Bug #6 là nguyên nhân kích hoạt Bug #1; cả hai cùng được fix.

File thay thế: src/components/health-journey-game/services/healthJourneyStorage.js
Không thay đổi file nào khác.
```

---

*Generated: 2026-06-28 · AI Doctor Admin · Health Journey Bug Analysis v2*
