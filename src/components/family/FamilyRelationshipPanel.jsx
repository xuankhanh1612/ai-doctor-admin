import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import NavButtons from '../NavButtons.jsx'
import { DEFAULT_FAMILY_MEMBERS, RELATION_META, isNonDiseaseCondition, loadFamilyMembers } from './familyData.js'

const RELATION_INFLUENCE = {
  grandparent: 0.42,
  father: 0.82,
  mother: 0.82,
  uncle_aunt: 0.38,
  self: 1,
  spouse: 0.12,
  sibling: 0.62,
  cousin: 0.28,
  child: 0.5,
  grandchild: 0.25,
}

const getRelationMeta = (relation) => RELATION_META[relation] || RELATION_META.cousin
const getRelationInfluence = (relation) => RELATION_INFLUENCE[relation] ?? 0.2

const LIFECYCLE = [
  { id: 'graph', icon: '🧠', title: 'Graph Building', copy: 'Trích xuất entity bệnh, quan hệ huyết thống, thời gian khởi phát và biến cố để dựng GraphRAG + collective memory.' },
  { id: 'setup', icon: '🧬', title: 'Environment Setup', copy: 'Sinh persona agent theo ontology gia đình: genetics, oncology, hepatology, preventive care, report agent.' },
  { id: 'execute', icon: '⚡', title: 'Simulation Execution', copy: 'Chạy tương tác song song giữa agent theo lát cắt thế hệ, cập nhật temporal memory và độ lan truyền nguy cơ.' },
  { id: 'report', icon: '📊', title: 'Report Generation', copy: 'ReportAgent tổng hợp log thành dự báo ưu tiên tầm soát, xét nghiệm gen và kịch bản phòng ngừa.' },
  { id: 'deep', icon: '💬', title: 'Deep Interaction', copy: 'Cho phép hỏi sâu từng agent hoặc ReportAgent để khám phá giả thuyết và điểm bất định.' },
]

const PERSONAS = [
  { id: 'geneticist', name: 'GeneticsAgent', color: '#9c6fff', role: 'Phả hệ gen & variant inheritance' },
  { id: 'oncology', name: 'OncologyAgent', color: '#ff5252', role: 'Ung thư gia đình & tầm soát' },
  { id: 'hepatic', name: 'HepatoAgent', color: '#ffb74d', role: 'Viêm gan, xơ gan, HCC clustering' },
  { id: 'preventive', name: 'PreventionAgent', color: '#00e676', role: 'Lịch xét nghiệm cho thế hệ sau' },
  { id: 'report', name: 'ReportAgent', color: '#00e5ff', role: 'Tổng hợp log và dự báo hành động' },
]

const CONDITION_RULES = [
  { key: 'cancer', regex: /ung thư|cancer|nsclc|hcc|tumou?r|carcinoma/i, label: 'Cancer cluster', color: '#ff5252', base: 31 },
  { key: 'hepatic', regex: /gan|hcc|xơ gan|cirrhosis|hepatitis|viêm gan/i, label: 'Hepatic lineage', color: '#ffb74d', base: 24 },
  { key: 'metabolic', regex: /tiểu đường|diabetes|huyết áp|hypertension|tim mạch|heart|stroke|đột quỵ/i, label: 'Cardio-metabolic', color: '#ffd54f', base: 18 },
]

