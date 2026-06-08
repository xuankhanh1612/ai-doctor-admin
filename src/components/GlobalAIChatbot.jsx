import React, { useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import chatbotKnowledge from '../aichatbot/tichhop_chatbot_ai.md?raw'
import chatbotHtmlTemplate from '../aichatbot/tichhop_chatbot_ai.html?raw'
import {
  CHATBOT_MODEL,
  CHATBOT_RUNTIME,
  CHATBOT_RUNTIME_DETAIL,
  CHATBOT_TASK,
  buildFallbackReply,
  generateTransformersReply,
} from '../lib/huggingFaceTransformersChat.js'

const quickPrompts = [
  'Cách tải hồ sơ y tế?',
  'Làm sao in kết quả?',
  'AI Healthcare Vision dùng thế nào?',
]

export default function GlobalAIChatbot({ activePanelLabel }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('Sẵn sàng')
  const [mode, setMode] = useState('fallback-ready')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState(() => [{
    id: 'hello',
    role: 'assistant',
    text: `Xin chào! Tôi là trợ lý AI chung của Consensus Doctor. Tôi có thể chào hỏi, trả lời câu hỏi phổ thông về trải nghiệm sử dụng website và hướng dẫn tải hồ sơ, phân tích ảnh, InBody, gia phả bệnh lý hoặc Print Portal.`,
  }])
  const scrollRef = useRef(null)

  const styles = useMemo(() => createStyles(isDark), [isDark])

  const pushMessage = (message) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, ...message }])
    window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 30)
  }

  const submitQuestion = async (rawQuestion = input) => {
    const question = rawQuestion.trim()
    if (!question || busy) return
    setInput('')
    setBusy(true)
    pushMessage({ role: 'user', text: question })

    try {
      setStatus(`Đang tải/chạy ${CHATBOT_RUNTIME} · ${CHATBOT_MODEL} · ${CHATBOT_TASK}`)
      setMode('transformers-loading')
      const answer = await generateTransformersReply({
        question,
        activePanelLabel,
        knowledgeBase: chatbotKnowledge,
        htmlTemplate: chatbotHtmlTemplate,
        history: messages,
        onProgress: (progress) => {
          if (progress?.status) setStatus(`${progress.status} ${progress.file || ''}`.trim())
        },
      })
      pushMessage({ role: 'assistant', text: answer || buildFallbackReply(question, activePanelLabel) })
      setMode('transformers')
      setStatus(`${CHATBOT_RUNTIME} · ${CHATBOT_MODEL} · ${CHATBOT_TASK}`)
    } catch (error) {
      console.error('Global chatbot Transformers.js error:', error)
      pushMessage({ role: 'assistant', text: buildFallbackReply(question, activePanelLabel) })
      setMode('fallback')
      setStatus('Không tải được model/CDN, đang dùng phản hồi dự phòng an toàn')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={styles.fab} aria-label="Mở chatbot AI chung">
        <span style={styles.fabIcon}>🤗</span>
        <span>
          <strong>AI Chat</strong>
          <small>Hỏi về website</small>
        </span>
      </button>
    )
  }

  return (
    <section style={styles.panel} aria-label="Chatbot AI chung">
      <header style={styles.header}>
        <div>
          <div style={styles.title}>🤗 Chatbot AI chung</div>
          <div style={styles.subtitle}>{status}</div>
        </div>
        <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Đóng chatbot">×</button>
      </header>

      <div style={styles.metaRow}>
        <span style={styles.badge}>{getModeLabel(mode)}</span>
        <span style={styles.current}>{CHATBOT_RUNTIME_DETAIL} · {CHATBOT_MODEL} · {CHATBOT_TASK}</span>
        <span style={styles.current}>Mục hiện tại: {activePanelLabel || 'Website'}</span>
      </div>

      <div ref={scrollRef} style={styles.messages}>
        {messages.map(message => (
          <div key={message.id} style={message.role === 'user' ? styles.userMsg : styles.botMsg}>
            {message.text}
          </div>
        ))}
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
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Hỏi chatbot chung về cách dùng website..."
          rows={2}
          style={styles.input}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submitQuestion()
            }
          }}
        />
        <button type="submit" disabled={busy || !input.trim()} style={{ ...styles.sendBtn, opacity: busy || !input.trim() ? 0.55 : 1 }}>
          {busy ? '...' : 'Gửi'}
        </button>
      </form>
      <div style={styles.disclaimer}>Thông tin chỉ mang tính hỗ trợ, không thay thế tư vấn, chẩn đoán hoặc điều trị của bác sĩ.</div>
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
      maxHeight: 'min(680px, calc(100vh - 126px))',
      display: 'flex',
      flexDirection: 'column',
      border: `1px solid ${border}`,
      borderRadius: 24,
      overflow: 'hidden',
      background: shell,
      color: text,
      boxShadow: '0 28px 90px rgba(0,0,0,0.34)',
      backdropFilter: 'blur(18px)',
    },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 18px', color: '#fff', background: 'linear-gradient(135deg, #0f4c81, #14b8a6)' },
    title: { fontSize: 16, fontWeight: 900 },
    subtitle: { marginTop: 4, fontSize: 11, opacity: 0.82, lineHeight: 1.35 },
    closeBtn: { border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', borderRadius: 10, width: 30, height: 30, cursor: 'pointer', fontSize: 22, lineHeight: '28px' },
    metaRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${border}`, color: muted, fontSize: 11, flexWrap: 'wrap' },
    badge: { color: '#0f766e', background: isDark ? 'rgba(45, 212, 191, 0.16)' : '#ccfbf1', borderRadius: 999, padding: '4px 8px', fontWeight: 900 },
    current: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    messages: { padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 210 },
    botMsg: { alignSelf: 'flex-start', maxWidth: '88%', padding: '11px 13px', borderRadius: '16px 16px 16px 5px', background: isDark ? 'rgba(30, 41, 59, 0.82)' : '#f1f5f9', color: text, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
    userMsg: { alignSelf: 'flex-end', maxWidth: '84%', padding: '11px 13px', borderRadius: '16px 16px 5px 16px', background: 'linear-gradient(135deg, #0f4c81, #2563eb)', color: '#fff', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
    quickRow: { display: 'flex', gap: 6, padding: '0 14px 12px', overflowX: 'auto' },
    quickBtn: { flexShrink: 0, border: `1px solid ${border}`, borderRadius: 999, padding: '7px 10px', background: isDark ? 'rgba(15,23,42,0.74)' : '#fff', color: text, fontSize: 11, fontWeight: 800, cursor: 'pointer' },
    form: { display: 'flex', alignItems: 'stretch', gap: 8, padding: 14, borderTop: `1px solid ${border}` },
    input: { flex: 1, resize: 'none', border: `1px solid ${border}`, borderRadius: 14, padding: '10px 12px', outline: 'none', font: 'inherit', fontSize: 13, color: text, background: isDark ? 'rgba(15, 23, 42, 0.82)' : '#fff' },
    sendBtn: { border: 'none', borderRadius: 14, padding: '0 16px', color: '#fff', background: 'linear-gradient(135deg, #14b8a6, #0f4c81)', fontWeight: 900, cursor: 'pointer' },
    disclaimer: { padding: '0 14px 14px', color: muted, fontSize: 10.5, lineHeight: 1.4 },
  }
}

function getModeLabel(mode) {
  if (mode === 'transformers') return 'Transformers.js'
  if (mode === 'fallback') return 'Safe fallback'
  return 'Browser pipeline'
}
