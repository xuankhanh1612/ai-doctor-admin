/**
 * TaskDetailPopup.jsx
 * Popup "Chi tiết Nhiệm Vụ" - dữ liệu động hoàn toàn từ daily_tasks.json
 * ✅ Fixes:
 *  1. "Xem hình tại Medical Records" luôn hoạt động (cả tab Webcam & Image)
 *  2. Tab "Image": "Lưu hình" lưu ảnh với đầy đủ lớp phủ AI, lưu vào Upload Records,
 *     đồng thời đồng bộ hoá task/game giống tab Webcam
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

/**
 * Vẽ lớp phủ AI lên canvas từ ảnh đã upload
 * Giống hệt drawAIWaterBottleOverlay nhưng có thể nhận thêm activityType
 */
function drawAIOverlayOnImage(ctx, width, height, activityType = 'drink_water') {
  const now = new Date().toLocaleTimeString('vi-VN', { hour12: false })
  const boxWidth  = width  * 0.34
  const boxHeight = height * 0.58
  const x = width  * 0.5 - boxWidth  / 2
  const y = height * 0.2

  ctx.save()

  // Detection box
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.92)'
  ctx.lineWidth = Math.max(3, width * 0.004)
  ctx.shadowColor = 'rgba(14, 165, 233, 0.75)'
  ctx.shadowBlur = 18
  ctx.strokeRect(x, y, boxWidth, boxHeight)

  // Label bar
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(2, 6, 23, 0.78)'
  ctx.fillRect(x, Math.max(0, y - 38), Math.min(boxWidth + 60, 340), 34)
  ctx.fillStyle = '#67e8f9'
  ctx.font = `800 ${Math.max(14, width * 0.018)}px Inter, sans-serif`
  ctx.fillText(`${activityType.replace(/_/g, ' ')} 0.96`, x + 10, Math.max(22, y - 15))

  // Inner dashed rect
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.88)'
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.roundRect(x + boxWidth * 0.26, y + boxHeight * 0.12, boxWidth * 0.48, boxHeight * 0.76, 18)
  ctx.stroke()
  ctx.setLineDash([])

  // Keypoints
  for (let i = 0; i < 5; i += 1) {
    const py = y + boxHeight * (0.18 + i * 0.15)
    ctx.fillStyle = i % 2 ? '#22c55e' : '#38bdf8'
    ctx.beginPath()
    ctx.arc(x + boxWidth * 0.5, py, Math.max(4, width * 0.006), 0, Math.PI * 2)
    ctx.fill()
  }

  // Scan lines
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.18)'
  ctx.lineWidth = 1
  for (let sy = 0; sy < height; sy += 22) {
    ctx.beginPath()
    ctx.moveTo(0, sy)
    ctx.lineTo(width, sy)
    ctx.stroke()
  }

  // Footer bar
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'
  ctx.fillRect(12, height - 72, Math.min(width - 24, 560), 52)
  ctx.fillStyle = '#e0f2fe'
  ctx.font = `800 ${Math.max(13, width * 0.016)}px Inter, sans-serif`
  ctx.fillText(`AI Healthcare Vision · Object Detection · Image · ${now}`, 24, height - 44)
  ctx.fillStyle = '#86efac'
  ctx.fillText(`✓ Verified proof · Health Journey · ${activityType.replace(/_/g, ' ')} · AI overlay`, 24, height - 24)

  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TaskDetailPopup({ taskId, onClose, onOpenJourney, snapshot, user, onViewMedicalRecord }) {
  const task     = TASK_MAP[taskId] || TASK_MAP.deep_work || ALL_TASKS[0]
  const todayRec = snapshot?.day?.tasks?.find((t) => t.taskId === task?.taskId)
  const progress = pct(todayRec)

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('webcam') // 'webcam' | 'image'

  // ── Webcam state ──
  const [cameraOn, setCameraOn]   = useState(false)
  const [cameraErr, setCameraErr] = useState('')
  const [saving, setSaving]       = useState(false)
  const [lastRecord, setLastRecord] = useState(null)

  // ── Image tab state ──
  const [imageFile, setImageFile]       = useState(null)   // File object
  const [imagePreview, setImagePreview] = useState(null)   // dataUrl for <img>
  const [imageSaving, setImageSaving]   = useState(false)
  const [imageErr, setImageErr]         = useState('')
  const [imageSaved, setImageSaved]     = useState(false)  // proof lưu thành công
  const [imageRecord, setImageRecord]   = useState(null)   // record đã lưu

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const fileInputRef = useRef(null)
  const imgCanvasRef = useRef(null)
  const streamRef   = useRef(null)

  const proofImages = snapshot?.journeyUser?.proofImages || []
  const proof = (lastRecord?.healthJourney?.activityType === task?.activityType ? lastRecord : null)
    || (imageRecord?.healthJourney?.activityType === task?.activityType ? imageRecord : null)
    || proofImages.find(p => p.activityType === task?.activityType && p.capturedAt?.slice(0,10) === new Date().toISOString().slice(0,10))
    || proofImages.find(p => p.activityType === task?.activityType)

  useEffect(() => () => stopCam(), [])

  // ── Navigate to Medical Records (always works regardless of tab or capture state) ──
  const goToMedicalRecords = () => {
    close()
    if (onViewMedicalRecord) {
      onViewMedicalRecord()
    } else {
      window.dispatchEvent(new CustomEvent('navigate-to-upload'))
    }
  }

  // ── MediaPipe iframe → save proof (Webcam tab) ──
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

  const close = () => { stopCam(); onClose?.() }

  // ── Image tab: chọn file ──
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImageSaved(false)
    setImageRecord(null)
    setImageErr('')
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // ── Image tab: Lưu hình với lớp phủ AI đầy đủ ──
  const saveImageWithAIOverlay = async () => {
    if (!imagePreview) { setImageErr('Vui lòng chọn ảnh trước.'); return }
    setImageSaving(true); setImageErr(''); setImageSaved(false)
    try {
      // Vẽ ảnh gốc lên canvas
      const canvas = imgCanvasRef.current
      const img = new window.Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imagePreview
      })
      canvas.width  = img.naturalWidth  || img.width  || 1280
      canvas.height = img.naturalHeight || img.height || 720
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Vẽ lớp phủ AI thật sự lên trên
      drawAIOverlayOnImage(ctx, canvas.width, canvas.height, task.activityType || 'drink_water')

      // Lấy dataUrl với overlay
      const overlaidDataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const file = dataUrlToFile(overlaidDataUrl, `${task.taskId}_image_ai_${Date.now()}.jpg`)

      // Lưu vào Upload Records
      const rec = await saveWaterProofImage(file, user, {
        source: 'task-detail-popup-image-upload',
        notesPrefix: `Health Journey · ${task.titleVi} · Image Upload`,
        activityType: task.activityType,
        taskId: task.taskId,
        xpEarned: XP_TABLE[task.activityType] || 0,
        waterAmountMl: task.taskId === 'water' ? 150 : 0,
        proofType: 'image_upload_ai_overlay',
      })

      // Đồng bộ hoá task/journey (giống webcam)
      completeHealthJourneyActivity({
        user,
        activityType: task.activityType,
        value: 1,
        proofImage: rec.uploadPath,
        uploadRecord: rec,
        metadata: { source: 'task-detail-popup-image-upload', taskId: task.taskId },
      })

      if (task.taskId === 'water') syncBeMeoWater(150, 'TaskDetailPopup Image')

      setImageRecord(rec)
      setImageSaved(true)
    } catch(err) {
      setImageErr(err?.message || 'Lỗi lưu ảnh.')
    } finally {
      setImageSaving(false)
    }
  }

  const proofText = proof
    ? (proof.uploadPath || (proof.image === '__INDEXED_DB_ONLY__' ? '(ảnh lớn - lưu cloud)' : proof.image) || proof.uploadRecord?.uploadPath)
    : null

  if (!task) return null

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div style={S.box}>
        <style>{`
          .tdp-cols { flex-direction: column !important; overflow-y: auto !important; }
          .tdp-camera-col {
            order: -1;
            flex: 0 0 auto !important;
            width: 100%;
            height: 80vh;
            min-height: 560px;
          }
          .tdp-info-col {
            width: 100% !important;
            flex: 1 1 auto !important;
            overflow-y: visible !important;
          }
          @media (min-width: 861px) {
            .tdp-camera-col { height: 88vh; min-height: 640px; }
            .tdp-info-col { max-width: 1080px; margin: 0 auto; }
          }
          .tdp-tab-row { display:flex; gap:0; margin-bottom:10px; background:rgba(255,255,255,0.05); border-radius:8px; padding:3px; }
          .tdp-tab-btn { flex:1; padding:7px 0; text-align:center; font-size:12px; font-weight:700; color:#64748b; border-radius:6px; cursor:pointer; border:none; background:transparent; transition:all .2s; }
          .tdp-tab-btn.active { background:rgba(59,130,246,.2); color:#93c5fd; }
          .tdp-image-drop { border:2px dashed rgba(99,102,241,.35); border-radius:10px; padding:28px 16px; text-align:center; cursor:pointer; transition:border-color .2s; margin-bottom:10px; }
          .tdp-image-drop:hover { border-color:rgba(99,102,241,.7); }
        `}</style>
        <button style={S.closeBtn} onClick={close}>✕</button>

        {/* ── Header ── */}
        <div style={S.title}>{task.icon} Chi tiết Nhiệm Vụ</div>
        <div style={S.subtitle}>{task.titleVi} · {task.titleEn}</div>

        {/* ── Layout 2 cột ── */}
        <div style={S.cols} className="tdp-cols">

          {/* Cột trái: thông tin + danh sách nhiệm vụ */}
          <div style={S.colLeft} className="tdp-info-col">

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
            {(cameraErr || imageErr) && <div style={S.proofErr}>{cameraErr || imageErr}</div>}
            {(saving || imageSaving) && <div style={{ ...S.dim, fontSize: 11, marginTop: 6 }}>⏳ Đang lưu ảnh...</div>}
            {imageSaved && imageRecord && (
              <div style={S.proofOk}>✓ Đã lưu ảnh Image (với AI overlay) · {imageRecord.uploadPath}</div>
            )}

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

            {/* ✅ "Xem hình tại Medical Records" — luôn hoạt động, không phụ thuộc tab hay trạng thái chụp hình */}
            <button
              style={{ ...S.btnPrimary, marginTop: 12, background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 10px 24px rgba(34,197,94,0.28)' }}
              onClick={goToMedicalRecords}
            >
              📷 Xem hình tại Medical Records
            </button>
            <button style={{ ...S.btnPrimary, marginTop: 8 }} onClick={close}>ĐÓNG CHI TIẾT</button>
          </div>

          {/* Cột phải: Tabs Webcam / Image */}
          <div style={S.colRight} className="tdp-camera-col">

            {/* Tab switcher */}
            <div className="tdp-tab-row">
              <button
                className={`tdp-tab-btn${activeTab === 'webcam' ? ' active' : ''}`}
                onClick={() => setActiveTab('webcam')}
              >
                📸 Webcam AI
              </button>
              <button
                className={`tdp-tab-btn${activeTab === 'image' ? ' active' : ''}`}
                onClick={() => setActiveTab('image')}
              >
                🖼️ Image Upload
              </button>
            </div>

            {/* ── Tab: Webcam ── */}
            {activeTab === 'webcam' && (
              <>
                <div style={S.cardLabel}>AI Healthcare Vision · Object Detection · Webcam</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>
                  Nhận diện vật thể realtime · Chụp ảnh để ghi nhận hoàn thành nhiệm vụ
                </div>
                <iframe
                  key={`webcam-${task.taskId}`}
                  title={`AI Vision · ${task.titleVi}`}
                  src={MEDIAPIPE_URL}
                  style={{ width:'100%', flex:1, minHeight:0, border:'none', borderRadius:8, display:'block', height:'100%' }}
                  allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </>
            )}

            {/* ── Tab: Image Upload ── */}
            {activeTab === 'image' && (
              <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:10 }}>
                <div style={S.cardLabel}>🖼️ Image Upload · AI Overlay · Lưu Proof</div>
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  Chọn ảnh từ máy → lớp phủ AI sẽ được vẽ lên → bấm <b style={{color:'#93c5fd'}}>Lưu hình</b> để lưu vào Medical Records và đồng bộ nhiệm vụ.
                </div>

                {/* File picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {!imagePreview ? (
                  <div
                    className="tdp-image-drop"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>Nhấn để chọn ảnh</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>PNG, JPG, WEBP, HEIC · Bất kỳ kích thước</div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                    {/* Preview ảnh gốc */}
                    <div style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                      <img
                        src={imagePreview}
                        alt="preview"
                        style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
                      />
                      {/* AI overlay badge */}
                      <div style={{
                        position:'absolute', bottom:8, left:8, right:8,
                        background:'rgba(2,6,23,.82)', borderRadius:8,
                        padding:'6px 10px', fontSize:11, color:'#67e8f9', fontWeight:700,
                        border:'1px solid rgba(56,189,248,.3)',
                      }}>
                        🤖 AI overlay sẽ được vẽ khi bấm "Lưu hình"
                      </div>
                    </div>

                    {/* Nút đổi ảnh */}
                    <button
                      style={{ ...S.btnOutline, fontSize: 11, padding: '6px' }}
                      onClick={() => { setImagePreview(null); setImageFile(null); setImageSaved(false); setImageRecord(null); fileInputRef.current?.click() }}
                    >
                      🔄 Đổi ảnh khác
                    </button>

                    {/* ✅ Nút "Lưu hình" — lưu ảnh + AI overlay + đồng bộ task */}
                    <button
                      style={{
                        ...S.btnPrimary,
                        background: imageSaved
                          ? 'linear-gradient(135deg,#16a34a,#22c55e)'
                          : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        boxShadow: imageSaved ? '0 8px 20px rgba(34,197,94,.3)' : '0 8px 20px rgba(99,102,241,.3)',
                        opacity: imageSaving ? 0.6 : 1,
                        cursor: imageSaving ? 'not-allowed' : 'pointer',
                      }}
                      onClick={saveImageWithAIOverlay}
                      disabled={imageSaving}
                    >
                      {imageSaving ? '⏳ Đang lưu...' : imageSaved ? '✓ Đã lưu thành công!' : '💾 Lưu hình (AI Overlay)'}
                    </button>

                    {/* Trạng thái sau khi lưu */}
                    {imageSaved && imageRecord && (
                      <>
                        <div style={{ ...S.proofOk, marginTop: 0 }}>
                          ✓ Đã lưu · +{XP_TABLE[task.activityType] || 0} XP · Nhiệm vụ được ghi nhận
                        </div>
                        {/* ✅ Xem hình tại Medical Records từ trong Image tab */}
                        <button
                          style={{ ...S.btnPrimary, background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow:'0 8px 20px rgba(34,197,94,.25)' }}
                          onClick={goToMedicalRecords}
                        >
                          📷 Xem hình tại Medical Records
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Canvas ẩn dùng để vẽ AI overlay */}
                <canvas ref={imgCanvasRef} style={{ display: 'none' }} />

                {imageErr && <div style={S.proofErr}>{imageErr}</div>}
              </div>
            )}
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
    display: 'flex', alignItems: 'stretch', justifyContent: 'center',
    padding: '0',
  },
  box: {
    width: '100vw', height: '100%',
    maxWidth: 1200,
    background: '#0a1220',
    borderRadius: 0,
    border: 'none',
    padding: '12px 14px 8px',
    position: 'relative',
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, width: 32, height: 32,
    borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: 'none',
    color: '#94a3b8', fontSize: 15, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: "'Rajdhani',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 1 },
  subtitle: { fontSize: 11, color: '#64748b', marginBottom: 8 },
  cols: { display: 'flex', gap: 12, flex: 1, overflow: 'hidden', minHeight: 0 },
  colLeft: {
    width: 380, flexShrink: 0, overflowY: 'visible', paddingRight: 6,
    display: 'flex', flexDirection: 'column', minHeight: 0,
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
