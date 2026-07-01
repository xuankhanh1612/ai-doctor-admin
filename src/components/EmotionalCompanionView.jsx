import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  EMOTIONAL_QUICK_PROMPTS,
  createChatMessage,
  createInitialAgentMessage,
} from '../lib/generalPractitionerChat.js'
import { getGpChatHistory, saveGpChatHistory } from '../lib/generalPractitionerChatStorage.js'
import { callGroqChat, useVoiceInput, useTTS } from '../lib/groqAiClient.js'
import { MAX_FILES } from '../lib/useGlobalAIChatbotEngine.js'

const BLUE = '#0058bc'
const PRIMARY = '#0070eb'
const SURFACE = '#f9f9fb'
const INK = '#1D1D1F'
const MUTED = '#86868B'
const HEALTHY = '#68D391'
const ATTENTION = '#FF8A7A'
const GENERAL_DOCTOR_PLAYLIST_EMBED_URL = 'https://www.youtube.com/embed/videoseries?list=PLhPgpmsoyA4GrZ5mGrOPyf1wb1Ke1Zw8p'

const GP_SYSTEM_PROMPT_VI = `Bạn là AI Bác sĩ đa khoa (General Practitioner AI) — một người đồng hành sức khỏe và cảm xúc thân thiện, ấm áp.

Vai trò:
1. Lắng nghe và tâm sự: hỏi thêm về triệu chứng (bắt đầu khi nào, mức độ 0-10, thuốc đang dùng, dị ứng, điều gì tốt hơn/tệ hơn).
2. Hỗ trợ cảm xúc: khi người dùng lo lắng, mất ngủ, stress — đồng cảm, hướng dẫn thở chậm, chánh niệm đơn giản.
3. Tư vấn phổ thông: giải thích triệu chứng thông thường một cách dễ hiểu, không chẩn đoán thay bác sĩ.
4. Phân tích ảnh/tài liệu y tế nếu được đính kèm.

Quy tắc:
- Trả lời bằng tiếng Việt, giọng ấm áp, cẩn thận.
- Súc tích (3-6 câu), dùng markdown nhẹ khi cần.
- KHÔNG chẩn đoán bệnh hay kê đơn thay bác sĩ. Luôn khuyến khích đặt lịch khám với triệu chứng nghiêm trọng.
- Nếu có dấu hiệu cấp cứu (đau ngực, khó thở nặng, đột quỵ, co giật, tự hại): khuyên gọi cấp cứu ngay.`

const GP_SYSTEM_PROMPT_EN = `You are a General Practitioner AI — a friendly and warm health and emotional companion.

Role:
1. Listen and empathize: ask follow-up questions about symptoms (onset, severity 0-10, medications, allergies, what helps/worsens).
2. Emotional support: when users feel anxious, sleepless, or stressed — show empathy, guide slow breathing, simple mindfulness.
3. General health info: explain common symptoms in plain language; never diagnose or prescribe in place of a doctor.
4. Analyze images/medical documents if attached.

Rules:
- Warm, careful tone. Concise (3-6 sentences), use light markdown when helpful.
- NEVER diagnose or prescribe — always encourage booking a doctor for serious symptoms.
- If emergency signs appear (chest pain, severe dyspnea, stroke, seizure, self-harm): advise calling emergency services immediately.`

const panelShell = {
  minHeight: 920,
  borderRadius: 28,
  overflow: 'hidden',
  background: SURFACE,
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.10)',
  color: '#1a1c1d',
  position: 'relative',
}

const glass = {
  background: 'rgba(255,255,255,0.76)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
}

function MaterialIcon({ children, size = 22, style }) {
  return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{children}</span>
}

function CompanionTile({ icon, color, title, subtitle, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ ...glass, padding: 24, borderRadius: 26, border: 'none', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit' }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${color}25`, display: 'grid', placeItems: 'center', color, marginBottom: 16, fontSize: 22 }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: 15, color: INK }}>{title}</h3>
      <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 13 }}>{subtitle}</p>
    </button>
  )
}

