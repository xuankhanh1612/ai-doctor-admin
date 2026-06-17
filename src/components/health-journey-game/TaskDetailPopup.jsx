/**
 * TaskDetailPopup.jsx
 * Popup "Chi tiết Nhiệm Vụ" — webcam là AIVisionWebcam thật, không còn iframe.
 * Layout:
 *   - Mobile/tablet: webcam full width trên cùng, info panel scroll bên dưới
 *   - Desktop ≥ 860px: 2 cột — info 340px trái | webcam flex:1 phải
 *   - Cột info có thể thu/mở (toggle) để nhường chỗ cho webcam
 */

import { useEffect, useRef, useState } from 'react'
import dailyTasksData from './data/daily_tasks.json'
import journeysData   from './data/journeys.json'
import { completeHealthJourneyActivity, XP_TABLE } from './services/healthJourneyStorage.js'
import { dataUrlToFile, saveWaterProofImage, syncBeMeoWater } from './services/waterProofUpload.js'
import { getRecord } from '../../lib/medicalStorage.js'
import AIVisionWebcam from '../webcam/AIVisionWebcam.jsx'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const UNIT_LABEL_MAP = {
  bottle_photo:'lần', minutes:'phút', day:'ngày', pages:'trang',
  times:'lần', entry:'entry', steps:'bước', file:'file',
}

function buildTaskMap(tasks) {
  const map = {}
  tasks.forEach(t => {
    map[t.taskId] = {
      ...t,
      titleVi:   t.title?.vi || t.title?.en || t.taskId,
      titleEn:   t.title?.en || t.taskId,
      unitLabel: UNIT_LABEL_MAP[t.unit] || t.unit || 'lần',
    }
  })
  return map
}

function buildRelatedMissions(journeys) {
  const ch1 = journeys.find(j => j.chapter === 1)
  if (!ch1?.requiredObjectives) return []
  const icons  = ['🌅','🌬','🎯','🚫','📚','💧','🚶','💼']
  const keys   = ['first_step','breath','focus','challenge','breakthrough','flow','stride','work']
  const labels = ['First Step','Breath','Focus','Challenge','Breakthrough','Flow','Stride','Work']
  return ch1.requiredObjectives.map((obj, i) => ({
    chapterKey: keys[i] || `step_${i}`,
    taskId:  obj.task,
    icon:    icons[i] || '⭐',
    title:   `The ${labels[i] || `Step ${i+1}`}`,
    subtitle: obj.title?.vi || obj.title?.en || `Hoàn thành ${obj.target} lần`,
  }))
}

function pct(taskState) {
  if (!taskState?.target) return 0
  return Math.min(100, Math.round((Number(taskState.current || 0) / Number(taskState.target || 1)) * 100))
}

const ALL_TASKS = dailyTasksData.tasks || []
const TASK_MAP  = buildTaskMap(ALL_TASKS)
const RELATED   = buildRelatedMissions(journeysData.journeys || [])

