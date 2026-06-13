import React from 'react'
import journeysData from './data/journeys.json'
/**
 * JourneyDetailPopup.jsx
 * Popup "Chi tiết Journey" - dữ liệu động từ journeys.json
 * Size: 90vw × 90vh, layout 2 cột
 */


const CH_ICONS  = ['🌅','🔥','⚡','👑','⚜️']
const CH_COLORS = ['rgba(139,92,246,.2)','rgba(59,130,246,.2)','rgba(239,68,68,.2)','rgba(245,158,11,.2)','rgba(34,197,94,.2)']
const M_ICONS   = ['🌅','🌬','🎯','🚫','📚','💧','🚶','💼']
const M_KEYS    = ['first_step','breath','focus','challenge','breakthrough','flow','stride','work']
const M_LABELS  = ['First Step','Breath','Focus','Challenge','Breakthrough','Flow','Stride','Work']

function buildMissions(journeys) {
  const ch1 = journeys.find(j => j.chapter === 1)
  if (!ch1?.requiredObjectives) return []
  return ch1.requiredObjectives.map((obj, i) => ({
    chapterKey: M_KEYS[i] || `step_${i}`,
    taskId: obj.task,
    icon: M_ICONS[i] || '⭐',
    title: `The ${M_LABELS[i] || `Step ${i+1}`}`,
    subtitle: obj.title?.vi || obj.title?.en || `Hoàn thành ${obj.target} lần`,
    target: obj.target,
    index: i,
  }))
}

const ALL_JOURNEYS = journeysData.journeys || []
const ALL_MISSIONS = buildMissions(ALL_JOURNEYS)

function pct(taskState) {
  if (!taskState?.target) return 0
  return Math.min(100, Math.round((Number(taskState.current||0) / Number(taskState.target||1)) * 100))
}

