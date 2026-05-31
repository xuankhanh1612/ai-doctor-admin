import React from 'react'
import NavButtons from './NavButtons.jsx'

const levelOneInputs = ['X-ray', 'Hồ sơ bệnh án', 'Xét nghiệm máu']
const levelOneOrgans = ['Tim', 'Phổi', 'Gan', 'Thận']
const levelOnePipeline = ['Ảnh X-ray phổi', 'YOLO / MedSAM', 'Phân đoạn phổi', 'Mesh Reconstruction', '3D Lung Model', 'Digital Twin']
const levelTwoPipeline = ['DICOM CT', 'MONAI', 'Segmentation', 'Marching Cubes', '3D Mesh', 'Gaussian Splatting', 'Digital Twin Viewer']
const humanBodyTree = ['Brain', 'Lung', 'Heart', 'Liver', 'Kidney', 'Blood Vessel', 'Tumor', 'Lymph Nodes']
const stack = ['MONAI', 'MedSAM', '3D Slicer', 'Gaussian Splatting', 'Three.js', 'React']

function OmniCard({ title, subtitle, children, accent = 'var(--cyan)' }) {
  return (
    <section className="omni-card" style={{ '--omni-accent': accent }}>
      <div className="omni-card-heading">
        <span>{title}</span>
        {subtitle && <small>{subtitle}</small>}
      </div>
      {children}
    </section>
  )
}

function Pipeline({ steps, className = '' }) {
  return (
    <div className={`omni-pipeline ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="omni-pipeline-node">
            <b>{String(index + 1).padStart(2, '0')}</b>
            <span>{step}</span>
          </div>
          {index < steps.length - 1 && <div className="omni-pipeline-arrow">↓</div>}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function OmnidirectionalBodyGenerationPanel({ onNext, onPrev, prevLabel }) {
  return (
    <div className="omni-page animate-fade">
      <div className="omni-hero">
        <div>
          <div className="omni-kicker">Digital Twin Health 3D Architecture</div>
          <h2>Omnidirectional Explorable 3D Body Generation</h2>
          <p>
            Kiến trúc tạo một thế giới 3D có thể khám phá cho cơ thể người — giống Matrix-3D,
            WorldLabs hoặc Google Maps, nhưng tập trung vào hành trình y tế từ ảnh chẩn đoán,
            hồ sơ bệnh án và xét nghiệm đến Human Body Avatar 3D.
          </p>
        </div>
        <div className="omni-world-preview" aria-label="Explorable human body world preview">
          <div className="omni-orbit orbit-a" />
          <div className="omni-orbit orbit-b" />
          <div className="omni-avatar-core">
            <span className="omni-avatar-head" />
            <span className="omni-avatar-body" />
            <i style={{ '--dot-x': '44%', '--dot-y': '30%', '--dot-color': 'var(--cyan)' }} />
            <i style={{ '--dot-x': '52%', '--dot-y': '41%', '--dot-color': 'var(--red)' }} />
            <i style={{ '--dot-x': '47%', '--dot-y': '55%', '--dot-color': 'var(--amber)' }} />
            <i style={{ '--dot-x': '57%', '--dot-y': '64%', '--dot-color': 'var(--violet)' }} />
          </div>
          <strong>Human Body Avatar 3D</strong>
          <small>zoom · pan · organ drill-down · clinical layers</small>
        </div>
      </div>

      <div className="omni-level-grid">
        <OmniCard title="Level 1 (MVP)" subtitle="X-ray + hồ sơ + xét nghiệm máu" accent="var(--green)">
          <div className="omni-two-column">
            <div>
              <h3>Input</h3>
              <div className="omni-chip-list">
                {levelOneInputs.map(item => <span key={item}>{item}</span>)}
              </div>
            </div>
            <div>
              <h3>Output</h3>
              <div className="omni-output-box">
                <strong>Human Body Avatar 3D</strong>
                <small>Các cơ quan cơ bản: {levelOneOrgans.join(' · ')}</small>
              </div>
            </div>
          </div>
          <Pipeline steps={levelOnePipeline} />
        </OmniCard>

        <OmniCard title="Level 2" subtitle="CT Scan DICOM → chuẩn y khoa" accent="var(--violet)">
          <div className="omni-two-column">
            <div>
              <h3>Input</h3>
              <div className="omni-dicom-box">CT Scan DICOM</div>
            </div>
            <div>
              <h3>Output</h3>
              <div className="omni-output-box">
                <strong>3D Reconstruction chuẩn y khoa</strong>
                <small>Mesh + Gaussian field + interactive viewer</small>
              </div>
            </div>
          </div>
          <Pipeline steps={levelTwoPipeline} className="is-compact" />
        </OmniCard>
      </div>

      <div className="omni-architecture-grid">
        <OmniCard title="Explorable Human Body World" subtitle="organ map hierarchy" accent="var(--cyan)">
          <div className="omni-body-tree">
            <div className="omni-tree-root">Human Body</div>
            <div className="omni-tree-branches">
              {humanBodyTree.map((node) => (
                <div key={node} className={node === 'Tumor' ? 'is-alert' : ''}>
                  <span />
                  {node}
                </div>
              ))}
            </div>
          </div>
        </OmniCard>

        <OmniCard title="Pipeline Stack" subtitle="model + medical tooling + viewer" accent="var(--amber)">
          <div className="omni-stack-grid">
            {stack.map((item, index) => (
              <div key={item} className="omni-stack-item">
                <b>{item}</b>
                <small>{index < stack.length - 1 ? '+' : 'Viewer UI'}</small>
              </div>
            ))}
          </div>
        </OmniCard>

        <OmniCard title="Digital Twin Viewer Layers" subtitle="clinical navigation model" accent="var(--pink)">
          <div className="omni-layer-list">
            {[
              ['Geometry', '3D mesh, Gaussian splats, organ boundaries'],
              ['Clinical', 'Bệnh án, xét nghiệm máu, biomarkers'],
              ['AI Segmentation', 'YOLO, MedSAM, MONAI masks'],
              ['Navigation', 'Google Maps-like zoom to organ, lesion, lymph node'],
            ].map(([title, copy]) => (
              <div key={title}>
                <strong>{title}</strong>
                <span>{copy}</span>
              </div>
            ))}
          </div>
        </OmniCard>
      </div>

      <NavButtons onNext={onNext} nextLabel="Tiếp tục tới Digital Twin →" onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
