import React from 'react'
import { useApp } from '../context/AppContext'

const SPACE_URL = 'https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera'
const LORA_URL = 'https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA'
const SPACE_EMBED_URL = 'https://multimodalart-qwen-image-multiple-angles-3d-camera.hf.space'

export default function XyzCameraAnglePanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const c = {
    bg: isDark ? 'var(--bg2)' : '#f4f7fb',
    panel: isDark ? 'rgba(8,12,26,.92)' : '#ffffff',
    panel2: isDark ? 'rgba(255,255,255,.04)' : '#f8fafc',
    text: isDark ? '#e8f0f8' : '#102033',
    text2: isDark ? 'rgba(232,240,248,.68)' : '#526172',
    border: isDark ? 'rgba(255,255,255,.10)' : 'rgba(15,23,42,.10)',
    accent: '#00e5ff',
    violet: '#9c6fff',
  }

  return (
    <div style={{ minHeight: '100%', padding: 24, background: c.bg, color: c.text }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}>
        <section style={{ border: `1px solid ${c.border}`, borderRadius: 24, padding: 22, background: `linear-gradient(135deg, ${isDark ? 'rgba(0,229,255,.12)' : 'rgba(0,184,204,.10)'}, ${isDark ? 'rgba(156,111,255,.12)' : 'rgba(156,111,255,.09)'}), ${c.panel}` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: c.accent, textTransform: 'uppercase' }}>Qwen Image · Multiple Angles · XYZ Camera</div>
              <h1 style={{ margin: '8px 0 8px', fontSize: 30, lineHeight: 1.15 }}>📐 Góc chụp toạ độ XYZ</h1>
              <p style={{ margin: 0, color: c.text2, maxWidth: 760, lineHeight: 1.6 }}>
                Không gian thử nghiệm tạo/chỉnh ảnh theo nhiều góc camera 3D, hỗ trợ tham khảo workflow từ Hugging Face Space và LoRA Qwen Image Edit Multiple Angles.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href={SPACE_URL} target="_blank" rel="noreferrer" style={buttonStyle(c.accent)}>Mở Space ↗</a>
              <a href={LORA_URL} target="_blank" rel="noreferrer" style={buttonStyle(c.violet)}>Mở LoRA ↗</a>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {[
            ['X / Y / Z', 'Điều chỉnh hướng nhìn và vị trí camera theo trục toạ độ để tạo nhiều góc chụp nhất quán.'],
            ['Multiple angles', 'Dùng cùng một ý tưởng hoặc ảnh nguồn để khám phá các góc trước, bên, sau, nghiêng.'],
            ['Qwen LoRA', 'Liên kết LoRA fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA để tham khảo model nền.'],
          ].map(([title, copy]) => (
            <article key={title} style={{ border: `1px solid ${c.border}`, borderRadius: 18, padding: 16, background: c.panel }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 17 }}>{title}</h2>
              <p style={{ margin: 0, color: c.text2, lineHeight: 1.55, fontSize: 13 }}>{copy}</p>
            </article>
          ))}
        </section>

        <section style={{ border: `1px solid ${c.border}`, borderRadius: 24, overflow: 'hidden', background: c.panel }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}`, background: c.panel2, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <strong>Hugging Face Space nhúng trực tiếp</strong>
            <span style={{ color: c.text2, fontSize: 12 }}>Nếu Space không tải do chính sách nhúng, hãy dùng nút “Mở Space”.</span>
          </div>
          <iframe
            title="Qwen Image Multiple Angles 3D Camera"
            src={SPACE_EMBED_URL}
            style={{ width: '100%', height: 'min(78vh, 760px)', border: 0, background: '#0f172a' }}
            allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
          />
        </section>

        <div className="screen-nav-buttons">
          <button type="button" className="screen-nav-button screen-nav-button-prev" onClick={onPrev}>← {prevLabel || 'Quay lại'}</button>
          <span className="screen-nav-spacer" />
          <button type="button" className="screen-nav-button screen-nav-button-next" onClick={onNext}>{nextLabel || 'Tiếp theo'} →</button>
        </div>
      </div>
    </div>
  )
}

function buttonStyle(color) {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 40, padding: '0 14px', borderRadius: 999,
    background: `${color}22`, border: `1px solid ${color}66`, color,
    fontWeight: 900, textDecoration: 'none', fontSize: 13,
  }
}
