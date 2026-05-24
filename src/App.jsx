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
import UploadPanel from './components/upload/UploadPanel.jsx'
import FamilyTreePanel from './components/family/FamilyTreePanel.jsx'
import AdminPanel from './components/admin/AdminPanel.jsx'
import PatientRecordPanel from './components/PatientRecordPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'

const PANELS = ['imaging', 'checkin', 'upload', 'family', 'record', 'twin', 'simulation', 'consensus']

export default function App() {
  const { user, loading } = useAuth()
  const { theme } = useApp()
  const [active, setActive] = useState('imaging')
  const [selectedMember, setSelectedMember] = useState(null)

  const navigateToRecord = (member) => {
    setSelectedMember(member)
    setActive('record')
  }

  const goNext = () => {
    const idx = PANELS.indexOf(active)
    if (idx < PANELS.length - 1) setActive(PANELS[idx + 1])
  }

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
          {active === 'imaging'    && <ImagingPanel       onNext={goNext} />}
          {active === 'checkin'   && <CheckinPanel       onNext={goNext} />}
          {active === 'upload'    && <UploadPanel        patientId="LXK-2024" onNext={goNext} />}
          {active === 'family'    && <FamilyTreePanel    patientId="LXK-2024" onNext={goNext} onViewRecord={navigateToRecord} />}
          {active === 'record'    && <PatientRecordPanel onNext={goNext} selectedMember={selectedMember} />}
          {active === 'twin'      && <TwinPanel          onNext={goNext} />}
          {active === 'simulation'&& <SimulationPanel    onNext={goNext} />}
          {active === 'consensus' && <ConsensusPanel     onReset={() => setActive('imaging')} />}
          {active === 'admin'     && user?.isAdmin && <AdminPanel />}
          {active === 'admin'     && !user?.isAdmin && (
            <div style={{ padding: 40, textAlign: 'center', color: '#ff5252' }}>🔒 Admin only</div>
          )}
        </main>
      </div>
    </div>
  )
}
