import React, { useState } from 'react'
import { ExternalLink, Github, Image, Sparkles, Video } from 'lucide-react'
import { useApp } from '../context/AppContext'

const WAN_LINKS = {
  github: 'https://github.com/Wan-Video/Wan2.1',
  api: 'https://wan.video/api',
  modelStudio: 'https://modelstudio.console.alibabacloud.com/ap-southeast-1?spm=a2ty_o05.31384571.0.0.54719f6bnNTc6q&tab=dashboard#/efm/model_experience_center/vision/videoGenerate?modelId=wan2.7-i2v',
}

function LinkButton({ href, icon, label, primary, isDark }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 800,
        textDecoration: 'none', cursor: 'pointer', transition: 'all 0.15s',
        border: primary ? '1px solid transparent' : `1px solid ${isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'}`,
        background: primary ? 'linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)' : 'transparent',
        color: primary ? '#fff' : (isDark ? '#e8f0f8' : '#172033'),
        boxShadow: primary ? '0 14px 34px rgba(139,92,246,0.28)' : 'none',
      }}
    >
      {icon}{label}
    </a>
  )
}

function FeatureCard({ icon, title, children, isDark, border, surface, text, text2 }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 16, background: surface, border: `1px solid ${border}`, borderRadius: 16 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0, background: isDark ? 'rgba(6,182,212,0.13)' : 'rgba(6,182,212,0.09)' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 900, color: text, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: text2, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  )
}

export default function MyImageToVideoPanel({ onPrev, prevLabel }) {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const vi = lang !== 'en'
  const [loaded, setLoaded] = useState(false)

  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.09)'
  const surface = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.82)'
  const text = isDark ? '#e8f0f8' : '#172033'
  const text2 = isDark ? 'rgba(232,240,248,0.66)' : '#566070'
  const text3 = isDark ? 'rgba(232,240,248,0.42)' : '#7a8494'

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4px 4px 40px' }}>
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 24, marginBottom: 18,
        border: `1px solid ${border}`,
        background: isDark
          ? 'radial-gradient(circle at 18% 8%, rgba(6,182,212,0.24), transparent 32%), radial-gradient(circle at 88% 12%, rgba(236,72,153,0.22), transparent 30%), linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,27,75,0.92))'
          : 'radial-gradient(circle at 18% 8%, rgba(6,182,212,0.18), transparent 32%), radial-gradient(circle at 88% 12%, rgba(236,72,153,0.15), transparent 30%), linear-gradient(135deg, #ffffff, #eef6ff)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 54, height: 54, borderRadius: 18, background: 'linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)', display: 'grid', placeItems: 'center', boxShadow: '0 18px 42px rgba(139,92,246,0.34)' }}>
            <Video size={26} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 23, fontWeight: 950, color: text }}>My Image to Video</h2>
              <span style={{ fontSize: 10, fontWeight: 900, padding: '3px 9px', borderRadius: 999, color: '#fff', background: 'linear-gradient(135deg, #111827, #7c3aed)' }}>Wan2.1 / Wan I2V</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13.5, color: text2, lineHeight: 1.7, maxWidth: 780 }}>
              {vi
                ? 'Menu cuối cùng để biến ảnh tĩnh thành video bằng hệ sinh thái Wan Video: mã nguồn Wan2.1, Wan API và trải nghiệm Alibaba Cloud Model Studio cho mô hình image-to-video.'
                : 'The final menu for turning still images into video with the Wan Video ecosystem: Wan2.1 source code, Wan API, and Alibaba Cloud Model Studio image-to-video experience.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <LinkButton href={WAN_LINKS.modelStudio} icon={<Sparkles size={14} />} label={vi ? 'Mở Wan I2V Studio' : 'Open Wan I2V Studio'} isDark={isDark} primary />
          <LinkButton href={WAN_LINKS.api} icon={<ExternalLink size={14} />} label={vi ? 'Tài liệu Wan API' : 'Wan API docs'} isDark={isDark} />
          <LinkButton href={WAN_LINKS.github} icon={<Github size={14} />} label="Wan2.1 GitHub" isDark={isDark} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 18 }}>
        <FeatureCard icon={<Image size={19} color="#06b6d4" />} title={vi ? 'Đầu vào là ảnh' : 'Image input'} isDark={isDark} border={border} surface={surface} text={text} text2={text2}>
          {vi ? 'Tải ảnh sản phẩm, nhân vật, avatar hoặc ảnh y tế minh họa để tạo chuyển động video.' : 'Upload product, character, avatar, or illustrative medical images to generate video motion.'}
        </FeatureCard>
        <FeatureCard icon={<Sparkles size={19} color="#8b5cf6" />} title={vi ? 'Prompt điều khiển chuyển động' : 'Motion prompt control'} isDark={isDark} border={border} surface={surface} text={text} text2={text2}>
          {vi ? 'Dùng prompt để mô tả camera, hành động, phong cách ánh sáng và nhịp chuyển cảnh.' : 'Use prompts to describe camera motion, action, lighting style, and scene pacing.'}
        </FeatureCard>
        <FeatureCard icon={<Video size={19} color="#ec4899" />} title={vi ? 'Xuất video I2V' : 'I2V video output'} isDark={isDark} border={border} surface={surface} text={text} text2={text2}>
          {vi ? 'Kết nối nhanh tới Wan API hoặc Model Studio để tạo video từ ảnh với công nghệ Wan.' : 'Jump to Wan API or Model Studio to create image-to-video outputs with Wan technology.'}
        </FeatureCard>
      </div>

      <section style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 950, color: text }}>{vi ? 'Wan Video API' : 'Wan Video API'}</div>
            <div style={{ fontSize: 12.5, color: text2, marginTop: 4 }}>{vi ? 'Khung nhúng nhanh trang API; nếu trang chặn iframe, hãy dùng nút mở tab mới phía trên.' : 'Quick embedded API page; if iframe embedding is blocked, use the open-in-new-tab buttons above.'}</div>
          </div>
          {prevLabel && (
            <button type="button" onClick={onPrev} style={{ border: `1px solid ${border}`, borderRadius: 999, background: 'transparent', color: text, padding: '9px 13px', cursor: 'pointer', fontWeight: 800 }}>
              ← {prevLabel}
            </button>
          )}
        </div>
        <div style={{ position: 'relative', width: '100%', height: 680, borderRadius: 16, overflow: 'hidden', border: `1px solid ${border}`, background: isDark ? '#05070f' : '#f4f7fb' }}>
          {!loaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: text3, fontSize: 13, fontWeight: 800 }}>
              {vi ? 'Đang tải Wan API...' : 'Loading Wan API...'}
            </div>
          )}
          <iframe title="Wan Video API" src={WAN_LINKS.api} onLoad={() => setLoaded(true)} style={{ width: '100%', height: '100%', border: 'none', opacity: loaded ? 1 : 0, transition: 'opacity 0.25s' }} allow="fullscreen" />
        </div>
      </section>
    </div>
  )
}
