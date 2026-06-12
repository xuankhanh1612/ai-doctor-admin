/**
 * TaskDetailPopup.jsx
 * Popup "Chi tiết Nhiệm Vụ" - dữ liệu động từ daily_tasks.json
 *
 * Props:
 *   taskId        {string}   – taskId đang được chọn (e.g. 'water', 'deep_work')
 *   onClose       {fn}       – đóng popup
 *   onOpenJourney {fn}       – mở JourneyDetailPopup với chapterKey
 *   snapshot      {object}   – getTaskSnapshot() result
 *   user          {object}   – auth user
 */

import { useEffect, useRef, useState } from 'react'
import dailyTasksData from './data/daily_tasks.json'
import journeysData from './data/journeys.json'
import { completeHealthJourneyActivity, XP_TABLE } from './services/healthJourneyStorage.js'
import { dataUrlToFile, saveWaterProofImage, syncBeMeoWater } from './services/waterProofUpload.js'

// ─── Constants ───────────────────────────────────────────────────────────────
const MEDIAPIPE_URL = '/src/mediapipe-khanh/index.html?mode=webcam#/vision/object_detector'

const UNIT_LABEL_MAP = {
  bottle_photo: 'lần', minutes: 'phút', day: 'ngày', pages: 'trang',
  times: 'lần', entry: 'entry', steps: 'bước', file: 'file',
}

// Build task map from daily_tasks.json
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

// Build journey chapter sub-missions from journeys.json chapter 1
function buildChapterMissions(journeys) {
  const chapter1 = journeys.find((j) => j.chapter === 1)
  if (!chapter1?.requiredObjectives) return []
  const icons = ['🌅', '🌬', '🎯', '🚫', '📚', '💧', '🚶', '💼']
  const keys =  ['first_step', 'breath', 'focus', 'challenge', 'breakthrough', 'flow', 'stride', 'work']
  const stepLabels = ['First Step', 'Breath', 'Focus', 'Challenge', 'Breakthrough', 'Flow', 'Stride', 'Work']
  return chapter1.requiredObjectives.map((obj, i) => ({
    chapterKey: keys[i] || `step_${i}`,
    taskId: obj.task,
    icon: icons[i] || '⭐',
    title: `The ${stepLabels[i] || `Step ${i + 1}`}`,
    subtitle: obj.title?.vi || obj.title?.en || `Hoàn thành ${obj.target} lần`,
    target: obj.target,
  }))
}

const TASK_MAP = buildTaskMap(dailyTasksData.tasks || [])
const CHAPTER_MISSIONS = buildChapterMissions(journeysData.journeys || [])

