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

const RELATION_WEIGHT = {
  self: 1,
  father: 0.9,
  mother: 0.9,
  sibling: 0.74,
  child: 0.72,
  grandparent: 0.58,
  grandchild: 0.5,
  uncle_aunt: 0.46,
  cousin: 0.34,
  spouse: 0.18,
}

const AGENT_TEMPLATES = [
  { id: 'geneticist', name: 'Genetic Counselor Agent', abbr: 'GC', focus: 'heritability + cascade screening', color: '#00e5ff' },
  { id: 'oncologist', name: 'Oncology Risk Agent', abbr: 'ONC', focus: 'cancer clustering + red flags', color: '#ff5252' },
  { id: 'hepatology', name: 'Hepatology Agent', abbr: 'HEP', focus: 'HBV / HCC familial exposure', color: '#ffb74d' },
  { id: 'cardiometabolic', name: 'Cardiometabolic Agent', abbr: 'CM', focus: 'hypertension / diabetes trajectory', color: '#00e676' },
  { id: 'report', name: 'ReportAgent', abbr: 'RPT', focus: 'predictive summary + questions', color: '#9c6fff' },
]

function loadMembers(patientId, storageOwnerId = 'guest') {
  return loadFamilyMembers(patientId, storageOwnerId) || DEFAULT_FAMILY_MEMBERS
}

function normalizeCondition(condition) {
  return condition
    .toLowerCase()
    .replace(/nsclc|lung cancer|ung thư phổi/g, 'lung-oncology')
    .replace(/hcc|ung thư gan|liver cancer|xơ gan|cirrhosis|viêm gan b|hbv/g, 'hepatic')
    .replace(/tăng huyết áp|hypertension|tim mạch|heart disease|đột quỵ|stroke/g, 'cardiovascular')
    .replace(/tiểu đường|diabetes/g, 'metabolic')
    .replace(/ung thư vú|breast cancer|ung thư đại tràng|colon cancer|ung thư dạ dày|stomach cancer|ung thư|cancer/g, 'oncology')
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
    name: member.name,
    relation: member.relation,
    row: getRelationMeta(member.relation).row || 3,
    color: getRelationMeta(member.relation).color || '#8aa0b8',
    conditions: normalizeConditions(member),
  }))

  const conditionMap = new Map()
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

  const riskClusters = Array.from(conditionMap.values())
    .map(cluster => ({
      ...cluster,
      score: Math.min(98, Math.round(cluster.weighted + (cluster.count > 1 ? cluster.count * 8 : 0))),
      confidence: Math.min(96, Math.round(58 + cluster.count * 9 + cluster.members.length * 2)),
      members: Array.from(new Set(cluster.members)),
      raw: Array.from(new Set(cluster.raw)),
    }))
    .sort((a, b) => b.score - a.score)

  const interactions = riskClusters.flatMap((cluster, index) => [
    {
      agent: AGENT_TEMPLATES[index % AGENT_TEMPLATES.length].abbr,
      text: `${cluster.label}: ${cluster.members.length} related node(s), score ${cluster.score}/100`,
      color: cluster.color,
    },
    {
      agent: 'RPT',
      text: `Temporal memory update: ${cluster.raw.slice(0, 2).join(' + ')} co-occurs across ${cluster.members.join(', ')}`,
      color: '#9c6fff',
    },
  ]).slice(0, 8)

  const topCluster = riskClusters[0]
  const report = topCluster
    ? `Predictive signal strongest for ${topCluster.label}. Prioritize structured family-history verification, targeted screening, and follow-up questions for ${topCluster.members.slice(0, 3).join(', ')}.`
    : 'No inherited disease signal was detected from the current family tree. Add family members or diagnoses to run a richer simulation.'

  return { entities, edges, riskClusters, interactions, report, activeMembers }
}

