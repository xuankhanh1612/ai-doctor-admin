import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import NavButtons from '../NavButtons.jsx'
import FamilyRelationshipPanel from './FamilyRelationshipPanel.jsx'
import { CONDITION_COLORS, DEFAULT_FAMILY_MEMBERS, RELATION_META, isNonDiseaseCondition, loadFamilyMembers } from './familyData.js'

// Backward-compatible alias for deployed/minified code paths that referenced the previous constant name.
const FAMILY_RELATION_META = RELATION_META

const PATIENT_ID = 'LXK-2024'

const LIFECYCLE_STAGES = [
  {
    key: 'graph',
    icon: '🕸️',
    title: { vi: 'Graph Building', en: 'Graph Building' },
    detail: {
      vi: 'Trích xuất thực thể bệnh lý, quan hệ huyết thống và mốc thời gian để dựng Knowledge Graph / GraphRAG dạng bộ nhớ tập thể.',
      en: 'Extract disease entities, kinship edges, and temporal facts into a Knowledge Graph / GraphRAG collective memory.',
    },
  },
  {
    key: 'environment',
    icon: '🧑‍⚕️',
    title: { vi: 'Environment Setup', en: 'Environment Setup' },
    detail: {
      vi: 'Tạo persona tác nhân cho từng nhánh gia đình và cấu hình kênh mô phỏng đóng vai trò Twitter/Reddit y tế nội bộ.',
      en: 'Generate agent personas for family branches and configure closed Twitter/Reddit-like medical simulation channels.',
    },
  },
  {
    key: 'execution',
    icon: '⚙️',
    title: { vi: 'Simulation Execution', en: 'Simulation Execution' },
    detail: {
      vi: 'Chạy tương tác đa tác nhân song song, cập nhật bộ nhớ thời gian khi bệnh đồng xuất hiện qua nhiều thế hệ.',
      en: 'Run parallel multi-agent interactions while temporal memory updates as conditions co-occur across generations.',
    },
  },
  {
    key: 'report',
    icon: '📊',
    title: { vi: 'Report Generation', en: 'Report Generation' },
    detail: {
      vi: 'ReportAgent phân tích log giả lập để tạo báo cáo dự đoán nguy cơ, hướng tầm soát và giả thuyết di truyền.',
      en: 'ReportAgent analyzes simulation logs to produce predictive risk, screening, and hereditary-hypothesis reports.',
    },
  },
  {
    key: 'interaction',
    icon: '💬',
    title: { vi: 'Deep Interaction', en: 'Deep Interaction' },
    detail: {
      vi: 'Sau mô phỏng, người dùng có thể hỏi từng agent hoặc ReportAgent để đào sâu mối quan hệ bệnh án.',
      en: 'After simulation, users can query each agent or the ReportAgent to explore clinical relationship nuances.',
    },
  },
]

const AGENT_ROLES = [
  { id: 'graph', name: 'GraphRAG Builder', color: '#00e5ff', task: { vi: 'chuẩn hoá nút bệnh án', en: 'normalizes medical nodes' } },
  { id: 'genetic', name: 'Genetic Counselor', color: '#9c6fff', task: { vi: 'suy luận mẫu di truyền', en: 'infers hereditary patterns' } },
  { id: 'temporal', name: 'Temporal Memory Agent', color: '#00e676', task: { vi: 'theo dõi mốc thời gian', en: 'tracks temporal facts' } },
  { id: 'report', name: 'ReportAgent', color: '#ffb74d', task: { vi: 'viết báo cáo dự đoán', en: 'writes predictive report' } },
]

const isHealthyCondition = isNonDiseaseCondition
const isCancerCondition = (condition) => /ung thư|cancer|nsclc|hcc/i.test(condition)
const isCardioCondition = (condition) => /huyết áp|hypertension|tim mạch|heart|đột quỵ|stroke/i.test(condition)
const isMetabolicCondition = (condition) => /tiểu đường|diabetes|xơ gan|cirrhosis|viêm gan|hepatitis|gan|liver/i.test(condition)

