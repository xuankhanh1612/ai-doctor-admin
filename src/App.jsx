import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import GlobalAIChatbot from './components/GlobalAIChatbot.jsx'
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
import HealthJourneyPanel from './components/HealthJourneyPanel.jsx'
import HealthJourneyGamePanel from './components/HealthJourneyGamePanel.jsx'
import MyRewardHealthPanel from './components/MyRewardHealthPanel.jsx'
import MedicalAssetStorePanel from './components/MedicalAssetStorePanel.jsx' // <--- IMPORT PANEL MỚI Ở ĐÂY
import LunchJourneyPanel from './components/LunchJourneyPanel.jsx'
import DinnerJourneyPanel from './components/DinnerJourneyPanel.jsx'
import FamilyTreePanel from './components/family/FamilyTreePanel.jsx'
import FamilyMedicalRelationshipPanel from './components/family/FamilyMedicalRelationshipPanel.jsx'
import AdminPanel from './components/admin/AdminPanel.jsx'
import PatientRecordPanel from './components/PatientRecordPanel.jsx'
import Protein3DPanel from './components/Protein3DPanel.jsx'
import AIHealthcareVisionPanel from './components/AIHealthcareVisionPanel.jsx'
import AIHealthcareVisionControlPanel from './components/AIHealthcareVisionControlPanel.jsx'
import AIInbodyPortalPanel from './components/AIInbodyPortalPanel.jsx'
import WaterDrinkChatBotPanel from './components/WaterDrinkChatBotPanel.jsx'
import RSSPortalPanel from './components/RSSPortalPanel.jsx'
import WikiMedVisionPanel from './components/WikiMedVisionPanel.jsx'
import FullDocumentSummarizationPanel from './components/FullDocumentSummarizationPanel.jsx'
import DocumentOCRPanel from './components/DocumentOCRPanel.jsx'
import StressReliefPanel from './components/StressReliefPanel.jsx'
import PrintCenter from './print/PrintCenter.jsx'
import UserProfilePanel from './components/UserProfilePanel.jsx'
import DonationHeroPanel from './components/DonationHeroPanel.jsx'
import ChooseUserRolePanel from './components/ChooseUserRolePanel.jsx'
import AvatarCreatorPanel from './components/AvatarCreatorPanel.jsx'
import Make3DModelPanel from './components/Make3DModelPanel.jsx'
import My3DAssetPanel from './components/My3DAssetPanel.jsx'
import TwoDTo3DAssetPanel from './components/TwoDTo3DAssetPanel.jsx'
import MyAIAvatarPanel from './components/MyAIAvatarPanel.jsx'
import Create3DVideoFrom2DPanel from './components/Create3DVideoFrom2DPanel.jsx'
import MyAIAvatarLAMPanel from './components/MyAIAvatarLAMPanel.jsx'
import OrganConnectionPanel from './components/OrganConnectionPanel.jsx'
import ChatHistoryPanel from './components/ChatHistoryPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { addNotification } from './lib/notifications.js'

// THÊM 'medicalAssetStore' NGAY SAU 'healthJourneyGame'
const PANELS = ['healthJourneyGame', 'medicalAssetStore', 'myRewardHealth', 'rssPortal', 'waterDrinkChatBot', 'wikiMedVision', 'fullDocSummarization', 'documentOCR', 'twoDTo3DAsset', 'organConnection', 'healthJourney', 'lunchJourney', 'dinnerJourney', 'upload', 'imaging', 'checkin', 'family', 'record', 'familyRelationship', 'matrix3dBody', 'omnidirectional3dBody', 'twin', 'telemedicine', 'statAnalysis', 'swarm', 'consensus', 'protein3d', 'aiHealthcareVision', 'aiHealthcareVisionControl', 'stressRelief', 'aiInbodyPortal', 'printPortal', 'chatHistory']

