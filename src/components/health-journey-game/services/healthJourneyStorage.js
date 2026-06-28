import journeysJson from '../data/journeys.json'
import sampleUserData from '../data/le_xuan_khanh_sample_tracking.json'
import { getSetting, setSetting } from '../../../lib/anonDB.js'

export const HEALTH_JOURNEY_EVENT = 'health-journey:updated'
// Khoá lưu trong IndexedDB (store "settings" của anonDB.js). Đổi tên key (_v2) vì
// backend lưu trữ đổi từ localStorage → IndexedDB, không liên quan tới key cũ.
const HEALTH_JOURNEY_DB_KEY = 'health_journey_db_v2'
// Key localStorage CŨ — chỉ dùng để dọn dẹp (xoá) một lần, không đọc/migrate dữ liệu cũ.
const LEGACY_LOCALSTORAGE_KEY = 'health_journey_local_db_v1'

export const ACTIVITY_TASK_MAP = {
  import_inbody: 'inbody',
  drink_water: 'water',
  walk_10000_steps: 'walk',
  deep_work_90m: 'deep_work',
  read_20_pages: 'read_book',
  breath_activation: 'breathing',
  no_sugar_challenge: 'no_sugar',
  cold_shower: 'cold_shower',
  reflection_journal: 'reflection',
}

export const TASK_ACTIVITY_MAP = Object.entries(ACTIVITY_TASK_MAP).reduce((map, [activityType, taskId]) => {
  map[taskId] = activityType
  return map
}, {})

/**
 * Build a flat list of journey objectives from ALL chapters in journeys.json.
 * Single source of truth for what objectives should exist in every user's profile.
 */
function buildAllObjectivesFromJourneys() {
  return (journeysJson.journeys || []).flatMap((journey) =>
    (journey.requiredObjectives || []).map((obj) => ({
      chapter: journey.chapter,
      activityType: obj.task,
      title: obj.title || { vi: obj.task, en: obj.task },
      current: 0,
      target: obj.target || 1,
      completed: false,
      updatedAt: new Date().toISOString(),
    }))
  )
}

/**
 * ensureAllChapterObjectives — self-heal migration for existing users.
 * 1. Adds any missing objectives (new chapters/tasks).
 * 2. Syncs `target` for ALL existing objectives to match journeys.json (source of truth).
 *    This fixes stale targets when journeys.json is updated (e.g. Chapter 1 halved).
 *    `current` progress is preserved; `completed` is recomputed against the new target.
 * Returns true if db was modified.
 */
function ensureAllChapterObjectives(db) {
  const allExpected = buildAllObjectivesFromJourneys()
  let changed = false
  Object.values(db.users || {}).forEach((user) => {
    if (!user.journeyProgress) return
    const existing = user.journeyProgress.objectives || []
    allExpected.forEach((expected) => {
      const found = existing.find(
        (o) => o.activityType === expected.activityType && o.chapter === expected.chapter
      )
      if (!found) {
        // Objective missing entirely — add it
        existing.push({ ...expected })
        changed = true
      } else if (found.target !== expected.target) {
        // Target changed in journeys.json — sync it and recompute completed
        found.target = expected.target
        found.completed = Number(found.current || 0) >= expected.target
        changed = true
      }
    })
    if (changed) user.journeyProgress.objectives = existing
  })
  return changed
}

export const XP_TABLE = {
  import_inbody: 100,
  drink_water: 10,
  walk_10000_steps: 50,
  deep_work_90m: 60,
  read_20_pages: 30,
  breath_activation: 20,
  no_sugar_challenge: 40,
  cold_shower: 20,
  reflection_journal: 20,
}

const todayISODate = () => new Date().toISOString().slice(0, 10)

const makeUserId = (user) => {
  const raw = user?.uuid || sampleUserData.user.userId || 'guest'
  return raw.toString().trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-') || 'guest'
}

const clone = (value) => JSON.parse(JSON.stringify(value))

// IndexedDB không có giới hạn ~5MB như localStorage, nên ảnh proof được lưu
// trực tiếp, không cần "compress"/cắt bỏ ảnh lớn hay tách sang chỗ khác nữa.
function migrateLargeImages(db) {
  // Giữ lại để chỉ trim activityLog/proofImages quá dài (vệ sinh bộ nhớ),
  // KHÔNG còn xoá/thay ảnh vì IndexedDB đủ chỗ chứa.
  let changed = false
  Object.values(db.users || {}).forEach((user) => {
    if (Array.isArray(user.activityLog) && user.activityLog.length > 500) {
      user.activityLog = user.activityLog.slice(0, 500)
      changed = true
    }
    if (Array.isArray(user.proofImages) && user.proofImages.length > 500) {
      user.proofImages = user.proofImages.slice(0, 500)
      changed = true
    }
  })
  return changed
}

