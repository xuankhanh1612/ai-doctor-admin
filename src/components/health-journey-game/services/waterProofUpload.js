import { detectFileType, fileToBase64, fileToDataUrl, saveRecord } from '../../../lib/medicalStorage.js'
import { notifyUpload } from '../../../hooks/useMedicalData.js'

export const WATER_AMOUNT_ML = 150
export const BE_MEO_WATER_STATE_KEY = 'be-meo-nuoc-water-state-v1'
export const BE_MEO_CHAT_KEY = 'be-meo-nuoc-chat-v1'
export const BE_MEO_SYNC_EVENT = 'be-meo-nuoc:water-added'

export function safeUploadSegment(value) {
  return (value || 'guest').toString().trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'guest'
}

export function dataUrlToFile(dataUrl, filename) {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta?.match(/data:(.*?);base64/)?.[1] || 'image/jpeg'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

export function makeWaterUploadPath(user, filename, taskId = 'water') {
  return `upload/${safeUploadSegment(user?.email || user?.name || 'guest')}/health-journey-game/${safeUploadSegment(taskId || 'mission')}/${filename}`
}

export function drawAIWaterBottleOverlay(ctx, width, height) {
  const boxWidth = width * 0.34
  const boxHeight = height * 0.58
  const x = width * 0.5 - boxWidth / 2
  const y = height * 0.2
  const now = new Date().toLocaleTimeString('vi-VN', { hour12: false })

  ctx.save()
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.92)'
  ctx.lineWidth = Math.max(3, width * 0.004)
  ctx.shadowColor = 'rgba(14, 165, 233, 0.75)'
  ctx.shadowBlur = 18
  ctx.strokeRect(x, y, boxWidth, boxHeight)

  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(2, 6, 23, 0.78)'
  ctx.fillRect(x, Math.max(0, y - 38), Math.min(boxWidth, 300), 34)
  ctx.fillStyle = '#67e8f9'
  ctx.font = `800 ${Math.max(14, width * 0.018)}px Inter, sans-serif`
  ctx.fillText('water bottle 0.96', x + 10, Math.max(22, y - 15))

  ctx.strokeStyle = 'rgba(34, 197, 94, 0.88)'
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.roundRect(x + boxWidth * 0.26, y + boxHeight * 0.12, boxWidth * 0.48, boxHeight * 0.76, 18)
  ctx.stroke()
  ctx.setLineDash([])

  for (let i = 0; i < 5; i += 1) {
    const py = y + boxHeight * (0.18 + i * 0.15)
    ctx.fillStyle = i % 2 ? '#22c55e' : '#38bdf8'
    ctx.beginPath()
    ctx.arc(x + boxWidth * 0.5, py, Math.max(4, width * 0.006), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(125, 211, 252, 0.26)'
  ctx.lineWidth = 1
  for (let sy = 0; sy < height; sy += 22) {
    ctx.beginPath()
    ctx.moveTo(0, sy)
    ctx.lineTo(width, sy)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
  ctx.fillRect(12, height - 72, Math.min(width - 24, 520), 52)
  ctx.fillStyle = '#e0f2fe'
  ctx.font = `800 ${Math.max(13, width * 0.016)}px Inter, sans-serif`
  ctx.fillText(`AI Healthcare Vision · Object Detection Webcam · ${now}`, 24, height - 44)
  ctx.fillStyle = '#86efac'
  ctx.fillText(`✓ Verified hydration proof · +${WATER_AMOUNT_ML}ml · save overlay`, 24, height - 24)
  ctx.restore()
}

export function syncBeMeoWater(amount = WATER_AMOUNT_ML, source = 'health-journey-game') {
  if (typeof window === 'undefined') return null
  const today = new Date().toISOString().slice(0, 10)
  const defaultState = { date: today, total: 0, goal: 2000, history: {} }
  let state = defaultState
  try {
    const parsed = JSON.parse(localStorage.getItem(BE_MEO_WATER_STATE_KEY) || 'null')
    if (parsed && typeof parsed === 'object') {
      const history = parsed.history && typeof parsed.history === 'object' ? parsed.history : {}
      state = parsed.date === today
        ? { ...defaultState, ...parsed, history }
        : { ...defaultState, goal: parsed.goal || 2000, history, total: history[today]?.total || 0 }
    }
  } catch {
    state = defaultState
  }

  state.total = Math.max(0, Number(state.total || 0) + amount)
  const percent = Math.min(100, Math.round((state.total / (state.goal || 2000)) * 100))
  state.date = today
  state.history = { ...(state.history || {}), [today]: { total: state.total, goal: state.goal || 2000, percent } }
  localStorage.setItem(BE_MEO_WATER_STATE_KEY, JSON.stringify(state))

  const botText = `Bé Mèo đã ghi +${amount}ml từ ${source}. Hôm nay bạn đang ở ${state.total}/${state.goal}ml (${percent}%).`
  try {
    const messages = JSON.parse(localStorage.getItem(BE_MEO_CHAT_KEY) || '[]')
    const nextMessages = Array.isArray(messages) ? messages : []
    nextMessages.push({ role: 'bot', text: botText })
    localStorage.setItem(BE_MEO_CHAT_KEY, JSON.stringify(nextMessages.slice(-80)))
  } catch {
    localStorage.setItem(BE_MEO_CHAT_KEY, JSON.stringify([{ role: 'bot', text: botText }]))
  }

  window.dispatchEvent(new CustomEvent(BE_MEO_SYNC_EVENT, { detail: { amount, source, state, botText } }))
  return { state, botText }
}

export async function saveWaterProofImage(file, user, {
  source = 'health-journey-game-water-proof',
  notesPrefix = 'Health Journey Game · Water Proof',
  activityType = 'drink_water',
  taskId = 'water',
  xpEarned = 10,
  waterAmountMl = WATER_AMOUNT_ML,
  proofType = 'webcam_bottle_photo_ai_overlay',
} = {}) {
  const [dataUrl, base64Data] = await Promise.all([fileToDataUrl(file), fileToBase64(file)])
  const filename = `${safeUploadSegment(taskId)}_ai_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`
  const uploadPath = makeWaterUploadPath(user, filename, taskId)
  const fileType = detectFileType(file.type, filename)
  const record = {
    id: `health_journey_water_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    filename,
    name: filename,
    fileType,
    type: fileType,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl,
    base64Data,
    notes: `${notesPrefix} · Activity: ${activityType} · +${xpEarned} XP · AI Healthcare Vision Object Detection Webcam overlay saved · ${uploadPath}`,
    ownerEmail: user?.email || null,
    ownerName: user?.name || '',
    ownerAvatar: user?.avatar || '',
    ownerProvider: user?.provider || '',
    sourceModule: source,
    uploadFolder: uploadPath.split('/').slice(0, -1).join('/'),
    uploadPath,
    healthJourney: {
      activityType,
      taskId,
      xpEarned,
      waterAmountMl,
      proofType,
    },
  }
  await saveRecord(record, {
    ownerEmail: user?.email,
    ownerName: user?.name,
    ownerAvatar: user?.avatar,
    ownerProvider: user?.provider,
    sourceModule: source,
  })
  notifyUpload()
  return record
}
