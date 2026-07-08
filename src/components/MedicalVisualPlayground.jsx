import React, { useCallback, useEffect, useRef, useState } from 'react'
import ObjModelViewer from './ObjModelViewer'
import TouchlessHandCam from './webcam/TouchlessHandCam'
import Camera3DAngleGizmo, { buildCameraPrompt } from './CameraAngle3DGizmo'

// Medical Visual Playground 🧬 — Sandbox Y khoa 3D: chọn nội tạng, đổi chế độ
// xem (Solid/Wireframe/X-Ray), và điều khiển mô hình KHÔNG CHẠM bằng tay qua
// MediaPipe Hand Landmarker (xem TouchlessHandCam.jsx + useHandTracking.js).
//
// LƯU Ý VỀ ASSET: objUrl bên dưới trỏ tới public/assets/models/*.obj — dự án
// hiện CHƯA có sẵn các file .obj nội tạng thật, cần tự thêm vào theo đúng
// đường dẫn (xem MedicalVisualPlayground.md, mục 2 "Yêu cầu hệ thống"). Nếu
// file chưa tồn tại, ObjModelViewer sẽ chỉ log warning và không hiển thị
// mesh — không phải lỗi của component.
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

export default function MedicalVisualPlayground() {
  const [activeOrgan, setActiveOrgan] = useState('heart')
  const [viewMode, setViewMode] = useState('solid') // solid | wireframe | xray
  const [autoRotate, setAutoRotate] = useState(true)
  const [isTouchlessOn, setIsTouchlessOn] = useState(false)
  const [accuracy, setAccuracy] = useState(98)
  const [showRoadmap, setShowRoadmap] = useState(false)

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

  const currentOrgan = organData[activeOrgan]

  useEffect(() => {
    setAccuracy(Math.floor(Math.random() * 5) + 95)
  }, [activeOrgan])

  // Tắt touchless control -> quay lại trạng thái xoay bình thường.
  useEffect(() => {
    if (!isTouchlessOn) { setHandRotation(null); setHandScale(null) }
  }, [isTouchlessOn])

  // Touchless Control và Camera Angle Gizmo cùng chiếm khu vực canvas chính
  // -> loại trừ lẫn nhau, bật cái này thì tắt cái kia.
  const toggleTouchless = useCallback(() => {
    setIsTouchlessOn((v) => {
      const next = !v
      if (next) setIsCameraGizmoOn(false)
      return next
    })
  }, [])
  const toggleCameraGizmo = useCallback(() => {
    setIsCameraGizmoOn((v) => {
      const next = !v
      if (next) setIsTouchlessOn(false)
      return next
    })
  }, [])

  // --- HAND TRACKING MAPPER (map tọa độ MediaPipe -> rotation/scale 3D) ---
  // wrist (landmark 0): x,y trong khoảng 0..1 -> trừ 0.5 để lấy tâm khung
  // hình làm gốc, nhân Math.PI*2 để ra góc xoay radian đầy đủ 360°.
  // thumbTip (4) / indexTip (8): khoảng cách Euclid giữa 2 đầu ngón dùng cho
  // cử chỉ Pinch-to-zoom — chụm lại thì mô hình thu nhỏ, mở ra thì phóng to.
  const handleHandTrack = useCallback((landmarksList) => {
    if (lostTimerRef.current) { clearTimeout(lostTimerRef.current); lostTimerRef.current = null }
    const hand = landmarksList?.[0]
    if (!hand) return

    const wrist = hand[0]
    const rotationX = (wrist.y - 0.5) * Math.PI * 2
    const rotationY = (wrist.x - 0.5) * Math.PI * 2
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
      lostTimerRef.current = null
    }, 600)
  }, [])

  return (
    <div className="flex h-full min-h-[640px] bg-slate-900 text-white font-sans overflow-hidden rounded-2xl border border-slate-700">

      {/* --- SIDEBAR --- */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col shadow-2xl z-10">
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
              {Object.values(organData).map((organ) => (
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
      <div className="flex-1 relative bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <h1 className="text-[10rem] font-black uppercase tracking-tighter">ANATOMY</h1>
        </div>

        <div className="absolute inset-0 flex items-center justify-center cursor-move">
          {isCameraGizmoOn ? (
            <div className="w-full h-full max-w-3xl max-h-[560px] p-6">
              <Camera3DAngleGizmo
                objUrl={currentOrgan.objUrl}
                value={cameraAngle}
                onChange={setCameraAngle}
              />
            </div>
          ) : (
            <ObjModelViewer
              modelUrl={currentOrgan.objUrl}
              mtlUrl={currentOrgan.mtlUrl}
              isDark
              autoRotate={autoRotate}
              showGrid={false}
              wireframe={viewMode === 'wireframe'}
              transparent={viewMode === 'xray'}
              opacity={viewMode === 'xray' ? 0.3 : 1}
              color={currentOrgan.color}
              customRotation={isTouchlessOn ? handRotation : null}
              customScale={isTouchlessOn ? handScale : null}
            />
          )}
        </div>

        <div className="absolute top-6 right-6 flex flex-col gap-3 pointer-events-none z-20">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl text-right shadow-lg">
            <div className="text-4xl font-light text-white tracking-tighter">
              {accuracy}<span className="text-lg text-slate-400">%</span>
            </div>
            <div className="text-[10px] text-blue-400 font-bold tracking-widest uppercase mt-1">Độ chính xác mô hình</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl text-right shadow-lg">
            <div className="text-xs text-slate-300 mb-1">
              Asset: <span className="font-mono text-white">{currentOrgan.objUrl.split('/').pop()}</span>
              {currentOrgan.mtlUrl && <span className="font-mono text-slate-400"> + {currentOrgan.mtlUrl.split('/').pop()}</span>}
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

        {/* --- TOUCHLESS CONTROL + CAMERA ANGLE GIZMO --- */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2">
          <button
            onClick={toggleCameraGizmo}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
              isCameraGizmoOn
                ? 'bg-red-500/80 hover:bg-red-500 text-white border border-red-400'
                : 'bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-400'
            }`}
          >
            {isCameraGizmoOn ? '🔴 Tắt Camera Angle Gizmo' : '🎥 Bật Camera Angle Gizmo'}
          </button>

          {isCameraGizmoOn && (
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-2 rounded-lg text-[10px] font-mono text-emerald-300 max-w-[260px] text-right">
              Kéo 🟢 Azimuth / 🩷 Elevation / 🟠 Distance quanh {currentOrgan.name} để chọn góc chụp chuẩn.
            </div>
          )}

          <button
            onClick={toggleTouchless}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
              isTouchlessOn
                ? 'bg-red-500/80 hover:bg-red-500 text-white border border-red-400'
                : 'bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-400'
            }`}
          >
            {isTouchlessOn ? '🔴 Tắt Touchless Control' : '🤚 Bật Touchless Control'}
          </button>

          {isTouchlessOn && (
            <div className="w-72 aspect-video bg-black rounded-xl border border-white/20 overflow-hidden shadow-2xl relative">
              <TouchlessHandCam onHandTrack={handleHandTrack} onHandLost={handleHandLost} />
              <div className="absolute inset-0 border-2 border-dashed border-white/10 m-2 rounded-lg pointer-events-none"></div>
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded text-[10px] font-mono pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                MediaPipe Hand Tracking
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