// BUG FIX (self-heal): trước đây `ensureUser` reset `current: 0` cho user mới
// nhưng KHÔNG reset `completed`, nên objective giữ nguyên `completed: true`
// copy từ sample data (vốn đã hoàn thành 30/30) → khiến `chapter1Done` bị tính
// SAI ngay từ activity đầu tiên (vd uống nước 1 lần trong khi target=30) hoặc,
// với data cũ đã lưu trước bản fix này, khiến objective bị "kẹt" ở trạng thái
// completed sai lệch vĩnh viễn → hành trình/Chapter không đồng bộ đúng theo
// số lần proof thật. Hàm này tính lại `completed` cho MỌI objective của MỌI
// user mỗi lần load DB, để tự sửa cả user mới lẫn data cũ đã bị lỗi từ trước.
function repairObjectiveCompletedFlags(db) {
  let changed = false
  Object.values(db.users || {}).forEach((user) => {
    user.journeyProgress?.objectives?.forEach((objective) => {
      const shouldBeCompleted = Number(objective.current || 0) >= Number(objective.target || 0)
      if (Boolean(objective.completed) !== shouldBeCompleted) {
        objective.completed = shouldBeCompleted
        changed = true
      }
    })
  })
  return changed
}



// ─── In-memory cache + IndexedDB persistence ─────────────────────────────────
// Mọi component trong game gọi loadHealthJourneyDb()/saveHealthJourneyDb() một
// cách ĐỒNG BỘ (trong render, onClick...), nhưng IndexedDB chỉ có API bất đồng
// bộ. Giải pháp: giữ 1 bản cache trong RAM (`memDb`) làm "nguồn sự thật" trong
// lúc trang đang chạy — đọc/ghi cache này luôn đồng bộ, còn việc đồng bộ xuống
// IndexedDB chạy nền (fire-and-forget). Khi trang vừa mở, cache được "hydrate"
// (nạp) từ IndexedDB ngay — nếu chưa có ai lưu gì mới trong phiên này thì dữ
// liệu vừa nạp sẽ thay cho bản mặc định tạm, và bắn HEALTH_JOURNEY_EVENT để UI
// tự refresh lại theo dữ liệu thật.
let memDb = null
let savedThisSession = false
let hydratePromise = null

function persist(db) {
  setSetting(HEALTH_JOURNEY_DB_KEY, db).catch((e) => console.warn('[healthJourneyStorage] IndexedDB write failed', e))
}

function hydrate() {
  if (hydratePromise) return hydratePromise
  hydratePromise = (async () => {
    try {
      const stored = await getSetting(HEALTH_JOURNEY_DB_KEY)
      if (stored && !savedThisSession) {
        memDb = stored
        window.dispatchEvent(new CustomEvent(HEALTH_JOURNEY_EVENT, { detail: memDb }))
      }
    } catch (e) {
      console.warn('[healthJourneyStorage] IndexedDB read failed', e)
    }
    // Dọn key localStorage cũ (không còn dùng, dữ liệu cũ không cần giữ)
    try { localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY) } catch (_) { /* ignore */ }
  })()
  return hydratePromise
}
if (typeof window !== 'undefined') hydrate()

const defaultDb = () => ({
  version: 1,
  seededAt: new Date().toISOString(),
  users: {
    [sampleUserData.user.userId]: clone(sampleUserData),
  },
})

const ensureUser = (db, user) => {
  const userId = makeUserId(user)
  if (db.users[userId]) return db.users[userId]

  const seed = clone(sampleUserData)
  seed.user = {
    ...seed.user,
    userId,
    displayName: user?.name || 'Guest Health Journey User',
    email: user?.email || null,
    avatar: user?.avatar || user?.picture || '',
  }
  seed.profile.userId = userId
  seed.dailyTracking.userId = userId
  seed.activityLog = []
  seed.proofImages = []
  seed.rewards.claimed = []
  seed.journeyProgress.currentChapter = 1
  seed.journeyProgress.unlockedChapters = [1]
  seed.journeyProgress.objectives = buildAllObjectivesFromJourneys()
  seed.profile.xp = 0
  seed.profile.energy = 100
  seed.profile.coins = 0
  db.users[userId] = seed
  return seed
}

