import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import NavButtons from '../NavButtons.jsx'

const STORAGE_KEY = 'cdoc_family_members'

const RELATION_META = {
  grandparent: { generation: 1, color: '#9c6fff', vi: 'Ông/Bà', en: 'Grandparent' },
  father: { generation: 2, color: '#00b8cc', vi: 'Cha', en: 'Father' },
  mother: { generation: 2, color: '#f48fb1', vi: 'Mẹ', en: 'Mother' },
  uncle_aunt: { generation: 2, color: '#ce93d8', vi: 'Chú/Cô', en: 'Uncle/Aunt' },
  self: { generation: 3, color: '#00e5ff', vi: 'Bệnh nhân', en: 'Patient' },
  spouse: { generation: 3, color: '#ffb74d', vi: 'Vợ/Chồng', en: 'Spouse' },
  sibling: { generation: 3, color: '#00e676', vi: 'Anh/Chị/Em', en: 'Sibling' },
  cousin: { generation: 3, color: '#80cbc4', vi: 'Anh em họ', en: 'Cousin' },
  child: { generation: 4, color: '#ff8a65', vi: 'Con', en: 'Child' },
  grandchild: { generation: 5, color: '#a5d6a7', vi: 'Cháu', en: 'Grandchild' },
}

const DEFAULT_MEMBERS = [
  { id:'fm-0', relation:'grandparent', name:'Lê Văn Tấn', age:94, gender:'M', conditions:['Ung thư phổi'], alive:false, note:'Ông nội · mất 1992' },
  { id:'fm-9', relation:'grandparent', name:'Trần Thị Ngọc', age:88, gender:'F', conditions:['Tăng huyết áp'], alive:false, note:'Bà nội · mất 2005' },
  { id:'fm-1', relation:'father', name:'Lê Văn Bình', age:72, gender:'M', conditions:['Ung thư phổi','Tăng huyết áp'], alive:false, note:'Mất 2018 — ung thư phổi' },
  { id:'fm-2', relation:'mother', name:'Nguyễn Thị Lan', age:68, gender:'F', conditions:['Tăng huyết áp'], alive:true, note:'' },
  { id:'fm-7', relation:'uncle_aunt', name:'Lê Văn Hùng', age:65, gender:'M', conditions:['Xơ gan'], alive:true, note:'Bác ruột · viêm gan B' },
  { id:'fm-3', relation:'self', name:'Lê Xuân Khánh', age:47, gender:'M', conditions:['NSCLC · Stage IIA','Ung thư gan di căn (HCC)','Xơ gan Child-Pugh A'], alive:true, note:'Bệnh nhân chính · EGFR Exon19del · T790M · Erlotinib Cycle 4' },
  { id:'fm-4', relation:'spouse', name:'Trần Thị Hoa', age:44, gender:'F', conditions:['Khỏe mạnh'], alive:true, note:'' },
  { id:'fm-5', relation:'sibling', name:'Lê Xuân Nam', age:44, gender:'M', conditions:['Viêm gan B mãn tính'], alive:true, note:'Em trai' },
  { id:'fm-6', relation:'child', name:'Lê Minh Anh', age:18, gender:'F', conditions:['Khỏe mạnh'], alive:true, note:'Con gái' },
  { id:'fm-8', relation:'child', name:'Lê Minh Quân', age:14, gender:'M', conditions:['Khỏe mạnh'], alive:true, note:'Con trai' },
]

