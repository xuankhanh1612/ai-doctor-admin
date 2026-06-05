import React from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'

const MEDIAPIPE_APP_URL = '/src/mediapipe-khanh/index.html#/vision/object_detector'

export default function AIHealthcareVisionControlPanel({ onNext, onPrev, prevLabel }) {
  const { lang } = useApp()

  return (
    <div className="animate-fade ai-healthcare-vision-page">
      <section className="ai-healthcare-vision-header">
        <div>
          <div className="ai-healthcare-vision-kicker">AI HEALTHCARE VISION CONTROL</div>
          <h2>🧠 AI Healthcare Vision Control</h2>
          <p>
            {lang === 'vi'
              ? 'Tích hợp trực tiếp source code mediapipe-khanh vào dự án để điều khiển các tác vụ MediaPipe: Object Detector, Face/Hand/Pose Landmarker, Image Segmenter, Audio/Text AI và các pipeline camera theo thời gian thực.'
              : 'Integrates the mediapipe-khanh source directly into this project for MediaPipe control tasks: Object Detector, Face/Hand/Pose Landmarker, Image Segmenter, Audio/Text AI, and real-time camera pipelines.'}
          </p>
        </div>
        <a href={MEDIAPIPE_APP_URL} target="_blank" rel="noreferrer" className="ai-healthcare-vision-open-link">
          {lang === 'vi' ? 'Mở MediaPipe ↗' : 'Open MediaPipe ↗'}
        </a>
      </section>

      <section className="ai-healthcare-vision-frame-card" aria-label="AI Healthcare Vision Control MediaPipe app">
        <iframe
          title="AI Healthcare Vision Control"
          src={MEDIAPIPE_APP_URL}
          className="ai-healthcare-vision-frame"
          allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>

      <NavButtons onNext={onNext} nextLabel={`${lang === 'vi' ? 'Góc xả stress' : 'Stress Relief Corner'} →`} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
