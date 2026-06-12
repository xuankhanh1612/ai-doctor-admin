import sampleUserData from '../data/le_xuan_khanh_sample_tracking.json'

export const HEALTH_JOURNEY_EVENT = 'health-journey:updated'
export const HEALTH_JOURNEY_DB_KEY = 'health_journey_local_db_v1'

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
  const raw = user?.email || user?.name || sampleUserData.user.userId || 'guest'
  return raw.toString().trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-') || 'guest'
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const INDEXED_DB_ONLY = '__INDEXED_DB_ONLY__'

function compressForLocalStorage(dataUrl) {
  if (!dataUrl) return ''
  if (typeof dataUrl !== 'string') return ''
  return dataUrl.length < 50000 ? dataUrl : INDEXED_DB_ONLY
}

function migrateLargeImages(db) {
  let changed = false
  Object.values(db.users || {}).forEach((user) => {
    user.activityLog?.forEach((activity) => {
      if (typeof activity.proofImage === 'string' && activity.proofImage.length > 50000) {
        activity.proofImage = INDEXED_DB_ONLY
        changed = true
      }
    })
    user.proofImages?.forEach((proof) => {
      if (typeof proof.image === 'string' && proof.image.length > 50000) {
        proof.image = INDEXED_DB_ONLY
        changed = true
      }
    })
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
  seed.journeyProgress.objectives = seed.journeyProgress.objectives.map((objective) => ({ ...objective, current: 0 }))
  seed.profile.xp = 0
  seed.profile.energy = 100
  seed.profile.coins = 0
  db.users[userId] = seed
  return seed
}

export function loadHealthJourneyDb() {
  if (typeof window === 'undefined') return defaultDb()
  try {
    const raw = localStorage.getItem(HEALTH_JOURNEY_DB_KEY)
    if (!raw) {
      const db = defaultDb()
      try { localStorage.setItem(HEALTH_JOURNEY_DB_KEY, JSON.stringify(db)) } catch (_) { /* quota: skip seed */ }
      return db
    }
    const db = JSON.parse(raw)
    const changed = migrateLargeImages(db)
    if (changed) {
      try { localStorage.setItem(HEALTH_JOURNEY_DB_KEY, JSON.stringify(db)) } catch (_) { /* quota: skip */ }
    }
    if (!db.users?.[sampleUserData.user.userId]) {
      db.users = { ...(db.users || {}), [sampleUserData.user.userId]: clone(sampleUserData) }
      saveHealthJourneyDb(db)
    }
    return db
  } catch {
    const db = defaultDb()
    try { localStorage.setItem(HEALTH_JOURNEY_DB_KEY, JSON.stringify(db)) } catch (_) { /* quota: skip */ }
    return db
  }
}

export function saveHealthJourneyDb(db) {
  if (typeof window === 'undefined') return db
  const nextDb = { ...db, updatedAt: new Date().toISOString() }
  const tryWrite = (payload) => {
    try {
      localStorage.setItem(HEALTH_JOURNEY_DB_KEY, JSON.stringify(payload))
      return true
    } catch (err) {
      if (err?.name === 'QuotaExceededError') return false
      throw err
    }
  }
  if (!tryWrite(nextDb)) {
    // First attempt: migrate large images and trim logs
    migrateLargeImages(nextDb)
    if (!tryWrite(nextDb)) {
      // Second attempt: strip ALL proof images completely as last resort
      Object.values(nextDb.users || {}).forEach((user) => {
        user.activityLog?.forEach((a) => { a.proofImage = '' })
        user.proofImages?.forEach((p) => { p.image = '' })
        // Also trim logs aggressively
        if (Array.isArray(user.activityLog)) user.activityLog = user.activityLog.slice(0, 100)
        if (Array.isArray(user.proofImages)) user.proofImages = user.proofImages.slice(0, 50)
      })
      tryWrite(nextDb) // best-effort, ignore if still fails
    }
  }
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
  const objective = journeyUser.journeyProgress.objectives.find((entry) => entry.activityType === activityType)
  if (!objective) return null

  objective.current += 1
  objective.updatedAt = timestamp
  objective.completed = objective.current >= objective.target

  const chapter1Done = journeyUser.journeyProgress.objectives
    .filter((entry) => entry.chapter === 1)
    .every((entry) => entry.completed)

  if (chapter1Done && !journeyUser.journeyProgress.unlockedChapters.includes(2)) {
    journeyUser.journeyProgress.unlockedChapters.push(2)
    journeyUser.journeyProgress.currentChapter = 2
    journeyUser.rewards.claimed.push({
      id: `reward_chapter_1_${Date.now()}`,
      chapter: 1,
      type: 'chapter_unlock',
      name: { vi: 'Rương Chapter 1 + 500 xu', en: 'Chapter 1 Chest + 500 coins' },
      coins: 500,
      chest: 'hydration_starter_chest',
      claimedAt: timestamp,
    })
    journeyUser.profile.coins += 500
  }

  return objective
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
    image: compressForLocalStorage(proofImage),
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
    proofImage: compressForLocalStorage(proofImage),
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