function loadMembers(patientId, storageOwnerId = 'guest') {
  return loadFamilyMembers(patientId, storageOwnerId) || DEFAULT_FAMILY_MEMBERS
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeConditions(member) {
  return (member.conditions || [])
    .filter(Boolean)
    .filter(condition => !isNonDiseaseCondition(condition))
}

function calculateSimulation(members) {
  const self = members.find(member => member.relation === 'self') || members[0]
  const affected = members.filter(member => normalizeConditions(member).length > 0)
  const conditionHits = CONDITION_RULES.map(rule => {
    const carriers = members.filter(member => normalizeConditions(member).some(condition => rule.regex.test(condition)))
    const weighted = carriers.reduce((sum, member) => sum + (getRelationInfluence(member.relation)), 0)
    const generations = new Set(carriers.map(member => getRelationMeta(member.relation).row || 3)).size
    const score = carriers.length
      ? clamp(Math.round(rule.base + weighted * 22 + generations * 8 + Math.max(0, carriers.length - 1) * 6), 0, 99)
      : 0
    return { ...rule, carriers, weighted, generations, score }
  }).sort((a, b) => b.score - a.score)

  const nodes = members.map(member => ({
    id: member.id,
    label: member.name,
    relation: member.relation,
    row: getRelationMeta(member.relation).row || 3,
    color: getRelationMeta(member.relation).color || '#8aa0b8',
    conditions: normalizeConditions(member),
  }))

  const edges = []
  const target = self?.id
  members.forEach(member => {
    if (!target || member.id === target) return
    const meta = getRelationMeta(member.relation)
    const shared = normalizeConditions(member).filter(condition => normalizeConditions(self || {}).some(selfCondition => (
      condition.toLowerCase().includes(selfCondition.toLowerCase()) || selfCondition.toLowerCase().includes(condition.toLowerCase())
    )))
    edges.push({
      from: member.id,
      to: target,
      label: meta.label.vi,
      strength: clamp(Math.round(getRelationInfluence(member.relation) * 100 + shared.length * 12), 8, 96),
      color: meta.color,
    })
  })

  const riskScore = clamp(Math.round(
    conditionHits.reduce((sum, hit) => sum + hit.score, 0) / Math.max(1, conditionHits.length) +
    affected.length * 2 +
    (conditionHits[0]?.generations || 0) * 3
  ), 5, 98)

  const logs = [
    `GraphRAG memory indexed ${members.length} family nodes, ${edges.length} kinship edges, ${affected.length} affected histories.`,
    `Temporal context: ${conditionHits[0]?.label || 'No dominant cluster'} appears across ${conditionHits[0]?.generations || 0} generation layer(s).`,
    `Agent swarm consensus assigns ${riskScore}% simulated familial-history signal; confidence rises with genetic testing evidence.`,
    `ReportAgent recommends targeted screening for first-degree relatives and watchlist updates after every new diagnosis input.`,
  ]

  return { self, affected, nodes, edges, conditionHits, riskScore, logs }
}

export default function FamilyRelationshipPanel({ patientId = 'LXK-2024', storageOwnerId = 'guest', onNext, onPrev, prevLabel, embedded = false, title = null }) {
  const { theme, lang, t } = useApp()
  const isDark = theme === 'dark'
  const [activeStage, setActiveStage] = useState('graph')
  const [chatAgent, setChatAgent] = useState('ReportAgent')
  const [prompt, setPrompt] = useState(lang === 'vi' ? 'Vì sao con cái cần tầm soát sớm?' : 'Why should children screen early?')
  const [messages, setMessages] = useState([
    { role: 'agent', agent: 'ReportAgent', text: 'Simulation ready. Ask about inheritance paths, hidden risk clusters, or screening priority.' },
  ])

  const members = useMemo(() => loadMembers(patientId, storageOwnerId), [patientId, storageOwnerId])
  const simulation = useMemo(() => calculateSimulation(members), [members])
  const palette = {
    bg: isDark ? 'var(--bg2,#050816)' : '#f4f7fb',
    surface: isDark ? 'rgba(255,255,255,0.035)' : '#fff',
    surface2: isDark ? 'rgba(0,229,255,0.055)' : 'rgba(0,184,204,0.06)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#e8f0f8' : '#172033',
    text2: isDark ? 'rgba(232,240,248,0.68)' : '#586174',
    text3: isDark ? 'rgba(232,240,248,0.45)' : '#8a93a6',
  }

  const dominant = simulation.conditionHits[0]
  const activeStageData = LIFECYCLE.find(stage => stage.id === activeStage) || LIFECYCLE[0]

  const sendMessage = () => {
    const clean = prompt.trim()
    if (!clean) return
    const top = dominant?.label || 'family history'
    const answer = `${chatAgent}: dựa trên temporal knowledge graph, ${top} có tín hiệu ${dominant?.score || simulation.riskScore}%. Ưu tiên kiểm tra người thân bậc một, đối chiếu tuổi khởi phát, sau đó cập nhật memory khi có xét nghiệm gen hoặc chẩn đoán mới.`
    setMessages(prev => [...prev, { role: 'user', agent: 'You', text: clean }, { role: 'agent', agent: chatAgent, text: answer }])
    setPrompt('')
  }

  return (
    <div style={{ padding: embedded ? 0 : '24px clamp(16px,3vw,32px)', background: embedded ? 'transparent' : palette.bg, minHeight: '100%', color: palette.text }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '.18em', color: '#00e5ff', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'monospace' }}>
          Zep-style temporal GraphRAG · MiroFish-inspired AI Agents
        </div>
        <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(24px,3vw,36px)', lineHeight: 1.1 }}>
          🧬 {title || t('familyRelationshipTitle')}
        </h1>
        <p style={{ margin: 0, maxWidth: 980, color: palette.text2, lineHeight: 1.7, fontSize: 14 }}>
          {lang === 'vi'
            ? 'Trang mô phỏng các mối quan hệ tiền sử bệnh án gia đình đã nhập ở Family Medical Tree, dựng graph ký ức theo thời gian rồi cho hội đồng agent suy đoán kịch bản di truyền, môi trường và tầm soát.'
            : 'This page simulates medical-history relationships entered in Family Medical Tree, builds temporal graph memory, and lets agent personas infer hereditary, environmental, and screening scenarios.'}
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, .75fr) 1.25fr', gap: 16, marginBottom: 16 }}>
        <MetricCard c={palette} icon="🧠" label="Family Graph Signal" value={`${simulation.riskScore}%`} accent="#00e5ff" note={`${simulation.nodes.length} nodes · ${simulation.edges.length} edges`} />
        <div style={{ background: `linear-gradient(135deg, ${palette.surface}, ${palette.surface2})`, border: `1px solid ${palette.border}`, borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: palette.text, marginBottom: 4 }}>The Five-Stage Simulation Lifecycle</div>
              <div style={{ fontSize: 11, color: palette.text3 }}>Graph Building → Environment Setup → Simulation Execution → Report Generation → Deep Interaction</div>
            </div>
            <button type="button" onClick={() => setActiveStage(LIFECYCLE[(LIFECYCLE.findIndex(s => s.id === activeStage) + 1) % LIFECYCLE.length].id)} style={{ border: '1px solid rgba(0,229,255,.35)', background: 'rgba(0,229,255,.08)', color: '#00e5ff', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontWeight: 800 }}>
              Run next stage →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(110px,1fr))', gap: 8 }}>
            {LIFECYCLE.map((stage, index) => (
              <button key={stage.id} type="button" onClick={() => setActiveStage(stage.id)} style={{ textAlign: 'left', border: `1px solid ${activeStage === stage.id ? '#00e5ff' : palette.border}`, background: activeStage === stage.id ? 'rgba(0,229,255,.11)' : 'rgba(255,255,255,.025)', borderRadius: 12, padding: 10, color: palette.text, cursor: 'pointer' }}>
                <div style={{ fontSize: 18 }}>{stage.icon}</div>
                <div style={{ fontSize: 9, color: palette.text3, fontFamily: 'monospace' }}>STAGE 0{index + 1}</div>
                <div style={{ fontSize: 11, fontWeight: 800 }}>{stage.title}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(0,0,0,.16)', border: `1px solid ${palette.border}`, color: palette.text2, fontSize: 12, lineHeight: 1.6 }}>
            <b style={{ color: '#00e5ff' }}>{activeStageData.icon} {activeStageData.title}:</b> {activeStageData.copy}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16, marginBottom: 16 }}>
        <GraphPanel c={palette} simulation={simulation} />
        <ReportPanel c={palette} simulation={simulation} dominant={dominant} lang={lang} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '.95fr 1.05fr', gap: 16, marginBottom: 20 }}>
        <AgentPanel c={palette} personas={PERSONAS} />
        <DeepInteraction c={palette} personas={PERSONAS} chatAgent={chatAgent} setChatAgent={setChatAgent} prompt={prompt} setPrompt={setPrompt} messages={messages} onSend={sendMessage} />
      </section>

      {!embedded && <NavButtons onNext={onNext} nextLabel={`${t('next')} →`} onPrev={onPrev} prevLabel={prevLabel} />}
    </div>
  )
}

