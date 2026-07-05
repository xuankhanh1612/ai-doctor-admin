import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

const TRELLIS_REPO_URL = 'https://github.com/microsoft/TRELLIS.2'
const TRELLIS_MODEL_URL = 'https://huggingface.co/microsoft/TRELLIS.2-4B'

const PROMPT_PRESETS = [
  'Ảnh sản phẩm y tế thành mô hình GLB có PBR material',
  'Nhân vật chăm sóc sức khỏe phong cách 3D mascot',
  'Thiết bị phòng khám mini với texture kim loại và nhựa',
]

export default function My3DAssetPanel() {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const [assetName, setAssetName] = useState('My TRELLIS.2 Asset')
  const [prompt, setPrompt] = useState(PROMPT_PRESETS[0])
  const [sourceImageName, setSourceImageName] = useState('')

  const palette = useMemo(() => ({
    bg: isDark ? '#050812' : '#f4f7fb',
    card: isDark ? 'rgba(13,21,40,0.92)' : '#ffffff',
    card2: isDark ? 'rgba(17,29,53,0.9)' : '#eef6ff',
    border: isDark ? 'rgba(96,165,250,0.22)' : 'rgba(37,99,235,0.14)',
    text: isDark ? '#e2e8f0' : '#172033',
    text2: isDark ? '#94a3b8' : '#5b677a',
    accent: '#38bdf8',
    purple: '#a78bfa',
    gold: '#f59e0b',
  }), [isDark])

  const pipelineSteps = [
    { title: 'Input', body: sourceImageName || 'Upload ảnh tham chiếu / chọn prompt', icon: '🖼️' },
    { title: 'TRELLIS.2 Image-to-3D', body: 'Sinh mesh 3D textured bằng mô hình 4B và O-Voxel latent', icon: '🧠' },
    { title: 'PBR Preview', body: 'Kiểm tra base color, roughness, metallic, opacity', icon: '💡' },
    { title: 'Export', body: `${assetName || 'Asset'} → GLB / MP4 preview`, icon: '📦' },
  ]

  return (
    <div style={{ minHeight: '100%', background: palette.bg, color: palette.text, padding: '28px clamp(16px, 4vw, 42px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <section style={{
          border: `1px solid ${palette.border}`,
          background: `radial-gradient(circle at 18% 12%, rgba(56,189,248,0.22), transparent 32%), radial-gradient(circle at 86% 18%, rgba(167,139,250,0.20), transparent 30%), ${palette.card}`,
          borderRadius: 28,
          padding: '26px clamp(18px, 4vw, 36px)',
          boxShadow: isDark ? '0 26px 80px rgba(0,0,0,0.38)' : '0 24px 70px rgba(30,64,175,0.10)',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 720 }}>
              <div style={{ color: palette.accent, fontSize: 12, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>My 3D Asset · TRELLIS.2</div>
              <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(28px, 4vw, 46px)', lineHeight: 1.02 }}>
                Tạo thư viện tài sản 3D từ ảnh bằng open source TRELLIS.2
              </h1>
              <p style={{ margin: 0, color: palette.text2, fontSize: 15, lineHeight: 1.7 }}>
                Workspace này chuẩn bị luồng image-to-3D theo TRELLIS.2 của Microsoft: nhập ảnh/prompt, sinh mesh có texture PBR, xem preview và xuất GLB để dùng trong Avatar, game sức khỏe hoặc mô phỏng y khoa.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 10, minWidth: 210 }}>
              <a href={TRELLIS_REPO_URL} target="_blank" rel="noreferrer" style={linkButton(palette.accent, '#001018')}>GitHub TRELLIS.2 ↗</a>
              <a href={TRELLIS_MODEL_URL} target="_blank" rel="noreferrer" style={linkButton(palette.purple, '#12071f')}>Model TRELLIS.2-4B ↗</a>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 18, marginTop: 18 }}>
          <section style={cardStyle(palette)}>
            <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>🎛️ Cấu hình asset</h2>
            <label style={labelStyle(palette)}>Tên asset</label>
            <input value={assetName} onChange={(e) => setAssetName(e.target.value)} style={inputStyle(palette)} />

            <label style={labelStyle(palette)}>Prompt / mô tả</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} style={{ ...inputStyle(palette), resize: 'vertical', lineHeight: 1.5 }} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 16px' }}>
              {PROMPT_PRESETS.map((item) => (
                <button key={item} type="button" onClick={() => setPrompt(item)} style={{ border: `1px solid ${palette.border}`, background: palette.card2, color: palette.text, borderRadius: 999, padding: '7px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {item}
                </button>
              ))}
            </div>

            <label style={labelStyle(palette)}>Ảnh nguồn</label>
            <input type="file" accept="image/*" onChange={(e) => setSourceImageName(e.target.files?.[0]?.name || '')} style={{ ...inputStyle(palette), padding: 10 }} />
            <p style={{ color: palette.text2, fontSize: 12, lineHeight: 1.6 }}>
              Bản UI hiện tại là console chuẩn bị tích hợp. Backend TRELLIS.2 cần Linux, CUDA và GPU VRAM lớn; khi có endpoint inference, nút tạo asset sẽ gọi API để trả về GLB/MP4.
            </p>
            <button type="button" style={{ width: '100%', border: 'none', borderRadius: 14, padding: '13px 16px', fontWeight: 900, cursor: 'not-allowed', color: '#001018', background: 'linear-gradient(135deg,#38bdf8,#a78bfa)' }}>
              🚧 Tạo Asset 3D bằng TRELLIS.2 API
            </button>
          </section>

          <section style={cardStyle(palette)}>
            <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>🧬 Pipeline TRELLIS.2</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {pipelineSteps.map((step, index) => (
                <div key={step.title} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card2 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(56,189,248,0.16)', fontSize: 22 }}>{step.icon}</div>
                  <div>
                    <div style={{ fontWeight: 900 }}>{step.title}</div>
                    <div style={{ color: palette.text2, fontSize: 12, marginTop: 3 }}>{step.body}</div>
                  </div>
                  <div style={{ color: palette.gold, fontFamily: 'monospace', fontWeight: 900 }}>{String(index + 1).padStart(2, '0')}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, borderRadius: 22, border: `1px dashed ${palette.border}`, background: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(219,234,254,0.55)', minHeight: 260, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
              <div>
                <div style={{ fontSize: 70, filter: 'drop-shadow(0 18px 24px rgba(56,189,248,0.24))' }}>🧊</div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{assetName || 'My TRELLIS.2 Asset'}</div>
                <div style={{ color: palette.text2, fontSize: 13, marginTop: 8, maxWidth: 420 }}>{prompt}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function cardStyle(palette) {
  return {
    border: `1px solid ${palette.border}`,
    background: palette.card,
    borderRadius: 24,
    padding: 18,
    boxShadow: '0 18px 54px rgba(15,23,42,0.10)',
  }
}

function labelStyle(palette) {
  return { display: 'block', color: palette.text2, fontSize: 12, fontWeight: 800, margin: '12px 0 6px' }
}

function inputStyle(palette) {
  return {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${palette.border}`,
    borderRadius: 12,
    background: palette.card2,
    color: palette.text,
    padding: '11px 12px',
    outline: 'none',
    font: 'inherit',
  }
}

function linkButton(background, color) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    borderRadius: 14,
    padding: '11px 14px',
    background,
    color,
    fontWeight: 900,
    fontSize: 13,
    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
  }
}
