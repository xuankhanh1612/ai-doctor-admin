import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useHandTracking } from './useHandTracking'

const CAMERA_MODE = {
  front: { facingMode: 'user', mirrored: true, label: 'Camera trước' },
  rear: { facingMode: 'environment', mirrored: false, label: 'Camera sau' },
}

// Mini-map Webcam cho "Touchless Control" trong Medical Visual Playground.
// CỐ TÌNH tối giản so với AIVisionWebcam.jsx (không quay video, không chụp
// ảnh, không settings drawer) — chỉ có 1 việc: mở camera, chạy MediaPipe
// Hand Landmarker mỗi khung hình, vẽ landmark lên canvas overlay, và bắn
// tọa độ ra ngoài qua onHandTrack(landmarks) cho component cha (nơi tính
// góc xoay + pinch-to-zoom rồi truyền vào ObjModelViewer).
const TouchlessHandCam = forwardRef(function TouchlessHandCam({ onHandTrack, onHandLost, onMappingChange, onClose }, ref) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const cameraModeRef = useRef('front')

  const [starting, setStarting] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraMode, setCameraMode] = useState('front')
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const { status, error, ensureLoaded, detectVideoFrame } = useHandTracking()

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks?.().forEach((t) => t.stop())
    streamRef.current = null
    setTorchOn(false)
    setTorchSupported(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const syncMapping = useCallback((mode) => {
    onMappingChange?.({
      mirrored: CAMERA_MODE[mode]?.mirrored ?? false,
      facingMode: CAMERA_MODE[mode]?.facingMode ?? 'environment',
    })
  }, [onMappingChange])

  const drawLandmarks = useCallback((landmarks) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth || 320
    canvas.height = video.videoHeight || 240
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!landmarks) return

    const hand = landmarks[0]
    // Các cặp điểm khớp ngón tay (đơn giản hoá) để vẽ khung xương bàn tay.
    const bones = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ]
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = 2
    bones.forEach(([a, b]) => {
      const pa = hand[a], pb = hand[b]
      if (!pa || !pb) return
      ctx.beginPath()
      ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height)
      ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height)
      ctx.stroke()
    })
    hand.forEach((pt) => {
      ctx.beginPath()
      ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#f48fb1'
      ctx.fill()
    })
    // Đánh dấu ngón cái (4) và ngón trỏ (8) — cặp điểm dùng cho Pinch-to-zoom.
    ;[4, 8].forEach((idx) => {
      const pt = hand[idx]
      if (!pt) return
      ctx.beginPath()
      ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 6, 0, Math.PI * 2)
      ctx.strokeStyle = '#00e676'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }, [])

  const startCamera = useCallback(async (nextMode = cameraModeRef.current) => {
    setStarting(true)
    setErrorMsg('')
    stopCamera()
    cameraModeRef.current = nextMode
    setCameraMode(nextMode)
    syncMapping(nextMode)

    try {
      await ensureLoaded()
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Trình duyệt không hỗ trợ mở camera.')
        setStarting(false)
        return
      }

      const modeConfig = CAMERA_MODE[nextMode] || CAMERA_MODE.front
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: modeConfig.facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      streamRef.current = stream
      const videoTrack = stream.getVideoTracks?.()[0]
      const capabilities = videoTrack?.getCapabilities?.()
      setTorchSupported(Boolean(capabilities?.torch))

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setStarting(false)

      const loop = () => {
        const video = videoRef.current
        if (video && video.readyState >= 2) {
          const landmarks = detectVideoFrame(video)
          drawLandmarks(landmarks)
          if (landmarks) onHandTrack?.(landmarks)
          else onHandLost?.()
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      loop()
    } catch (err) {
      console.error('TouchlessHandCam start failed:', err)
      setErrorMsg('Không thể mở camera hoặc tải model Hand Tracking.')
      setStarting(false)
    }
  }, [detectVideoFrame, drawLandmarks, ensureLoaded, onHandLost, onHandTrack, stopCamera, syncMapping])

  const switchToFrontCamera = useCallback(() => {
    startCamera('front')
  }, [startCamera])

  const toggleTorch = useCallback(async () => {
    const videoTrack = streamRef.current?.getVideoTracks?.()[0]
    if (!videoTrack?.applyConstraints) {
      setErrorMsg('Camera này không hỗ trợ bật đèn flash trên trình duyệt.')
      return
    }

    try {
      const nextTorchOn = !torchOn
      await videoTrack.applyConstraints({ advanced: [{ torch: nextTorchOn }] })
      setTorchOn(nextTorchOn)
      setTorchSupported(true)
    } catch (err) {
      console.warn('Torch toggle failed:', err)
      setTorchSupported(false)
      setErrorMsg('Camera/trình duyệt này không hỗ trợ đèn flash. Hãy chuyển sang camera sau nếu cần bật flash.')
    }
  }, [torchOn])

  useImperativeHandle(ref, () => ({
    switchToFrontCamera,
    toggleTorch,
    closeCamera: () => {
      stopCamera()
      onClose?.()
    },
  }), [onClose, stopCamera, switchToFrontCamera, toggleTorch])

  useEffect(() => {
    startCamera('front')
    return () => stopCamera()
  }, [startCamera, stopCamera])

  const mirrored = CAMERA_MODE[cameraMode]?.mirrored ?? false
  const mirrorStyle = mirrored ? 'scaleX(-1)' : 'none'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: mirrorStyle }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: mirrorStyle }}
      />
      <div style={{
        position: 'absolute', right: 8, bottom: 8, padding: '3px 6px', borderRadius: 999,
        background: 'rgba(0,0,0,0.58)', color: '#bae6fd', fontSize: 10, fontFamily: 'monospace',
        border: '1px solid rgba(125,211,252,0.28)', pointerEvents: 'none',
      }}>
        {CAMERA_MODE[cameraMode]?.label || 'Camera'}{torchOn ? ' · Flash ON' : torchSupported ? ' · Flash ready' : ''}
      </div>
      {(starting || status === 'loading') && !errorMsg && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', background: 'rgba(0,0,0,0.5)',
        }}>
          ⏳ Đang tải Hand Landmarker...
        </div>
      )}
      {(errorMsg || error) && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ff8a80', fontSize: 11, fontFamily: 'monospace', textAlign: 'center', padding: 10, background: 'rgba(0,0,0,0.6)',
        }}>
          ⚠️ {errorMsg || error}
        </div>
      )}
    </div>
  )
})

export default TouchlessHandCam
