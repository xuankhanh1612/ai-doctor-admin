import React, { useState, useEffect, useCallback, useMemo } from 'react'
import journeysData from './data/journeys.json'
import {
  HEALTH_JOURNEY_EVENT,
  ACTIVITY_TASK_MAP,
  getTaskSnapshot,
  checkAndUnlockChapters,
  getLeaderboard,
  calculateUserScore,
  awardChapterCompletionBonus,
  isChapterCompleted,
} from './services/healthJourneyStorage.js'

/**
 * JourneyDetailPopup.jsx
 * Popup "Chi tiết Journey":
 * - Chapter 1 targets giảm 1/2 (cập nhật trong journeys.json)
 * - Mỗi user có bộ dữ liệu tracking riêng (per-user localStorage)
 * - Điểm thưởng khi kết thúc mỗi Chapter
 * - Leaderboard xếp hạng toàn bộ users
 */

const CH_ICONS  = ['🌅','🔥','⚡','👑','⚜️']
const CH_COLORS = [
  'rgba(139,92,246,.2)',
  'rgba(59,130,246,.2)',
  'rgba(239,68,68,.2)',
  'rgba(245,158,11,.2)',
  'rgba(34,197,94,.2)',
]

const MISSION_META = {
  drink_water:        { key: 'drink_water',        icon: '💧', label: 'Water Mastery' },
  breath_activation:  { key: 'breath_activation',  icon: '🌬', label: 'Breath Power' },
  walk_10000_steps:   { key: 'walk_10000_steps',   icon: '🚶', label: 'Step Warrior' },
  deep_work_90m:      { key: 'deep_work_90m',      icon: '🎯', label: 'Deep Focus' },
  read_20_pages:      { key: 'read_20_pages',      icon: '📚', label: 'Book Seeker' },
  no_sugar_challenge: { key: 'no_sugar_challenge', icon: '🚫', label: 'Sugar Slayer' },
  cold_shower:        { key: 'cold_shower',         icon: '🚿', label: 'Cold Warrior' },
  reflection_journal: { key: 'reflection_journal', icon: '📓', label: 'Mind Forge' },
  import_inbody:      { key: 'import_inbody',      icon: '📈', label: 'Body Scan' },
}
const fallbackMeta = (task, i) => ({ key: `step_${i}`, icon: '⭐', label: task || `Step ${i + 1}` })

function chapterNumFromKey(chapterKey) {
  if (!chapterKey || chapterKey === 'overview') return 1
  const m = chapterKey.match(/chapter_(\d+)/)
  return m ? parseInt(m[1], 10) : 1
}

function buildMissionsForChapter(journey) {
  if (!journey?.requiredObjectives) return []
  return journey.requiredObjectives.map((obj, i) => {
    const meta = MISSION_META[obj.task] || fallbackMeta(obj.task, i)
    return {
      chapterKey:   `${meta.key}_ch${journey.chapter}`,
      taskId:       obj.task,
      mappedTaskId: ACTIVITY_TASK_MAP[obj.task] || obj.task,
      icon:         meta.icon,
      title:        `The ${meta.label}`,
      subtitle:     obj.title?.vi || obj.title?.en || `Hoàn thành ${obj.target} lần`,
      target:       obj.target,
      index:        i,
    }
  })
}

function pct(taskState) {
  if (!taskState?.target) return 0
  return Math.min(100, Math.round((Number(taskState.current || 0) / Number(taskState.target || 1)) * 100))
}

const ALL_JOURNEYS = journeysData.journeys || []

const TABS = ['journey', 'leaderboard']