const LIFECYCLE = [
  {
    key: 'graph',
    icon: '🧬',
    title: { vi: 'Graph Building', en: 'Graph Building' },
    copy: {
      vi: 'Trích xuất thực thể, bệnh lý, thế hệ và cạnh quan hệ để dựng Knowledge Graph / GraphRAG gia đình.',
      en: 'Extract entities, conditions, generations, and relationship edges into a family Knowledge Graph / GraphRAG.',
    },
  },
  {
    key: 'environment',
    icon: '🧑‍⚕️',
    title: { vi: 'Environment Setup', en: 'Environment Setup' },
    copy: {
      vi: 'Sinh persona agent và cấu hình sandbox lâm sàng dựa trên ontology đã rút ra từ Family Medical Tree.',
      en: 'Generate agent personas and clinical sandbox settings from the ontology extracted from the Family Medical Tree.',
    },
  },
  {
    key: 'execution',
    icon: '⚡',
    title: { vi: 'Simulation Execution', en: 'Simulation Execution' },
    copy: {
      vi: 'Chạy tương tác multi-agent song song, cập nhật temporal memory cho phơi nhiễm, di truyền và lối sống.',
      en: 'Run parallel multi-agent interactions while updating temporal memory for exposure, heredity, and lifestyle.',
    },
  },
  {
    key: 'report',
    icon: '📊',
    title: { vi: 'Report Generation', en: 'Report Generation' },
    copy: {
      vi: 'ReportAgent phân tích log giả lập và tạo báo cáo dự báo nguy cơ, khuyến nghị tầm soát theo nhánh họ.',
      en: 'ReportAgent analyzes simulation logs and produces predictive risk and branch-specific screening reports.',
    },
  },
  {
    key: 'interaction',
    icon: '💬',
    title: { vi: 'Deep Interaction', en: 'Deep Interaction' },
    copy: {
      vi: 'Sau giả lập, người dùng có thể chat với từng agent hoặc ReportAgent để đào sâu giả thuyết cụ thể.',
      en: 'After simulation, users can chat with each agent or the ReportAgent to explore specific hypotheses.',
    },
  },
]

const AGENT_PERSONAS = [
  { id: 'gene', abbr: 'GX', name: 'Genomics Agent', color: '#9c6fff', focus: { vi: 'Dấu hiệu di truyền / đột biến', en: 'Hereditary markers / variants' } },
  { id: 'onco', abbr: 'ON', name: 'Oncology Agent', color: '#ff5252', focus: { vi: 'Cụm ung thư trong gia đình', en: 'Familial cancer clusters' } },
  { id: 'hepato', abbr: 'HP', name: 'Hepato Agent', color: '#ffb74d', focus: { vi: 'HBV, xơ gan, HCC', en: 'HBV, cirrhosis, HCC' } },
  { id: 'prevent', abbr: 'PV', name: 'Preventive Care Agent', color: '#00e676', focus: { vi: 'Tầm soát và phòng ngừa', en: 'Screening and prevention' } },
  { id: 'report', abbr: 'RA', name: 'ReportAgent', color: '#00e5ff', focus: { vi: 'Tổng hợp log và giải thích', en: 'Log synthesis and explanations' } },
]

function loadMembers(patientId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return all[patientId] || DEFAULT_MEMBERS
  } catch {
    return DEFAULT_MEMBERS
  }
}

function normalizeCondition(condition = '') {
  const lower = condition.toLowerCase()
  if (/ung thư|cancer|nsclc|hcc/.test(lower)) return 'oncology'
  if (/gan|xơ gan|hepat|hbv|viêm gan|cirrhosis/.test(lower)) return 'hepatic'
  if (/huyết áp|hypertension|tim|heart|stroke|đột quỵ/.test(lower)) return 'cardio'
  if (/tiểu đường|diabetes/.test(lower)) return 'metabolic'
  if (/khỏe mạnh|healthy/.test(lower)) return 'healthy'
  return 'other'
}

function riskScoreForMember(member, members) {
  const relation = member.relation
  const conditions = member.conditions || []
  const ownRisk = conditions.reduce((total, condition) => {
    const type = normalizeCondition(condition)
    if (type === 'oncology') return total + 34
    if (type === 'hepatic') return total + 24
    if (type === 'cardio') return total + 16
    if (type === 'metabolic') return total + 14
    if (type === 'other') return total + 8
    return total
  }, 8)

  const firstDegreeBurden = members.filter(m => ['father','mother','sibling','child','self'].includes(m.relation))
    .filter(m => m.id !== member.id)
    .reduce((sum, m) => sum + (m.conditions || []).filter(c => normalizeCondition(c) !== 'healthy').length * 5, 0)
  const generationFactor = Math.max(0, 6 - (RELATION_META[relation]?.generation || 3))
  return Math.min(99, Math.round(ownRisk + firstDegreeBurden + generationFactor))
}