function StageCard({ stage, index, active, complete, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 160,
        flex: 1,
        padding: 14,
        borderRadius: 14,
        textAlign: 'left',
        cursor: 'pointer',
        background: active ? `${stage.accent}18` : 'var(--surface, rgba(255,255,255,0.03))',
        border: `1px solid ${active ? stage.accent : complete ? `${stage.accent}70` : 'var(--border, rgba(255,255,255,0.08))'}`,
        color: 'var(--text, #e8f0f8)',
        fontFamily: 'inherit',
        transition: 'all .18s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{stage.icon}</span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: stage.accent }}>0{index + 1}</span>
      </div>
      <div style={{ marginTop: 10, fontWeight: 800, fontSize: 13 }}>{stage.title}</div>
      <div style={{ marginTop: 7, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: complete ? '100%' : active ? '68%' : '18%', height: '100%', background: stage.accent, borderRadius: 99 }} />
      </div>
    </button>
  )
}

function SectionTitle({ children, kicker }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {kicker && <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{kicker}</div>}
      <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>{children}</h3>
    </div>
  )
}

function RiskBar({ cluster }) {
  return (
    <div style={{ padding: 14, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, color: cluster.color }}>{cluster.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{cluster.members.join(' · ')}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: cluster.color, fontFamily: 'var(--font-mono)' }}>{cluster.score}</div>
      </div>
      <div style={{ marginTop: 12, height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${cluster.score}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${cluster.color}, #ffffff66)` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: 'var(--text3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
        <span>{cluster.count} evidence node(s)</span>
        <span>{cluster.confidence}% confidence</span>
      </div>
    </div>
  )
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

  const members = useMemo(() => loadFamilyMembers(patientId) || DEFAULT_FAMILY_MEMBERS, [patientId])
  const simulation = useMemo(() => buildSimulation(members), [members])
  const activeAgent = AGENT_TEMPLATES.find(agent => agent.id === selectedAgent) || AGENT_TEMPLATES.at(-1)
  const topCluster = simulation.riskClusters[0]

  const c = isDark ? {
    bg: '#04060f', panel: 'rgba(255,255,255,0.035)', panel2: 'rgba(255,255,255,0.055)', border: 'rgba(255,255,255,0.08)', text: '#e8f0f8', text2: 'rgba(232,240,248,0.62)', text3: 'rgba(232,240,248,0.34)',
  } : {
    bg: '#f4f7fb', panel: 'rgba(255,255,255,0.92)', panel2: 'rgba(0,0,0,0.035)', border: 'rgba(0,0,0,0.09)', text: '#1a2035', text2: '#556', text3: '#9aa',
  }

  const stageCopy = [
    lang === 'vi'
      ? 'Trích xuất thành viên, bệnh lý, độ gần huyết thống và trạng thái thời gian để dựng Knowledge Graph / GraphRAG mô phỏng theo bộ nhớ ngữ cảnh kiểu Zep.'
      : 'Extract family members, conditions, kinship distance, and temporal state into a Knowledge Graph / GraphRAG memory inspired by Zep-style context graphs.',
    lang === 'vi'
      ? 'Sinh persona agent chuyên khoa và cấu hình môi trường giả lập: nhánh nội/ngoại, bệnh ung thư, gan mật, tim mạch và chuyển hoá.'
      : 'Generate specialist agent personas and environment configuration for paternal/maternal branches, oncology, hepatic, cardiovascular, and metabolic signals.',
    lang === 'vi'
      ? 'Chạy tương tác đa agent song song trên đồ thị gia đình, cập nhật trí nhớ theo thời gian khi các node bệnh lý cùng xuất hiện.'
      : 'Run parallel multi-agent interaction on the family graph, updating temporal memory when disease nodes co-occur.',
    lang === 'vi'
      ? 'ReportAgent tổng hợp log mô phỏng thành dự báo nguy cơ, mức tin cậy và khuyến nghị xác minh tiền sử.'
      : 'ReportAgent transforms simulation logs into predictive risk, confidence, and family-history verification recommendations.',
    lang === 'vi'
      ? 'Người dùng có thể chat giả lập với từng agent hoặc ReportAgent để đào sâu câu hỏi lâm sàng cụ thể.'
      : 'Users can simulate a chat with any specialist agent or ReportAgent to explore clinical nuances.',
  ]

  const answer = topCluster
    ? `${activeAgent.name}: ${question} → ${topCluster.label} is currently the strongest graph signal (${topCluster.score}/100) because ${topCluster.members.join(', ')} share related evidence. Next step: validate diagnosis age, exposure history, and screening status.`
    : `${activeAgent.name}: Add more family disease history in Family Medical Tree to generate a meaningful relationship simulation.`

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
          </div>

          <div style={{ padding: 20, borderRadius: 22, border: `1px solid ${c.border}`, background: c.panel }}>
            <SectionTitle kicker="Simulation state">Input from Family Medical Tree</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <Stat value={members.length} label="members" color="#00e5ff" />
              <Stat value={simulation.activeMembers.length} label="disease nodes" color="#ffb74d" />
              <Stat value={simulation.edges.length} label="risk edges" color="#9c6fff" />
            </div>
            <div style={{ marginTop: 16, padding: 13, borderRadius: 14, background: c.panel2, border: `1px solid ${c.border}`, color: c.text2, fontSize: 12, lineHeight: 1.55 }}>
              {simulation.report}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18, overflowX: 'auto', paddingBottom: 4 }}>
          {STAGES.map((stage, index) => (
            <StageCard key={stage.id} stage={stage} index={index} active={activeStage === index} complete={activeStage > index} onClick={() => setActiveStage(index)} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .95fr) minmax(0, 1.05fr)', gap: 18, marginTop: 18 }}>
          <div style={{ border: `1px solid ${c.border}`, borderRadius: 18, background: c.panel, padding: 18 }}>
            <SectionTitle kicker={STAGES[activeStage].title}>Lifecycle output</SectionTitle>
            <p style={{ margin: '0 0 16px', color: c.text2, lineHeight: 1.65, fontSize: 13 }}>{stageCopy[activeStage]}</p>
            {activeStage === 0 && <GraphView entities={simulation.entities} edges={simulation.edges} c={c} />}
            {activeStage === 1 && <AgentGrid agents={AGENT_TEMPLATES} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent} />}
            {activeStage === 2 && <InteractionLog interactions={simulation.interactions} c={c} />}
            {activeStage === 3 && <ReportPanel riskClusters={simulation.riskClusters} report={simulation.report} />}
            {activeStage === 4 && <DeepInteraction agents={AGENT_TEMPLATES} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent} question={question} setQuestion={setQuestion} answer={answer} c={c} />}
          </div>

          <div style={{ border: `1px solid ${c.border}`, borderRadius: 18, background: c.panel, padding: 18 }}>
            <SectionTitle kicker="Predictive clusters">Family relationship inference</SectionTitle>
            <div style={{ display: 'grid', gap: 12 }}>
              {simulation.riskClusters.length ? simulation.riskClusters.map(cluster => <RiskBar key={cluster.key} cluster={cluster} />) : (
                <div style={{ padding: 28, textAlign: 'center', color: c.text3, border: `1px dashed ${c.border}`, borderRadius: 14 }}>No disease relationship signals yet.</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 18 }}>
          {AGENT_TEMPLATES.map(agent => (
            <button key={agent.id} type="button" onClick={() => { setSelectedAgent(agent.id); setActiveStage(4) }} style={{ cursor: 'pointer', textAlign: 'left', border: `1px solid ${selectedAgent === agent.id ? agent.color : c.border}`, borderRadius: 16, background: selectedAgent === agent.id ? `${agent.color}14` : c.panel, padding: 14, color: c.text, fontFamily: 'inherit' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: `${agent.color}20`, color: agent.color, fontWeight: 900, fontSize: 11, fontFamily: 'var(--font-mono)' }}>{agent.abbr}</div>
              <div style={{ marginTop: 10, fontWeight: 800, fontSize: 12 }}>{agent.name}</div>
              <div style={{ marginTop: 5, color: c.text3, fontSize: 10 }}>{agent.focus}</div>
            </button>
          ))}
        </div>

      {!embedded && <NavButtons onNext={onNext} nextLabel={`${t('next')} →`} onPrev={onPrev} prevLabel={prevLabel} />}
    </div>
  )
}

