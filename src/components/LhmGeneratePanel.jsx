import React, { useRef, useState } from 'react'
import { UploadCloud, Wand2, AlertTriangle, Download, RotateCcw, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'
import SpaceStatusBadge from './SpaceStatusBadge'

// Client thật cho /api/lhm-generate. Cũng như LamGeneratePanel: cuộc gọi
// tới Studio ModelScope diễn ra Ở SERVER (xem api/lhm-generate.js), ảnh và
// video được nén/resize ngay trên trình duyệt trước khi gửi để tránh vượt
// giới hạn 4.5MB của Vercel Serverless Function. Không có kết quả giả lập:
// thành công hiển thị đúng file model trả về, thất bại hiển thị đúng lỗi
// thật từ ModelScope.

const MAX_IMAGE_DIMENSION = 1024
const JPEG_QUALITY = 0.85
const MAX_VIDEO_BYTES = 3 * 1024 * 1024 // giữ tổng payload (ảnh+video) dưới ~4MB

function resizeImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      const longEdge = Math.max(width, height)
      if (longEdge > MAX_IMAGE_DIMENSION) {
        const scale = MAX_IMAGE_DIMENSION / longEdge
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e) }
    img.src = objectUrl
  })
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ResultItem({ item, border, surface, text2 }) {
  if (item && typeof item === 'object' && (item.url || item.path)) {
    const url = item.url || item.path
    const mime = item.mime_type || ''
    const isVideo = mime.startsWith('video') || /\.(mp4|webm|mov)$/i.test(url)
    const isImage = mime.startsWith('image') || /\.(png|jpe?g|webp)$/i.test(url)
    return (
      <div style={{ border: `1px solid ${border}`, background: surface, borderRadius: 12, padding: 10, marginBottom: 10 }}>
        {isVideo && <video src={url} controls style={{ width: '100%', borderRadius: 8, display: 'block' }} />}
        {isImage && <img src={url} alt="LHM output" style={{ width: '100%', borderRadius: 8, display: 'block' }} />}
        {!isVideo && !isImage && (
          <div style={{ fontSize: 12, color: text2 }}>{item.orig_name || url.split('/').pop()}</div>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer" download
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: text2, textDecoration: 'none' }}>
          <Download size={13} /> {item.orig_name || url.split('/').pop()}
        </a>
      </div>
    )
  }
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
    return <div style={{ fontSize: 12, color: text2, marginBottom: 6 }}>{String(item)}</div>
  }
  return null
}