function buildSimulation(members) {
  const enriched = members.map(member => ({
    ...member,
    conditions: member.conditions?.length ? member.conditions : ['Khỏe mạnh'],
    riskScore: riskScoreForMember(member, members),
  }))

  const conditionClusters = enriched.reduce((acc, member) => {
    member.conditions.forEach(condition => {
      const type = normalizeCondition(condition)
      if (type === 'healthy') return
      if (!acc[type]) acc[type] = { type, count: 0, members: [], conditions: new Set() }
      acc[type].count += 1
      acc[type].members.push(member.name)
      acc[type].conditions.add(condition)
    })
    return acc
  }, {})

  const father = enriched.find(m => m.relation === 'father')
  const mother = enriched.find(m => m.relation === 'mother')
  const self = enriched.find(m => m.relation === 'self')
  const children = enriched.filter(m => m.relation === 'child')
  const siblings = enriched.filter(m => m.relation === 'sibling')
  const grandparents = enriched.filter(m => m.relation === 'grandparent')
  const spouse = enriched.find(m => m.relation === 'spouse')

  const edges = [
    ...grandparents.flatMap(gp => [father, mother].filter(Boolean).map(parent => ({ from: gp, to: parent, type: 'ancestral' }))),
    ...[father, mother].filter(Boolean).flatMap(parent => [self, ...siblings].filter(Boolean).map(child => ({ from: parent, to: child, type: 'first-degree' }))),
    ...(self ? children.map(child => ({ from: self, to: child, type: 'descendant' })) : []),
    ...(spouse && self ? [{ from: self, to: spouse, type: 'partner' }] : []),
  ]

  const oncologyCount = conditionClusters.oncology?.count || 0
  const hepaticCount = conditionClusters.hepatic?.count || 0
  const cardioCount = conditionClusters.cardio?.count || 0
  const highRiskMembers = enriched.filter(m => m.riskScore >= 65)
  const averageRisk = Math.round(enriched.reduce((sum, m) => sum + m.riskScore, 0) / Math.max(enriched.length, 1))

  const confidence = Math.min(96, 62 + enriched.length * 2 + Object.keys(conditionClusters).length * 4)
  const prediction = oncologyCount >= 3
    ? { vi: 'Cụm ung thư đa thế hệ có tín hiệu di truyền / phơi nhiễm chung mạnh.', en: 'Multi-generation cancer clustering suggests a strong shared hereditary or exposure signal.' }
    : oncologyCount > 0
      ? { vi: 'Có tín hiệu ung thư gia đình cần theo dõi chủ động theo nhánh huyết thống gần.', en: 'Familial cancer signal detected; close bloodline branches need proactive monitoring.' }
      : { vi: 'Chưa thấy cụm ung thư rõ, ưu tiên phòng ngừa bệnh mạn tính.', en: 'No clear cancer cluster; prioritize chronic disease prevention.' }

  const recommendations = [
    oncologyCount > 0 && { icon: '🫁', vi: 'CT ngực liều thấp hằng năm cho nhánh có ung thư phổi hoặc hút thuốc / AQI cao.', en: 'Annual low-dose chest CT for branches with lung cancer or smoking / high-AQI exposure.' },
    hepaticCount > 0 && { icon: '🧫', vi: 'Tầm soát HBV/HCV, AFP và siêu âm gan mỗi 6 tháng cho nhánh có xơ gan/HCC.', en: 'HBV/HCV screening, AFP, and liver ultrasound every 6 months for cirrhosis/HCC branches.' },
    cardioCount > 0 && { icon: '❤️', vi: 'Theo dõi huyết áp, lipid, ECG và can thiệp lối sống cho nhánh tăng huyết áp/tim mạch.', en: 'Track blood pressure, lipids, ECG, and lifestyle interventions for cardiovascular branches.' },
    { icon: '🧬', vi: 'Xét nghiệm panel gen gia đình: EGFR, TP53, BRCA1/2, TERT nếu bác sĩ chỉ định.', en: 'Family gene panel: EGFR, TP53, BRCA1/2, TERT when clinically indicated.' },
  ].filter(Boolean)

  return {
    members: enriched.sort((a, b) => b.riskScore - a.riskScore),
    clusters: Object.values(conditionClusters).map(cluster => ({
      ...cluster,
      conditions: Array.from(cluster.conditions),
    })).sort((a, b) => b.count - a.count),
    edges,
    highRiskMembers,
    averageRisk,
    confidence,
    prediction,
    recommendations,
    logLines: [
      `GraphRAG indexed ${enriched.length} members and ${edges.length} relationship edges`,
      `Ontology clusters: ${Object.keys(conditionClusters).join(', ') || 'healthy baseline'}`,
      `Temporal memory seeded for ${highRiskMembers.length} high-risk profiles`,
      `ReportAgent confidence ${confidence}% · average familial risk ${averageRisk}%`,
    ],
  }
}

