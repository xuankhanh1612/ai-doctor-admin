import React, { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import ImagingPanel from './components/ImagingPanel.jsx'
import CheckinPanel from './components/CheckinPanel.jsx'
import TwinPanel from './components/TwinPanel.jsx'
import SimulationPanel from './components/SimulationPanel.jsx'
import ConsensusPanel from './components/ConsensusPanel.jsx'
import SwarmConsensusPanel from './components/SwarmConsensusPanel.jsx'
import UploadPanel from './components/upload/UploadPanel.jsx'
import FamilyTreePanel from './components/family/FamilyTreePanel.jsx'
import AdminPanel from './components/admin/AdminPanel.jsx'
import PatientRecordPanel from './components/PatientRecordPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'

// Swarm panel replaces simulation; keep consensus as classic fallback
const PANELS = ['upload', 'imaging', 'checkin', 'family', 'record', 'twin', 'swarm', 'consensus']

const PANEL_LABELS = {
  upload:     'Tải lên hồ sơ',
  imaging:    'Chẩn đoán hình ảnh',
  checkin:    'Kiểm tra triệu chứng',
  family:     'Gia phả bệnh lý',
  record:     'Hồ sơ bệnh nhân',
  twin:       'Digital Twin',
  swarm:      'Hội đồng Y khoa AI',
  consensus:  'Đồng thuận AI (Classic)',
}

export default function App() {
  const { user, loading } = useAuth()
  const { theme } = useApp()
  const [active, setActive]               = useState('upload')
  const [selectedMember, setSelectedMember] = useState(null)
  const [compareImage, setCompareImage] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])

  const navigateToRecord = (member) => { setSelectedMember(member); setActive('record') }

  const goNext = () => {
    const idx = PANELS.indexOf(active)
    if (idx < PANELS.length - 1) setActive(PANELS[idx + 1])
  }
  const goPrev = () => {
    const idx = PANELS.indexOf(active)
    if (idx > 0) setActive(PANELS[idx - 1])
  }

  const prevPanel = PANELS[PANELS.indexOf(active) - 1]
  const prevLabel = prevPanel ? PANEL_LABELS[prevPanel] : null

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: theme === 'dark' ? '#04060f' : '#f0f4f8',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚕️</div>
          <div style={{ color: '#00b8cc', fontFamily: 'monospace', fontSize: 14, letterSpacing: '0.1em' }}>LOADING...</div>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage onSuccess={() => {}} />

  const isDark = theme === 'dark'
  const mainBg = isDark ? 'var(--bg2)' : '#f4f7fb'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar activePanel={active} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar active={active} onNavigate={setActive} />
        <main style={{ flex: 1, overflowY: 'auto', background: mainBg }}>
          {active === 'upload'    && <UploadPanel        patientId="LXK-2024" onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} onSelectImage={(img, records=[])=>{setCompareImage(img);setUploadedImages(records);setActive('imaging')}} />}
          {active === 'imaging'   && <ImagingPanel       onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} compareImage={compareImage} uploadedImages={uploadedImages} onSelectCompareImage={setCompareImage} />}
          {active === 'checkin'   && <CheckinPanel       onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
          {active === 'family'    && <FamilyTreePanel    patientId="LXK-2024" onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} onViewRecord={navigateToRecord} />}
          {active === 'record'    && <PatientRecordPanel onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} selectedMember={selectedMember} />}
          {active === 'twin'      && <TwinPanel          onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
          {active === 'swarm'     && <SwarmConsensusPanel onReset={() => setActive('upload')} onPrev={goPrev} prevLabel={prevLabel} />}
          {active === 'consensus' && <ConsensusPanel     onReset={() => setActive('upload')} onPrev={goPrev} prevLabel={prevLabel} />}
          {active === 'admin'     && user?.isAdmin && <AdminPanel />}
          {active === 'admin'     && !user?.isAdmin && (
            <div style={{ padding: 40, textAlign: 'center', color: '#ff5252' }}>🔒 Admin only</div>
          )}
        </main>
      </div>
    </div>
  )
}
