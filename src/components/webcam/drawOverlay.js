// Canvas drawing helpers shared by the live HUD canvas and the
// capture/save/record export pipeline.

export function drawFaceMesh(ctx, drawingUtils, FaceLandmarker, faceResult) {
  if (!faceResult?.faceLandmarks?.length || !drawingUtils || !FaceLandmarker) return
  for (const landmarks of faceResult.faceLandmarks) {
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
      color: 'rgba(0,229,255,0.35)',
      lineWidth: 1,
    })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: '#83f7ff', lineWidth: 2 })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#00e676', lineWidth: 1.5 })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: '#00e676', lineWidth: 1.5 })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#ff5252', lineWidth: 1.5 })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: '#ff5252', lineWidth: 1.5 })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: '#ffb74d', lineWidth: 1.5 })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: '#00e676', lineWidth: 1.5 })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: '#ff5252', lineWidth: 1.5 })
  }
}

export function drawPose(ctx, drawingUtils, PoseLandmarker, poseResult) {
  if (!poseResult?.landmarks?.length || !drawingUtils || !PoseLandmarker) return
  for (const landmarks of poseResult.landmarks) {
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: 'rgba(156,111,255,0.85)',
      lineWidth: 2,
    })
    drawingUtils.drawLandmarks(landmarks, {
      color: '#9c6fff',
      radius: 2,
    })
  }
}

export function drawClock(ctx, width, height, now = new Date()) {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeText = `${hh}:${mm}:${ss}`

  const pad = Math.max(14, Math.round(width * 0.018))
  const boxW = Math.max(150, width * 0.16)
  const boxH = Math.max(46, height * 0.09)
  const x = width - pad - boxW
  const y = pad

  ctx.save()
  ctx.fillStyle = 'rgba(0,12,24,0.72)'
  ctx.fillRect(x, y, boxW, boxH)
  ctx.strokeStyle = 'rgba(0,229,255,0.5)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(x, y, boxW, boxH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${Math.max(15, boxW * 0.13)}px monospace`
  ctx.textBaseline = 'top'
  ctx.fillText(timeText, x + 12, y + 8)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `700 ${Math.max(10, boxW * 0.07)}px sans-serif`
  ctx.fillText(date, x + 12, y + boxH - Math.max(16, boxW * 0.09))
  ctx.restore()
}

export function drawBorder(ctx, width, height) {
  const pad = Math.max(10, Math.round(width * 0.012))
  const corner = Math.min(width, height) * 0.1

  ctx.save()
  ctx.strokeStyle = 'rgba(0,229,255,0.95)'
  ctx.lineWidth = Math.max(3, Math.round(width * 0.005))
  ctx.shadowColor = 'rgba(0,229,255,0.9)'
  ctx.shadowBlur = 14
  ;[
    [pad, pad, pad + corner, pad, pad, pad + corner],
    [width - pad, pad, width - pad - corner, pad, width - pad, pad + corner],
    [pad, height - pad, pad + corner, height - pad, pad, height - pad - corner],
    [width - pad, height - pad, width - pad - corner, height - pad, width - pad, height - pad - corner],
  ].forEach(([ax, ay, bx, by, cx, cy]) => {
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.moveTo(ax, ay)
    ctx.lineTo(cx, cy)
    ctx.stroke()
  })
  ctx.shadowBlur = 0
  ctx.restore()
}

export function drawOverlayBadge(ctx, width, text = 'AI DOCTOR VISION SCAN') {
  const pad = Math.max(14, Math.round(width * 0.018))
  ctx.save()
  ctx.font = `900 ${Math.max(13, width * 0.018)}px monospace`
  const textW = ctx.measureText(text).width
  ctx.fillStyle = 'rgba(0,12,24,0.72)'
  ctx.fillRect(pad, pad, textW + 28, 32)
  ctx.strokeStyle = 'rgba(0,229,255,0.5)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(pad, pad, textW + 28, 32)
  ctx.fillStyle = '#83f7ff'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, pad + 12, pad + 17)
  ctx.restore()
}