export default function FamilyMedicalRelationshipPanel({ patientId, onNext, onPrev, prevLabel }) {
  const { theme, lang, t } = useApp()
  const isDark = theme === 'dark'
  const [activeStage, setActiveStage] = useState('graph')
  const [selectedAgent, setSelectedAgent] = useState('report')
  const [members] = useState(() => loadMembers(patientId))
  const simulation = useMemo(() => buildSimulation(members), [members])

  const c = isDark ? {
    border:'rgba(255,255,255,0.08)', text:'#e8f0f8', text2:'rgba(232,240,248,0.62)', text3:'rgba(232,240,248,0.34)',
    surface:'rgba(255,255,255,0.03)', surface2:'rgba(255,255,255,0.06)', glow:'rgba(0,229,255,0.16)'
  } : {
    border:'rgba(0,0,0,0.09)', text:'#1a2035', text2:'#555', text3:'#999',
    surface:'rgba(255,255,255,0.88)', surface2:'rgba(0,0,0,0.04)', glow:'rgba(0,184,204,0.12)'
  }

  const selectedPersona = AGENT_PERSONAS.find(agent => agent.id === selectedAgent) || AGENT_PERSONAS[0]
  const stage = LIFECYCLE.find(item => item.key === activeStage) || LIFECYCLE[0]

  return (
    <div style={{ padding:28, display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10, color:'#00e5ff', fontFamily:'monospace', letterSpacing:'.16em', textTransform:'uppercase', marginBottom:8 }}>
            Zep-style memory · MiroFish-inspired lifecycle
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, color:c.text, margin:0 }}>
            🧩 {t('familyRelationship')}
          </h2>
          <p style={{ color:c.text2, fontSize:12, marginTop:6, maxWidth:820, lineHeight:1.6 }}>
            {lang === 'vi'
              ? 'Trang giả lập quan hệ tiền sử bệnh án gia đình từ dữ liệu đã nhập tại Family Medical Tree, biến thành Knowledge Graph, chạy multi-agent sandbox và tạo báo cáo dự báo.'
              : 'This page simulates family medical-history relationships from the Family Medical Tree input, transforms them into a Knowledge Graph, runs a multi-agent sandbox, and generates predictive reports.'}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Metric label={lang === 'vi' ? 'Thành viên' : 'Members'} value={simulation.members.length} color="#00e5ff" c={c} />
          <Metric label="GraphRAG" value={`${simulation.edges.length} edges`} color="#9c6fff" c={c} />
          <Metric label={lang === 'vi' ? 'Tin cậy' : 'Confidence'} value={`${simulation.confidence}%`} color="#00e676" c={c} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(260px, 0.92fr) minmax(320px, 1.28fr)', gap:16 }}>
        <section style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:16 }}>
          <SectionTitle icon="🧭" title={lang === 'vi' ? 'The Five-Stage Simulation Lifecycle' : 'The Five-Stage Simulation Lifecycle'} c={c} />
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {LIFECYCLE.map((item, index) => {
              const active = item.key === activeStage
              return (
                <button key={item.key} onClick={() => setActiveStage(item.key)} style={{
                  display:'grid', gridTemplateColumns:'34px 1fr', gap:10, textAlign:'left', cursor:'pointer',
                  border:`1px solid ${active ? 'rgba(0,229,255,0.42)' : c.border}`,
                  background: active ? 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(156,111,255,0.12))' : 'transparent',
                  borderRadius:12, padding:12, color:c.text, fontFamily:'inherit', boxShadow: active ? `0 0 24px ${c.glow}` : 'none',
                }}>
                  <div style={{ width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:c.surface2 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:active ? '#00e5ff' : c.text3, fontFamily:'monospace', marginBottom:3 }}>0{index + 1}</div>
                    <div style={{ fontSize:13, fontWeight:800 }}>{item.title[lang]}</div>
                    <div style={{ fontSize:11, color:c.text2, lineHeight:1.5, marginTop:4 }}>{item.copy[lang]}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:16, overflow:'hidden' }}>
          <SectionTitle icon={stage.icon} title={`${stage.title[lang]} · ${lang === 'vi' ? 'bản mô phỏng đang chạy' : 'running simulation'}`} c={c} />
          <div style={{ minHeight:290, position:'relative', border:`1px solid ${c.border}`, borderRadius:14, background:isDark ? 'radial-gradient(circle at 50% 42%, rgba(0,229,255,0.11), rgba(4,6,15,0.35) 42%, rgba(255,255,255,0.02))' : 'radial-gradient(circle at 50% 42%, rgba(0,184,204,0.14), rgba(255,255,255,0.86) 46%, rgba(0,0,0,0.02))', padding:18 }}>
            <RelationshipGraph members={simulation.members} edges={simulation.edges} isDark={isDark} lang={lang} />
          </div>
        </section>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr .9fr', gap:16 }}>
        <section style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:16 }}>
          <SectionTitle icon="🤖" title={lang === 'vi' ? 'Agent personas & deep interaction' : 'Agent personas & deep interaction'} c={c} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10, marginBottom:14 }}>
            {AGENT_PERSONAS.map(agent => {
              const active = selectedAgent === agent.id
              return (
                <button key={agent.id} onClick={() => setSelectedAgent(agent.id)} style={{
                  textAlign:'left', border:`1px solid ${active ? agent.color : c.border}`, background:active ? `${agent.color}16` : 'transparent', color:c.text,
                  borderRadius:12, padding:12, cursor:'pointer', fontFamily:'inherit'
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ width:30, height:30, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background:`${agent.color}22`, color:agent.color, fontWeight:800, fontFamily:'monospace', fontSize:11 }}>{agent.abbr}</span>
                    <strong style={{ fontSize:12 }}>{agent.name}</strong>
                  </div>
                  <div style={{ fontSize:11, color:c.text2, lineHeight:1.5 }}>{agent.focus[lang]}</div>
                </button>
              )
            })}
          </div>
          <div style={{ border:`1px solid ${selectedPersona.color}42`, background:`${selectedPersona.color}10`, borderRadius:14, padding:14 }}>
            <div style={{ fontSize:11, color:selectedPersona.color, fontFamily:'monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:10 }}>
              {selectedPersona.name} · Deep Interaction
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <ChatBubble align="left" c={c}>
                {lang === 'vi'
                  ? `${selectedPersona.name}: Tôi đã đọc collective memory từ ${simulation.members.length} hồ sơ và ${simulation.edges.length} cạnh quan hệ.`
                  : `${selectedPersona.name}: I loaded collective memory from ${simulation.members.length} profiles and ${simulation.edges.length} relationship edges.`}
              </ChatBubble>
              <ChatBubble align="right" c={c}>
                {lang === 'vi' ? 'Giải thích nhánh gia đình nào cần ưu tiên?' : 'Which family branch should be prioritized?'}
              </ChatBubble>
              <ChatBubble align="left" c={c}>
                {simulation.highRiskMembers.length
                  ? (lang === 'vi'
                    ? `Ưu tiên ${simulation.highRiskMembers.slice(0, 3).map(m => m.name).join(', ')} vì risk score ≥ 65 và có cụm bệnh cùng huyết thống.`
                    : `Prioritize ${simulation.highRiskMembers.slice(0, 3).map(m => m.name).join(', ')} because risk score ≥ 65 with same-bloodline clusters.`)
                  : (lang === 'vi' ? 'Chưa có thành viên vượt ngưỡng cao; duy trì tầm soát nền.' : 'No member exceeds the high-risk threshold; maintain baseline screening.')}
              </ChatBubble>
            </div>
          </div>
        </section>

        <section style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:16 }}>
          <SectionTitle icon="📈" title={lang === 'vi' ? 'ReportAgent predictive report' : 'ReportAgent predictive report'} c={c} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <Metric label={lang === 'vi' ? 'Risk trung bình' : 'Avg risk'} value={`${simulation.averageRisk}%`} color="#ffb74d" c={c} />
            <Metric label={lang === 'vi' ? 'Hồ sơ cao' : 'High profiles'} value={simulation.highRiskMembers.length} color="#ff5252" c={c} />
          </div>
          <div style={{ border:`1px solid ${c.border}`, borderRadius:12, padding:12, marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#00e5ff', marginBottom:6 }}>Predictive insight</div>
            <div style={{ fontSize:12, color:c.text2, lineHeight:1.6 }}>{simulation.prediction[lang]}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {simulation.recommendations.map((rec, index) => (
              <div key={index} style={{ display:'grid', gridTemplateColumns:'28px 1fr', gap:8, border:`1px solid ${c.border}`, borderRadius:10, padding:10 }}>
                <span>{rec.icon}</span>
                <span style={{ fontSize:11, color:c.text2, lineHeight:1.55 }}>{rec[lang]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <section style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:16 }}>
          <SectionTitle icon="🗂️" title={lang === 'vi' ? 'Knowledge Graph clusters' : 'Knowledge Graph clusters'} c={c} />
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {simulation.clusters.map(cluster => (
              <div key={cluster.type} style={{ border:`1px solid ${c.border}`, borderRadius:12, padding:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                  <strong style={{ color:c.text, fontSize:12, textTransform:'capitalize' }}>{cluster.type}</strong>
                  <span style={{ color:'#00e5ff', fontSize:11, fontFamily:'monospace' }}>{cluster.count} signals</span>
                </div>
                <div style={{ fontSize:11, color:c.text2, lineHeight:1.5 }}>{cluster.conditions.join(' · ')}</div>
                <div style={{ marginTop:8, display:'flex', gap:5, flexWrap:'wrap' }}>
                  {cluster.members.slice(0, 6).map(name => <Tag key={name} text={name} color="#9c6fff" />)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:16 }}>
          <SectionTitle icon="🧾" title={lang === 'vi' ? 'Simulation logs' : 'Simulation logs'} c={c} />
          <div style={{ background:isDark ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.04)', border:`1px solid ${c.border}`, borderRadius:12, padding:14, fontFamily:'monospace', fontSize:11, color:c.text2, lineHeight:1.8 }}>
            {simulation.logLines.map((line, index) => (
              <div key={line}><span style={{ color:'#00e5ff' }}>[T+{String(index * 7).padStart(2, '0')}s]</span> {line}</div>
            ))}
          </div>
        </section>
      </div>

      <NavButtons onNext={onNext} nextLabel={`${t('next')} →`} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}

function RelationshipGraph({ members, edges, isDark, lang }) {
  const shownMembers = members.slice(0, 9)
  const center = shownMembers.find(m => m.relation === 'self') || shownMembers[0]
  const ringMembers = shownMembers.filter(m => m.id !== center?.id)

  return (
    <div style={{ position:'relative', minHeight:250 }}>
      {edges.slice(0, 12).map((edge, index) => (
        <div key={`${edge.from.id}-${edge.to.id}-${index}`} style={{
          position:'absolute', left:`${18 + (index % 4) * 18}%`, top:`${22 + Math.floor(index / 4) * 22}%`, width:'28%', height:1,
          background: edge.type === 'first-degree' ? 'rgba(0,229,255,0.38)' : 'rgba(156,111,255,0.28)', transform:`rotate(${index % 2 ? -12 : 12}deg)`, transformOrigin:'left center'
        }} />
      ))}
      {center && <GraphNode member={center} style={{ left:'50%', top:'44%', transform:'translate(-50%, -50%)', zIndex:2 }} large lang={lang} isDark={isDark} />}
      {ringMembers.map((member, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(ringMembers.length, 1) - Math.PI / 2
        const radiusX = 38
        const radiusY = 34
        const left = 50 + Math.cos(angle) * radiusX
        const top = 45 + Math.sin(angle) * radiusY
        return <GraphNode key={member.id} member={member} style={{ left:`${left}%`, top:`${top}%`, transform:'translate(-50%, -50%)' }} lang={lang} isDark={isDark} />
      })}
    </div>
  )
}

function GraphNode({ member, style, large, lang, isDark }) {
  const meta = RELATION_META[member.relation] || RELATION_META.self
  return (
    <div style={{ position:'absolute', width:large ? 138 : 112, padding:large ? 12 : 10, borderRadius:14, background:isDark ? 'rgba(5,8,18,0.92)' : 'rgba(255,255,255,0.96)', border:`1px solid ${meta.color}66`, boxShadow:`0 8px 26px ${meta.color}18`, textAlign:'center', ...style }}>
      <div style={{ width:large ? 42 : 32, height:large ? 42 : 32, borderRadius:'50%', margin:'0 auto 6px', background:`${meta.color}22`, color:meta.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:large ? 19 : 15 }}>
        {member.alive === false ? '🕊️' : member.gender === 'F' ? '👩' : '👨'}
      </div>
      <div style={{ fontSize:large ? 12 : 10, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{member.name}</div>
      <div style={{ fontSize:9, color:meta.color, marginTop:3 }}>{meta[lang]} · {member.riskScore}%</div>
    </div>
  )
}

function SectionTitle({ icon, title, c }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
      <span>{icon}</span>
      <span style={{ fontSize:10, letterSpacing:'.12em', color:c.text3, textTransform:'uppercase', fontFamily:'monospace', fontWeight:700 }}>{title}</span>
    </div>
  )
}

function Metric({ label, value, color, c }) {
  return (
    <div style={{ minWidth:96, background:`${color}10`, border:`1px solid ${color}2f`, borderRadius:12, padding:'10px 12px' }}>
      <div style={{ fontSize:9, color:c.text3, fontFamily:'monospace', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:900, color }}>{value}</div>
    </div>
  )
}

function Tag({ text, color }) {
  return <span style={{ fontSize:9, color, background:`${color}14`, border:`1px solid ${color}28`, padding:'3px 7px', borderRadius:999 }}>{text}</span>
}

function ChatBubble({ children, align, c }) {
  const isRight = align === 'right'
  return (
    <div style={{ alignSelf:isRight ? 'flex-end' : 'flex-start', maxWidth:'84%', background:isRight ? 'rgba(0,229,255,0.12)' : c.surface2, border:`1px solid ${isRight ? 'rgba(0,229,255,0.25)' : c.border}`, borderRadius:12, padding:'9px 11px', fontSize:11, color:c.text2, lineHeight:1.5 }}>
      {children}
    </div>
  )
}
