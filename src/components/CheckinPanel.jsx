import React, { useEffect, useState } from 'react'
import { PATIENT } from '../data/mockData.js'
import { useApp } from '../context/AppContext'
import NavButtons from './NavButtons.jsx'
import {
  GP_CHAT_STORAGE_KEY,
  QUICK_PROMPTS,
  buildGeneralPractitionerReply,
  createChatMessage,
  createInitialAgentMessage,
  loadStoredChatMessages,
} from '../lib/generalPractitionerChat.js'

const Tag = ({ children, color = 'cyan' }) => {
  const colors = {
    cyan:   { bg: 'rgba(0,229,255,0.1)',   color: 'var(--cyan)',   border: 'rgba(0,229,255,0.2)'   },
    violet: { bg: 'rgba(156,111,255,0.1)', color: 'var(--violet)', border: 'rgba(156,111,255,0.2)' },
    green:  { bg: 'rgba(0,230,118,0.1)',   color: 'var(--green)',  border: 'rgba(0,230,118,0.2)'   },
    amber:  { bg: 'rgba(255,183,77,0.1)',  color: 'var(--amber)',  border: 'rgba(255,183,77,0.2)'  },
    red:    { bg: 'rgba(255,82,82,0.1)',   color: 'var(--red)',    border: 'rgba(255,82,82,0.2)'   },
  }
  const c = colors[color]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 11px',
      borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>{children}</span>
  )
}

const Row = ({ k, v, vColor }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: '1px solid var(--border)',
  }}>
    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{k}</span>
    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, color: vColor || 'var(--cyan)' }}>{v}</span>
  </div>
)

const GP_PLAYLIST_EMBED_URL = 'https://www.youtube.com/embed/videoseries?list=PLhPgpmsoyA4GrZ5mGrOPyf1wb1Ke1Zw8p'

