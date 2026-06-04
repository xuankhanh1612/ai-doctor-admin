import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import NavButtons from '../NavButtons.jsx'
import { DEFAULT_FAMILY_MEMBERS, FAMILY_MEMBERS_CHANGED_EVENT, RELATION_META, getFamilyOwnerKey, isNonDiseaseCondition, loadFamilyMembers } from './familyData.js'

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

const STAGES = [
  { id: 'graph', icon: '🧠', title: 'Graph Building', copy: 'Chuẩn hoá node gia đình, bệnh án và cạnh huyết thống từ database local của user.' },
  { id: 'agent', icon: '🧬', title: 'Agent Inference', copy: 'Các agent di truyền, ung bướu và phòng ngừa đọc graph để tìm cụm nguy cơ.' },
  { id: 'report', icon: '📊', title: 'Report Generation', copy: 'ReportAgent tổng hợp điểm rủi ro, bằng chứng và hướng tầm soát.' },
]

const AGENT_TEMPLATES = [
  { id: 'genetics', name: 'GeneticsAgent', color: '#9c6fff', role: 'Suy luận mẫu di truyền và quan hệ bậc một' },
  { id: 'oncology', name: 'OncologyAgent', color: '#ff5252', role: 'Phát hiện cụm ung thư gia đình cần tầm soát' },
  { id: 'prevention', name: 'PreventionAgent', color: '#00e676', role: 'Đề xuất lịch kiểm tra cho thế hệ tiếp theo' },
  { id: 'report', name: 'ReportAgent', color: '#00e5ff', role: 'Tổng hợp log thành báo cáo hành động' },
]

