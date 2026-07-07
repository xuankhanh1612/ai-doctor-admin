import React, { useRef, useState } from 'react'
import { UploadCloud, Wand2, AlertTriangle, Download, RotateCcw, Image as ImageIcon } from 'lucide-react'
import SpaceStatusBadge from './SpaceStatusBadge'

// Real client for /api/lam-generate. The call to the LAM Hugging Face
// Space (github.com/aigc3d/LAM) happens SERVER-SIDE (see api/lam-generate.js):
// calling it directly from the browser hits a hard CORS wall (the Space's
// Access-Control-Allow-Credentials header comes back empty instead of
// "true", which browsers reject) — CORS only restricts browsers, not
// servers, so routing through our own Node endpoint is the real fix, not a
// workaround. To stay under Vercel's fixed 4.5MB request body limit, the
// photo is downscaled client-side before it's sent. Nothing is mocked:
// success shows whatever file the model itself produced, failure shows the
// real upstream error.

const MAX_DIMENSION = 1024 // px, long edge
const JPEG_QUALITY = 0.85

function resizeImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      const longEdge = Math.max(width, height)
      if (longEdge > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / longEdge
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e) }
    img.src = objectUrl
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
        {isImage && <img src={url} alt="LAM output" style={{ width: '100%', borderRadius: 8, display: 'block' }} />}
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

export default function LamGeneratePanel({ isDark, vi, border, surface, text, text2, text3 }) {
  const imgInputRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [status, setStatus] = useState('idle') // idle | resizing | running | done | error
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

  const reset = () => {
    setImageFile(null); setImagePreview(null)
    setStatus('idle'); setError(null); setHint(null); setResult(null)
    if (imgInputRef.current) imgInputRef.current.value = ''
  }

  const generate = async () => {
    if (!imageFile) return
    setStatus('resizing'); setError(null); setHint(null); setResult(null)
    try {
      const imageBase64 = await resizeImageToDataUrl(imageFile)
      setStatus('running')
      const resp = await fetch('/api/lam-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, imageMimeType: 'image/jpeg' }),
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
      console.error('[LamGeneratePanel]', err)
      setError(err?.message || String(err))
      setStatus('error')
    }
  }

  const busy = status === 'resizing' || status === 'running'

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Wand2 size={15} color={isDark ? '#00e5ff' : '#00b8cc'} />
        <div style={{ fontSize: 13.5, fontWeight: 800, color: text }}>
          {vi ? 'Tạo avatar 3D thật từ ảnh của bạn' : 'Generate a real 3D avatar from your photo'}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <SpaceStatusBadge space="3DAIGC/LAM" vi={vi} text3={text3} />
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: text3, lineHeight: 1.6 }}>
        {vi
          ? 'Ảnh được resize ngay trên trình duyệt rồi gửi tới server của bạn; server gọi trực tiếp model LAM thật (mã nguồn aigc3d/LAM) đang chạy trên Hugging Face Space qua @gradio/client — không có kết quả giả lập. (Gọi thẳng từ trình duyệt sang Hugging Face bị chính Space đó chặn bởi CORS, nên bước trung gian server là bắt buộc, không phải hạn chế của app này.) Vì là Space công khai dùng chung GPU, đôi khi sẽ có lỗi thật (Space ngủ, hết lượt GPU...) — lỗi đó hiện nguyên văn bên dưới.'
          : 'Your photo is resized right in the browser, then sent to your own server; the server calls the real LAM model (aigc3d/LAM source) running on its Hugging Face Space via @gradio/client — nothing is simulated. (Calling Hugging Face straight from the browser is blocked by that Space\'s own CORS setup, so the server hop is required, not a limitation of this app.) Since it\'s a shared public Space, it can genuinely fail sometimes (asleep, out of GPU quota) — that real error is shown verbatim below.'}
      </p>

      <div style={{ marginBottom: 12 }}>
        <input ref={imgInputRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: 'none' }} />
        <button onClick={() => imgInputRef.current?.click()} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: 140, height: 140, borderRadius: 12, cursor: 'pointer',
          border: `1.5px dashed ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
          overflow: 'hidden', padding: 0,
        }}>
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
          {status === 'resizing' && (vi ? 'Đang xử lý ảnh...' : 'Preparing photo...')}
          {status === 'running' && (vi ? 'Model đang xử lý (có thể mất 10-60s)...' : 'Model running (can take 10-60s)...')}
          {!busy && (vi ? 'Tạo avatar (gọi model thật)' : 'Generate (calls the real model)')}
        </button>
        {(imageFile || result || error) && (
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
              {vi ? 'Model thật báo lỗi (không phải giả lập):' : 'Real model error (not simulated):'}
            </div>
            <div style={{ fontSize: 12, color: text2, lineHeight: 1.5 }}>{error}</div>
            {hint && <div style={{ fontSize: 11.5, color: text3, marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, color: text3, marginBottom: 8 }}>
            {vi ? `Kết quả thật từ Space "${result.space}" · endpoint ${result.endpoint}` : `Real result from Space "${result.space}" · endpoint ${result.endpoint}`}
          </div>
          {Array.isArray(result.data)
            ? result.data.map((item, i) => <ResultItem key={i} item={item} border={border} surface={isDark ? 'rgba(255,255,255,0.02)' : '#fff'} text2={text2} />)
            : <ResultItem item={result.data} border={border} surface={isDark ? 'rgba(255,255,255,0.02)' : '#fff'} text2={text2} />}
        </div>
      )}
    </div>
  )
}
