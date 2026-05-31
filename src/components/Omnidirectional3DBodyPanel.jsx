import React from 'react'
import NavButtons from './NavButtons.jsx'

const mvpInputs = ['X-ray', 'Hồ sơ bệnh án', 'Xét nghiệm máu']
const mvpOrgans = ['Tim', 'Phổi', 'Gan', 'Thận']
const levelOnePipeline = ['Ảnh X-ray phổi', 'YOLO / MedSAM', 'Phân đoạn phổi', 'Mesh Reconstruction', '3D Lung Model', 'Digital Twin']
const levelTwoPipeline = ['DICOM CT', 'MONAI', 'Segmentation', 'Marching Cubes', '3D Mesh', 'Gaussian Splatting', 'Digital Twin Viewer']
const bodyTree = ['Brain', 'Lung', 'Heart', 'Liver', 'Kidney', 'Blood Vessel', 'Tumor', 'Lymph Nodes']
const stack = ['MONAI', 'MedSAM', '3D Slicer', 'Gaussian Splatting', 'Three.js', 'React']

function OmniCard({ title, eyebrow, children, accent = 'var(--cyan)' }) {
  return (
    <section className="omni3d-card" style={{ '--omni-accent': accent }}>
      {eyebrow && <div className="omni3d-eyebrow">{eyebrow}</div>}
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function Flow({ steps, variant = 'mvp' }) {
  return (
    <div className={`omni3d-flow omni3d-flow-${variant}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="omni3d-flow-node">
            <b>{String(index + 1).padStart(2, '0')}</b>
            <span>{step}</span>
          </div>
          {index < steps.length - 1 && <div className="omni3d-flow-arrow">↓</div>}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function Omnidirectional3DBodyPanel({ onNext, onPrev, prevLabel }) {
  return (
    <div className="omni3d-page animate-fade">
      <section className="omni3d-hero">
        <div>
          <div className="omni3d-kicker">Digital Twin Health 3D Architecture</div>
          <h2>Omnidirectional Explorable 3D Body Generation</h2>
          <p>
            Kiến trúc biến dữ liệu y tế thành một thế giới 3D có thể khám phá — giống Matrix-3D,
            WorldLabs hoặc Google Maps, nhưng dành riêng cho cơ thể người và Digital Twin sức khỏe.
          </p>
        </div>
        <div className="omni3d-world-preview" aria-label="Omnidirectional human body world preview">
          <div className="omni3d-orbit orbit-a" />
          <div className="omni3d-orbit orbit-b" />
          <div className="omni3d-avatar-core">
            <span className="brain" />
            <span className="lung left" />
            <span className="lung right" />
            <span className="heart" />
            <span className="liver" />
            <span className="kidney left" />
            <span className="kidney right" />
          </div>
          <div className="omni3d-map-pin pin-one">Lung</div>
          <div className="omni3d-map-pin pin-two">Tumor</div>
          <div className="omni3d-map-pin pin-three">Vessel</div>
        </div>
      </section>

      <div className="omni3d-layout">
        <OmniCard title="Level 1 (MVP)" eyebrow="Fast clinical prototype" accent="var(--green)">
          <div className="omni3d-io-grid">
            <div>
              <strong>Input</strong>
              {mvpInputs.map(item => <span key={item}>{item}</span>)}
            </div>
            <div>
              <strong>Output</strong>
              <span>Human Body Avatar 3D</span>
              <span>Cơ quan cơ bản: {mvpOrgans.join(' · ')}</span>
            </div>
          </div>
          <Flow steps={levelOnePipeline} />
        </OmniCard>

        <OmniCard title="Level 2" eyebrow="Medical-grade reconstruction" accent="var(--violet)">
          <div className="omni3d-io-grid">
            <div>
              <strong>Input</strong>
              <span>CT Scan DICOM</span>
            </div>
            <div>
              <strong>Output</strong>
              <span>3D Reconstruction chuẩn y khoa</span>
              <span>Explorable Digital Twin Viewer</span>
            </div>
          </div>
          <Flow steps={levelTwoPipeline} variant="dicom" />
        </OmniCard>
      </div>

      <div className="omni3d-lower-grid">
        <OmniCard title="Human Body World Tree" eyebrow="Navigable anatomy graph" accent="var(--cyan)">
          <div className="omni3d-tree">
            <div className="omni3d-tree-root">Human Body</div>
            {bodyTree.map((node) => (
              <div key={node} className={`omni3d-tree-node ${node === 'Tumor' ? 'is-alert' : ''}`}>
                <i />
                <span>{node}</span>
              </div>
            ))}
          </div>
        </OmniCard>

        <OmniCard title="Pipeline Stack" eyebrow="Model + Viewer implementation" accent="var(--amber)">
          <div className="omni3d-stack">
            {stack.map((item, index) => (
              <div key={item} className="omni3d-stack-chip">
                <b>{index === stack.length - 1 ? '=' : '+'}</b>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="omni3d-note">
            MONAI và MedSAM tạo phân đoạn y khoa; 3D Slicer và Marching Cubes tạo mesh;
            Gaussian Splatting, Three.js và React biến kết quả thành viewer 3D có thể khám phá.
          </p>
        </OmniCard>
      </div>

      <NavButtons onNext={onNext} nextLabel="Tiếp tục tới Digital Twin →" onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