export default function LhmGeneratePanel({ isDark, vi, border, surface, text, text2, text3 }) {
  const imgInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [status, setStatus] = useState('idle') // idle | preparing | running | done | error
  const [error, setError] = useState(null)
  const [hint, setHint] = useState(null)
  const [result, setResult] = useState(null)

  const onPickImage = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
    setStatus('idle'); setError(null); setResult(null)
  }

  const onPickVideo = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_VIDEO_BYTES) {
      setError(vi
        ? `Video quá lớn (${(f.size / 1024 / 1024).toFixed(1)}MB). Hãy dùng video ngắn/nén dưới ${(MAX_VIDEO_BYTES / 1024 / 1024).toFixed(0)}MB — giới hạn này đến từ hạn mức body 4.5MB của Vercel Serverless Function, không phải giới hạn của model.`
        : `Video too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Use a short/compressed clip under ${(MAX_VIDEO_BYTES / 1024 / 1024).toFixed(0)}MB — this cap comes from Vercel's 4.5MB Serverless Function body limit, not a model limitation.`)
      setStatus('error')
      return
    }
    setVideoFile(f)
    setVideoPreview(URL.createObjectURL(f))
    setStatus('idle'); setError(null); setResult(null)
  }

  const reset = () => {
    setImageFile(null); setImagePreview(null)
    setVideoFile(null); setVideoPreview(null)
    setStatus('idle'); setError(null); setHint(null); setResult(null)
    if (imgInputRef.current) imgInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const generate = async () => {
    if (!imageFile) return
    setStatus('preparing'); setError(null); setHint(null); setResult(null)
    try {
      const imageBase64 = await resizeImageToDataUrl(imageFile)
      const videoBase64 = videoFile ? await fileToDataUrl(videoFile) : null
      setStatus('running')
      const resp = await fetch('/api/lhm-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64, imageMimeType: 'image/jpeg',
          videoBase64, videoMimeType: videoFile?.type || 'video/mp4',
        }),
      })
      const data = await resp.json()
      if (!resp.ok || data.error) {
        setError(data.error || `HTTP ${resp.status}`)
        setHint(data.hint || null)
        setStatus('error')
        return
      }
      setResult(data)
      setStatus('done')
    } catch (err) {
      console.error('[LhmGeneratePanel]', err)
      setError(err?.message || String(err))
      setStatus('error')
    }
  }

  const busy = status === 'preparing' || status === 'running'
  const uploadBoxStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: 140, height: 140, borderRadius: 12, cursor: 'pointer',
    border: `1.5px dashed ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
    overflow: 'hidden', padding: 0,
  }

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Wand2 size={15} color={isDark ? '#00e5ff' : '#00b8cc'} />
        <div style={{ fontSize: 13.5, fontWeight: 800, color: text }}>
          {vi ? 'Tạo avatar 3D bằng LHM++ (Hugging Face Space)' : 'Generate a 3D avatar via LHM++ (Hugging Face Space)'}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <SpaceStatusBadge space="Lingteng/LHMPP" vi={vi} text3={text3} />
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: text3, lineHeight: 1.6 }}>
        {vi
          ? 'Gọi model LHM++ thật (aigc3d/LHM-plusplus) trên Space "Lingteng/LHMPP" — bản kế nhiệm LHM, nhanh hơn đáng kể nhờ kiến trúc Encoder-Decoder Point-Image Transformer, và Space này đang chạy ("Running on Zero") thay vì bị lỗi build như 3DAIGC/LHM gốc. Vì vẫn dùng chung ZeroGPU công khai, có thể phải chờ hàng đợi hoặc gặp lỗi thật khi Space quá tải — lỗi đó hiện nguyên văn bên dưới, không có kết quả giả lập.'
          : 'Calls the real LHM++ model (aigc3d/LHM-plusplus) on the "Lingteng/LHMPP" Space — the successor to LHM, substantially faster thanks to its Encoder-Decoder Point-Image Transformer architecture, and this Space is actually running ("Running on Zero") instead of erroring like the original 3DAIGC/LHM. It still shares public ZeroGPU, so it may queue or genuinely fail under load — that real error shows below, nothing is simulated.'}
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <input ref={imgInputRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: 'none' }} />
          <button onClick={() => imgInputRef.current?.click()} style={uploadBoxStyle}>
            {imagePreview
              ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <>
                  <ImageIcon size={20} color={text3} />
                  <span style={{ fontSize: 11, color: text3, textAlign: 'center', padding: '0 8px' }}>
                    {vi ? 'Ảnh chân dung (bắt buộc)' : 'Portrait photo (required)'}
                  </span>
                </>}
          </button>
        </div>
        <div>
          <input ref={videoInputRef} type="file" accept="video/*" onChange={onPickVideo} style={{ display: 'none' }} />
          <button onClick={() => videoInputRef.current?.click()} style={uploadBoxStyle}>
            {videoPreview
              ? <video src={videoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
              : <>
                  <VideoIcon size={20} color={text3} />
                  <span style={{ fontSize: 11, color: text3, textAlign: 'center', padding: '0 8px' }}>
                    {vi ? 'Video chuyển động (tuỳ chọn)' : 'Driving video (optional)'}
                  </span>
                </>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={generate}
          disabled={!imageFile || busy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 9,
            fontSize: 12.5, fontWeight: 700, border: '1px solid transparent', cursor: imageFile ? 'pointer' : 'not-allowed',
            background: imageFile ? 'linear-gradient(135deg, #00b8cc, #6b3fd4)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
            color: imageFile ? '#fff' : text3, opacity: busy ? 0.7 : 1,
          }}>
          <UploadCloud size={14} />
          {status === 'preparing' && (vi ? 'Đang xử lý file...' : 'Preparing files...')}
          {status === 'running' && (vi ? 'Model đang xử lý...' : 'Model running...')}
          {!busy && (vi ? 'Tạo avatar (ModelScope)' : 'Generate (ModelScope)')}
        </button>
        {(imageFile || videoFile || result || error) && (
          <button onClick={reset} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 9,
            fontSize: 12, fontWeight: 600, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer',
          }}>
            <RotateCcw size={13} /> {vi ? 'Làm lại' : 'Reset'}
          </button>
        )}
      </div>

      {status === 'error' && (
        <div style={{
          marginTop: 14, padding: 12, borderRadius: 10, display: 'flex', gap: 8,
          background: isDark ? 'rgba(255,82,82,0.08)' : 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.3)',
        }}>
          <AlertTriangle size={15} color="#ff5252" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#ff5252', marginBottom: 2 }}>
              {vi ? 'Lỗi thật từ ModelScope (không phải giả lập):' : 'Real error from ModelScope (not simulated):'}
            </div>
            <div style={{ fontSize: 12, color: text2, lineHeight: 1.5 }}>{error}</div>
            {hint && <div style={{ fontSize: 11.5, color: text3, marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, color: text3, marginBottom: 8 }}>
            {vi ? `Kết quả thật từ ModelScope · endpoint ${result.endpoint}` : `Real result from ModelScope · endpoint ${result.endpoint}`}
          </div>
          {Array.isArray(result.data)
            ? result.data.map((item, i) => <ResultItem key={i} item={item} border={border} surface={isDark ? 'rgba(255,255,255,0.02)' : '#fff'} text2={text2} />)
            : <ResultItem item={result.data} border={border} surface={isDark ? 'rgba(255,255,255,0.02)' : '#fff'} text2={text2} />}
        </div>
      )}
    </div>
  )
}
