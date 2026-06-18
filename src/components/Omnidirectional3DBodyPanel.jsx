import React, { useState, useMemo } from 'react'
import NavButtons from './NavButtons.jsx'

const mvpInputs = ['X-ray', 'Hồ sơ bệnh án', 'Xét nghiệm máu']
const mvpOrgans = ['Tim / Heart', 'Phổi / Lung', 'Gan / Liver', 'Thận / Kidney']
const levelOnePipeline = ['Ảnh X-ray phổi', 'YOLO / MedSAM', 'Phân đoạn phổi', 'Mesh Reconstruction', '3D Lung Model', 'Digital Twin']
const levelTwoPipeline = ['DICOM CT', 'MONAI', 'Segmentation', 'Marching Cubes', '3D Mesh', 'Gaussian Splatting', 'Digital Twin Viewer']

// Organ → iframe URL mapping
const ORGAN_IFRAME_URLS = {
  Skeleton: 'https://caskanatomy.info/open3dviewer/?model=overview-skeleton&export=on',
  Brain: 'https://caskanatomy.info/open3dviewer/?model=overview-skull&export=on',
  Eye: 'https://caskanatomy.info/open3dviewer/?model=overview-skull&export=on',
  Ear: 'https://caskanatomy.info/open3dviewer/?model=overview-skull&export=on',
  Skull: 'https://caskanatomy.info/open3dviewer/?model=exploded-skull&export=on',
  Heart: 'https://www.caskanatomy.info/3dskillslab/?model=hart_openx',
  Spine: 'https://caskanatomy.info/open3dviewer/?model=overview-skeleton&export=on',
  Ribs: 'https://caskanatomy.info/open3dviewer/?model=overview-skeleton&export=on',
  Pelvis: 'https://caskanatomy.info/open3dviewer/?model=lower-limb&export=on',
  Muscle: 'https://caskanatomy.info/open3dviewer/?model=upper-limb-axio-appendicular-muscles&subset=muscles-and-bursae-and-ligament-parts-hidden',
  Shoulder: 'https://caskanatomy.info/open3dviewer/?model=upper-limb&export=on',
  'Upper Arm': 'https://caskanatomy.info/open3dviewer/?model=upper-limb-arm-muscles&subset=ligament-parts-hidden',
  Elbow: 'https://caskanatomy.info/open3dviewer/?model=upper-limb-arm-muscles&subset=ligament-parts-hidden',
  Forearm: 'https://caskanatomy.info/open3dviewer/?model=upper-limb-arm-muscles&subset=ligament-parts-hidden',
  Hand: 'https://caskanatomy.info/open3dviewer/?model=hand&export=on',
  Hip: 'https://caskanatomy.info/open3dviewer/?model=lower-limb&export=on',
  Thigh: 'https://caskanatomy.info/open3dviewer/?model=lower-limb&export=on',
  Knee: 'https://caskanatomy.info/open3dviewer/?model=lower-limb&export=on',
  'Lower Leg': 'https://caskanatomy.info/open3dviewer/?model=lower-limb&export=on',
  Foot: 'https://caskanatomy.info/open3dviewer/?model=lower-limb&export=on',
}
const STEP_IFRAME_URLS = {
  'Digital Twin Viewer': 'https://caskanatomy.info/open3dviewer/?model=upper-limb&export=on',
}

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

