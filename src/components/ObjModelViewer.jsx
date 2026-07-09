import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const TOUCH_HOTSPOTS = {
  heart: [
    { id: 'left-ventricle', position: [0.42, 1.05, 0.12], label: 'Tâm thất trái', info: 'Buồng bơm chính, đẩy máu giàu oxy đi toàn thân.', status: 'Normal' },
    { id: 'right-atrium', position: [-0.34, 1.38, 0.08], label: 'Tâm nhĩ phải', info: 'Nhận máu tĩnh mạch trở về tim; cần theo dõi nhịp khi có cảnh báo.', status: 'Warning' },
    { id: 'aorta', position: [0.08, 1.82, -0.08], label: 'Động mạch chủ', info: 'Mạch máu lớn nhất, dẫn máu từ tim đến hệ tuần hoàn.', status: 'Normal' },
  ],
  brain: [
    { id: 'frontal-lobe', position: [0, 1.55, 0.16], label: 'Thùy trán', info: 'Liên quan lập kế hoạch, vận động chủ ý và ra quyết định.', status: 'Normal' },
    { id: 'temporal-lobe', position: [-0.42, 1.08, 0.1], label: 'Thùy thái dương', info: 'Xử lý âm thanh, trí nhớ và nhận diện ngôn ngữ.', status: 'Normal' },
  ],
  lungs: [
    { id: 'left-lung', position: [-0.45, 1.22, 0.12], label: 'Phổi trái', info: 'Trao đổi oxy/CO₂, có rãnh tim ở mặt trong.', status: 'Normal' },
    { id: 'right-lung', position: [0.48, 1.2, 0.12], label: 'Phổi phải', info: 'Thường có 3 thùy; theo dõi thông khí khi SpO₂ giảm.', status: 'Warning' },
  ],
  liver: [
    { id: 'right-lobe', position: [0.28, 1.16, 0.16], label: 'Thùy phải gan', info: 'Vùng lớn nhất của gan, tham gia chuyển hóa và thải độc.', status: 'Normal' },
    { id: 'portal-area', position: [-0.22, 1.05, 0.18], label: 'Rốn gan', info: 'Khu vực mạch máu và đường mật đi vào/ra gan.', status: 'Warning' },
  ],
  krabbyPattie: [
    { id: 'bun-top', position: [0, 1.45, 0.2], label: 'Lớp trên demo', info: 'Hotspot kiểm thử tương tác không chạm trên model OBJ/MTL.', status: 'Normal' },
    { id: 'patty-core', position: [0.35, 1.0, 0.18], label: 'Lõi mô hình', info: 'Dùng để xác nhận va chạm ngón trỏ ảo và bảng chú thích 3D.', status: 'Warning' },
  ],
}

const STATUS_THEME = {
  Normal: { color: '#06b6d4', card: 'border-cyan-300/30 bg-slate-950/85 shadow-[0_0_24px_rgba(6,182,212,0.35)]', dot: 'bg-cyan-400' },
  Warning: { color: '#f59e0b', card: 'border-amber-300/40 bg-amber-950/85 shadow-[0_0_24px_rgba(245,158,11,0.35)]', dot: 'bg-amber-400' },
  Critical: { color: '#ef4444', card: 'border-red-300/40 bg-red-950/85 shadow-[0_0_24px_rgba(239,68,68,0.35)]', dot: 'bg-red-400' },
}

const SPREAD_X = 15
const SPREAD_Y = 15
const SPREAD_Z = 15
const TOUCH_RADIUS = 1.15

