import { useCallback, useRef, useState } from 'react'

// Loaded on demand from CDN at runtime (browser fetches these, no bundling needed).
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const POSE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

/**
 * Lazily loads MediaPipe Tasks Vision (FaceLandmarker + PoseLandmarker) and exposes
 * helpers to run detection on a live <video> element or a static <img> element.
 *
 * status: 'idle' | 'loading' | 'ready' | 'error'
 */
export function useMediaPipeVision() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const visionRef = useRef({
    fileset: null,
    face: null,
    pose: null,
    faceMode: 'VIDEO',
    poseMode: 'VIDEO',
    FaceLandmarker: null,
    PoseLandmarker: null,
    DrawingUtils: null,
    loadingPromise: null,
  })

  const createLandmarker = useCallback(async (Klass, fileset, modelAssetPath, extraOptions) => {
    try {
      return await Klass.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate: 'GPU' },
        ...extraOptions,
      })
    } catch (gpuError) {
      console.warn('MediaPipe GPU delegate failed, retrying on CPU:', gpuError)
      return await Klass.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate: 'CPU' },
        ...extraOptions,
      })
    }
  }, [])

  const ensureLoaded = useCallback(async ({ face = true, pose = true } = {}) => {
    const v = visionRef.current
    if ((!face || v.face) && (!pose || v.pose)) {
      if (status !== 'ready') setStatus('ready')
      return
    }
    if (v.loadingPromise) return v.loadingPromise

    setStatus('loading')
    setError('')

    v.loadingPromise = (async () => {
      const tasksVision = await import('@mediapipe/tasks-vision')
      const { FilesetResolver, FaceLandmarker, PoseLandmarker, DrawingUtils } = tasksVision
      v.FaceLandmarker = FaceLandmarker
      v.PoseLandmarker = PoseLandmarker
      v.DrawingUtils = DrawingUtils

      if (!v.fileset) {
        v.fileset = await FilesetResolver.forVisionTasks(WASM_URL)
      }
      if (face && !v.face) {
        v.face = await createLandmarker(FaceLandmarker, v.fileset, FACE_MODEL_URL, {
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        })
        v.faceMode = 'VIDEO'
      }
      if (pose && !v.pose) {
        v.pose = await createLandmarker(PoseLandmarker, v.fileset, POSE_MODEL_URL, {
          runningMode: 'VIDEO',
          numPoses: 1,
        })
        v.poseMode = 'VIDEO'
      }
    })()

    try {
      await v.loadingPromise
      setStatus('ready')
    } catch (err) {
      console.error('Failed to load MediaPipe Tasks Vision:', err)
      setError(err?.message || String(err))
      setStatus('error')
    } finally {
      v.loadingPromise = null
    }
  }, [status, createLandmarker])

  /** Run detection on a live <video> frame. Returns { face, pose } results. */
  const detectVideoFrame = useCallback(async ({ video, face, pose }) => {
    const v = visionRef.current
    const result = {}
    const now = performance.now()
    if (face && v.face) {
      if (v.faceMode !== 'VIDEO') {
        await v.face.setOptions({ runningMode: 'VIDEO' })
        v.faceMode = 'VIDEO'
      }
      result.face = v.face.detectForVideo(video, now)
    }
    if (pose && v.pose) {
      if (v.poseMode !== 'VIDEO') {
        await v.pose.setOptions({ runningMode: 'VIDEO' })
        v.poseMode = 'VIDEO'
      }
      result.pose = v.pose.detectForVideo(video, now)
    }
    return result
  }, [])

  /** Run a one-shot detection on a static <img> element (uploaded photo). */
  const detectImage = useCallback(async ({ image, face, pose }) => {
    const v = visionRef.current
    const result = {}
    if (face && v.face) {
      if (v.faceMode !== 'IMAGE') {
        await v.face.setOptions({ runningMode: 'IMAGE' })
        v.faceMode = 'IMAGE'
      }
      result.face = v.face.detect(image)
    }
    if (pose && v.pose) {
      if (v.poseMode !== 'IMAGE') {
        await v.pose.setOptions({ runningMode: 'IMAGE' })
        v.poseMode = 'IMAGE'
      }
      result.pose = v.pose.detect(image)
    }
    return result
  }, [])

  const getDrawingUtils = useCallback((ctx) => {
    const DrawingUtils = visionRef.current.DrawingUtils
    return DrawingUtils ? new DrawingUtils(ctx) : null
  }, [])

  const getFaceLandmarker = useCallback(() => visionRef.current.FaceLandmarker, [])
  const getPoseLandmarker = useCallback(() => visionRef.current.PoseLandmarker, [])

  return {
    status,
    error,
    ensureLoaded,
    detectVideoFrame,
    detectImage,
    getDrawingUtils,
    getFaceLandmarker,
    getPoseLandmarker,
  }
}
