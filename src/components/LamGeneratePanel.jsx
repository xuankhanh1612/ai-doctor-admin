import React, { useRef, useState } from 'react'
import { UploadCloud, Wand2, AlertTriangle, Download, RotateCcw, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'
import { Client } from '@gradio/client'

// Real, direct-from-browser client for the LAM (Large Avatar Model) Hugging
// Face Space (github.com/aigc3d/LAM). We deliberately do NOT proxy this
// through our own server: Vercel serverless functions hard-cap request
// bodies at 4.5MB, which a portrait photo + motion video in base64 blows
// past instantly (413 Request Entity Too Large). @gradio/client is the
// official Gradio SDK and is built to run in the browser — the browser
// talks straight to Hugging Face's real inference endpoint, so there's no
// server-side size limit and no proxy in the way. Nothing here is mocked:
// success renders whatever file(s) the model itself produced, failure
// shows the real upstream error (Space asleep, no GPU quota, etc).

const DEFAULT_SPACE = '3DAIGC/LAM'

// view_api() describes every function the Space exposes. We pick the one
// that (a) accepts an image and (b) looks like the actual "run inference"
// button rather than a helper endpoint, so this keeps working even if the
// 3DAIGC team renames internals.
function pickEndpoint(apiInfo) {
  const named = apiInfo?.named_endpoints || {}
  const candidates = Object.entries(named).map(([path, def]) => {
    const params = def.parameters || []
    const hasImage = params.some(p => /image|photo|portrait/i.test(`${p.label || ''} ${p.parameter_name || ''} ${p.component || ''}`))
    return { path, params, hasImage }
  }).filter(c => c.hasImage)
  if (!candidates.length) return null
  return candidates.find(c => /generat|submit|run|infer|reconstruct/i.test(c.path)) || candidates[0]
}

function buildPayload(params, imageFile, videoFile) {
  const payload = {}
  for (const p of params) {
    const key = p.parameter_name || p.label
    if (!key) continue
    const desc = `${p.label || ''} ${key} ${p.component || ''}`
    if (/image|photo|portrait/i.test(desc) && imageFile) payload[key] = imageFile
    else if (/video|motion/i.test(desc) && videoFile) payload[key] = videoFile
    else if (p.parameter_has_default) payload[key] = p.parameter_default
  }
  return payload
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
  const vidInputRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | connecting | running | done | error
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
  const onPickVideo = (e) => setVideoFile(e.target.files?.[0] || null)

  const reset = () => {
    setImageFile(null); setImagePreview(null); setVideoFile(null)
    setStatus('idle'); setError(null); setHint(null); setResult(null)
    if (imgInputRef.current) imgInputRef.current.value = ''
    if (vidInputRef.current) vidInputRef.current.value = ''
  }

  const generate = async () => {
    if (!imageFile) return
    setStatus('connecting'); setError(null); setHint(null); setResult(null)
    try {
      const client = await Client.connect(DEFAULT_SPACE)
      const apiInfo = await client.view_api()
      const endpoint = pickEndpoint(apiInfo)
      if (!endpoint) {
        throw new Error(vi
          ? 'Space không lộ endpoint nhận ảnh (API có thể đã đổi hoặc Space đang lỗi build).'
          : 'The Space does not expose an image-accepting endpoint (API may have changed or the Space failed to build).')
      }
      setStatus('running')
      const payload = buildPayload(endpoint.params, imageFile, videoFile)
      const res = await client.predict(endpoint.path, payload)
      setResult({ space: DEFAULT_SPACE, endpoint: endpoint.path, data: res.data })
      setStatus('done')
    } catch (err) {
      console.error('[LamGeneratePanel]', err)
      setError(err?.message || String(err))
      setHint(vi
        ? `Space công khai "${DEFAULT_SPACE}" có thể đang ngủ / hết lượt GPU (ZeroGPU) / crash. Kiểm tra trực tiếp tại huggingface.co/spaces/${DEFAULT_SPACE}, hoặc tự host LAM/OpenAvatarChat trên GPU riêng (hướng dẫn phía dưới).`
        : `The public Space "${DEFAULT_SPACE}" may be asleep / out of ZeroGPU quota / crashed. Check huggingface.co/spaces/${DEFAULT_SPACE} directly, or self-host LAM/OpenAvatarChat on your own GPU (instructions below).`)
      setStatus('error')
    }
  }

  const busy = status === 'connecting' || status === 'running'

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
          ? 'Trình duyệt của bạn gọi THẲNG tới model LAM thật (mã nguồn aigc3d/LAM) đang chạy trên Hugging Face Space, qua SDK chính thức @gradio/client — không qua server trung gian, không giới hạn dung lượng, không có kết quả giả lập. Vì đây là Space công khai dùng chung GPU, đôi khi sẽ báo lỗi thật (Space ngủ, hết lượt GPU...); lỗi đó sẽ hiện nguyên văn bên dưới.'
          : 'Your browser calls the real LAM model (aigc3d/LAM source) directly on its Hugging Face Space, via the official @gradio/client SDK — no server in between, no size limit, nothing simulated. Since it is a shared public Space, it can genuinely fail sometimes (asleep, out of GPU quota); that real error is shown verbatim below.'}
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
          disabled={!imageFile || busy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 9,
            fontSize: 12.5, fontWeight: 700, border: '1px solid transparent', cursor: imageFile ? 'pointer' : 'not-allowed',
            background: imageFile ? 'linear-gradient(135deg, #00b8cc, #6b3fd4)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
            color: imageFile ? '#fff' : text3, opacity: busy ? 0.7 : 1,
          }}>
          <UploadCloud size={14} />
          {status === 'connecting' && (vi ? 'Đang kết nối Space...' : 'Connecting to the Space...')}
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