function taskPercent(taskState) {
  if (!taskState?.target) return 0
  return Math.min(100, Math.round((Number(taskState.current || 0) / Number(taskState.target || 1)) * 100))
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TaskDetailPopup({ taskId, onClose, onOpenJourney, snapshot, user }) {
  const task = TASK_MAP[taskId] || TASK_MAP.deep_work
  const todayTask = snapshot?.day?.tasks?.find((t) => t.taskId === taskId)
  const pct = taskPercent(todayTask)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastRecord, setLastRecord] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // proof image: prefer latest record, then today's proof, then any proof
  const proofImages = snapshot?.journeyUser?.proofImages || []
  const selectedProof = (lastRecord?.healthJourney?.activityType === task.activityType ? lastRecord : null)
    || proofImages.find((p) => p.activityType === task.activityType && p.capturedAt?.slice(0, 10) === new Date().toISOString().slice(0, 10))
    || proofImages.find((p) => p.activityType === task.activityType)

  // Stop camera on unmount
  useEffect(() => () => stopCamera(), [])

  // MediaPipe iframe capture message
  useEffect(() => {
    const handler = async (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'AI_CLINIC_MEDIAPIPE_WEBCAM_CAPTURE') return
      if (!event.data?.dataUrl) return
      setSaving(true)
      setCameraError('')
      try {
        const xpEarned = XP_TABLE[task.activityType] || 0
        const file = dataUrlToFile(event.data.dataUrl, event.data.filename || `${taskId}_ai_webcam.jpg`)
        const record = await saveWaterProofImage(file, user, {
          source: 'task-detail-popup-ai-healthcare-vision',
          notesPrefix: `Health Journey Game · Chi tiết Nhiệm Vụ · ${task.titleVi}`,
          activityType: task.activityType,
          taskId,
          xpEarned,
          waterAmountMl: taskId === 'water' ? 150 : 0,
          proofType: 'ai_healthcare_vision_object_detection_webcam_overlay',
        })
        completeHealthJourneyActivity({
          user, activityType: task.activityType, value: 1,
          proofImage: record.uploadPath, uploadRecord: record,
          metadata: { source: 'task-detail-popup-ai-healthcare-vision', taskId },
        })
        if (taskId === 'water') syncBeMeoWater(150, 'Task Detail Popup · AI Vision proof')
        setLastRecord(record)
        event.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVED', uploadPath: record.uploadPath }, event.origin)
      } catch (err) {
        setCameraError(err?.message || 'Không thể lưu ảnh AI proof.')
        event.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVE_FAILED', message: err?.message }, event.origin)
      } finally {
        setSaving(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [taskId, user, task])

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch (err) {
      setCameraError(err?.message || 'Không thể mở Webcam.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks?.().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  const captureProof = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setSaving(true)
    setCameraError('')
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const file = dataUrlToFile(dataUrl, `${taskId}_proof.jpg`)
      const record = await saveWaterProofImage(file, user, {
        source: 'task-detail-popup-webcam',
        notesPrefix: `Health Journey Game · ${task.titleVi}`,
      })
      completeHealthJourneyActivity({
        user, activityType: task.activityType, value: 1,
        proofImage: record.uploadPath, uploadRecord: record,
        metadata: { source: 'task-detail-popup-webcam', taskId },
      })
      if (taskId === 'water') syncBeMeoWater(150, 'Task Detail Popup · Webcam proof')
      setLastRecord(record)
      stopCamera()
    } catch (err) {
      setCameraError(err?.message || 'Không thể lưu ảnh.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose?.()
  }

  const proofDisplay = selectedProof
    ? (selectedProof.uploadPath
        || (selectedProof.image === '__INDEXED_DB_ONLY__' ? '(ảnh lớn - lưu cloud)' : selectedProof.image)
        || selectedProof.uploadRecord?.uploadPath)
    : null

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={box}>
        {/* Header */}
        <button style={closeBtn} onClick={handleClose}>✕</button>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '18px', fontWeight: 700, marginBottom: 4 }}>
          {task.icon} Chi tiết Nhiệm Vụ
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
          {task.titleVi} · {task.titleEn}
        </div>

        {/* Progress */}
        <div style={rewardRow}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Tracking hôm nay</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            {todayTask ? `${todayTask.current}/${todayTask.target} ${task.unitLabel}` : `0/${task.target} ${task.unitLabel}`} · {pct}%
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.07)', borderRadius: 99, margin: '8px 0 12px', overflow: 'hidden' }}>
          <div style={{ height: 6, width: `${pct}%`, borderRadius: 99, background: pct >= 100 ? 'var(--green)' : 'linear-gradient(90deg,var(--purple),var(--blue))' }} />
        </div>
        <div style={rewardRow}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Trạng thái</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--blue-glow)' }}>
            {pct >= 100 ? 'Đã hoàn thành' : 'Đang thực hiện'}
          </span>
        </div>

        <div style={glowLine} />

        {/* Rewards */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-glow)', marginBottom: 6 }}>Phần thưởng</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={badgePurple}>+{task.xp} XP</span>
          <span style={badgeBlue}>+5 ENERGY</span>
          {taskId === 'water' && <span style={badgeGreen}>Bé Mèo +150ml</span>}
        </div>

        {/* AI Camera Section */}
        <div style={proofCard}>
          <div style={aiNote}>
            <b>AI Healthcare Vision Control · Object Detection · Webcam</b><br />
            Bấm <b>Mở camera</b>, xem lớp phủ nhận diện realtime, rồi bấm <b>Lưu Hình</b> để cộng hoàn thành nhiệm vụ.
          </div>

          {/* Water task: native webcam */}
          {taskId === 'water' && (
            <div style={{ marginTop: 10 }}>
              {!cameraOn ? (
                <button style={btnPrimary} onClick={startCamera}>📷 Mở Camera</button>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button style={btnPrimary} onClick={captureProof} disabled={saving}>
                      {saving ? 'Đang lưu...' : '📸 Chụp & Lưu'}
                    </button>
                    <button style={btnOutline} onClick={stopCamera}>Tắt</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* All tasks: AI MediaPipe iframe */}
          <iframe
            key={taskId}
            title={`AI Healthcare Vision · ${task.titleVi}`}
            src={MEDIAPIPE_URL}
            style={{ width: '100%', height: 260, border: 'none', borderRadius: 12, marginTop: 10, display: 'block' }}
            allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* Proof status */}
        {proofDisplay && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: '1px solid rgba(34,197,94,.28)', background: 'rgba(34,197,94,.10)', color: '#bbf7d0', fontSize: 12, fontWeight: 700 }}>
            ✓ Đã có ảnh proof AI · {pct}% hoàn thành · {proofDisplay}
          </div>
        )}
        {cameraError && (
          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,.15)', color: '#fca5a5', fontSize: 12 }}>
            {cameraError}
          </div>
        )}

        <div style={glowLine} />

        {/* Related journey missions */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Nhiệm vụ liên quan trong hành trình</div>
        {CHAPTER_MISSIONS.map((m, i) => {
          const mTask = snapshot?.day?.tasks?.find((t) => t.taskId === m.taskId)
          const mPct = taskPercent(mTask)
          return (
            <div
              key={m.chapterKey}
              onClick={() => onOpenJourney?.(m.chapterKey)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                borderBottom: i < CHAPTER_MISSIONS.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(6,182,212,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                {m.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.subtitle}</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${mPct >= 100 ? 'var(--green)' : 'rgba(255,255,255,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: mPct >= 100 ? 'var(--green)' : 'var(--text-dim)', flexShrink: 0 }}>
                {mPct >= 100 ? '✓' : '›'}
              </div>
            </div>
          )
        })}

        <button style={{ ...btnPrimary, marginTop: 14 }} onClick={handleClose}>ĐÓNG CHI TIẾT</button>
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const overlay = {
  position: 'fixed', inset: 0, zIndex: 9000,
  background: 'rgba(5,8,18,.85)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  padding: '0 0 0 0',
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
const rewardRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const glowLine = { height: 1, background: 'linear-gradient(90deg,transparent,rgba(80,160,255,.25),transparent)', margin: '14px 0' }
const proofCard = { background: 'rgba(255,255,255,.03)', borderRadius: 12, border: '1px solid rgba(80,160,255,.15)', padding: 12 }
const aiNote = { fontSize: 11, color: 'rgba(232,240,248,.7)', lineHeight: 1.5 }
const badgePurple = { padding: '3px 10px', borderRadius: 99, background: 'rgba(139,92,246,.2)', color: '#c4b5fd', fontSize: 11, fontWeight: 700 }
const badgeBlue   = { padding: '3px 10px', borderRadius: 99, background: 'rgba(59,130,246,.2)', color: '#93c5fd', fontSize: 11, fontWeight: 700 }
const badgeGreen  = { padding: '3px 10px', borderRadius: 99, background: 'rgba(34,197,94,.2)', color: '#86efac', fontSize: 11, fontWeight: 700 }
const btnPrimary  = { width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--purple,#8b5cf6),var(--blue,#3b82f6))', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const btnOutline  = { flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'var(--text-dim, #94a3b8)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }
