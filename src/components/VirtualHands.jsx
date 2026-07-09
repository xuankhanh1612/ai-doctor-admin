import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Hologram Hands 🖐 — vẽ 21 khớp xương bàn tay (MediaPipe Hand Landmarker)
// thành 1 khung xương "hologram" lơ lửng trong không gian 3D, phủ lên trên
// ObjModelViewer khi Touchless Control đang bật.
//
// LƯU Ý KIẾN TRÚC: dự án này KHÔNG dùng @react-three/fiber (không có
// <Canvas>, không cài package) — mọi component 3D khác (ObjModelViewer.jsx,
// AnimatedAvatarViewer.jsx...) đều tự dựng scene/camera/renderer bằng
// Three.js thuần trong useEffect + tự chạy vòng lặp requestAnimationFrame.
// Component này viết theo đúng pattern đó để tương thích, thay vì bản gốc
// dùng useFrame của react-three-fiber.
//
// Vẫn giữ đúng 2 kỹ thuật tối ưu hiệu năng cốt lõi:
// 1) useRef thay useState: landmarksRef được CHA (MedicalVisualPlayground)
//    cập nhật trực tiếp mỗi khung hình — không setState, không re-render
//    React 60 lần/giây.
// 2) InstancedMesh + BufferGeometry: 21 khớp xương gộp thành đúng 1 Draw
//    Call (InstancedMesh), 20 đường nối gộp thành đúng 1 Draw Call
//    (LineSegments + BufferGeometry) — tổng cộng 2 Draw Call/khung hình
//    thay vì 41.

// Các cặp điểm nối (Bones) — 21 khớp xương bàn tay chuẩn MediaPipe.
const BONE_INDICES = new Uint16Array([
  0, 1, 1, 2, 2, 3, 3, 4, // Ngón cái
  0, 5, 5, 6, 6, 7, 7, 8, // Ngón trỏ
  5, 9, 9, 10, 10, 11, 11, 12, // Ngón giữa
  9, 13, 13, 14, 14, 15, 15, 16, // Ngón áp út
  13, 17, 17, 18, 18, 19, 19, 20, // Ngón út
  0, 17, // Đáy bàn tay
])

const JOINT_COUNT = 21
const SPREAD_X = 15
const SPREAD_Y = 15
const SPREAD_Z = 15

// Camera trước trong TouchlessHandCam được hiển thị dạng gương (scaleX(-1))
// để người dùng thấy giống selfie. MediaPipe vẫn trả landmark theo hệ tọa độ
// raw của video, nên phải lật trục X khi dựng bàn tay ảo để cử chỉ khớp với
// hình camera đang nhìn thấy trên màn hình.
const mapLandmarkX = (x, mirrored = true) => (mirrored ? 0.5 - x : x - 0.5) * SPREAD_X
const mapLandmarkY = (y) => -(y - 0.5) * SPREAD_Y
const mapLandmarkZ = (z) => -z * SPREAD_Z

export default function VirtualHands({ landmarksRef, mirrored = true, color = '#06b6d4', className = '' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 14)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // Object3D giả dùng để tính ma trận (matrix) cho từng instance mà không
    // tốn chi phí tạo/huỷ Object3D thật mỗi khung hình.
    const dummy = new THREE.Object3D()

    // --- JOINTS: 1 InstancedMesh cho toàn bộ 21 khớp xương ---
    const jointGeometry = new THREE.SphereGeometry(0.5, 8, 8)
    const jointMaterial = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85, wireframe: true,
    })
    const joints = new THREE.InstancedMesh(jointGeometry, jointMaterial, JOINT_COUNT)
    joints.count = 0 // chưa có tay -> ẩn hết
    scene.add(joints)

    // --- BONES: 1 LineSegments dùng chung BufferGeometry ---
    const bonesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(JOINT_COUNT * 3)
    bonesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    bonesGeometry.setIndex(new THREE.BufferAttribute(BONE_INDICES, 1))
    bonesGeometry.setDrawRange(0, 0)
    const bonesMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 })
    const bones = new THREE.LineSegments(bonesGeometry, bonesMaterial)
    scene.add(bones)

    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)

      const landmarksList = landmarksRef?.current
      const hand = landmarksList?.[0] // chỉ xử lý 1 tay để tiết kiệm GPU

      if (!hand || hand.length === 0) {
        joints.count = 0
        bonesGeometry.setDrawRange(0, 0)
      } else {
        // Update 21 khớp xương (Joints)
        joints.count = JOINT_COUNT
        for (let i = 0; i < JOINT_COUNT; i++) {
          const lm = hand[i]
          if (!lm) continue
          dummy.position.set(
            mapLandmarkX(lm.x, mirrored),
            mapLandmarkY(lm.y),
            mapLandmarkZ(lm.z),
          )
          dummy.updateMatrix()
          joints.setMatrixAt(i, dummy.matrix)
        }
        joints.instanceMatrix.needsUpdate = true

        // Update các đường nối xương (Bones)
        const posAttr = bonesGeometry.attributes.position.array
        for (let i = 0; i < JOINT_COUNT; i++) {
          const lm = hand[i]
          if (!lm) continue
          posAttr[i * 3] = mapLandmarkX(lm.x, mirrored)
          posAttr[i * 3 + 1] = mapLandmarkY(lm.y)
          posAttr[i * 3 + 2] = mapLandmarkZ(lm.z)
        }
        bonesGeometry.attributes.position.needsUpdate = true
        bonesGeometry.setDrawRange(0, BONE_INDICES.length)
      }

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!container) return
      const w = Math.max(container.clientWidth, 1)
      const h = Math.max(container.clientHeight, 1)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
      jointGeometry.dispose()
      jointMaterial.dispose()
      bonesGeometry.dispose()
      bonesMaterial.dispose()
      renderer.dispose()
      if (container) container.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mirrored]

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}
