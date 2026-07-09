import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Camera3DAngleGizmo, { buildCameraPrompt } from './CameraAngle3DGizmo.jsx'

// Camera Angle 3D Studio — nhúng tính năng "3D Camera Control" của
// multimodalart/qwen-image-multiple-angles-3d-camera (dùng LoRA
// fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA) vào app, cùng pattern
// realtime-Hugging-Face-Space (@gradio/client từ browser) đang dùng ở
// TwoDTo3DAssetPanel.jsx. Vật thể trung tâm của gizmo là 1 model .obj thật
// (demo mặc định: nhân vật Attack05 (45).obj) thay vì ảnh phẳng, giúp xem
// trước góc máy trực quan hơn.
const CAMERA_SPACE_URL = 'https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera'
const CAMERA_SPACE_EMBED_URL = 'https://multimodalart-qwen-image-multiple-angles-3d-camera.hf.space'
const CAMERA_SPACE_ID = 'multimodalart/qwen-image-multiple-angles-3d-camera'
const LORA_MODEL_URL = 'https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA'
const GRADIO_CLIENT_CDN = 'https://esm.sh/@gradio/client@1.18.0'
const IMAGE_TOKEN = '$IMAGE_FILE'
const DEFAULT_OBJ_URL = 'https://raw.githubusercontent.com/godekd3133/DX9_WorldSkill_Practice_Gyeonggi_01/81ed0a14c63d309bbfc0fc98c8a40a43325336e6/Resource/Player/Animation/Attack05/Attack05%20(45).obj'

const loadGradioClient = () => import(/* @vite-ignore */ GRADIO_CLIENT_CDN).then((m) => m.Client)

function replaceImageToken(value, imageFile) {
  if (Array.isArray(value)) return value.map((item) => replaceImageToken(item, imageFile))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceImageToken(v, imageFile)]))
  }
  return value === IMAGE_TOKEN ? imageFile : value
}