export function loadHealthJourneyDb() {
  if (typeof window === 'undefined') return defaultDb()
  if (!memDb) memDb = defaultDb()

  const changedImages = migrateLargeImages(memDb)
  const changedMissingObjectives = ensureAllChapterObjectives(memDb)
  const changedObjectives = repairObjectiveCompletedFlags(memDb)
  if (!memDb.users?.[sampleUserData.user.userId]) {
    memDb.users = { ...(memDb.users || {}), [sampleUserData.user.userId]: clone(sampleUserData) }
  }
  if (changedImages || changedMissingObjectives || changedObjectives) persist(memDb)

  return memDb
}

export function saveHealthJourneyDb(db) {
  if (typeof window === 'undefined') return db
  const nextDb = { ...db, updatedAt: new Date().toISOString() }
  memDb = nextDb
  savedThisSession = true
  persist(nextDb)
  window.dispatchEvent(new CustomEvent(HEALTH_JOURNEY_EVENT, { detail: nextDb }))
  return nextDb
}

export function getHealthJourneyUser(user) {
  const db = loadHealthJourneyDb()
  const userId = makeUserId(user)
  const existed = Boolean(db.users?.[userId])
  const journeyUser = ensureUser(db, user)
  if (!existed) saveHealthJourneyDb(db)
  return journeyUser
}

export function getTaskSnapshot(user) {
  const journeyUser = getHealthJourneyUser(user)
  const today = todayISODate()
  const day = journeyUser.dailyTracking.days.find((entry) => entry.date === today) || journeyUser.dailyTracking.days.at(-1)
  return { journeyUser, day }
}

function updateDailyTask(journeyUser, activityType, timestamp, proof) {
  const today = timestamp.slice(0, 10)
  let day = journeyUser.dailyTracking.days.find((entry) => entry.date === today)
  if (!day) {
    day = {
      date: today,
      completed: false,
      xpEarned: 0,
      tasks: journeyUser.dailyTasks.map((task) => ({
        taskId: task.taskId,
        current: 0,
        target: task.target,
        completed: false,
        updatedAt: timestamp,
        proofActivityIds: [],
      })),
    }
    journeyUser.dailyTracking.days.push(day)
  }

  const taskId = ACTIVITY_TASK_MAP[activityType]
  const task = day.tasks.find((entry) => entry.taskId === taskId)
  if (!task) return day

  if (task.taskId === 'water') task.current += 1
  else if (task.taskId === 'walk') task.current += Math.max(Number(task.target || 10000), Number(proof?.value || 10000))
  else if (task.taskId === 'deep_work') task.current += Math.max(Number(task.target || 90), Number(proof?.value || 90))
  else if (task.taskId === 'read_book') task.current += Math.max(Number(task.target || 20), Number(proof?.value || 20))
  else if (task.taskId === 'breathing') task.current += Math.max(Number(task.target || 5), Number(proof?.value || 5))
  else task.current += Math.max(Number(task.target || 1), Number(proof?.value || 1))

  task.completed = task.current >= task.target
  task.updatedAt = timestamp
  if (proof?.activityId && !task.proofActivityIds.includes(proof.activityId)) task.proofActivityIds.push(proof.activityId)

  day.xpEarned = day.tasks.reduce((sum, entry) => {
    const taskConfig = journeyUser.dailyTasks.find((item) => item.taskId === entry.taskId)
    return sum + (entry.completed ? (taskConfig?.xp || 0) : 0)
  }, 0)
  day.completed = day.tasks.every((entry) => entry.completed)
  return day
}

function updateJourney(journeyUser, activityType, timestamp) {
  // Increment ALL objectives matching this activityType across ALL chapters.
  // e.g. drink_water appears in Ch1 AND Ch3 — both counters advance simultaneously.
  const matchingObjectives = journeyUser.journeyProgress.objectives.filter(
    (entry) => entry.activityType === activityType
  )
  if (matchingObjectives.length === 0) return null

  matchingObjectives.forEach((objective) => {
    objective.current += 1
    objective.updatedAt = timestamp
    objective.completed = objective.current >= objective.target
  })

  return matchingObjectives[0]
}