function Stat({ value, label, color }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, background: `${color}12`, border: `1px solid ${color}32` }}>
      <div style={{ color, fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function GraphView({ entities, edges, c }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {entities.slice(0, 12).map(entity => {
          const meta = FAMILY_RELATION_META[entity.relation]
          return (
            <div key={entity.id} style={{ padding: '9px 11px', borderRadius: 999, background: `${meta?.color || '#00e5ff'}18`, border: `1px solid ${meta?.color || '#00e5ff'}45`, color: c.text, fontSize: 11 }}>
              <span style={{ color: meta?.color || '#00e5ff', fontWeight: 800 }}>{entity.name}</span> · {meta?.label?.vi || entity.relation}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        {edges.slice(0, 6).map((edge, index) => (
          <div key={`${edge.from}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', color: c.text2, fontSize: 11 }}>
            <span>{entities.find(e => e.id === edge.from)?.name}</span>
            <span style={{ color: edge.color, fontFamily: 'var(--font-mono)' }}>─ {edge.label} / {edge.strength}% →</span>
            <span>Patient</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AgentGrid({ agents, selectedAgent, setSelectedAgent }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {agents.map(agent => (
        <button key={agent.id} type="button" onClick={() => setSelectedAgent(agent.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, border: `1px solid ${selectedAgent === agent.id ? agent.color : 'var(--border)'}`, background: selectedAgent === agent.id ? `${agent.color}14` : 'var(--surface2)', color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, background: `${agent.color}20`, color: agent.color, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 11 }}>{agent.abbr}</span>
          <span><strong>{agent.name}</strong><br /><small style={{ color: 'var(--text3)' }}>{agent.focus}</small></span>
        </button>
      ))}
    </div>
  )
}

function InteractionLog({ interactions, c }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {interactions.map((item, index) => (
        <div key={index} style={{ padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, background: c.panel2 }}>
          <span style={{ color: item.color, fontWeight: 900, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.agent}</span>
          <span style={{ color: c.text2, marginLeft: 8, fontSize: 12 }}>{item.text}</span>
        </div>
      ))}
    </div>
  )
}

function ReportPanel({ riskClusters, report }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ padding: 14, borderRadius: 14, background: 'rgba(156,111,255,.12)', border: '1px solid rgba(156,111,255,.28)', color: 'var(--text2)', lineHeight: 1.65, fontSize: 13 }}>{report}</div>
      {riskClusters.slice(0, 3).map((cluster, index) => (
        <div key={cluster.key} style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text2)', fontSize: 12 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: `${cluster.color}20`, color: cluster.color, display: 'grid', placeItems: 'center', fontWeight: 900 }}>{index + 1}</span>
          <span><strong style={{ color: cluster.color }}>{cluster.label}</strong> · verify {cluster.raw.slice(0, 2).join(', ')}</span>
        </div>
      ))}
    </div>
  )
}

function DeepInteraction({ agents, selectedAgent, setSelectedAgent, question, setQuestion, answer, c }) {
  return (
    <div>
      <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${c.border}`, background: c.panel2, color: c.text, marginBottom: 10 }}>
        {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
      </select>
      <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, background: c.panel2, color: c.text, resize: 'vertical', fontFamily: 'inherit' }} />
      <div style={{ marginTop: 12, padding: 14, borderRadius: 14, border: `1px solid ${c.border}`, background: 'rgba(0,229,255,.08)', color: c.text2, lineHeight: 1.65, fontSize: 13 }}>{answer}</div>
    </div>
  )
}