export default function App() {
  const { user, loading, loginAnonymous } = useAuth()
  const { theme, t } = useApp()
  const [active, setActive]               = useState('healthJourneyGame')
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
  const [sidebarOpenSignal, setSidebarOpenSignal] = useState(0)

  // Thứ tự màn hình cho KHÁCH (guest, chưa đăng nhập) khi vào web:
  // 1) 'chooseRole'  -> ChooseUserRolePanel ("Chọn Vai Trò Anh Hùng") — CHẠY
  //    ĐẦU TIÊN, trước cả "Anh Hùng Hiến Tặng".
  // 2) 'hero'        -> DonationHeroPanel ("Anh Hùng Hiến Tặng") — vào sau
  //    khi bấm chọn 1 vai trò hoặc "Tiếp tục tìm hiểu" ở bước 1.
  // 3) 'login'        -> LoginPage thật — vào khi bấm "Tạo tài khoản" ở bước
  //    1 hoặc 2, hoặc bấm nút hành động ở bước 2.
  // micVoiceSignal: mỗi lần đổi số là 1 yêu cầu "bấm mic ngay tại trang" từ
  // nút mic trên ChooseUserRolePanel / DonationHeroPanel. Tín hiệu này KHÔNG
  // mở popup chat — GlobalAIChatbot chỉ bật ghi âm + hiện bong bóng trạng
  // thái thoại nhỏ (voice-only), còn nội dung vẫn lưu + đồng bộ ngầm vào
  // popup chat như bình thường (xem GlobalAIChatbot.jsx / useGlobalAIChatbotEngine.js).
  const [preLoginView, setPreLoginView] = useState('chooseRole')
  const [micVoiceSignal, setMicVoiceSignal] = useState(0)
  const prevUserRef = useRef(null)

  useEffect(() => {
    // Vừa logout (trước đó có user, giờ không còn) -> lần vào tiếp theo lại
    // bắt đầu từ màn hình "Chọn Vai Trò Anh Hùng" thay vì thẳng vào Login.
    if (prevUserRef.current && !user) setPreLoginView('chooseRole')
    prevUserRef.current = user
  }, [user])

  // Bấm mic khi CÒN LÀ KHÁCH (chưa có user) -> tạo NGAY 1 phiên "anonymous"
  // (uuid thật, lưu bền trong IndexedDB qua loginAnonymous() — cùng cơ chế
  // nút "Tiếp tục với tư cách khách" trên LoginPage đã dùng) TRƯỚC khi mở
  // chat, thay vì để userKey = null. Nhờ vậy lịch sử chat được gắn với 1
  // danh tính thật ngay từ tin nhắn đầu tiên (đồng bộ luôn với menu "Lịch
  // sử Chat với AI"): nếu người này quay lại cùng thiết bị, hoặc sau này
  // hoàn tất "Tạo tài khoản" bằng cùng phiên anon này, lịch sử chat vẫn còn
  // nguyên — không bị mất/tách rời như khi lưu dưới khoá guest "null" chung
  // chung.
  // KHÔNG chuyển màn hình (setActive) sau khi có phiên anonymous: người
  // dùng bấm mic ngay tại "Chọn Vai Trò Anh Hùng" / "Anh Hùng Hiến Tặng"
  // muốn AI mở chat + nói chuyện NGAY TẠI ĐÂY, không phải bị "chạy vào bên
  // trong" (sang layout đầy đủ có Sidebar/Topbar) rồi mới thấy popup chat.
  // GlobalAIChatbot được mount thẳng trong 2 màn hình guest này (xem bên
  // dưới) nên chỉ cần tăng micVoiceSignal là đủ để bật ghi âm + hiện bong
  // bóng trạng thái thoại — không mở popup chat.
  const handleGuestMicPress = async () => {
    try {
      await loginAnonymous()
    } catch (e) {
      console.warn('Không tạo được phiên khách (anonymous) khi bấm mic:', e)
    }
    setMicVoiceSignal(s => s + 1)
  }

  useEffect(() => {
    setCompareImage(null)
    setUploadedImages([])
    setImagingScrollTarget(null)
  }, [user?.uuid])

  const panelLabels = {
    chooseUserRole: 'Chọn Vai Trò Anh Hùng',
    donationHero: 'Anh Hùng Hiến Tặng',
    healthJourneyGame: 'Health Journey Game',
    medicalAssetStore: 'Chợ Tài nguyên 3D', // <--- THÊM NHÃN TẠI ĐÂY
    myRewardHealth: 'My Reward Health',
    healthJourney: t('healthJourney'),
    lunchJourney: t('lunchJourney'),
    dinnerJourney: t('dinnerJourney'),
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
    aiHealthcareVision: t('aiHealthcareVision'),
    aiHealthcareVisionControl: t('aiHealthcareVisionControl'),
    stressRelief: t('stressRelief'),
    aiInbodyPortal: t('aiInbodyPortal'),
    waterDrinkChatBot: t('waterDrinkChatBot'),
    rssPortal: 'Healthy RSS Portal',
    wikiMedVision: t('wikiMedVision'),
    fullDocSummarization: 'Full-Document Summarization',
    documentOCR: 'Document OCR',
    twoDTo3DAsset: '2D to 3D Asset',
    organConnection: 'Ăn gì tốt hôm nay',
    printPortal: 'Print Portal',
    chatHistory: 'Lịch sử Chat với AI',
    profile: t('profile'),
    avatarCreator: 'Tạo Avatar',
    make3DModel: 'Make 3D Model',
    my3dAsset: 'My 3D Asset',
    myAiAvatar: 'My AI Avatar',
    create3DVideoFrom2D: 'Create 3D Video From 2D',
    myAiAvatarLam: 'My AI Avatar (LAM)',
  }

  const navigateToRecord = (member) => { setSelectedMember(member); setActive('record') }
  const navigateToUpload = useCallback(() => setActive('upload'), [])

  useEffect(() => {
    window.addEventListener('navigate-to-upload', navigateToUpload)
    return () => window.removeEventListener('navigate-to-upload', navigateToUpload)
  }, [navigateToUpload])
  const openMainMenu = useCallback(() => {
    setActive('healthJourneyGame')
    window.setTimeout(() => setSidebarOpenSignal(signal => signal + 1), 0)
  }, [])

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

  const activePanelIndex = PANELS.indexOf(active)
  const prevPanel = PANELS[activePanelIndex - 1]
  const nextPanel = PANELS[activePanelIndex + 1]
  const prevLabel = prevPanel ? panelLabels[prevPanel] : null
  const nextLabel = nextPanel ? panelLabels[nextPanel] : null

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

  // Vẫn hiển thị 2 màn hình "guest" (chooseRole / hero) kể cả khi đã có
  // user — MIỄN LÀ đó là phiên "anonymous" tạo ra bởi bấm mic (xem
  // handleGuestMicPress) và preLoginView chưa được chuyển sang 'login'.
  // Nếu không, loginAnonymous() bên trong handleGuestMicPress sẽ khiến
  // `user` có giá trị ngay lập tức và làm app nhảy thẳng sang layout đầy
  // đủ (Sidebar/Topbar) — đúng thứ người dùng KHÔNG muốn khi chỉ mới bấm
  // mic để hỏi AI ngay tại trang này. Khi người dùng chủ động bấm "Tạo tài
  // khoản" / nút hành động khác, preLoginView chuyển sang 'login', điều
  // kiện dưới đây sẽ false và app chuyển sang layout đầy đủ như bình
  // thường (kể cả khi bấm "Tiếp tục với tư cách khách" trên LoginPage).
  const showGuestPreLoginScreens = !user || (user.isAnonymous && preLoginView !== 'login')

  if (showGuestPreLoginScreens) {
    if (preLoginView === 'chooseRole') {
      return (
        <div style={{ minHeight: '100vh', background: '#eef7f1' }}>
          <ChooseUserRolePanel
            mode="guest"
            onSelectRole={() => setPreLoginView('hero')}
            onEnterAction={() => setPreLoginView('hero')}
            onCreateAccount={() => setPreLoginView('login')}
            onMicPress={handleGuestMicPress}
          />
          {/* Mount GlobalAIChatbot NGAY TẠI ĐÂY (không phải ở layout đầy đủ):
          bấm mic chỉ cần tạo phiên anonymous (handleGuestMicPress, không đổi
          màn hình) rồi tăng micVoiceSignal — AI bật ghi âm + trao đổi thoại
          NGAY TẠI TRANG này (không mở popup chat), chỉ hiện 1 bong bóng
          trạng thái nhỏ; nội dung vẫn lưu + đồng bộ ngầm vào popup chat để
          xem/sửa lại sau nếu muốn (bấm 💬 trên bong bóng, hoặc mở popup từ
          nút 🤗 góc màn hình). */}
          <GlobalAIChatbot activePanelLabel={panelLabels.chooseUserRole} externalVoiceSignal={micVoiceSignal} />
        </div>
      )
    }
    if (preLoginView === 'hero') {
      return (
        <div style={{ minHeight: '100vh', background: '#eef7f1' }}>
          <DonationHeroPanel
            mode="guest"
            onEnterAction={() => setPreLoginView('login')}
            onMicPress={handleGuestMicPress}
            onBack={() => setPreLoginView('chooseRole')}
            onLogin={() => setPreLoginView('login')}
          />
          {/* Mount GlobalAIChatbot NGAY TẠI ĐÂY — lý do xem chú thích tương
          tự ở nhánh 'chooseRole' phía trên. */}
          <GlobalAIChatbot activePanelLabel={panelLabels.donationHero} externalVoiceSignal={micVoiceSignal} />
        </div>
      )
    }
    return <LoginPage onSuccess={() => {}} onBack={() => setPreLoginView('hero')} />
  }

  const isDark = theme === 'dark'
  const mainBg = isDark ? 'var(--bg2)' : '#f4f7fb'
  const familyStorageOwnerId = user?.uuid || 'guest'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar activePanel={active} onNavigateProfile={() => setActive('profile')} onNavigateAdmin={() => setActive('admin')} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar active={active} onNavigate={(id) => setActive(id)} openSignal={sidebarOpenSignal} />
        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', background: mainBg, paddingBottom: 104 }}>
          <PanelErrorBoundary
            resetKey={active}
            isDark={isDark}
            panelLabel={panelLabels[active] || active}
            onReset={() => setActive('upload')}
            familyStorageOwnerId={familyStorageOwnerId}
            user={user}
          >
            {active === 'healthJourneyGame' && <HealthJourneyGamePanel onNext={goNext} nextLabel={nextLabel} onViewMedicalRecord={() => setActive('upload')} onOpenMyRewardHealth={() => setActive('myRewardHealth')} />}
            {active === 'medicalAssetStore' && <MedicalAssetStorePanel />} {/* <--- RENDER PANEL Ở ĐÂY */}
            {active === 'myRewardHealth' && <MyRewardHealthPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onOpenFoodToday={() => setActive('organConnection')} />}
            {active === 'healthJourney' && <HealthJourneyPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onOpenStressRelief={() => setActive('stressRelief')} onOpenInBody={() => setActive('aiInbodyPortal')} onViewMedicalRecord={() => setActive('upload')} />}
            {active === 'lunchJourney' && <LunchJourneyPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onOpenStressRelief={() => setActive('stressRelief')} onOpenInBody={() => setActive('aiInbodyPortal')} onViewMedicalRecord={() => setActive('upload')} />}
            {active === 'dinnerJourney' && <DinnerJourneyPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onOpenStressRelief={() => setActive('stressRelief')} onOpenInBody={() => setActive('aiInbodyPortal')} onViewMedicalRecord={() => setActive('upload')} />}
            {active === 'upload'    && <UploadPanel        patientId="LXK-2024" onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onSelectImage={handleSelectCompareFile} />}
            {active === 'imaging'   && <ImagingPanel       onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} compareImage={compareImage} uploadedImages={uploadedImages} onSelectCompareImage={setCompareImage} scrollTarget={imagingScrollTarget} onScrollTargetHandled={() => setImagingScrollTarget(null)} />}
            {active === 'checkin'   && <CheckinPanel       onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'family'    && <FamilyTreePanel    patientId="LXK-2024" nextLabel={nextLabel} storageOwnerId={familyStorageOwnerId} onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} onViewRecord={navigateToRecord} />}
            {active === 'familyRelationship' && <FamilyMedicalRelationshipPanel patientId="LXK-2024" nextLabel={nextLabel} storageOwnerId={familyStorageOwnerId} onNext={goNext} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'record'    && <PatientRecordPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} selectedMember={selectedMember} storageOwnerId={familyStorageOwnerId} onBackToPatient={() => setSelectedMember(null)} />}
            {active === 'matrix3dBody' && <Matrix3DBodyPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'omnidirectional3dBody' && <Omnidirectional3DBodyPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'twin'      && <TwinPanel          onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'telemedicine' && <TelemedicinePanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onViewMedicalRecord={() => setActive('upload')} />}
            {active === 'statAnalysis' && <StatisticalAnalysisPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'swarm'     && <SwarmConsensusPanel onReset={() => setActive('upload')} onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'consensus' && <ConsensusPanel     onReset={() => setActive('upload')} onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'protein3d' && <Protein3DPanel     onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'aiHealthcareVision' && <AIHealthcareVisionPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'aiHealthcareVisionControl' && <AIHealthcareVisionControlPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onViewMedicalRecord={() => setActive('upload')} />}
            {active === 'stressRelief' && <StressReliefPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'aiInbodyPortal' && <AIInbodyPortalPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onViewMedicalRecord={() => setActive('upload')} />}
            {active === 'rssPortal' && <RSSPortalPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'waterDrinkChatBot' && <WaterDrinkChatBotPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} onViewMedicalRecord={() => setActive('upload')} />}
            {active === 'wikiMedVision' && <WikiMedVisionPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'fullDocSummarization' && <FullDocumentSummarizationPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'documentOCR' && <DocumentOCRPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'twoDTo3DAsset' && <TwoDTo3DAssetPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'organConnection' && <OrganConnectionPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'printPortal' && <PrintCenter onPrev={goPrev} prevLabel={prevLabel} />}
            {active === 'chatHistory' && <ChatHistoryPanel onNext={goNext} nextLabel={nextLabel} onPrev={goPrev} prevLabel={prevLabel} activePanelLabel={panelLabels[active] || active} />}
            {active === 'chooseUserRole' && (
              <ChooseUserRolePanel
                mode="member"
                onSelectRole={() => setActive('donationHero')}
                onEnterAction={() => setActive('donationHero')}
                onMicPress={() => setMicVoiceSignal(s => s + 1)}
              />
            )}
            {active === 'donationHero' && (
              <DonationHeroPanel mode="member" onMicPress={() => setMicVoiceSignal(s => s + 1)} onBack={() => setActive('chooseUserRole')} />
            )}
            {active === 'profile'   && <UserProfilePanel />}
            {active === 'myAiAvatar' && user?.isAdmin && <MyAIAvatarPanel />}
            {active === 'myAiAvatar' && !user?.isAdmin && (
              <div style={{ padding: 40, textAlign: 'center', color: '#ff5252' }}>🔒 Admin only</div>
            )}
            {active === 'create3DVideoFrom2D' && user?.isAdmin && <Create3DVideoFrom2DPanel />}
            {active === 'create3DVideoFrom2D' && !user?.isAdmin && (
              <div style={{ padding: 40, textAlign: 'center', color: '#ff5252' }}>🔒 Admin only</div>
            )}
            {active === 'myAiAvatarLam' && user?.isAdmin && <MyAIAvatarLAMPanel />}
            {active === 'myAiAvatarLam' && !user?.isAdmin && (
              <div style={{ padding: 40, textAlign: 'center', color: '#ff5252' }}>🔒 Admin only</div>
            )}
            {active === 'avatarCreator' && <AvatarCreatorPanel />}
            {active === 'make3DModel' && <Make3DModelPanel />}
            {active === 'my3dAsset' && <My3DAssetPanel />}
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
        <GlobalBottomNav
          active={active}
          onOpenMainMenu={openMainMenu}
          onNavigate={(id) => setActive(id)}
        />
        <GlobalAIChatbot activePanelLabel={panelLabels[active] || active} externalVoiceSignal={micVoiceSignal} />
      </div>
    </div>
  )
}