export function completeHealthJourneyActivity({ user, activityType, value = 1, proofImage = '', uploadRecord = null, metadata = {} }) {
  const db = loadHealthJourneyDb()
  const journeyUser = ensureUser(db, user)
  const timestamp = new Date().toISOString()
  const xpEarned = XP_TABLE[activityType] || 0
  const activityId = `act_${activityType}_${Date.now()}`
  const proof = proofImage ? {
    id: `proof_${Date.now()}`,
    userId: journeyUser.user.userId,
    activityId,
    activityType,
    image: proofImage || '',
    verified: true,
    confidence: 0.95,
    capturedAt: timestamp,
    uploadRecordId: uploadRecord?.id || null,
    uploadPath: uploadRecord?.uploadPath || '',
    value,
  } : null

  const activity = {
    id: activityId,
    userId: journeyUser.user.userId,
    type: activityType,
    taskId: ACTIVITY_TASK_MAP[activityType] || activityType,
    timestamp,
    value,
    xpEarned,
    proofImage: proofImage || '',
    proofId: proof?.id || null,
    uploadRecordId: uploadRecord?.id || null,
    uploadPath: uploadRecord?.uploadPath || '',
    metadata,
  }

  journeyUser.activityLog.unshift(activity)
  if (proof) journeyUser.proofImages.unshift(proof)
  journeyUser.profile.xp += xpEarned
  journeyUser.profile.energy = Math.min(999, journeyUser.profile.energy + 5)
  const day = updateDailyTask(journeyUser, activityType, timestamp, proof)
  const objective = updateJourney(journeyUser, activityType, timestamp)
  journeyUser.updatedAt = timestamp

  saveHealthJourneyDb(db)
  return { db, journeyUser, activity, proof, day, objective }
}

/**
 * isChapterCompleted — kiểm tra chapter N đã hoàn thành chưa.
 * Chapter được coi là hoàn thành khi:
 *   - Tất cả requiredObjectives của chapter đó đã đạt target (nếu có)
 *   - HOẶC chapter không có objectives nhưng đã được unlock (mặc định pass)
 * journeysData được truyền vào để tránh import vòng.
 */
export function isChapterCompleted(progress, chapterNum, journeysData) {
  const journey = (journeysData || []).find((j) => j.chapter === chapterNum)
  const objectives = journey?.requiredObjectives || []

  // Nếu chapter không có objectives: coi như hoàn thành khi đã được unlock
  if (objectives.length === 0) return progress.unlockedChapters?.includes(chapterNum) ?? false

  return objectives.every((obj) => {
    const o = progress.objectives?.find((x) => x.activityType === obj.task)
    return o ? (o.current >= (o.target || obj.target || 1)) : false
  })
}

/**
 * checkAndUnlockChapters — gọi từ UI sau mỗi lần refresh snapshot.
 * Duyệt qua TẤT CẢ chapters, nếu chapter N đã hoàn thành và chapter N+1 chưa unlock
 * thì tự động unlock chapter N+1, ghi reward, fire HEALTH_JOURNEY_EVENT.
 * Trả về mảng số chapter vừa được unlock trong lần gọi này (rỗng nếu không có gì mới).
 *
 * @param {object} user              - auth user object
 * @param {Array}  journeysJsonData  - mảng journeys từ journeys.json
 */
export function checkAndUnlockChapters(user, journeysJsonData) {
  if (!user) return []
  const allJourneys = journeysJsonData || []
  if (allJourneys.length === 0) return []

  const db = loadHealthJourneyDb()
  const journeyUser = ensureUser(db, user)
  const progress = journeyUser.journeyProgress
  const timestamp = new Date().toISOString()
  const newlyUnlocked = []

  for (let i = 0; i < allJourneys.length - 1; i++) {
    const current = allJourneys[i]
    const next = allJourneys[i + 1]
    if (progress.unlockedChapters.includes(next.chapter)) continue // đã unlock rồi

    const currentDone = isChapterCompleted(progress, current.chapter, allJourneys)
    if (!currentDone) break // chain bị gián đoạn, không cần kiểm tra tiếp

    // Unlock chapter tiếp theo
    progress.unlockedChapters.push(next.chapter)
    progress.currentChapter = next.chapter
    journeyUser.rewards.claimed.push({
      id: `reward_chapter_${current.chapter}_${Date.now()}_${i}`,
      chapter: current.chapter,
      type: 'chapter_unlock',
      name: {
        vi: `Hoàn thành Chapter ${current.chapter} · Mở khoá Chapter ${next.chapter}`,
        en: `Chapter ${current.chapter} Complete · Chapter ${next.chapter} Unlocked`,
      },
      coins: 500,
      chest: `chapter_${current.chapter}_chest`,
      claimedAt: timestamp,
    })
    journeyUser.profile.coins += 500
    newlyUnlocked.push(next.chapter)
  }

  if (newlyUnlocked.length > 0) {
    journeyUser.updatedAt = timestamp
    saveHealthJourneyDb(db)
  }
  return newlyUnlocked
}

