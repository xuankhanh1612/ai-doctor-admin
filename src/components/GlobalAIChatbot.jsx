import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { callGroqChat, useVoiceInput, useTTS } from '../lib/groqAiClient.js'
import { getDeterministicFallbackReply } from '../lib/huggingFaceTransformersChat.js'
import { getGlobalChatHistory, saveGlobalChatHistory } from '../lib/globalChatbotStorage.js'

const quickPrompts = [
  'Cách tải hồ sơ y tế?',
  'Làm sao in kết quả?',
  'AI Healthcare Vision dùng thế nào?',
]

const SYSTEM_PROMPT_VI = `Bạn là chatbot AI chung 🤗 của website Consensus Doctor — một trợ lý thân thiện, đa năng.

Vai trò của bạn:
1. Chào hỏi người dùng và hướng dẫn cách sử dụng website: Upload Records (tải PDF/ảnh/DICOM), AI Healthcare Vision (xem/so sánh ảnh y tế), AI InBody Portal (chỉ số cơ thể), Family Medical Tree (gia phả bệnh lý), Print Portal (in tài liệu), Profile (hồ sơ cá nhân, giao diện, ngôn ngữ).
2. Trả lời các câu hỏi y tế và sức khoẻ phổ thông một cách rõ ràng, chính xác, dễ hiểu — giống một trợ lý kiến thức y tế đáng tin cậy.
3. Trò chuyện tự nhiên về các chủ đề khác nếu người dùng hỏi.

Quy tắc:
- Luôn trả lời bằng tiếng Việt có dấu, giọng văn thân thiện, ấm áp.
- Súc tích nhưng đầy đủ; dùng markdown (đậm, danh sách) khi cần cho dễ đọc.
- Không bao giờ chẩn đoán bệnh hoặc kê đơn thay bác sĩ — luôn khuyến khích người dùng tham khảo bác sĩ/chuyên gia y tế cho các quyết định sức khoẻ cá nhân, đặc biệt với triệu chứng nghiêm trọng.
- Nếu câu hỏi có dấu hiệu cấp cứu (đau ngực, khó thở, ngất, co giật, chảy máu nhiều...), hãy khuyên người dùng đi cấp cứu ngay.
- Không nhắc đến tên model, API, hệ thống nội bộ hoặc bất kỳ chi tiết kỹ thuật nào trong câu trả lời.`

const SYSTEM_PROMPT_EN = `You are 🤗, the general AI chatbot of the Consensus Doctor website — a friendly, versatile assistant.

Your role:
1. Greet users and guide them on how to use the website: Upload Records (PDF/image/DICOM upload), AI Healthcare Vision (medical image viewing/comparison), AI InBody Portal (body composition), Family Medical Tree (family medical history), Print Portal (printing documents), Profile (personal info, theme, language).
2. Answer general medical and health questions clearly, accurately, and helpfully — like a trustworthy medical knowledge assistant.
3. Chat naturally about other topics if asked.

Rules:
- Be concise but thorough; use markdown (bold, lists) when helpful for readability.
- Never diagnose conditions or prescribe treatment — always encourage users to consult a doctor or medical professional for personal health decisions, especially for serious symptoms.
- If a question suggests an emergency (chest pain, difficulty breathing, fainting, seizures, heavy bleeding...), advise the user to seek emergency care immediately.
- Never mention model names, APIs, internal systems, or any technical details in your reply.`

