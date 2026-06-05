import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  EMOTIONAL_QUICK_PROMPTS,
  GP_CHAT_STORAGE_KEY,
  buildGeneralPractitionerReply,
  createChatMessage,
  createInitialAgentMessage,
  loadStoredChatMessages,
} from '../lib/generalPractitionerChat.js'

const BLUE = '#0058bc'
const PRIMARY = '#0070eb'
const SURFACE = '#f9f9fb'
const INK = '#1D1D1F'
const MUTED = '#86868B'
const HEALTHY = '#68D391'
const ATTENTION = '#FF8A7A'
const GENERAL_DOCTOR_PLAYLIST_EMBED_URL = 'https://www.youtube.com/embed/videoseries?list=PLhPgpmsoyA4GrZ5mGrOPyf1wb1Ke1Zw8p'

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

export default function EmotionalCompanionView({ onOpenStressRelief }) {
  const { lang } = useApp()
  const [chatPrompt, setChatPrompt] = useState('')
  const [chatMessages, setChatMessages] = useState(() => loadStoredChatMessages(lang))

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(GP_CHAT_STORAGE_KEY, JSON.stringify(chatMessages))
    } catch {
      // Keep the companion usable even when storage is unavailable.
    }
  }, [chatMessages])

  const submitChatPrompt = () => {
    const prompt = chatPrompt.trim()
    if (!prompt) return

    setChatMessages(prev => [
      ...prev,
      createChatMessage('user', prompt),
      createChatMessage('agent', buildGeneralPractitionerReply(prompt, lang)),
    ])
    setChatPrompt('')
  }

  const resetChat = () => {
    setChatMessages([createInitialAgentMessage(lang)])
    setChatPrompt('')
  }

  return (
    <div style={panelShell}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', ...glass }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img alt="Patient Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtKXZ8Z8xPdcddYd3_3LBUEgNXwg0eUvQSbHPBE7s4E0uhgb1LmS8wv5Igo9RqOekFLODV8AnqqJ87x2V5HuMj4zhCQDQhBlHpwDeVC7qg754k6-pXFeqwK9QDHldUAg7tHwQvn2isqzLDdinvGpzXK9ceLKuMGv8Qw1zBWtZb50Y2DehAH-CvqixV5e8bGLSTG3FNFmQ8DSlRQQBa6dpkXRs-tUXnA6dpiVBpbS9Wgl61ud3uxjSzBXi6HI0SnVuiskg5fquAGSs5" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#e1dfe3' }} />
          <b style={{ fontSize: 22, color: INK }}>Digital Twin</b>
        </div>
        <MaterialIcon style={{ color: BLUE }}>🔔</MaterialIcon>
      </div>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 150px' }}>
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: BLUE, display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 12px 30px rgba(0,88,188,0.24)', fontSize: 28 }}>🤖</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: INK }}>{lang === 'en' ? 'Hello, I am the General Practitioner AI' : 'Xin chào, tôi là AI Bác sĩ đa khoa'}</h1>
              <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 16 }}>{lang === 'en' ? 'A GP AI that can listen, discuss symptoms, and support emotional check-ins.' : 'Bác sĩ đa khoa AI luôn sẵn sàng lắng nghe, tâm sự và hỗ trợ kiểm tra triệu chứng.'}</p>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 28 }}>
          <CompanionTile icon="📝" color={ATTENTION} title={lang === 'en' ? 'Stress journal' : 'Góc xả stress'} subtitle={lang === 'en' ? 'Open the immersive stress relief room' : 'Mở không gian xả stress chuyên sâu'} onClick={onOpenStressRelief} />
          <CompanionTile icon="💚" color={HEALTHY} title={lang === 'en' ? 'Affirmations' : 'Khẳng định'} subtitle={lang === 'en' ? 'Positive energy for today' : 'Năng lượng tích cực mỗi ngày'} />
          <div style={{ gridColumn: '1 / -1', padding: 24, borderRadius: 28, ...glass, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 999, background: 'rgba(0,88,188,0.10)', color: BLUE, fontSize: 12, fontWeight: 800, marginBottom: 14 }}>{lang === 'en' ? 'Suggested activity' : 'Hoạt động đề xuất'}</span>
              <h3 style={{ margin: 0, fontSize: 26, color: INK }}>{lang === 'en' ? 'Mental wellness playlist with the GP AI' : 'Playlist chăm sóc tinh thần cùng AI Bác sĩ đa khoa'}</h3>
              <p style={{ margin: '10px 0 16px', maxWidth: 620, color: MUTED, lineHeight: 1.55 }}>{lang === 'en' ? 'Play relaxation, emotional-care, and recovery videos directly inside this page.' : 'Phát các video hướng dẫn thư giãn, chăm sóc sức khoẻ tinh thần và phục hồi năng lượng ngay trong trang này.'}</p>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,88,188,0.14)', boxShadow: '0 18px 46px rgba(0,88,188,0.16)', background: '#000' }}>
                <iframe
                  title={lang === 'en' ? 'GP AI emotional companion playlist' : 'Playlist AI Bác sĩ đa khoa đồng hành cảm xúc'}
                  src={GENERAL_DOCTOR_PLAYLIST_EMBED_URL}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
            <div style={{ position: 'absolute', right: -40, bottom: -40, width: 170, height: 170, borderRadius: '50%', background: 'rgba(0,88,188,0.06)', animation: 'hj-breathe 8s ease-in-out infinite' }} />
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ color: MUTED, fontSize: 12, fontWeight: 800 }}>{lang === 'en' ? `${chatMessages.length} saved messages · same GP AI as Symptom Check-in` : `${chatMessages.length} tin nhắn đã lưu · cùng AI Bác sĩ đa khoa như Kiểm tra triệu chứng`}</div>
            <button type="button" onClick={resetChat} style={{ border: '1px solid rgba(0,88,188,0.14)', background: 'rgba(0,88,188,0.06)', color: BLUE, borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>{lang === 'en' ? 'Reset chat' : 'Tạo lại cuộc trò chuyện'}</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
            {chatMessages.map(message => {
              const isUser = message.role === 'user'
              return (
                <div key={message.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 12, marginLeft: isUser ? 70 : 0, marginRight: isUser ? 0 : 70 }}>
                  {!isUser && <div style={{ width: 34, height: 34, borderRadius: '50%', background: BLUE, color: '#fff', flexShrink: 0, display: 'grid', placeItems: 'center' }}>🤖</div>}
                  <div style={{ background: isUser ? PRIMARY : 'rgba(255,255,255,0.76)', color: isUser ? '#fff' : INK, padding: '16px 20px', borderRadius: isUser ? '24px 24px 4px 24px' : '4px 24px 24px 24px', border: isUser ? 'none' : '1px solid rgba(255,255,255,0.45)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', lineHeight: 1.65 }}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.06em', color: isUser ? 'rgba(255,255,255,0.78)' : BLUE, marginBottom: 6 }}>{isUser ? (lang === 'en' ? 'YOU' : 'BẠN') : 'AI BÁC SĨ ĐA KHOA'}</div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.text}</p>
                    <span style={{ display: 'block', textAlign: isUser ? 'right' : 'left', opacity: 0.55, fontSize: 12, marginTop: 8 }}>{formatMessageTime(message.createdAt, lang)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(EMOTIONAL_QUICK_PROMPTS[lang] || EMOTIONAL_QUICK_PROMPTS.vi).map(prompt => (
              <button key={prompt} type="button" onClick={() => setChatPrompt(prompt)} style={{ border: '1px solid rgba(0,88,188,0.14)', background: 'rgba(0,88,188,0.06)', color: BLUE, borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{prompt}</button>
            ))}
          </div>
        </section>
      </main>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 84, zIndex: 16, maxWidth: 820, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ ...glass, display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 999 }}>
          <button type="button" onClick={() => setChatPrompt('')} style={roundButton('#f3f3f5', MUTED)}>＋</button>
          <input
            value={chatPrompt}
            onChange={e => setChatPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submitChatPrompt()
            }}
            placeholder={lang === 'en' ? 'Talk with the General Practitioner AI...' : 'Tâm sự với AI Bác sĩ đa khoa...'}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: INK, padding: '0 10px' }}
          />
          <button type="button" onClick={submitChatPrompt} disabled={!chatPrompt.trim()} style={{ ...roundButton(BLUE, '#fff'), opacity: chatPrompt.trim() ? 1 : 0.45, cursor: chatPrompt.trim() ? 'pointer' : 'not-allowed' }}>↑</button>
        </div>
      </div>
    </div>
  )
}

function roundButton(bg, color) {
  return { width: 42, height: 42, borderRadius: '50%', border: 'none', background: bg, color, display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 20, flexShrink: 0 }
}
