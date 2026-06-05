import React, { useEffect, useMemo, useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'

const VISION_TASKS = [
  {
    id: 'objectDetector',
    icon: '📦',
    label: 'Object Detector',
    route: '/vision/object_detector',
    model: 'EfficientDet Lite0',
    assetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite',
  },
  {
    id: 'faceDetector',
    icon: '🙂',
    label: 'Face Detector',
    route: '/vision/face_detector',
    model: 'BlazeFace short-range',
    assetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
  },
  {
    id: 'handLandmarker',
    icon: '✋',
    label: 'Hand Landmarker',
    route: '/vision/hand_landmarker',
    model: 'Hand Landmarker',
    assetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
  },
  {
    id: 'poseLandmarker',
    icon: '🏃',
    label: 'Pose Landmarker',
    route: '/vision/pose_landmarker',
    model: 'Pose Landmarker Lite',
    assetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
  },
]

const createTask = async (selectedTask, vision) => {
  const { ObjectDetector, FaceDetector, HandLandmarker, PoseLandmarker } = await import('../mediapipe-khanh/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs')
  const baseOptions = { modelAssetPath: selectedTask.assetPath }

  if (selectedTask.id === 'objectDetector') {
    return ObjectDetector.createFromOptions(vision, { baseOptions, scoreThreshold: 0.35, runningMode: 'IMAGE' })
  }
  if (selectedTask.id === 'faceDetector') {
    return FaceDetector.createFromOptions(vision, { baseOptions, runningMode: 'IMAGE' })
  }
  if (selectedTask.id === 'handLandmarker') {
    return HandLandmarker.createFromOptions(vision, { baseOptions, runningMode: 'IMAGE', numHands: 2 })
  }
  return PoseLandmarker.createFromOptions(vision, { baseOptions, runningMode: 'IMAGE', numPoses: 1 })
}

const runTask = (taskId, task, image) => {
  if (taskId === 'objectDetector') return task.detect(image)
  if (taskId === 'faceDetector') return task.detect(image)
  if (taskId === 'handLandmarker') return task.detect(image)
  return task.detect(image)
}

function getBox(detection) {
  const box = detection.boundingBox || detection.categories?.[0]?.boundingBox
  if (!box) return null
  return {
    x: box.originX ?? box.x ?? 0,
    y: box.originY ?? box.y ?? 0,
    width: box.width ?? 0,
    height: box.height ?? 0,
  }
}

function drawResults(canvas, image, taskId, results) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = image.naturalWidth || image.videoWidth || image.width
  canvas.height = image.naturalHeight || image.videoHeight || image.height
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  ctx.lineWidth = Math.max(3, canvas.width / 220)
  ctx.font = `${Math.max(15, canvas.width / 34)}px system-ui`

  if (!results) return

  if (taskId === 'objectDetector' || taskId === 'faceDetector') {
    const detections = results.detections || []
    detections.forEach((detection, index) => {
      const box = getBox(detection)
      if (!box) return
      const category = detection.categories?.[0]
      const label = taskId === 'faceDetector'
        ? `Face ${index + 1}`
        : `${category?.categoryName || 'Object'} ${category?.score ? Math.round(category.score * 100) + '%' : ''}`
      ctx.strokeStyle = taskId === 'faceDetector' ? '#00e5ff' : '#00e676'
      ctx.fillStyle = 'rgba(4, 6, 15, 0.78)'
      ctx.strokeRect(box.x, box.y, box.width, box.height)
      const textWidth = ctx.measureText(label).width + 14
      ctx.fillRect(box.x, Math.max(0, box.y - 30), textWidth, 28)
      ctx.fillStyle = '#fff'
      ctx.fillText(label, box.x + 7, Math.max(18, box.y - 9))
    })
    return
  }

  const landmarkSets = taskId === 'handLandmarker' ? (results.landmarks || []) : (results.landmarks || [])
  ctx.fillStyle = taskId === 'handLandmarker' ? '#9c6fff' : '#ffb74d'
  ctx.strokeStyle = taskId === 'handLandmarker' ? '#9c6fff' : '#ffb74d'
  landmarkSets.forEach((landmarks) => {
    landmarks.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.x * canvas.width, point.y * canvas.height, Math.max(4, canvas.width / 180), 0, Math.PI * 2)
      ctx.fill()
    })
  })
}

function summarizeResults(taskId, results) {
  if (!results) return 'No result yet.'
  if (taskId === 'objectDetector') {
    const detections = results.detections || []
    if (!detections.length) return 'No objects detected.'
    return detections.map((d) => {
      const c = d.categories?.[0]
      return `${c?.categoryName || 'Object'} (${c?.score ? Math.round(c.score * 100) : '?'}%)`
    }).join(' · ')
  }
  if (taskId === 'faceDetector') return `${results.detections?.length || 0} face(s) detected.`
  if (taskId === 'handLandmarker') return `${results.landmarks?.length || 0} hand(s), ${results.handednesses?.flat()?.map(h => h.categoryName).filter(Boolean).join(', ') || 'no handedness'} detected.`
  return `${results.landmarks?.length || 0} pose(s) detected.`
}

export default function AIHealthcareVisionControlPanel({ onNext, onPrev, prevLabel }) {
  const { lang, theme } = useApp()
  const isDark = theme === 'dark'
  const [taskId, setTaskId] = useState(VISION_TASKS[0].id)
  const [status, setStatus] = useState('ready')
  const [summary, setSummary] = useState('Upload an image and run a MediaPipe vision task.')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const taskRef = useRef(null)
  const visionRef = useRef(null)
  const imageRef = useRef(null)
  const canvasRef = useRef(null)

  const selectedTask = useMemo(() => VISION_TASKS.find((task) => task.id === taskId) || VISION_TASKS[0], [taskId])

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    taskRef.current?.close?.()
  }, [imageUrl])

  useEffect(() => {
    taskRef.current?.close?.()
    taskRef.current = null
    setSummary(lang === 'vi' ? 'Chọn ảnh và chạy tác vụ MediaPipe.' : 'Upload an image and run a MediaPipe vision task.')
    setError('')
  }, [taskId, lang])

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))
    setSummary(lang === 'vi' ? `Đã chọn ${file.name}.` : `Selected ${file.name}.`)
    setError('')
  }

  const handleRun = async () => {
    const image = imageRef.current
    if (!image) return
    setStatus('loading')
    setError('')
    try {
      if (!visionRef.current) {
        const { FilesetResolver } = await import('../mediapipe-khanh/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs')
        visionRef.current = await FilesetResolver.forVisionTasks(WASM_BASE)
      }
      if (!taskRef.current) taskRef.current = await createTask(selectedTask, visionRef.current)
      const result = runTask(selectedTask.id, taskRef.current, image)
      drawResults(canvasRef.current, image, selectedTask.id, result)
      setSummary(summarizeResults(selectedTask.id, result))
    } catch (err) {
      setError(err?.message || 'Unable to initialize MediaPipe task.')
    } finally {
      setStatus('ready')
    }
  }

  return (
    <div className="animate-fade" style={{ padding: 24, color: isDark ? '#e8f0f8' : '#1a2035' }}>
      <section style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}`, borderRadius: 24, padding: 22, background: isDark ? 'linear-gradient(135deg, rgba(0,229,255,.10), rgba(156,111,255,.08))' : 'linear-gradient(135deg, #ecfbff, #f4efff)', marginBottom: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: '.16em', color: '#00b8cc', fontWeight: 900 }}>MEDIAPIPE-KHANH INTEGRATION</div>
        <h2 style={{ margin: '8px 0', fontSize: 'clamp(24px, 4vw, 38px)' }}>👁️ AI Healthcare Vision Control</h2>
        <p style={{ margin: 0, maxWidth: 850, lineHeight: 1.7, color: isDark ? 'rgba(232,240,248,.72)' : '#4b5563' }}>
          {lang === 'vi'
            ? 'Menu điều khiển mới tích hợp lõi MediaPipe Tasks Vision từ thư mục src/mediapipe-khanh: chọn detector/landmarker, tải ảnh bệnh nhân hoặc ảnh mẫu và xem kết quả vẽ trực tiếp trên canvas.'
            : 'A new control menu integrating the MediaPipe Tasks Vision core from src/mediapipe-khanh: choose a detector/landmarker, upload a patient image, and view canvas overlays.'}
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 18, alignItems: 'start' }}>
        <aside style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}`, borderRadius: 18, padding: 16, background: isDark ? 'rgba(255,255,255,.035)' : '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10, color: isDark ? 'rgba(232,240,248,.62)' : '#64748b' }}>{lang === 'vi' ? 'Tác vụ Vision' : 'Vision tasks'}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {VISION_TASKS.map((task) => (
              <button key={task.id} type="button" onClick={() => setTaskId(task.id)} style={{ textAlign: 'left', borderRadius: 14, border: `1px solid ${taskId === task.id ? 'rgba(0,229,255,.65)' : (isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb')}`, padding: 12, background: taskId === task.id ? 'rgba(0,229,255,.12)' : 'transparent', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ fontWeight: 900 }}>{task.icon} {task.label}</div>
                <div style={{ fontSize: 11, opacity: .68 }}>{task.route} · {task.model}</div>
              </button>
            ))}
          </div>
          <label style={{ display: 'block', marginTop: 16, border: `1.5px dashed ${isDark ? 'rgba(255,255,255,.22)' : '#cbd5e1'}`, borderRadius: 16, padding: 18, textAlign: 'center', cursor: 'pointer', background: isDark ? 'rgba(0,0,0,.16)' : '#f8fafc' }}>
            <div style={{ fontSize: 30 }}>📤</div>
            <div style={{ fontWeight: 900 }}>{lang === 'vi' ? 'Tải ảnh để phân tích' : 'Upload image'}</div>
            <div style={{ fontSize: 12, opacity: .65 }}>JPG · PNG · WEBP</div>
            <input hidden type="file" accept="image/*" onChange={handleFile} />
          </label>
          <button type="button" onClick={handleRun} disabled={!imageUrl || status === 'loading'} style={{ width: '100%', marginTop: 12, padding: '12px 14px', borderRadius: 12, border: 'none', background: !imageUrl || status === 'loading' ? '#64748b' : 'linear-gradient(135deg, #00b8cc, #9c6fff)', color: '#fff', fontWeight: 900, cursor: !imageUrl || status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {status === 'loading' ? '⏳ Loading MediaPipe...' : (lang === 'vi' ? '▶️ Chạy phân tích' : '▶️ Run analysis')}
          </button>
        </aside>

        <section style={{ minHeight: 460, border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}`, borderRadius: 18, padding: 16, background: isDark ? 'rgba(255,255,255,.035)' : '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: .62, fontWeight: 800 }}>{selectedTask.label}</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{summary}</div>
            </div>
            <code style={{ fontSize: 11, padding: '6px 8px', borderRadius: 8, background: isDark ? 'rgba(0,0,0,.25)' : '#eef2ff', height: 'fit-content' }}>{selectedTask.route}</code>
          </div>
          {error && <div style={{ color: '#ff8a65', marginBottom: 12, fontSize: 13 }}>⚠️ {error}</div>}
          <div style={{ position: 'relative', width: '100%', minHeight: 360, borderRadius: 16, overflow: 'hidden', display: 'grid', placeItems: 'center', background: isDark ? 'rgba(0,0,0,.28)' : '#f1f5f9' }}>
            {!imageUrl && <div style={{ textAlign: 'center', opacity: .58, padding: 24 }}>🖼️ {lang === 'vi' ? 'Chưa có ảnh. Hãy tải ảnh để bắt đầu.' : 'No image yet. Upload an image to begin.'}</div>}
            {imageUrl && <img ref={imageRef} src={imageUrl} alt="Vision task input" onLoad={() => canvasRef.current && drawResults(canvasRef.current, imageRef.current, selectedTask.id, null)} style={{ display: 'none' }} />}
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: imageUrl ? 'block' : 'none' }} />
          </div>
        </section>
      </div>

      <NavButtons onNext={onNext} nextLabel={lang === 'vi' ? 'AI inbody Portal →' : 'AI inbody Portal →'} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
