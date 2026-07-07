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
export default function ObjModelViewer({ modelUrl, mtlUrl, isDark = true, autoRotate = true, showGrid = false }) {
  const containerRef = useRef(null)
  const stateRef = useRef({})

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
    }

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, mtlUrl])

  useEffect(() => {
    if (stateRef.current.controls) stateRef.current.controls.autoRotate = !!autoRotate
  }, [autoRotate])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