const CLUSTER_RULES = [
  { id: 'cancer', label: 'Cancer cluster', color: '#ff5252', base: 30, regex: /ung thư|cancer|nsclc|hcc|tumou?r|carcinoma/i },
  { id: 'hepatic', label: 'Hepatic lineage', color: '#ffb74d', base: 24, regex: /gan|hcc|xơ gan|cirrhosis|hepatitis|viêm gan/i },
  { id: 'cardio', label: 'Cardio-metabolic', color: '#ffd54f', base: 18, regex: /tiểu đường|diabetes|huyết áp|hypertension|tim mạch|heart|stroke|đột quỵ/i },
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const getRelationMeta = (relation) => RELATION_META[relation] || RELATION_META.cousin || RELATION_META.self
const getRelationInfluence = (relation) => RELATION_INFLUENCE[relation] ?? 0.2

function normalizeConditions(member) {
  return (member?.conditions || [])
    .map(condition => String(condition || '').trim())
    .filter(Boolean)
    .filter(condition => !isNonDiseaseCondition(condition))
}

function buildSimulation(members) {
  const safeMembers = Array.isArray(members) && members.length ? members : DEFAULT_FAMILY_MEMBERS
  const self = safeMembers.find(member => member.relation === 'self') || safeMembers[0]
  const selfConditions = normalizeConditions(self)

  const nodes = safeMembers.map((member, index) => {
    const meta = getRelationMeta(member.relation)
    return {
      ...member,
      id: member.id || `family-node-${index}`,
      relationLabel: meta.label?.vi || member.relation,
      row: meta.row || 3,
      color: meta.color || '#8aa0b8',
      conditions: normalizeConditions(member),
      influence: getRelationInfluence(member.relation),
    }
  })

  const edges = nodes
    .filter(node => self?.id && node.id !== self.id)
    .map(node => {
      const sharedSignals = node.conditions.filter(condition => selfConditions.some(selfCondition => (
        condition.toLowerCase().includes(selfCondition.toLowerCase()) ||
        selfCondition.toLowerCase().includes(condition.toLowerCase())
      )))

      return {
        id: `${node.id}-${self.id}`,
        from: node.id,
        to: self.id,
        label: node.relationLabel,
        color: node.color,
        strength: clamp(Math.round(node.influence * 100 + sharedSignals.length * 12), 8, 96),
      }
    })

  const riskClusters = CLUSTER_RULES.map(rule => {
    const carriers = nodes.filter(node => node.conditions.some(condition => rule.regex.test(condition)))
    const weighted = carriers.reduce((sum, node) => sum + node.influence, 0)
    const generations = new Set(carriers.map(node => node.row)).size
    const score = carriers.length
      ? clamp(Math.round(rule.base + weighted * 22 + generations * 8 + Math.max(0, carriers.length - 1) * 6), 0, 99)
      : 0

    return { ...rule, carriers, generations, score }
  }).sort((a, b) => b.score - a.score)

  const affectedCount = nodes.filter(node => node.conditions.length > 0).length
  const summaryScore = clamp(Math.round(
    riskClusters.reduce((sum, cluster) => sum + cluster.score, 0) / Math.max(1, riskClusters.length) +
    affectedCount * 2 +
    (riskClusters[0]?.generations || 0) * 3
  ), 0, 98)

  return {
    self,
    nodes,
    edges,
    riskClusters,
    affectedCount,
    summaryScore,
    logs: [
      `Indexed ${nodes.length} family nodes and ${edges.length} kinship edges from the current family database.`,
      `${riskClusters[0]?.label || 'Family graph'} score: ${riskClusters[0]?.score || 0}% across ${riskClusters[0]?.generations || 0} generation layer(s).`,
      `ReportAgent recommends re-running inference whenever Family Medical Tree local data changes.`,
    ],
  }
}

export default function FamilyRelationshipPanel({ patientId = 'LXK-2024', storageOwnerId = 'guest', onNext, onPrev, prevLabel, embedded = false, title = null }) {
  const { theme, lang, t } = useApp()
  const isDark = theme === 'dark'
  const [activeStage, setActiveStage] = useState('graph')
  const [selectedAgent, setSelectedAgent] = useState('report')

  // Single source of truth: logged-in user's local family DB first, canonical default mẫu second.
  const [members, setMembers] = useState(() => loadFamilyMembers(patientId, storageOwnerId) || DEFAULT_FAMILY_MEMBERS)

  useEffect(() => {
    const refreshMembers = () => setMembers(loadFamilyMembers(patientId, storageOwnerId) || DEFAULT_FAMILY_MEMBERS)
    const handleFamilyChange = event => {
      const detail = event.detail || {}
      if (detail.patientId && detail.patientId !== patientId) return
      if (detail.ownerId && detail.ownerId !== getFamilyOwnerKey(storageOwnerId)) return
      refreshMembers()
    }

    refreshMembers()
    window.addEventListener(FAMILY_MEMBERS_CHANGED_EVENT, handleFamilyChange)
    window.addEventListener('storage', refreshMembers)
    return () => {
      window.removeEventListener(FAMILY_MEMBERS_CHANGED_EVENT, handleFamilyChange)
      window.removeEventListener('storage', refreshMembers)
    }
  }, [patientId, storageOwnerId])

  const simulation = useMemo(() => buildSimulation(members), [members])
  const activeAgent = AGENT_TEMPLATES.find(agent => agent.id === selectedAgent) || AGENT_TEMPLATES[AGENT_TEMPLATES.length - 1]
  const activeStageData = STAGES.find(stage => stage.id === activeStage) || STAGES[0]
  const topCluster = simulation.riskClusters[0]

  const c = {
    bg: isDark ? 'var(--bg2,#050816)' : '#f4f7fb',
    surface: isDark ? 'rgba(255,255,255,0.035)' : '#fff',
    surface2: isDark ? 'rgba(0,229,255,0.055)' : 'rgba(0,184,204,0.06)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#e8f0f8' : '#172033',
    text2: isDark ? 'rgba(232,240,248,0.68)' : '#586174',
    text3: isDark ? 'rgba(232,240,248,0.45)' : '#8a93a6',
  }

  return (
    <div style={{ padding: embedded ? 0 : '24px clamp(16px,3vw,32px)', background: embedded ? 'transparent' : c.bg, minHeight: '100%', color: c.text }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '.18em', color: '#00e5ff', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'monospace' }}>
          Family relationship map · Local user database
        </div>
        <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(24px,3vw,36px)', lineHeight: 1.1 }}>
          🧬 {title || t('familyRelationshipTitle')}
        </h1>
        <p style={{ margin: 0, maxWidth: 980, color: c.text2, lineHeight: 1.7, fontSize: 14 }}>
          {lang === 'vi'
            ? 'Tab này đọc đúng database gia đình local của user đang đăng nhập; nếu chưa có dữ liệu thì dùng default mẫu từ Family Medical Tree.'
            : 'This tab reads the logged-in user’s local family database first; if no saved data exists, it falls back to the Family Medical Tree default sample.'}
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
        <Stat value={`${simulation.summaryScore}%`} label="Inference signal" color="#00e5ff" />
        <Stat value={simulation.nodes.length} label="Family nodes" color="#9c6fff" />
        <Stat value={simulation.affectedCount} label="Affected histories" color="#ffb74d" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,.85fr) 1.15fr', gap: 16, marginBottom: 16 }}>
        <Card c={c} eyebrow="Lifecycle" title="Three-stage inference flow">
          <div style={{ display: 'grid', gap: 8 }}>
            {STAGES.map(stage => (
              <button key={stage.id} type="button" onClick={() => setActiveStage(stage.id)} style={{ textAlign: 'left', border: `1px solid ${activeStage === stage.id ? '#00e5ff' : c.border}`, background: activeStage === stage.id ? 'rgba(0,229,255,.11)' : 'transparent', borderRadius: 12, padding: 11, color: c.text, cursor: 'pointer' }}>
                <div style={{ fontSize: 18 }}>{stage.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 900 }}>{stage.title}</div>
                <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.5, marginTop: 3 }}>{stage.copy}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: c.surface2, color: c.text2, fontSize: 12, lineHeight: 1.6 }}>
            <b style={{ color: '#00e5ff' }}>{activeStageData.icon} {activeStageData.title}:</b> {activeStageData.copy}
          </div>
        </Card>

        <Card c={c} eyebrow="Knowledge graph" title="Family relationship map">
          <div style={{ position: 'relative', minHeight: 320, borderRadius: 14, border: `1px solid ${c.border}`, background: 'radial-gradient(circle at 50% 42%, rgba(0,229,255,.15), transparent 30%), rgba(0,0,0,.12)', overflow: 'hidden' }}>
            {simulation.edges.map((edge, index) => (
              <div key={edge.id} style={{ position: 'absolute', left: `${12 + (index % 4) * 20}%`, top: `${22 + (index % 5) * 12}%`, width: `${28 + edge.strength / 3}%`, height: 1, background: `linear-gradient(90deg, ${edge.color}, transparent)`, opacity: .58, transform: `rotate(${index % 2 ? -11 : 12}deg)`, transformOrigin: 'left center' }} />
            ))}
            {simulation.nodes.map((node, index) => {
              const left = 11 + ((index * 17) % 78)
              const top = 13 + (node.row - 1) * 17 + ((index % 2) * 4)
              return (
                <div key={node.id} title={node.conditions.join(', ')} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', width: node.relation === 'self' ? 118 : 96, padding: '8px 9px', borderRadius: 12, background: 'rgba(5,8,18,.88)', border: `1px solid ${node.color}`, boxShadow: `0 0 24px ${node.color}25` }}>
                  <div style={{ fontSize: 10, color: node.color, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</div>
                  <div style={{ fontSize: 8, color: c.text3, textTransform: 'uppercase', marginTop: 2 }}>{node.relationLabel}</div>
                  {node.conditions.length > 0 && <div style={{ marginTop: 5, fontSize: 8, color: '#ff8a65' }}>{node.conditions.length} risk item(s)</div>}
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 16, marginBottom: 20 }}>
        <Card c={c} eyebrow="Agent personas" title="Inference council">
          <div style={{ display: 'grid', gap: 10 }}>
            {AGENT_TEMPLATES.map(agent => (
              <button key={agent.id} type="button" onClick={() => setSelectedAgent(agent.id)} style={{ textAlign: 'left', border: `1px solid ${selectedAgent === agent.id ? agent.color : c.border}`, background: selectedAgent === agent.id ? `${agent.color}14` : 'transparent', color: c.text, borderRadius: 12, padding: 12, cursor: 'pointer' }}>
                <div style={{ color: agent.color, fontWeight: 900, fontSize: 12 }}>{agent.name}</div>
                <div style={{ color: c.text2, fontSize: 11, lineHeight: 1.45, marginTop: 4 }}>{agent.role}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card c={c} eyebrow="ReportAgent output" title="Predictive relationship report">
          <div style={{ display: 'grid', gap: 10 }}>
            {simulation.riskClusters.map(cluster => (
              <div key={cluster.id} style={{ border: `1px solid ${cluster.color}35`, background: `${cluster.color}10`, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
                  <b style={{ color: cluster.color, fontSize: 12 }}>{cluster.label}</b>
                  <span style={{ color: cluster.color, fontFamily: 'monospace', fontWeight: 900 }}>{cluster.score}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: 7 }}>
                  <div style={{ height: '100%', width: `${cluster.score}%`, background: cluster.color }} />
                </div>
                <div style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>
                  {cluster.carriers.length ? cluster.carriers.map(member => member.name).join(' · ') : (lang === 'vi' ? 'Chưa có carrier rõ ràng' : 'No clear carrier yet')}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid rgba(0,229,255,.2)', background: 'rgba(0,229,255,.06)', fontSize: 12, color: c.text2, lineHeight: 1.65 }}>
            <b style={{ color: activeAgent.color }}>{activeAgent.name}:</b> {topCluster?.score
              ? `${topCluster.label} là cụm ưu tiên (${topCluster.score}%). Nên cập nhật Family Medical Tree sau mỗi chẩn đoán hoặc xét nghiệm mới.`
              : 'Chưa thấy cụm bệnh rõ ràng trong dữ liệu hiện tại. Hãy cập nhật tiền sử gia đình để inference chính xác hơn.'}
          </div>
          <ul style={{ margin: '12px 0 0 18px', color: c.text3, fontSize: 11, lineHeight: 1.65 }}>
            {simulation.logs.map(log => <li key={log}>{log}</li>)}
          </ul>
        </Card>
      </section>

      {!embedded && <NavButtons onNext={onNext} nextLabel={`${t('patientRecord')} →`} onPrev={onPrev} prevLabel={prevLabel} />}
    </div>
  )
}

function Stat({ value, label, color }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, background: `${color}12`, border: `1px solid ${color}32` }}>
      <div style={{ color, fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 5, color: 'var(--text2)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
    </div>
  )
}

function Card({ c, eyebrow, title, children }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 18, padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: c.text3, textTransform: 'uppercase', letterSpacing: '.14em', fontFamily: 'monospace', marginBottom: 4 }}>{eyebrow}</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: c.text }}>{title}</div>
      </div>
      {children}
    </div>
  )
}