function formatMessageTime(iso, lang) {
  try {
    return new Date(iso).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function EmotionalCompanionView({ onOpenStressRelief, onOpenInBody }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const isVi = lang !== 'en'
  const userKey = user?.uuid || null

  const [chatPrompt, setChatPrompt] = useState('')
  const [chatMessages, setChatMessages] = useState(() => [createInitialAgentMessage(lang)])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [speakingMsgId, setSpeakingMsgId] = useState(null)

  const scrollRef = useRef(null)
  const docInputRef = useRef(null)
  const fileInputRef = useRef(null)

  // ── TTS: tiếng Việt → /api/google-tts, tiếng Anh → Web Speech API ──
  const ttsVi = useTTS('vi')
  const ttsEn = useTTS('en')
  const activeTts = isVi ? ttsVi : ttsEn
  const isSpeaking = ttsVi.speaking || ttsEn.speaking

  // ── STT: giọng nói → text (Groq Whisper) ──
  const { recording, transcribing, toggle: toggleMic } = useVoiceInput(
    (text) => setChatPrompt(prev => prev ? `${prev} ${text}` : text),
    isVi ? 'vi' : 'en'
  )

  // Reset speakingMsgId khi TTS xong
  useEffect(() => {
    if (!isSpeaking) setSpeakingMsgId(null)
  }, [isSpeaking])

  // Tự cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 30)
  }, [chatMessages, busy])

  // Load lịch sử chat
  useEffect(() => {
    let cancelled = false
    setHistoryLoaded(false)
    ;(async () => {
      const saved = await getGpChatHistory(userKey)
      if (cancelled) return
      if (saved.length > 0) setChatMessages(saved)
      else setChatMessages([createInitialAgentMessage(lang)])
      setHistoryLoaded(true)
    })()
    return () => { cancelled = true }
  }, [userKey])

  // Lưu lịch sử chat
  useEffect(() => {
    if (!historyLoaded) return
    saveGpChatHistory(userKey, chatMessages)
  }, [chatMessages, historyLoaded, userKey])

  // ── Đọc file đính kèm ──
  const readFileAsDataUrl = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(String(r.result || '')); r.onerror = rej; r.readAsDataURL(file)
  })
  const readFileAsText = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(String(r.result || '')); r.onerror = rej; r.readAsText(file, 'utf-8')
  })
  const isTextLike = (f) => /\.(txt|csv|md)$/i.test(f.name || '') || ['text/plain','text/csv'].includes(f.type)

  const handleFilesSelect = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length) return
    const room = MAX_FILES - attachedFiles.length
    if (room <= 0) { window.alert(isVi ? `Tối đa ${MAX_FILES} file.` : `Max ${MAX_FILES} files.`); return }
    const toProcess = files.slice(0, room)
    const newEntries = []
    for (const file of toProcess) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`
      try {
        if (file.type.startsWith('image/')) {
          const dataUrl = await readFileAsDataUrl(file)
          newEntries.push({ id, kind: 'image', dataUrl, base64: dataUrl.split(',')[1] || '', mimeType: file.type, name: file.name })
        } else if (file.type === 'application/pdf') {
          const dataUrl = await readFileAsDataUrl(file)
          newEntries.push({ id, kind: 'pdf', dataUrl, base64: dataUrl.split(',')[1] || '', mimeType: 'application/pdf', name: file.name })
        } else if (isTextLike(file)) {
          const textContent = await readFileAsText(file)
          newEntries.push({ id, kind: 'text', name: file.name, mimeType: file.type || 'text/plain', textContent })
        }
      } catch (err) { console.error('Read file error:', file.name, err) }
    }
    if (newEntries.length) setAttachedFiles(prev => [...prev, ...newEntries])
  }
  const removeFile = (id) => setAttachedFiles(prev => prev.filter(f => f.id !== id))

  // ── Gửi tin nhắn ──
  const submitChatPrompt = async () => {
    const prompt = chatPrompt.trim()
    const files = attachedFiles
    if (!prompt && files.length === 0) return
    if (busy) return

    setChatPrompt('')
    setAttachedFiles([])
    setBusy(true)

    const userMsg = createChatMessage('user', prompt || (isVi ? `[Đã gửi ${files.length} file]` : `[Sent ${files.length} file(s)]`))
    userMsg.imageDataUrls = files.filter(f => f.kind === 'image' || f.kind === 'pdf').map(f => ({ dataUrl: f.dataUrl, kind: f.kind, name: f.name }))
    userMsg.fileNames = files.filter(f => f.kind === 'text').map(f => f.name)
    setChatMessages(prev => [...prev, userMsg])

    const systemPrompt = isVi ? GP_SYSTEM_PROMPT_VI : GP_SYSTEM_PROMPT_EN

    try {
      let reply = ''

      if (files.length > 0) {
        // Có file đính kèm → dùng Groq Vision
        const visionFiles = files.filter(f => f.kind === 'image' || f.kind === 'pdf')
        const textFiles = files.filter(f => f.kind === 'text')
        const textBlock = textFiles.map(f => `--- ${f.name} ---\n${f.textContent}`).join('\n\n')
        const defaultPrompt = isVi
          ? 'Hãy phân tích tài liệu/hình ảnh y tế này và đưa ra nhận xét hữu ích.'
          : 'Please analyze this medical document/image and provide helpful insights.'
        const instruction = (prompt || defaultPrompt) + (textBlock ? `\n\n---\n${textBlock}` : '')

        if (visionFiles.length > 0) {
          const contentParts = [
            ...visionFiles.map(f => ({ type: 'image_url', image_url: { url: `data:${f.mimeType};base64,${f.base64}` } })),
            { type: 'text', text: instruction },
          ]
          const res = await fetch('/api/groq-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'meta-llama/llama-4-scout-17b-16e-instruct',
              max_tokens: 1024,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: contentParts },
              ],
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.error?.message || `Groq Vision ${res.status}`)
          reply = data?.choices?.[0]?.message?.content || ''
        } else {
          reply = await callGroqChat([{ role: 'user', content: instruction }], systemPrompt)
        }
      } else {
        // Chat thuần văn bản — gửi full history
        const history = chatMessages
          .filter(m => m.role === 'user' || m.role === 'agent')
          .map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.text }))
        history.push({ role: 'user', content: prompt })
        reply = await callGroqChat(history, systemPrompt)
      }

      const agentMsg = createChatMessage('agent', reply || (isVi ? 'Xin lỗi, tôi chưa có phản hồi phù hợp.' : 'Sorry, I could not generate a response.'))
      setChatMessages(prev => [...prev, agentMsg])
    } catch (err) {
      console.error('GP AI error:', err)
      setChatMessages(prev => [...prev, createChatMessage('agent', isVi
        ? 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.'
        : 'Sorry, I ran into a connection issue. Please try again in a moment.')])
    } finally {
      setBusy(false)
    }
  }

  const toggleSpeak = (msgId, text) => {
    if (speakingMsgId === msgId && isSpeaking) {
      ttsVi.stop(); ttsEn.stop(); setSpeakingMsgId(null); return
    }
    ttsVi.stop(); ttsEn.stop()
    setSpeakingMsgId(msgId)
    activeTts.speak(text)
  }

  const resetChat = () => {
    ttsVi.stop(); ttsEn.stop()
    setChatMessages([createInitialAgentMessage(lang)])
    setChatPrompt('')
    setAttachedFiles([])
  }

  return (
    <div style={panelShell}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', ...glass }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img alt="Patient Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtKXZ8Z8xPdcddYd3_3LBUEgNXwg0eUvQSbHPBE7s4E0uhgb1LmS8wv5Igo9RqOekFLODV8AnqqJ87x2V5HuMj4zhCQDQhBlHpwDeVC7qg754k6-pXFeqwK9QDHldUAg7tHwQvn2isqzLDdinvGpzXK9ceLKuMGv8Qw1zBWtZb50Y2DehAH-CvqixV5e8bGLSTG3FNFmQ8DSlRQQBa6dpkXRs-tUXnA6dpiVBpbS9Wgl61ud3uxjSzBXi6HI0SnVuiskg5fquAGSs5" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#e1dfe3' }} />
          <b style={{ fontSize: 22, color: INK }}>Digital Twin</b>
        </div>
        <MaterialIcon style={{ color: BLUE }}>🔔</MaterialIcon>
      </div>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 200px' }}>
        {/* Intro */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: BLUE, display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 12px 30px rgba(0,88,188,0.24)', fontSize: 28 }}>🤖</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: INK }}>{lang === 'en' ? 'Hello, I am the General Practitioner AI' : 'Xin chào, tôi là AI Bác sĩ đa khoa'}</h1>
              <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 16 }}>{lang === 'en' ? 'A GP AI that can listen, discuss symptoms, and support emotional check-ins.' : 'Bác sĩ đa khoa AI luôn sẵn sàng lắng nghe, tâm sự và hỗ trợ kiểm tra triệu chứng.'}</p>
            </div>
          </div>
        </section>

        {/* Companion tiles + playlist */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 28 }}>
          <CompanionTile icon="📝" color={ATTENTION} title={lang === 'en' ? 'Stress journal' : 'Góc xả stress'} subtitle={lang === 'en' ? 'Open the immersive stress relief room' : 'Mở không gian xả stress chuyên sâu'} onClick={onOpenStressRelief} />
          <CompanionTile icon="💚" color={HEALTHY} title={lang === 'en' ? 'Affirmations' : 'Khẳng định'} subtitle={lang === 'en' ? 'Open the InBody portal' : 'Mở cổng InBody'} onClick={onOpenInBody} />
          <div style={{ gridColumn: '1 / -1', padding: 24, borderRadius: 28, ...glass, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 999, background: 'rgba(0,88,188,0.10)', color: BLUE, fontSize: 12, fontWeight: 800, marginBottom: 14 }}>{lang === 'en' ? 'Suggested activity' : 'Hoạt động đề xuất'}</span>
              <h3 style={{ margin: 0, fontSize: 26, color: INK }}>{lang === 'en' ? 'Mental wellness playlist with the GP AI' : 'Playlist chăm sóc tinh thần cùng AI Bác sĩ đa khoa'}</h3>
              <p style={{ margin: '10px 0 16px', maxWidth: 620, color: MUTED, lineHeight: 1.55 }}>{lang === 'en' ? 'Play relaxation, emotional-care, and recovery videos directly inside this page.' : 'Phát các video hướng dẫn thư giãn, chăm sóc sức khoẻ tinh thần và phục hồi năng lượng ngay trong trang này.'}</p>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,88,188,0.14)', boxShadow: '0 18px 46px rgba(0,88,188,0.16)', background: '#000' }}>
                <iframe title={lang === 'en' ? 'GP AI emotional companion playlist' : 'Playlist AI Bác sĩ đa khoa đồng hành cảm xúc'} src={GENERAL_DOCTOR_PLAYLIST_EMBED_URL} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div>
            </div>
            <div style={{ position: 'absolute', right: -40, bottom: -40, width: 170, height: 170, borderRadius: '50%', background: 'rgba(0,88,188,0.06)', animation: 'hj-breathe 8s ease-in-out infinite' }} />
          </div>
        </section>

        {/* ── Chat section ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Chat header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: MUTED, fontSize: 12, fontWeight: 800 }}>
                {lang === 'en'
                  ? `${chatMessages.length} messages · Groq AI · voice & file support`
                  : `${chatMessages.length} tin nhắn · Groq AI · giọng nói & đính kèm file`}
              </div>
              {busy && (
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,88,188,0.10)', color: BLUE, fontWeight: 700 }}>
                  {lang === 'en' ? 'AI thinking…' : 'AI đang soạn…'}
                </span>
              )}
            </div>
            <button type="button" onClick={resetChat} style={{ border: '1px solid rgba(0,88,188,0.14)', background: 'rgba(0,88,188,0.06)', color: BLUE, borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
              {lang === 'en' ? 'Reset chat' : 'Tạo lại cuộc trò chuyện'}
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
            {chatMessages.map(message => {
              const isUser = message.role === 'user'
              return (
                <div key={message.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 12, marginLeft: isUser ? 60 : 0, marginRight: isUser ? 0 : 60 }}>
                  {!isUser && (
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: BLUE, color: '#fff', flexShrink: 0, display: 'grid', placeItems: 'center' }}>🤖</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ background: isUser ? PRIMARY : 'rgba(255,255,255,0.76)', color: isUser ? '#fff' : INK, padding: '16px 20px', borderRadius: isUser ? '24px 24px 4px 24px' : '4px 24px 24px 24px', border: isUser ? 'none' : '1px solid rgba(255,255,255,0.45)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', lineHeight: 1.65 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.06em', color: isUser ? 'rgba(255,255,255,0.78)' : BLUE, marginBottom: 6 }}>
                        {isUser ? (lang === 'en' ? 'YOU' : 'BẠN') : 'AI BÁC SĨ ĐA KHOA'}
                      </div>
                      {/* Ảnh/PDF đính kèm */}
                      {message.imageDataUrls && message.imageDataUrls.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: message.text ? 8 : 0 }}>
                          {message.imageDataUrls.map((img, i) => (
                            img.kind === 'pdf'
                              ? <div key={i} style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📄<span style={{ fontSize: 8, marginTop: 2, maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</span></div>
                              : <img key={i} src={img.dataUrl} alt={img.name || 'img'} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }} />
                          ))}
                        </div>
                      )}
                      {message.fileNames && message.fileNames.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: message.text ? 8 : 0 }}>
                          {message.fileNames.map((name, i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.2)' }}>📃 {name}</span>)}
                        </div>
                      )}
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.text}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isUser ? 'flex-end' : 'space-between', gap: 8, marginTop: 8 }}>
                        <span style={{ opacity: 0.55, fontSize: 12 }}>{formatMessageTime(message.createdAt, lang)}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => toggleSpeak(message.id, message.text)}
                            title={speakingMsgId === message.id && isSpeaking ? (lang === 'en' ? 'Stop' : 'Dừng đọc') : (lang === 'en' ? 'Read aloud' : 'Đọc to')}
                            style={{ background: 'rgba(0,88,188,0.10)', border: 'none', borderRadius: 20, padding: '4px 10px', fontSize: 13, color: BLUE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {speakingMsgId === message.id && isSpeaking ? '⏸' : '🔊'}
                            <span style={{ fontSize: 10, fontWeight: 700 }}>{speakingMsgId === message.id && isSpeaking ? (lang === 'en' ? 'Stop' : 'Dừng') : (lang === 'en' ? 'Listen' : 'Nghe')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {busy && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginRight: 60 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: BLUE, color: '#fff', flexShrink: 0, display: 'grid', placeItems: 'center' }}>🤖</div>
                <div style={{ background: 'rgba(255,255,255,0.76)', padding: '16px 20px', borderRadius: '4px 24px 24px 24px', border: '1px solid rgba(255,255,255,0.45)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE, display: 'inline-block', animation: `gpTypingDot 1.2s ${d}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(EMOTIONAL_QUICK_PROMPTS[lang] || EMOTIONAL_QUICK_PROMPTS.vi).map(prompt => (
              <button key={prompt} type="button" disabled={busy} onClick={() => setChatPrompt(prompt)}
                style={{ border: '1px solid rgba(0,88,188,0.14)', background: 'rgba(0,88,188,0.06)', color: BLUE, borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {prompt}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* ── Input bar (sticky bottom) ── */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 16, maxWidth: 820, margin: '0 auto', padding: '0 20px 20px' }}>
        {/* File previews */}
        {attachedFiles.length > 0 && (
          <div style={{ ...glass, borderRadius: 20, padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'thin' }}>
            {attachedFiles.map(f => (
              <div key={f.id} style={{ position: 'relative', flexShrink: 0 }}>
                {f.kind === 'image'
                  ? <img src={f.dataUrl} alt={f.name} title={f.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
                  : <div title={f.name} style={{ width: 48, height: 48, borderRadius: 10, background: '#f0f2fa', border: '1px solid rgba(0,88,188,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {f.kind === 'pdf' ? '📄' : '📃'}
                      <span style={{ fontSize: 7, marginTop: 2, maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: MUTED }}>{f.name}</span>
                    </div>}
                <button type="button" onClick={() => removeFile(f.id)}
                  style={{ position: 'absolute', top: -5, right: -5, border: 'none', background: '#fff', color: INK, borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 10, lineHeight: '16px', padding: 0, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', fontWeight: 800 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div style={{ ...glass, display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 999 }}>
          {/* Hidden file inputs */}
          <input ref={docInputRef} type="file" accept="image/*,application/pdf,text/plain,text/csv,.csv,.txt,.md" multiple onChange={handleFilesSelect} style={{ display: 'none' }} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelect} style={{ display: 'none' }} />

          {/* Attach doc (+) */}
          <button type="button" onClick={() => docInputRef.current?.click()} disabled={busy || attachedFiles.length >= MAX_FILES}
            title={lang === 'en' ? `Attach PDF / text / image (max ${MAX_FILES})` : `Đính kèm PDF / văn bản / ảnh (tối đa ${MAX_FILES})`}
            style={{ ...roundButton('rgba(0,88,188,0.08)', BLUE), opacity: (busy || attachedFiles.length >= MAX_FILES) ? 0.5 : 1, cursor: (busy || attachedFiles.length >= MAX_FILES) ? 'not-allowed' : 'pointer', fontSize: 18, fontWeight: 900 }}>
            +
          </button>

          {/* Text input */}
          <input
            value={chatPrompt}
            onChange={e => setChatPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitChatPrompt() }}
            placeholder={transcribing ? (lang === 'en' ? 'Transcribing…' : 'Đang nhận diện giọng nói…') : (lang === 'en' ? 'Talk with the General Practitioner AI… (Enter to send)' : 'Tâm sự với AI Bác sĩ đa khoa… (Enter để gửi)')}
            disabled={busy}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: INK, padding: '0 6px' }}
          />

          {/* Image attach 🖼️ */}
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy || attachedFiles.length >= MAX_FILES}
            title={lang === 'en' ? 'Send image for AI analysis' : 'Gửi hình ảnh để AI phân tích'}
            style={{ ...roundButton(attachedFiles.length > 0 ? 'rgba(0,88,188,0.14)' : '#f3f3f5', BLUE), opacity: (busy || attachedFiles.length >= MAX_FILES) ? 0.5 : 1, cursor: (busy || attachedFiles.length >= MAX_FILES) ? 'not-allowed' : 'pointer', fontSize: 18 }}>
            🖼️
          </button>

          {/* Mic 🎙️ */}
          <button type="button" onClick={toggleMic} disabled={busy && !recording}
            title={recording ? (lang === 'en' ? 'Stop recording' : 'Dừng ghi âm') : (lang === 'en' ? 'Speak to chat' : 'Nói để tâm sự')}
            style={{ ...roundButton(recording ? '#ef4444' : '#f3f3f5', recording ? '#fff' : MUTED), opacity: transcribing ? 0.7 : 1, cursor: transcribing ? 'wait' : 'pointer', fontSize: 18 }}>
            {transcribing ? '⏳' : recording ? '⏹️' : '🎙️'}
          </button>

          {/* Send ↑ */}
          <button type="button" onClick={submitChatPrompt} disabled={busy || (!chatPrompt.trim() && attachedFiles.length === 0)}
            style={{ ...roundButton(BLUE, '#fff'), opacity: (busy || (!chatPrompt.trim() && attachedFiles.length === 0)) ? 0.45 : 1, cursor: (busy || (!chatPrompt.trim() && attachedFiles.length === 0)) ? 'not-allowed' : 'pointer', fontSize: 20 }}>
            {busy ? '…' : '↑'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes gpTypingDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}

function roundButton(bg, color) {
  return { width: 42, height: 42, borderRadius: '50%', border: 'none', background: bg, color, display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 20, flexShrink: 0 }
}
