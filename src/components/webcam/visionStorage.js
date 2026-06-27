import { detectFileType, fileToBase64, fileToDataUrl, saveRecord } from '../../lib/medicalStorage.js'
import { notifyUpload } from '../../hooks/useMedicalData.js'

export function safeUploadSegment(value) {
  return (value || 'guest')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest'
}

export function makeVisionFilename(prefix, ext = 'jpg') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}_${stamp}.${ext}`
}

export function getVisionUploadFolder(user) {
  return `upload/${safeUploadSegment(user?.email || user?.name || 'guest')}/ai-healthcare-vision-control`
}

export function dataUrlToFile(dataUrl, filename) {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta?.match(/data:(.*?);base64/)?.[1] || 'image/jpeg'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

export function dataUrlBase64(dataUrl) {
  return String(dataUrl || '').split(',')[1] || ''
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Save an image File (from upload, capture or MediaPipe postMessage) into Medical Records / Upload Records. */
export async function saveVisionControlImage(file, { user, lang, label }) {
  const [dataUrl, base64Data] = await Promise.all([fileToDataUrl(file), fileToBase64(file)])
  const uploadFolder = getVisionUploadFolder(user)
  const filename = makeVisionFilename('ai_healthcare_vision', file.name?.includes('.') ? file.name.split('.').pop() : 'jpg')
  const uploadPath = `${uploadFolder}/${filename}`
  const fileType = detectFileType(file.type, filename)
  const record = {
    id: `vision_control_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    filename,
    name: filename,
    fileType,
    type: fileType,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl,
    base64Data,
    notes: lang === 'vi' ? `${label} · lưu tại ${uploadPath}` : `${label} · saved at ${uploadPath}`,
    ownerUuid: user?.uuid || null,
    ownerEmail: user?.email || '',
    ownerName: user?.name || '',
    ownerAvatar: user?.avatar || '',
    ownerProvider: user?.provider || '',
    sourceModule: 'ai-healthcare-vision-control',
    uploadFolder,
    uploadPath,
  }

  await saveRecord(record, {
    ownerUuid: user?.uuid,
    ownerEmail: user?.email,
    ownerName: user?.name,
    ownerAvatar: user?.avatar,
    ownerProvider: user?.provider,
  })
  notifyUpload()
  return record
}

/** Save a recorded video Blob (webm) into Medical Records / Upload Records. */
export async function saveVisionControlVideo(blob, { user, lang, label }) {
  const dataUrl = await blobToDataUrl(blob)
  const uploadFolder = getVisionUploadFolder(user)
  const filename = makeVisionFilename('ai_healthcare_vision_video', 'webm')
  const uploadPath = `${uploadFolder}/${filename}`
  const record = {
    id: `vision_control_video_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    filename,
    name: filename,
    fileType: 'video',
    type: 'video',
    mimeType: blob.type || 'video/webm',
    size: blob.size,
    uploadedAt: new Date().toISOString(),
    dataUrl,
    base64Data: dataUrlBase64(dataUrl),
    notes: lang === 'vi' ? `${label} · lưu tại ${uploadPath}` : `${label} · saved at ${uploadPath}`,
    ownerUuid: user?.uuid || null,
    ownerEmail: user?.email || '',
    ownerName: user?.name || '',
    ownerAvatar: user?.avatar || '',
    ownerProvider: user?.provider || '',
    sourceModule: 'ai-healthcare-vision-control',
    uploadFolder,
    uploadPath,
  }

  await saveRecord(record, {
    ownerUuid: user?.uuid,
    ownerEmail: user?.email,
    ownerName: user?.name,
    ownerAvatar: user?.avatar,
    ownerProvider: user?.provider,
  })
  notifyUpload()
  return record
}