// Alias cũ để không break code cũ
export function checkAndUnlockChapter1(user, journeysJsonData) {
  const unlocked = checkAndUnlockChapters(user, journeysJsonData)
  return unlocked.includes(2) || (user && (() => {
    const db = loadHealthJourneyDb()
    const ju = ensureUser(db, user)
    return ju.journeyProgress.unlockedChapters.includes(2)
  })())
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS POINTS & LEADERBOARD SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export const LEADERBOARD_KEY = 'health_journey_leaderboard_v1'

/**
 * Calculate total score for a user based on:
 * - XP accumulated from activities
 * - Bonus points for each completed chapter
 * - Multiplier for higher chapters
 */
export function calculateUserScore(journeyUser, journeysData) {
  // baseXP = activity XP only (NOT including chapter bonuses — those are tracked separately)
  // Chapter bonuses are stored in rewards.claimed with type='chapter_bonus'
  // so we read them from there to avoid double-counting when awardChapterCompletionBonus
  // also writes to profile.xp.
  const claimedBonuses = (journeyUser.rewards?.claimed || []).filter(r => r.type === 'chapter_bonus')
  const chapterBonus = claimedBonuses.reduce((s, r) => s + (r.bonusPoints || 0), 0)

  // baseXP = total profile XP minus any chapter bonuses already baked in
  const rawXP = journeyUser.profile?.xp || 0
  const baseXP = Math.max(0, rawXP - chapterBonus)

  // Streak bonus: extra 10 pts per consecutive active day
  const activityLog = journeyUser.activityLog || []
  const streak = calculateStreak(activityLog)
  const streakBonus = streak * 10

  const completedChapters = (journeysData || [])
    .filter(j => isChapterCompleted(journeyUser.journeyProgress, j.chapter, journeysData))
    .map(j => j.chapter)

  return {
    total: baseXP + chapterBonus + streakBonus,
    baseXP,
    chapterBonus,
    streakBonus,
    streak,
    completedChapters,
    currentChapter: journeyUser.journeyProgress?.currentChapter || 1,
    displayName: journeyUser.user?.displayName || journeyUser.user?.userId || 'Hero',
    avatar: journeyUser.user?.avatar || '',
    userId: journeyUser.user?.userId || 'guest',
  }
}

/**
 * Calculate consecutive active days (streak)
 */
function calculateStreak(activityLog) {
  if (!activityLog || activityLog.length === 0) return 0
  const days = [...new Set(activityLog.map(a => a.timestamp?.slice(0, 10)).filter(Boolean))].sort().reverse()
  if (days.length === 0) return 0
  let streak = 0
  const today = todayISODate()
  let expected = today
  for (const day of days) {
    if (day === expected) {
      streak++
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else if (day < expected) {
      break
    }
  }
  return streak
}

/**
 * Get full leaderboard across all users in the DB.
 * Returns sorted array of user score objects.
 */
export function getLeaderboard(journeysData) {
  const db = loadHealthJourneyDb()
  const entries = Object.values(db.users || {}).map(u => calculateUserScore(u, journeysData))
  return entries.sort((a, b) => b.total - a.total).map((entry, i) => ({ ...entry, rank: i + 1 }))
}

/**
 * Award bonus points when a chapter is completed (called alongside checkAndUnlockChapters).
 * Returns the bonus awarded (0 if chapter was already rewarded).
 */
export function awardChapterCompletionBonus(user, chapterNum, journeysData) {
  if (!user) return 0
  const db = loadHealthJourneyDb()
  const journeyUser = ensureUser(db, user)
  const journey = (journeysData || []).find(j => j.chapter === chapterNum)
  if (!journey?.bonusPoints) return 0

  // Check if bonus already claimed for this chapter
  const alreadyClaimed = (journeyUser.rewards?.claimed || []).some(
    r => r.chapter === chapterNum && r.type === 'chapter_bonus'
  )
  if (alreadyClaimed) return 0

  const bonus = journey.bonusPoints || 0
  const timestamp = new Date().toISOString()

  journeyUser.rewards.claimed.push({
    id: `bonus_ch${chapterNum}_${Date.now()}`,
    chapter: chapterNum,
    type: 'chapter_bonus',
    name: {
      vi: `🎉 Thưởng hoàn thành Chapter ${chapterNum} · +${bonus} điểm`,
      en: `🎉 Chapter ${chapterNum} Completion Bonus · +${bonus} pts`,
    },
    bonusPoints: bonus,
    claimedAt: timestamp,
  })
  journeyUser.profile.xp += bonus
  journeyUser.updatedAt = timestamp
  saveHealthJourneyDb(db)
  return bonus
}