export default function GlobalAIChatbot({ activePanelLabel }) {
  const { theme, lang } = useApp()
  const { user } = useAuth()
  // Storage key for chat history — `uuid` is the same identifier field for every
  // user type (guest or signed-in), so each guest's history stays separate too.
  const userKey = user?.uuid || null
  const isDark = theme === 'dark'
  const isVi = lang !== 'en'

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState(isVi ? 'Sẵn sàng' : 'Ready')
  const [mode, setMode] = useState('idle')
  const [busy, setBusy] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [attachedImage, setAttachedImage] = useState(null) // { dataUrl, base64, mimeType, name }
  const fileInputRef = useRef(null)
  const [messages, setMessages] = useState(() => [{
    id: 'hello',
    role: 'assistant',
    text: isVi
      ? 'Xin chào! Tôi là trợ lý AI chung của Consensus Doctor. Tôi có thể chào hỏi, trả lời câu hỏi y tế và phổ thông, hướng dẫn tải hồ sơ, phân tích ảnh, InBody, gia phả bệnh lý hoặc Print Portal. Bạn cũng có thể nói chuyện bằng giọng nói 🎙️ hoặc nghe tôi đọc to câu trả lời 🔊.'
      : "Hi! I'm Consensus Doctor's general AI assistant. I can chat, answer health and general questions, and guide you through uploading records, image analysis, InBody, family medical tree, or Print Portal. You can also talk to me with voice 🎙️ or have replies read aloud 🔊.",
  }])
  const scrollRef = useRef(null)

  const systemPrompt = isVi ? SYSTEM_PROMPT_VI : SYSTEM_PROMPT_EN
  const styles = useMemo(() => createStyles(isDark), [isDark])
  const { speaking, speak } = useTTS(isVi ? 'vi' : 'en')

  const handleTranscript = (text) => {
    setInput(prev => (prev ? `${prev} ${text}` : text))
  }
  const { recording, transcribing, toggle: toggleMic } = useVoiceInput(handleTranscript, isVi ? 'vi' : 'en')

  // Nạp lịch sử chat đã lưu của user khi mở chatbot lần đầu (hoặc khi đổi user)
  useEffect(() => {
    let cancelled = false
    setHistoryLoaded(false)
    ;(async () => {
      const saved = await getGlobalChatHistory(userKey)
      if (cancelled) return
      if (saved.length > 0) setMessages(saved)
      setHistoryLoaded(true)
    })()
    return () => { cancelled = true }
  }, [userKey])

  // Tự động lưu mỗi khi messages đổi (chỉ sau khi đã nạp lịch sử xong, tránh ghi đè)
  useEffect(() => {
    if (!historyLoaded) return
    saveGlobalChatHistory(userKey, messages)
  }, [messages, historyLoaded, userKey])

  const pushMessage = (message) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, ...message }])
    window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 30)
  }

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const base64 = dataUrl.split(',')[1] || ''
      setAttachedImage({ dataUrl, base64, mimeType: file.type || 'image/jpeg', name: file.name })
    }
    reader.readAsDataURL(file)
  }

  const submitQuestion = async (rawQuestion = input) => {
    const question = rawQuestion.trim()
    const image = attachedImage
    if (!question && !image) return
    if (busy) return
    setInput('')
    setAttachedImage(null)
    setBusy(true)
    pushMessage({ role: 'user', text: question || (isVi ? '[Đã gửi 1 hình ảnh]' : '[Sent 1 image]'), imageDataUrl: image?.dataUrl || null })

    if (image) {
      // ── Vision path: user attached an image → analyze with Groq vision model ──
      try {
        setStatus(isVi ? 'Đang phân tích hình ảnh...' : 'Analyzing image...')
        setMode('thinking')

        const visionPrompt = question || (isVi
          ? 'Hãy phân tích sâu hình ảnh này (đặc biệt nếu là ảnh y tế: X-quang, CT, MRI, kết quả xét nghiệm, hồ sơ...). Mô tả những gì quan sát được, lưu ý các điểm bất thường nếu có, và đưa ra nhận xét hữu ích.'
          : 'Please analyze this image in depth (especially if it is a medical image: X-ray, CT, MRI, lab result, document...). Describe what you observe, note any abnormalities, and give a helpful assessment.')

        const res = await fetch('/api/groq-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            max_tokens: 1024,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
                  { type: 'text', text: visionPrompt },
                ],
              },
            ],
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error?.message || `Groq Vision ${res.status}`)
        const answer = data?.choices?.[0]?.message?.content || ''
        pushMessage({ role: 'assistant', text: answer || (isVi ? 'Xin lỗi, tôi chưa phân tích được hình ảnh này.' : 'Sorry, I could not analyze this image.') })
        setMode('groq')
        setStatus(isVi ? 'Sẵn sàng hỗ trợ · AI thực' : 'Ready to help · real AI')
      } catch (error) {
        console.error('Global chatbot vision error:', error)
        pushMessage({
          role: 'assistant',
          text: isVi
            ? 'Xin lỗi, tôi đang gặp sự cố khi phân tích hình ảnh. Vui lòng thử lại sau ít phút.'
            : 'Sorry, I ran into an issue analyzing the image. Please try again in a moment.',
        })
        setMode('error')
        setStatus(isVi ? 'Lỗi kết nối AI' : 'AI connection error')
      } finally {
        setBusy(false)
      }
      return
    }

    const deterministicAnswer = getDeterministicFallbackReply(question, activePanelLabel)
    if (deterministicAnswer) {
      pushMessage({ role: 'assistant', text: deterministicAnswer })
      setMode('quick-guide')
      setStatus(isVi ? 'Hướng dẫn website · phản hồi nhanh' : 'Website guide · quick reply')
      setBusy(false)
      return
    }

    try {
      setStatus(isVi ? 'Đang suy nghĩ...' : 'Thinking...')
      setMode('thinking')

      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(messages[0]?.id === 'hello' ? 1 : 0)
        .map(m => ({ role: m.role, content: m.text }))
      history.push({ role: 'user', content: question })

      const answer = await callGroqChat(history, systemPrompt)
      pushMessage({ role: 'assistant', text: answer || getDeterministicFallbackReply(question, activePanelLabel) || (isVi ? 'Xin lỗi, tôi chưa có câu trả lời phù hợp.' : "Sorry, I don't have a good answer for that yet.") })
      setMode('groq')
      setStatus(isVi ? 'Sẵn sàng hỗ trợ · AI thực' : 'Ready to help · real AI')
    } catch (error) {
      console.error('Global chatbot Groq error:', error)
      pushMessage({
        role: 'assistant',
        text: isVi
          ? 'Xin lỗi, tôi đang gặp sự cố kết nối AI. Vui lòng thử lại sau ít phút.'
          : 'Sorry, I ran into a connection issue. Please try again in a moment.',
      })
      setMode('error')
      setStatus(isVi ? 'Lỗi kết nối AI' : 'AI connection error')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="global-ai-chatbot-fab" style={styles.fab} aria-label="Mở chatbot AI chung">
        <span style={styles.fabIcon}>🤗</span>
        <span>
          <strong>AI Chat</strong>
          <small>Hỏi về website</small>
        </span>
      </button>
    )
  }

  return (
    <section className="global-ai-chatbot-panel" style={styles.panel} aria-label="Chatbot AI chung">
      <header style={styles.header}>
        <div>
          <div style={styles.title}>🤗 Chatbot AI chung</div>
          <div style={styles.subtitle}>{status}</div>
        </div>
        <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Đóng chatbot">×</button>
      </header>

      <div style={styles.metaRow}>
        <span style={styles.badge}>{getModeLabel(mode, isVi)}</span>
        <span style={styles.current}>{isVi ? 'Trợ lý website · Groq AI + giọng nói' : 'Website assistant · Groq AI + voice'}</span>
        <span style={styles.current}>{isVi ? 'Mục hiện tại: ' : 'Current section: '}{activePanelLabel || 'Website'}</span>
      </div>

      <div ref={scrollRef} style={styles.messages}>
        {messages.map(message => (
          <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={message.role === 'user' ? styles.userMsg : styles.botMsg}>
              {message.imageDataUrl && (
                <img
                  src={message.imageDataUrl}
                  alt="attached"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: 180, borderRadius: 10, marginBottom: message.text ? 8 : 0, objectFit: 'cover' }}
                />
              )}
              {message.text}
            </div>
            {message.role === 'assistant' && (
              <button
                type="button"
                onClick={() => speak(message.text)}
                title={isVi ? (speaking ? 'Dừng đọc' : 'Đọc to') : (speaking ? 'Stop' : 'Read aloud')}
                style={styles.speakBtn}
              >
                {speaking ? '⏸' : '🔊'}
              </button>
            )}
          </div>
        ))}
        {busy && mode === 'thinking' && (
          <div style={styles.botMsg}>
            <span style={styles.typingDots}>
              <span /><span /><span />
            </span>
          </div>
        )}
      </div>

      <div style={styles.quickRow}>
        {quickPrompts.map(prompt => (
          <button key={prompt} type="button" disabled={busy} onClick={() => submitQuestion(prompt)} style={styles.quickBtn}>
            {prompt}
          </button>
        ))}
      </div>

      <form
        style={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          submitQuestion()
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        {attachedImage && (
          <div style={{ position: 'relative', flexShrink: 0, alignSelf: 'center' }}>
            <img
              src={attachedImage.dataUrl}
              alt="preview"
              title={attachedImage.name}
              style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: styles.input.border, display: 'block' }}
            />
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              title={isVi ? 'Bỏ ảnh' : 'Remove image'}
              style={{
                position: 'absolute', top: -6, right: -6, border: 'none',
                background: '#ef4444', color: '#fff', borderRadius: '50%',
                width: 18, height: 18, cursor: 'pointer', fontSize: 11, lineHeight: '18px',
                padding: 0, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }}
            >×</button>
          </div>
        )}
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder={isVi ? 'Hỏi chatbot chung hoặc nói bằng giọng nói...' : 'Ask the chatbot or use your voice...'}
          rows={2}
          style={styles.input}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submitQuestion()
            }
          }}
        />
        <button
          type="button"
          onClick={toggleMic}
          disabled={busy && !recording}
          title={recording ? (isVi ? 'Dừng ghi âm' : 'Stop recording') : (isVi ? 'Nói để hỏi' : 'Speak to ask')}
          style={{
            ...styles.micBtn,
            ...(recording ? styles.micBtnActive : {}),
            opacity: transcribing ? 0.7 : 1,
            cursor: transcribing ? 'wait' : 'pointer',
          }}
        >
          {transcribing ? '⏳' : recording ? '⏹️' : '🎙️'}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          title={isVi ? 'Tải hình ảnh để AI phân tích sâu' : 'Upload an image for deep AI analysis'}
          style={{
            ...styles.micBtn,
            ...(attachedImage ? styles.imageBtnActive : {}),
            opacity: busy ? 0.6 : 1,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          🖼️
        </button>
        <button type="submit" disabled={busy || (!input.trim() && !attachedImage)} style={{ ...styles.sendBtn, opacity: busy || (!input.trim() && !attachedImage) ? 0.55 : 1 }}>
          {busy ? '...' : (isVi ? 'Gửi' : 'Send')}
        </button>
      </form>
      <div style={styles.disclaimer}>{isVi
        ? 'Thông tin chỉ mang tính hỗ trợ, không thay thế tư vấn, chẩn đoán hoặc điều trị của bác sĩ.'
        : 'Information is for support purposes only and does not replace a doctor\'s advice, diagnosis, or treatment.'}</div>
      <style>{`
        @keyframes globalChatbotDotBounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes globalChatbotMicPulse { 0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.25)} 50%{box-shadow:0 0 0 7px rgba(239,68,68,0.1)} }
      `}</style>
    </section>
  )
}

