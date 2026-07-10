import React, { useCallback, useEffect, useRef, useState } from 'react'
import ObjModelViewer from './ObjModelViewer'
import TouchlessHandCam from './webcam/TouchlessHandCam'
import Camera3DAngleGizmo, { buildCameraPrompt } from './CameraAngle3DGizmo'
import VirtualHands from './VirtualHands'

// Medical Visual Playground 🧬 — Sandbox Y khoa 3D: chọn nội tạng, đổi chế độ
// xem (Solid/Wireframe/X-Ray), và điều khiển mô hình KHÔNG CHẠM bằng tay qua
// MediaPipe Hand Landmarker (xem TouchlessHandCam.jsx + useHandTracking.js).
//
// LƯU Ý VỀ ASSET: objUrl bên dưới trỏ tới public/assets/models/*.obj — dự án
// hiện CHƯA có sẵn các file .obj nội tạng thật, cần tự thêm vào theo đúng
// đường dẫn (xem MedicalVisualPlayground.md, mục 2 "Yêu cầu hệ thống"). Nếu
// file chưa tồn tại, ObjModelViewer sẽ chỉ log warning và không hiển thị
// mesh — không phải lỗi của component.
const DEFAULT_ATTACK05_OBJ_URL = 'https://raw.githubusercontent.com/godekd3133/DX9_WorldSkill_Practice_Gyeonggi_01/81ed0a14c63d309bbfc0fc98c8a40a43325336e6/Resource/Player/Animation/Attack05/Attack05%20(45).obj'
const DEFAULT_ATTACK05_MTL_URL = 'https://raw.githubusercontent.com/godekd3133/DX9_WorldSkill_Practice_Gyeonggi_01/81ed0a14c63d309bbfc0fc98c8a40a43325336e6/Resource/Player/Animation/Attack05/Attack05%20(45).mtl'
const DEFAULT_IMAGE_2D_URL = 'https://png.pngtree.com/png-clipart/20230812/original/pngtree-world-hepatitis-day-with-human-liver-organ-and-stethoscope-vector-png-image_10294720.png'
const DEFAULT_XYZ_TRANSFORM = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }

const organData = {
  heart: {
    id: 'heart', name: 'Tim (Heart)', emoji: '❤️',
    objUrl: '/assets/models/heart.obj',
    info: '> Mô phỏng nhịp tim: 75 bpm.\n> Tình trạng: Bình thường.\n> Huyết áp: 120/80 mmHg.',
    color: '#ef4444',
  },
  brain: {
    id: 'brain', name: 'Não (Brain)', emoji: '🧠',
    objUrl: '/assets/models/brain.obj',
    info: '> Hoạt động nơ-ron: Ổn định.\n> Thùy trán: Không phát hiện tổn thương.\n> Mức stress: Thấp.',
    color: '#a855f7',
  },
  lungs: {
    id: 'lungs', name: 'Phổi (Lungs)', emoji: '🫁',
    objUrl: '/assets/models/lungs.obj',
    info: '> Dung tích sống: 4.5 Lít.\n> SpO2: 98%.\n> Đường thở: Thông thoáng.',
    color: '#3b82f6',
  },
  liver: {
    id: 'liver', name: 'Gan (Liver)', emoji: '🩸',
    objUrl: '/assets/models/liver.obj',
    info: '> Kích thước: Bình thường.\n> Men gan: AST 25 U/L, ALT 22 U/L.\n> Không có dấu hiệu nhiễm mỡ.',
    color: '#84cc16',
  },
  attack05: {
    id: 'attack05', name: 'Attack05 (Default)', emoji: '🛡️',
    objUrl: DEFAULT_ATTACK05_OBJ_URL,
    mtlUrl: DEFAULT_ATTACK05_MTL_URL,
    info: '> Model Attack05 mặc định theo yêu cầu cho Medical 3D Lab.\n> OBJ và MTL được nạp từ GitHub raw vào textbox mặc định.\n> Mô hình 3D phủ màu cyan để đồng bộ giao diện lab.',
    color: '#06b6d4',
  },
  // Model demo dùng để KIỂM CHỨNG pipeline OBJ/MTL đang hoạt động thật (khác
  // với các entry nội tạng ở trên vốn là placeholder path chưa có file thật).
  // File .obj/.mtl đã được tải về và đặt tương đối trong
  // public/assets/models/ nên objUrl/mtlUrl trỏ đường dẫn tương đối, không
  // phải link tuyệt đối tới GitHub.
  krabbyPattie: {
    id: 'krabbyPattie', name: 'Krabby Patty (Demo)', emoji: '🍔',
    objUrl: '/assets/models/krabbypattie01.obj',
    mtlUrl: '/assets/models/krabbypattie01.mtl',
    info: '> Model demo kiểm tra pipeline OBJ/MTL.\n> Nguồn: grubtub19/GameEngine (Project3/Models/Krabby Patty).\n> Dùng để xác nhận ObjModelViewer tải đúng vật liệu (.mtl) trước khi thay bằng asset nội tạng thật.',
    color: '#f59e0b',
  },
}

