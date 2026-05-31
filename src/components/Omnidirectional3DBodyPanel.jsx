import React from 'react'
import NavButtons from './NavButtons.jsx'

const mvpInputs = ['X-ray', 'Hồ sơ bệnh án', 'Xét nghiệm máu']
const mvpOutputs = ['Human Body Avatar 3D', 'Tim', 'Phổi', 'Gan', 'Thận']
const levelOnePipeline = ['Ảnh X-ray phổi', 'YOLO / MedSAM', 'Phân đoạn phổi', 'Mesh Reconstruction', '3D Lung Model', 'Digital Twin']
const levelTwoPipeline = ['DICOM CT', 'MONAI', 'Segmentation', 'Marching Cubes', '3D Mesh', 'Gaussian Splatting', 'Digital Twin Viewer']
const humanBodyNodes = ['Brain', 'Lung', 'Heart', 'Liver', 'Kidney', 'Blood Vessel', 'Tumor', 'Lymph Nodes']
const stack = ['MONAI', 'MedSAM', '3D Slicer', 'Gaussian Splatting', 'Three.js', 'React']

function ArchitectureCard({ eyebrow, title, children, accent = 'var(--cyan)' }) {
  return (
    <section className="omni3d-card" style={{ '--omni-accent': accent }}>
      <div className="omni3d-eyebrow">{eyebrow}</div>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function PillList({ items }) {
  return (
    <div className="omni3d-pill-list">
      {items.map((item) => <span key={item}>{item}</span>)}
    </div>
  )
}

function PipelineRail({ steps, compact = false }) {
  return (
    <div className={`omni3d-pipeline-rail ${compact ? 'is-compact' : ''}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="omni3d-pipeline-node">
            <b>{String(index + 1).padStart(2, '0')}</b>
            <span>{step}</span>
          </div>
          {index < steps.length - 1 && <div className="omni3d-pipeline-arrow">↓</div>}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function Omnidirectional3DBodyPanel({ onNext, onPrev, prevLabel }) {
  return (
    <div className="omni3d-page animate-fade">
      <div className="omni3d-hero">
        <div>
          <div className="omni3d-kicker">Digital Twin Health 3D Architecture</div>
          <h2>Omnidirectional Explorable 3D Body Generation</h2>
          <p>
            Kiến trúc tạo cơ thể người 3D đa hướng: từ X-ray, hồ sơ bệnh án, xét nghiệm máu và CT DICOM
            thành một thế giới Digital Twin có thể khám phá giống Matrix-3D, WorldLabs và Google Maps,
            nhưng dành riêng cho cơ thể người.
          </p>
        </div>
        <div className="omni3d-world-preview" aria-label="Explorable 3D human body world preview">
          <div className="omni3d-orbit orbit-a" />
          <div className="omni3d-orbit orbit-b" />
          <div className="omni3d-avatar">
            <span className="brain" />
            <span className="lung left" />
            <span className="lung right" />
            <span className="heart" />
            <span className="liver" />
            <span className="kidney left" />
            <span className="kidney right" />
          </div>
          <div className="omni3d-map-label">360° Digital Twin Viewer</div>
        </div>
      </div>

      <div className="omni3d-level-grid">
        <ArchitectureCard eyebrow="Level 1 · MVP" title="X-ray → Basic Human Body Avatar 3D" accent="var(--green)">
          <div className="omni3d-io-grid">
            <div>
              <strong>Input</strong>
              <PillList items={mvpInputs} />
            </div>
            <div>
              <strong>Output</strong>
              <PillList items={mvpOutputs} />
            </div>
          </div>
          <div className="omni3d-example-title">Ví dụ pipeline phổi</div>
          <PipelineRail steps={levelOnePipeline} />
        </ArchitectureCard>

        <ArchitectureCard eyebrow="Level 2" title="CT DICOM → Medical-grade 3D Reconstruction" accent="var(--violet)">
          <div className="omni3d-io-grid single-output">
            <div>
              <strong>Input</strong>
              <PillList items={['CT Scan DICOM']} />
            </div>
            <div>
              <strong>Output</strong>
              <PillList items={['3D Reconstruction chuẩn y khoa', 'Digital Twin Viewer']} />
            </div>
          </div>
          <PipelineRail steps={levelTwoPipeline} compact />
        </ArchitectureCard>
      </div>

      <div className="omni3d-viewer-grid">
        <ArchitectureCard eyebrow="Explorable World" title="Human Body Digital Twin Map" accent="var(--cyan)">
          <div className="omni3d-body-tree">
            <div className="omni3d-tree-root">Human Body</div>
            {humanBodyNodes.map((node) => (
              <div key={node} className="omni3d-tree-node">
                <span />
                {node}
              </div>
            ))}
          </div>
        </ArchitectureCard>

        <ArchitectureCard eyebrow="Implementation Pipeline" title="Model + Viewer Stack" accent="var(--amber)">
          <div className="omni3d-stack-flow">
            {stack.map((item, index) => (
              <React.Fragment key={item}>
                <div className="omni3d-stack-chip">{item}</div>
                {index < stack.length - 1 && <span>+</span>}
              </React.Fragment>
            ))}
          </div>
          <p className="omni3d-stack-note">
            MONAI/MedSAM xử lý segmentation, 3D Slicer kiểm chứng y khoa, Gaussian Splatting dựng không gian 3D,
            Three.js + React hiển thị viewer tương tác trong web app.
          </p>
        </ArchitectureCard>
      </div>

      <NavButtons onNext={onNext} nextLabel="Tiếp tục tới Digital Twin →" onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