function createStyles(isDark) {
  const shell = isDark ? 'rgba(7, 12, 27, 0.96)' : 'rgba(255, 255, 255, 0.96)'
  const border = isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(15, 76, 129, 0.16)'
  const text = isDark ? '#e8f0f8' : '#102033'
  const muted = isDark ? 'rgba(226, 232, 240, 0.64)' : '#64748b'
  return {
    fab: {
      position: 'fixed',
      right: 18,
      bottom: 104,
      zIndex: 230,
      border: `1px solid ${border}`,
      borderRadius: 999,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      color: '#fff',
      background: 'linear-gradient(135deg, #0f4c81, #14b8a6)',
      boxShadow: '0 18px 48px rgba(15, 76, 129, 0.32)',
      cursor: 'pointer',
      fontFamily: 'inherit',
    },
    fabIcon: { fontSize: 24, width: 32, height: 32, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.16)', borderRadius: '50%' },
    panel: {
      position: 'fixed',
      right: 18,
      bottom: 104,
      zIndex: 240,
      width: 'min(410px, calc(100vw - 28px))',
      height: 'min(680px, calc(100dvh - 126px))',
      maxHeight: 'calc(100dvh - 126px)',
      display: 'flex',
      flexDirection: 'column',
      border: `1px solid ${border}`,
      borderRadius: 24,
      overflow: 'hidden',
      minHeight: 0,
      background: shell,
      color: text,
      boxShadow: '0 28px 90px rgba(0,0,0,0.34)',
      backdropFilter: 'blur(18px)',
    },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 18px', color: '#fff', background: 'linear-gradient(135deg, #0f4c81, #14b8a6)' },
    title: { fontSize: 16, fontWeight: 900 },
    subtitle: { marginTop: 4, fontSize: 11, opacity: 0.82, lineHeight: 1.35 },
    closeBtn: { border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', borderRadius: 10, width: 30, height: 30, cursor: 'pointer', fontSize: 22, lineHeight: '28px' },
    metaRow: { flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${border}`, color: muted, fontSize: 11, flexWrap: 'wrap' },
    badge: { color: '#0f766e', background: isDark ? 'rgba(45, 212, 191, 0.16)' : '#ccfbf1', borderRadius: 999, padding: '4px 8px', fontWeight: 900 },
    current: { minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    messages: { flex: '1 1 auto', minHeight: 0, padding: 14, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 10 },
    botMsg: { alignSelf: 'flex-start', maxWidth: '88%', padding: '11px 13px', borderRadius: '16px 16px 16px 5px', background: isDark ? 'rgba(30, 41, 59, 0.82)' : '#f1f5f9', color: text, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
    userMsg: { alignSelf: 'flex-end', maxWidth: '84%', padding: '11px 13px', borderRadius: '16px 16px 5px 16px', background: 'linear-gradient(135deg, #0f4c81, #2563eb)', color: '#fff', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
    speakBtn: {
      border: `1px solid ${border}`, borderRadius: 8, padding: '3px 7px', fontSize: 12, cursor: 'pointer',
      background: isDark ? 'rgba(15,23,42,0.6)' : '#fff', color: muted, lineHeight: 1,
    },
    typingDots: { display: 'inline-flex', gap: 4 },
    quickRow: { flex: '0 0 auto', display: 'flex', gap: 6, padding: '0 14px 12px', overflowX: 'auto', scrollbarWidth: 'thin' },
    quickBtn: { flexShrink: 0, border: `1px solid ${border}`, borderRadius: 999, padding: '7px 10px', background: isDark ? 'rgba(15,23,42,0.74)' : '#fff', color: text, fontSize: 11, fontWeight: 800, cursor: 'pointer' },
    form: { flex: '0 0 auto', display: 'flex', alignItems: 'stretch', gap: 8, padding: 14, borderTop: `1px solid ${border}` },
    input: { flex: 1, resize: 'none', border: `1px solid ${border}`, borderRadius: 14, padding: '10px 12px', outline: 'none', font: 'inherit', fontSize: 13, color: text, background: isDark ? 'rgba(15, 23, 42, 0.82)' : '#fff' },
    micBtn: {
      border: `1px solid ${border}`, borderRadius: 14, padding: '0 14px', fontSize: 16,
      background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)', color: isDark ? '#a5b4fc' : '#6366f1',
      cursor: 'pointer', transition: 'all 0.18s', lineHeight: 1,
    },
    micBtnActive: {
      background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: '1px solid rgba(239,68,68,0.6)',
      animation: 'globalChatbotMicPulse 1.2s ease-in-out infinite',
    },
    imageBtnActive: {
      background: 'linear-gradient(135deg,#14b8a6,#0f766e)', color: '#fff', border: '1px solid rgba(20,184,166,0.6)',
    },
    sendBtn: { border: 'none', borderRadius: 14, padding: '0 16px', color: '#fff', background: 'linear-gradient(135deg, #14b8a6, #0f4c81)', fontWeight: 900, cursor: 'pointer' },
    disclaimer: { flex: '0 0 auto', padding: '0 14px 14px', color: muted, fontSize: 10.5, lineHeight: 1.4 },
  }
}

function getModeLabel(mode, isVi) {
  if (mode === 'groq') return isVi ? 'AI thực · Groq' : 'Real AI · Groq'
  if (mode === 'quick-guide') return isVi ? 'Hướng dẫn web' : 'Website guide'
  if (mode === 'thinking') return isVi ? 'Đang xử lý...' : 'Processing...'
  if (mode === 'error') return isVi ? 'Lỗi kết nối' : 'Connection error'
  return isVi ? 'Trợ lý website' : 'Website assistant'
}
