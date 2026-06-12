/**
 * JourneyDetailPopup.jsx
 * Popup "Chi tiết Journey" - dữ liệu động từ journeys.json
 *
 * Props:
 *   chapterKey    {string}   – key của chapter đang xem (e.g. 'first_step', 'focus')
 *                              Nếu null → hiển thị tổng quan chapter 1
 *   onClose       {fn}       – đóng popup
 *   onOpenTask    {fn(taskId)} – mở TaskDetailPopup với taskId
 *   snapshot      {object}   – getTaskSnapshot() result
 */

import journeysData from './data/journeys.json'

// ─── Builders từ journeys.json ────────────────────────────────────────────────
const CHAPTER_ICONS  = ['🌅', '🔥', '⚡', '👑', '⚜️']
const CHAPTER_COLORS = [
  'rgba(139,92,246,.2)', 'rgba(59,130,246,.2)', 'rgba(239,68,68,.2)',
  'rgba(245,158,11,.2)', 'rgba(139,92,246,.2)',
]
const MISSION_ICONS  = ['🌅', '🌬', '🎯', '🚫', '📚', '💧', '🚶', '💼']
const MISSION_KEYS   = ['first_step', 'breath', 'focus', 'challenge', 'breakthrough', 'flow', 'stride', 'work']
const MISSION_LABELS = ['First Step', 'Breath', 'Focus', 'Challenge', 'Breakthrough', 'Flow', 'Stride', 'Work']

function buildMissions(journeys) {
  const chapter1 = journeys.find((j) => j.chapter === 1)
  if (!chapter1?.requiredObjectives) return []
  return chapter1.requiredObjectives.map((obj, i) => ({
    chapterKey: MISSION_KEYS[i] || `step_${i}`,
    taskId: obj.task,
    icon: MISSION_ICONS[i] || '⭐',
    title: `The ${MISSION_LABELS[i] || `Step ${i + 1}`}`,
    subtitle: obj.title?.vi || obj.title?.en || `Hoàn thành ${obj.target} lần`,
    target: obj.target,
    index: i,
  }))
}

const ALL_JOURNEYS = journeysData.journeys || []
const ALL_MISSIONS = buildMissions(ALL_JOURNEYS)

