/**
 * TaskDetailPopup.jsx
 * Popup "Chi tiết Nhiệm Vụ" - dữ liệu động hoàn toàn từ daily_tasks.json
 */

import { useEffect, useRef, useState } from 'react'
import dailyTasksData from './data/daily_tasks.json'
import journeysData from './data/journeys.json'
import { completeHealthJourneyActivity, XP_TABLE } from './services/healthJourneyStorage.js'
import { dataUrlToFile, saveWaterProofImage, syncBeMeoWater } from './services/waterProofUpload.js'

const MEDIAPIPE_URL = '/src/mediapipe-khanh/index.html?mode=webcam#/vision/object_detector'

const UNIT_LABEL_MAP = {
  bottle_photo: 'lần', minutes: 'phút', day: 'ngày', pages: 'trang',
  times: 'lần', entry: 'entry', steps: 'bước', file: 'file',
}

// ── Build TASK_MAP từ daily_tasks.json ────────────────────────────────────────
function buildTaskMap(tasks) {
  const map = {}
  tasks.forEach((t) => {
    map[t.taskId] = {
      ...t,
      titleVi: t.title?.vi || t.title?.en || t.taskId,
      titleEn: t.title?.en || t.taskId,
      unitLabel: UNIT_LABEL_MAP[t.unit] || t.unit || 'lần',
    }
  })
  return map
}

// ── Build danh sách nhiệm vụ liên quan từ journeys.json chapter 1 ─────────────
function buildRelatedMissions(journeys) {
  const ch1 = journeys.find((j) => j.chapter === 1)
  if (!ch1?.requiredObjectives) return []
  const icons  = ['🌅','🌬','🎯','🚫','📚','💧','🚶','💼']
  const keys   = ['first_step','breath','focus','challenge','breakthrough','flow','stride','work']
  const labels = ['First Step','Breath','Focus','Challenge','Breakthrough','Flow','Stride','Work']
  return ch1.requiredObjectives.map((obj, i) => ({
    chapterKey: keys[i] || `step_${i}`,
    taskId: obj.task,
    icon: icons[i] || '⭐',
    title: `The ${labels[i] || `Step ${i+1}`}`,
    subtitle: obj.title?.vi || obj.title?.en || `Hoàn thành ${obj.target} lần`,
  }))
}

const ALL_TASKS   = dailyTasksData.tasks || []
const TASK_MAP    = buildTaskMap(ALL_TASKS)
const RELATED     = buildRelatedMissions(journeysData.journeys || [])

