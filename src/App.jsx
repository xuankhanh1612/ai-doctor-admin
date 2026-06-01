import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import ImagingPanel from './components/ImagingPanel.jsx'
import CheckinPanel from './components/CheckinPanel.jsx'
import TwinPanel from './components/TwinPanel.jsx'
import Matrix3DBodyPanel from './components/Matrix3DBodyPanel.jsx'
import Omnidirectional3DBodyPanel from './components/Omnidirectional3DBodyPanel.jsx'
import TelemedicinePanel from './components/TelemedicinePanel.jsx'
import StatisticalAnalysisPanel from './components/StatisticalAnalysisPanel.jsx'
import SimulationPanel from './components/SimulationPanel.jsx'
import ConsensusPanel from './components/ConsensusPanel.jsx'
import SwarmConsensusPanel from './components/SwarmConsensusPanel.jsx'
import UploadPanel from './components/upload/UploadPanel.jsx'
import FamilyTreePanel from './components/family/FamilyTreePanel.jsx'
import FamilyMedicalRelationshipPanel from './components/family/FamilyMedicalRelationshipPanel.jsx'
import AdminPanel from './components/admin/AdminPanel.jsx'
import PatientRecordPanel from './components/PatientRecordPanel.jsx'
import Protein3DPanel from './components/Protein3DPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'

// Swarm panel replaces simulation; keep consensus as classic fallback
const PANELS = ['upload', 'imaging', 'checkin', 'family', 'record', 'familyRelationship', 'matrix3dBody', 'omnidirectional3dBody', 'twin', 'telemedicine', 'statAnalysis', 'swarm', 'consensus', 'protein3d']

export default function App() {
  const { user, loading } = useAuth()
  const { theme, t } = useApp()
  const [active, setActive]               = useState('upload')
  const [selectedMember, setSelectedMember] = useState(null)
  const [compareImage, setCompareImage] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])
  const [imagingScrollTarget, setImagingScrollTarget] = useState(null)
  const mainRef = useRef(null)
  const [scrollState, setScrollState] = useState({
    canScroll: false,
    showTop: false,
    showEnd: false,
  })

  useEffect(() => {
    setCompareImage(null)
    setUploadedImages([])
    setImagingScrollTarget(null)
  }, [user?.email])

  const panelLabels = {
    upload: t('uploadRecords'),
    imaging: t('imaging'),
    checkin: t('checkin'),
    family: t('familyTree'),
    familyRelationship: t('familyRelationship'),
    record: t('patientRecord'),
    matrix3dBody: t('matrix3dBody'),
    omnidirectional3dBody: t('omnidirectional3dBody'),
    twin: t('twin'),
    telemedicine: t('telemedicine'),
    statAnalysis: t('statAnalysis'),
    swarm: t('swarmCouncil'),
    consensus: `${t('consensus')} (Classic)`,
    protein3d: t('protein3d'),
  }

  const navigateToRecord = (member) => { setSelectedMember(member); setActive('record') }

  const goNext = () => {
    const idx = PANELS.indexOf(active)
    if (idx < PANELS.length - 1) setActive(PANELS[idx + 1])
  }
  const goPrev = () => {
    const idx = PANELS.indexOf(active)
    if (idx > 0) setActive(PANELS[idx - 1])
  }

  const handleSelectCompareFile = (dataUrl, records = [], options = {}) => {
    const selectedFile = options.selectedRecord
    const isPdf =
      selectedFile?.mimeType?.includes('pdf') ||
      selectedFile?.fileType === 'pdf' ||
      selectedFile?.type === 'pdf' ||
      selectedFile?.filename?.toLowerCase()?.endsWith('.pdf')

    setCompareImage(isPdf ? null : dataUrl)
    setUploadedImages(records)
    setImagingScrollTarget({
      target: isPdf ? 'end' : 'top',
      requestedAt: Date.now(),
    })
    setActive('imaging')
  }

  const updateScrollControls = useCallback(() => {
    const el = mainRef.current
    if (!el) return

    const maxScroll = el.scrollHeight - el.clientHeight
    const canScroll = maxScroll > 12
    const showTop = canScroll && el.scrollTop > 120
    const showEnd = canScroll && maxScroll - el.scrollTop > 120

    setScrollState(prev => (
      prev.canScroll === canScroll &&
      prev.showTop === showTop &&
      prev.showEnd === showEnd
        ? prev
        : { canScroll, showTop, showEnd }
    ))
  }, [])

  const scrollMainTo = useCallback((target) => {
    const el = mainRef.current
    if (!el) return

    el.scrollTo({
      top: target === 'end' ? el.scrollHeight : 0,
      behavior: 'smooth',
    })
  }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return undefined

    updateScrollControls()
    const timer = window.setTimeout(updateScrollControls, 250)

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateScrollControls)
      : null

    if (resizeObserver) {
      resizeObserver.observe(el)
      if (el.firstElementChild) resizeObserver.observe(el.firstElementChild)
    }
    el.addEventListener('scroll', updateScrollControls, { passive: true })
    window.addEventListener('resize', updateScrollControls)

    return () => {
      window.clearTimeout(timer)
      resizeObserver?.disconnect()
      el.removeEventListener('scroll', updateScrollControls)
      window.removeEventListener('resize', updateScrollControls)
    }
  }, [active, updateScrollControls])

  const prevPanel = PANELS[PANELS.indexOf(active) - 1]
  const prevLabel = prevPanel ? panelLabels[prevPanel] : null

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
  const familyStorageOwnerId = user?.email || 'guest'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar activePanel={active} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar active={active} onNavigate={(id) => { if (id === 'record') setSelectedMember(null); setActive(id) }} />
        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', background: mainBg }}>
          <PanelErrorBoundary
            resetKey={active}
            isDark={isDark}
            panelLabel={panelLabels[active] || active}
            onReset={() => setActive('upload')}
            familyStorageOwnerId={familyStorageOwnerId}
          >
            {active === 'upload'    && <UploadPanel        patientId="LXK-2024" onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} onSelectImage={handleSelectCompareFile} />}
            {active === 'imaging'   && <ImagingPanel       onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} compareImage={compareImage} uploadedImages={uploadedImages} onSelectCompareImage={setCompareImage} scrollTarget={imagingScrollTarget} onScrollTargetHandled={() => setImagingScrollTarget(null)} />}
            {active === 'checkin'   && <CheckinPanel       onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'family'    && <FamilyTreePanel    patientId="LXK-2024" storageOwnerId={familyStorageOwnerId} onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} onViewRecord={navigateToRecord} />}
            {active === 'familyRelationship' && <FamilyMedicalRelationshipPanel patientId="LXK-2024" storageOwnerId={familyStorageOwnerId} onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'record'    && <PatientRecordPanel onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} selectedMember={selectedMember} storageOwnerId={familyStorageOwnerId} onBackToPatient={() => setSelectedMember(null)} />}
            {active === 'matrix3dBody' && <Matrix3DBodyPanel onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'omnidirectional3dBody' && <Omnidirectional3DBodyPanel onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'twin'      && <TwinPanel          onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'telemedicine' && <TelemedicinePanel onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'statAnalysis' && <StatisticalAnalysisPanel onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'swarm'     && <SwarmConsensusPanel onReset={() => setActive('upload')} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'consensus' && <ConsensusPanel     onReset={() => setActive('upload')} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'protein3d' && <Protein3DPanel     onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'admin'     && user?.isAdmin && <AdminPanel />}
            {active === 'admin'     && !user?.isAdmin && (
              <div style={{ padding: 40, textAlign: 'center', color: '#ff5252' }}>🔒 Admin only</div>
            )}
          </PanelErrorBoundary>
          <GlobalScrollButtons
            showTop={scrollState.showTop}
            showEnd={scrollState.showEnd}
            onGoTop={() => scrollMainTo('top')}
            onGoEnd={() => scrollMainTo('end')}
          />
        </main>
      </div>
    </div>
  )
}

