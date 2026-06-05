import React, { useEffect, useRef } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import '../mediapipe-khanh/src/app_clean.css'
import { renderSidebar } from '../mediapipe-khanh/src/ui/sidebar'
import { renderMobileNav } from '../mediapipe-khanh/src/ui/mobile-nav'
import { setupObjectDetector, cleanupObjectDetector } from '../mediapipe-khanh/src/tasks/object-detector'
import { setupImageSegmenter, cleanupImageSegmenter } from '../mediapipe-khanh/src/tasks/image-segmenter'
import { setupAudioClassifier, cleanupAudioClassifier } from '../mediapipe-khanh/src/tasks/audio-classifier'
import { setupTextClassifier, cleanupTextClassifier } from '../mediapipe-khanh/src/tasks/text-classifier'
import { setupTextEmbedder, cleanupTextEmbedder } from '../mediapipe-khanh/src/tasks/text-embedder'
import { setupFaceDetector, cleanupFaceDetector } from '../mediapipe-khanh/src/tasks/face-detector'
import { setupFaceLandmarker, cleanupFaceLandmarker } from '../mediapipe-khanh/src/tasks/face-landmarker'
import { setupHandLandmarker, cleanupHandLandmarker } from '../mediapipe-khanh/src/tasks/hand-landmarker'
import { setupPoseLandmarker, cleanupPoseLandmarker } from '../mediapipe-khanh/src/tasks/pose-landmarker'
import { setupGestureRecognizer, cleanupGestureRecognizer } from '../mediapipe-khanh/src/tasks/gesture-recognizer'
import { setupLanguageDetector, cleanupLanguageDetector } from '../mediapipe-khanh/src/tasks/language-detector'
import { setupImageEmbedder, cleanupImageEmbedder } from '../mediapipe-khanh/src/tasks/image-embedder'
import { setupInteractiveSegmenter, cleanupInteractiveSegmenter } from '../mediapipe-khanh/src/tasks/interactive-segmenter'
import { setupHolisticLandmarker, cleanupHolisticLandmarker } from '../mediapipe-khanh/src/tasks/holistic-landmarker'
import { setupImageClassifier, cleanupImageClassifier } from '../mediapipe-khanh/src/tasks/image-classifier'

const ROUTES = {
  '/vision/object_detector': { setup: setupObjectDetector, cleanup: cleanupObjectDetector, label: 'Object Detector' },
  '/vision/face_detector': { setup: setupFaceDetector, cleanup: cleanupFaceDetector, label: 'Face Detector' },
  '/vision/face_landmarker': { setup: setupFaceLandmarker, cleanup: cleanupFaceLandmarker, label: 'Face Landmarker' },
  '/vision/hand_landmarker': { setup: setupHandLandmarker, cleanup: cleanupHandLandmarker, label: 'Hand Landmarker' },
  '/vision/pose_landmarker': { setup: setupPoseLandmarker, cleanup: cleanupPoseLandmarker, label: 'Pose Landmarker' },
  '/vision/holistic_landmarker': { setup: setupHolisticLandmarker, cleanup: cleanupHolisticLandmarker, label: 'Holistic Landmarker' },
  '/vision/image_classifier': { setup: setupImageClassifier, cleanup: cleanupImageClassifier, label: 'Image Classifier' },
  '/vision/gesture_recognizer': { setup: setupGestureRecognizer, cleanup: cleanupGestureRecognizer, label: 'Gesture Recognizer' },
  '/vision/interactive_segmenter': { setup: setupInteractiveSegmenter, cleanup: cleanupInteractiveSegmenter, label: 'Interactive Segmenter' },
  '/vision/image_segmenter': { setup: setupImageSegmenter, cleanup: cleanupImageSegmenter, label: 'Image Segmenter' },
  '/vision/image_embedder': { setup: setupImageEmbedder, cleanup: cleanupImageEmbedder, label: 'Image Embedder' },
  '/audio/audio_classifier': { setup: setupAudioClassifier, cleanup: cleanupAudioClassifier, label: 'Audio Classifier' },
  '/text/text_classifier': { setup: setupTextClassifier, cleanup: cleanupTextClassifier, label: 'Text Classifier' },
  '/text/language_detector': { setup: setupLanguageDetector, cleanup: cleanupLanguageDetector, label: 'Language Detector' },
  '/text/text_embedder': { setup: setupTextEmbedder, cleanup: cleanupTextEmbedder, label: 'Text Embedder' },
}