function Flow({ steps, variant = 'mvp', onStepClick, activeStep, visitedSteps = [] }) {
  return (
    <div className={`omni3d-flow omni3d-flow-${variant}`}>
      {steps.map((step, index) => {
        const hasLink = !!STEP_IFRAME_URLS[step]
        const isActive = activeStep === step
        const isVisited = visitedSteps.includes(step)
        const clickable = typeof onStepClick === 'function'

        let extraClass = ''
        if (hasLink && isActive) extraClass = 'has-link is-active is-visited'
        else if (hasLink && isVisited) extraClass = 'has-link is-visited'
        else if (hasLink) extraClass = 'has-link'
        else if (isActive) extraClass = 'is-active'

        return (
          <React.Fragment key={step}>
            <div
              className={`omni3d-flow-node ${clickable ? 'is-clickable' : ''} ${extraClass}`}
              onClick={clickable ? () => onStepClick(step) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
            >
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span>{step}</span>
              {hasLink && <span className="omni3d-link-badge">{isActive ? '▼ open' : '▶ 3D'}</span>}
            </div>
            {index < steps.length - 1 && <div className="omni3d-flow-arrow">↓</div>}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function IframeViewer({ url, label }) {
  return (
    <div className="omni3d-3dviewer">
      <iframe
        src={url}
        title={label || '3D Viewer'}
        allow="fullscreen"
        allowFullScreen
      />
    </div>
  )
}

export default function Omnidirectional3DBodyPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const [showDigitalTwinViewer, setShowDigitalTwinViewer] = useState(false)
  const [visitedLevel1, setVisitedLevel1] = useState([])

  // Level 2: Digital Twin Viewer step
  const [activeStep2, setActiveStep2] = useState(null)
  const [visitedSteps2, setVisitedSteps2] = useState([])

  // Body tree organ iframes
  const [activeOrgan, setActiveOrgan] = useState('Skeleton')
  const [visitedOrgans, setVisitedOrgans] = useState([])
  const [search, setSearch] = useState('')

  const organMeta = useMemo(() => {
    const map = {}
    bodySystems.forEach(group => {
      group.organs.forEach(o => {
        map[o.en] = { ...o, system: group.system }
      })
    })
    return map
  }, [])

  function handleLevel1Step(step) {
    if (step === 'Digital Twin') {
      const next = !showDigitalTwinViewer
      setShowDigitalTwinViewer(next)
      if (next) setVisitedLevel1(v => v.includes(step) ? v : [...v, step])
    }
  }

  function handleLevel2Step(step) {
    if (!STEP_IFRAME_URLS[step]) return
    const isCurrentlyActive = activeStep2 === step
    setActiveStep2(isCurrentlyActive ? null : step)
    if (!isCurrentlyActive) setVisitedSteps2(v => v.includes(step) ? v : [...v, step])
  }

  function handleOrganClick(organEn) {
    if (!ORGAN_IFRAME_URLS[organEn]) return
    const isCurrentlyActive = activeOrgan === organEn
    setActiveOrgan(isCurrentlyActive ? null : organEn)
    if (!isCurrentlyActive) setVisitedOrgans(v => v.includes(organEn) ? v : [...v, organEn])
  }

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

      <div style={{width:"100%",marginBottom:"24px"}}>
<div className="omni3d-lower-grid">
        <OmniCard title="Human Body World Tree / Bản đồ cơ thể người" eyebrow="Navigable anatomy graph — song ngữ Anh · Việt" accent="var(--cyan)">
          <div style={{marginBottom:'12px'}}>
            <input
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Search organ..."
              style={{width:'100%',padding:'10px',borderRadius:'8px'}}
            />
          </div>

          <div style={{marginBottom:'12px',fontWeight:'600'}}>
            Human Body → {organMeta[activeOrgan]?.system || 'System'} → {activeOrgan || 'Skeleton'}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:'16px'}}>
            <div>
          <IframeViewer
            url={
              activeOrgan && ORGAN_IFRAME_URLS[activeOrgan]
                ? ORGAN_IFRAME_URLS[activeOrgan]
                : ORGAN_IFRAME_URLS['Skeleton']
            }
            label={activeOrgan || 'Human Body Viewer'}
          />
          <div className="omni3d-tree omni3d-tree-grouped">
            <div className="omni3d-tree-root">Human Body / Cơ thể người</div>
            {bodySystems.map((group) => (
              <div key={group.system} className="omni3d-tree-group">
                <div className="omni3d-tree-system" style={{ color: group.accent, borderColor: group.accent }}>
                  {group.system}
                </div>
                {group.organs.filter((organ)=>!search || organ.en.toLowerCase().includes(search.toLowerCase()) || organ.vi.toLowerCase().includes(search.toLowerCase())).map((organ) => {
                  const hasLink = !!ORGAN_IFRAME_URLS[organ.en]
                  const isActive = activeOrgan === organ.en
                  const isVisited = visitedOrgans.includes(organ.en)
                  return (
                    <React.Fragment key={organ.en}>
                      <div
                        className={`omni3d-tree-node selected-node ${group.system.startsWith('Pathology') ? 'is-alert' : ''} ${hasLink ? 'has-link' : ''} ${hasLink && isActive ? 'is-active' : ''} ${hasLink && isVisited && !isActive ? 'is-visited' : ''}`}
                        onClick={hasLink ? () => handleOrganClick(organ.en) : undefined}
                        role={hasLink ? 'button' : undefined}
                        tabIndex={hasLink ? 0 : undefined}
                        style={hasLink ? { cursor: 'pointer' } : undefined}
                      >
                        <i />
                        <span><b>{organ.en}</b> / {organ.vi}</span>
                        {hasLink && <span className="omni3d-link-badge">{isActive ? '▼ open' : '▶ 3D'}</span>}
                      </div>
                      
                    </React.Fragment>
                  )
                })}
              </div>
            ))}
          </div>
            </div>
            <div style={{padding:'16px',border:'1px solid rgba(255,255,255,.15)',borderRadius:'12px'}}>
              <h4>{activeOrgan || 'Skeleton'}</h4>
              <p><b>System:</b> {organMeta[activeOrgan]?.system || 'General Anatomy'}</p>
              <p><b>Viewer:</b> {activeOrgan && ORGAN_IFRAME_URLS[activeOrgan] ? 'Available' : 'Default Skeleton'}</p>
            </div>
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
</div>

<div className="omni3d-layout">
        <OmniCard title="Level 1" eyebrow="Fast clinical prototype" accent="var(--green)">
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
            onStepClick={handleLevel1Step}
            activeStep={showDigitalTwinViewer ? 'Digital Twin' : null}
            visitedSteps={visitedLevel1}
          />

          {showDigitalTwinViewer && (
            <IframeViewer
              url="https://caskanatomy.info/open3dviewer/?model=overview-skeleton&export=on"
              label="Cask Anatomy 3D Viewer"
            />
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
          <Flow
            steps={levelTwoPipeline}
            variant="dicom"
            onStepClick={handleLevel2Step}
            activeStep={activeStep2}
            visitedSteps={visitedSteps2}
          />

          {activeStep2 === 'Digital Twin Viewer' && (
            <IframeViewer
              url={STEP_IFRAME_URLS['Digital Twin Viewer']}
              label="Digital Twin Viewer — Upper Limb"
            />
          )}
        </OmniCard>
      </div>

      