export default function ObjModelViewer({
  modelUrl, mtlUrl, isDark = true, autoRotate = true, showGrid = false,
  wireframe = false, transparent = false, opacity = 1, color = null,
  customRotation = null, customScale = null,
  handLandmarksRef = null, enableSpatialHover = false, organId = 'heart',
}) {
  const containerRef = useRef(null)
  const stateRef = useRef({})
  const modelRef = useRef(null)
  const hotspotMeshesRef = useRef(new Map())
  const overlayRef = useRef({ active: null, screens: [] })
  const spatialRef = useRef({ enabled: false, handLandmarksRef: null, hotspots: [] })
  const handControlRef = useRef({ rotation: null, scale: null })
  const [activeHotspot, setActiveHotspot] = useState(null)
  const [hotspotScreens, setHotspotScreens] = useState([])

  const hotspots = useMemo(() => TOUCH_HOTSPOTS[organId] || TOUCH_HOTSPOTS.heart, [organId])
  handControlRef.current.rotation = customRotation
  handControlRef.current.scale = customScale
  spatialRef.current.enabled = enableSpatialHover
  spatialRef.current.handLandmarksRef = handLandmarksRef
  spatialRef.current.hotspots = hotspots

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / Math.max(container.clientHeight, 1), 0.1, 1000)
    camera.position.set(0, 1.4, 3.1)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xffffff, isDark ? 0x101018 : 0x8a94a6, 1.2)
    const key = new THREE.DirectionalLight(0xffffff, 1.4)
    key.position.set(2, 4, 3)
    scene.add(hemi, key)

    const grid = new THREE.GridHelper(4, 16, isDark ? 0x334155 : 0xc9cfd8, isDark ? 0x1e293b : 0xe2e6ea)
    grid.visible = !!showGrid
    scene.add(grid)

    hotspots.forEach((spot) => {
      const theme = STATUS_THEME[spot.status] || STATUS_THEME.Normal
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 20, 20),
        new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: theme.color, emissiveIntensity: 1.2, transparent: true, opacity: 0 })
      )
      mesh.position.set(...spot.position)
      mesh.visible = false
      scene.add(mesh)
      hotspotMeshesRef.current.set(spot.id, mesh)
    })

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = !!autoRotate
    controls.autoRotateSpeed = 1.6

    let raf = 0
    let disposed = false
    stateRef.current = { scene, camera, renderer, controls, disposed: false }

    function updateSpatialHotspots() {
      const spatial = spatialRef.current
      let touchedId = null

      if (spatial.enabled) {
        const indexFingerTip = spatial.handLandmarksRef?.current?.[0]?.[8]
        if (indexFingerTip) {
          const fingerVec = new THREE.Vector3((indexFingerTip.x - 0.5) * SPREAD_X, -(indexFingerTip.y - 0.5) * SPREAD_Y, -indexFingerTip.z * SPREAD_Z)
          for (const spot of spatial.hotspots) {
            if (fingerVec.distanceTo(new THREE.Vector3(...spot.position)) < TOUCH_RADIUS) {
              touchedId = spot.id
              break
            }
          }
        }
      }

      hotspotMeshesRef.current.forEach((mesh, id) => {
        const isActive = touchedId === id
        mesh.visible = !!spatial.enabled
        mesh.scale.setScalar(isActive ? 1.9 : 1)
        mesh.material.opacity = spatial.enabled ? (isActive ? 0.95 : 0.72) : 0
        mesh.material.emissiveIntensity = isActive ? 3 : 1.2
      })

      const screens = spatial.enabled ? spatial.hotspots.map((spot) => {
        const vector = new THREE.Vector3(...spot.position).project(camera)
        return {
          id: spot.id,
          x: (vector.x * 0.5 + 0.5) * (container.clientWidth || 1),
          y: (-vector.y * 0.5 + 0.5) * (container.clientHeight || 1),
          visible: vector.z > -1 && vector.z < 1,
        }
      }) : []

      const prev = overlayRef.current
      const screensChanged = screens.length !== prev.screens.length || screens.some((item, index) => {
        const old = prev.screens[index]
        return !old || old.id !== item.id || Math.abs(old.x - item.x) > 1.5 || Math.abs(old.y - item.y) > 1.5 || old.visible !== item.visible
      })
      if (touchedId !== prev.active || screensChanged) {
        overlayRef.current = { active: touchedId, screens }
        setActiveHotspot(touchedId)
        setHotspotScreens(screens)
      }
    }

    function animate() {
      raf = requestAnimationFrame(animate)
      const hand = handControlRef.current
      const model = modelRef.current
      const handActive = model && (hand.rotation != null || hand.scale != null)
      if (handActive) {
        controls.autoRotate = false
        if (hand.rotation) {
          model.object.rotation.x += (hand.rotation[0] - model.object.rotation.x) * 0.12
          model.object.rotation.y += (hand.rotation[1] - model.object.rotation.y) * 0.12
        }
        if (hand.scale != null) {
          const targetScale = model.baseScale * hand.scale
          const current = model.object.scale.x
          model.object.scale.setScalar(current + (targetScale - current) * 0.12)
        }
      } else {
        controls.autoRotate = !!autoRotate
      }
      updateSpatialHotspots()
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    })
    resizeObserver.observe(container)

    function applyMaterialMode() {
      const model = modelRef.current
      if (!model) return
      model.object.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((m) => {
          m.wireframe = !!wireframe
          m.transparent = !!transparent || opacity < 1
          m.opacity = transparent ? Math.min(opacity, 0.35) : opacity
          m.depthWrite = !(m.transparent)
          if (color) m.color?.set(color)
          m.needsUpdate = true
        })
      })
    }
    stateRef.current.applyMaterialMode = applyMaterialMode

    function addModelToScene(object) {
      if (disposed) return
      const box = new THREE.Box3().setFromObject(object)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const scale = 1.8 / maxDim
      object.scale.setScalar(scale)
      object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
      scene.add(object)
      modelRef.current = { object, baseScale: scale }
      applyMaterialMode()
    }

    function loadObjWithLoader(materials) {
      const objLoader = new OBJLoader()
      if (materials) objLoader.setMaterials(materials)
      objLoader.load(modelUrl, (object) => addModelToScene(object), undefined, (err) => console.warn('Failed to load OBJ model', err))
    }

    if (modelUrl) {
      if (mtlUrl) {
        new MTLLoader().load(mtlUrl, (materials) => { materials.preload(); loadObjWithLoader(materials) }, undefined, () => loadObjWithLoader(null))
      } else {
        loadObjWithLoader(null)
      }
    }

    return () => {
      disposed = true
      stateRef.current.disposed = true
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      controls.dispose()
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          materials.forEach((m) => m.dispose?.())
        }
      })
      hotspotMeshesRef.current.clear()
      renderer.dispose()
      if (container) container.innerHTML = ''
      modelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, mtlUrl, organId])

  useEffect(() => {
    if (stateRef.current.controls) stateRef.current.controls.autoRotate = !!autoRotate
  }, [autoRotate])

  useEffect(() => {
    stateRef.current.applyMaterialMode?.()
  }, [wireframe, transparent, opacity, color])

  const activeSpot = hotspots.find((spot) => spot.id === activeHotspot)
  const activeScreen = hotspotScreens.find((spot) => spot.id === activeHotspot)
  const activeTheme = STATUS_THEME[activeSpot?.status] || STATUS_THEME.Normal

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {enableSpatialHover && hotspotScreens.map((spot) => {
        const hotspot = hotspots.find((item) => item.id === spot.id)
        const theme = STATUS_THEME[hotspot?.status] || STATUS_THEME.Normal
        if (!spot.visible) return null
        return (
          <div key={spot.id} className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: spot.x, top: spot.y }}>
            <span className={`absolute -inset-2 rounded-full opacity-50 animate-ping ${theme.dot}`}></span>
            <span className={`relative block h-3 w-3 rounded-full ${theme.dot}`}></span>
          </div>
        )
      })}
      {enableSpatialHover && activeSpot && activeScreen?.visible && (
        <div className={`pointer-events-none absolute z-20 w-64 translate-x-5 -translate-y-1/2 rounded-xl border p-4 text-white backdrop-blur-md ${activeTheme.card}`} style={{ left: activeScreen.x, top: activeScreen.y }}>
          <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
            <span className={`h-2.5 w-2.5 rounded-full ${activeTheme.dot}`}></span>
            <h4 className="text-xs font-bold uppercase tracking-wider">{activeSpot.label}</h4>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-200">{activeSpot.info}</p>
          <p className="mt-2 text-[10px] font-mono text-cyan-200/80">Index fingertip ↔ hotspot collision</p>
        </div>
      )}
    </div>
  )
}