// ─────────────────────────────────────────────────────────────────────────────
export default function JourneyDetailPopup({ chapterKey, onClose, onOpenTask, snapshot }) {
  const [selected, setSelected] = React.useState(chapterKey || null)

  const todayTask  = taskId => snapshot?.day?.tasks?.find(t => t.taskId === taskId)
  const journeyObj = taskId => snapshot?.journeyUser?.journeyProgress?.objectives?.find(o => o.activityType === taskId)
  const unlocked   = snapshot?.journeyUser?.journeyProgress?.unlockedChapters || [1]

  // Chapter 1 overall progress
  const ch1        = ALL_JOURNEYS.find(j => j.chapter === 1) || {}
  const objectives = ch1.requiredObjectives || []
  const totalTgt   = objectives.reduce((s,o) => s + (o.target||1), 0)
  const curSum     = objectives.reduce((s,o) => {
    const obj = journeyObj(o.task)
    return s + Math.min(obj?.current||0, o.target||1)
  }, 0)
  const ch1Pct     = totalTgt > 0 ? Math.min(100, Math.round(curSum/totalTgt*100)) : 0

  const selMission = selected ? ALL_MISSIONS.find(m => m.chapterKey === selected) : null
  const firstUnfinished = ALL_MISSIONS.find(m => pct(todayTask(m.taskId)) < 100) || ALL_MISSIONS[0]

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

        <div style={S.cols} className="jdp-cols">
          {/* ── Cột trái: danh sách chapter + missions ── */}
          <div style={S.colLeft} className="jdp-left-col">

            {/* Chapter list từ journeys.json */}
            <div style={S.sectionLabel}>CÁC CHAPTER</div>
            {ALL_JOURNEYS.map((journey, idx) => {
              const isUnlocked = idx === 0 || unlocked.includes(journey.chapter)
              const isCh1      = idx === 0
              const thisPct    = isCh1 ? ch1Pct : 0
              return (
                <div key={journey.chapter}
                  onClick={() => isUnlocked && setSelected(null)}
                  style={{
                    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    borderRadius:12, marginBottom:6,
                    border:`1px solid ${isCh1 ? 'rgba(139,92,246,.4)' : 'rgba(80,160,255,.12)'}`,
                    background: isCh1 ? 'rgba(139,92,246,.08)' : 'rgba(255,255,255,.02)',
                    opacity: isUnlocked ? 1 : idx===1 ? 0.55 : 0.3,
                    cursor: isUnlocked ? 'pointer' : 'default',
                  }}>
                  <div style={{ width:44, height:44, borderRadius:10, background: CH_COLORS[idx]||CH_COLORS[0],
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {isUnlocked ? (CH_ICONS[idx]||'⭐') : '🔒'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, color:'#64748b', letterSpacing:1 }}>CHAPTER {journey.chapter}</div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, fontWeight:800 }}>
                      {(journey.title?.en || `CHAPTER ${journey.chapter}`).toUpperCase()}
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{journey.title?.vi||''}</div>
                    {isCh1 && (
                      <>
                        <div style={{ height:4, background:'rgba(255,255,255,.07)', borderRadius:99, marginTop:4, overflow:'hidden' }}>
                          <div style={{ height:4, width:`${thisPct}%`, background:'linear-gradient(90deg,#8b5cf6,#3b82f6)', borderRadius:99 }} />
                        </div>
                        <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{thisPct}% · {curSum}/{totalTgt}</div>
                      </>
                    )}
                    {!isUnlocked && <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>Hoàn thành Chapter {journey.chapter-1} để mở</div>}
                  </div>
                </div>
              )
            })}

            <div style={S.glow} />

            {/* Mission list chapter 1 */}
            <div style={S.sectionLabel}>CHAPTER 1 · NHIỆM VỤ</div>
            {ALL_MISSIONS.map((m, i) => {
              const tState = todayTask(m.taskId)
              const mPct   = pct(tState)
              const done   = mPct >= 100
              const active = !done && ALL_MISSIONS.slice(0,i).every(prev => pct(todayTask(prev.taskId)) >= 100)
              const isSel  = selected === m.chapterKey
              return (
                <div key={m.chapterKey}
                  onClick={() => setSelected(isSel ? null : m.chapterKey)}
                  style={{
                    display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                    borderRadius:10, marginBottom:4, cursor:'pointer',
                    background: isSel ? 'rgba(139,92,246,.15)' : 'rgba(255,255,255,.03)',
                    border:`1px solid ${isSel ? 'rgba(139,92,246,.4)' : 'rgba(255,255,255,.06)'}`,
                  }}>
                  <span style={{ fontSize:9, color:'#64748b', width:20, flexShrink:0, textAlign:'center' }}>1-{i+1}</span>
                  <div style={{ width:26, height:26, borderRadius:7, flexShrink:0,
                    background: done?'rgba(34,197,94,.15)':active?'rgba(59,130,246,.15)':'rgba(255,255,255,.04)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{m.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color: done?'#86efac':'#e8f0f8' }}>{m.title}</div>
                    <div style={{ fontSize:10, color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.subtitle}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:done?'#86efac':active?'#fcd34d':'#64748b', flexShrink:0 }}>
                    {done?'✓':tState?`${mPct}%`:'🔒'}
                  </span>
                </div>
              )
            })}

            <button style={{ ...S.btnPrimary, marginTop:14 }}
              onClick={() => { onClose?.(); onOpenTask?.(firstUnfinished?.taskId) }}>
              MỞ NHIỆM VỤ TIẾP THEO
            </button>
            <button style={{ ...S.btnOutline, marginTop:8 }} onClick={onClose}>ĐÓNG</button>
          </div>

          {/* ── Cột phải: detail của mission được chọn ── */}
          <div style={S.colRight}>
            {!selMission ? (
              <ChapterOverview ch1={ch1} ch1Pct={ch1Pct} curSum={curSum} totalTgt={totalTgt}
                missions={ALL_MISSIONS} todayTask={todayTask} journeyObj={journeyObj}
                onSelect={setSelected} onOpenTask={(tid) => { onClose?.(); onOpenTask?.(tid) }} />
            ) : (
              <MissionDetail mission={selMission} todayTask={todayTask} journeyObj={journeyObj}
                allMissions={ALL_MISSIONS} onOpenTask={(tid) => { onClose?.(); onOpenTask?.(tid) }}
                onBack={() => setSelected(null)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub: Chapter overview ─────────────────────────────────────────────────────
function ChapterOverview({ ch1, ch1Pct, curSum, totalTgt, missions, todayTask, journeyObj, onSelect, onOpenTask }) {
  return (
    <div style={{ overflowY:'auto', height:'100%', paddingRight:4 }}>
      <div style={S.sectionLabel}>CHAPTER 1 · TỔNG QUAN</div>

      {/* Chapter 1 meta từ journeys.json */}
      {ch1.description && (
        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:12, lineHeight:1.6 }}>
          {ch1.description?.vi || ch1.description?.en || ''}
        </div>
      )}

      <div style={S.statCard}>
        <div style={S.rowBetween}>
          <span style={S.dim}>Tổng tiến độ Chapter 1</span>
          <span style={{ fontWeight:700, color:'#c4b5fd' }}>{ch1Pct}%</span>
        </div>
        <div style={S.barBg}>
          <div style={{ ...S.barFill, width:`${ch1Pct}%`, background:'linear-gradient(90deg,#8b5cf6,#3b82f6)' }} />
        </div>
        <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{curSum}/{totalTgt} tổng tiến độ các mục tiêu</div>
      </div>

      {/* Objectives từ journeys.json */}
      {ch1.requiredObjectives?.length > 0 && (
        <>
          <div style={{ ...S.sectionLabel, marginTop:12 }}>MỤC TIÊU BẮT BUỘC (journeys.json)</div>
          {ch1.requiredObjectives.map((obj, i) => {
            const jObj = journeyObj(obj.task)
            const objPct = jObj ? Math.min(100, Math.round((jObj.current/jObj.target)*100)) : 0
            return (
              <div key={i} onClick={() => onSelect(M_KEYS[i])}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px',
                  borderRadius:10, marginBottom:4, cursor:'pointer',
                  background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{M_ICONS[i]||'⭐'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{obj.title?.vi||obj.title?.en||obj.task}</div>
                  <div style={{ fontSize:10, color:'#64748b' }}>Target: {obj.target} · Task: {obj.task}</div>
                  {jObj && (
                    <div style={{ height:3, background:'rgba(255,255,255,.07)', borderRadius:99, marginTop:3, overflow:'hidden' }}>
                      <div style={{ height:3, width:`${objPct}%`, background:objPct>=100?'#22c55e':'#8b5cf6', borderRadius:99 }} />
                    </div>
                  )}
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:objPct>=100?'#86efac':'#64748b' }}>
                  {jObj ? `${jObj.current||0}/${jObj.target}` : '—'}
                </span>
              </div>
            )
          })}
        </>
      )}

      {/* Rewards từ journeys.json */}
      {ch1.rewards?.length > 0 && (
        <>
          <div style={{ ...S.sectionLabel, marginTop:12 }}>PHẦN THƯỞNG CHAPTER 1</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {ch1.rewards.map((r,i) => (
              <span key={i} style={S.badgePurple}>{r.icon||'🎁'} {r.label?.vi||r.label?.en||r.type}</span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub: Single mission detail ────────────────────────────────────────────────
function MissionDetail({ mission, todayTask, journeyObj, allMissions, onOpenTask, onBack }) {
  const tState = todayTask(mission.taskId)
  const tPct   = pct(tState)
  const jObj   = journeyObj(mission.taskId)
  const jPct   = jObj ? Math.min(100, Math.round((jObj.current/jObj.target)*100)) : 0

  return (
    <div style={{ overflowY:'auto', height:'100%', paddingRight:4 }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#93c5fd', fontSize:12, cursor:'pointer', padding:0, marginBottom:10 }}>
        ← Quay lại tổng quan
      </button>

      <div style={{ textAlign:'center', marginBottom:16 }}>
        <div style={{ fontSize:9, color:'#64748b', letterSpacing:2 }}>CHAPTER 1 · NHIỆM VỤ {mission.index+1}</div>
        <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:22, fontWeight:900, marginTop:4 }}>
          {mission.title.toUpperCase()}
        </div>
        <div style={{ fontSize:80, margin:'8px 0 4px', lineHeight:1 }}>{mission.icon}</div>
        <div style={{ fontSize:12, color:'#94a3b8' }}>{mission.subtitle}</div>
      </div>

      {/* Journey-level (tổng) */}
      {jObj && (
        <div style={S.statCard}>
          <div style={S.rowBetween}>
            <span style={S.dim}>Tiến độ hành trình (tổng cộng)</span>
            <span style={{ fontWeight:700, color:'#c4b5fd' }}>{jPct}%</span>
          </div>
          <div style={S.barBg}>
            <div style={{ ...S.barFill, width:`${jPct}%`, background:'linear-gradient(90deg,#8b5cf6,#3b82f6)' }} />
          </div>
          <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{jObj.current||0}/{jObj.target} lần tích lũy</div>
        </div>
      )}

      {/* Today */}
      <div style={S.statCard}>
        <div style={S.rowBetween}>
          <span style={S.dim}>Hôm nay</span>
          <span style={{ fontWeight:700, color: tPct>=100?'#86efac':'#93c5fd' }}>{tPct}%</span>
        </div>
        <div style={S.barBg}>
          <div style={{ ...S.barFill, width:`${tPct}%`, background: tPct>=100?'#22c55e':'linear-gradient(90deg,#8b5cf6,#3b82f6)' }} />
        </div>
        <div style={{ fontSize:11, color: tPct>=100?'#86efac':'#64748b', marginTop:4 }}>
          {tState ? `${tState.current}/${tState.target}` : `0/${mission.target}`} · {tPct>=100?'Đã hoàn thành ✓':'Đang thực hiện'}
        </div>
      </div>

      <button style={{ ...S.btnPrimary, marginTop:12 }} onClick={() => onOpenTask(mission.taskId)}>
        MỞ NHIỆM VỤ NÀY
      </button>

      <div style={{ ...S.sectionLabel, marginTop:14 }}>CÁC NHIỆM VỤ KHÁC</div>
      {allMissions.filter(m => m.chapterKey !== mission.chapterKey).map(m => {
        const mState = todayTask(m.taskId)
        const mPct   = pct(mState)
        return (
          <div key={m.chapterKey} onClick={() => onOpenTask(m.taskId)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0',
              borderBottom:'1px solid rgba(255,255,255,.06)', cursor:'pointer' }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{m.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600 }}>{m.title}</div>
              <div style={{ fontSize:10, color:'#64748b' }}>{m.subtitle}</div>
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:mPct>=100?'#86efac':'#64748b' }}>
              {mPct>=100?'✓':mState?`${mPct}%`:'—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position:'fixed', inset:0, zIndex:9000,
    background:'rgba(5,8,18,.88)', backdropFilter:'blur(8px)',
    display:'flex', alignItems:'center', justifyContent:'center',
    padding:'2vh 2vw',
  },
  box: {
    width:'96vw', height:'96vh', maxWidth:1200,
    background:'#0a1220', borderRadius:20,
    border:'1px solid rgba(80,160,255,.2)',
    padding:'20px 20px 16px',
    position:'relative',
    display:'flex', flexDirection:'column',
    overflow:'hidden',
  },
  closeBtn: {
    position:'absolute', top:12, right:12, width:32, height:32,
    borderRadius:'50%', background:'rgba(255,255,255,.08)', border:'none',
    color:'#94a3b8', fontSize:15, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
  },
  title:   { fontFamily:"'Rajdhani',sans-serif", fontSize:20, fontWeight:800, marginBottom:2 },
  subtitle:{ fontSize:12, color:'#64748b', marginBottom:12 },
  cols:    { display:'flex', gap:16, flex:1, overflow:'hidden' },
  colLeft: { width:300, flexShrink:0, overflowY:'auto', paddingRight:8, display:'flex', flexDirection:'column' },
  colRight:{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' },
  sectionLabel: { fontSize:10, fontWeight:700, color:'#93c5fd', letterSpacing:1, marginBottom:6, textTransform:'uppercase' },
  glow: { height:1, background:'linear-gradient(90deg,transparent,rgba(80,160,255,.2),transparent)', margin:'10px 0' },
  statCard: { background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.07)', padding:'10px 12px', marginBottom:8 },
  rowBetween:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  dim: { fontSize:12, color:'#64748b' },
  barBg:   { height:5, background:'rgba(255,255,255,.07)', borderRadius:99, overflow:'hidden' },
  barFill: { height:5, borderRadius:99, transition:'width .3s' },
  badgePurple: { padding:'3px 9px', borderRadius:99, background:'rgba(139,92,246,.2)', color:'#c4b5fd', fontSize:11, fontWeight:700 },
  btnPrimary:  { width:'100%', padding:'11px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#8b5cf6,#3b82f6)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit' },
  btnOutline:  { width:'100%', padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'#94a3b8', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' },
}
