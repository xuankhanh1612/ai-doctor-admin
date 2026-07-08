import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Xem 3D thật cho định dạng .obj — <model-viewer> (Google) chỉ đọc glTF/GLB
// nên OBJ cần loader riêng. Component này CỐ TÌNH tối giản so với
// AnimatedAvatarViewer.jsx: OBJ là mesh tĩnh (không rig xương, không animation
// clip, không VRM humanoid) nên không cần AnimationMixer/SkeletonHelper/bone
// markers — chỉ tải mesh, tự canh giữa + scale vừa khung, và xoay/zoom bằng
// OrbitControls thật.
//
// mtlUrl (tuỳ chọn): nếu có file .mtl cùng thư mục với .obj, MTLLoader sẽ nạp
// vật liệu/màu thật trước khi OBJLoader dựng mesh; nếu không có, mesh vẫn
// hiển thị bằng vật liệu mặc định của three.js (không phải lỗi, chỉ là OBJ
// không có material đi kèm).
//
// Props mở rộng cho Medical Visual Playground (Touchless Control):
// - wireframe / transparent / opacity / color: áp dụng trực tiếp lên material
//   của mesh đã tải (dùng cho 3 chế độ xem Solid / Wireframe / X-Ray).
// - customRotation [x, y] / customScale (number): khi khác null, viewer
//   chuyển sang "chế độ điều khiển tay" — tắt auto-rotate của OrbitControls
//   và tự nội suy (lerp) góc xoay/scale của mesh về phía giá trị do
//   MediaPipe Hand Landmarker tính ra mỗi khung hình, thay vì chờ người
//   dùng kéo chuột.
export default function ObjModelViewer({
  modelUrl, mtlUrl, isDark = true, autoRotate = true, showGrid = false,
  wireframe = false, transparent = false, opacity = 1, color = null,
  customRotation = null, customScale = null,
}) {
  const containerRef = useRef(null)
  const stateRef = useRef({})
  const modelRef = useRef(null) // Object3D gốc của mesh đã tải + baseScale để cộng dồn với customScale
  // Ref (không phải state) để animate() luôn đọc được giá trị mới nhất của
  // customRotation/customScale mỗi khung hình mà không phải huỷ/tạo lại
  // toàn bộ scene Three.js (scene chỉ khởi tạo lại khi modelUrl/mtlUrl đổi).
  const handControlRef = useRef({ rotation: null, scale: null })
  handControlRef.current.rotation = customRotation
  handControlRef.current.scale = customScale

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

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = !!autoRotate
    controls.autoRotateSpeed = 1.6

    let raf = 0
    let disposed = false
    stateRef.current = { scene, camera, renderer, controls, disposed: false }

    function animate() {
      raf = requestAnimationFrame(animate)
      const hand = handControlRef.current
      const model = modelRef.current
      const handActive = model && (hand.rotation != null || hand.scale != null)

      if (handActive) {
        // Chế độ Touchless Control: tắt auto-rotate, nội suy (Lerp) mượt về
        // phía góc xoay/scale do bàn tay điều khiển thay vì gán cứng, để
        // tránh giật khi tracking bị rung.
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
      // Lưu lại object + scale gốc (baseScale) để animate() cộng dồn với
      // customScale (Pinch-to-zoom) và applyMaterialMode() có thể traverse.
      modelRef.current = { object, baseScale: scale }
      applyMaterialMode()
    }

    // Áp dụng chế độ xem (Solid / Wireframe / X-Ray) + màu tint lên mọi mesh
    // của model đã tải. Gọi lại mỗi khi wireframe/transparent/opacity/color
    // đổi (xem effect bên dưới) mà KHÔNG cần tải lại file .obj.
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

    function loadObjWithLoader(materials) {
      const objLoader = new OBJLoader()
      if (materials) objLoader.setMaterials(materials)
      objLoader.load(
        modelUrl,
        (object) => addModelToScene(object),
        undefined,
        (err) => console.warn('Failed to load OBJ model', err)
      )
    }

    if (modelUrl) {
      if (mtlUrl) {
        new MTLLoader().load(
          mtlUrl,
          (materials) => {
            materials.preload()
            loadObjWithLoader(materials)
          },
          undefined,
          // Không có .mtl hợp lệ hoặc tải lỗi -> vẫn tải OBJ với vật liệu mặc định.
          () => loadObjWithLoader(null)
        )
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
      renderer.dispose()
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          materials.forEach((m) => m.dispose?.())
        }
      })
      if (container) container.innerHTML = ''
      modelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, mtlUrl])

  useEffect(() => {
    if (stateRef.current.controls) stateRef.current.controls.autoRotate = !!autoRotate
  }, [autoRotate])

  // Solid / Wireframe / X-Ray đổi hoặc màu tint đổi -> áp lại material ngay
  // trên mesh đang có sẵn, không cần tải lại .obj.
  useEffect(() => {
    stateRef.current.applyMaterialMode?.()
  }, [wireframe, transparent, opacity, color])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
