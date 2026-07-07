import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { useGlobalAIChatbotEngine, quickPrompts, MAX_FILES, getModeLabel } from '../lib/useGlobalAIChatbotEngine.js'

// Single named export used by the journey panels; do not add a second no-op export below.
export function CompactGlobalAIChatBar({ activePanelLabel }) {
  const { theme, lang } = useApp()
  const { user } = useAuth()
  const isDark = theme === 'dark'
  const isVi = lang !== 'en'
  const userKey = user?.uuid || null
  const docInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const audioElementRef = useRef(null)

  const {
    input, setInput,
    busy,
    attachedFiles,
    handleFilesSelect,
    submitQuestion,
    recording, transcribing, toggleMic,
    speaking, stop,
  } = useGlobalAIChatbotEngine({ userKey, activePanelLabel, isVi, audioElementRef })

  const submitFromBar = () => {
    if (!input.trim() && attachedFiles.length === 0) return
    submitQuestion()
  }

  const shell = isDark ? '#070d20' : '#eef6ff'
  const control = isDark ? '#171d3a' : '#ffffff'
  const border = isDark ? '#323a66' : '#b9c9e8'
  const text = isDark ? '#e6ecff' : '#102033'
  const muted = isDark ? '#9aa3b7' : '#64748b'

  return (
    <form
      aria-label={isVi ? 'Bộ chat AI chung' : 'Shared AI chat bar'}
      onSubmit={(event) => {
        event.preventDefault()
        submitFromBar()
      }}
      style={{
        width: 'min(100%, 760px)',
        display: 'grid',
        gridTemplateColumns: '80px minmax(0, 1fr) 92px 92px 112px',
        gap: 14,
        alignItems: 'stretch',
        padding: 14,
        borderRadius: 26,
        background: shell,
        boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.34)' : '0 18px 54px rgba(15,76,129,0.14)',
        border: `1px solid ${isDark ? 'rgba(148,163,184,0.10)' : 'rgba(15,76,129,0.10)'}`,
      }}
    >
      <audio ref={audioElementRef} preload="none" style={{ display: 'none' }} />
      <input ref={docInputRef} type="file" accept="image/*,application/pdf,text/plain,text/csv,.csv,.txt,.md" multiple onChange={handleFilesSelect} style={{ display: 'none' }} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelect} style={{ display: 'none' }} />
      <button type="button" onClick={() => docInputRef.current?.click()} disabled={busy} title={isVi ? 'Đính kèm file' : 'Attach files'} style={{ border: `2px solid ${border}`, borderRadius: 26, background: control, color: isDark ? '#dbe5ff' : '#1e3a8a', fontSize: 34, fontWeight: 900, cursor: busy ? 'not-allowed' : 'pointer' }}>+</button>
      <textarea
        value={input}
        onChange={event => setInput(event.target.value)}
        placeholder={isVi ? 'Hỏi chatbot chung\nhoặc nói bằng giọng nói' : 'Ask the shared chatbot\nor use your voice'}
        rows={2}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submitFromBar()
          }
        }}
        style={{ resize: 'none', minHeight: 92, border: `2px solid ${border}`, borderRadius: 24, padding: '22px 24px', outline: 'none', font: 'inherit', fontSize: 24, lineHeight: 1.45, color: text, background: control }}
      />
      <button type="button" onClick={toggleMic} disabled={busy && !recording} title={recording ? (isVi ? 'Dừng ghi âm' : 'Stop recording') : (isVi ? 'Nói để hỏi' : 'Speak to ask')} style={{ border: `2px solid ${recording ? '#ef4444' : border}`, borderRadius: 26, background: recording ? 'linear-gradient(135deg,#ef4444,#dc2626)' : control, color: recording ? '#fff' : text, fontSize: 30, cursor: transcribing ? 'wait' : 'pointer' }}>{transcribing ? '⏳' : recording ? '⏹️' : '🎙️'}</button>
      <button type="button" onClick={() => imageInputRef.current?.click()} disabled={busy} title={isVi ? 'Tải hình ảnh cho AI phân tích' : 'Upload image for AI analysis'} style={{ border: `2px solid ${attachedFiles.length ? '#14b8a6' : border}`, borderRadius: 26, background: control, color: text, fontSize: 30, cursor: busy ? 'not-allowed' : 'pointer' }}>🖼️</button>
      <button type="submit" disabled={busy || (!input.trim() && attachedFiles.length === 0)} style={{ border: 'none', borderRadius: 26, color: '#d8e7ea', background: 'linear-gradient(135deg,#187c86,#0f6674)', fontWeight: 900, fontSize: 24, cursor: busy ? 'wait' : 'pointer', opacity: busy || (!input.trim() && attachedFiles.length === 0) ? 0.65 : 1 }}>{busy ? '...' : speaking ? (isVi ? 'Đọc' : 'Play') : (isVi ? 'Gửi' : 'Send')}</button>
      {speaking && <button type="button" onClick={stop} style={{ gridColumn: '1 / -1', justifySelf: 'start', border: 'none', borderRadius: 999, padding: '6px 10px', background: 'rgba(239,68,68,0.14)', color: '#ef4444', fontWeight: 900, cursor: 'pointer' }}>{isVi ? 'Dừng giọng đọc' : 'Stop voice'}</button>}
      {attachedFiles.length > 0 && <div style={{ gridColumn: '1 / -1', color: muted, fontSize: 12, fontWeight: 800 }}>{isVi ? `Đã đính kèm ${attachedFiles.length} file` : `${attachedFiles.length} file(s) attached`}</div>}
    </form>
  )
}