const Card = ({ title, children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

export default function CheckinPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const { t, lang } = useApp()
  const [symptomPrompt, setSymptomPrompt] = useState('')
  const [chatMessages, setChatMessages] = useState(() => loadStoredChatMessages(lang))
  const [selectedMessageIds, setSelectedMessageIds] = useState([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(GP_CHAT_STORAGE_KEY, JSON.stringify(chatMessages))
    } catch {
      // Ignore storage failures so the clinical check-in UI remains usable.
    }
  }, [chatMessages])

  const submitSymptomPrompt = () => {
    const prompt = symptomPrompt.trim()
    if (!prompt) return

    setChatMessages(prev => [
      ...prev,
      createChatMessage('user', prompt),
      createChatMessage('agent', buildGeneralPractitionerReply(prompt, lang)),
    ])
    setSymptomPrompt('')
  }

  const toggleMessageSelection = (id) => {
    setSelectedMessageIds(prev => (
      prev.includes(id)
        ? prev.filter(messageId => messageId !== id)
        : [...prev, id]
    ))
  }

  const deleteMessage = (id) => {
    setChatMessages(prev => prev.filter(message => message.id !== id))
    setSelectedMessageIds(prev => prev.filter(messageId => messageId !== id))
  }

  const deleteSelectedMessages = () => {
    if (selectedMessageIds.length === 0) return

    setChatMessages(prev => prev.filter(message => !selectedMessageIds.includes(message.id)))
    setSelectedMessageIds([])
  }

  const resetChatHistory = () => {
    setChatMessages([createInitialAgentMessage(lang)])
    setSelectedMessageIds([])
  }

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{t('checkinTitle')}</h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>Seed data extraction for digital twin construction</p>
        </div>
        <Tag color="violet">{t('seedCollection')}</Tag>
      </div>

      <Card title={lang === 'en' ? 'Virtual General Practitioner AI Agent' : 'AI Bác sĩ đa khoa ảo'}>
        <div className="gp-agent-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>
                  {lang === 'en' ? 'General symptom prompt' : 'Nhập prompt khai báo triệu chứng'}
                </div>
                <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
                  {lang === 'en'
                    ? 'Chat with a virtual General Practitioner to describe any symptom: fever, pain, cough, digestion, sleep, mood, medications, allergies, or medical history.'
                    : 'Chat với AI Bác sĩ đa khoa để mô tả mọi triệu chứng: sốt, đau, ho, tiêu hóa, giấc ngủ, tâm trạng, thuốc, dị ứng hoặc tiền sử bệnh.'}
                </p>
              </div>
              <Tag color="green">GENERAL PRACTITIONER AI</Tag>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ color: 'var(--text3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                {lang === 'en'
                  ? `${chatMessages.length} saved messages · local history`
                  : `${chatMessages.length} tin nhắn đã lưu · local history`}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={deleteSelectedMessages}
                  disabled={selectedMessageIds.length === 0}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: selectedMessageIds.length ? 'rgba(255,82,82,0.12)' : 'rgba(255,255,255,0.03)',
                    color: selectedMessageIds.length ? 'var(--red)' : 'var(--text3)',
                    cursor: selectedMessageIds.length ? 'pointer' : 'not-allowed',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {lang === 'en' ? `Delete selected (${selectedMessageIds.length})` : `Xóa đã chọn (${selectedMessageIds.length})`}
                </button>
                <button
                  type="button"
                  onClick={resetChatHistory}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--text2)',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {lang === 'en' ? 'Reset history' : 'Tạo lại lịch sử'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
              {chatMessages.map((message, index) => {
                const isUser = message.role === 'user'
                const selected = selectedMessageIds.includes(message.id)
                return (
                  <div
                    key={message.id || `${message.role}-${index}`}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      width: 'min(100%, 88%)',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                    }}
                  >
                    <button
                      type="button"
                      aria-label={selected ? 'Uncheck chat message' : 'Check chat message'}
                      title={selected ? (lang === 'en' ? 'Uncheck' : 'Bỏ chọn') : (lang === 'en' ? 'Check to delete' : 'Chọn để xóa')}
                      onClick={() => toggleMessageSelection(message.id)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        border: `1px solid ${selected ? 'var(--green)' : 'var(--border2)'}`,
                        background: selected ? 'rgba(0,230,118,0.16)' : 'rgba(255,255,255,0.04)',
                        color: selected ? 'var(--green)' : 'var(--text3)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 900,
                        lineHeight: 1,
                      }}
                    >
                      {selected ? '✓' : ''}
                    </button>

                    <div
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: isUser ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                        background: selected
                          ? 'rgba(0,230,118,0.08)'
                          : isUser ? 'rgba(0,229,255,0.12)' : 'rgba(156,111,255,0.12)',
                        border: `1px solid ${selected ? 'rgba(0,230,118,0.28)' : isUser ? 'rgba(0,229,255,0.24)' : 'rgba(156,111,255,0.24)'}`,
                        color: 'var(--text)',
                        fontSize: 12,
                        lineHeight: 1.65,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: isUser ? 'var(--cyan)' : 'var(--violet)' }}>
                          {isUser ? (lang === 'en' ? 'YOU' : 'BẠN') : 'AI GENERAL PRACTITIONER'}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMessage(message.id)}
                          title={lang === 'en' ? 'Delete this message' : 'Xóa tin nhắn này'}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text3)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 800,
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                      {message.text}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={symptomPrompt}
                onChange={e => setSymptomPrompt(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitSymptomPrompt()
                }}
                placeholder={lang === 'en'
                  ? 'Example: I have fever, cough, headache, stomach pain, insomnia, or anxiety. It started 3 days ago...'
                  : 'Ví dụ: Tôi bị sốt, ho, đau đầu, đau bụng, mất ngủ hoặc lo lắng. Triệu chứng bắt đầu 3 ngày trước...'}
                rows={4}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  minHeight: 104,
                  borderRadius: 12,
                  border: '1px solid var(--border2)',
                  background: 'rgba(0,0,0,0.22)',
                  color: 'var(--text)',
                  padding: 12,
                  outline: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ color: 'var(--text3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                  {lang === 'en' ? 'Press Ctrl/⌘ + Enter to send' : 'Nhấn Ctrl/⌘ + Enter để gửi'}
                </div>
                <button
                  type="button"
                  onClick={submitSymptomPrompt}
                  disabled={!symptomPrompt.trim()}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: symptomPrompt.trim()
                      ? 'linear-gradient(135deg, var(--cyan2), var(--violet2))'
                      : 'rgba(255,255,255,0.06)',
                    color: symptomPrompt.trim() ? '#fff' : 'var(--text3)',
                    cursor: symptomPrompt.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {lang === 'en' ? 'Send to GP AI Doctor →' : 'Gửi cho AI Bác sĩ đa khoa →'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,183,77,0.08)', border: '1px solid rgba(255,183,77,0.18)' }}>
              <div style={{ color: 'var(--amber)', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
                {lang === 'en' ? 'Safety note' : 'Lưu ý an toàn'}
              </div>
              <p style={{ color: 'var(--text2)', fontSize: 11, lineHeight: 1.65 }}>
                {lang === 'en'
                  ? 'This check-in supports symptom collection and is not a diagnosis. Seek urgent care for chest pain, severe shortness of breath, stroke signs, severe allergic reaction, uncontrolled bleeding, confusion, or self-harm risk.'
                  : 'Phần check-in này hỗ trợ thu thập triệu chứng, không phải chẩn đoán. Hãy đi cấp cứu nếu đau ngực, khó thở nặng, dấu hiệu đột quỵ, dị ứng nặng, chảy máu không cầm, lú lẫn hoặc nguy cơ tự hại.'}
              </p>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--cyan)', fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
                {lang === 'en' ? 'Quick prompts' : 'Prompt gợi ý'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(QUICK_PROMPTS[lang] || QUICK_PROMPTS.vi).map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setSymptomPrompt(prompt)}
                    style={{
                      textAlign: 'left',
                      padding: 9,
                      borderRadius: 9,
                      border: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--text2)',
                      cursor: 'pointer',
                      fontSize: 11,
                      lineHeight: 1.45,
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title={lang === 'en' ? 'Suggested activity' : 'Hoạt động đề xuất'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>
              {lang === 'en' ? 'Play the GP AI emotional-care playlist inside Symptom Check-in' : 'Phát playlist chăm sóc tinh thần cùng AI Bác sĩ đa khoa ngay trong Kiểm tra triệu chứng'}
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 6, lineHeight: 1.65 }}>
              {lang === 'en'
                ? 'Use these relaxation and recovery videos while you describe symptoms, mood, sleep, stress, medicines, allergies, or medical history to the same GP AI chat.'
                : 'Bạn có thể vừa xem video thư giãn/phục hồi, vừa mô tả triệu chứng, tâm trạng, giấc ngủ, stress, thuốc, dị ứng hoặc tiền sử bệnh cho cùng AI Bác sĩ đa khoa.'}
            </p>
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
            <iframe
              title={lang === 'en' ? 'GP AI suggested activity playlist' : 'Playlist hoạt động đề xuất AI Bác sĩ đa khoa'}
              src={GP_PLAYLIST_EMBED_URL}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title={t('personalHistory')}>
          <Row k={t('name')}     v={PATIENT.name} />
          <Row k="Age"           v={PATIENT.age} />
          <Row k="Location"      v={PATIENT.location} />
          <Row k="Smoker"        v={PATIENT.smoker} vColor="var(--amber)" />
          <Row k="Exercise"      v={PATIENT.exercise} vColor="var(--green)" />
          <Row k="BMI"           v={PATIENT.bmi} />
        </Card>
        <Card title={t('familyHistory')}>
          <Row k={t('relation_father')}  v={PATIENT.familyHistory.father}  vColor="var(--red)" />
          <Row k={t('relation_mother')}  v={PATIENT.familyHistory.mother}  vColor="var(--amber)" />
          <Row k={t('relation_sibling')} v={PATIENT.familyHistory.sibling} vColor="var(--green)" />
          <Row k="BRCA"    v={PATIENT.genomics.brca}         vColor="var(--green)" />
          <Row k="EGFR"    v={PATIENT.genomics.egfr}         vColor="var(--red)" />
          <Row k="T790M"   v={PATIENT.genomics.t790m}        vColor="var(--amber)" />
        </Card>
      </div>

      <Card title={t('currentSymptoms')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {PATIENT.symptoms.map(s => (
            <Tag key={s} color={s.includes('cough') ? 'red' : 'amber'}>{s}</Tag>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          Duration: {PATIENT.symptomDuration} · Severity: {PATIENT.symptomSeverity}
        </div>
      </Card>

      <Card title={t('envSignals')}>
        {[
          { icon: '📍', text: `HCMC Air Quality Index: ${PATIENT.aqi} · Unhealthy for Sensitive Groups`, color: 'var(--amber)' },
          { icon: '📰', text: 'New EGFR inhibitor trial results — Nature Medicine, May 2026', color: 'var(--cyan)' },
          { icon: '💊', text: PATIENT.currentDrug, color: 'var(--green)' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
            }}>{item.icon}</div>
            <span style={{ fontSize: 12, color: item.color }}>{item.text}</span>
          </div>
        ))}
      </Card>

      <NavButtons onNext={onNext} nextLabel={nextLabel || t('familyTree')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
