import React, { useState, useEffect, useCallback } from 'react'
import journeysData from './data/journeys.json'
import {
  HEALTH_JOURNEY_EVENT,
  ACTIVITY_TASK_MAP,
  getTaskSnapshot,
} from './services/healthJourneyStorage.js'

/**
 * JourneyDetailPopup.jsx
 * Popup "Chi tiết Journey" — real-time sync tiến độ uống nước → unlock Chapter 2
 *
 * FIX: mappedTaskId (drink_water → 'water') được pass chính xác vào onOpenTask
 *      để TaskDetailPopup nhận đúng taskId='water' và ghi nhận mỗi lần chụp ảnh.
 *
 * Luồng:
 *   1. user nhấn "MỞ NHIỆM VỤ NÀY" (The First Step · drink_water · 30 lần)
 *   2. → onOpenTask('water') → cha mount TaskDetailPopup taskId='water'
 *   3. → mỗi lần chụp ảnh → completeHealthJourneyActivity(activityType:'drink_water')
 *   4. → objective.current++ → HEALTH_JOURNEY_EVENT fire
 *   5. → JourneyDetailPopup lắng nghe event → cập nhật live counter
 *   6. → khi đủ 30 → Chapter 2 tự unlock
 */

const CH_ICONS  = ['🌅','🔥','⚡','👑','⚜️']
const CH_COLORS = ['rgba(139,92,246,.2)','rgba(59,130,246,.2)','rgba(239,68,68,.2)','rgba(245,158,11,.2)','rgba(34,197,94,.2)']
const M_ICONS   = ['🌅','🌬','🎯','🚫','📚','💧','🚶','💼']
const M_KEYS    = ['first_step','breath','focus','challenge','breakthrough','flow','stride','work']
const M_LABELS  = ['First Step','Breath','Focus','Challenge','Breakthrough','Flow','Stride','Work']

/**
 * buildMissions — thêm mappedTaskId để pass đúng vào TaskDetailPopup.
 * VD: taskId='drink_water' (activityType trong storage)
 *     mappedTaskId='water'  (taskId trong daily_tasks / TaskDetailPopup)
 */
function buildMissions(journeys) {
  const ch1 = journeys.find(j => j.chapter === 1)
  if (!ch1?.requiredObjectives) return []
  return ch1.requiredObjectives.map((obj, i) => ({
    chapterKey:    M_KEYS[i] || `step_${i}`,
    taskId:        obj.task,                                // 'drink_water' — dùng cho journeyObj lookup
    mappedTaskId:  ACTIVITY_TASK_MAP[obj.task] || obj.task, // 'water' — pass vào TaskDetailPopup
    icon:          M_ICONS[i] || '⭐',
    title:         `The ${M_LABELS[i] || `Step ${i+1}`}`,
    subtitle:      obj.title?.vi || obj.title?.en || `Hoàn thành ${obj.target} lần`,
    target:        obj.target,
    index:         i,
  }))
}

const ALL_JOURNEYS = journeysData.journeys || []
const ALL_MISSIONS = buildMissions(ALL_JOURNEYS)

function pct(taskState) {
  if (!taskState?.target) return 0
  return Math.min(100, Math.round((Number(taskState.current || 0) / Number(taskState.target || 1)) * 100))
}