function getRouteFromHash() {
  const hash = window.location.hash.slice(1)
  return ROUTES[hash] ? hash : '/vision/object_detector'
}

export default function AIHealthcareVisionControlPanel({ onNext, onPrev, prevLabel }) {
  const { lang } = useApp()
  const shellRef = useRef(null)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return undefined

    const sidebar = shell.querySelector('.sidebar')
    const mobileNavContainer = shell.querySelector('#mobile-nav-container')
    const mainContent = shell.querySelector('.main-content')
    const menuToggles = shell.querySelectorAll('.menu-toggle')
    let currentCleanup
    let disposed = false

    renderSidebar(sidebar)
    renderMobileNav(mobileNavContainer)

    const setSidebarOpen = () => sidebar.classList.toggle('open')
    menuToggles.forEach((toggle) => toggle.addEventListener('click', setSidebarOpen))

    const closeSidebar = (event) => {
      if (event.target.closest('a')) sidebar.classList.remove('open')
    }
    sidebar.addEventListener('click', closeSidebar)

    const routeTask = async () => {
      const routeKey = getRouteFromHash()
      const route = ROUTES[routeKey]

      if (window.location.hash.slice(1) !== routeKey) {
        window.location.hash = routeKey
        return
      }

      if (currentCleanup) {
        currentCleanup()
        currentCleanup = undefined
      }

      mainContent.innerHTML = ''
      await route.setup(mainContent)
      if (disposed) {
        route.cleanup?.()
        return
      }
      currentCleanup = route.cleanup

      sidebar.querySelectorAll('a').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${routeKey}`)
      })
    }

    window.addEventListener('hashchange', routeTask)
    routeTask()

    return () => {
      disposed = true
      window.removeEventListener('hashchange', routeTask)
      menuToggles.forEach((toggle) => toggle.removeEventListener('click', setSidebarOpen))
      sidebar.removeEventListener('click', closeSidebar)
      currentCleanup?.()
      mainContent.innerHTML = ''
    }
  }, [])

  return (
    <div className="animate-fade ai-healthcare-vision-control-page">
      <section className="ai-healthcare-vision-control-header">
        <div>
          <div className="ai-healthcare-vision-kicker">MEDIAPIPE-KHANH INTEGRATION</div>
          <h2>🧠 AI Healthcare Vision Control</h2>
          <p>
            {lang === 'vi'
              ? 'Tích hợp trực tiếp bộ demo MediaPipe Tasks từ thư mục mediapipe-khanh: điều khiển nhận diện khuôn mặt, bàn tay, pose, object, audio và text ngay trong dashboard.'
              : 'Directly integrates the MediaPipe Tasks demo from the mediapipe-khanh source folder: control face, hand, pose, object, audio, and text AI tasks inside the dashboard.'}
          </p>
        </div>
      </section>

      <section className="ai-healthcare-vision-control-shell" ref={shellRef} aria-label="AI Healthcare Vision Control MediaPipe console">
        <div className="app-container">
          <aside className="sidebar" />
          <div className="mobile-header">
            <button className="menu-toggle material-icons" type="button" style={{ marginRight: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>menu</button>
            <div id="mobile-nav-container" style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }} />
          </div>
          <main className="main-content" />
        </div>
      </section>

      <NavButtons onNext={onNext} nextLabel="AI inbody Portal →" onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
