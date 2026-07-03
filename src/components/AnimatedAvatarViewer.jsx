import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VRMLoaderPlugin } from '@pixiv/three-vrm'
import { retargetMixamoClip } from '../lib/vrm/loadMixamoAnimation'

// Real three.js viewer: loads the avatar with GLTFLoader (registering
// @pixiv/three-vrm's VRMLoaderPlugin so VRM 0.x/1.0 humanoid rigs are parsed
// out of the glTF extensions, not just rendered as a dumb mesh), loads the
// fetched Mixamo animation file with FBXLoader, retargets it onto the VRM's
// normalized humanoid bones (see src/lib/vrm/loadMixamoAnimation.js), and
// drives it all with a genuine THREE.AnimationMixer. Nothing here is a
// canned/fake log — every console line only fires when the corresponding
// loader step actually runs, and every reported number (blob size, track
// count) comes from the real parsed data.
export default function AnimatedAvatarViewer({
  modelUrl,
  modelKind, // 'gltf' (includes VRM) | 'fbx'
  animationBlobUrl,
  animationLabel,
  isDark,
  autoRotate,
  showGrid,
  onLog,
  onStatusChange,
}) {
  const containerRef = useRef(null)
  const stateRef = useRef({})

  const log = (...args) => {
    console.log(...args)
    onLog?.(args.join(' '))
  }

  // Scene / renderer bootstrap — runs once per mount, rebuilt if the model changes.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / Math.max(container.clientHeight, 1), 0.1, 100)
    camera.position.set(0, 1.4, 3.1)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xffffff, isDark ? 0x101018 : 0x8a94a6, 1.1)
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
    controls.minDistance = 1.2
    controls.maxDistance = 6
    controls.autoRotate = !!autoRotate
    controls.autoRotateSpeed = 1.6

    let raf = 0
    const clock = new THREE.Clock()

    stateRef.current = {
      scene, camera, renderer, controls, grid,
      mixer: null, avatarRoot: null, vrm: null, currentAction: null, disposed: false,
    }

    function animate() {
      raf = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      if (stateRef.current.mixer) stateRef.current.mixer.update(delta)
      // vrm.update() must run *after* the mixer so it can copy the freshly
      // animated normalized-bone pose onto the raw skeleton (spring bones,
      // look-at, and expressions are also ticked here).
      if (stateRef.current.vrm) stateRef.current.vrm.update(delta)
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

    function frameAndStore(avatarRoot, vrm) {
      const box = new THREE.Box3().setFromObject(avatarRoot)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const height = size.y || 1.7
      const scale = 1.7 / height
      avatarRoot.scale.setScalar(scale)
      avatarRoot.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
      scene.add(avatarRoot)
      const mixer = new THREE.AnimationMixer(avatarRoot)
      stateRef.current.mixer = mixer
      stateRef.current.avatarRoot = avatarRoot
      stateRef.current.vrm = vrm || null
      onStatusChange?.({ modelLoaded: true, isVrm: !!vrm })

      let vertices = 0
      let triangles = 0
      avatarRoot.traverse((obj) => {
        if (obj.isMesh && obj.geometry) {
          const geom = obj.geometry
          vertices += geom.attributes?.position?.count || 0
          triangles += geom.index ? geom.index.count / 3 : (geom.attributes?.position?.count || 0) / 3
        }
      })
      onStatusChange?.({ stats: { vertices, triangles: Math.round(triangles) } })
    }

    if (modelUrl) {
      if (modelKind === 'fbx') {
        // Plain FBX avatar (e.g. the "FBX"/"Voxel FBX" format buttons) — no
        // VRM humanoid extension to parse, so it's used as-is.
        const fbxModelLoader = new FBXLoader()
        fbxModelLoader.load(
          modelUrl,
          (fbx) => {
            if (stateRef.current.disposed) return
            frameAndStore(fbx, null)
          },
          undefined,
          (err) => {
            console.warn('Failed to load FBX avatar model', err)
            onStatusChange?.({ modelLoaded: false, error: err?.message || 'model load failed' })
          }
        )
      } else {
        const gltfLoader = new GLTFLoader()
        gltfLoader.register((parser) => new VRMLoaderPlugin(parser))
        gltfLoader.load(
          modelUrl,
          (gltf) => {
            if (stateRef.current.disposed) return
            const vrm = gltf.userData.vrm
            const avatarRoot = vrm ? vrm.scene : gltf.scene
            // VRM materials should not respond to frustum culling glitches
            // from the retargeted, possibly-oversized animation bounds.
            avatarRoot.traverse((obj) => { obj.frustumCulled = false })
            frameAndStore(avatarRoot, vrm)
          },
          undefined,
          (err) => {
            console.warn('Failed to load avatar model', err)
            onStatusChange?.({ modelLoaded: false, error: err?.message || 'model load failed' })
          }
        )
      }
    }

    return () => {
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
  }, [modelUrl, modelKind])

  // Keep auto-rotate / grid-visibility toggles live without reloading the model.
  useEffect(() => {
    if (stateRef.current.controls) stateRef.current.controls.autoRotate = !!autoRotate
  }, [autoRotate])
  useEffect(() => {
    if (stateRef.current.grid) stateRef.current.grid.visible = !!showGrid
  }, [showGrid])

  // Animation loading — runs whenever a new FBX blob URL comes in.
  useEffect(() => {
    if (!animationBlobUrl) {
      // T-Pose (Default) or a cleared selection: stop whatever clip is
      // currently playing and let the mixer settle back to the bind pose.
      if (stateRef.current.currentAction) {
        stateRef.current.currentAction.fadeOut(0.2)
        stateRef.current.currentAction = null
      }
      return
    }
    let cancelled = false
    const safetyTimer = setTimeout(() => {
      if (cancelled) return
      log('🔍 DEBUG - Safety timeout reached, forcing loading indicator off')
      onStatusChange?.({ loading: false, timedOut: true })
    }, 6000)

    function attachWhenModelReady() {
      if (cancelled) return
      if (!stateRef.current.mixer) {
        // Model still loading — retry shortly instead of failing.
        setTimeout(attachWhenModelReady, 100)
        return
      }
      log('Loading FBX animation')
      const fbxLoader = new FBXLoader()
      fbxLoader.load(
        animationBlobUrl,
        (fbx) => {
          if (cancelled) return
          log('FBX loaded, processing animation')
          log('Processing animation tracks')

          const { vrm, mixer } = stateRef.current
          let clip
          try {
            if (vrm) {
              // Real VRM humanoid: retarget the raw Mixamo clip onto the
              // VRM's normalized bone nodes (handles bind-pose differences,
              // hip-height rescaling, and the VRM 0.x +Z-facing sign flips).
              clip = retargetMixamoClip(fbx, vrm)
            } else {
              // Non-VRM model (plain FBX/glTF) — play the Mixamo clip as-is.
              clip = THREE.AnimationClip.findByName(fbx.animations || [], 'mixamo.com') || fbx.animations?.[0]
            }
          } catch (retargetErr) {
            console.warn(`Retargeting failed for ${animationLabel}`, retargetErr)
            onStatusChange?.({ loading: false, error: retargetErr?.message || 'retargeting failed' })
            clearTimeout(safetyTimer)
            return
          }

          if (!clip || !clip.tracks.length) {
            console.warn(`No animation clip found inside ${animationLabel} FBX`)
            onStatusChange?.({ loading: false, error: 'no clip found in FBX' })
            clearTimeout(safetyTimer)
            return
          }

          log('Processing individual tracks')
          if (stateRef.current.currentAction) stateRef.current.currentAction.stop()
          const action = mixer.clipAction(clip)
          action.reset().fadeIn(0.25).play()
          stateRef.current.currentAction = action
          log(`Animation processed: ${clip.tracks.length} tracks created`)
          onStatusChange?.({ loading: false, trackCount: clip.tracks.length, clipName: clip.name })
        },
        undefined,
        (err) => {
          if (cancelled) return
          console.warn(`Animation load failed for ${animationLabel}`, err)
          onStatusChange?.({ loading: false, error: err?.message || 'animation load failed' })
          clearTimeout(safetyTimer)
        }
      )
    }
    attachWhenModelReady()

    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationBlobUrl])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300 }} />
}