export default function CameraAngle3DStudioPanel() {
  const { theme } = useApp()
  const isDark = theme === 'dark'

  const [objUrl, setObjUrl] = useState(DEFAULT_OBJ_URL)
  const [camera, setCamera] = useState({ azimuth: 0, elevation: 0, distance: 1.0 })

  const [sourceImage, setSourceImage] = useState(null)
  const [sourcePreview, setSourcePreview] = useState('')
  const [spaceId, setSpaceId] = useState(CAMERA_SPACE_ID)
  const [apiEndpoint, setApiEndpoint] = useState('/infer_camera_edit')
  const [hfToken, setHfToken] = useState('')
  const [status, setStatus] = useState('Kéo 3 tay cầm 🟢🩷🟠 hoặc dùng slider để chọn góc máy, sau đó bấm "Chạy realtime".')
  const [apiSchema, setApiSchema] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [outputImage, setOutputImage] = useState('')
  const [busy, setBusy] = useState(false)
  const [objDownloadState, setObjDownloadState] = useState('idle') // 'idle' | 'downloading' | 'done' | 'error'

  const palette = useMemo(() => ({
    bg: isDark ? '#030712' : '#f3f7fb',
    card: isDark ? 'rgba(10,18,34,0.94)' : '#ffffff',
    card2: isDark ? 'rgba(15,23,42,0.86)' : '#eef6ff',
    border: isDark ? 'rgba(125,211,252,0.20)' : 'rgba(14,116,144,0.14)',
    text: isDark ? '#e5eefb' : '#162033',
    text2: isDark ? '#9fb0c8' : '#5e6a7d',
    cyan: '#22d3ee', violet: '#a78bfa', green: '#34d399', amber: '#fbbf24', red: '#fb7185',
  }), [isDark])

  const prompt = buildCameraPrompt(camera.azimuth, camera.elevation, camera.distance)

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    setSourceImage(file || null)
    setSourcePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return file ? URL.createObjectURL(file) : '' })
    setOutputImage('')
    if (file) setStatus(`Đã chọn ảnh 2D: ${file.name}. Chỉnh góc máy rồi bấm "Chạy realtime".`)
  }

  const setSlider = (key) => (e) => {
    const num = Number(e.target.value)
    setCamera((prev) => ({ ...prev, [key]: num }))
  }

  const inspectApi = () => {
    setBusy(true)
    setStatus('Đang đọc schema realtime API từ Hugging Face Space...')
    loadGradioClient()
      .then((Client) => Client.connect(spaceId, hfToken ? { hf_token: hfToken } : undefined))
      .then((client) => client.view_api())
      .then((schema) => { setApiSchema(schema); setStatus('Đã tải schema API. Nếu endpoint mặc định khác, hãy sửa lại ô "Endpoint Gradio API" theo schema.') })
      .catch((error) => setStatus(`Không đọc được schema API: ${error?.message || error}`))
      .finally(() => setBusy(false))
  }

  const runCameraEdit = () => {
    if (!sourceImage) { setStatus('Vui lòng upload ảnh 2D để đổi góc chụp trước khi chạy.'); return }
    setBusy(true)
    setStatus(`Đang gửi ảnh + prompt "${prompt}" tới Hugging Face Space...`)
    const args = [
      IMAGE_TOKEN, // image
      camera.azimuth, camera.elevation, camera.distance,
      0, true, // seed, randomize_seed
      1.0, 4, // guidance_scale, num_inference_steps
      1024, 1024, // height, width
    ]
    loadGradioClient()
      .then((Client) => Client.connect(spaceId, hfToken ? { hf_token: hfToken } : undefined))
      .then((client) => client.predict(apiEndpoint, replaceImageToken(args, sourceImage)))
      .then((result) => {
        setRawResponse(result)
        const data = result?.data || result
        const imgEntry = Array.isArray(data) ? data[0] : data
        const url = imgEntry?.url || imgEntry?.path || (typeof imgEntry === 'string' ? imgEntry : '')
        setOutputImage(url || '')
        setStatus(url ? 'Hoàn tất! Ảnh với góc chụp mới đã sẵn sàng.' : 'API đã trả kết quả nhưng chưa nhận diện được ảnh output — xem Raw response bên dưới.')
      })
      .catch((error) => setStatus(`Không chạy được realtime API: ${error?.message || error}. Hãy bấm "Đọc API" để lấy đúng endpoint/thứ tự tham số, hoặc dùng Space nhúng bên dưới.`))
      .finally(() => setBusy(false))
  }

  // Tải file .obj đang dùng trong gizmo về máy — fetch thật -> Blob -> <a
  // download> để trình duyệt lưu đúng tên file, không chỉ mở link. Nếu
  // server chặn CORS (một số repo GitHub raw/CDN), rơi về mở tab mới để tự
  // "Save As" thủ công.
  const downloadCurrentObj = async () => {
    if (!objUrl) return
    setObjDownloadState('downloading')
    try {
      const res = await fetch(objUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      let fileName = 'model.obj'
      try {
        const path = new URL(objUrl).pathname
        const base = path.split('/').pop()
        if (base) fileName = decodeURIComponent(base)
      } catch { /* giữ tên mặc định nếu URL không hợp lệ */ }
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000)
      setObjDownloadState('done')
    } catch (err) {
      console.warn('Download .obj failed, opening in new tab instead', err)
      window.open(objUrl, '_blank', 'noopener')
      setObjDownloadState('error')
    }
    setTimeout(() => setObjDownloadState('idle'), 2200)
  }

  return (
    <div style={{ minHeight: '100%', background: palette.bg, color: palette.text, padding: '28px clamp(16px, 4vw, 42px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <section style={{ border: `1px solid ${palette.border}`, background: `radial-gradient(circle at 16% 8%, rgba(34,211,238,.22), transparent 34%), radial-gradient(circle at 84% 12%, rgba(167,139,250,.20), transparent 32%), ${palette.card}`, borderRadius: 30, padding: '28px clamp(18px, 4vw, 38px)', boxShadow: isDark ? '0 28px 90px rgba(0,0,0,.42)' : '0 24px 70px rgba(14,116,144,.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 780 }}>
              <div style={{ color: palette.cyan, fontSize: 12, fontWeight: 950, letterSpacing: '.16em', textTransform: 'uppercase' }}>3D XYZ Camera Angle · Qwen Multiple-Angles LoRA</div>
              <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05 }}>Chọn góc chụp bằng gizmo 3D thật</h1>
              <p style={{ margin: 0, color: palette.text2, fontSize: 15, lineHeight: 1.7 }}>
                Kéo 3 tay cầm màu quanh mô hình <strong>.obj</strong> để chọn <strong>Azimuth</strong> (🟢 xoay ngang), <strong>Elevation</strong> (🩷 góc nghiêng), <strong>Distance</strong> (🟠 khoảng cách) — y hệt cơ chế của Space gốc, rồi gửi prompt sinh ra kèm ảnh 2D thật tới <strong>fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA</strong> để đổi góc chụp ảnh thật.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 10, minWidth: 230 }}>
              <a href={CAMERA_SPACE_URL} target="_blank" rel="noreferrer" style={linkButton(palette.cyan, '#031018')}>HF Realtime Space ↗</a>
              <a href={LORA_MODEL_URL} target="_blank" rel="noreferrer" style={linkButton(palette.violet, '#12071f')}>HF LoRA Model ↗</a>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 18, marginTop: 18 }}>

          {/* --- GIZMO 3D + SLIDERS --- */}
          <section style={cardStyle(palette)}>
            <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>🎮 3D Camera Control</h2>
            <p style={{ margin: '0 0 12px', color: palette.text2, fontSize: 12 }}>Kéo tay cầm: 🟢 Azimuth · 🩷 Elevation · 🟠 Distance</p>

            <Camera3DAngleGizmo objUrl={objUrl} value={camera} onChange={setCamera} />

            <button
              type="button"
              onClick={downloadCurrentObj}
              disabled={objDownloadState === 'downloading'}
              style={{
                marginTop: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 999, fontSize: 12, fontWeight: 800, width: '100%',
                border: `1px solid ${palette.cyan}66`, background: `${palette.cyan}1f`, color: palette.cyan,
                cursor: objDownloadState === 'downloading' ? 'wait' : 'pointer', opacity: objDownloadState === 'downloading' ? 0.7 : 1,
              }}
            >
              {objDownloadState === 'downloading' && '⏳ Đang tải...'}
              {objDownloadState === 'done' && '✅ Đã tải xong (.obj)'}
              {objDownloadState === 'error' && '↗ Đã mở tab mới'}
              {objDownloadState === 'idle' && '⬇️ Download model .obj'}
            </button>

            <label style={labelStyle(palette)}>Model .obj demo cho gizmo (đổi thử model khác)</label>
            <input value={objUrl} onChange={(e) => setObjUrl(e.target.value)} style={{ ...inputStyle(palette), fontFamily: 'monospace', fontSize: 11 }} />

            <div className="slider-row" style={{ marginTop: 14 }}>
              <label style={{ ...labelStyle(palette), margin: 0, minWidth: 130 }}>Azimuth {camera.azimuth}°</label>
              <input type="range" min={0} max={315} step={45} value={camera.azimuth} onChange={setSlider('azimuth')} style={{ flex: 1 }} />
            </div>
            <div className="slider-row">
              <label style={{ ...labelStyle(palette), margin: 0, minWidth: 130 }}>Elevation {camera.elevation}°</label>
              <input type="range" min={-30} max={60} step={30} value={camera.elevation} onChange={setSlider('elevation')} style={{ flex: 1 }} />
            </div>
            <div className="slider-row">
              <label style={{ ...labelStyle(palette), margin: 0, minWidth: 130 }}>Distance {camera.distance.toFixed(1)}</label>
              <input type="range" min={0.6} max={1.4} step={0.4} value={camera.distance} onChange={setSlider('distance')} style={{ flex: 1 }} />
            </div>

            <label style={labelStyle(palette)}>Prompt sinh ra</label>
            <div style={{ ...inputStyle(palette), fontFamily: 'monospace', fontSize: 12, color: palette.green }}>{prompt}</div>
          </section>

          {/* --- REALTIME HF SPACE --- */}
          <section style={cardStyle(palette)}>
            <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>🚀 Realtime Hugging Face API</h2>
            <label style={labelStyle(palette)}>Ảnh 2D đầu vào (ảnh thật cần đổi góc chụp)</label>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ ...inputStyle(palette), padding: 10 }} />
            {sourcePreview && <img src={sourcePreview} alt="2D source preview" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.card2, marginTop: 12 }} />}

            <label style={labelStyle(palette)}>Hugging Face Space ID</label>
            <input value={spaceId} onChange={(e) => setSpaceId(e.target.value)} style={inputStyle(palette)} />

            <label style={labelStyle(palette)}>Endpoint Gradio API</label>
            <input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} placeholder="/infer_camera_edit hoặc endpoint trong schema" style={inputStyle(palette)} />

            <label style={labelStyle(palette)}>Hugging Face token nếu Space yêu cầu</label>
            <input value={hfToken} onChange={(e) => setHfToken(e.target.value)} type="password" placeholder="hf_..." style={inputStyle(palette)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              <button type="button" onClick={inspectApi} disabled={busy} style={actionButton(palette, busy, palette.amber, '#1f1300')}>🔎 Đọc API</button>
              <button type="button" onClick={runCameraEdit} disabled={busy} style={actionButton(palette, busy, palette.cyan, '#001018')}>{busy ? 'Đang chạy...' : '⚡ Chạy realtime'}</button>
            </div>
            <p style={{ color: status.startsWith('Không') ? palette.red : palette.text2, fontSize: 12, lineHeight: 1.6 }}>{status}</p>

            {outputImage && (
              <>
                <label style={labelStyle(palette)}>Kết quả</label>
                <img src={outputImage} alt="output" style={{ width: '100%', borderRadius: 18, border: `1px solid ${palette.border}` }} />
              </>
            )}
          </section>
        </div>

        <section style={{ ...cardStyle(palette), marginTop: 18 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>🖥️ Hugging Face Space realtime nhúng</h2>
          <p style={{ marginTop: 0, color: palette.text2, fontSize: 13, lineHeight: 1.6 }}>
            Nếu Space đổi endpoint hoặc bị giới hạn CORS, dùng UI chính thức nhúng bên dưới để chạy realtime trực tiếp.
          </p>
          <iframe title="Qwen Image Multiple Angles 3D Camera" src={CAMERA_SPACE_EMBED_URL} style={{ width: '100%', height: 760, border: `1px solid ${palette.border}`, borderRadius: 18, background: palette.card2 }} allow="camera; microphone; clipboard-read; clipboard-write; fullscreen" />
          {(apiSchema || rawResponse) && (
            <details open style={{ marginTop: 14 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 900 }}>API schema / Raw response</summary>
              <pre style={{ overflow: 'auto', maxHeight: 380, background: palette.card2, color: palette.text, border: `1px solid ${palette.border}`, borderRadius: 14, padding: 12, fontSize: 11 }}>{JSON.stringify({ apiSchema, rawResponse }, null, 2)}</pre>
            </details>
          )}
        </section>
      </div>
    </div>
  )
}

function cardStyle(palette) {
  return { border: `1px solid ${palette.border}`, background: palette.card, borderRadius: 24, padding: 18, boxShadow: '0 18px 54px rgba(15,23,42,.10)' }
}
function labelStyle(palette) { return { display: 'block', color: palette.text2, fontSize: 12, fontWeight: 850, margin: '12px 0 6px' } }
function inputStyle(palette) { return { width: '100%', boxSizing: 'border-box', border: `1px solid ${palette.border}`, borderRadius: 12, background: palette.card2, color: palette.text, padding: '11px 12px', outline: 'none', font: 'inherit' } }
function linkButton(background, color) { return { display: 'inline-flex', justifyContent: 'center', textDecoration: 'none', borderRadius: 14, padding: '11px 14px', background, color, fontWeight: 950, fontSize: 13, boxShadow: '0 12px 32px rgba(0,0,0,.18)' } }
function actionButton(palette, busy, background, color) { return { border: 'none', borderRadius: 14, padding: '12px 14px', cursor: busy ? 'wait' : 'pointer', fontWeight: 950, color, background: busy ? palette.text2 : background } }