function taskPercent(taskState) {
  if (!taskState?.target) return 0
  return Math.min(100, Math.round((Number(taskState.current || 0) / Number(taskState.target || 1)) * 100))
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function JourneyDetailPopup({ chapterKey, onClose, onOpenTask, snapshot }) {
  const todayTask    = (taskId) => snapshot?.day?.tasks?.find((t) => t.taskId === taskId)
  const journeyObj   = (actType) => snapshot?.journeyUser?.journeyProgress?.objectives?.find((o) => o.activityType === actType)
  const unlockedChs  = snapshot?.journeyUser?.journeyProgress?.unlockedChapters || [1]

  // Which mission is selected? null = overview
  const selectedMission = chapterKey ? ALL_MISSIONS.find((m) => m.chapterKey === chapterKey) : null

  // Chapter 1 overall progress
  const ch1 = ALL_JOURNEYS.find((j) => j.chapter === 1) || {}
  const objectives = ch1.requiredObjectives || []
  const totalTarget  = objectives.reduce((s, o) => s + (o.target || 1), 0)
  const currentSum   = objectives.reduce((s, o) => {
    const obj = journeyObj(o.task)
    return s + Math.min(obj?.current || 0, o.target || 1)
  }, 0)
  const ch1Pct = totalTarget > 0 ? Math.min(100, Math.round(currentSum / totalTarget * 100)) : 0

  // First unfinished mission key
  const firstUnfinished = ALL_MISSIONS.find((m) => taskPercent(todayTask(m.taskId)) < 100) || ALL_MISSIONS[0]

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div style={box}>
        <button style={closeBtn} onClick={onClose}>✕</button>

        {/* ── Overview: Chapter list ── */}
        {!selectedMission && (
          <>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              ⚔ Hành Trình
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
              Tiến độ tổng thể · {ALL_JOURNEYS.length} chapter
            </div>

            {ALL_JOURNEYS.map((journey, idx) => {
              const isUnlocked = idx === 0 || unlockedChs.includes(journey.chapter)
              const icon = CHAPTER_ICONS[idx] || '⭐'
              const bgColor = CHAPTER_COLORS[idx] || CHAPTER_COLORS[0]
              const pct = idx === 0 ? ch1Pct : 0
              return (
                <div
                  key={journey.chapter}
                  onClick={() => isUnlocked && journey.chapter === 1 && onOpenTask?.(firstUnfinished?.taskId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    borderRadius: 12, border: `1px solid ${idx === 0 ? 'rgba(139,92,246,.4)' : 'rgba(80,160,255,.12)'}`,
                    background: idx === 0 ? 'rgba(139,92,246,.07)' : 'rgba(255,255,255,.02)',
                    marginBottom: 8, opacity: isUnlocked ? 1 : idx === 1 ? 0.6 : 0.35,
                    cursor: isUnlocked ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {isUnlocked ? icon : '🔒'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>CHAPTER {journey.chapter}</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, fontWeight: 700 }}>
                      {(journey.title?.en || `CHAPTER ${journey.chapter}`).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{journey.title?.vi || ''}</div>
                    {idx === 0 && (
                      <>
                        <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ height: 4, width: `${pct}%`, background: 'linear-gradient(90deg,var(--purple),var(--blue))', borderRadius: 99 }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{pct}% · {currentSum}/{totalTarget} tổng tiến độ</div>
                      </>
                    )}
                    {!isUnlocked && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Hoàn thành Chapter {journey.chapter - 1} để mở khóa
                      </div>
                    )}
                  </div>
                  <div style={{ color: isUnlocked ? 'var(--blue-glow)' : 'var(--text-muted)', fontSize: 18 }}>
                    {isUnlocked ? '›' : '🔒'}
                  </div>
                </div>
              )
            })}

            <div style={glowLine} />

            {/* Chapter 1 mission list */}
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "'Rajdhani',sans-serif" }}>
              🌅 CHAPTER 1 · THE AWAKENING
            </div>
            <MissionList
              missions={ALL_MISSIONS}
              todayTask={todayTask}
              onSelect={(m) => onOpenTask?.(m.taskId)}
            />

            <button style={{ ...btnPrimary, marginTop: 14 }} onClick={() => onOpenTask?.(firstUnfinished?.taskId)}>
              MỞ NHIỆM VỤ {ALL_MISSIONS.indexOf(firstUnfinished) + 1}
            </button>
          </>
        )}

        {/* ── Selected mission detail ── */}
        {selectedMission && (
          <ChapterMissionDetail
            mission={selectedMission}
            allMissions={ALL_MISSIONS}
            todayTask={todayTask}
            journeyObj={journeyObj}
            onOpenTask={onOpenTask}
            onBack={() => onClose?.()}
          />
        )}

        <button style={{ ...btnOutline, marginTop: 10 }} onClick={onClose}>ĐÓNG</button>
      </div>
    </div>
  )
}