function GlobalBottomNav({ active, onOpenMainMenu, onNavigate }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const items = [
    { id: 'health', label: 'Health', icon: '♿', action: onOpenMainMenu, active: ['healthJourneyGame', 'medicalAssetStore', 'myRewardHealth', 'healthJourney', 'lunchJourney', 'dinnerJourney'].includes(active) },
    { id: 'family', label: 'Community', icon: '👥', action: () => onNavigate('family'), active: active === 'family' },
    { id: 'aiHealthcareVision', label: 'AI Scan', icon: '🧬', action: () => onNavigate('aiHealthcareVision'), active: active === 'aiHealthcareVision' || active === 'aiHealthcareVisionControl' },
    { id: 'upload', label: 'Record', icon: '📄', action: () => onNavigate('upload'), active: active === 'upload' },
    { id: 'profile', label: 'Profile', icon: '👤', action: () => onNavigate('profile'), active: active === 'profile' },
  ]

  return (
    <nav
      aria-label="Global quick navigation"
      style={{
        position: 'fixed', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 180,
        width: 'min(calc(100vw - 24px), 560px)', minHeight: 72,
        display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4,
        padding: '8px 10px calc(8px + env(safe-area-inset-bottom))', borderRadius: 24,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'}`,
        background: isDark ? 'rgba(8,12,26,0.90)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(18px)', boxShadow: '0 18px 55px rgba(0,0,0,0.24)',
      }}
    >
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={item.action}
          aria-current={item.active ? 'page' : undefined}
          style={{
            minWidth: 0, minHeight: 54, border: 'none', borderRadius: 18, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: item.active ? 'linear-gradient(135deg, rgba(0,229,255,0.20), rgba(156,111,255,0.18))' : 'transparent',
            color: item.active ? '#00e5ff' : (isDark ? 'rgba(232,240,248,0.72)' : '#626266'),
            fontFamily: 'inherit', fontSize: 11, fontWeight: item.active ? 900 : 700,
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, reportSent: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Panel render error:', error, info)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, reportSent: false })
    }
  }

  handleClearHealthJourneyData = () => {
    try {
      localStorage.removeItem('health_journey_local_db_v1')
    } catch (e) {
      console.error('Unable to clear health journey data:', e)
    }
    this.setState({ error: null, reportSent: false })
  }

  handleClearFamilyData = () => {
    try {
      try { localStorage.removeItem('health_journey_local_db_v1') } catch (_) {}
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
    this.setState({ error: null, reportSent: false })
  }

  handleSendToAdmin = () => {
    const { error } = this.state
    const { panelLabel, user } = this.props
    addNotification({
      type: 'system-error',
      title: 'Lỗi render cần admin kiểm tra',
      message: `User ${user?.email || 'unknown'} báo lỗi tại ${panelLabel}: ${error?.message || 'Unknown panel error'}`,
      audience: 'admin',
      userEmail: user?.email || '',
      userName: user?.name || '',
      panelLabel,
      screenMessage: `Không thể tải trang ${panelLabel}`,
      errorMessage: error?.message || 'Unknown panel error',
      errorStack: error?.stack || '',
      status: 'new',
    })
    this.setState({ reportSent: true })
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
            <button type="button" onClick={this.handleClearHealthJourneyData} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(134,239,172,.35)', background: 'rgba(134,239,172,.1)', color: '#86efac', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              Xoá cache Health Journey
            </button>
            <button type="button" onClick={this.handleClearFamilyData} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(0,229,255,.35)', background: 'rgba(0,229,255,.1)', color: '#00e5ff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              Xoá dữ liệu gia đình trên máy
            </button>
            <button type="button" onClick={this.handleSendToAdmin} disabled={this.state.reportSent} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,183,77,.38)', background: this.state.reportSent ? 'rgba(0,230,118,.1)' : 'rgba(255,183,77,.12)', color: this.state.reportSent ? '#00e676' : '#ffb74d', fontWeight: 800, cursor: this.state.reportSent ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {this.state.reportSent ? 'Đã gửi admin' : 'Gửi admin'}
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