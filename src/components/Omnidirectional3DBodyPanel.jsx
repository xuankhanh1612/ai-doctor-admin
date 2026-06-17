import React, { useState } from 'react'
import NavButtons from './NavButtons.jsx'

const mvpInputs = ['X-ray', 'Hồ sơ bệnh án', 'Xét nghiệm máu']
const mvpOrgans = ['Tim / Heart', 'Phổi / Lung', 'Gan / Liver', 'Thận / Kidney']
const levelOnePipeline = ['Ảnh X-ray phổi', 'YOLO / MedSAM', 'Phân đoạn phổi', 'Mesh Reconstruction', '3D Lung Model', 'Digital Twin']
const levelTwoPipeline = ['DICOM CT', 'MONAI', 'Segmentation', 'Marching Cubes', '3D Mesh', 'Gaussian Splatting', 'Digital Twin Viewer']
// Bản đồ cơ thể người đầy đủ, song ngữ Anh - Việt, nhóm theo hệ cơ quan
const bodySystems = [
  {
    system: 'Head & Brain / Đầu & Não',
    accent: 'var(--violet)',
    organs: [
      { en: 'Brain', vi: 'Não' },
      { en: 'Eye', vi: 'Mắt' },
      { en: 'Ear', vi: 'Tai' },
      { en: 'Skull', vi: 'Hộp sọ' },
    ],
  },
  {
    system: 'Chest / Lồng ngực',
    accent: 'var(--cyan)',
    organs: [
      { en: 'Lung', vi: 'Phổi' },
      { en: 'Heart', vi: 'Tim' },
      { en: 'Trachea', vi: 'Khí quản' },
      { en: 'Esophagus', vi: 'Thực quản' },
      { en: 'Blood Vessel', vi: 'Mạch máu' },
    ],
  },
  {
    system: 'Abdomen / Bụng',
    accent: 'var(--green)',
    organs: [
      { en: 'Liver', vi: 'Gan' },
      { en: 'Stomach', vi: 'Dạ dày' },
      { en: 'Pancreas', vi: 'Tụy' },
      { en: 'Spleen', vi: 'Lách' },
      { en: 'Kidney', vi: 'Thận' },
      { en: 'Gallbladder', vi: 'Túi mật' },
      { en: 'Small Intestine', vi: 'Ruột non' },
      { en: 'Large Intestine', vi: 'Ruột già' },
      { en: 'Bladder', vi: 'Bàng quang' },
    ],
  },
  {
    system: 'Skeleton & Muscle / Xương & Cơ',
    accent: 'var(--amber)',
    organs: [
      { en: 'Spine', vi: 'Cột sống' },
      { en: 'Ribs', vi: 'Xương sườn' },
      { en: 'Pelvis', vi: 'Xương chậu' },
      { en: 'Muscle', vi: 'Cơ bắp' },
    ],
  },
  {
    system: 'Arms / Tay',
    accent: 'var(--pink)',
    organs: [
      { en: 'Shoulder', vi: 'Vai' },
      { en: 'Upper Arm', vi: 'Cánh tay' },
      { en: 'Elbow', vi: 'Khuỷu tay' },
      { en: 'Forearm', vi: 'Cẳng tay' },
      { en: 'Hand', vi: 'Bàn tay' },
    ],
  },
  {
    system: 'Legs / Chân',
    accent: 'var(--green)',
    organs: [
      { en: 'Hip', vi: 'Hông' },
      { en: 'Thigh', vi: 'Đùi' },
      { en: 'Knee', vi: 'Đầu gối' },
      { en: 'Lower Leg', vi: 'Cẳng chân' },
      { en: 'Foot', vi: 'Bàn chân' },
    ],
  },
  {
    system: 'Pathology / Bệnh lý',
    accent: 'var(--red)',
    organs: [
      { en: 'Tumor', vi: 'Khối u' },
      { en: 'Lymph Nodes', vi: 'Hạch bạch huyết' },
      { en: 'Cyst', vi: 'Nang' },
    ],
  },
]
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

function Flow({ steps, variant = 'mvp', onStepClick, activeStep }) {
  return (
    <div className={`omni3d-flow omni3d-flow-${variant}`}>
      {steps.map((step, index) => {
        const clickable = typeof onStepClick === 'function'
        return (
          <React.Fragment key={step}>
            <div
              className={`omni3d-flow-node ${clickable ? 'is-clickable' : ''} ${activeStep === step ? 'is-active' : ''}`}
              onClick={clickable ? () => onStepClick(step) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
            >
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span>{step}</span>
            </div>
            {index < steps.length - 1 && <div className="omni3d-flow-arrow">↓</div>}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default function Omnidirectional3DBodyPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const [showDigitalTwinViewer, setShowDigitalTwinViewer] = useState(false)

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
            <span className="arm left" />
            <span className="arm right" />
            <span className="leg left" />
            <span className="leg right" />
          </div>
          <div className="omni3d-map-pin pin-one">Lung / Phổi</div>
          <div className="omni3d-map-pin pin-two">Tumor / Khối u</div>
          <div className="omni3d-map-pin pin-three">Vessel / Mạch máu</div>
          <div className="omni3d-map-pin pin-four">Arm / Tay</div>
          <div className="omni3d-map-pin pin-five">Leg / Chân</div>
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
          <Flow
            steps={levelOnePipeline}
            onStepClick={(step) => {
              if (step === 'Digital Twin') setShowDigitalTwinViewer((prev) => !prev)
            }}
            activeStep={showDigitalTwinViewer ? 'Digital Twin' : null}
          />

          {showDigitalTwinViewer && (
            <div className="omni3d-3dviewer">
              <iframe
                src="https://caskanatomy.info/open3dviewer/?model=overview-skeleton&export=on"
                title="Cask Anatomy 3D Viewer"
                allow="fullscreen"
                allowFullScreen
              />
            </div>
          )}
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
        <OmniCard title="Human Body World Tree / Bản đồ cơ thể người" eyebrow="Navigable anatomy graph — song ngữ Anh · Việt" accent="var(--cyan)">
          <div className="omni3d-tree omni3d-tree-grouped">
            <div className="omni3d-tree-root">Human Body / Cơ thể người</div>
            {bodySystems.map((group) => (
              <div key={group.system} className="omni3d-tree-group">
                <div className="omni3d-tree-system" style={{ color: group.accent, borderColor: group.accent }}>
                  {group.system}
                </div>
                {group.organs.map((organ) => (
                  <div
                    key={organ.en}
                    className={`omni3d-tree-node ${group.system.startsWith('Pathology') ? 'is-alert' : ''}`}
                  >
                    <i />
                    <span><b>{organ.en}</b> / {organ.vi}</span>
                  </div>
                ))}
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

      <NavButtons onNext={onNext} nextLabel={nextLabel || 'Digital Twin'} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