const getConditionCategory = (condition) => {
  if (isCancerCondition(condition)) return 'oncology'
  if (isCardioCondition(condition)) return 'cardio'
  if (isMetabolicCondition(condition)) return 'metabolic'
  return 'general'
}

const CATEGORY_META = {
  oncology: { color: '#ff5252', label: { vi: 'Ung thư / Di truyền', en: 'Oncology / hereditary' } },
  metabolic: { color: '#ffb74d', label: { vi: 'Chuyển hoá / Gan', en: 'Metabolic / liver' } },
  cardio: { color: '#ffd54f', label: { vi: 'Tim mạch', en: 'Cardiovascular' } },
  general: { color: '#80cbc4', label: { vi: 'Khác', en: 'Other' } },
}

function createSimulationModel(members) {
  const membersWithConditions = members.map(member => ({
    ...member,
    conditions: (member.conditions || []).filter(condition => !isHealthyCondition(condition)),
  }))
  const conditionFrequency = membersWithConditions.reduce((acc, member) => {
    member.conditions.forEach(condition => {
      const category = getConditionCategory(condition)
      if (!acc[condition]) acc[condition] = { condition, category, count: 0, members: [] }
      acc[condition].count += 1
      acc[condition].members.push(member)
    })
    return acc
  }, {})

  const categories = Object.values(conditionFrequency).reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { category: item.category, count: 0, members: new Set(), conditions: [] }
    acc[item.category].count += item.count
    item.members.forEach(member => acc[item.category].members.add(member.id))
    acc[item.category].conditions.push(item.condition)
    return acc
  }, {})

  const edges = membersWithConditions.flatMap(member => member.conditions.map(condition => ({
    id: `${member.id}-${condition}`,
    source: member.name,
    target: condition,
    category: getConditionCategory(condition),
    relation: member.relation,
    weight: getConditionCategory(condition) === 'oncology' ? 0.92 : getConditionCategory(condition) === 'metabolic' ? 0.74 : 0.63,
  })))

  const cancerMembers = membersWithConditions.filter(member => member.conditions.some(isCancerCondition))
  const firstDegreeCancer = cancerMembers.filter(member => ['father', 'mother', 'sibling', 'child', 'self'].includes(member.relation)).length
  const multiGenerationCancer = new Set(cancerMembers.map(member => FAMILY_RELATION_META[member.relation]?.row || 3)).size
  const metabolicMembers = membersWithConditions.filter(member => member.conditions.some(isMetabolicCondition))
  const cardioMembers = membersWithConditions.filter(member => member.conditions.some(isCardioCondition))
  const totalRiskEvents = edges.length || 1
  const hereditaryScore = Math.min(98, Math.round(
    28 + cancerMembers.length * 12 + firstDegreeCancer * 10 + Math.max(0, multiGenerationCancer - 1) * 9 + metabolicMembers.length * 4 + cardioMembers.length * 3
  ))
  const memoryDensity = Math.min(96, Math.round((edges.length / Math.max(members.length, 1)) * 34 + Object.keys(conditionFrequency).length * 8))
  const confidence = Math.min(97, Math.round(58 + members.length * 2.5 + Math.min(edges.length, 12) * 2.8))

  return {
    membersWithConditions,
    conditionFrequency,
    categories,
    edges,
    cancerMembers,
    metabolicMembers,
    cardioMembers,
    totalRiskEvents,
    hereditaryScore,
    memoryDensity,
    confidence,
  }
}

function getStageStatus(index, activeStage) {
  if (index < activeStage) return 'done'
  if (index === activeStage) return 'running'
  return 'pending'
}

