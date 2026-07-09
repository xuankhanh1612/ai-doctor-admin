import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

// Camera3DAngleGizmo — tái tạo lại đúng cơ chế điều khiển "3D Camera Control"
// của HF Space multimodalart/qwen-image-multiple-angles-3d-camera (dùng cho
// fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA): 3 tay cầm màu kéo được
// bằng chuột/tay — 🟢 Azimuth (xoay ngang 0–360°), 🩷 Elevation (góc nghiêng
// -30..60°), 🟠 Distance (khoảng cách máy ảnh) — snap về 8 vị trí azimuth ×
// 4 elevation × 3 distance giống hệt LoRA gốc, sinh prompt dạng
// "<sks> ... view ... shot ... shot".
//
// KHÁC BIỆT so với bản gốc: thay vì chiếu ảnh 2D lên một mặt phẳng phẳng để
// xem trước góc máy, component này tải THẬT một model .obj (objUrl) làm vật
// thể trung tâm — xoay quanh mô hình 3D thật trực quan hơn nhiều so với ảnh
// phẳng khi chọn góc chụp.
//
// Props:
// - objUrl: model .obj để hiển thị làm tâm điều khiển (mặc định model demo)
// - value: { azimuth, elevation, distance } điều khiển từ bên ngoài (vd slider)
// - onChange({ azimuth, elevation, distance, prompt }): bắn ra sau khi snap xong

const AZIMUTH_STEPS = [0, 45, 90, 135, 180, 225, 270, 315]
const ELEVATION_STEPS = [-30, 0, 30, 60]
const DISTANCE_STEPS = [0.6, 1.0, 1.4]

const AZIMUTH_NAMES = {
  0: 'front view', 45: 'front-right quarter view', 90: 'right side view',
  135: 'back-right quarter view', 180: 'back view', 225: 'back-left quarter view',
  270: 'left side view', 315: 'front-left quarter view',
}
const ELEVATION_NAMES = { '-30': 'low-angle shot', '0': 'eye-level shot', '30': 'elevated shot', '60': 'high-angle shot' }
const DISTANCE_NAMES = { '0.6': 'close-up', '1': 'medium shot', '1.4': 'wide shot' }

function snapToNearest(value, steps) {
  return steps.reduce((prev, curr) => (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev))
}

export function buildCameraPrompt(azimuth, elevation, distance) {
  const az = snapToNearest(azimuth, AZIMUTH_STEPS)
  const el = snapToNearest(elevation, ELEVATION_STEPS)
  const dist = snapToNearest(distance, DISTANCE_STEPS)
  const distKey = dist === 1 ? '1' : dist.toFixed(1)
  return `<sks> ${AZIMUTH_NAMES[az]} ${ELEVATION_NAMES[String(el)]} ${DISTANCE_NAMES[distKey]}`
}

