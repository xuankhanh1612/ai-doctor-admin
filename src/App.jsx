import React, { useCallback, useEffect, useRef, useState } from 'react'
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
    record: t('patientRecord'),
    twin: t('twin'),
    swarm: t('swarmCouncil'),
    consensus: `${t('consensus')} (Classic)`,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar activePanel={active} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar active={active} onNavigate={setActive} />
        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', background: mainBg }}>
          {active === 'upload'    && <UploadPanel        patientId="LXK-2024" onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} onSelectImage={handleSelectCompareFile} />}
          {active === 'imaging'   && <ImagingPanel       onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} compareImage={compareImage} uploadedImages={uploadedImages} onSelectCompareImage={setCompareImage} scrollTarget={imagingScrollTarget} onScrollTargetHandled={() => setImagingScrollTarget(null)} />}
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
