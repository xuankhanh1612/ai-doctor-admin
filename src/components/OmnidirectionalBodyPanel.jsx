import React from 'react'
import NavButtons from './NavButtons.jsx'

const levelOneInputs = ['X-ray', 'Hồ sơ bệnh án', 'Xét nghiệm máu']
const levelOneOutputs = ['Human Body Avatar 3D', 'Tim', 'Phổi', 'Gan', 'Thận']
const levelOnePipeline = ['Ảnh X-ray phổi', 'YOLO / MedSAM', 'Phân đoạn phổi', 'Mesh Reconstruction', '3D Lung Model', 'Digital Twin']
const levelTwoPipeline = ['DICOM CT', 'MONAI', 'Segmentation', 'Marching Cubes', '3D Mesh', 'Gaussian Splatting', 'Digital Twin Viewer']
const bodyTree = ['Brain', 'Lung', 'Heart', 'Liver', 'Kidney', 'Blood Vessel', 'Tumor', 'Lymph Nodes']
const stack = ['MONAI', 'MedSAM', '3D Slicer', 'Gaussian Splatting', 'Three.js', 'React']

function OmniSection({ eyebrow, title, children, tone = 'cyan' }) {
  return (
    <section className={`omni-card omni-card-${tone}`}>
      <div className="omni-eyebrow">{eyebrow}</div>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function Flow({ items, compact = false }) {
  return (
    <div className={`omni-flow ${compact ? 'omni-flow-compact' : ''}`}>
      {items.map((item, index) => (
        <React.Fragment key={item}>
          <div className="omni-flow-node">
            <b>{String(index + 1).padStart(2, '0')}</b>
            <span>{item}</span>
          </div>
          {index < items.length - 1 && <div className="omni-flow-arrow">↓</div>}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function OmnidirectionalBodyPanel({ onNext, onPrev, prevLabel }) {
  return (
    <div className="omni-page animate-fade">
      <div className="omni-hero">
        <div>
          <div className="omni-kicker">Digital Twin Health 3D Architecture</div>
          <h2>Omnidirectional Explorable 3D Body Generation</h2>
          <p>
            Kiến trúc chuyển dữ liệu y tế đa nguồn thành một thế giới 3D có thể khám phá giống
            Matrix-3D, WorldLabs và Google Maps, nhưng dành riêng cho cơ thể người và Digital Twin Health.
          </p>
        </div>
        <div className="omni-world-preview" aria-label="Omnidirectional explorable human body preview">
          <div className="omni-orbit omni-orbit-a" />
          <div className="omni-orbit omni-orbit-b" />
          <div className="omni-avatar">
            <i className="omni-brain" />
            <i className="omni-lung left" />
            <i className="omni-lung right" />
            <i className="omni-heart" />
            <i className="omni-liver" />
            <i className="omni-kidney left" />
            <i className="omni-kidney right" />
          </div>
          <span className="omni-preview-label">360° Body World</span>
        </div>
      </div>

      <div className="omni-level-grid">
        <OmniSection eyebrow="Level 1 · MVP" title="X-ray + hồ sơ + xét nghiệm máu → Avatar 3D">
          <div className="omni-two-col">
            <div>
              <h4>Input</h4>
              <ul className="omni-chip-list">
                {levelOneInputs.map(input => <li key={input}>{input}</li>)}
              </ul>
            </div>
            <div>
              <h4>Output</h4>
              <ul className="omni-chip-list omni-chip-list-green">
                {levelOneOutputs.map(output => <li key={output}>{output}</li>)}
              </ul>
            </div>
          </div>
          <div className="omni-example">
            <div className="omni-example-title">Ví dụ MVP: ảnh X-ray phổi → Digital Twin</div>
            <Flow items={levelOnePipeline} compact />
          </div>
        </OmniSection>

        <OmniSection eyebrow="Level 2 · Medical Grade" title="CT Scan DICOM → 3D Reconstruction chuẩn y khoa" tone="violet">
          <div className="omni-output-banner">
            <span>Output</span>
            <strong>3D Reconstruction chuẩn y khoa</strong>
          </div>
          <Flow items={levelTwoPipeline} />
        </OmniSection>
      </div>

      <div className="omni-bottom-grid">
        <OmniSection eyebrow="Human Body Graph" title="Cây cơ quan trong thế giới 3D" tone="green">
          <div className="omni-tree">
            <div className="omni-tree-root">Human Body</div>
            {bodyTree.map((node) => (
              <div key={node} className="omni-tree-node">
                <span>├─</span>
                <strong>{node}</strong>
              </div>
            ))}
          </div>
        </OmniSection>

        <OmniSection eyebrow="Pipeline Stack" title="MONAI + MedSAM + 3D Slicer + Gaussian Splatting + Three.js + React" tone="amber">
          <div className="omni-stack">
            {stack.map((tool, index) => (
              <React.Fragment key={tool}>
                <div className="omni-stack-tool">{tool}</div>
                {index < stack.length - 1 && <div className="omni-stack-plus">+</div>}
              </React.Fragment>
            ))}
          </div>
          <p className="omni-note">
            Frontend hiện mô tả kiến trúc và viewer concept; backend/model thật có thể nối từng bước
            với DICOM, segmentation, mesh, Gaussian Splatting và Three.js viewer.
          </p>
        </OmniSection>
      </div>

      <NavButtons onNext={onNext} nextLabel="Tiếp tục tới Digital Twin →" onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
