import React, { useRef, useState } from 'react'
import { UploadCloud, Wand2, AlertTriangle, Download, RotateCcw, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'

// Real client for /api/lam-generate — sends the actual uploaded photo (and
// optional motion video) to the server, which drives the real LAM model
// (github.com/aigc3d/LAM) running on Hugging Face's Gradio Space via the
// official @gradio/client SDK. Nothing here is mocked: success shows
// whatever file(s) the model itself produced, and failure shows the real
// upstream error (e.g. the Space being asleep or out of GPU quota).

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result) // data:<mime>;base64,....
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ResultItem({ item, border, surface, text2 }) {
  // Gradio file outputs typically arrive as { url, path, orig_name, mime_type }
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
  const vidInputRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
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
    setVideoFile(f || null)
  }

  const reset = () => {
    setImageFile(null); setImagePreview(null); setVideoFile(null)
    setStatus('idle'); setError(null); setHint(null); setResult(null)
    if (imgInputRef.current) imgInputRef.current.value = ''
    if (vidInputRef.current) vidInputRef.current.value = ''
  }

  const generate = async () => {
    if (!imageFile) return
    setStatus('uploading'); setError(null); setHint(null); setResult(null)
    try {
      const imageBase64 = await fileToBase64(imageFile)
      const videoBase64 = videoFile ? await fileToBase64(videoFile) : null
      const resp = await fetch('/api/lam-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          imageMimeType: imageFile.type,
          videoBase64,
          videoMimeType: videoFile?.type,
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
      setError(err?.message || String(err))
      setStatus('error')
    }
  }

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Wand2 size={15} color={isDark ? '#00e5ff' : '#00b8cc'} />
        <div style={{ fontSize: 13.5, fontWeight: 800, color: text }}>
          {vi ? 'Tạo avatar 3D thật từ ảnh của bạn' : 'Generate a real 3D avatar from your photo'}
        </div>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: text3, lineHeight: 1.6 }}>
        {vi
          ? 'Nút bên dưới gửi ảnh thẳng tới server, server gọi trực tiếp model LAM thật (mã nguồn aigc3d/LAM) đang chạy trên Hugging Face Space qua @gradio/client — không có kết quả giả lập. Vì đây là Space công khai dùng chung GPU, có lúc sẽ báo lỗi/timeout thật (Space ngủ, hết lượt GPU...); khi đó lỗi thật sẽ hiện ra, không bị che giấu.'
          : 'The button below sends your photo to the server, which calls the real LAM model (aigc3d/LAM source) running on its Hugging Face Space via @gradio/client — nothing here is simulated. Since it is a shared public Space, it can genuinely fail sometimes (asleep, out of GPU quota); when that happens the real error is shown, not hidden.'}
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
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

        <div>
          <input ref={vidInputRef} type="file" accept="video/*" onChange={onPickVideo} style={{ display: 'none' }} />
          <button onClick={() => vidInputRef.current?.click()} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: 140, height: 140, borderRadius: 12, cursor: 'pointer',
            border: `1.5px dashed ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
          }}>
            <VideoIcon size={20} color={text3} />
            <span style={{ fontSize: 11, color: text3, textAlign: 'center', padding: '0 8px' }}>
              {videoFile ? videoFile.name : (vi ? 'Video chuyển động (tuỳ chọn)' : 'Motion video (optional)')}
            </span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={generate}
          disabled={!imageFile || status === 'uploading'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 9,
            fontSize: 12.5, fontWeight: 700, border: '1px solid transparent', cursor: imageFile ? 'pointer' : 'not-allowed',
            background: imageFile ? 'linear-gradient(135deg, #00b8cc, #6b3fd4)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
            color: imageFile ? '#fff' : text3, opacity: status === 'uploading' ? 0.7 : 1,
          }}>
          <UploadCloud size={14} />
          {status === 'uploading'
            ? (vi ? 'Đang gọi model LAM thật...' : 'Calling the real LAM model...')
            : (vi ? 'Tạo avatar (gọi model thật)' : 'Generate (calls the real model)')}
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
