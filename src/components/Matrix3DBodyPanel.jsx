import React, { useMemo, useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'

const DEFAULT_XRAY = 'https://www.mediplus.vn/wp-content/uploads/2021/08/e9800b6989507e0e2741.jpg'

const organs = [
  { name: 'Lungs', status: 'X-ray depth fusion', risk: 18, color: 'var(--cyan)', top: '18%', left: '50%' },
  { name: 'Heart', status: 'Cardio mesh stable', risk: 12, color: 'var(--red)', top: '38%', left: '50%' },
  { name: 'Liver', status: 'Texture confidence 91%', risk: 24, color: 'var(--amber)', top: '55%', left: '42%' },
  { name: 'Kidney', status: 'Bilateral symmetry scan', risk: 15, color: 'var(--violet)', top: '62%', left: '58%' },
]

const pipeline = [
  'Input X-ray / CT / MRI image',
  'Panoramic latent path planning',
  'Organ-aware 3D Gaussian field',
  'Digital Twin health simulation',
]

function MatrixCard({ title, children, accent = 'var(--cyan)' }) {
  return (
    <section className="matrix3d-card" style={{ '--matrix-accent': accent }}>
      <div className="matrix3d-card-title">{title}</div>
      {children}
    </section>
  )
}

export default function Matrix3DBodyPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const inputRef = useRef(null)
  const [scan, setScan] = useState(DEFAULT_XRAY)
  const [fileName, setFileName] = useState('Demo chest X-ray · Mediplus reference')
  const [isDragging, setIsDragging] = useState(false)
  const [hasUploaded, setHasUploaded] = useState(false)

  const twinScore = useMemo(() => {
    const base = fileName.startsWith('Demo') ? 87 : 94
    return `${base}%`
  }, [fileName])

  const handleFile = (file) => {
    if (!file || !file.type?.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      setScan(reader.result)
      setFileName(file.name)
      setHasUploaded(true)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  return (
    <div className="matrix3d-page animate-fade">
      <div className="matrix3d-hero">
        <div className="matrix3d-hero-copy">
          <div className="matrix3d-kicker">Matrix-3D Digital Twin Health Body</div>
          <h2>Matrix-3D Body</h2>
          <p>
            Trang mô phỏng nội tạng người từ hình X-quang đầu vào, lấy cảm hứng từ Matrix-3D:
            một ảnh y tế được chuyển thành không gian 3D có thể khám phá, theo dõi cơ quan và
            chuẩn bị dữ liệu cho Digital Twin y tế.
          </p>
          <div className="matrix3d-hero-actions">
            <button type="button" onClick={() => inputRef.current?.click()}>Upload X-ray image</button>
            <a href="https://matrix-3d.github.io/" target="_blank" rel="noreferrer">Project ↗</a>
            <a href="https://arxiv.org/pdf/2508.08086" target="_blank" rel="noreferrer">Paper ↗</a>
            <a href="https://github.com/SkyworkAI/Matrix-3D" target="_blank" rel="noreferrer">GitHub ↗</a>
          </div>
        </div>

        <div
          className={`matrix3d-upload ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.dcm"
            onChange={(event) => handleFile(event.target.files?.[0])}
            style={{ display: 'none' }}
          />
          <img src={scan} alt="Uploaded X-ray input for Matrix-3D Body" />
          <div className="matrix3d-upload-overlay">
            <span>INPUT FIRST SCREEN</span>
            <strong>{fileName}</strong>
            <small>Kéo thả hoặc bấm để upload ảnh X-quang / CT / MRI</small>
          </div>
        </div>
      </div>

      {hasUploaded && (
        <div className="matrix3d-3dviewer">
          <iframe
            src="https://caskanatomy.info/open3dviewer/?model=overview-skeleton&export=on"
            title="Cask Anatomy 3D Viewer"
            allow="fullscreen"
            allowFullScreen
          />
        </div>
      )}

      <div className="matrix3d-grid">
        <MatrixCard title="3D Organ Reconstruction" accent="var(--cyan)">
          <div className="matrix3d-body-stage">
            <div className="matrix3d-body-silhouette">
              <div className="matrix3d-spine" />
              {organs.map((organ) => (
                <div
                  key={organ.name}
                  className="matrix3d-organ-node"
                  style={{ top: organ.top, left: organ.left, '--organ-color': organ.color }}
                >
                  <span />
                </div>
              ))}
            </div>
            <div className="matrix3d-scan-ring ring-one" />
            <div className="matrix3d-scan-ring ring-two" />
            <div className="matrix3d-trajectory">360° explorable path</div>
          </div>
        </MatrixCard>

        <MatrixCard title="Health Body Signals" accent="var(--green)">
          <div className="matrix3d-score-row">
            <div>
              <span>Body Twin Fidelity</span>
              <strong>{twinScore}</strong>
            </div>
            <div>
              <span>Organ Meshes</span>
              <strong>12</strong>
            </div>
          </div>
          <div className="matrix3d-organ-list">
            {organs.map((organ) => (
              <div key={organ.name} className="matrix3d-organ-row">
                <div>
                  <strong>{organ.name}</strong>
                  <span>{organ.status}</span>
                </div>
                <div className="matrix3d-risk-bar">
                  <i style={{ width: `${organ.risk + 52}%`, background: organ.color }} />
                </div>
                <em>{organ.risk}%</em>
              </div>
            ))}
          </div>
        </MatrixCard>

        <MatrixCard title="Matrix-3D Medical Pipeline" accent="var(--violet)">
          <div className="matrix3d-pipeline">
            {pipeline.map((step, index) => (
              <div key={step} className="matrix3d-pipeline-step">
                <b>{String(index + 1).padStart(2, '0')}</b>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </MatrixCard>
      </div>

      <NavButtons onNext={onNext} nextLabel={nextLabel || 'Omnidirectional 3D Body'} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