class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Panel render error:', error, info)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  handleClearFamilyData = () => {
    try {
      const ownerKey = String(this.props.familyStorageOwnerId || 'guest').trim().toLowerCase() || 'guest'
      const byUser = JSON.parse(localStorage.getItem('cdoc_family_members_by_user') || '{}')

      if (byUser?.[ownerKey]) {
        delete byUser[ownerKey]['LXK-2024']
        localStorage.setItem('cdoc_family_members_by_user', JSON.stringify(byUser))
      }
      localStorage.removeItem('cdoc_family_members')
    } catch (error) {
      console.error('Unable to clear family data:', error)
    }
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const { isDark, panelLabel, onReset } = this.props
    const text = isDark ? '#e8f0f8' : '#1a2035'
    const text2 = isDark ? 'rgba(232,240,248,0.62)' : '#555'
    const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    const surface = isDark ? 'rgba(255,255,255,0.04)' : '#fff'

    return (
      <div style={{ minHeight: 'calc(100vh - 58px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <div style={{ width: '100%', maxWidth: 640, border: `1px solid ${border}`, background: surface, borderRadius: 18, padding: 28, boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.45)' : '0 18px 60px rgba(0,0,0,0.12)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: text, fontSize: 20, margin: '0 0 8px', fontWeight: 900 }}>
            Không thể tải trang {panelLabel}
          </h2>
          <p style={{ color: text2, fontSize: 13, lineHeight: 1.65, margin: '0 0 18px' }}>
            Ứng dụng đã chặn lỗi render để tránh màn hình đen. Nếu lỗi đến từ dữ liệu Gia phả bệnh lý đã lưu trên trình duyệt, hãy xoá cache dữ liệu gia đình rồi mở lại trang.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'auto', padding: 12, borderRadius: 10, border: `1px solid ${border}`, color: '#ff8a65', background: isDark ? 'rgba(0,0,0,0.24)' : '#fff7f3', fontSize: 11 }}>
            {this.state.error?.message || 'Unknown panel error'}
          </pre>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button type="button" onClick={this.handleClearFamilyData} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(0,229,255,.35)', background: 'rgba(0,229,255,.1)', color: '#00e5ff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              Xoá dữ liệu gia đình trên máy
            </button>
            <button type="button" onClick={onReset} style={{ padding: '10px 14px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Về trang tải hồ sơ
            </button>
          </div>
        </div>
      </div>
    )
  }
}


function GlobalScrollButtons({ showTop, showEnd, onGoTop, onGoEnd }) {
  if (!showTop && !showEnd) return null

  return (
    <div className="scroll-jump-controls" aria-label="Page scroll controls">
      <button
        type="button"
        className={`scroll-jump-button ${showTop ? 'is-visible' : ''}`}
        aria-label="Go to top"
        title="Go to Top"
        onClick={onGoTop}
      >
        <span aria-hidden="true">↑</span>
        <span className="scroll-jump-label">Top</span>
      </button>
      <button
        type="button"
        className={`scroll-jump-button ${showEnd ? 'is-visible' : ''}`}
        aria-label="Go to end"
        title="Go to End"
        onClick={onGoEnd}
      >
        <span aria-hidden="true">↓</span>
        <span className="scroll-jump-label">End</span>
      </button>
    </div>
  )
}