// ─────────────────────────────────────────────────────────────────────────────
export default function JourneyDetailPopup({
  chapterKey,
  onClose,
  onOpenTask,
  snapshot: initialSnapshot,
  user,
  onViewMedicalRecord,
}) {
  const [selected, setSelected] = useState(chapterKey || null)

  // ── Live snapshot: cập nhật mỗi khi HEALTH_JOURNEY_EVENT fire ──────────────
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [chapter2JustUnlocked, setChapter2JustUnlocked] = useState(false)

  const refreshSnapshot = useCallback(() => {
    if (!user) return
    try {
      const fresh = getTaskSnapshot(user)
      setSnapshot(fresh)
      const unlockedChs = fresh?.journeyUser?.journeyProgress?.unlockedChapters || [1]
      if (unlockedChs.includes(2)) setChapter2JustUnlocked(true)
    } catch (_) {}
  }, [user])

  useEffect(() => {
    refreshSnapshot()
    window.addEventListener(HEALTH_JOURNEY_EVENT, refreshSnapshot)
    return () => window.removeEventListener(HEALTH_JOURNEY_EVENT, refreshSnapshot)
  }, [refreshSnapshot])

  // ── Helpers ────────────────────────────────────────────────────────────────
  // todayTask: tra theo mappedTaskId (vd 'water') — khớp với daily task records
  const todayTask  = (mappedId) => snapshot?.day?.tasks?.find(t => t.taskId === mappedId)
  // journeyObj: tra theo activityType (vd 'drink_water') — khớp với objectives
  const journeyObj = (actType)  => snapshot?.journeyUser?.journeyProgress?.objectives?.find(o => o.activityType === actType)
  const unlocked   = snapshot?.journeyUser?.journeyProgress?.unlockedChapters || [1]

  // Chapter 1 overall progress
  const ch1      = ALL_JOURNEYS.find(j => j.chapter === 1) || {}
  const objs     = ch1.requiredObjectives || []
  const totalTgt = objs.reduce((s, o) => s + (o.target || 1), 0)
  const curSum   = objs.reduce((s, o) => {
    const obj = journeyObj(o.task)
    return s + Math.min(obj?.current || 0, o.target || 1)
  }, 0)
  const ch1Pct = totalTgt > 0 ? Math.min(100, Math.round(curSum / totalTgt * 100)) : 0
  const ch1Done = ch1Pct >= 100 || unlocked.includes(2)

  const selMission = selected ? ALL_MISSIONS.find(m => m.chapterKey === selected) : null

  // firstUnfinished: dùng mappedTaskId để check today progress
  const firstUnfinished =
    ALL_MISSIONS.find(m => pct(todayTask(m.mappedTaskId)) < 100) || ALL_MISSIONS[0]

  // ── CRITICAL FIX: luôn pass mappedTaskId ('water') vào TaskDetailPopup ─────
  const handleOpenTask = (mission) => {
    const taskIdToOpen = mission?.mappedTaskId || mission?.taskId || mission
    onClose?.()
    onOpenTask?.(taskIdToOpen)
  }

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div style={S.box} className="jdp-box">
        <style>{`
          @media (max-width: 860px) {
            .jdp-box { width: 100vw !important; height: 100% !important; max-width: none !important; border-radius: 0 !important; }
            .jdp-cols { flex-direction: column !important; overflow-y: auto !important; }
            .jdp-left-col { width: 100% !important; overflow-y: visible !important; }
          }
        `}</style>

        <button style={S.closeBtn} onClick={onClose}>✕</button>
        <div style={S.title}>⚔ Chi tiết Hành Trình</div>
        <div style={S.subtitle}>{ALL_JOURNEYS.length} Chapter · Dữ liệu từ journeys.json</div>

        {/* ── CHAPTER 2 UNLOCK BANNER ──────────────────────────────────────── */}
        {(ch1Done || chapter2JustUnlocked) && (
          <div style={{
            padding: '10px 14px', marginBottom: 10, borderRadius: 10,
            background: 'linear-gradient(135deg,rgba(34,197,94,.15),rgba(22,163,74,.1))',
            border: '1px solid rgba(34,197,94,.45)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 24 }}>🔓</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#86efac' }}>
                Chapter 2 · THE DISCIPLINE đã mở khoá!
              </div>
              <div style={{ fontSize: 11, color: '#6ee7b7' }}>
                Bạn đã hoàn thành tất cả mục tiêu Chapter 1 · The Awakening 🎉
              </div>
            </div>
          </div>
        )}

        <div style={S.cols} className="jdp-cols">

          {/* ── CỘT TRÁI: chapter list + mission list ──────────────────────── */}
          <div style={S.colLeft} className="jdp-left-col">

            {/* Chapter list */}
            <div style={S.sectionLabel}>CÁC CHAPTER</div>
            {ALL_JOURNEYS.map((journey, idx) => {
              const isUnlocked = idx === 0 || unlocked.includes(journey.chapter)
              const isCh1      = idx === 0
              const isCh2      = idx === 1
              const thisPct    = isCh1 ? ch1Pct : 0
              return (
                <div
                  key={journey.chapter}
                  onClick={() => isUnlocked && setSelected(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12, marginBottom: 6,
                    border: `1px solid ${isCh1 ? 'rgba(139,92,246,.4)' : isUnlocked ? 'rgba(34,197,94,.3)' : 'rgba(80,160,255,.12)'}`,
                    background: isCh1 ? 'rgba(139,92,246,.08)' : isUnlocked ? 'rgba(34,197,94,.06)' : 'rgba(255,255,255,.02)',
                    opacity: isUnlocked ? 1 : isCh2 ? 0.55 : 0.3,
                    cursor: isUnlocked ? 'pointer' : 'default',
                    transition: 'all .2s',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: CH_COLORS[idx] || CH_COLORS[0],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {isUnlocked ? (CH_ICONS[idx] || '⭐') : '🔒'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1 }}>
                      CHAPTER {journey.chapter}
                    </div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 800 }}>
                      {(journey.title?.en || `CHAPTER ${journey.chapter}`).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{journey.title?.vi || ''}</div>
                    {isCh1 && (
                      <>
                        <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: 4, width: `${thisPct}%`,
                            background: ch1Done ? '#22c55e' : 'linear-gradient(90deg,#8b5cf6,#3b82f6)',
                            borderRadius: 99, transition: 'width .4s',
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: ch1Done ? '#86efac' : '#64748b', marginTop: 2 }}>
                          {ch1Done ? '✓ Hoàn thành' : `${ch1Pct}% · ${curSum}/${totalTgt}`}
                        </div>
                      </>
                    )}
                    {isCh2 && !isUnlocked && (
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                        Hoàn thành tất cả mục tiêu Chapter 1 để mở khoá
                      </div>
                    )}
                    {!isUnlocked && !isCh2 && (
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                        Hoàn thành Chapter {journey.chapter - 1} để mở
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div style={S.glow} />

            {/* Mission list chapter 1 */}
            <div style={S.sectionLabel}>CHAPTER 1 · NHIỆM VỤ</div>
            {ALL_MISSIONS.map((m, i) => {
              // todayTask dùng mappedTaskId ('water'), journeyObj dùng taskId ('drink_water')
              const tState = todayTask(m.mappedTaskId)
              const mPct   = pct(tState)
              const jObj   = journeyObj(m.taskId)
              const jCur   = jObj?.current || 0
              const jTgt   = jObj?.target || m.target
              const jPct   = jObj ? Math.min(100, Math.round(jCur / jTgt * 100)) : 0
              const jDone  = jObj ? jCur >= jTgt : false
              const isSel  = selected === m.chapterKey
              return (
                <button
                  key={m.chapterKey}
                  type="button"
                  onClick={() => setSelected(isSel ? null : m.chapterKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', width: '100%', textAlign: 'left',
                    borderRadius: 10, marginBottom: 4, cursor: 'pointer', fontFamily: 'inherit',
                    background: isSel ? 'rgba(139,92,246,.15)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${isSel ? 'rgba(139,92,246,.4)' : 'rgba(255,255,255,.06)'}`,
                  }}
                >
                  <span style={{ fontSize: 9, color: '#64748b', width: 20, flexShrink: 0, textAlign: 'center' }}>
                    1-{i + 1}
                  </span>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: jDone ? 'rgba(34,197,94,.15)' : 'rgba(59,130,246,.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                  }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: jDone ? '#86efac' : '#e8f0f8' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.subtitle}
                    </div>
                    {/* Live journey progress bar */}
                    {jObj && (
                      <div style={{ height: 3, background: 'rgba(255,255,255,.07)', borderRadius: 99, marginTop: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: 3, width: `${jPct}%`,
                          background: jDone ? '#22c55e' : '#8b5cf6',
                          borderRadius: 99, transition: 'width .4s',
                        }} />
                      </div>
                    )}
                  </div>
                  {/* Live counter */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: jDone ? '#86efac' : '#64748b', flexShrink: 0 }}>
                    {jObj ? `${jCur}/${jTgt}` : '—'}
                  </span>
                </button>
              )
            })}

            <button
              style={{ ...S.btnPrimary, marginTop: 14 }}
              onClick={() => handleOpenTask(firstUnfinished)}
            >
              MỞ NHIỆM VỤ TIẾP THEO
            </button>
            <button
              style={{ ...S.btnPrimary, marginTop: 8, background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 10px 24px rgba(34,197,94,0.28)' }}
              onClick={() => {
                onClose?.()
                if (onViewMedicalRecord) onViewMedicalRecord()
                else window.dispatchEvent(new CustomEvent('navigate-to-upload'))
              }}
            >
              📷 Xem hình tại Medical Records
            </button>
            <button style={{ ...S.btnOutline, marginTop: 8 }} onClick={onClose}>ĐÓNG</button>
          </div>

          {/* ── CỘT PHẢI: detail của mission được chọn ───────────────────── */}
          <div style={S.colRight}>
            {!selMission ? (
              <ChapterOverview
                ch1={ch1}
                ch1Pct={ch1Pct}
                curSum={curSum}
                totalTgt={totalTgt}
                missions={ALL_MISSIONS}
                todayTask={todayTask}
                journeyObj={journeyObj}
                onSelect={setSelected}
                onOpenTask={handleOpenTask}
                ch1Done={ch1Done}
              />
            ) : (
              <MissionDetail
                mission={selMission}
                todayTask={todayTask}
                journeyObj={journeyObj}
                allMissions={ALL_MISSIONS}
                onOpenTask={handleOpenTask}
                onBack={() => setSelected(null)}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Sub: Chapter overview ─────────────────────────────────────────────────────
function ChapterOverview({ ch1, ch1Pct, curSum, totalTgt, missions, todayTask, journeyObj, onSelect, onOpenTask, ch1Done }) {
  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }}>
      <div style={S.sectionLabel}>CHAPTER 1 · TỔNG QUAN</div>

      {ch1.description && (
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, lineHeight: 1.6 }}>
          {ch1.description?.vi || ch1.description?.en || ''}
        </div>
      )}

      <div style={S.statCard}>
        <div style={S.rowBetween}>
          <span style={S.dim}>Tổng tiến độ Chapter 1</span>
          <span style={{ fontWeight: 700, color: ch1Done ? '#86efac' : '#c4b5fd' }}>{ch1Pct}%</span>
        </div>
        <div style={S.barBg}>
          <div style={{
            ...S.barFill, width: `${ch1Pct}%`,
            background: ch1Done ? '#22c55e' : 'linear-gradient(90deg,#8b5cf6,#3b82f6)',
          }} />
        </div>
        <div style={{ fontSize: 11, color: ch1Done ? '#86efac' : '#64748b', marginTop: 4 }}>
          {ch1Done
            ? '🎉 Đã hoàn thành — Chapter 2 mở khoá!'
            : `${curSum}/${totalTgt} tổng tiến độ các mục tiêu`}
        </div>
      </div>

      {/* Objectives từ journeys.json */}
      {ch1.requiredObjectives?.length > 0 && (
        <>
          <div style={{ ...S.sectionLabel, marginTop: 12 }}>MỤC TIÊU BẮT BUỘC</div>
          {ch1.requiredObjectives.map((obj, i) => {
            const jObj   = journeyObj(obj.task)
            const jCur   = jObj?.current || 0
            const jTgt   = jObj?.target  || obj.target
            const objPct = jObj ? Math.min(100, Math.round(jCur / jTgt * 100)) : 0
            const done   = jCur >= jTgt
            return (
              <div
                key={i}
                onClick={() => onSelect(M_KEYS[i])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{M_ICONS[i] || '⭐'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: done ? '#86efac' : '#e8f0f8' }}>
                    {obj.title?.vi || obj.title?.en || obj.task}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    Target: {jTgt} · Task: {obj.task}
                  </div>
                  {jObj && (
                    <div style={{ height: 3, background: 'rgba(255,255,255,.07)', borderRadius: 99, marginTop: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: 3, width: `${objPct}%`,
                        background: done ? '#22c55e' : '#8b5cf6',
                        borderRadius: 99, transition: 'width .4s',
                      }} />
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: done ? '#86efac' : '#64748b' }}>
                  {jObj ? `${jCur}/${jTgt}` : '—'}
                </span>
              </div>
            )
          })}
        </>
      )}

      {/* Rewards */}
      {ch1.rewards?.length > 0 && (
        <>
          <div style={{ ...S.sectionLabel, marginTop: 12 }}>PHẦN THƯỞNG CHAPTER 1</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ch1.rewards.map((r, i) => (
              <span key={i} style={S.badgePurple}>
                {r.icon || '🎁'} {r.label?.vi || r.label?.en || r.type}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub: Single mission detail ────────────────────────────────────────────────
function MissionDetail({ mission, todayTask, journeyObj, allMissions, onOpenTask, onBack }) {
  // todayTask: dùng mappedTaskId ('water')
  const tState = todayTask(mission.mappedTaskId)
  const tPct   = pct(tState)
  // journeyObj: dùng taskId ('drink_water')
  const jObj   = journeyObj(mission.taskId)
  const jCur   = jObj?.current || 0
  const jTgt   = jObj?.target  || mission.target
  const jPct   = jObj ? Math.min(100, Math.round(jCur / jTgt * 100)) : 0
  const jDone  = jCur >= jTgt

  const isWater = mission.taskId === 'drink_water'
  const remaining = Math.max(0, jTgt - jCur)

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 10 }}
      >
        ← Quay lại tổng quan
      </button>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 2 }}>
          CHAPTER 1 · NHIỆM VỤ {mission.index + 1}
        </div>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 22, fontWeight: 900, marginTop: 4 }}>
          {mission.title.toUpperCase()}
        </div>
        <div style={{ fontSize: 80, margin: '8px 0 4px', lineHeight: 1 }}>{mission.icon}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{mission.subtitle}</div>
      </div>

      {/* Journey-level progress (tích lũy nhiều ngày) */}
      <div style={S.statCard}>
        <div style={S.rowBetween}>
          <span style={S.dim}>Tiến độ hành trình (tích lũy)</span>
          <span style={{ fontWeight: 700, color: jDone ? '#86efac' : '#c4b5fd' }}>{jPct}%</span>
        </div>
        <div style={S.barBg}>
          <div style={{
            ...S.barFill, width: `${jPct}%`,
            background: jDone ? '#22c55e' : 'linear-gradient(90deg,#8b5cf6,#3b82f6)',
            transition: 'width .4s',
          }} />
        </div>
        <div style={{ fontSize: 11, color: jDone ? '#86efac' : '#64748b', marginTop: 4 }}>
          {jObj ? `${jCur}/${jTgt} lần tích lũy` : `0/${mission.target} lần`}
          {jDone
            ? ' · ✓ Hoàn thành — Chapter 2 mở khoá!'
            : isWater
              ? ` · Còn ${remaining} lần nữa để mở khoá Chapter 2`
              : ''}
        </div>
      </div>

      {/* Today's progress */}
      <div style={S.statCard}>
        <div style={S.rowBetween}>
          <span style={S.dim}>Hôm nay</span>
          <span style={{ fontWeight: 700, color: tPct >= 100 ? '#86efac' : '#93c5fd' }}>{tPct}%</span>
        </div>
        <div style={S.barBg}>
          <div style={{
            ...S.barFill, width: `${tPct}%`,
            background: tPct >= 100 ? '#22c55e' : 'linear-gradient(90deg,#8b5cf6,#3b82f6)',
            transition: 'width .4s',
          }} />
        </div>
        <div style={{ fontSize: 11, color: tPct >= 100 ? '#86efac' : '#64748b', marginTop: 4 }}>
          {tState ? `${tState.current}/${tState.target}` : `0/${mission.target}`}
          {' · '}{tPct >= 100 ? 'Đã hoàn thành ✓' : 'Đang thực hiện'}
        </div>
      </div>

      {/* Water-specific guidance */}
      {isWater && !jDone && (
        <div style={{
          padding: '10px 12px', borderRadius: 10, marginBottom: 10,
          background: 'rgba(14,165,233,.08)', border: '1px solid rgba(14,165,233,.3)',
          fontSize: 12, color: '#7dd3fc', lineHeight: 1.6,
        }}>
          💡 <b>Cách ghi nhận:</b> Nhấn "MỞ NHIỆM VỤ NÀY" → trong popup nhiệm vụ nhấn nút camera để chụp ảnh mỗi lần uống nước. Mỗi lần chụp = +1 lần uống nước. Hoàn thành <b>{jTgt} lần</b> (tích lũy nhiều ngày) để mở khoá Chapter 2: The Discipline.
        </div>
      )}

      {jDone && (
        <div style={{
          padding: '10px 12px', borderRadius: 10, marginBottom: 10,
          background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)',
          fontSize: 12, color: '#86efac', fontWeight: 700,
        }}>
          🎉 Nhiệm vụ hoàn thành! Chapter 2 · THE DISCIPLINE đã được mở khoá.
        </div>
      )}

      {/* CTA — pass mission object (có cả mappedTaskId) vào handleOpenTask */}
      <button
        style={{
          ...S.btnPrimary, marginTop: 4,
          background: jDone
            ? 'linear-gradient(135deg,#16a34a,#22c55e)'
            : 'linear-gradient(135deg,#8b5cf6,#3b82f6)',
          boxShadow: jDone
            ? '0 10px 24px rgba(34,197,94,.28)'
            : '0 10px 24px rgba(139,92,246,.28)',
          fontSize: 14,
        }}
        onClick={() => onOpenTask(mission)}
      >
        {jDone
          ? '✓ XEM LẠI NHIỆM VỤ NÀY'
          : `🎯 MỞ NHIỆM VỤ NÀY · ${jCur}/${jTgt}`}
      </button>

      {/* Other missions */}
      <div style={{ ...S.sectionLabel, marginTop: 14 }}>CÁC NHIỆM VỤ KHÁC TRONG CHAPTER 1</div>
      {allMissions.filter(m => m.chapterKey !== mission.chapterKey).map(m => {
        const jO  = journeyObj(m.taskId)
        const jD  = jO ? jO.current >= jO.target : false
        const jC  = jO?.current || 0
        const jT  = jO?.target  || m.target
        return (
          <button
            key={m.chapterKey}
            type="button"
            onClick={() => onOpenTask(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', width: '100%', textAlign: 'left',
              borderBottom: '1px solid rgba(255,255,255,.06)',
              cursor: 'pointer', background: 'none', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,.06)', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: jD ? '#86efac' : '#e8f0f8' }}>
                {m.title}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{m.subtitle}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: jD ? '#86efac' : '#64748b' }}>
              {jO ? `${jC}/${jT}` : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(5,8,18,.88)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'stretch', justifyContent: 'center',
    padding: '0',
  },
  box: {
    width: '100vw', height: '100%', maxWidth: 1400,
    background: '#0a1220', borderRadius: 0, border: 'none',
    padding: '14px 16px 12px', position: 'relative',
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto', overflowX: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, width: 32, height: 32,
    borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: 'none',
    color: '#94a3b8', fontSize: 15, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title:        { fontFamily: "'Rajdhani',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 2 },
  subtitle:     { fontSize: 12, color: '#64748b', marginBottom: 12 },
  cols:         { display: 'flex', gap: 16, flex: 1, overflow: 'visible', minHeight: 0 },
  colLeft:      { width: 320, flexShrink: 0, overflowY: 'visible', paddingRight: 8, display: 'flex', flexDirection: 'column' },
  colRight:     { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#93c5fd', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  glow:         { height: 1, background: 'linear-gradient(90deg,transparent,rgba(80,160,255,.2),transparent)', margin: '10px 0' },
  statCard:     { background: 'rgba(255,255,255,.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)', padding: '10px 12px', marginBottom: 8 },
  rowBetween:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dim:          { fontSize: 12, color: '#64748b' },
  barBg:        { height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' },
  barFill:      { height: 5, borderRadius: 99, transition: 'width .3s' },
  badgePurple:  { padding: '3px 9px', borderRadius: 99, background: 'rgba(139,92,246,.2)', color: '#c4b5fd', fontSize: 11, fontWeight: 700 },
  btnPrimary:   { width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4 },
  btnOutline:   { width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
}
