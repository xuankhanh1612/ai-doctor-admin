// src/lib/groqAiClient.js
// Stack AI thật dùng chung: Groq LLM (chat), Groq Whisper (STT), TTS (đọc to).
// Đây là logic đã được WikiMedVisionPanel dùng và kiểm chứng — tách ra thành
// module riêng để GlobalAIChatbot (và các nơi khác) có thể tái sử dụng thay vì
// chạy Transformers.js trong trình duyệt.
//
// Các API serverless phía sau (đã có sẵn trong /api):
//   /api/groq-proxy   → proxy Groq Chat Completions (model llama-3.3-70b-versatile)
//   /api/groq-whisper  → proxy Groq Whisper STT (model whisper-large-v3-turbo)
//   /api/google-tts    → proxy Google Translate TTS (giọng tiếng Việt)

import { useCallback, useRef, useState, useEffect } from 'react'

export const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ─── Groq LLM (chat) ──────────────────────────────────────────────────────────
// messages: [{ role: 'user' | 'assistant', content: string }, ...]
export async function callGroqChat(messages, systemPrompt, { maxTokens = 1024, temperature = 0.7 } = {}) {
  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: String(m.content) })),
  ]

  const res = await fetch('/api/groq-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: groqMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || JSON.stringify(data)
    throw new Error(`Groq API error: ${res.status} — ${msg}`)
  }

  return data.choices?.[0]?.message?.content || ''
}

// ─── Groq Whisper STT hook ────────────────────────────────────────────────────
// Records audio via MediaRecorder, sends to /api/groq-whisper, returns transcript.
// lang: 'vi' | 'en' — passed to Whisper for better accuracy.
export function useVoiceInput(onTranscript, lang = 'vi') {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const start = useCallback(async () => {
    if (recording || transcribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setTranscribing(true)
        try {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
          const formData = new FormData()
          formData.append('file', blob, `voice.${ext}`)
          formData.append('language', lang === 'vi' ? 'vi' : 'en')
          const res = await fetch('/api/groq-whisper', { method: 'POST', body: formData })
          const data = await res.json()
          if (data?.text?.trim()) onTranscript(data.text.trim())
        } catch (err) {
          console.error('[Whisper STT] error:', err)
        } finally {
          setTranscribing(false)
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (err) {
      console.error('[Whisper STT] mic error:', err)
    }
  }, [recording, transcribing, lang, onTranscript])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }, [])

  const toggle = useCallback(() => {
    if (recording) stop(); else start()
  }, [recording, start, stop])

  return { recording, transcribing, toggle }
}

// ─── TTS (Text-to-Speech) ────────────────────────────────────────────────────
// Tiếng Việt: dùng Google Translate TTS qua proxy /api/google-tts (tránh CORS)
// Tiếng Anh : dùng Web Speech API (sẵn có trên mọi browser)

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Chia text thành các đoạn ≤ maxLen ký tự, cắt tại ranh giới câu
function splitChunks(text, maxLen = 180) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text]
  const chunks = []
  let cur = ''
  for (const s of sentences) {
    if ((cur + s).length > maxLen && cur) { chunks.push(cur.trim()); cur = s }
    else cur += s
  }
  if (cur.trim()) chunks.push(cur.trim())
  return chunks.filter(Boolean)
}

export function useTTS(lang = 'vi') {
  const [speaking, setSpeaking] = useState(false)
  const stopRef = useRef(false)
  const audioRef = useRef(null)

  const stop = useCallback(() => {
    stopRef.current = true
    setSpeaking(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback(async (text) => {
    if (speaking) { stop(); return }
    const clean = stripMarkdown(text)
    if (!clean) return
    stopRef.current = false

    if (lang === 'vi') {
      // ── Google Translate TTS qua proxy (tránh CORS) ──
      const chunks = splitChunks(clean, 180)
      setSpeaking(true)
      for (const chunk of chunks) {
        if (stopRef.current) break
        const url = `/api/google-tts?tl=vi&q=${encodeURIComponent(chunk)}`
        const audio = new Audio(url)
        audioRef.current = audio
        await new Promise((res) => {
          audio.onended = res
          audio.onerror = res
          audio.play().catch(res)
        })
        audioRef.current = null
      }
      if (!stopRef.current) setSpeaking(false)
    } else {
      // ── Web Speech API cho tiếng Anh ──
      if (!window.speechSynthesis) return
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(clean)
      utter.lang = 'en-US'
      utter.rate = 0.95
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v => v.lang.startsWith('en') && v.localService)
        || voices.find(v => v.lang.startsWith('en'))
      if (preferred) utter.voice = preferred
      utter.onstart = () => setSpeaking(true)
      utter.onend   = () => setSpeaking(false)
      utter.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utter)
    }
  }, [speaking, lang, stop])

  useEffect(() => () => stop(), [stop])

  return { speaking, speak, stop }
}