function MetricCard({ c, icon, label, value, note, accent }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 18, padding: 18, minHeight: 156, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ fontSize: 32 }}>{icon}</div>
        <div style={{ height: 8, width: 52, borderRadius: 999, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      </div>
      <div>
        <div style={{ fontSize: 34, fontWeight: 900, color: accent, fontFamily: 'monospace' }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: c.text }}>{label}</div>
        <div style={{ fontSize: 11, color: c.text3, marginTop: 4 }}>{note}</div>
      </div>
    </div>
  )
}

function GraphPanel({ c, simulation }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 18, padding: 16 }}>
      <PanelTitle eyebrow="GraphRAG Memory" title="Family Medical Relationship Map" c={c} />
      <div style={{ position: 'relative', minHeight: 360, borderRadius: 14, border: `1px solid ${c.border}`, background: 'radial-gradient(circle at 50% 42%, rgba(0,229,255,.16), transparent 28%), rgba(0,0,0,.14)', overflow: 'hidden' }}>
        {simulation.edges.map((edge, index) => (
          <div key={edge.from} style={{ position: 'absolute', left: `${14 + (index % 4) * 18}%`, top: `${18 + (index % 5) * 12}%`, width: `${34 + edge.strength / 3}%`, height: 1, background: `linear-gradient(90deg, ${edge.color}, transparent)`, opacity: .55, transform: `rotate(${index % 2 ? -12 : 10}deg)`, transformOrigin: 'left center' }} />
        ))}
        {simulation.nodes.map((node, index) => {
          const left = 10 + ((index * 17) % 78)
          const top = 12 + (node.row - 1) * 17 + ((index % 2) * 4)
          return (
            <div key={node.id} title={node.conditions.join(', ')} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', width: node.relation === 'self' ? 112 : 94, padding: '8px 9px', borderRadius: 12, background: 'rgba(5,8,18,.86)', border: `1px solid ${node.color}`, boxShadow: `0 0 24px ${node.color}25` }}>
              <div style={{ fontSize: 10, color: node.color, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.label}</div>
              <div style={{ fontSize: 8, color: c.text3, textTransform: 'uppercase', marginTop: 2 }}>{node.relation}</div>
              {node.conditions.length > 0 && <div style={{ marginTop: 5, fontSize: 8, color: '#ff8a65' }}>{node.conditions.length} risk item(s)</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReportPanel({ c, simulation, dominant, lang }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 18, padding: 16 }}>
      <PanelTitle eyebrow="ReportAgent Output" title="Predictive Relationship Report" c={c} />
      <div style={{ display: 'grid', gap: 10 }}>
        {simulation.conditionHits.map(hit => (
          <div key={hit.key} style={{ border: `1px solid ${hit.color}35`, background: `${hit.color}10`, borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
              <b style={{ color: hit.color, fontSize: 12 }}>{hit.label}</b>
              <span style={{ color: hit.color, fontFamily: 'monospace', fontWeight: 900 }}>{hit.score}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: 7 }}>
              <div style={{ height: '100%', width: `${hit.score}%`, background: hit.color }} />
            </div>
            <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>
              {hit.carriers.length ? hit.carriers.map(member => member.name).join(' · ') : (lang === 'vi' ? 'Chưa có carrier rõ ràng' : 'No clear carrier yet')}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid rgba(0,229,255,.2)', background: 'rgba(0,229,255,.06)', fontSize: 12, color: c.text2, lineHeight: 1.6 }}>
        <b style={{ color: '#00e5ff' }}>Prediction:</b> {dominant?.label || 'Family history'} là cụm ưu tiên. Khuyến nghị mô phỏng lại khi Family Medical Tree được cập nhật và xác nhận bằng xét nghiệm lâm sàng.
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: c.text3, lineHeight: 1.55 }}>
        Đây là mô phỏng hỗ trợ quyết định, không thay thế tư vấn di truyền hoặc chẩn đoán của bác sĩ.
      </div>
    </div>
  )
}

function AgentPanel({ c, personas }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 18, padding: 16 }}>
      <PanelTitle eyebrow="Environment Setup" title="Generated Agent Personas" c={c} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
        {personas.map(agent => (
          <div key={agent.id} style={{ border: `1px solid ${agent.color}35`, background: `${agent.color}10`, borderRadius: 12, padding: 12 }}>
            <div style={{ color: agent.color, fontWeight: 900, fontSize: 12 }}>{agent.name}</div>
            <div style={{ color: c.text2, fontSize: 11, marginTop: 4, lineHeight: 1.45 }}>{agent.role}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeepInteraction({ c, personas, chatAgent, setChatAgent, prompt, setPrompt, messages, onSend }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 18, padding: 16 }}>
      <PanelTitle eyebrow="Deep Interaction" title="Chat with Simulation Agents" c={c} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {personas.map(agent => (
          <button key={agent.id} type="button" onClick={() => setChatAgent(agent.name)} style={{ border: `1px solid ${chatAgent === agent.name ? agent.color : c.border}`, background: chatAgent === agent.name ? `${agent.color}18` : 'transparent', color: chatAgent === agent.name ? agent.color : c.text2, borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
            {agent.name}
          </button>
        ))}
      </div>
      <div style={{ height: 170, overflowY: 'auto', border: `1px solid ${c.border}`, borderRadius: 12, padding: 10, background: 'rgba(0,0,0,.14)', marginBottom: 10 }}>
        {messages.map((message, index) => (
          <div key={index} style={{ marginBottom: 9, textAlign: message.role === 'user' ? 'right' : 'left' }}>
            <div style={{ display: 'inline-block', maxWidth: '86%', borderRadius: 12, padding: '8px 10px', background: message.role === 'user' ? 'rgba(0,229,255,.16)' : 'rgba(255,255,255,.055)', color: c.text2, fontSize: 11, lineHeight: 1.5 }}>
              <b style={{ color: message.role === 'user' ? '#00e5ff' : '#9c6fff' }}>{message.agent}</b><br />{message.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') onSend() }} placeholder="Ask the ReportAgent..." style={{ flex: 1, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,.04)', color: c.text, outline: 'none' }} />
        <button type="button" onClick={onSend} style={{ border: 'none', borderRadius: 10, padding: '0 14px', background: '#00b8cc', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>Send</button>
      </div>
    </div>
  )
}

function PanelTitle({ eyebrow, title, c }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: c.text3, textTransform: 'uppercase', letterSpacing: '.14em', fontFamily: 'monospace', marginBottom: 4 }}>{eyebrow}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: c.text }}>{title}</div>
    </div>
  )
}