// ─── Sub: mission list ────────────────────────────────────────────────────────
function MissionList({ missions, todayTask, onSelect }) {
  return (
    <div>
      {missions.map((m, i) => {
        const taskState = todayTask(m.taskId)
        const pct = taskPercent(taskState)
        const done = pct >= 100
        const isActive = !done && missions.slice(0, i).every((prev) => taskPercent(todayTask(prev.taskId)) >= 100)
        return (
          <div
            key={m.chapterKey}
            onClick={() => onSelect(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i < missions.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 24, textAlign: 'center', fontSize: 11, color: isActive ? 'var(--blue-glow)' : 'var(--text-muted)', flexShrink: 0 }}>
              1-{i + 1}
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? 'rgba(34,197,94,.15)' : isActive ? 'rgba(59,130,246,.15)' : 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {m.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: done ? 'var(--green)' : 'var(--text)' }}>{m.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.subtitle}</div>
            </div>
            {(done || isActive) && (
              <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: done ? 'rgba(34,197,94,.2)' : 'rgba(245,158,11,.2)', color: done ? '#86efac' : '#fcd34d' }}>
                {pct}%
              </span>
            )}
            {!done && !isActive && <div style={{ fontSize: 13 }}>🔒</div>}
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${done ? 'var(--green)' : 'rgba(255,255,255,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: done ? 'var(--green)' : 'var(--text-dim)', flexShrink: 0 }}>
              {done ? '✓' : isActive ? '›' : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Sub: single chapter mission detail ──────────────────────────────────────
function ChapterMissionDetail({ mission, allMissions, todayTask, journeyObj, onOpenTask, onBack }) {
  const taskState = todayTask(mission.taskId)
  const pct = taskPercent(taskState)
  const obj = journeyObj(mission.taskId)  // journey-level progress (not just today)

  return (
    <>
      <div style={{ textAlign: 'center', paddingBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>CHAPTER 1 · NHIỆM VỤ {mission.index + 1}</div>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 22, fontWeight: 900, marginTop: 4 }}>
          {mission.title.toUpperCase()}
        </div>
        <div style={{ height: 80, borderRadius: 12, background: 'linear-gradient(135deg,rgba(139,92,246,.2),rgba(59,130,246,.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '10px 0' }}>
          {mission.icon}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{mission.subtitle}</div>

        {/* Journey-level progress */}
        {obj && (
          <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Tiến độ hành trình (tổng)</div>
            <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: 5, width: `${Math.min(100, Math.round((obj.current / obj.target) * 100))}%`, background: 'linear-gradient(90deg,var(--purple),var(--blue))', borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              {obj.current}/{obj.target} · {Math.min(100, Math.round((obj.current / obj.target) * 100))}%
            </div>
          </div>
        )}

        {/* Today's progress */}
        <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '10px 12px', textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Hôm nay</div>
          <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: 5, width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : 'linear-gradient(90deg,var(--purple),var(--blue))', borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 11, color: pct >= 100 ? 'var(--green)' : 'var(--text-dim)', marginTop: 4 }}>
            {taskState ? `${taskState.current}/${taskState.target}` : `0/${mission.target}`} · {pct >= 100 ? 'Đã hoàn thành ✓' : `${pct}%`}
          </div>
        </div>
      </div>

      {/* Other missions quick nav */}
      <div style={glowLine} />
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Các nhiệm vụ khác trong Chapter 1</div>
      {allMissions.filter((m) => m.chapterKey !== mission.chapterKey).map((m) => {
        const tState = todayTask(m.taskId)
        const mPct = taskPercent(tState)
        return (
          <div
            key={m.chapterKey}
            onClick={() => onOpenTask?.(m.taskId)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)', cursor: 'pointer' }}
          >
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
              {m.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{m.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{m.subtitle}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: mPct >= 100 ? 'var(--green)' : 'var(--text-muted)' }}>
              {mPct >= 100 ? '✓' : `${mPct}%`}
            </span>
          </div>
        )
      })}

      <button style={{ ...btnPrimary, marginTop: 14 }} onClick={() => onOpenTask?.(mission.taskId)}>
        MỞ NHIỆM VỤ NÀY
      </button>
    </>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const overlay = {
  position: 'fixed', inset: 0, zIndex: 9000,
  background: 'rgba(5,8,18,.85)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
}
const box = {
  width: '100%', maxWidth: 480, maxHeight: '94vh', overflowY: 'auto',
  background: 'var(--bg-modal, #0a1220)', borderRadius: '20px 20px 0 0',
  border: '1px solid rgba(80,160,255,.18)', padding: '20px 16px 28px',
  position: 'relative',
}
const closeBtn = {
  position: 'absolute', top: 14, right: 14, width: 30, height: 30,
  borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: 'none',
  color: 'var(--text-dim, #94a3b8)', fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const glowLine = { height: 1, background: 'linear-gradient(90deg,transparent,rgba(80,160,255,.25),transparent)', margin: '14px 0' }
const btnPrimary = { width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--purple,#8b5cf6),var(--blue,#3b82f6))', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const btnOutline  = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'var(--text-dim, #94a3b8)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }
