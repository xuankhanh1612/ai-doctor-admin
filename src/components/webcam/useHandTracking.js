import { useCallback, useRef, useState } from 'react'
import { MEDIAPIPE_VISION_WASM_URL } from '../../lib/mediapipeWasmPath'

// Hand Landmarker riêng cho tính năng Touchless Control (Medical Visual
// Playground) — TÁCH RIÊNG khỏi useMediaPipeVision.js (Face/Pose/Object) vì
// đây là model nặng nhất trong nhóm Tasks Vision và chỉ Playground mới cần,
// tránh việc các trang khác (đang dùng useMediaPipeVision cho Face/Pose)
// vô tình tải thêm model Hand không dùng tới.
const WASM_URL = MEDIAPIPE_VISION_WASM_URL
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

/**
 * status: 'idle' | 'loading' | 'ready' | 'error'
 * Trả về helper detectVideoFrame(video) -> { landmarks: [[{x,y,z}, ...], ...] } | null
 */
export function useHandTracking() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const visionRef = useRef({ fileset: null, landmarker: null, mode: 'VIDEO', loadingPromise: null })

  const ensureLoaded = useCallback(async () => {
    const v = visionRef.current
    if (v.landmarker) {
      if (status !== 'ready') setStatus('ready')
      return
    }
    if (v.loadingPromise) return v.loadingPromise

    setStatus('loading')
    setError('')

    v.loadingPromise = (async () => {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      if (!v.fileset) v.fileset = await FilesetResolver.forVisionTasks(WASM_URL)
      try {
        v.landmarker = await HandLandmarker.createFromOptions(v.fileset, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        })
      } catch (gpuError) {
        console.warn('HandLandmarker GPU delegate failed, retrying on CPU:', gpuError)
        v.landmarker = await HandLandmarker.createFromOptions(v.fileset, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        })
      }
    })()

    try {
      await v.loadingPromise
      setStatus('ready')
    } catch (err) {
      console.error('Failed to load MediaPipe Hand Landmarker:', err)
      setError(err?.message || String(err))
      setStatus('error')
    } finally {
      v.loadingPromise = null
    }
  }, [status])

  /** Chạy nhận diện trên 1 khung hình <video>. Trả về mảng landmarks đã chuẩn hoá (0..1) của bàn tay đầu tiên, hoặc null. */
  const detectVideoFrame = useCallback((video) => {
    const v = visionRef.current
    if (!v.landmarker || !video || video.readyState < 2) return null
    const result = v.landmarker.detectForVideo(video, performance.now())
    if (!result?.landmarks?.length) return null
    return result.landmarks
  }, [])

  return { status, error, ensureLoaded, detectVideoFrame }
}