function pct(taskState) {
  if (!taskState?.target) return 0
  return Math.min(100, Math.round((Number(taskState.current || 0) / Number(taskState.target || 1)) * 100))
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TaskDetailPopup({ taskId, onClose, onOpenJourney, snapshot, user }) {
  const task     = TASK_MAP[taskId] || TASK_MAP.deep_work || ALL_TASKS[0]
  const todayRec = snapshot?.day?.tasks?.find((t) => t.taskId === task?.taskId)
  const progress = pct(todayRec)

  const [cameraOn, setCameraOn]   = useState(false)
  const [cameraErr, setCameraErr] = useState('')
  const [saving, setSaving]       = useState(false)
  const [lastRecord, setLastRecord] = useState(null)

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const proofImages = snapshot?.journeyUser?.proofImages || []
  const proof = (lastRecord?.healthJourney?.activityType === task?.activityType ? lastRecord : null)
    || proofImages.find(p => p.activityType === task?.activityType && p.capturedAt?.slice(0,10) === new Date().toISOString().slice(0,10))
    || proofImages.find(p => p.activityType === task?.activityType)

  useEffect(() => () => stopCam(), [])

  // MediaPipe iframe → save proof
  useEffect(() => {
    const h = async (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'AI_CLINIC_MEDIAPIPE_WEBCAM_CAPTURE' || !e.data?.dataUrl) return
      setSaving(true); setCameraErr('')
      try {
        const file = dataUrlToFile(e.data.dataUrl, e.data.filename || `${task.taskId}_ai.jpg`)
        const rec  = await saveWaterProofImage(file, user, {
          source: 'task-detail-popup-ai-vision',
          notesPrefix: `Health Journey · ${task.titleVi}`,
          activityType: task.activityType, taskId: task.taskId,
          xpEarned: XP_TABLE[task.activityType] || 0,
          waterAmountMl: task.taskId === 'water' ? 150 : 0,
        })
        completeHealthJourneyActivity({ user, activityType: task.activityType, value: 1,
          proofImage: rec.uploadPath, uploadRecord: rec,
          metadata: { source: 'task-detail-popup-ai-vision', taskId: task.taskId } })
        if (task.taskId === 'water') syncBeMeoWater(150, 'TaskDetailPopup AI')
        setLastRecord(rec)
        e.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVED', uploadPath: rec.uploadPath }, e.origin)
      } catch(err) {
        setCameraErr(err?.message || 'Lỗi lưu ảnh.')
        e.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVE_FAILED', message: err?.message }, e.origin)
      } finally { setSaving(false) }
    }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [task, user])

  const startCam = async () => {
    setCameraErr('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = s
      if (videoRef.current) videoRef.current.srcObject = s
      setCameraOn(true)
    } catch(e) { setCameraErr(e?.message || 'Không mở được camera.') }
  }

  const stopCam = () => {
    streamRef.current?.getTracks?.().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setSaving(true); setCameraErr('')
    try {
      const v = videoRef.current, c = canvasRef.current
      c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
      const file = dataUrlToFile(c.toDataURL('image/jpeg', 0.92), `${task.taskId}_proof.jpg`)
      const rec  = await saveWaterProofImage(file, user, {
        source: 'task-detail-popup-webcam',
        notesPrefix: `Health Journey · ${task.titleVi}`,
      })
      completeHealthJourneyActivity({ user, activityType: task.activityType, value: 1,
        proofImage: rec.uploadPath, uploadRecord: rec,
        metadata: { source: 'task-detail-popup-webcam', taskId: task.taskId } })
      if (task.taskId === 'water') syncBeMeoWater(150, 'TaskDetailPopup webcam')
      setLastRecord(rec); stopCam()
    } catch(e) { setCameraErr(e?.message || 'Lỗi lưu ảnh.') } finally { setSaving(false) }
  }

  const close = () => { stopCam(); onClose?.() }

  const proofText = proof
    ? (proof.uploadPath || (proof.image === '__INDEXED_DB_ONLY__' ? '(ảnh lớn - lưu cloud)' : proof.image) || proof.uploadRecord?.uploadPath)
    : null

  if (!task) return null

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div style={S.box}>
        <button style={S.closeBtn} onClick={close}>✕</button>

        {/* ── Header ── */}
        <div style={S.title}>{task.icon} Chi tiết Nhiệm Vụ</div>
        <div style={S.subtitle}>{task.titleVi} · {task.titleEn}</div>

        {/* ── Layout 2 cột ── */}
        <div style={S.cols}>

          {/* Cột trái: thông tin + danh sách tất cả nhiệm vụ từ daily_tasks.json */}
          <div style={S.colLeft}>

            {/* Progress hôm nay */}
            <div style={S.card}>
              <div style={S.cardLabel}>Tiến độ hôm nay</div>
              <div style={S.rowBetween}>
                <span style={S.dim}>{todayRec ? `${todayRec.current}/${todayRec.target} ${task.unitLabel}` : `0/${task.target} ${task.unitLabel}`}</span>
                <span style={{ fontWeight: 700, color: progress >= 100 ? '#86efac' : '#93c5fd' }}>{progress}%</span>
              </div>
              <div style={S.barBg}>
                <div style={{ ...S.barFill, width: `${progress}%`, background: progress >= 100 ? '#22c55e' : 'linear-gradient(90deg,#8b5cf6,#3b82f6)' }} />
              </div>
              <div style={{ ...S.dim, fontSize: 11, marginTop: 4 }}>
                Trạng thái: <b style={{ color: progress >= 100 ? '#86efac' : '#93c5fd' }}>{progress >= 100 ? 'Đã hoàn thành ✓' : 'Đang thực hiện'}</b>
              </div>
            </div>

            {/* Phần thưởng */}
            <div style={S.card}>
              <div style={S.cardLabel}>Phần thưởng</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={S.badgePurple}>+{task.xp} XP</span>
                <span style={S.badgeBlue}>+5 ENERGY</span>
                {task.taskId === 'water' && <span style={S.badgeGreen}>Bé Mèo +150ml</span>}
                {task.requiresProof && <span style={S.badgeOrange}>Cần ảnh proof</span>}
              </div>
            </div>

            {/* Proof status */}
            {proofText && (
              <div style={S.proofOk}>✓ Đã có ảnh proof · {proofText}</div>
            )}
            {cameraErr && <div style={S.proofErr}>{cameraErr}</div>}
            {saving && <div style={{ ...S.dim, fontSize: 11, marginTop: 6 }}>⏳ Đang lưu ảnh...</div>}

            <div style={S.glow} />

            {/* ── Tất cả nhiệm vụ từ daily_tasks.json ── */}
            <div style={S.cardLabel}>Tất cả nhiệm vụ hằng ngày</div>
            {ALL_TASKS.map((t) => {
              const tRec  = snapshot?.day?.tasks?.find(r => r.taskId === t.taskId)
              const tPct  = pct(tRec)
              const isMe  = t.taskId === task.taskId
              return (
                <div
                  key={t.taskId}
                  onClick={() => onOpenJourney ? undefined : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 10, marginBottom: 4,
                    background: isMe ? 'rgba(139,92,246,.15)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${isMe ? 'rgba(139,92,246,.4)' : 'rgba(255,255,255,.06)'}`,
                    cursor: 'default',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isMe ? 700 : 500, color: isMe ? '#c4b5fd' : 'var(--text,#e8f0f8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title?.vi || t.title?.en}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>
                      Target: {t.target} {UNIT_LABEL_MAP[t.unit] || t.unit} · +{t.xp} XP
                    </div>
                    {tRec && (
                      <div style={{ height: 3, background: 'rgba(255,255,255,.07)', borderRadius: 99, marginTop: 3, overflow: 'hidden' }}>
                        <div style={{ height: 3, width: `${tPct}%`, background: tPct >= 100 ? '#22c55e' : '#8b5cf6', borderRadius: 99 }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tPct >= 100 ? '#86efac' : '#64748b', flexShrink: 0 }}>
                    {tPct >= 100 ? '✓' : tRec ? `${tPct}%` : '—'}
                  </div>
                </div>
              )
            })}

            <div style={S.glow} />

            {/* Nhiệm vụ liên quan trong hành trình */}
            <div style={S.cardLabel}>Liên kết hành trình Chapter 1</div>
            {RELATED.map((m, i) => {
              const mRec = snapshot?.day?.tasks?.find(t => t.taskId === m.taskId)
              const mPct = pct(mRec)
              return (
                <div key={m.chapterKey} onClick={() => onOpenJourney?.(m.chapterKey)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0',
                    borderBottom: i < RELATED.length-1 ? '1px solid rgba(255,255,255,.06)' : 'none', cursor:'pointer' }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:'rgba(6,182,212,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{m.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600 }}>{m.title}</div>
                    <div style={{ fontSize:10, color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.subtitle}</div>
                  </div>
                  <span style={{ fontSize:11, color: mPct>=100?'#86efac':'#64748b', fontWeight:700 }}>{mPct>=100?'✓':`${mPct}%`}</span>
                </div>
              )
            })}

            <button style={{ ...S.btnPrimary, marginTop: 14 }} onClick={close}>ĐÓNG CHI TIẾT</button>
          </div>

          {/* Cột phải: AI Camera full height */}
          <div style={S.colRight}>
            <div style={S.cardLabel}>AI Healthcare Vision · Object Detection · Webcam</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>
              Nhận diện vật thể realtime · Chụp ảnh để ghi nhận hoàn thành nhiệm vụ
            </div>

            {/* Native webcam (water task) */}
            {task.taskId === 'water' && (
              <div style={{ marginBottom: 10 }}>
                {!cameraOn
                  ? <button style={S.btnPrimary} onClick={startCam}>📷 Mở Camera Native</button>
                  : <>
                      <video ref={videoRef} autoPlay playsInline muted
                        style={{ width:'100%', borderRadius:10, maxHeight:260, objectFit:'cover', display:'block' }} />
                      <canvas ref={canvasRef} style={{ display:'none' }} />
                      <div style={{ display:'flex', gap:8, marginTop:8 }}>
                        <button style={S.btnPrimary} onClick={capture} disabled={saving}>
                          {saving ? '⏳ Đang lưu...' : '📸 Chụp & Lưu'}
                        </button>
                        <button style={S.btnOutline} onClick={stopCam}>Tắt</button>
                      </div>
                    </>
                }
              </div>
            )}

            {/* MediaPipe AI iframe - chiếm phần lớn cột phải */}
            <iframe
              key={task.taskId}
              title={`AI Vision · ${task.titleVi}`}
              src={MEDIAPIPE_URL}
              style={{ width:'100%', flex:1, minHeight:420, border:'none', borderRadius:12, display:'block' }}
              allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(5,8,18,.88)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '2vh 2vw',
  },
  box: {
    width: '90vw', height: '90vh',
    maxWidth: 1100,
    background: '#0a1220',
    borderRadius: 20,
    border: '1px solid rgba(80,160,255,.2)',
    padding: '20px 20px 16px',
    position: 'relative',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, width: 32, height: 32,
    borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: 'none',
    color: '#94a3b8', fontSize: 15, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: "'Rajdhani',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  cols: { display: 'flex', gap: 16, flex: 1, overflow: 'hidden' },
  colLeft: {
    width: 300, flexShrink: 0, overflowY: 'auto', paddingRight: 8,
    display: 'flex', flexDirection: 'column',
  },
  colRight: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  card: { background: 'rgba(255,255,255,.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)', padding: '10px 12px', marginBottom: 8 },
  cardLabel: { fontSize: 11, fontWeight: 700, color: '#93c5fd', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dim: { fontSize: 12, color: '#64748b' },
  barBg: { height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 5, borderRadius: 99, transition: 'width .3s' },
  glow: { height: 1, background: 'linear-gradient(90deg,transparent,rgba(80,160,255,.2),transparent)', margin: '10px 0' },
  proofOk: { padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', color: '#86efac', fontSize: 11, fontWeight: 700, marginBottom: 6 },
  proofErr: { padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,.12)', color: '#fca5a5', fontSize: 11, marginBottom: 6 },
  badgePurple: { padding: '3px 9px', borderRadius: 99, background: 'rgba(139,92,246,.2)', color: '#c4b5fd', fontSize: 11, fontWeight: 700 },
  badgeBlue:   { padding: '3px 9px', borderRadius: 99, background: 'rgba(59,130,246,.2)', color: '#93c5fd', fontSize: 11, fontWeight: 700 },
  badgeGreen:  { padding: '3px 9px', borderRadius: 99, background: 'rgba(34,197,94,.2)', color: '#86efac', fontSize: 11, fontWeight: 700 },
  badgeOrange: { padding: '3px 9px', borderRadius: 99, background: 'rgba(245,158,11,.2)', color: '#fcd34d', fontSize: 11, fontWeight: 700 },
  btnPrimary: { width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  btnOutline: { flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
}