export default function GlobalAIChatbot({ activePanelLabel, externalOpenSignal, autoStartMic }) {
  const { theme, lang } = useApp()
  const { user } = useAuth()
  // Storage key for chat history — `uuid` is the same identifier field for every
  // user type (guest or signed-in), so each guest's history stays separate too.
  const userKey = user?.uuid || null
  const isDark = theme === 'dark'
  const isVi = lang !== 'en'

  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const fileInputRef = useRef(null)
  const docInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const scrollRef = useRef(null)
  const audioElementRef = useRef(null)

  // Toàn bộ state + logic gửi tin/đính kèm file/giọng nói/lưu lịch sử dùng CHUNG 1 hook
  // với trang "Lịch sử Chat với AI" (src/components/ChatHistoryPanel.jsx) — cùng đọc/ghi
  // vào src/lib/globalChatbotStorage.js, nên 2 nơi luôn đồng bộ song song với nhau.
  // Hook tự động đọc to (TTS) câu trả lời mới nhất ngay sau khi AI trả lời xong.
  const {
    messages,
    input, setInput,
    status,
    mode,
    busy,
    historyLoaded,
    attachedFiles,
    handleFilesSelect, removeAttachedFile,
    submitQuestion,
    speaking, speak,
    recording, transcribing, toggleMic,
  } = useGlobalAIChatbotEngine({ userKey, activePanelLabel, isVi, audioElementRef })

  const styles = useMemo(() => createStyles(isDark, fullscreen), [isDark, fullscreen])

  useEffect(() => {
    window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 30)
  }, [messages, busy])

  // Cho phép nơi khác (vd nút mic ở DonationHeroPanel) MỞ chatbot này từ xa và
  // tự bật ghi âm luôn — externalOpenSignal là 1 số tăng dần, mỗi lần đổi giá
  // trị (kể cả bấm liên tiếp khi panel đã mở sẵn) là 1 lần yêu cầu mới.
  useEffect(() => {
    if (!externalOpenSignal) return
    setOpen(true)
    if (autoStartMic && !recording) toggleMic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalOpenSignal])

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
      <audio ref={audioElementRef} preload="none" style={{ display: 'none' }} />
      <header style={styles.header}>
        <button
          type="button"
          onClick={() => setFullscreen(v => !v)}
          style={styles.resizeBtn}
          title={fullscreen ? (isVi ? 'Thu nhỏ' : 'Exit fullscreen') : (isVi ? 'Phóng to toàn màn hình' : 'Expand to fullscreen')}
          aria-label={fullscreen ? 'Thu nhỏ chatbot' : 'Phóng to chatbot'}
        >
          {fullscreen ? '⤡' : '⤢'}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.title}>🤗 Chatbot AI chung</div>
          <div style={styles.subtitle}>{status}</div>
        </div>
        <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Đóng chatbot">×</button>
      </header>

      <div style={styles.metaRow}>
        <span style={styles.badge}>{getModeLabel(mode, isVi)}</span>
        <span style={styles.current}>{isVi ? 'Trợ lý website · Groq AI + giọng nói · tự động đọc trả lời' : 'Website assistant · Groq AI + voice · auto voice reply'}</span>
        <span style={styles.current}>{isVi ? 'Mục hiện tại: ' : 'Current section: '}{activePanelLabel || 'Website'}</span>
      </div>

      <div ref={scrollRef} style={styles.messages}>
        {messages.map(message => (
          <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={message.role === 'user' ? styles.userMsg : styles.botMsg}>
              {message.imageDataUrls && message.imageDataUrls.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: message.text ? 8 : 0 }}>
                  {message.imageDataUrls.map((img, i) => (
                    img.kind === 'pdf' ? (
                      <div key={i} style={{ width: 64, height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        📄
                        <span style={{ fontSize: 8, marginTop: 2, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</span>
                      </div>
                    ) : (
                      <img key={i} src={img.dataUrl} alt={img.name || 'attached'} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', display: 'block' }} />
                    )
                  ))}
                </div>
              )}
              {message.fileNames && message.fileNames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: message.text ? 8 : 0 }}>
                  {message.fileNames.map((name, i) => (
                    <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.14)' }}>📃 {name}</span>
                  ))}
                </div>
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

      {attachedFiles.length > 0 && (
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, padding: '10px 14px 0', overflowX: 'auto', scrollbarWidth: 'thin' }}>
          {attachedFiles.map(f => (
            <div key={f.id} style={{ position: 'relative', flexShrink: 0 }}>
              {f.kind === 'image' ? (
                <img src={f.dataUrl} alt={f.name} title={f.name} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', display: 'block' }} />
              ) : f.kind === 'pdf' ? (
                <div title={f.name} style={{ width: 56, height: 56, borderRadius: 12, background: styles.quickBtn.background, border: `1px solid ${styles.disclaimer.color}22`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  📄
                  <span style={{ fontSize: 8, marginTop: 2, maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: styles.disclaimer.color }}>{f.name}</span>
                </div>
              ) : (
                <div title={f.name} style={{ width: 56, height: 56, borderRadius: 12, background: styles.quickBtn.background, border: `1px solid ${styles.disclaimer.color}22`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  📃
                  <span style={{ fontSize: 8, marginTop: 2, maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: styles.disclaimer.color }}>{f.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachedFile(f.id)}
                title={isVi ? 'Bỏ file' : 'Remove file'}
                style={{
                  position: 'absolute', top: -6, right: -6, border: 'none',
                  background: '#fff', color: '#1a2035', borderRadius: '50%',
                  width: 18, height: 18, cursor: 'pointer', fontSize: 11, lineHeight: '18px',
                  padding: 0, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.4)', fontWeight: 800,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

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
        {/* Hidden file inputs: general documents (pdf/text/csv/image) and camera capture */}
        <input
          ref={docInputRef}
          type="file"
          accept="image/*,application/pdf,text/plain,text/csv,.csv,.txt,.md"
          multiple
          onChange={handleFilesSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFilesSelect}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => docInputRef.current?.click()}
          disabled={busy || attachedFiles.length >= MAX_FILES}
          title={isVi ? `Tải file (PDF, văn bản, CSV, hình ảnh) — tối đa ${MAX_FILES} file` : `Upload files (PDF, text, CSV, images) — up to ${MAX_FILES}`}
          style={{
            ...styles.micBtn,
            opacity: (busy || attachedFiles.length >= MAX_FILES) ? 0.5 : 1,
            cursor: (busy || attachedFiles.length >= MAX_FILES) ? 'not-allowed' : 'pointer',
            fontWeight: 900, fontSize: 18,
          }}
        >
          +
        </button>
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
          disabled={busy || attachedFiles.length >= MAX_FILES}
          title={isVi ? `Tải hình ảnh để AI phân tích sâu (tối đa ${MAX_FILES})` : `Upload images for deep AI analysis (up to ${MAX_FILES})`}
          style={{
            ...styles.micBtn,
            ...(attachedFiles.length > 0 ? styles.imageBtnActive : {}),
            opacity: (busy || attachedFiles.length >= MAX_FILES) ? 0.5 : 1,
            cursor: (busy || attachedFiles.length >= MAX_FILES) ? 'not-allowed' : 'pointer',
          }}
        >
          🖼️
        </button>
        <button type="submit" disabled={busy || (!input.trim() && attachedFiles.length === 0)} style={{ ...styles.sendBtn, opacity: busy || (!input.trim() && attachedFiles.length === 0) ? 0.55 : 1 }}>
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

function createStyles(isDark, fullscreen) {
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
    panel: fullscreen ? {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 240,
      width: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      border: 'none',
      borderRadius: 0,
      overflow: 'hidden',
      minHeight: 0,
      background: shell,
      color: text,
      boxShadow: 'none',
      backdropFilter: 'blur(18px)',
      transition: 'all 0.22s ease',
    } : {
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
      transition: 'all 0.22s ease',
    },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 18px', color: '#fff', background: 'linear-gradient(135deg, #0f4c81, #14b8a6)' },
    title: { fontSize: 16, fontWeight: 900 },
    subtitle: { marginTop: 4, fontSize: 11, opacity: 0.82, lineHeight: 1.35 },
    closeBtn: { border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', borderRadius: 10, width: 30, height: 30, cursor: 'pointer', fontSize: 22, lineHeight: '28px' },
    resizeBtn: { border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', borderRadius: 10, width: 30, height: 30, cursor: 'pointer', fontSize: 14, lineHeight: '30px', flexShrink: 0 },
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