export default function Camera3DAngleGizmo({ objUrl, value, onChange, onLoadError, onLoadSuccess }) {
  const wrapperRef = useRef(null)
  const promptRef = useRef(null)
  const liveRef = useRef({ azimuth: value?.azimuth ?? 0, elevation: value?.elevation ?? 0, distance: value?.distance ?? 1.0 })
  const applyExternalRef = useRef(null)
  const onLoadErrorRef = useRef(onLoadError)
  const onLoadSuccessRef = useRef(onLoadSuccess)
  useEffect(() => { onLoadErrorRef.current = onLoadError }, [onLoadError])
  useEffect(() => { onLoadSuccessRef.current = onLoadSuccess }, [onLoadSuccess])

  // Scene khởi tạo 1 lần; objUrl đổi thì tải lại model, KHÔNG huỷ toàn bộ scene.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    let disposed = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)

    const camera = new THREE.PerspectiveCamera(50, wrapper.clientWidth / Math.max(wrapper.clientHeight, 1), 0.1, 1000)
    camera.position.set(4.5, 3, 4.5)
    camera.lookAt(0, 0.75, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(wrapper.clientWidth, wrapper.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    wrapper.innerHTML = ''
    wrapper.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
    dirLight.position.set(5, 10, 5)
    scene.add(dirLight)
    scene.add(new THREE.GridHelper(8, 16, 0x333333, 0x222222))

    const CENTER = new THREE.Vector3(0, 0.75, 0)
    const BASE_DISTANCE = 1.6
    const AZIMUTH_RADIUS = 2.4
    const ELEVATION_RADIUS = 1.8

    let azimuthAngle = liveRef.current.azimuth
    let elevationAngle = liveRef.current.elevation
    let distanceFactor = liveRef.current.distance

    // --- Target: model .obj thật thay cho mặt phẳng ảnh của bản gốc ---
    const targetGroup = new THREE.Group()
    targetGroup.position.copy(CENTER)
    scene.add(targetGroup)

    function loadTargetModel(url) {
      while (targetGroup.children.length) targetGroup.remove(targetGroup.children[0])
      if (!url) return
      new OBJLoader().load(
        url,
        (object) => {
          if (disposed) return
          const box = new THREE.Box3().setFromObject(object)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z) || 1
          const scale = 1.6 / maxDim
          object.scale.setScalar(scale)
          object.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
          object.traverse((o) => {
            if (o.isMesh && !o.material?.map) {
              o.material = new THREE.MeshStandardMaterial({ color: 0x6fd3ff, roughness: 0.55, metalness: 0.1 })
            }
          })
          targetGroup.add(object)
          onLoadSuccessRef.current?.(url)
        },
        undefined,
        (err) => {
          console.warn('Camera3DAngleGizmo: không tải được .obj', err)
          onLoadErrorRef.current?.(err, url)
        }
      )
    }
    loadTargetModel(objUrl)

    // --- Camera model (khối xanh nhỏ đại diện máy ảnh) ---
    const cameraGroup = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6699cc, metalness: 0.5, roughness: 0.3 })
    cameraGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.38), bodyMat))
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.18, 16), bodyMat)
    lens.rotation.x = Math.PI / 2
    lens.position.z = 0.26
    cameraGroup.add(lens)
    scene.add(cameraGroup)

    // 🟢 Azimuth ring + handle
    const azimuthRing = new THREE.Mesh(
      new THREE.TorusGeometry(AZIMUTH_RADIUS, 0.04, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.3 })
    )
    azimuthRing.rotation.x = Math.PI / 2
    azimuthRing.position.y = 0.05
    scene.add(azimuthRing)

    const azimuthHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 })
    )
    azimuthHandle.userData.type = 'azimuth'
    scene.add(azimuthHandle)

    // 🩷 Elevation arc + handle
    const arcPoints = []
    for (let i = 0; i <= 32; i++) {
      const angle = THREE.MathUtils.degToRad(-30 + (90 * i) / 32)
      arcPoints.push(new THREE.Vector3(-0.8, ELEVATION_RADIUS * Math.sin(angle) + CENTER.y, ELEVATION_RADIUS * Math.cos(angle)))
    }
    const elevationArc = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPoints), 32, 0.04, 8, false),
      new THREE.MeshStandardMaterial({ color: 0xff69b4, emissive: 0xff69b4, emissiveIntensity: 0.3 })
    )
    scene.add(elevationArc)

    const elevationHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff69b4, emissive: 0xff69b4, emissiveIntensity: 0.5 })
    )
    elevationHandle.userData.type = 'elevation'
    scene.add(elevationHandle)

    // 🟠 Distance line + handle
    const distanceLineGeo = new THREE.BufferGeometry()
    scene.add(new THREE.Line(distanceLineGeo, new THREE.LineBasicMaterial({ color: 0xffa500 })))
    const distanceHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffa500, emissive: 0xffa500, emissiveIntensity: 0.5 })
    )
    distanceHandle.userData.type = 'distance'
    scene.add(distanceHandle)

    function updatePositions() {
      const distance = BASE_DISTANCE * distanceFactor
      const azRad = THREE.MathUtils.degToRad(azimuthAngle)
      const elRad = THREE.MathUtils.degToRad(elevationAngle)

      const camX = distance * Math.sin(azRad) * Math.cos(elRad)
      const camY = distance * Math.sin(elRad) + CENTER.y
      const camZ = distance * Math.cos(azRad) * Math.cos(elRad)
      cameraGroup.position.set(camX, camY, camZ)
      cameraGroup.lookAt(CENTER)

      azimuthHandle.position.set(AZIMUTH_RADIUS * Math.sin(azRad), 0.05, AZIMUTH_RADIUS * Math.cos(azRad))
      elevationHandle.position.set(-0.8, ELEVATION_RADIUS * Math.sin(elRad) + CENTER.y, ELEVATION_RADIUS * Math.cos(elRad))

      const orangeDist = distance - 0.5
      distanceHandle.position.set(
        orangeDist * Math.sin(azRad) * Math.cos(elRad),
        orangeDist * Math.sin(elRad) + CENTER.y,
        orangeDist * Math.cos(azRad) * Math.cos(elRad)
      )
      distanceLineGeo.setFromPoints([cameraGroup.position.clone(), CENTER.clone()])

      if (promptRef.current) promptRef.current.textContent = buildCameraPrompt(azimuthAngle, elevationAngle, distanceFactor)
    }

    function emitChange() {
      const az = snapToNearest(azimuthAngle, AZIMUTH_STEPS)
      const el = snapToNearest(elevationAngle, ELEVATION_STEPS)
      const dist = snapToNearest(distanceFactor, DISTANCE_STEPS)
      liveRef.current = { azimuth: az, elevation: el, distance: dist }
      onChange?.({ azimuth: az, elevation: el, distance: dist, prompt: buildCameraPrompt(az, el, dist) })
    }

    // --- Raycasting kéo-thả (chuột + cảm ứng) ---
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let isDragging = false
    let dragTarget = null
    const dragStartMouse = new THREE.Vector2()
    let dragStartDistance = distanceFactor
    const intersection = new THREE.Vector3()
    const canvas = renderer.domElement

    function setMouseFromClient(clientX, clientY) {
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
    }

    function beginDrag(clientX, clientY) {
      setMouseFromClient(clientX, clientY)
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects([azimuthHandle, elevationHandle, distanceHandle])
      if (intersects.length > 0) {
        isDragging = true
        dragTarget = intersects[0].object
        dragTarget.material.emissiveIntensity = 1.0
        dragTarget.scale.setScalar(1.3)
        dragStartMouse.copy(mouse)
        dragStartDistance = distanceFactor
      }
    }

    function moveDrag(clientX, clientY) {
      setMouseFromClient(clientX, clientY)
      if (!isDragging || !dragTarget) return
      raycaster.setFromCamera(mouse, camera)
      if (dragTarget.userData.type === 'azimuth') {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05)
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          azimuthAngle = THREE.MathUtils.radToDeg(Math.atan2(intersection.x, intersection.z))
          if (azimuthAngle < 0) azimuthAngle += 360
        }
      } else if (dragTarget.userData.type === 'elevation') {
        const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -0.8)
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const relY = intersection.y - CENTER.y
          const relZ = intersection.z
          elevationAngle = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(Math.atan2(relY, relZ)), -30, 60)
        }
      } else if (dragTarget.userData.type === 'distance') {
        const deltaY = mouse.y - dragStartMouse.y
        distanceFactor = THREE.MathUtils.clamp(dragStartDistance - deltaY * 1.5, 0.6, 1.4)
      }
      updatePositions()
    }

    function endDrag() {
      if (dragTarget) {
        dragTarget.material.emissiveIntensity = 0.5
        dragTarget.scale.setScalar(1)
        const targetAz = snapToNearest(azimuthAngle, AZIMUTH_STEPS)
        const targetEl = snapToNearest(elevationAngle, ELEVATION_STEPS)
        const targetDist = snapToNearest(distanceFactor, DISTANCE_STEPS)
        const startAz = azimuthAngle, startEl = elevationAngle, startDist = distanceFactor
        const startTime = Date.now()

        function animateSnap() {
          const t = Math.min((Date.now() - startTime) / 200, 1)
          const ease = 1 - Math.pow(1 - t, 3)
          let azDiff = targetAz - startAz
          if (azDiff > 180) azDiff -= 360
          if (azDiff < -180) azDiff += 360
          azimuthAngle = startAz + azDiff * ease
          if (azimuthAngle < 0) azimuthAngle += 360
          if (azimuthAngle >= 360) azimuthAngle -= 360
          elevationAngle = startEl + (targetEl - startEl) * ease
          distanceFactor = startDist + (targetDist - startDist) * ease
          updatePositions()
          if (t < 1) requestAnimationFrame(animateSnap)
          else emitChange()
        }
        animateSnap()
      }
      isDragging = false
      dragTarget = null
      canvas.style.cursor = 'default'
    }

    const onMouseDown = (e) => beginDrag(e.clientX, e.clientY)
    const onMouseMove = (e) => {
      setMouseFromClient(e.clientX, e.clientY)
      if (isDragging) { moveDrag(e.clientX, e.clientY); canvas.style.cursor = 'grabbing'; return }
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects([azimuthHandle, elevationHandle, distanceHandle])
      ;[azimuthHandle, elevationHandle, distanceHandle].forEach((h) => { h.material.emissiveIntensity = 0.5; h.scale.setScalar(1) })
      if (intersects.length > 0) {
        intersects[0].object.material.emissiveIntensity = 0.8
        intersects[0].object.scale.setScalar(1.1)
        canvas.style.cursor = 'grab'
      } else {
        canvas.style.cursor = 'default'
      }
    }
    const onMouseUp = () => endDrag()
    const onTouchStart = (e) => { e.preventDefault(); const t = e.touches[0]; beginDrag(t.clientX, t.clientY) }
    const onTouchMove = (e) => { e.preventDefault(); const t = e.touches[0]; moveDrag(t.clientX, t.clientY) }
    const onTouchEnd = (e) => { e.preventDefault(); endDrag() }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false })

    updatePositions()

    let raf = 0
    function render() {
      raf = requestAnimationFrame(render)
      renderer.render(scene, camera)
    }
    render()

    const resizeObserver = new ResizeObserver(() => {
      if (!wrapper.clientWidth || !wrapper.clientHeight) return
      camera.aspect = wrapper.clientWidth / wrapper.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(wrapper.clientWidth, wrapper.clientHeight)
    })
    resizeObserver.observe(wrapper)

    // Cho phép cha cập nhật góc từ bên ngoài (vd kéo slider) mà không cần
    // huỷ/tạo lại scene.
    applyExternalRef.current = (next) => {
      if (!next) return
      if (next.azimuth != null) azimuthAngle = next.azimuth
      if (next.elevation != null) elevationAngle = next.elevation
      if (next.distance != null) distanceFactor = next.distance
      updatePositions()
    }

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
      renderer.dispose()
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          materials.forEach((m) => m.dispose?.())
        }
      })
      if (wrapper) wrapper.innerHTML = ''
      applyExternalRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objUrl])

  // value điều khiển từ ngoài (sliders) -> áp vào scene đang chạy.
  useEffect(() => {
    if (value && applyExternalRef.current) applyExternalRef.current(value)
  }, [value?.azimuth, value?.elevation, value?.distance])

  return (
    <div style={{ width: '100%', height: 420, position: 'relative', background: '#1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={wrapperRef} style={{ width: '100%', height: '100%' }} />
      <div
        ref={promptRef}
        style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', padding: '8px 16px', borderRadius: 8,
          fontFamily: 'monospace', fontSize: 12, color: '#00ff88', whiteSpace: 'nowrap', zIndex: 10,
        }}
      >
        {buildCameraPrompt(value?.azimuth ?? 0, value?.elevation ?? 0, value?.distance ?? 1.0)}
      </div>
    </div>
  )
}