export default function MedicalVisualPlayground({ onFullscreenChange }) {
  const [activeOrgan, setActiveOrgan] = useState('attack05')
  const [viewMode, setViewMode] = useState('solid') // solid | wireframe | xray
  const [autoRotate, setAutoRotate] = useState(true)
  const [isTouchlessOn, setIsTouchlessOn] = useState(false)
  const [accuracy, setAccuracy] = useState(98)
  const [showRoadmap, setShowRoadmap] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false)
  const [isFullScreenMode, setIsFullScreenMode] = useState(false)
  const [isSpatialHoverOn, setIsSpatialHoverOn] = useState(false)
  const [customObjUrl, setCustomObjUrl] = useState(DEFAULT_ATTACK05_OBJ_URL)
  const [customMtlUrl, setCustomMtlUrl] = useState(DEFAULT_ATTACK05_MTL_URL)
  const [customImage2dUrl, setCustomImage2dUrl] = useState(DEFAULT_IMAGE_2D_URL)
  const [imageXyzTransform, setImageXyzTransform] = useState(DEFAULT_XYZ_TRANSFORM)
  const [modelXyzTransform, setModelXyzTransform] = useState(DEFAULT_XYZ_TRANSFORM)
  const [customImageClipboardState, setCustomImageClipboardState] = useState('idle')
  const [customObjClipboardState, setCustomObjClipboardState] = useState('idle')
  const [customMtlClipboardState, setCustomMtlClipboardState] = useState('idle')

  // --- Camera Angle Gizmo: tái sử dụng công nghệ điều khiển góc máy ảnh của
  // CameraAngle3DGizmo.jsx (3 tay cầm kéo Azimuth/Elevation/Distance, snap
  // 8×4×3 vị trí) ngay trong Medical 3D Lab, thay cho OrbitControls tự do
  // khi bật, để bác sĩ chọn đúng góc chụp chuẩn hoá cho từng cơ quan.
  const [isCameraGizmoOn, setIsCameraGizmoOn] = useState(false)
  const [cameraAngle, setCameraAngle] = useState({ azimuth: 0, elevation: 0, distance: 1.0 })

  // --- Touchless Control: tọa độ do TouchlessHandCam bắn ra mỗi khung hình ---
  const [handRotation, setHandRotation] = useState(null) // [x, y] radian | null
  const [handScale, setHandScale] = useState(null) // number | null
  const lostTimerRef = useRef(null)
  const touchlessCameraRef = useRef(null)
  const [handMapping, setHandMapping] = useState({ mirrored: true, facingMode: 'user' })
  const handMappingRef = useRef({ mirrored: true, facingMode: 'user' })
  // Landmark thô (21 khớp/tay) cho VirtualHands — dùng useRef thay vì
  // useState vì dữ liệu này cập nhật ~60 lần/giây; nếu dùng useState sẽ bắt
  // React re-render toàn bộ MedicalVisualPlayground 60 lần/giây (rất tốn).
  // VirtualHands tự đọc landmarksRef.current bên trong vòng lặp
  // requestAnimationFrame riêng của nó, hoàn toàn không phụ thuộc chu kỳ
  // render của React.
  const handLandmarksRef = useRef([])

  const currentOrgan = organData[activeOrgan]
  const customObjUrlValue = customObjUrl.trim()
  const customMtlUrlValue = customMtlUrl.trim()
  const customImage2dUrlValue = customImage2dUrl.trim()
  const gizmoImageUrl = customImage2dUrlValue || DEFAULT_IMAGE_2D_URL
  const gizmoObjUrl = customObjUrlValue || currentOrgan.objUrl
  const gizmoMtlUrl = customMtlUrlValue || currentOrgan.mtlUrl
  const viewerObjUrl = customObjUrlValue || currentOrgan.objUrl
  const viewerMtlUrl = customMtlUrlValue || currentOrgan.mtlUrl

  const clearCustomImageUrl = () => setCustomImage2dUrl('')
  const clearCustomObjUrl = () => setCustomObjUrl('')
  const clearCustomMtlUrl = () => setCustomMtlUrl('')


  const copyCustomImageUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(customImage2dUrl || '')
      setCustomImageClipboardState('copied')
    } catch (err) {
      console.warn('Copy 2D image link failed', err)
      setCustomImageClipboardState('error')
    }
    setTimeout(() => setCustomImageClipboardState('idle'), 1800)
  }

  const pasteCustomImageUrlFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setCustomImage2dUrl(text.trim())
      setCustomImageClipboardState('pasted')
    } catch (err) {
      console.warn('Paste 2D image link failed (trình duyệt có thể chưa cấp quyền clipboard)', err)
      setCustomImageClipboardState('error')
    }
    setTimeout(() => setCustomImageClipboardState('idle'), 1800)
  }

  const copyCustomObjUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(customObjUrl || '')
      setCustomObjClipboardState('copied')
    } catch (err) {
      console.warn('Copy OBJ link failed', err)
      setCustomObjClipboardState('error')
    }
    setTimeout(() => setCustomObjClipboardState('idle'), 1800)
  }

  const pasteCustomObjUrlFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setCustomObjUrl(text.trim())
      setCustomObjClipboardState('pasted')
    } catch (err) {
      console.warn('Paste OBJ link failed (trình duyệt có thể chưa cấp quyền clipboard)', err)
      setCustomObjClipboardState('error')
    }
    setTimeout(() => setCustomObjClipboardState('idle'), 1800)
  }

  const copyCustomMtlUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(customMtlUrl || '')
      setCustomMtlClipboardState('copied')
    } catch (err) {
      console.warn('Copy MTL link failed', err)
      setCustomMtlClipboardState('error')
    }
    setTimeout(() => setCustomMtlClipboardState('idle'), 1800)
  }

  const pasteCustomMtlUrlFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setCustomMtlUrl(text.trim())
      setCustomMtlClipboardState('pasted')
    } catch (err) {
      console.warn('Paste MTL link failed (trình duyệt có thể chưa cấp quyền clipboard)', err)
      setCustomMtlClipboardState('error')
    }
    setTimeout(() => setCustomMtlClipboardState('idle'), 1800)
  }

  const handleHandMappingChange = useCallback((nextMapping) => {
    handMappingRef.current = nextMapping
    setHandMapping((current) => (
      current.mirrored === nextMapping.mirrored && current.facingMode === nextMapping.facingMode
        ? current
        : nextMapping
    ))
  }, [])

  useEffect(() => {
    setAccuracy(Math.floor(Math.random() * 5) + 95)
  }, [activeOrgan])

  // Tắt touchless control -> quay lại trạng thái xoay bình thường.
  useEffect(() => {
    if (!isTouchlessOn) { setHandRotation(null); setHandScale(null); handLandmarksRef.current = [] }
  }, [isTouchlessOn])

  // Touchless Control và Camera Angle Gizmo cùng chiếm khu vực canvas chính
  // -> loại trừ lẫn nhau, bật cái này thì tắt cái kia.
  const toggleTouchless = useCallback(() => {
    setIsTouchlessOn((v) => {
      const next = !v
      if (next) setIsCameraGizmoOn(false)
      if (!next) setIsSpatialHoverOn(false)
      return next
    })
  }, [])
  const toggleCameraGizmo = useCallback(() => {
    setIsCameraGizmoOn((v) => {
      const next = !v
      if (next) {
        setIsTouchlessOn(false)
        setIsSpatialHoverOn(false)
        setIsRightMenuOpen(true)
      }
      return next
    })
  }, [])

  const toggleFullScreenMode = useCallback(() => {
    setIsFullScreenMode((v) => {
      const next = !v
      onFullscreenChange?.(next)
      return next
    })
  }, [onFullscreenChange])

  useEffect(() => () => onFullscreenChange?.(false), [onFullscreenChange])

  // --- HAND TRACKING MAPPER (map tọa độ MediaPipe -> rotation/scale 3D) ---
  // wrist (landmark 0): x,y trong khoảng 0..1 -> trừ 0.5 để lấy tâm khung
  // hình làm gốc, nhân Math.PI*2 để ra góc xoay radian đầy đủ 360°.
  // thumbTip (4) / indexTip (8): khoảng cách Euclid giữa 2 đầu ngón dùng cho
  // cử chỉ Pinch-to-zoom — chụm lại thì mô hình thu nhỏ, mở ra thì phóng to.
  const handleHandTrack = useCallback((landmarksList) => {
    if (lostTimerRef.current) { clearTimeout(lostTimerRef.current); lostTimerRef.current = null }
    // Gán trực tiếp vào ref cho VirtualHands — KHÔNG setState, không re-render.
    handLandmarksRef.current = landmarksList
    const hand = landmarksList?.[0]
    if (!hand) return

    const wrist = hand[0]
    const rotationX = (wrist.y - 0.5) * Math.PI * 2
    // Đồng bộ theo camera đang dùng: camera trước hiển thị dạng gương,
    // camera sau giữ tọa độ raw để bàn tay ảo và điều khiển 3D không bị ngược.
    const normalizedX = handMappingRef.current.mirrored ? 0.5 - wrist.x : wrist.x - 0.5
    const rotationY = normalizedX * Math.PI * 2
    setHandRotation([rotationX, rotationY])

    const thumbTip = hand[4]
    const indexTip = hand[8]
    if (thumbTip && indexTip) {
      const distance = Math.sqrt(
        (indexTip.x - thumbTip.x) ** 2 + (indexTip.y - thumbTip.y) ** 2
      )
      let newScale = distance * 5
      newScale = Math.max(0.5, Math.min(newScale, 2.5))
      setHandScale(newScale)
    }
  }, [])

  // Mất dấu tay một lúc (rời khỏi khung hình) -> nhả điều khiển, không đứng
  // hình đột ngột.
  const handleHandLost = useCallback(() => {
    if (lostTimerRef.current) return
    lostTimerRef.current = setTimeout(() => {
      setHandRotation(null)
      setHandScale(null)
      handLandmarksRef.current = []
      lostTimerRef.current = null
    }, 600)
  }, [])

  return (
    <div className="relative flex h-full min-h-[640px] bg-slate-900 text-white font-sans overflow-hidden rounded-2xl border border-slate-700">

      {/* --- SIDEBAR --- */}
      <div className={`${isSidebarCollapsed ? 'w-0 border-r-0 -translate-x-full' : 'w-80 max-lg:w-72 max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:w-[86vw] translate-x-0'} bg-slate-800 border-r border-slate-700 flex flex-col shadow-2xl z-10 overflow-hidden transition-all duration-300 ease-out`}>
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
            🧬 Medical 3D Lab
          </h2>
          <p className="text-sm text-slate-400 mt-2">Khu vực phân tích giải phẫu AI</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">Chọn cơ quan</h3>
            <div className="grid grid-cols-2 gap-3">
              {[organData.heart, organData.brain, organData.lungs, organData.liver, organData.attack05, organData.krabbyPattie].map((organ) => (
                <button
                  key={organ.id}
                  onClick={() => setActiveOrgan(organ.id)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    activeOrgan === organ.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{organ.emoji}</span> {organ.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                Textbox 2 · Link model .obj
              </label>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Default OBJ model URL"
                  value={customObjUrl}
                  onChange={(e) => setCustomObjUrl(e.target.value)}
                  placeholder="Dán link model .obj cho mô hình 3D và Camera Angle Gizmo"
                  className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 font-mono text-[11px] text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                />
                <button
                  type="button"
                  onClick={clearCustomObjUrl}
                  title="Xoá Link đang có trong Textbox"
                  aria-label="Xoá Link đang có trong Textbox"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-300/40 bg-red-500/10 text-xs shadow-sm transition hover:bg-red-500/20"
                >
                  ❌
                </button>
                <button
                  type="button"
                  onClick={copyCustomObjUrlToClipboard}
                  title="Copy Link đang có trong Textbox vào bộ nhớ"
                  aria-label="Copy Link đang có trong Textbox vào bộ nhớ"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/40 bg-cyan-500/10 text-xs shadow-sm transition hover:bg-cyan-500/20"
                >
                  {customObjClipboardState === 'copied' ? '✅' : '📋'}
                </button>
                <button
                  type="button"
                  onClick={pasteCustomObjUrlFromClipboard}
                  title="Copy Link trong bộ nhớ vào Textbox"
                  aria-label="Copy Link trong bộ nhớ vào Textbox"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-300/40 bg-emerald-500/10 text-xs shadow-sm transition hover:bg-emerald-500/20"
                >
                  {customObjClipboardState === 'pasted' ? '✅' : '📥'}
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                Ô này dùng mặc định cho mô hình 3D phủ màu và Camera Angle Gizmo; để trống sẽ quay lại model của cơ quan đang chọn.
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                Textbox 3 · Link model .mtl (material)
              </label>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Default MTL material URL"
                  value={customMtlUrl}
                  onChange={(e) => setCustomMtlUrl(e.target.value)}
                  placeholder="Dán link material .mtl cho mô hình 3D và Camera Angle Gizmo"
                  className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 font-mono text-[11px] text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                />
                <button
                  type="button"
                  onClick={clearCustomMtlUrl}
                  title="Xoá Link đang có trong Textbox"
                  aria-label="Xoá Link đang có trong Textbox"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-300/40 bg-red-500/10 text-xs shadow-sm transition hover:bg-red-500/20"
                >
                  ❌
                </button>
                <button
                  type="button"
                  onClick={copyCustomMtlUrlToClipboard}
                  title="Copy Link đang có trong Textbox vào bộ nhớ"
                  aria-label="Copy Link đang có trong Textbox vào bộ nhớ"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/40 bg-cyan-500/10 text-xs shadow-sm transition hover:bg-cyan-500/20"
                >
                  {customMtlClipboardState === 'copied' ? '✅' : '📋'}
                </button>
                <button
                  type="button"
                  onClick={pasteCustomMtlUrlFromClipboard}
                  title="Copy Link trong bộ nhớ vào Textbox"
                  aria-label="Copy Link trong bộ nhớ vào Textbox"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-300/40 bg-emerald-500/10 text-xs shadow-sm transition hover:bg-emerald-500/20"
                >
                  {customMtlClipboardState === 'pasted' ? '✅' : '📥'}
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                Material .mtl đi kèm mô hình 3D phủ màu; để trống sẽ dùng material của cơ quan đang chọn nếu có.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">Công cụ kết xuất (Render)</h3>
            <div className="space-y-4">
              <label className={`flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-700 transition-colors ${isTouchlessOn ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:bg-slate-700/50'}`}>
                <span className="text-sm font-medium text-slate-300">Xoay tự động (Auto)</span>
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 bg-slate-800 border-slate-600 cursor-pointer"
                />
              </label>

              <div className="bg-slate-700/30 p-1 rounded-lg border border-slate-700 flex">
                {['solid', 'wireframe', 'xray'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 py-2 text-xs font-semibold capitalize rounded-md transition-all ${
                      viewMode === mode ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                  >
                    {mode === 'xray' ? 'X-Ray' : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">Điều khiển 3D</h3>
            <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl space-y-2">
              <button
                onClick={toggleCameraGizmo}
                className={`w-full px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isCameraGizmoOn
                    ? 'bg-red-500/80 hover:bg-red-500 text-white border border-red-400'
                    : 'bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-400'
                }`}
              >
                {isCameraGizmoOn ? '🔴 Tắt Camera Angle Gizmo' : '🎥 Bật Camera Angle Gizmo'}
              </button>

              {isCameraGizmoOn && (
                <div className="space-y-2">
                  <div className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-[10px] font-mono text-emerald-300 text-left">
                    Kéo 🟢 Azimuth / 🩷 Elevation / 🟠 Distance quanh {currentOrgan.name} để chọn góc chụp chuẩn.
                  </div>
                  <button type="button" onClick={() => setIsRightMenuOpen((v) => !v)} className="w-full rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-500/20">
                    {isRightMenuOpen ? 'Ẩn menu bên phải' : 'Hiện menu bên phải'}
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setIsSpatialHoverOn((v) => {
                    const next = !v
                    if (next) {
                      setIsTouchlessOn(true)
                      setIsCameraGizmoOn(false)
                    }
                    return next
                  })
                }}
                className={`w-full px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isSpatialHoverOn
                    ? 'bg-fuchsia-500/80 hover:bg-fuchsia-500 text-white border border-fuchsia-300'
                    : 'bg-cyan-600/80 hover:bg-cyan-600 text-white border border-cyan-300'
                }`}
              >
                {isSpatialHoverOn ? '🧤 Tắt chạm 3D' : '🧤 Bật chạm hotspot 3D'}
              </button>

              {isSpatialHoverOn && (
                <div className="bg-black/40 border border-cyan-300/20 px-3 py-2 rounded-lg text-[10px] font-mono text-cyan-200 text-left">
                  Đưa ngón trỏ ảo vào chấm sáng để mở bảng chú thích 3D kiểu AnatomyHoverOverlay.
                </div>
              )}

              <button
                onClick={toggleTouchless}
                className={`w-full px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isTouchlessOn
                    ? 'bg-red-500/80 hover:bg-red-500 text-white border border-red-400'
                    : 'bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-400'
                }`}
              >
                {isTouchlessOn ? '🔴 Tắt Touchless Control' : '🤚 Bật Touchless Control'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4 flex items-center gap-2">
              🤖 AI Phân tích (Live)
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </h3>
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl relative overflow-hidden">
              <div className="text-sm text-green-400 leading-relaxed font-mono whitespace-pre-wrap">
                {currentOrgan.info}
                <br /><br />
                {'> 🟢 Đang theo dõi realtime...'}
              </div>
            </div>
          </div>

          {/* --- HƯỚNG PHÁT TRIỂN MỞ RỘNG --- */}
          <div>
            <button
              onClick={() => setShowRoadmap((v) => !v)}
              className="w-full flex items-center justify-between text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3"
            >
              <span>🔮 Hướng phát triển mở rộng</span>
              <span className="text-slate-500">{showRoadmap ? '▲' : '▼'}</span>
            </button>
            {showRoadmap && (
              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <div className="bg-slate-700/30 border border-green-700/40 rounded-lg p-3">
                  <div className="font-semibold text-green-400 mb-1">✅ Đã triển khai — Touchless Control</div>
                  <p>
                    Camera + MediaPipe Hand Landmarker nhận diện bàn tay realtime.
                    Tọa độ cổ tay (landmark 0) được ánh xạ thành góc xoay
                    <code className="mx-1 text-cyan-300">(x−0.5)·2π</code>,
                    khoảng cách ngón cái↔ngón trỏ (landmark 4↔8) được ánh xạ
                    thành scale Pinch-to-zoom, rồi nội suy (Lerp) mượt vào
                    <code className="mx-1 text-cyan-300">ObjModelViewer</code>
                    qua props <code className="text-cyan-300">customRotation</code> /
                    <code className="text-cyan-300"> customScale</code>.
                  </p>
                </div>
                <div className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
                  <div className="font-semibold text-slate-200 mb-1">🔜 Gợi ý bước tiếp theo</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <b>Dynamic AI API:</b> thay text tĩnh ở khung "AI Phân tích"
                      bằng prompt trạng thái nội tạng gửi tới
                      <code className="mx-1 text-cyan-300">api/groq-proxy.js</code>,
                      hiển thị kết quả bằng hiệu ứng typewriter.
                    </li>
                    <li>
                      <b>Thêm cử chỉ:</b> nắm tay (fist) để tạm dừng xoay, vuốt
                      sang trái/phải để đổi cơ quan đang xem.
                    </li>
                    <li>
                      <b>Asset thật:</b> thêm file .obj/.mtl nội tạng thật vào
                      <code className="mx-1 text-cyan-300">public/assets/models/</code>
                      (hiện đang là placeholder path).
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MAIN CANVAS --- */}
      <div className="min-w-0 flex-1 relative bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]">
        <button
          onClick={() => { setIsSidebarCollapsed((v) => !v); setIsFullScreenMode(false); onFullscreenChange?.(false) }}
          className="absolute left-3 top-3 z-30 rounded-full border border-cyan-300/30 bg-slate-950/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.25)] backdrop-blur-md transition hover:bg-cyan-500/20"
          title={isSidebarCollapsed ? 'Mở bảng bên trái' : 'Đóng bảng bên trái'}
        >
          {isSidebarCollapsed ? '☰ Mở Lab Panel' : '⟵ Đóng Panel'}
        </button>

        <button type="button" onClick={toggleFullScreenMode} className="absolute left-1/2 top-3 z-30 hidden -translate-x-1/2 rounded-full sm:block border border-fuchsia-300/40 bg-slate-950/85 px-4 py-2 text-xs font-black uppercase tracking-wider text-fuchsia-100 shadow-[0_0_18px_rgba(217,70,239,0.25)] backdrop-blur-md transition hover:bg-fuchsia-500/20 max-sm:px-3 max-sm:text-[10px]">
          {isFullScreenMode ? '☰ Toàn màn hình' : 'Toàn màn hình'}
        </button>

        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <div className="text-center leading-none">
            <div className="text-[clamp(2rem,7vw,5rem)] font-black uppercase tracking-[0.18em]">KhanhLX</div>
            <h1 className="text-[clamp(4rem,14vw,10rem)] font-black uppercase tracking-tighter">ANATOMY</h1>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center cursor-move">
          {isCameraGizmoOn ? (
            <div className="w-full h-full max-w-4xl max-h-[min(620px,82vh)] p-3 sm:p-6">
              <Camera3DAngleGizmo
                mode="both"
                imageUrl={gizmoImageUrl}
                objUrl={gizmoObjUrl}
                mtlUrl={gizmoMtlUrl}
                objectTransforms={{ image: imageXyzTransform, obj: modelXyzTransform }}
                value={cameraAngle}
                onChange={setCameraAngle}
              />
            </div>
          ) : (
            <ObjModelViewer
              modelUrl={viewerObjUrl}
              mtlUrl={viewerMtlUrl}
              isDark
              autoRotate={autoRotate}
              showGrid={false}
              wireframe={viewMode === 'wireframe'}
              transparent={viewMode === 'xray'}
              opacity={viewMode === 'xray' ? 0.3 : 1}
              color={currentOrgan.color}
              customRotation={isTouchlessOn ? handRotation : null}
              customScale={isTouchlessOn ? handScale : null}
              handLandmarksRef={handLandmarksRef}
              enableSpatialHover={isSpatialHoverOn}
              organId={currentOrgan.id}
            />
          )}
        </div>

        {/* --- HOLOGRAM HANDS: khung xương bàn tay cyan lơ lửng phủ lên trên
        mô hình, cập nhật qua handLandmarksRef (không re-render React) —
        chỉ hiện khi Touchless Control đang bật và đang có tay trong khung
        hình. pointer-events-none để không chặn thao tác kéo/chuột bên dưới. */}
        {isTouchlessOn && !isCameraGizmoOn && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <VirtualHands landmarksRef={handLandmarksRef} mirrored={handMapping.mirrored} />
          </div>
        )}

        <div className="absolute left-3 top-16 flex max-w-xs max-sm:max-w-[calc(100vw-1.5rem)] flex-col gap-3 pointer-events-none z-20">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl text-left shadow-lg">
            <div className="text-4xl font-light text-white tracking-tighter">
              {accuracy}<span className="text-lg text-slate-400">%</span>
            </div>
            <div className="text-[10px] text-blue-400 font-bold tracking-widest uppercase mt-1">Độ chính xác mô hình</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl text-left shadow-lg">
            <div className="text-xs text-slate-300 mb-1">
              Asset: <span className="font-mono text-white">{viewerObjUrl.split('/').pop()}</span>
              {viewerMtlUrl && <span className="font-mono text-slate-400"> + {viewerMtlUrl.split('/').pop()}</span>}
            </div>
            <div className="text-xs text-slate-300">
              Render: <span className="text-green-400">Three.js / WebGL</span>
            </div>
            {isTouchlessOn && (handRotation || handScale) && (
              <div className="text-[10px] text-cyan-300 mt-1">🖐 Touchless đang điều khiển</div>
            )}
            {isCameraGizmoOn && (
              <div className="text-[10px] text-emerald-300 mt-1 font-mono">
                {buildCameraPrompt(cameraAngle.azimuth, cameraAngle.elevation, cameraAngle.distance)}
              </div>
            )}
          </div>
        </div>


        <button type="button" onClick={() => setIsRightMenuOpen((v) => !v)} className="absolute right-3 top-3 z-40 rounded-full border border-cyan-300/40 bg-slate-950/85 px-4 py-2 text-xs font-black uppercase tracking-wider text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.25)] backdrop-blur-md transition hover:bg-cyan-500/20 max-sm:px-3 max-sm:text-[10px]">
          {isRightMenuOpen ? 'Ẩn menu phải' : '☰ Menu 2D + 3D'}
        </button>

        <div className={`absolute right-3 top-16 z-30 w-[min(760px,calc(100%-1.5rem))] max-h-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-cyan-300/30 bg-slate-950/90 text-left shadow-2xl shadow-cyan-950/30 backdrop-blur-xl transition-all duration-300 ${isRightMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">XYZ Transform · 2D + 3D</div>
              <div className="text-[10px] text-slate-400">Menu toggle ẩn/hiện bên phải cho Camera Angle Gizmo.</div>
            </div>
            <button type="button" onClick={() => setIsRightMenuOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" aria-label="Đóng menu bên phải">✕</button>
          </div>
          <div className="max-h-[calc(100vh-8rem)] space-y-3 overflow-y-auto p-3">
            <UrlControl label="Textbox 1 · Link ảnh 2D" value={customImage2dUrl} onChange={setCustomImage2dUrl} onClear={clearCustomImageUrl} onCopy={copyCustomImageUrlToClipboard} onPaste={pasteCustomImageUrlFromClipboard} state={customImageClipboardState} placeholder="Dán link ảnh 2D để hiển thị cùng mô hình 3D" />
            <div className="grid gap-3 md:grid-cols-2">
              <XyzTransformControls title="2D XYZ Transform" value={imageXyzTransform} onChange={setImageXyzTransform} />
              <XyzTransformControls title="3D XYZ Transform" value={modelXyzTransform} onChange={setModelXyzTransform} />
            </div>
          </div>
        </div>
        {isTouchlessOn && !isCameraGizmoOn && (
          <div className="absolute right-3 top-16 z-40 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => touchlessCameraRef.current?.switchToFrontCamera?.()}
              className="rounded-full border border-cyan-300/40 bg-slate-950/85 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.25)] backdrop-blur-md transition hover:bg-cyan-500/20"
              title="Chuyển về camera trước/selfie và đồng bộ mapping bàn tay"
            >
              🔄 Chuyển Camera Trước
            </button>
            <button
              type="button"
              onClick={() => touchlessCameraRef.current?.toggleTorch?.()}
              className="grid h-9 w-9 place-items-center rounded-full border border-yellow-300/40 bg-slate-950/85 text-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.25)] backdrop-blur-md transition hover:bg-yellow-400/20"
              title="Bật/tắt đèn flash nếu camera và trình duyệt hỗ trợ"
              aria-label="Bật tắt đèn flash"
            >
              ⚡
            </button>
            <button
              type="button"
              onClick={() => touchlessCameraRef.current?.closeCamera?.()}
              className="grid h-9 w-9 place-items-center rounded-full border border-red-300/40 bg-slate-950/85 text-red-200 shadow-[0_0_18px_rgba(248,113,113,0.25)] backdrop-blur-md transition hover:bg-red-500/20"
              title="Tắt camera Touchless Control"
              aria-label="Tắt camera"
            >
              ✕
            </button>
          </div>
        )}

        {isTouchlessOn && (
          <div className="fixed bottom-6 left-6 z-40 w-72 max-sm:left-3 max-sm:bottom-3 max-sm:w-[calc(100vw-1.5rem)] aspect-video bg-black rounded-xl border border-white/20 overflow-hidden shadow-2xl">
            <TouchlessHandCam
              ref={touchlessCameraRef}
              onHandTrack={handleHandTrack}
              onHandLost={handleHandLost}
              onMappingChange={handleHandMappingChange}
              onClose={() => setIsTouchlessOn(false)}
            />
            <div className="absolute inset-0 border-2 border-dashed border-white/10 m-2 rounded-lg pointer-events-none"></div>
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded text-[10px] font-mono pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              MediaPipe Hand Tracking
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UrlControl({ label, value, onChange, onClear, onCopy, onPaste, state, placeholder }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{label}</label>
      <div className="flex items-center gap-2 max-[420px]:flex-wrap">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 font-mono text-[11px] text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 max-[420px]:basis-full"
        />
        <button type="button" onClick={onClear} title="Xoá Link đang có trong Textbox" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-300/40 bg-red-500/10 text-xs shadow-sm transition hover:bg-red-500/20">❌</button>
        <button type="button" onClick={onCopy} title="Copy Link đang có trong Textbox vào bộ nhớ" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/40 bg-cyan-500/10 text-xs shadow-sm transition hover:bg-cyan-500/20">{state === 'copied' ? '✅' : '📋'}</button>
        <button type="button" onClick={onPaste} title="Copy Link trong bộ nhớ vào Textbox" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-300/40 bg-emerald-500/10 text-xs shadow-sm transition hover:bg-emerald-500/20">{state === 'pasted' ? '✅' : '📥'}</button>
      </div>
    </div>
  )
}

function XyzTransformControls({ value, onChange, title }) {
  const updateTransform = (group, axis) => (event) => {
    const nextValue = Number(event.target.value)
    onChange((prev) => ({ ...prev, [group]: { ...prev[group], [axis]: nextValue } }))
  }

  const rows = [
    ['position', 'x', '↔️ Di chuyển trục X', -2, 2, 0.05, value.position.x.toFixed(2)],
    ['position', 'y', '↕️ Di chuyển trục Y', -2, 2, 0.05, value.position.y.toFixed(2)],
    ['position', 'z', '↗️ Di chuyển trục Z', -2, 2, 0.05, value.position.z.toFixed(2)],
    ['rotation', 'x', '🔄 Xoay trục X', -180, 180, 5, `${value.rotation.x}°`],
    ['rotation', 'y', '🔄 Xoay trục Y', -180, 180, 5, `${value.rotation.y}°`],
    ['rotation', 'z', '🔄 Xoay trục Z', -180, 180, 5, `${value.rotation.z}°`],
  ]

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-black text-slate-100">{title}</div>
        <button type="button" onClick={() => onChange(DEFAULT_XYZ_TRANSFORM)} className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-[11px] font-black text-amber-200 transition hover:bg-amber-500/20">Reset</button>
      </div>
      <div className="space-y-3">
        {rows.map(([group, axis, label, min, max, step, display]) => (
          <label key={`${group}-${axis}`} className="block text-[11px] font-bold text-slate-300">
            <span className="mb-1 flex items-center justify-between gap-2"><span>{label}</span><span className="font-mono text-cyan-200">{display}</span></span>
            <input type="range" min={min} max={max} step={step} value={value[group][axis]} onChange={updateTransform(group, axis)} className="w-full accent-cyan-400" />
          </label>
        ))}
      </div>
    </div>
  )
}
