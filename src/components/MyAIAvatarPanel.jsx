import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'

const LAM_GITHUB_URL = 'https://github.com/aigc3d/LAM'
const LAM_PROJECT_URL = 'https://aigc3d.github.io/projects/LAM/'

export default function MyAIAvatarPanel() {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const vi = lang === 'vi'
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const palette = useMemo(() => ({
    text: isDark ? '#e8f0f8' : '#172033',
    text2: isDark ? 'rgba(232,240,248,0.68)' : '#526071',
    text3: isDark ? 'rgba(232,240,248,0.45)' : '#7b8794',
    card: isDark ? 'rgba(255,255,255,0.055)' : '#fff',
    card2: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)',
    accent: '#00e5ff',
    violet: '#9c6fff',
    green: '#00e676',
  }), [isDark])

  const handlePickImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFileName(file.name)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const pipeline = [
    vi ? 'Tải ảnh chân dung rõ mặt' : 'Upload a clear portrait',
    vi ? 'LAM suy luận đầu 3D từ một ảnh' : 'LAM infers a 3D head from one image',
    vi ? 'Kiểm tra mesh / texture / biểu cảm' : 'Review mesh, texture, and expressions',
    vi ? 'Xuất sang Digital Twin / VRM workflow' : 'Export into the Digital Twin / VRM workflow',
  ]

  return (
    <div style={{ padding: 24, color: palette.text, maxWidth: 1320, margin: '0 auto' }}>
      <style>{`
        .lam-card { border:1px solid ${palette.border}; border-radius:22px; background:${palette.card}; box-shadow:${isDark ? '0 20px 70px rgba(0,0,0,.26)' : '0 18px 55px rgba(15,23,42,.08)'}; }
        .lam-btn { border:1px solid ${palette.border}; border-radius:14px; padding:11px 14px; font-weight:900; font-family:inherit; cursor:pointer; }
        .lam-grid { display:grid; grid-template-columns:minmax(280px, .9fr) minmax(360px, 1.1fr); gap:18px; }
        @media (max-width: 900px) { .lam-grid { grid-template-columns:1fr; } }
      `}</style>

      <section className="lam-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '26px 28px', background: 'radial-gradient(circle at top left, rgba(0,229,255,.24), transparent 34%), linear-gradient(135deg, rgba(156,111,255,.20), rgba(0,229,255,.10))', borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: palette.accent, fontWeight: 900 }}>LAM · Large Avatar Model</div>
              <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05 }}>My AI Avatar</h1>
              <p style={{ margin: 0, maxWidth: 760, color: palette.text2, lineHeight: 1.65 }}>
                {vi
                  ? 'Không gian tích hợp ý tưởng LAM để biến ảnh chân dung thành avatar 3D cá nhân, sẵn sàng nối vào hồ sơ Digital Twin, hồ sơ sức khỏe và các trải nghiệm VRM trong ứng dụng.'
                  : 'A LAM-inspired workspace for turning a portrait into a personal 3D avatar, ready to connect with Digital Twin records, health profiles, and VRM experiences in this app.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a className="lam-btn" href={LAM_PROJECT_URL} target="_blank" rel="noreferrer" style={{ color: '#001018', background: palette.accent, textDecoration: 'none' }}>Project ↗</a>
              <a className="lam-btn" href={LAM_GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: palette.text, background: palette.card, textDecoration: 'none' }}>GitHub ↗</a>
            </div>
          </div>
        </div>

        <div className="lam-grid" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="lam-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: palette.text3, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>{vi ? 'Ảnh đầu vào' : 'Input portrait'}</div>
              <label style={{ display: 'grid', placeItems: 'center', minHeight: 320, border: `2px dashed ${palette.border}`, borderRadius: 20, background: palette.card2, cursor: 'pointer', overflow: 'hidden' }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected portrait preview" style={{ width: '100%', height: 320, objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: 28 }}>
                    <div style={{ fontSize: 54, marginBottom: 12 }}>🧑‍🚀</div>
                    <div style={{ fontWeight: 900 }}>{vi ? 'Chọn ảnh chân dung' : 'Choose a portrait'}</div>
                    <div style={{ color: palette.text3, fontSize: 12, marginTop: 8 }}>PNG · JPG · WebP</div>
                  </div>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePickImage} style={{ display: 'none' }} />
              </label>
              {fileName && <div style={{ marginTop: 10, color: palette.green, fontSize: 12, fontWeight: 800 }}>✓ {fileName}</div>}
            </div>

            <div className="lam-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: palette.text3, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>{vi ? 'Pipeline đề xuất' : 'Suggested pipeline'}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {pipeline.map((item, index) => (
                  <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'center', color: palette.text2 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 10, display: 'grid', placeItems: 'center', background: index === 1 ? 'rgba(156,111,255,.18)' : 'rgba(0,229,255,.12)', color: index === 1 ? palette.violet : palette.accent, fontWeight: 900 }}>{index + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lam-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 6, padding: 12, borderBottom: `1px solid ${palette.border}`, background: palette.card2, flexWrap: 'wrap' }}>
              {[['overview', vi ? 'Tổng quan' : 'Overview'], ['demo', 'LAM Demo'], ['implementation', vi ? 'Tích hợp' : 'Implementation']].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setActiveTab(id)} className="lam-btn" style={{ background: activeTab === id ? 'rgba(0,229,255,.16)' : 'transparent', color: activeTab === id ? palette.accent : palette.text2, padding: '8px 12px' }}>{label}</button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div style={{ padding: 22, display: 'grid', gap: 16 }}>
                <Feature title="Single-image avatar" text={vi ? 'Dùng một ảnh cá nhân để khởi tạo đầu 3D, phù hợp onboarding hồ sơ sức khỏe.' : 'Use one personal image to initialize a 3D head for health-profile onboarding.'} palette={palette} />
                <Feature title="Digital Twin ready" text={vi ? 'Thiết kế để kết nối với trang Digital Twin, VRM viewer và avatar hồ sơ hiện có.' : 'Designed to connect with Digital Twin, the VRM viewer, and the existing profile avatar.'} palette={palette} />
                <Feature title="Open-source reference" text={vi ? 'Liên kết trực tiếp mã nguồn LAM và trang project để đội kỹ thuật triển khai backend/GPU khi sẵn sàng.' : 'Direct links to LAM source and project page so engineering can wire backend/GPU generation when ready.'} palette={palette} />
              </div>
            )}

            {activeTab === 'demo' && (
              <iframe title="LAM project page" src={LAM_PROJECT_URL} style={{ width: '100%', height: 640, border: 0, background: '#fff' }} />
            )}

            {activeTab === 'implementation' && (
              <div style={{ padding: 22, color: palette.text2, lineHeight: 1.7 }}>
                <h2 style={{ color: palette.text, marginTop: 0 }}>{vi ? 'Kế hoạch tích hợp LAM' : 'LAM integration plan'}</h2>
                <ol>
                  <li>{vi ? 'Tạo API job nhận ảnh chân dung và gọi worker LAM trên GPU.' : 'Create a job API that accepts portraits and calls a GPU LAM worker.'}</li>
                  <li>{vi ? 'Lưu kết quả mesh/texture vào thư viện người dùng.' : 'Store generated mesh/texture artifacts in the user library.'}</li>
                  <li>{vi ? 'Cho phép xem trước trong Three.js/VRM viewer và đặt làm avatar hồ sơ.' : 'Preview in the Three.js/VRM viewer and set as the profile avatar.'}</li>
                  <li>{vi ? 'Thêm cảnh báo quyền riêng tư vì ảnh khuôn mặt là dữ liệu nhạy cảm.' : 'Add privacy warnings because face images are sensitive data.'}</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Feature({ title, text, palette }) {
  return (
    <div style={{ border: `1px solid ${palette.border}`, borderRadius: 18, padding: 16, background: palette.card2 }}>
      <div style={{ fontWeight: 900, color: palette.text, marginBottom: 6 }}>{title}</div>
      <div style={{ color: palette.text2, fontSize: 13 }}>{text}</div>
    </div>
  )
}