/* ── component ────────────────────────────────────────────────────────────── */
export default function TaskDetailPopup({ taskId, onClose, onOpenJourney, snapshot, user, onViewMedicalRecord }) {
  /* ── active task — user can switch by clicking the list ── */
  const [activeTaskId, setActiveTaskId] = useState(taskId)

  /* reset when parent opens popup for a different taskId */
  useEffect(() => { setActiveTaskId(taskId) }, [taskId])

  const task     = TASK_MAP[activeTaskId] || TASK_MAP[taskId] || TASK_MAP.deep_work || ALL_TASKS[0]
  const todayRec = snapshot?.day?.tasks?.find(t => t.taskId === task?.taskId)
  const progress = pct(todayRec)

  /* save state wired to AIVisionWebcam via postMessage bridge */
  const [saving,          setSaving]          = useState(false)
  const [saveMsg,         setSaveMsg]         = useState('')
  const [lastCaptureKind, setLastCaptureKind] = useState('')

  /* info panel collapsed state (default collapsed on mobile, open on desktop) */
  const [infoOpen, setInfoOpen] = useState(false)

  /* "Xem lại ảnh đã chụp" → pushes a dataUrl into AIVisionWebcam for review */
  const [reviewImageUrl, setReviewImageUrl] = useState(null)
  const [loadingProof,   setLoadingProof]   = useState(false)

  const proofImages = snapshot?.journeyUser?.proofImages || []
  const proof = proofImages.find(
    p => p.activityType === task?.activityType &&
         p.capturedAt?.slice(0,10) === new Date().toISOString().slice(0,10)
  ) || proofImages.find(p => p.activityType === task?.activityType)

  /* postMessage bridge — intercept saves from AIVisionWebcam */
  useEffect(() => {
    const h = async (e) => {
      if (e.origin !== window.location.origin) return

      if (e.data?.type === 'AI_CLINIC_OPEN_UPLOAD_RECORDS') {
        if (onViewMedicalRecord) onViewMedicalRecord()
        else window.dispatchEvent(new CustomEvent('navigate-to-upload'))
        return
      }

      const isWebcam = e.data?.type === 'AI_CLINIC_MEDIAPIPE_WEBCAM_CAPTURE'
      const isImage  = e.data?.type === 'AI_CLINIC_MEDIAPIPE_IMAGE_CAPTURE'
      if ((!isWebcam && !isImage) || !e.data?.dataUrl) return

      const kind = isWebcam ? 'webcam' : 'image'
      setSaving(true); setSaveMsg('')
      try {
        const file = dataUrlToFile(
          e.data.dataUrl,
          e.data.filename || `${task.taskId}_ai_${kind}.jpg`
        )
        const rec = await saveWaterProofImage(file, user, {
          source:        `task-detail-popup-ai-vision-${kind}`,
          notesPrefix:   `Health Journey · ${task.titleVi}`,
          activityType:  task.activityType,
          taskId:        task.taskId,
          xpEarned:      XP_TABLE[task.activityType] || 0,
          waterAmountMl: task.taskId === 'water' ? 150 : 0,
          proofType:     `ai_healthcare_vision_${kind}_overlay`,
        })
        completeHealthJourneyActivity({
          user, activityType: task.activityType, value: 1,
          proofImage: rec.uploadPath, uploadRecord: rec,
          metadata: { source: `task-detail-popup-ai-vision-${kind}`, taskId: task.taskId },
        })
        if (task.taskId === 'water') syncBeMeoWater(150, `TaskDetailPopup AI ${kind}`)
        setLastCaptureKind(kind)
        setSaveMsg(`✅ Đã lưu ảnh ${kind === 'image' ? 'Image' : 'Webcam'} vào Medical Records`)
        e.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVED', kind, uploadPath: rec.uploadPath }, e.origin)
      } catch (err) {
        setSaveMsg(`❌ ${err?.message || 'Lỗi lưu ảnh.'}`)
        e.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVE_FAILED', kind, message: err?.message }, e.origin)
      } finally { setSaving(false) }
    }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [task, user, onViewMedicalRecord])

  const close = () => onClose?.()

  /* called by AIVisionWebcam after it saves a "Chụp ảnh" capture to Upload Records */
  const handleCaptureSaved = async (record) => {
    try {
      completeHealthJourneyActivity({
        user, activityType: task.activityType, value: 1,
        proofImage: record?.uploadPath, uploadRecord: record,
        metadata: { source: 'task-detail-popup-ai-vision-capture', taskId: task.taskId },
      })
      if (task.taskId === 'water') syncBeMeoWater(150, 'TaskDetailPopup AI capture')
      setLastCaptureKind('webcam')
      setSaveMsg('✅ Đã lưu ảnh vào Medical Records · Nhiệm vụ +1')
    } catch (err) {
      setSaveMsg(`❌ ${err?.message || 'Lỗi cập nhật nhiệm vụ.'}`)
    }
  }

  /* "Xem lại ảnh đã chụp" — load today's proof photo into AIVisionWebcam for review */
  const handleViewProof = async () => {
    if (!proof) return
    setLoadingProof(true)
    setSaveMsg('')
    try {
      const record = proof.uploadRecordId ? await getRecord(proof.uploadRecordId, { ownerEmail: user?.email }) : null
      const dataUrl = record?.dataUrl
      if (!dataUrl) {
        setSaveMsg('❌ Không tìm thấy ảnh proof để xem lại.')
        return
      }
      setReviewImageUrl(dataUrl)
    } catch (err) {
      setSaveMsg(`❌ ${err?.message || 'Lỗi tải ảnh proof.'}`)
    } finally {
      setLoadingProof(false)
    }
  }

  if (!task) return null

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div style={S.box}>
        <style>{RESPONSIVE_CSS}</style>

        {/* ── top bar ── */}
        <div style={S.topBar}>
          <div>
            <span style={S.kicker}>HEALTH JOURNEY · CHI TIẾT NHIỆM VỤ</span>
            <div style={S.title}>{task.icon} {task.titleVi}</div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {/* Toggle info panel */}
            <button
              type="button"
              style={S.toggleBtn}
              onClick={() => setInfoOpen(v => !v)}
              title={infoOpen ? 'Ẩn thông tin' : 'Xem thông tin nhiệm vụ'}
            >
              {infoOpen ? '◀ Ẩn info' : '☰ Thông tin'}
            </button>
            <button style={S.closeBtn} onClick={close}>✕</button>
          </div>
        </div>

        {/* save status bar */}
        {(saveMsg || saving) && (
          <div style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            color: saveMsg.startsWith('✅') ? '#86efac' : saveMsg.startsWith('❌') ? '#fca5a5' : '#93c5fd',
            background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {saving ? '⏳ Đang lưu ảnh...' : saveMsg}
          </div>
        )}

        {/* ── main layout ── */}
        <div style={S.body} className="tdp-body">

          {/* ── CAMERA COLUMN — always visible, always max ── */}
          <div style={S.camCol} className="tdp-cam-col">
            <AIVisionWebcam onViewMedicalRecord={onViewMedicalRecord} onCaptureSaved={handleCaptureSaved} reviewImageUrl={reviewImageUrl} onExitReview={() => setReviewImageUrl(null)} />
          </div>

          {/* ── INFO PANEL — collapsible ── */}
          <div
            style={S.infoCol}
            className={`tdp-info-col${infoOpen ? ' tdp-info-open' : ''}`}
          >
            <div style={S.infoScroll}>

              {/* progress */}
              <div style={S.card}>
                <div style={S.cardLabel}>Tiến độ hôm nay</div>
                <div style={S.rowBetween}>
                  <span style={S.dim}>{todayRec ? `${todayRec.current}/${todayRec.target} ${task.unitLabel}` : `0/${task.target} ${task.unitLabel}`}</span>
                  <span style={{ fontWeight:700, color: progress>=100 ? '#86efac' : '#93c5fd' }}>{progress}%</span>
                </div>
                <div style={S.barBg}>
                  <div style={{ ...S.barFill, width:`${progress}%`, background: progress>=100 ? '#22c55e' : 'linear-gradient(90deg,#8b5cf6,#3b82f6)' }} />
                </div>
                <div style={{ ...S.dim, fontSize:11, marginTop:4 }}>
                  Trạng thái: <b style={{ color: progress>=100?'#86efac':'#93c5fd' }}>{progress>=100?'Đã hoàn thành ✓':'Đang thực hiện'}</b>
                </div>
              </div>

              {/* rewards */}
              <div style={S.card}>
                <div style={S.cardLabel}>Phần thưởng</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <span style={S.badgePurple}>+{task.xp} XP</span>
                  <span style={S.badgeBlue}>+5 ENERGY</span>
                  {task.taskId === 'water' && <span style={S.badgeGreen}>Bé Mèo +150ml</span>}
                  {task.requiresProof && <span style={S.badgeOrange}>Cần ảnh proof</span>}
                </div>
              </div>

              {/* proof status */}
              {proof && (
                <div style={S.proofOk}>
                  <div>{lastCaptureKind === 'image' ? '🖼' : '📷'} Đã có ảnh proof hôm nay</div>
                  <button
                    type="button"
                    onClick={handleViewProof}
                    disabled={loadingProof}
                    style={{
                      marginTop: 6, width: '100%', padding: '7px 10px', borderRadius: 8,
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
                      color: '#86efac', fontSize: 11, fontWeight: 800, fontFamily: 'inherit',
                      cursor: loadingProof ? 'default' : 'pointer', opacity: loadingProof ? 0.6 : 1,
                    }}
                  >
                    {loadingProof ? '⏳ Đang tải ảnh...' : '🔍 Xem lại ảnh đã chụp'}
                  </button>
                </div>
              )}

              <div style={S.glow} />

              {/* all tasks */}
              <div style={S.cardLabel}>Tất cả nhiệm vụ hằng ngày</div>
              {ALL_TASKS.map(t => {
                const tRec = snapshot?.day?.tasks?.find(r => r.taskId === t.taskId)
                const tPct = pct(tRec)
                const isMe = t.taskId === task.taskId
                return (
                  <button
                    key={t.taskId}
                    type="button"
                    onClick={() => {
                      setActiveTaskId(t.taskId)
                      setSaveMsg('')
                      setReviewImageUrl(null)
                      setLastCaptureKind('')
                    }}
                    title={`Xem chi tiết: ${t.title?.vi || t.title?.en}`}
                    style={{
                      display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left',
                      padding:'8px 10px', borderRadius:10, marginBottom:4,
                      background: isMe ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.03)',
                      border: `1px solid ${isMe ? 'rgba(139,92,246,.55)' : 'rgba(255,255,255,.06)'}`,
                      cursor:'pointer', fontFamily:'inherit',
                      boxShadow: isMe ? '0 0 0 1px rgba(139,92,246,.25)' : 'none',
                      transition:'background .15s, border-color .15s, box-shadow .15s',
                    }}
                  >
                    <span style={{ fontSize:17, flexShrink:0 }}>{t.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:isMe?700:500, color:isMe?'#c4b5fd':'var(--text,#e8f0f8)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {t.title?.vi || t.title?.en}
                      </div>
                      <div style={{ fontSize:10, color:'#64748b' }}>Target: {t.target} {UNIT_LABEL_MAP[t.unit]||t.unit} · +{t.xp} XP</div>
                      {tRec && (
                        <div style={{ height:3, background:'rgba(255,255,255,.07)', borderRadius:99, marginTop:3, overflow:'hidden' }}>
                          <div style={{ height:3, width:`${tPct}%`, background:tPct>=100?'#22c55e':'#8b5cf6', borderRadius:99 }} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:tPct>=100?'#86efac':'#64748b', flexShrink:0 }}>
                      {tPct>=100?'✓':tRec?`${tPct}%`:'—'}
                    </div>
                  </button>
                )
              })}

              <div style={S.glow} />

              {/* journey chapter 1 */}
              <div style={S.cardLabel}>Liên kết hành trình Chapter 1</div>
              {RELATED.map((m, i) => {
                const mPct = pct(snapshot?.day?.tasks?.find(t => t.taskId === m.taskId))
                return (
                  <div key={m.chapterKey} onClick={() => onOpenJourney?.(m.chapterKey)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0',
                      borderBottom: i<RELATED.length-1?'1px solid rgba(255,255,255,.06)':'none', cursor:'pointer' }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:'rgba(6,182,212,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{m.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600 }}>{m.title}</div>
                      <div style={{ fontSize:10, color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.subtitle}</div>
                    </div>
                    <span style={{ fontSize:11, color:mPct>=100?'#86efac':'#64748b', fontWeight:700 }}>{mPct>=100?'✓':`${mPct}%`}</span>
                  </div>
                )
              })}

              {/* actions */}
              <button
                style={{ ...S.btnPrimary, marginTop:12, background:'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow:'0 10px 24px rgba(34,197,94,.28)' }}
                onClick={() => { close(); onViewMedicalRecord ? onViewMedicalRecord() : window.dispatchEvent(new CustomEvent('navigate-to-upload')) }}
              >
                📷 Xem hình tại Medical Records
              </button>
              <button style={{ ...S.btnPrimary, marginTop:8 }} onClick={close}>ĐÓNG CHI TIẾT</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── responsive CSS ─────────────────────────────────────────────────────────── */
const RESPONSIVE_CSS = `
  /* ── base: mobile-first — camera 100% top, info hidden by default ── */
  .tdp-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  .tdp-cam-col {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .tdp-info-col {
    width: 100%;
    max-height: 0;
    overflow: hidden;
    transition: max-height .3s cubic-bezier(.4,0,.2,1);
    flex-shrink: 0;
  }
  .tdp-info-col.tdp-info-open {
    max-height: 70vh;
    overflow-y: auto;
  }

  /* ── tablet ≥ 600px — info panel gets a bit more room ── */
  @media (min-width: 600px) {
    .tdp-info-col.tdp-info-open {
      max-height: 60vh;
    }
  }

  /* ── desktop ≥ 860px — side-by-side, info auto-open ── */
  @media (min-width: 860px) {
    .tdp-body {
      flex-direction: row;
    }
    .tdp-cam-col {
      flex: 1;
      min-width: 0;
    }
    .tdp-info-col {
      width: 320px;
      flex-shrink: 0;
      max-height: none !important;
      overflow-y: auto;
      /* open by default on desktop regardless of toggle state */
    }
    .tdp-info-col:not(.tdp-info-open) {
      width: 0;
      padding: 0;
      overflow: hidden;
    }
  }

  /* ── large desktop ≥ 1100px — wider info panel ── */
  @media (min-width: 1100px) {
    .tdp-info-col {
      width: 360px;
    }
  }
`

/* ── styles ─────────────────────────────────────────────────────────────────── */
const S = {
  overlay: {
    position:'fixed', inset:0, zIndex:9000,
    background:'rgba(5,8,18,.92)', backdropFilter:'blur(8px)',
    display:'flex', alignItems:'stretch', justifyContent:'center',
  },
  box: {
    width:'100vw', height:'100%', maxWidth:1400,
    background:'#080f1e',
    display:'flex', flexDirection:'column',
    overflow:'hidden',
  },
  topBar: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'10px 14px',
    borderBottom:'1px solid rgba(255,255,255,.06)',
    flexShrink:0, gap:8,
  },
  kicker: { fontSize:9, color:'#475569', fontFamily:'monospace', fontWeight:900, letterSpacing:'0.1em', display:'block', marginBottom:2 },
  title:  { fontSize:16, fontWeight:800, color:'var(--text,#e8f0f8)', lineHeight:1.2 },
  toggleBtn: {
    padding:'6px 12px', borderRadius:8,
    background:'rgba(99,102,241,.15)', border:'1px solid rgba(99,102,241,.35)',
    color:'#a5b4fc', fontSize:11, fontWeight:800, fontFamily:'inherit', cursor:'pointer',
    whiteSpace:'nowrap',
  },
  closeBtn: {
    width:30, height:30, borderRadius:'50%',
    background:'rgba(255,255,255,.08)', border:'none',
    color:'#94a3b8', fontSize:14, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
    flexShrink:0,
  },
  body: { display:'flex', flex:1, overflow:'hidden', minHeight:0 },
  camCol: { flex:1, minWidth:0, minHeight:0, overflow:'hidden', display:'flex', flexDirection:'column' },
  infoCol: { width:320, flexShrink:0, background:'rgba(4,8,20,.7)', borderLeft:'1px solid rgba(255,255,255,.06)', overflowY:'auto' },
  infoScroll: { padding:'10px 12px', display:'flex', flexDirection:'column' },
  card: { background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.07)', padding:'10px 12px', marginBottom:8 },
  cardLabel: { fontSize:10, fontWeight:700, color:'#93c5fd', letterSpacing:.5, marginBottom:6, textTransform:'uppercase' },
  rowBetween: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  dim: { fontSize:12, color:'#64748b' },
  barBg: { height:5, background:'rgba(255,255,255,.07)', borderRadius:99, overflow:'hidden', marginTop:6 },
  barFill: { height:5, borderRadius:99, transition:'width .3s' },
  glow: { height:1, background:'linear-gradient(90deg,transparent,rgba(80,160,255,.2),transparent)', margin:'10px 0' },
  proofOk: { padding:'8px 10px', borderRadius:8, background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)', color:'#86efac', fontSize:11, fontWeight:700, marginBottom:6 },
  badgePurple: { padding:'3px 9px', borderRadius:99, background:'rgba(139,92,246,.2)', color:'#c4b5fd', fontSize:11, fontWeight:700 },
  badgeBlue:   { padding:'3px 9px', borderRadius:99, background:'rgba(59,130,246,.2)', color:'#93c5fd', fontSize:11, fontWeight:700 },
  badgeGreen:  { padding:'3px 9px', borderRadius:99, background:'rgba(34,197,94,.2)', color:'#86efac', fontSize:11, fontWeight:700 },
  badgeOrange: { padding:'3px 9px', borderRadius:99, background:'rgba(245,158,11,.2)', color:'#fcd34d', fontSize:11, fontWeight:700 },
  btnPrimary: { width:'100%', padding:'11px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#8b5cf6,#3b82f6)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginBottom:2 },
}
