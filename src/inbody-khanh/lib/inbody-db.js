// lib/inbody-db.js
// Prisma schema + helper functions for InBody gamification
// Requires: npm install @prisma/client

// ─── Prisma Schema (prisma/schema.prisma) ──────────────────────────────────
/*
model InBodyRecord {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime @default(now())

  // Core metrics
  weight      Float
  muscle      Float    // Skeletal Muscle Mass (SMM) kg
  fat         Float    // Body Fat %
  water       Float    // Total Body Water %
  bmi         Float
  inbodyScore Int?

  // Extended metrics
  protein     Float?
  minerals    Float?
  visceralFat Int?     // Level 1-20
  basalMetab  Int?     // kcal

  // Segmental (optional)
  leftArm     Float?
  rightArm    Float?
  trunk       Float?
  leftLeg     Float?
  rightLeg    Float?

  // Gamification
  xpEarned    Int      @default(50)
  rawImageUrl String?  // stored InBody scan image

  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())

  @@index([userId, date])
}

model UserGameProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  totalXP      Int      @default(0)
  level        Int      @default(1)
  className    String   @default("Người mới")
  achievements String[] // JSON array of achievement IDs
  streakDays   Int      @default(0)
  lastScanDate DateTime?
  user         User     @relation(fields: [userId], references: [id])
}
*/

// ─── Helper: Gamification calculations ────────────────────────────────────

/**
 * Calculate XP earned from a new InBody record vs previous
 */
export function calcXPEarned(newRecord, prevRecord) {
  let xp = 50; // base scan XP

  if (!prevRecord) return xp;

  const muscleDiff = newRecord.muscle - prevRecord.muscle;
  const fatDiff = prevRecord.fat - newRecord.fat; // positive = fat decreased (good)
  const weightDiff = prevRecord.weight - newRecord.weight;

  // Muscle gain reward (high value)
  if (muscleDiff > 0) xp += Math.round(muscleDiff * 100);

  // Fat loss reward
  if (fatDiff > 0) xp += Math.round(fatDiff * 80);

  // Weight loss (if overweight) - only reward if muscle maintained
  if (weightDiff > 0 && muscleDiff >= 0) xp += Math.round(weightDiff * 20);

  // InBody Score bonus
  if (newRecord.inbodyScore && prevRecord.inbodyScore) {
    const scoreDiff = newRecord.inbodyScore - prevRecord.inbodyScore;
    if (scoreDiff > 0) xp += scoreDiff * 10;
  }

  return Math.max(xp, 10); // minimum 10 XP per scan
}

/**
 * Calculate level from total XP
 */
export function calcLevel(totalXP) {
  const thresholds = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 7000, 9500, 12500];
  const classNames = [
    'Người mới', 'Học viên', 'Chiến binh', 'Võ sĩ', 'Cao thủ',
    'Đại sư', 'Huyền thoại', 'Thần thánh',
  ];

  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (totalXP >= thresholds[i]) level = i + 1;
    else break;
  }

  const current = thresholds[Math.min(level - 1, thresholds.length - 1)];
  const next = thresholds[Math.min(level, thresholds.length - 1)];
  const progress = next > current
    ? Math.round(((totalXP - current) / (next - current)) * 100)
    : 100;

  return {
    level,
    totalXP,
    current,
    next,
    progress,
    className: classNames[Math.min(Math.floor((level - 1) / 1.5), classNames.length - 1)],
  };
}

/**
 * Check which achievements are unlocked
 */
export function checkAchievements(records, currentAchievements = []) {
  if (!records.length) return currentAchievements;

  const latest = records[records.length - 1];
  const first = records[0];
  const muscleGain = latest.muscle - first.muscle;
  const fatLoss = first.fat - latest.fat;

  const newAchievements = [...currentAchievements];

  const checks = [
    { id: 'first_scan', condition: records.length >= 1 },
    { id: 'scan_5', condition: records.length >= 5 },
    { id: 'scan_10', condition: records.length >= 10 },
    { id: 'muscle_05', condition: muscleGain >= 0.5 },
    { id: 'muscle_1', condition: muscleGain >= 1 },
    { id: 'muscle_3', condition: muscleGain >= 3 },
    { id: 'fat_1', condition: fatLoss >= 1 },
    { id: 'fat_3', condition: fatLoss >= 3 },
    { id: 'fat_5', condition: fatLoss >= 5 },
    { id: 'muscle_35', condition: latest.muscle >= 35 },
    { id: 'water_55', condition: latest.water >= 55 },
    { id: 'bmi_normal', condition: latest.bmi >= 18.5 && latest.bmi <= 24.9 },
    { id: 'score_80', condition: (latest.inbodyScore || 0) >= 80 },
  ];

  checks.forEach(({ id, condition }) => {
    if (condition && !newAchievements.includes(id)) {
      newAchievements.push(id);
    }
  });

  return newAchievements;
}

/**
 * Get active quests for a user
 */
export function getActiveQuests(records) {
  const latest = records[records.length - 1];
  const prev = records[records.length - 2];
  if (!latest) return [];

  return [
    {
      id: 'q_muscle_1kg',
      icon: '🏋️',
      name: 'Tăng 1kg cơ bắp',
      desc: 'Đo InBody lần tiếp theo sau 30 ngày tập',
      current: prev ? Math.max(0, latest.muscle - prev.muscle) : 0,
      target: 1,
      unit: 'kg',
      reward: 150,
      color: '#378ADD',
    },
    {
      id: 'q_fat_20',
      icon: '🔥',
      name: 'Giảm mỡ xuống 20%',
      desc: `Mỡ hiện tại ${latest.fat}% → mục tiêu 20%`,
      current: Math.max(0, 5 - (latest.fat - 20)),
      target: 5,
      unit: '%',
      reward: 200,
      color: '#D85A30',
    },
    {
      id: 'q_water_53',
      icon: '💧',
      name: 'Duy trì nước > 53%',
      desc: 'Giữ tỷ lệ nước cơ thể ổn định',
      current: latest.water >= 53 ? 1 : 0,
      target: 1,
      unit: '',
      reward: 80,
      color: '#1D9E75',
    },
  ].map((q) => ({
    ...q,
    progress: Math.min(100, Math.round((q.current / q.target) * 100)),
    completed: q.current >= q.target,
  }));
}
