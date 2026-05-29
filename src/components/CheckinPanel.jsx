import React, { useEffect, useState } from 'react'
import { PATIENT } from '../data/mockData.js'
import { useApp } from '../context/AppContext'
import NavButtons from './NavButtons.jsx'

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

const Card = ({ title, children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

const QUICK_PROMPTS = {
  vi: [
    'Tôi mất ngủ nhiều ngày, hay lo lắng và tim đập nhanh.',
    'Tôi buồn bã, mất động lực, không muốn giao tiếp.',
    'Tôi hoảng sợ bất chợt, khó thở và sợ có chuyện xấu xảy ra.',
  ],
  en: [
    'I have insomnia, anxiety, and a racing heart.',
    'I feel sad, unmotivated, and socially withdrawn.',
    'I have sudden panic, shortness of breath, and fear something bad will happen.',
  ],
}

const PSYCH_CHAT_STORAGE_KEY = 'cdoc_psych_chat_history'

const createChatMessage = (role, text) => ({
  id: `psych_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  createdAt: new Date().toISOString(),
})

const createInitialAgentMessage = (lang) => createChatMessage(
  'agent',
  lang === 'en'
    ? 'Hello, I am your virtual psychiatry check-in agent. Tell me what you are feeling, when it started, and how it affects your sleep, appetite, mood, thoughts, or relationships.'
    : 'Xin chào, tôi là AI Agent bác sĩ ảo chuyên khoa tâm thần. Bạn hãy mô tả triệu chứng đang gặp, bắt đầu từ khi nào, và ảnh hưởng tới giấc ngủ, ăn uống, cảm xúc, suy nghĩ hoặc các mối quan hệ ra sao.'
)

function loadStoredChatMessages(lang) {
  if (typeof window === 'undefined') return [createInitialAgentMessage(lang)]

  try {
    const raw = localStorage.getItem(PSYCH_CHAT_STORAGE_KEY)
    if (!raw) return [createInitialAgentMessage(lang)]

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return [createInitialAgentMessage(lang)]

    return parsed
      .filter(message => message?.role && message?.text)
      .map((message, index) => ({
        id: message.id || `psych_saved_${index}_${Date.now()}`,
        role: message.role,
        text: message.text,
        createdAt: message.createdAt || new Date().toISOString(),
      }))
  } catch {
    return [createInitialAgentMessage(lang)]
  }
}

function buildPsychiatryAgentReply(prompt, lang) {
  const text = prompt.toLowerCase()
  const crisisKeywords = ['tự tử', 'tự sát', 'muốn chết', 'hại bản thân', 'suicide', 'kill myself', 'self harm', 'self-harm']
  const anxietyKeywords = ['lo lắng', 'bồn chồn', 'hoảng', 'panic', 'anxiety', 'sợ', 'tim đập']
  const sleepKeywords = ['mất ngủ', 'khó ngủ', 'insomnia', 'sleep']
  const lowMoodKeywords = ['buồn', 'trầm', 'mất động lực', 'depress', 'sad', 'hopeless']

  const hasCrisis = crisisKeywords.some(k => text.includes(k))
  const topics = []
  if (anxietyKeywords.some(k => text.includes(k))) topics.push(lang === 'en' ? 'anxiety/panic symptoms' : 'triệu chứng lo âu/hoảng sợ')
  if (sleepKeywords.some(k => text.includes(k))) topics.push(lang === 'en' ? 'sleep disturbance' : 'rối loạn giấc ngủ')
  if (lowMoodKeywords.some(k => text.includes(k))) topics.push(lang === 'en' ? 'low mood/depressive symptoms' : 'khí sắc buồn/triệu chứng trầm cảm')

  if (lang === 'en') {
    if (hasCrisis) {
      return 'I am concerned about possible self-harm risk. Please contact local emergency services now or call/text 988 in the U.S. if you may hurt yourself. If possible, stay with someone you trust. After immediate safety is secured, a psychiatrist can help assess mood, anxiety, sleep, and treatment options.'
    }

    const focus = topics.length ? topics.join(', ') : 'your current emotional and physical symptoms'
    return `I hear you describing ${focus}. As a virtual psychiatry check-in agent, I recommend tracking: onset, duration, sleep/appetite changes, panic triggers, medication/substance use, and whether symptoms affect work or relationships. For now, try slow breathing for 3 minutes, reduce caffeine/alcohol, and write down the strongest trigger. If symptoms persist, worsen, or impair daily life, please book an evaluation with a licensed psychiatrist or mental health clinician.`
  }

  if (hasCrisis) {
    return 'Tôi lo ngại có dấu hiệu nguy cơ tự làm hại bản thân. Bạn hãy gọi cấp cứu tại địa phương ngay hoặc nhờ một người tin cậy ở cạnh bạn. Nếu bạn đang ở Hoa Kỳ, hãy gọi/nhắn 988. Sau khi đảm bảo an toàn tức thì, bác sĩ tâm thần có thể đánh giá khí sắc, lo âu, giấc ngủ và hướng điều trị phù hợp.'
  }

  const focus = topics.length ? topics.join(', ') : 'các triệu chứng cảm xúc và cơ thể hiện tại'
  return `Tôi ghi nhận bạn đang mô tả ${focus}. Với vai trò AI Agent check-in chuyên khoa tâm thần, tôi gợi ý bạn khai báo thêm: triệu chứng bắt đầu khi nào, kéo dài bao lâu, giấc ngủ/ăn uống thay đổi ra sao, yếu tố kích hoạt, thuốc/chất kích thích đang dùng, và mức ảnh hưởng tới công việc/gia đình. Trước mắt, hãy thử thở chậm 3 phút, giảm caffeine/rượu, và ghi lại tình huống làm triệu chứng nặng nhất. Nếu triệu chứng kéo dài, nặng lên hoặc ảnh hưởng sinh hoạt, bạn nên đặt lịch với bác sĩ tâm thần/chuyên viên sức khỏe tâm thần.`
}

export default function CheckinPanel({ onNext, onPrev, prevLabel }) {
  const { t, lang } = useApp()
  const [symptomPrompt, setSymptomPrompt] = useState('')
  const [chatMessages, setChatMessages] = useState(() => loadStoredChatMessages(lang))
  const [selectedMessageIds, setSelectedMessageIds] = useState([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(PSYCH_CHAT_STORAGE_KEY, JSON.stringify(chatMessages))
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
      createChatMessage('agent', buildPsychiatryAgentReply(prompt, lang)),
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

      <Card title={lang === 'en' ? 'Virtual Psychiatry AI Agent' : 'AI Agent bác sĩ tâm thần ảo'}>
        <div className="psych-agent-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>
                  {lang === 'en' ? 'Psychiatry symptom prompt' : 'Nhập prompt khai báo triệu chứng'}
                </div>
                <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
                  {lang === 'en'
                    ? 'Chat with a virtual psychiatry specialist to describe mood, sleep, anxiety, stress, behavior, or thought symptoms.'
                    : 'Chat với bác sĩ ảo chuyên khoa tâm thần để mô tả khí sắc, giấc ngủ, lo âu, stress, hành vi hoặc suy nghĩ bất thường.'}
                </p>
              </div>
              <Tag color="green">PSYCHIATRY AI</Tag>
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
                          {isUser ? (lang === 'en' ? 'YOU' : 'BẠN') : 'AI PSYCHIATRIST'}
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
                  ? 'Example: I feel anxious, cannot sleep, have panic attacks, and feel exhausted for 2 weeks...'
                  : 'Ví dụ: Tôi lo lắng, mất ngủ, hay hoảng sợ, mệt mỏi kéo dài 2 tuần...'}
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
                  {lang === 'en' ? 'Send to AI Doctor →' : 'Gửi cho bác sĩ AI →'}
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
                  ? 'This check-in supports symptom collection and is not a diagnosis. If you may harm yourself or someone else, contact emergency services immediately.'
                  : 'Phần check-in này hỗ trợ thu thập triệu chứng, không phải chẩn đoán. Nếu bạn có nguy cơ tự hại hoặc hại người khác, hãy liên hệ cấp cứu ngay.'}
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

      <NavButtons onNext={onNext} nextLabel={t('buildTwin')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
