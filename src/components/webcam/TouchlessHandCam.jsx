import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useHandTracking } from './useHandTracking'

// Mini-map Webcam cho "Touchless Control" trong Medical Visual Playground.
// CỐ TÌNH tối giản so với AIVisionWebcam.jsx (không quay video, không chụp
// ảnh, không settings drawer) — chỉ có 1 việc: mở camera, chạy MediaPipe
// Hand Landmarker mỗi khung hình, vẽ landmark lên canvas overlay, và bắn
// tọa độ ra ngoài qua onHandTrack(landmarks) cho component cha (nơi tính
// góc xoay + pinch-to-zoom rồi truyền vào ObjModelViewer).
export default function TouchlessHandCam({ onHandTrack, onHandLost }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  const [starting, setStarting] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const { status, error, ensureLoaded, detectVideoFrame } = useHandTracking()

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

  useEffect(() => {
    let cancelled = false

    async function start() {
      setStarting(true)
      setErrorMsg('')
      try {
        await ensureLoaded()
        if (cancelled) return
        if (!navigator.mediaDevices?.getUserMedia) {
          setErrorMsg('Trình duyệt không hỗ trợ mở camera.')
          setStarting(false)
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
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
    }

    start()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks?.().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }}
      />
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
}