export default function FamilyMedicalRelationshipPanel({ patientId = PATIENT_ID, storageOwnerId = 'guest', onNext, onPrev, prevLabel }) {
  const { theme, lang, t } = useApp()
  const isDark = theme === 'dark'
  const [activeStage, setActiveStage] = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(AGENT_ROLES[0].id)
  const [activeTab, setActiveTab] = useState('medical')
  const members = useMemo(() => loadFamilyMembers(patientId, storageOwnerId) || DEFAULT_FAMILY_MEMBERS, [patientId, storageOwnerId])
  const model = useMemo(() => createSimulationModel(members), [members])
  const selectedAgentProfile = AGENT_ROLES.find(agent => agent.id === selectedAgent) || AGENT_ROLES[0]

  const c = isDark ? {
    border:'rgba(255,255,255,0.08)', text:'#e8f0f8', text2:'rgba(232,240,248,0.6)', text3:'rgba(232,240,248,0.34)',
    surface:'rgba(255,255,255,0.035)', surface2:'rgba(255,255,255,0.065)',
  } : {
    border:'rgba(0,0,0,0.09)', text:'#1a2035', text2:'#555', text3:'#999', surface:'rgba(0,0,0,0.025)', surface2:'rgba(0,0,0,0.055)',
  }

  const reportLines = [
    lang === 'vi'
      ? `ReportAgent dự đoán điểm nguy cơ quan hệ gia đình ${model.hereditaryScore}/100 dựa trên ${model.edges.length} cạnh bệnh án.`
      : `ReportAgent estimates a family-relationship risk score of ${model.hereditaryScore}/100 from ${model.edges.length} clinical graph edges.`,
    lang === 'vi'
      ? `${model.cancerMembers.length} thành viên có tín hiệu ung thư; ${new Set(model.cancerMembers.map(m => FAMILY_RELATION_META[m.relation]?.row || 3)).size} thế hệ được ghi nhận.`
      : `${model.cancerMembers.length} members carry oncology signals across ${new Set(model.cancerMembers.map(m => FAMILY_RELATION_META[m.relation]?.row || 3)).size} recorded generation(s).`,
    lang === 'vi'
      ? `Khuyến nghị: ưu tiên tư vấn gen, CT ngực liều thấp, marker gan/AFP và cập nhật episode mới vào memory graph sau mỗi lần khám.`
      : `Recommendation: prioritize genetic counseling, low-dose chest CT, liver/AFP markers, and append new episodes to the memory graph after each visit.`,
  ]

  const relationshipTabs = [
    { id: 'medical', label: t('familyRelationshipTitle') },
    { id: 'inference', label: t('familyRelationshipInference') },
  ]

  return (
    <div style={{ padding:28, display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:c.text, margin:0 }}>
            🧬 {activeTab === 'medical' ? t('familyRelationshipTitle') : t('familyRelationshipInference')}
          </h2>
          <p style={{ color:c.text2, fontSize:12, marginTop:6, maxWidth:820, lineHeight:1.6 }}>
            {activeTab === 'medical'
              ? (lang === 'vi'
                ? 'Trang mô phỏng mối quan hệ tiền sử bệnh án gia đình từ dữ liệu đã nhập ở Family Medical Tree, lấy cảm hứng từ Zep temporal context graph và vòng đời mô phỏng 5 giai đoạn của MiroFish.'
                : 'Simulates family medical-history relationships from Family Medical Tree inputs, inspired by Zep temporal context graphs and MiroFish’s five-stage simulation lifecycle.')
              : (lang === 'vi'
                ? 'Tab suy luận dùng giao diện FamilyRelationshipPanel để phân tích graph, agent personas và kịch bản tầm soát dựa trên dữ liệu gia đình hiện có.'
                : 'This inference tab uses the FamilyRelationshipPanel view to analyze the graph, agent personas, and screening scenarios from the current family data.')}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <div role="tablist" aria-label="Family relationship views" style={{ display:'flex', gap:6, padding:4, border:`1px solid ${c.border}`, borderRadius:999, background:c.surface }}>
            {relationshipTabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ padding:'9px 13px', borderRadius:999, border:`1px solid ${isActive ? 'rgba(0,229,255,.42)' : 'transparent'}`, background:isActive ? 'rgba(0,229,255,.12)' : 'transparent', color:isActive ? '#00e5ff' : c.text2, fontWeight:800, cursor:'pointer', fontFamily:'inherit', fontSize:12, whiteSpace:'nowrap' }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          {activeTab === 'medical' && (
            <button
              type="button"
              onClick={() => setActiveStage(stage => (stage + 1) % LIFECYCLE_STAGES.length)}
              style={{ padding:'10px 16px', borderRadius:10, border:'1px solid rgba(0,229,255,0.3)', background:'linear-gradient(135deg,rgba(0,229,255,.12),rgba(156,111,255,.14))', color:'#00e5ff', fontWeight:800, cursor:'pointer', fontFamily:'inherit', fontSize:12 }}
            >
              ▶ {lang === 'vi' ? 'Chạy bước mô phỏng' : 'Run simulation step'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'inference' ? (
        <FamilyRelationshipPanel
          patientId={patientId}
          storageOwnerId={storageOwnerId}
          embedded
          title={t('familyRelationshipInference')}
        />
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(150px,1fr))', gap:12 }}>
        {[
          { label: lang === 'vi' ? 'Memory graph' : 'Memory graph', value: `${model.edges.length} edges`, color:'#00e5ff' },
          { label: lang === 'vi' ? 'Điểm di truyền' : 'Hereditary score', value: `${model.hereditaryScore}/100`, color:'#ff5252' },
          { label: lang === 'vi' ? 'Độ đặc bộ nhớ' : 'Memory density', value: `${model.memoryDensity}%`, color:'#9c6fff' },
          { label: t('confidence'), value: `${model.confidence}%`, color:'#00e676' },
        ].map(card => (
          <div key={card.label} style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:c.text3, fontFamily:'monospace', marginBottom:8 }}>{card.label}</div>
            <div style={{ fontSize:22, fontWeight:900, color:card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.08fr .92fr', gap:16 }}>
        <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:18 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:16 }}>
            <div>
              <div style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:c.text3, fontFamily:'monospace' }}>GraphRAG / Zep-style context</div>
              <h3 style={{ margin:'6px 0 0', color:c.text, fontSize:16 }}>{lang === 'vi' ? 'Bản đồ quan hệ bệnh án' : 'Medical relationship map'}</h3>
            </div>
            <span style={{ fontSize:10, color:'#00e5ff', border:'1px solid rgba(0,229,255,.25)', borderRadius:999, padding:'5px 10px', background:'rgba(0,229,255,.08)' }}>temporal KG</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {Object.values(model.categories).map(category => {
              const meta = CATEGORY_META[category.category]
              return (
                <div key={category.category} style={{ border:`1px solid ${meta.color}35`, background:`${meta.color}10`, borderRadius:14, padding:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ width:10, height:10, borderRadius:'50%', background:meta.color, boxShadow:`0 0 18px ${meta.color}` }} />
                    <div style={{ color:meta.color, fontWeight:800, fontSize:12 }}>{meta.label[lang]}</div>
                  </div>
                  <div style={{ color:c.text2, fontSize:11, lineHeight:1.55 }}>
                    {lang === 'vi' ? `${category.members.size} thành viên · ${category.count} episode bệnh án` : `${category.members.size} member(s) · ${category.count} clinical episode(s)`}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                    {category.conditions.slice(0, 4).map(condition => (
                      <span key={condition} style={{ fontSize:9, color:CONDITION_COLORS[condition] || meta.color, background:'rgba(0,0,0,.12)', borderRadius:5, padding:'3px 6px' }}>{condition}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
            {model.edges.slice(0, 8).map(edge => {
              const meta = CATEGORY_META[edge.category]
              return (
                <div key={edge.id} style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto', alignItems:'center', gap:8, fontSize:11, color:c.text2 }}>
                  <span style={{ color:c.text, fontWeight:700 }}>{edge.source}</span>
                  <span style={{ color:meta.color }}>━━</span>
                  <span>{edge.target}</span>
                  <span style={{ color:meta.color, fontFamily:'monospace' }}>{Math.round(edge.weight * 100)}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:18 }}>
          <div style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:c.text3, fontFamily:'monospace', marginBottom:14 }}>
            The Five-Stage Simulation Lifecycle
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {LIFECYCLE_STAGES.map((stage, index) => {
              const status = getStageStatus(index, activeStage)
              const color = status === 'done' ? '#00e676' : status === 'running' ? '#00e5ff' : c.text3
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setActiveStage(index)}
                  style={{ display:'grid', gridTemplateColumns:'34px 1fr auto', gap:10, alignItems:'center', width:'100%', textAlign:'left', padding:12, borderRadius:12, border:`1px solid ${status === 'running' ? 'rgba(0,229,255,.35)' : c.border}`, background:status === 'running' ? 'rgba(0,229,255,.07)' : c.surface2, cursor:'pointer', fontFamily:'inherit' }}
                >
                  <span style={{ fontSize:20 }}>{stage.icon}</span>
                  <span>
                    <span style={{ display:'block', color, fontWeight:800, fontSize:12 }}>{index + 1}. {stage.title[lang]}</span>
                    <span style={{ display:'block', color:c.text2, fontSize:10, lineHeight:1.45, marginTop:3 }}>{stage.detail[lang]}</span>
                  </span>
                  <span style={{ fontSize:9, color, fontFamily:'monospace' }}>{status.toUpperCase()}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:16 }}>
        <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:18 }}>
          <div style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:c.text3, fontFamily:'monospace', marginBottom:12 }}>{lang === 'vi' ? 'Agent personas' : 'Agent personas'}</div>
          {AGENT_ROLES.map(agent => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgent(agent.id)}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', marginBottom:8, padding:10, borderRadius:10, border:`1px solid ${selectedAgent === agent.id ? `${agent.color}66` : c.border}`, background:selectedAgent === agent.id ? `${agent.color}12` : 'transparent', color:c.text, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
            >
              <span style={{ width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:`${agent.color}22`, color:agent.color, fontWeight:900, fontSize:11 }}>{agent.name.slice(0,2).toUpperCase()}</span>
              <span style={{ flex:1 }}>
                <span style={{ display:'block', fontSize:12, fontWeight:800 }}>{agent.name}</span>
                <span style={{ display:'block', fontSize:10, color:c.text2 }}>{agent.task[lang]}</span>
              </span>
            </button>
          ))}
        </div>

        <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:c.text3, fontFamily:'monospace' }}>{lang === 'vi' ? 'Deep Interaction console' : 'Deep Interaction console'}</div>
              <h3 style={{ margin:'6px 0 0', color:selectedAgentProfile.color, fontSize:16 }}>{selectedAgentProfile.name}</h3>
            </div>
            <span style={{ alignSelf:'flex-start', color:selectedAgentProfile.color, fontSize:11, fontFamily:'monospace' }}>memory.updated.now()</span>
          </div>
          <div style={{ border:`1px solid ${c.border}`, borderRadius:12, padding:14, background:isDark ? 'rgba(0,0,0,.18)' : '#fff' }}>
            <div style={{ color:c.text2, fontSize:12, lineHeight:1.75 }}>
              <strong style={{ color:c.text }}>User:</strong> {lang === 'vi' ? 'Quan hệ nào cần ưu tiên tầm soát trong gia đình?' : 'Which relationship should be prioritized for screening?'}
            </div>
            <div style={{ color:c.text2, fontSize:12, lineHeight:1.75, marginTop:10 }}>
              <strong style={{ color:selectedAgentProfile.color }}>{selectedAgentProfile.name}:</strong> {lang === 'vi'
                ? `Ưu tiên nhánh bậc một và các thế hệ có bệnh ung thư/gan lặp lại. Tôi thấy ${model.cancerMembers.length} oncology signal và ${model.metabolicMembers.length} metabolic/liver signal trong graph.`
                : `Prioritize first-degree branches and generations with repeated oncology/liver disease. I detect ${model.cancerMembers.length} oncology signal(s) and ${model.metabolicMembers.length} metabolic/liver signal(s) in the graph.`}
            </div>
          </div>
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {reportLines.map((line, index) => (
              <div key={line} style={{ border:`1px solid ${c.border}`, borderRadius:10, padding:12, color:c.text2, fontSize:11, lineHeight:1.6, background:c.surface2 }}>
                <span style={{ color:'#00e5ff', fontFamily:'monospace', fontWeight:900 }}>0{index + 1}</span> {line}
              </div>
            ))}
          </div>
        </div>
      </div>

        </>
      )}

      <NavButtons onNext={onNext} nextLabel={`${t('next')} →`} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
