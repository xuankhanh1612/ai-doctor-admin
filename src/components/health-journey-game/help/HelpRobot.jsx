import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const stripRobotMarkdown = (text = '') => String(text)
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/[*_#>\[\]()]/g, ' ')
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const splitRobotTtsChunks = (text, maxLen = 180) => {
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]*/g) || [text]
  const chunks = []
  let current = ''
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(Boolean)
}

/**
 * Chatbot guide: a small robot avatar with a speech-bubble that explains
 * whatever tab is currently active, plus a CTA to jump straight to that
 * screen inside the live app.
 */
export default function HelpRobot({ message, accentColor = '#8b5cf6', actionLabel, onAction, prevLabel, nextLabel, onPrev, onNext }) {
  const { lang } = useApp()
  const [displayedMessage, setDisplayedMessage] = useState(message)
  const [animKey, setAnimKey] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef(null)
  const stopRef = useRef(false)

  const stopVoice = () => {
    stopRef.current = true
    setSpeaking(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load?.()
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  }

  const playVoice = async () => {
    if (speaking) {
      stopVoice()
      return
    }

    const clean = stripRobotMarkdown(displayedMessage)
    if (!clean) return

    stopVoice()
    stopRef.current = false
    setSpeaking(true)

    if (lang === 'vi') {
      const audio = audioRef.current
      if (!audio) {
        setSpeaking(false)
        return
      }
      const chunks = splitRobotTtsChunks(clean, 180)
      for (const chunk of chunks) {
        if (stopRef.current) break
        audio.src = `/api/google-tts?tl=vi&q=${encodeURIComponent(chunk)}`
        await new Promise((resolve) => {
          audio.onended = resolve
          audio.onerror = resolve
          audio.play().catch(resolve)
        })
      }
      if (!stopRef.current) setSpeaking(false)
      return
    }

    if (!window.speechSynthesis) {
      setSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find((voice) => voice.lang.startsWith('en') && voice.localService)
      || voices.find((voice) => voice.lang.startsWith('en'))
    if (preferredVoice) utterance.voice = preferredVoice
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  // Re-trigger the "typing" fade/slide animation every time the message changes.
  useEffect(() => {
    stopVoice()
    setDisplayedMessage(message)
    setAnimKey((k) => k + 1)
  }, [message])

  useEffect(() => () => stopVoice(), [])

  return (
    <div className="hj-robot-panel">
      <div className="hj-robot-avatar-wrap">
        <div className="hj-robot-avatar" style={{ '--robot-glow': accentColor }}>
          <span className="hj-robot-face">🤖</span>
          <span className="hj-robot-eye hj-robot-eye-l" />
          <span className="hj-robot-eye hj-robot-eye-r" />
        </div>
        <div className="hj-robot-name">AI Coach</div>
      </div>

      <div className="hj-speech-bubble" style={{ '--bubble-accent': accentColor }}>
        <div className="hj-speech-tick" />
        <p key={animKey} className="hj-speech-text hj-fade-in">
          {displayedMessage}
        </p>
        <audio ref={audioRef} preload="none" className="hj-robot-audio" />

        <div className="hj-speech-voice-row">
          <button
            type="button"
            className="hj-btn-voice"
            style={{ '--btn-accent': accentColor }}
            onClick={playVoice}
            title={lang === 'vi' ? 'Phát giọng Việt qua Google Translate TTS' : 'Play en-US voice with Web Speech API'}
          >
            {speaking ? '⏹ Dừng giọng' : '🔊 Nghe AI Coach'}
          </button>
        </div>

        {(onAction || onPrev || onNext) && (
          <div className="hj-speech-actions">
            {onPrev && (
              <button type="button" className="hj-btn-ghost" onClick={onPrev}>
                ◀ {prevLabel || 'Trước'}
              </button>
            )}
            {onAction && (
              <button
                type="button"
                className="hj-btn-primary"
                style={{ '--btn-accent': accentColor }}
                onClick={onAction}
              >
                🚀 {actionLabel || 'Đi đến màn hình này'}
              </button>
            )}
            {onNext && (
              <button type="button" className="hj-btn-ghost" onClick={onNext}>
                {nextLabel || 'Tiếp theo'} ▶
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