// ─────────────────────────────────────────────────────────────────────────────
export default function JourneyDetailPopup({
  chapterKey,
  onClose,
  onOpenTask,
  snapshot: initialSnapshot,
  user,
  onViewMedicalRecord,
}) {
  const initialChapterNum = chapterNumFromKey(chapterKey)
  const [activeChapterNum, setActiveChapterNum] = useState(initialChapterNum)
  const [selectedMissionKey, setSelectedMissionKey] = useState(null)
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [newlyUnlockedChapters, setNewlyUnlockedChapters] = useState([])
  const [bonusAwarded, setBonusAwarded] = useState([]) // { chapter, points }
  const [activeTab, setActiveTab] = useState('journey')
  const [leaderboard, setLeaderboard] = useState([])

  const refreshSnapshot = useCallback(() => {
    if (!user) return
    try {
      const fresh = getTaskSnapshot(user)
      setSnapshot(fresh)

      const justUnlocked = checkAndUnlockChapters(user, ALL_JOURNEYS)
      if (justUnlocked.length > 0) {
        setNewlyUnlockedChapters(prev => [...new Set([...prev, ...justUnlocked])])
        // Award bonus for each newly unlocked (means prev chapter completed)
        justUnlocked.forEach(unlockedChNum => {
          const completedChNum = unlockedChNum - 1
          const bonus = awardChapterCompletionBonus(user, completedChNum, ALL_JOURNEYS)
          if (bonus > 0) {
            setBonusAwarded(prev => [...prev, { chapter: completedChNum, points: bonus }])
          }
        })
      }

      // Refresh leaderboard
      setLeaderboard(getLeaderboard(ALL_JOURNEYS))
    } catch (_) {}
  }, [user])

  useEffect(() => {
    refreshSnapshot()
    window.addEventListener(HEALTH_JOURNEY_EVENT, refreshSnapshot)
    return () => window.removeEventListener(HEALTH_JOURNEY_EVENT, refreshSnapshot)
  }, [refreshSnapshot])

  const unlocked = snapshot?.journeyUser?.journeyProgress?.unlockedChapters || [1]

  const activeJourney = useMemo(
    () => ALL_JOURNEYS.find(j => j.chapter === activeChapterNum) || ALL_JOURNEYS[0],
    [activeChapterNum]
  )

  const activeMissions = useMemo(
    () => buildMissionsForChapter(activeJourney),
    [activeJourney]
  )

  const todayTask  = (mappedId) => snapshot?.day?.tasks?.find(t => t.taskId === mappedId)
  // journeyObj: lookup by activityType + optional chapter (journeys.json target is source of truth)
  const journeyObj = (actType, chapter) => {
    const objectives = snapshot?.journeyUser?.journeyProgress?.objectives || []
    if (chapter != null) return objectives.find(o => o.activityType === actType && o.chapter === chapter)
    return objectives.find(o => o.activityType === actType)
  }

  const getChapterProgress = useCallback((journey) => {
    const objs = journey.requiredObjectives || []
    if (objs.length === 0) return { pct: 100, curSum: 0, totalTgt: 0, done: unlocked.includes(journey.chapter) }
    const totalTgt = objs.reduce((s, o) => s + (o.target || 1), 0)
    const curSum   = objs.reduce((s, o) => {
      const obj = journeyObj(o.task, journey.chapter)
      return s + Math.min(obj?.current || 0, o.target || 1)
    }, 0)
    const p    = totalTgt > 0 ? Math.min(100, Math.round(curSum / totalTgt * 100)) : 0
    const done = p >= 100 || unlocked.includes(journey.chapter + 1)
    return { pct: p, curSum, totalTgt, done }
  }, [snapshot, unlocked])

  const { pct: activePct, curSum: activeSum, totalTgt: activeTgt, done: activeDone } = getChapterProgress(activeJourney)

  const selMission = selectedMissionKey
    ? activeMissions.find(m => m.chapterKey === selectedMissionKey)
    : null

  const firstUnfinished =
    activeMissions.find(m => pct(todayTask(m.mappedTaskId)) < 100) || activeMissions[0]

  const handleOpenTask = (mission) => {
    const taskIdToOpen = mission?.mappedTaskId || mission?.taskId || mission
    onClose?.()
    onOpenTask?.(taskIdToOpen)
  }

  const handleSelectChapter = (chNum) => {
    const isUnlocked = chNum === 1 || unlocked.includes(chNum)
    if (!isUnlocked) return
    setActiveChapterNum(chNum)
    setSelectedMissionKey(null)
  }

  // My score info
  const myScore = snapshot?.journeyUser
    ? calculateUserScore(snapshot.journeyUser, ALL_JOURNEYS)
    : null

  const myRank = leaderboard.findIndex(e => e.userId === myScore?.userId) + 1

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div style={S.box} className="jdp-box">
        <style>{`
          @media (max-width: 860px) {
            .jdp-box { width: 100vw !important; height: 100% !important; max-width: none !important; border-radius: 0 !important; }
            .jdp-cols { flex-direction: column !important; overflow-y: auto !important; }
            .jdp-left-col { width: 100% !important; overflow-y: visible !important; }
          }
          .jdp-tab-btn:hover { opacity: .85; }
          .jdp-chapter-row:hover { background: rgba(255,255,255,.05) !important; }
        `}</style>

        <button style={S.closeBtn} onClick={onClose}>✕</button>
        <div style={S.title}>⚔ Chi tiết Hành Trình</div>
        <div style={S.subtitle}>{ALL_JOURNEYS.length} Chapter · Mỗi user có tracking độc lập</div>

        {/* ── MY SCORE BANNER ──────────────────────────────────────────────── */}
        {myScore && (
          <div style={S.scoreBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={S.scoreAvatar}>{myScore.avatar ? <img src={myScore.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" /> : '🧑'}</div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{myScore.displayName}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fbbf24', fontFamily: "'Rajdhani',sans-serif" }}>
                  {myScore.total.toLocaleString()} điểm
                </div>
                <div style={{ fontSize: 10, color: '#64748b', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#93c5fd' }}>⚡{myScore.baseXP} XP</span>
                  {myScore.chapterBonus > 0 && <><span>+</span><span style={{ color: '#fbbf24' }}>🎁{myScore.chapterBonus} bonus</span></>}
                  {myScore.streakBonus > 0 && <><span>+</span><span style={{ color: '#f97316' }}>🔥{myScore.streakBonus} streak ({myScore.streak}d)</span></>}
                  <span style={{ color: '#475569' }}>= {myScore.total}</span>
                </div>
              </div>
            </div>
            {myRank > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Xếp hạng</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: myRank === 1 ? '#fbbf24' : myRank === 2 ? '#94a3b8' : myRank === 3 ? '#cd7c2f' : '#c4b5fd', fontFamily: "'Rajdhani',sans-serif" }}>
                  #{myRank}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BONUS AWARD TOASTS ────────────────────────────────────────── */}
        {bonusAwarded.map((b, idx) => (
          <div key={idx} style={S.bonusToast}>
            <span style={{ fontSize: 20 }}>🎁</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>
                +{b.points} điểm thưởng · Hoàn thành Chapter {b.chapter}!
              </div>
              <div style={{ fontSize: 11, color: '#fde68a' }}>
                Điểm đã được cộng vào tổng điểm của bạn 🎉
              </div>
            </div>
          </div>
        ))}

        {/* ── UNLOCK BANNERS ──────────────────────────────────────────────── */}
        {ALL_JOURNEYS.map((journey, idx) => {
          if (idx === 0) return null
          if (!newlyUnlockedChapters.includes(journey.chapter)) return null
          const prevJourney = ALL_JOURNEYS[idx - 1]
          return (
            <div key={journey.chapter} style={S.unlockBanner}>
              <span style={{ fontSize: 24 }}>🔓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#86efac' }}>
                  Chapter {journey.chapter} · {(journey.title?.en || '').toUpperCase()} đã mở khoá!
                </div>
                <div style={{ fontSize: 11, color: '#6ee7b7' }}>
                  Bạn đã hoàn thành Chapter {prevJourney.chapter} · {journey.title?.vi || ''} 🎉
                </div>
              </div>
            </div>
          )
        })}

        {/* ── TABS ─────────────────────────────────────────────────────────── */}
        <div style={S.tabBar}>
          {[
            { key: 'journey', label: '⚔ Hành Trình' },
            { key: 'leaderboard', label: '🏆 Bảng Xếp Hạng' },
          ].map(tab => (
            <button
              key={tab.key}
              className="jdp-tab-btn"
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...S.tabBtn,
                background: activeTab === tab.key ? 'rgba(139,92,246,.25)' : 'rgba(255,255,255,.04)',
                color: activeTab === tab.key ? '#c4b5fd' : '#64748b',
                border: `1px solid ${activeTab === tab.key ? 'rgba(139,92,246,.5)' : 'rgba(255,255,255,.08)'}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: LEADERBOARD ─────────────────────────────────────────────── */}
        {activeTab === 'leaderboard' && (
          <LeaderboardPanel leaderboard={leaderboard} myUserId={myScore?.userId} journeys={ALL_JOURNEYS} />
        )}

        {/* ── TAB: JOURNEY ─────────────────────────────────────────────────── */}
        {activeTab === 'journey' && (
          <div style={S.cols} className="jdp-cols">

            {/* ── CỘT TRÁI ──────────────────────────────────────────────── */}
            <div style={S.colLeft} className="jdp-left-col">

              <div style={S.sectionLabel}>CÁC CHAPTER</div>
              {ALL_JOURNEYS.map((journey, idx) => {
                const isUnlocked  = idx === 0 || unlocked.includes(journey.chapter)
                const isActive    = journey.chapter === activeChapterNum
                const prevJourney = idx > 0 ? ALL_JOURNEYS[idx - 1] : null
                const { pct: thisPct, curSum: thisSum, totalTgt: thisTgt, done: thisDone } = getChapterProgress(journey)
                const canUnlock = !isUnlocked && prevJourney && getChapterProgress(prevJourney).done
                const bonusInfo = journey.bonusPoints
                  ? `+${journey.bonusPoints} pts bonus`
                  : null
                return (
                  <div key={journey.chapter} style={{ marginBottom: 6 }}>
                    <div
                      className="jdp-chapter-row"
                      onClick={() => {
                        if (isUnlocked) handleSelectChapter(journey.chapter)
                        else if (canUnlock) checkAndUnlockChapters(user, ALL_JOURNEYS)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: canUnlock ? '12px 12px 0 0' : 12,
                        border: `1px solid ${
                          isActive
                            ? 'rgba(139,92,246,.7)'
                            : isUnlocked
                              ? 'rgba(34,197,94,.3)'
                              : canUnlock
                                ? 'rgba(245,158,11,.35)'
                                : 'rgba(80,160,255,.12)'
                        }`,
                        borderBottom: canUnlock ? 'none' : undefined,
                        background: isActive
                          ? 'rgba(139,92,246,.15)'
                          : isUnlocked
                            ? 'rgba(34,197,94,.06)'
                            : canUnlock
                              ? 'rgba(245,158,11,.06)'
                              : 'rgba(255,255,255,.02)',
                        opacity: isUnlocked || canUnlock ? 1 : 0.35,
                        cursor: isUnlocked || canUnlock ? 'pointer' : 'default',
                        transition: 'all .2s',
                        boxShadow: isActive ? '0 0 0 2px rgba(139,92,246,.3)' : 'none',
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: CH_COLORS[idx] || CH_COLORS[0],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0,
                      }}>
                        {isActive ? (CH_ICONS[idx] || '⭐') : isUnlocked ? (CH_ICONS[idx] || '⭐') : canUnlock ? '🔓' : '🔒'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                          CHAPTER {journey.chapter} {isActive ? '· ĐANG XEM' : ''}
                          {bonusInfo && isUnlocked && !thisDone && (
                            <span style={{ color: '#fbbf24', fontSize: 9 }}>🎁 {bonusInfo}</span>
                          )}
                          {thisDone && bonusInfo && (
                            <span style={{ color: '#86efac', fontSize: 9 }}>✓ {bonusInfo} đã nhận</span>
                          )}
                        </div>
                        <div style={{
                          fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 800,
                          color: isActive ? '#c4b5fd' : 'inherit',
                        }}>
                          {(journey.title?.en || `CHAPTER ${journey.chapter}`).toUpperCase()}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{journey.title?.vi || ''}</div>
                        {isUnlocked && journey.requiredObjectives?.length > 0 && (
                          <>
                            <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                              <div style={{
                                height: 4, width: `${thisPct}%`,
                                background: thisDone ? '#22c55e' : 'linear-gradient(90deg,#8b5cf6,#3b82f6)',
                                borderRadius: 99, transition: 'width .4s',
                              }} />
                            </div>
                            <div style={{ fontSize: 10, color: thisDone ? '#86efac' : '#64748b', marginTop: 2 }}>
                              {thisDone ? '✓ Hoàn thành' : `${thisPct}% · ${thisSum}/${thisTgt}`}
                            </div>
                          </>
                        )}
                        {isUnlocked && !journey.requiredObjectives?.length && (
                          <div style={{ fontSize: 10, color: '#86efac', marginTop: 2 }}>✓ Đã mở khoá</div>
                        )}
                        {!isUnlocked && !canUnlock && (
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                            Hoàn thành Chapter {journey.chapter - 1} để mở
                          </div>
                        )}
                        {canUnlock && (
                          <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2 }}>
                            ✅ Đủ điều kiện · Nhấn để mở khoá ngay!
                          </div>
                        )}
                      </div>
                    </div>
                    {canUnlock && (
                      <button
                        onClick={() => checkAndUnlockChapters(user, ALL_JOURNEYS)}
                        style={{
                          width: '100%', padding: '9px 12px',
                          borderRadius: '0 0 12px 12px',
                          border: '1px solid rgba(245,158,11,.5)',
                          borderTop: 'none',
                          background: 'linear-gradient(135deg,rgba(245,158,11,.25),rgba(234,88,12,.2))',
                          color: '#fbbf24', fontWeight: 800, fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        🔓 MỞ KHOÁ CHAPTER {journey.chapter} NGAY
                      </button>
                    )}
                  </div>
                )
              })}

              <div style={S.glow} />

              {/* Mission list */}
              <div style={S.sectionLabel}>
                CHAPTER {activeChapterNum} · NHIỆM VỤ · {activeJourney.title?.vi?.toUpperCase() || ''}
              </div>
              {activeMissions.length === 0 ? (
                <div style={{ fontSize: 12, color: '#64748b', padding: '8px 0' }}>
                  Chưa có nhiệm vụ cho chapter này.
                </div>
              ) : activeMissions.map((m, i) => {
                const tState = todayTask(m.mappedTaskId)
                const mPct   = pct(tState)
                const jObj   = journeyObj(m.taskId, activeChapterNum)
                const jCur   = jObj?.current || 0
                const jTgt   = m.target || jObj?.target || 1   // journeys.json is source of truth
                const jPct   = jObj ? Math.min(100, Math.round(jCur / jTgt * 100)) : 0
                const jDone  = jObj ? jCur >= jTgt : false
                const isSel  = selectedMissionKey === m.chapterKey
                return (
                  <button
                    key={m.chapterKey}
                    type="button"
                    onClick={() => setSelectedMissionKey(isSel ? null : m.chapterKey)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', width: '100%', textAlign: 'left',
                      borderRadius: 10, marginBottom: 4, cursor: 'pointer', fontFamily: 'inherit',
                      background: isSel ? 'rgba(139,92,246,.15)' : 'rgba(255,255,255,.03)',
                      border: `1px solid ${isSel ? 'rgba(139,92,246,.4)' : 'rgba(255,255,255,.06)'}`,
                    }}
                  >
                    <span style={{ fontSize: 9, color: '#64748b', width: 20, flexShrink: 0, textAlign: 'center' }}>
                      {activeChapterNum}-{i + 1}
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
                    <span style={{ fontSize: 11, fontWeight: 700, color: jDone ? '#86efac' : '#64748b', flexShrink: 0 }}>
                      {jObj ? `${jCur}/${jTgt}` : `0/${m.target}`}
                    </span>
                  </button>
                )
              })}

              <button style={{ ...S.btnPrimary, marginTop: 14 }} onClick={() => handleOpenTask(firstUnfinished)}>
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

            {/* ── CỘT PHẢI ──────────────────────────────────────────────── */}
            <div style={S.colRight}>
              {!selMission ? (
                <ChapterOverview
                  journey={activeJourney}
                  chapterNum={activeChapterNum}
                  chPct={activePct}
                  curSum={activeSum}
                  totalTgt={activeTgt}
                  chDone={activeDone}
                  missions={activeMissions}
                  todayTask={todayTask}
                  journeyObj={journeyObj}
                  onSelectMission={setSelectedMissionKey}
                  onOpenTask={handleOpenTask}
                  allJourneys={ALL_JOURNEYS}
                  unlocked={unlocked}
                  user={user}
                  checkAndUnlock={checkAndUnlockChapters}
                  chIcons={CH_ICONS}
                />
              ) : (
                <MissionDetail
                  mission={selMission}
                  chapterNum={activeChapterNum}
                  todayTask={todayTask}
                  journeyObj={journeyObj}
                  allMissions={activeMissions}
                  onOpenTask={handleOpenTask}
                  onBack={() => setSelectedMissionKey(null)}
                  activeJourney={activeJourney}
                />
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Leaderboard Panel ─────────────────────────────────────────────────────────
function LeaderboardPanel({ leaderboard, myUserId, journeys }) {
  const rankColors = ['#fbbf24', '#94a3b8', '#cd7c2f']
  const rankLabels = ['🥇', '🥈', '🥉']

  if (leaderboard.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#64748b' }}>
        <div style={{ fontSize: 40 }}>🏆</div>
        <div style={{ fontSize: 14 }}>Chưa có dữ liệu xếp hạng.</div>
        <div style={{ fontSize: 12 }}>Hoàn thành các nhiệm vụ để xuất hiện trên bảng!</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
      <div style={{ ...S.sectionLabel, marginBottom: 10 }}>🏆 BẢNG XẾP HẠNG TOÀN CẦU</div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
        Điểm = XP hoạt động + Thưởng chapter + Bonus streak. Mỗi user có tracking độc lập.
      </div>

      {/* Score breakdown legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { icon: '⚡', label: 'XP hoạt động', color: '#93c5fd' },
          { icon: '🎁', label: 'Bonus chapter', color: '#fbbf24' },
          { icon: '🔥', label: 'Streak bonus', color: '#f97316' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: item.color, background: 'rgba(255,255,255,.04)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(255,255,255,.08)' }}>
            {item.icon} {item.label}
          </div>
        ))}
      </div>

      {leaderboard.map((entry, idx) => {
        const isMe = entry.userId === myUserId
        const rankIcon = rankLabels[idx] || `#${entry.rank}`
        const rankColor = rankColors[idx] || '#64748b'
        const completedChapters = entry.completedChapters || []

        return (
          <div
            key={entry.userId}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 12, marginBottom: 6,
              background: isMe
                ? 'linear-gradient(135deg,rgba(139,92,246,.18),rgba(59,130,246,.1))'
                : idx === 0
                  ? 'rgba(251,191,36,.06)'
                  : 'rgba(255,255,255,.03)',
              border: `1px solid ${isMe ? 'rgba(139,92,246,.5)' : idx === 0 ? 'rgba(251,191,36,.3)' : 'rgba(255,255,255,.06)'}`,
              boxShadow: isMe ? '0 0 0 2px rgba(139,92,246,.2)' : 'none',
            }}
          >
            {/* Rank */}
            <div style={{ width: 32, textAlign: 'center', fontSize: idx < 3 ? 22 : 14, fontWeight: 800, color: rankColor, flexShrink: 0 }}>
              {rankIcon}
            </div>

            {/* Avatar */}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
              {entry.avatar
                ? <img src={entry.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : '🧑'
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? '#c4b5fd' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.displayName}
                  {isMe && <span style={{ marginLeft: 6, fontSize: 10, color: '#8b5cf6', background: 'rgba(139,92,246,.15)', padding: '1px 6px', borderRadius: 99 }}>Bạn</span>}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#93c5fd' }}>⚡{entry.baseXP} XP</span>
                {entry.chapterBonus > 0 && <span style={{ color: '#fbbf24' }}>🎁+{entry.chapterBonus}</span>}
                {entry.streakBonus > 0 && <span style={{ color: '#f97316' }}>🔥+{entry.streakBonus} ({entry.streak}d)</span>}
              </div>
              {completedChapters.length > 0 && (
                <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                  {completedChapters.map(ch => (
                    <span key={ch} style={{ fontSize: 9, background: 'rgba(34,197,94,.15)', color: '#86efac', padding: '1px 5px', borderRadius: 99, border: '1px solid rgba(34,197,94,.2)' }}>
                      CH{ch} ✓
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Score */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: rankColor, fontFamily: "'Rajdhani',sans-serif" }}>
                {entry.total.toLocaleString()}
              </div>
              <div style={{ fontSize: 9, color: '#64748b' }}>điểm</div>
            </div>
          </div>
        )
      })}

      {/* Chapter bonus table */}
      <div style={{ ...S.sectionLabel, marginTop: 18, marginBottom: 8 }}>🎁 BẢNG ĐIỂM THƯỞNG CHAPTER</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {journeys.map((j, idx) => (
          <div key={j.chapter} style={{
            padding: '8px 6px', borderRadius: 10, textAlign: 'center',
            background: CH_COLORS[idx] || 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
          }}>
            <div style={{ fontSize: 16 }}>{CH_ICONS[idx]}</div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>CH{j.chapter}</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#fbbf24', fontFamily: "'Rajdhani',sans-serif" }}>
              +{j.bonusPoints || 0}
            </div>
            <div style={{ fontSize: 8, color: '#64748b' }}>pts</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chapter Overview ──────────────────────────────────────────────────────────
function ChapterOverview({
  journey, chapterNum, chPct, curSum, totalTgt, chDone,
  missions, todayTask, journeyObj, onSelectMission, onOpenTask,
  allJourneys, unlocked, user, checkAndUnlock, chIcons,
}) {
  const nextChapter = allJourneys.find(j => j.chapter === chapterNum + 1)
  const canUnlockNext = nextChapter && chDone && !unlocked.includes(nextChapter.chapter)
  const isChapter1 = chapterNum === 1

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: CH_COLORS[chapterNum - 1] || CH_COLORS[0],
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          {chIcons[chapterNum - 1] || '⭐'}
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
            CHAPTER {chapterNum}
            {isChapter1 && (
              <span style={{ fontSize: 9, color: '#86efac', background: 'rgba(34,197,94,.15)', padding: '1px 6px', borderRadius: 99, border: '1px solid rgba(34,197,94,.2)' }}>
                🌱 LEVEL KHỞI ĐẦU · MỤC TIÊU 1/2
              </span>
            )}
          </div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 20, fontWeight: 900 }}>
            {(journey.title?.en || `CHAPTER ${chapterNum}`).toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{journey.title?.vi || ''}</div>
        </div>
      </div>

      <div style={S.sectionLabel}>TỔNG QUAN CHAPTER {chapterNum}</div>

      {journey.description && (
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, lineHeight: 1.6 }}>
          {journey.description?.vi || journey.description?.en || ''}
        </div>
      )}

      {/* Bonus points info */}
      {journey.bonusPoints && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10, marginBottom: 10,
          background: chDone ? 'rgba(34,197,94,.1)' : 'rgba(251,191,36,.08)',
          border: `1px solid ${chDone ? 'rgba(34,197,94,.3)' : 'rgba(251,191,36,.25)'}`,
        }}>
          <span style={{ fontSize: 22 }}>🎁</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: chDone ? '#86efac' : '#fbbf24' }}>
              {chDone ? `✓ Đã nhận thưởng +${journey.bonusPoints} điểm!` : `Thưởng hoàn thành: +${journey.bonusPoints} điểm`}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>
              {chDone ? 'Điểm đã được cộng vào bảng xếp hạng.' : 'Hoàn thành tất cả mục tiêu để nhận thưởng.'}
            </div>
          </div>
        </div>
      )}

      <div style={S.statCard}>
        <div style={S.rowBetween}>
          <span style={S.dim}>Tổng tiến độ Chapter {chapterNum}</span>
          <span style={{ fontWeight: 700, color: chDone ? '#86efac' : '#c4b5fd' }}>{chPct}%</span>
        </div>
        <div style={S.barBg}>
          <div style={{
            ...S.barFill, width: `${chPct}%`,
            background: chDone ? '#22c55e' : 'linear-gradient(90deg,#8b5cf6,#3b82f6)',
          }} />
        </div>
        <div style={{ fontSize: 11, color: chDone ? '#86efac' : '#64748b', marginTop: 4 }}>
          {chDone
            ? `🎉 Đã hoàn thành Chapter ${chapterNum}${nextChapter ? ` — Chapter ${chapterNum + 1} ${unlocked.includes(chapterNum + 1) ? 'đang mở!' : 'sẵn sàng mở khoá!'}` : ' — Bạn là Huyền Thoại!'}`
            : `${curSum}/${totalTgt} tổng tiến độ các mục tiêu`}
        </div>
      </div>

      {canUnlockNext && (
        <button
          onClick={() => checkAndUnlock(user, allJourneys)}
          style={{
            width: '100%', padding: '12px', borderRadius: 12, marginBottom: 12,
            border: '1px solid rgba(245,158,11,.5)',
            background: 'linear-gradient(135deg,rgba(245,158,11,.2),rgba(234,88,12,.15))',
            color: '#fbbf24', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 20px rgba(245,158,11,.2)',
          }}
        >
          🔓 MỞ KHOÁ CHAPTER {chapterNum + 1} · {(nextChapter.title?.en || '').toUpperCase()}
        </button>
      )}

      {journey.requiredObjectives?.length > 0 && (
        <>
          <div style={{ ...S.sectionLabel, marginTop: 12 }}>MỤC TIÊU BẮT BUỘC</div>
          {journey.requiredObjectives.map((obj, i) => {
            const jObj   = journeyObj(obj.task, journey.chapter)
            const jCur   = jObj?.current || 0
            const jTgt   = obj.target || jObj?.target || 1   // journeys.json is source of truth
            const objPct = jObj ? Math.min(100, Math.round(jCur / jTgt * 100)) : 0
            const done   = jCur >= jTgt
            const m      = missions[i]
            return (
              <div
                key={i}
                onClick={() => onSelectMission(m?.chapterKey)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
                  transition: 'background .15s',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{m?.icon || '⭐'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: done ? '#86efac' : '#e8f0f8' }}>
                    {obj.title?.vi || obj.title?.en || obj.task}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    Target: {jTgt} lần · Task: {obj.task}
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
                  {jObj ? `${jCur}/${jTgt}` : `0/${obj.target}`}
                </span>
              </div>
            )
          })}
        </>
      )}

      {journey.rewards?.length > 0 && (
        <>
          <div style={{ ...S.sectionLabel, marginTop: 12 }}>PHẦN THƯỞNG CHAPTER {chapterNum}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {journey.rewards.map((r, i) => (
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

// ── Mission Detail ────────────────────────────────────────────────────────────
function MissionDetail({ mission, chapterNum, todayTask, journeyObj, allMissions, onOpenTask, onBack, activeJourney }) {
  const tState = todayTask(mission.mappedTaskId)
  const tPct   = pct(tState)
  const jObj   = journeyObj(mission.taskId, chapterNum)
  const jCur   = jObj?.current || 0
  const jTgt   = mission.target || jObj?.target || 1   // journeys.json is source of truth
  const jPct   = jObj ? Math.min(100, Math.round(jCur / jTgt * 100)) : 0
  const jDone  = jCur >= jTgt
  const remaining = Math.max(0, jTgt - jCur)

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 10 }}
      >
        ← Quay lại Chapter {chapterNum} · {activeJourney.title?.vi || ''}
      </button>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 2 }}>
          CHAPTER {chapterNum} · NHIỆM VỤ {mission.index + 1}
        </div>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 22, fontWeight: 900, marginTop: 4 }}>
          {mission.title.toUpperCase()}
        </div>
        <div style={{ fontSize: 80, margin: '8px 0 4px', lineHeight: 1 }}>{mission.icon}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{mission.subtitle}</div>
      </div>

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
          {jDone ? ` · ✓ Hoàn thành nhiệm vụ này!` : ` · Còn ${remaining} lần nữa`}
        </div>
      </div>

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
          {' · '}{tPct >= 100 ? 'Đã hoàn thành hôm nay ✓' : 'Đang thực hiện'}
        </div>
      </div>

      {jDone && (
        <div style={{
          padding: '10px 12px', borderRadius: 10, marginBottom: 10,
          background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)',
          fontSize: 12, color: '#86efac', fontWeight: 700,
        }}>
          🎉 Nhiệm vụ này đã hoàn thành! Tiến đến nhiệm vụ tiếp theo.
        </div>
      )}

      <button
        style={{
          ...S.btnPrimary, marginTop: 4,
          background: jDone ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#8b5cf6,#3b82f6)',
          boxShadow: jDone ? '0 10px 24px rgba(34,197,94,.28)' : '0 10px 24px rgba(139,92,246,.28)',
          fontSize: 14,
        }}
        onClick={() => onOpenTask(mission)}
      >
        {jDone ? '✓ XEM LẠI NHIỆM VỤ NÀY' : `🎯 MỞ NHIỆM VỤ NÀY · ${jCur}/${jTgt}`}
      </button>

      <div style={{ ...S.sectionLabel, marginTop: 14 }}>
        CÁC NHIỆM VỤ KHÁC TRONG CHAPTER {chapterNum}
      </div>
      {allMissions.filter(m => m.chapterKey !== mission.chapterKey).map(m => {
        const jO  = journeyObj(m.taskId, chapterNum)
        const jD  = jO ? (jO.current >= (m.target || jO.target || 1)) : false
        const jC  = jO?.current || 0
        const jT  = m.target || jO?.target || 1  // journeys.json is source of truth
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
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: jD ? '#86efac' : '#e8f0f8' }}>{m.title}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{m.subtitle}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: jD ? '#86efac' : '#64748b' }}>
              {jO ? `${jC}/${jT}` : `0/${m.target}`}
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
  subtitle:     { fontSize: 12, color: '#64748b', marginBottom: 8 },
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
  tabBar:       { display: 'flex', gap: 8, marginBottom: 12 },
  tabBtn:       { padding: '7px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s', flex: 1 },
  scoreBanner:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, marginBottom: 10, background: 'linear-gradient(135deg,rgba(251,191,36,.1),rgba(245,158,11,.07))', border: '1px solid rgba(251,191,36,.25)' },
  scoreAvatar:  { width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', flexShrink: 0 },
  bonusToast:   { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 8, borderRadius: 10, background: 'linear-gradient(135deg,rgba(251,191,36,.15),rgba(245,158,11,.1))', border: '1px solid rgba(251,191,36,.4)' },
  unlockBanner: { padding: '10px 14px', marginBottom: 10, borderRadius: 10, background: 'linear-gradient(135deg,rgba(34,197,94,.15),rgba(22,163,74,.1))', border: '1px solid rgba(34,197,94,.45)', display: 'flex', alignItems: 'center', gap: 10 },
}
