import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import NavButtons from './NavButtons.jsx'

const SOURCE_URL = 'https://suckhoedoisong.vn/long-chau-tam-soat-hpv-mien-phi-cho-hang-tram-khach-hang-ra-mat-giai-phap-nhan-dien-som-nguy-co-ung-thu-co-tu-cung-169260313102804621.htm?utm_source=chatgpt.com'
const FDA_GARDASIL_URL = 'https://www.fda.gov/files/vaccines,%20blood%20&%20biologics/published/Clinical-Review-(STN-125508-0)---GARDASIL-9.pdf'
const CLINICAL_TRIALS_URL = 'https://cdn.clinicaltrials.gov/large-docs/30/NCT03036930/Prot_SAP_ICF_001.pdf'

const LONG_CHAU_OUTPUT = 'https://drive.google.com/file/d/1KhVVe3SVnSVXP1bBfEm5ePQB-z9bo3zG/view?usp=drive_link'
const FDA_OUTPUT = 'https://drive.google.com/file/d/1VgU7QboNHPcLAS6E9U2_vjeGt5pBB9ja/view?usp=drive_link'
const CLINICAL_OUTPUT = 'https://drive.google.com/file/d/1EUWk9GJFpX8yOaLyBBDnTClZShx0r9__/view?usp=drive_link'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeTrialPoint(index, category, xBase, xWave, yBase, yWave, spread = 0.6) {
  const age = clamp(Number((xBase + Math.sin(index * 1.9) * xWave + (index % 4 - 1.5) * spread).toFixed(1)), 9, 45)
  const value = clamp(Number((yBase + Math.cos(index * 1.05) * yWave + (index % 6 - 2.5) * spread).toFixed(1)), 0, 105)
  return { id: `${category}-${index}`, x: age, y: value, category }
}

function makeDosePoint(index, category, ageBase, ageWave, doseBase = 0.5, spread = 0.01) {
  const age = clamp(Number((ageBase + Math.sin(index * 1.5) * ageWave + (index % 5 - 2) * 0.6).toFixed(1)), 9, 45)
  const dose = clamp(Number((doseBase + Math.cos(index * 1.31) * 0.035 + (index % 4 - 1.5) * spread).toFixed(3)), 0.42, 0.58)
  return { id: `${category}-${index}`, x: age, y: dose, category }
}

const DATASETS = [
  {
    id: 'longChau',
    label: 'Long Châu HPV screening',
    inputUrl: SOURCE_URL,
    outputUrl: LONG_CHAU_OUTPUT,
    sourceLabel: 'INPUT 01 · suckhoedoisong.vn',
    outputLabel: 'OUTPUT 01 · hpv_longchau_scatter.html',
    title: 'Long Châu · HPV screening signal',
    subtitle: 'Dữ liệu mô phỏng từ chương trình tầm soát HPV miễn phí: tập trung vào khoảng trống sàng lọc, nguy cơ HPV 16/18 và nhóm đã tiêm vắc xin.',
    xLabel: 'Tuổi khách hàng',
    yLabel: 'Tín hiệu HPV (0–100)',
    xMin: 18,
    xMax: 55,
    yMin: 0,
    yMax: 100,
    xTicks: [20, 30, 40, 50],
    yTicks: [20, 40, 60, 80, 100],
    highlight: { x1: 30, x2: 49, label: '30–49: screening gap' },
    facts: [
      { value: '>500', label: 'khách hàng nữ được tiếp cận kit test nhanh' },
      { value: '99%', label: 'ca ung thư cổ tử cung có sự hiện diện HPV' },
      { value: '80%', label: 'phụ nữ ước tính từng nhiễm HPV một lần trong đời' },
      { value: '28%', label: 'phụ nữ Việt 30–49 từng sàng lọc ung thư cổ tử cung' },
      { value: '70%', label: 'mục tiêu WHO về sàng lọc trước tuổi 35' },
    ],
    filters: [
      { id: 'hpvPositive', label: 'HPV dương tính', color: 'var(--cyan)', description: 'Tụ ở nhóm 20–50 tuổi, khớp đỉnh dịch tễ học.' },
      { id: 'hpv1618', label: 'HPV 16/18 nguy cơ cao', color: 'var(--red)', description: 'Cụm dày giữa biểu đồ; 2 chủng liên quan khoảng 70% ung thư cổ tử cung.' },
      { id: 'unscreened', label: 'Chưa từng tầm soát', color: 'var(--amber)', description: 'Lan rộng vùng 30–49 tuổi, phản ánh khoảng trống khi chỉ 28% từng sàng lọc.' },
      { id: 'vaccinated', label: 'Đã tiêm vắc xin', color: 'var(--green)', description: 'Tập trung góc trái, nổi bật nhóm trẻ dưới 30.' },
    ],
    points: [
      ...Array.from({ length: 30 }, (_, i) => makeTrialPoint(i, 'hpvPositive', 35, 14, 64, 20, 1.8)),
      ...Array.from({ length: 22 }, (_, i) => makeTrialPoint(i, 'hpv1618', 38, 8, 78, 13, 1.2)),
      ...Array.from({ length: 28 }, (_, i) => makeTrialPoint(i, 'unscreened', 40, 10, 45, 23, 2.3)),
      ...Array.from({ length: 20 }, (_, i) => makeTrialPoint(i, 'vaccinated', 25, 6, 22, 14, 1.4)),
    ],
    outcome: 'Biểu đồ dùng tín hiệu HPV thay cho liều thuốc để nhận diện nhóm cần tầm soát, chủng nguy cơ cao và tác động của vắc xin.',
  },
  {
    id: 'v503Efficacy',
    label: 'FDA · V503-001 efficacy',
    inputUrl: FDA_GARDASIL_URL,
    outputUrl: FDA_OUTPUT,
    sourceLabel: 'INPUT 02 · FDA clinical review',
    outputLabel: 'OUTPUT 02 · gardasil9_v503_efficacy.html',
    title: 'Gardasil 9 · V503-001 efficacy trial',
    subtitle: 'Mẫu mô phỏng bám thiết kế V503-001: 105 địa điểm tại 18 quốc gia, nữ 16–26 tuổi, ngẫu nhiên 1:1 giữa Gardasil 9 và Gardasil 4, theo dõi trung vị khoảng 40 tháng.',
    xLabel: 'Tuổi theo tiêu chí tuyển chọn V503-001',
    yLabel: 'Hiệu quả / sinh kháng thể (%)',
    xMin: 16,
    xMax: 26,
    yMin: 0,
    yMax: 105,
    xTicks: [16, 18, 20, 22, 24, 26],
    yTicks: [25, 50, 75, 97, 100],
    highlight: { x1: 16, x2: 26, label: 'V503-001: women 16–26' },
    facts: [
      { value: '14.215', label: 'người trong efficacy substudy V503-001' },
      { value: '7.106', label: 'người ở nhóm Gardasil 9' },
      { value: '7.109', label: 'người ở nhóm Gardasil 4 đối chứng' },
      { value: '105', label: 'study centers tại 18 quốc gia' },
      { value: '~40m', label: 'thời gian theo dõi trung vị sau Day 1' },
    ],
    filters: [
      { id: 'gardasil9', label: 'Nhóm Gardasil 9', color: 'var(--cyan)', description: 'Ngẫu nhiên 1:1 so với Gardasil 4; 7.106 người ở nhánh 9vHPV.' },
      { id: 'baselineHpv', label: 'HPV dương tính khi tuyển chọn', color: 'var(--amber)', description: 'Người đã nhiễm HPV vẫn được tuyển nhưng loại khỏi phân tích hiệu quả chính.' },
      { id: 'ppe', label: 'Per-protocol population (PPE)', color: 'var(--green)', description: 'Nhóm đủ điều kiện cho phân tích hiệu quả xấp xỉ 97%.' },
      { id: 'serology', label: 'Sinh kháng thể', color: 'var(--violet)', description: 'Hiệu quả ~97% với HPV 31/33/45/52/58 và duy trì ≥99% với HPV 6/11/16/18.' },
    ],
    points: [
      ...Array.from({ length: 32 }, (_, i) => makeTrialPoint(i, 'gardasil9', 21, 4.5, 88, 8, 0.5)),
      ...Array.from({ length: 22 }, (_, i) => makeTrialPoint(i, 'baselineHpv', 21, 4.6, 36, 20, 0.8)),
      ...Array.from({ length: 28 }, (_, i) => makeTrialPoint(i, 'ppe', 21, 4.1, 96, 3.2, 0.4)),
      ...Array.from({ length: 26 }, (_, i) => makeTrialPoint(i, 'serology', 21, 4.0, 99, 1.8, 0.3)),
    ],
    outcome: 'Phân phối tuổi chuyển từ Long Châu 18–55 sang 16–26 đúng tiêu chí V503-001; các lớp dữ liệu phản ánh ngẫu nhiên hóa, HPV nền, PPE và sinh kháng thể.',
  },
  {
    id: 'gardasilSafety',
    label: 'ClinicalTrials · safety profile',
    inputUrl: CLINICAL_TRIALS_URL,
    outputUrl: CLINICAL_OUTPUT,
    sourceLabel: 'INPUT 03 · ClinicalTrials protocol/SAP',
    outputLabel: 'OUTPUT 03 · gardasil9_safety_dose.html',
    title: 'Gardasil 9 · age cohorts and dose safety',
    subtitle: 'Mẫu bệnh nhân mô phỏng theo thử nghiệm Gardasil 9: trục X theo nhóm tuổi 9–15, 16–26, 27–45; trục Y là liều tiêm chuẩn 0,5 mL với jitter nhỏ để tránh chồng điểm.',
    xLabel: 'Tuổi thực tế theo thử nghiệm',
    yLabel: 'Liều tiêm Gardasil 9 (mL)',
    xMin: 9,
    xMax: 45,
    yMin: 0.42,
    yMax: 0.58,
    xTicks: [9, 15, 16, 26, 27, 45],
    yTicks: [0.45, 0.5, 0.55],
    highlight: { x1: 16, x2: 26, label: '16–26: main adult cohort' },
    facts: [
      { value: '15.703', label: 'người tham gia trong mẫu thử nghiệm' },
      { value: '9.097', label: 'nữ 16–26 tuổi' },
      { value: '1.394', label: 'nam 16–26 tuổi' },
      { value: '5.212', label: 'trẻ 9–15 tuổi' },
      { value: '0.5 mL', label: 'liều tiêm bắp chuẩn lịch 0–2–6 tháng' },
    ],
    filters: [
      { id: 'age9to15', label: '9–15 tuổi', color: 'var(--cyan)', description: 'Nhóm trẻ, chiếm khoảng 40% mẫu mô phỏng; headache nữ 9–15 khoảng 11,4%.' },
      { id: 'age16to26', label: '16–26 tuổi', color: 'var(--green)', description: 'Nhóm chính 16–26, chiếm khoảng 45%; headache nữ 16–26 khoảng 14,6%.' },
      { id: 'age27to45', label: '27–45 tuổi', color: 'var(--amber)', description: 'Nhóm mở rộng 27–45, khoảng 15% để quan sát vùng tuổi lớn hơn.' },
      { id: 'safetySignal', label: 'Tín hiệu AE / SAE', color: 'var(--red)', description: 'Chóng mặt 4,66%, ngất 4,77% dưới 18 tuổi; SAE toàn mẫu khoảng 2,3%.' },
    ],
    points: [
      ...Array.from({ length: 32 }, (_, i) => makeDosePoint(i, 'age9to15', 12, 3.0, 0.5, 0.008)),
      ...Array.from({ length: 36 }, (_, i) => makeDosePoint(i, 'age16to26', 21, 5.0, 0.5, 0.008)),
      ...Array.from({ length: 12 }, (_, i) => makeDosePoint(i, 'age27to45', 36, 8.5, 0.5, 0.008)),
      ...Array.from({ length: 16 }, (_, i) => makeDosePoint(i, 'safetySignal', 17, 8.0, 0.535, 0.012)),
    ],
    outcome: 'Biểu đồ cập nhật trục tuổi 9–45, chia ba màu theo nhóm thử nghiệm và giữ liều chuẩn 0,5 mL; lớp AE/SAE giúp quan sát nhức đầu, chóng mặt, ngất và SAE.',
  },
]

function Card({ children, style }) {
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 18, padding: 18, ...style }}>
      {children}
    </div>
  )
}

function SourceMetric({ fact }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--cyan)', fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 900 }}>{fact.value}</div>
      <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 5, lineHeight: 1.45 }}>{fact.label}</div>
    </div>
  )
}

function DatasetPicker({ datasets, selectedId, draftLink, onSelect, onDraftChange, onAddLink }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 900 }}>INPUT list</div>
      <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 4 }}>Chọn link để load OUTPUT / OUTCOME tương ứng, hoặc dán thêm link mới.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {datasets.map((dataset, index) => (
          <button key={dataset.id} type="button" onClick={() => onSelect(dataset.id)} style={{
            textAlign: 'left', borderRadius: 12, padding: 11, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${selectedId === dataset.id ? 'var(--cyan)' : 'var(--border)'}`,
            background: selectedId === dataset.id ? 'rgba(0,229,255,0.08)' : 'var(--surface2)',
            color: 'var(--text)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11, color: selectedId === dataset.id ? 'var(--cyan)' : 'var(--text2)', fontWeight: 900 }}>{String(index + 1).padStart(2, '0')} · {dataset.label}</span>
              <span style={{ color: dataset.outputUrl ? 'var(--green)' : 'var(--amber)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{dataset.outputUrl ? 'OUTPUT' : 'PENDING'}</span>
            </div>
            <div style={{ color: 'var(--text3)', fontSize: 9, marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dataset.inputUrl}</div>
          </button>
        ))}
      </div>
      <textarea
        value={draftLink}
        onChange={e => onDraftChange(e.target.value)}
        placeholder="Dán thêm một hoặc nhiều link INPUT, mỗi link một dòng..."
        style={{ width: '100%', minHeight: 78, marginTop: 12, resize: 'vertical', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: 11, fontFamily: 'inherit', fontSize: 11 }}
      />
      <button type="button" onClick={onAddLink} style={{ marginTop: 9, width: '100%', border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.08)', color: 'var(--cyan)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
        + Add INPUT links
      </button>
    </Card>
  )
}

function FilterButton({ filter, active, count, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      textAlign: 'left', width: '100%', cursor: 'pointer', padding: 14,
      borderRadius: 14, fontFamily: 'inherit',
      background: active ? `${filter.color}18` : 'var(--surface)',
      border: `1px solid ${active ? filter.color : 'var(--border)'}`,
      color: 'var(--text)',
      transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease',
    }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 900 }}>{filter.label}</span>
        <span style={{ color: filter.color, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900 }}>{count}</span>
      </div>
      <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 7, lineHeight: 1.45 }}>{filter.description}</div>
    </button>
  )
}

function DynamicScatterChart({ dataset, activeFilter, onSelectFilter }) {
  const width = 720
  const height = 430
  const pad = { left: 64, right: 24, top: 30, bottom: 58 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const activeMeta = dataset.filters.find(filter => filter.id === activeFilter) || dataset.filters[0]
  const x = (value) => pad.left + ((value - dataset.xMin) / (dataset.xMax - dataset.xMin)) * chartW
  const y = (value) => pad.top + (1 - (value - dataset.yMin) / (dataset.yMax - dataset.yMin)) * chartH

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${dataset.title} interactive chart`} style={{ width: '100%', minWidth: 620, display: 'block' }}>
        <defs>
          <radialGradient id={`glow-${dataset.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} rx="18" fill="rgba(0,0,0,0.16)" />
        {dataset.yTicks.map(tick => (
          <g key={`y-${tick}`}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeDasharray="4 8" />
            <text x={pad.left - 12} y={y(tick) + 4} textAnchor="end" fill="var(--text3)" fontSize="11" fontFamily="var(--font-mono)">{tick}</text>
          </g>
        ))}
        {dataset.xTicks.map(tick => (
          <g key={`x-${tick}`}>
            <line x1={x(tick)} x2={x(tick)} y1={pad.top} y2={height - pad.bottom} stroke="var(--border)" strokeDasharray="2 10" />
            <text x={x(tick)} y={height - 28} textAnchor="middle" fill="var(--text3)" fontSize="11" fontFamily="var(--font-mono)">{tick}</text>
          </g>
        ))}
        {dataset.highlight && (
          <>
            <rect x={x(dataset.highlight.x1)} y={pad.top} width={x(dataset.highlight.x2) - x(dataset.highlight.x1)} height={chartH} fill="rgba(255,183,77,0.06)" stroke="rgba(255,183,77,0.16)" strokeDasharray="6 8" />
            <text x={(x(dataset.highlight.x1) + x(dataset.highlight.x2)) / 2} y={pad.top + 18} textAnchor="middle" fill="var(--amber)" fontSize="11" fontFamily="var(--font-mono)">{dataset.highlight.label}</text>
          </>
        )}
        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="var(--border2)" />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="var(--border2)" />
        <text x={width / 2} y={height - 8} textAnchor="middle" fill="var(--text2)" fontSize="12">{dataset.xLabel}</text>
        <text transform={`translate(16 ${height / 2}) rotate(-90)`} textAnchor="middle" fill="var(--text2)" fontSize="12">{dataset.yLabel}</text>
        {dataset.points.map(point => {
          const filter = dataset.filters.find(item => item.id === point.category)
          const isActive = point.category === activeFilter
          return (
            <g key={point.id} style={{ cursor: 'pointer' }} onClick={() => onSelectFilter(point.category)}>
              {isActive && <circle cx={x(point.x)} cy={y(point.y)} r="13" fill={`url(#glow-${dataset.id})`} opacity="0.18" />}
              <circle cx={x(point.x)} cy={y(point.y)} r={isActive ? 7 : 4.6} fill={filter.color} opacity={isActive ? 0.96 : 0.22} stroke={isActive ? '#fff' : 'transparent'} strokeWidth={isActive ? 1.5 : 0}>
                <title>{`${filter.label}: ${dataset.xLabel} ${point.x}, ${dataset.yLabel} ${point.y}`}</title>
              </circle>
            </g>
          )
        })}
        <g transform={`translate(${width - 266} ${height - 82})`}>
          <rect width="238" height="52" rx="12" fill="rgba(4,6,15,0.78)" stroke="var(--border2)" />
          <circle cx="20" cy="26" r="7" fill={activeMeta.color} />
          <text x="36" y="22" fill="var(--text)" fontSize="12" fontWeight="800">{activeMeta.label}</text>
          <text x="36" y="39" fill="var(--text3)" fontSize="10">Click điểm hoặc bộ lọc để đổi lớp dữ liệu</text>
        </g>
      </svg>
    </div>
  )
}

function createCustomDataset(link, index) {
  const filterId = `custom-${index}-pending`
  return {
    id: `custom-${index}`,
    label: `Custom INPUT ${index + 1}`,
    inputUrl: link,
    outputUrl: '',
    sourceLabel: `CUSTOM INPUT ${index + 1}`,
    outputLabel: 'OUTPUT pending · AI extraction needed',
    title: 'Custom INPUT · pending AI extraction',
    subtitle: 'Link mới đã được thêm vào danh sách. Khi backend extraction được nối vào, OUTPUT / OUTCOME tương ứng có thể render chart thật từ nguồn này.',
    xLabel: 'Record index',
    yLabel: 'Pending signal',
    xMin: 0,
    xMax: 10,
    yMin: 0,
    yMax: 100,
    xTicks: [0, 2, 4, 6, 8, 10],
    yTicks: [20, 40, 60, 80, 100],
    highlight: null,
    facts: [
      { value: 'NEW', label: 'INPUT vừa được user thêm vào danh sách' },
      { value: 'WAIT', label: 'đang chờ mapping OUTPUT tương ứng' },
      { value: 'AI', label: 'sẵn sàng cho bước trích xuất dữ liệu' },
      { value: 'URL', label: link.replace(/^https?:\/\//, '').slice(0, 36) },
      { value: '0', label: 'chart thật chưa được sinh cho custom link' },
    ],
    filters: [
      { id: filterId, label: 'Pending extraction', color: 'var(--amber)', description: 'Custom link đã được lưu trong phiên UI; cần pipeline AI để tạo OUTPUT chart riêng.' },
    ],
    points: Array.from({ length: 8 }, (_, i) => ({ id: `${filterId}-${i}`, x: i + 1, y: 18 + i * 8, category: filterId })),
    outcome: 'Custom INPUT chưa có OUTPUT Drive tương ứng. UI đã chọn được link này và hiển thị trạng thái chờ phân tích.',
  }
}

export default function StatisticalAnalysisPanel({ onNext, onPrev, prevLabel }) {
  const { t } = useApp()
  const [selectedDatasetId, setSelectedDatasetId] = useState(DATASETS[0].id)
  const [activeFilters, setActiveFilters] = useState(() => Object.fromEntries(DATASETS.map(dataset => [dataset.id, dataset.filters[0].id])))
  const [draftLink, setDraftLink] = useState('')
  const [customLinks, setCustomLinks] = useState([])

  const allDatasets = useMemo(() => [
    ...DATASETS,
    ...customLinks.map((link, index) => createCustomDataset(link, index)),
  ], [customLinks])
  const selectedDataset = allDatasets.find(dataset => dataset.id === selectedDatasetId) || DATASETS[0]
  const activeFilter = activeFilters[selectedDataset.id] || selectedDataset.filters[0].id

  const filteredStats = useMemo(() => {
    const activePoints = selectedDataset.points.filter(point => point.category === activeFilter)
    const avgX = activePoints.length ? Number((activePoints.reduce((sum, point) => sum + point.x, 0) / activePoints.length).toFixed(1)) : 0
    const avgY = activePoints.length ? Number((activePoints.reduce((sum, point) => sum + point.y, 0) / activePoints.length).toFixed(2)) : 0
    return { count: activePoints.length, avgX, avgY }
  }, [activeFilter, selectedDataset])

  const handleAddLink = () => {
    const links = draftLink.split(/\n|,|\s+/).map(link => link.trim()).filter(link => /^https?:\/\//i.test(link))
    if (!links.length) return
    setCustomLinks(prev => [...prev, ...links])
    setDraftLink('')
  }

  const handleSelectFilter = (filterId) => {
    setActiveFilters(prev => ({ ...prev, [selectedDataset.id]: filterId }))
  }

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card style={{ background: 'radial-gradient(circle at 12% 15%, rgba(0,229,255,0.18), transparent 34%), radial-gradient(circle at 86% 12%, rgba(255,82,82,0.12), transparent 28%), var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '0.14em' }}>AI AGENT STATISTICAL ANALYSIS</div>
            <h2 style={{ color: 'var(--text)', fontSize: 26, fontWeight: 900, marginTop: 8 }}>{t('statAnalysisTitle')}</h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 7, lineHeight: 1.65 }}>{t('statAnalysisSubtitle')}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
            <a href={selectedDataset.inputUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none', fontSize: 11, fontFamily: 'var(--font-mono)', border: '1px solid rgba(0,229,255,0.28)', borderRadius: 999, padding: '8px 11px', background: 'rgba(0,229,255,0.07)' }}>{selectedDataset.sourceLabel} ↗</a>
            {selectedDataset.outputUrl ? (
              <a href={selectedDataset.outputUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--violet)', textDecoration: 'none', fontSize: 11, fontFamily: 'var(--font-mono)', border: '1px solid rgba(156,111,255,0.3)', borderRadius: 999, padding: '8px 11px', background: 'rgba(156,111,255,0.08)' }}>{selectedDataset.outputLabel} ↗</a>
            ) : (
              <span style={{ color: 'var(--amber)', fontSize: 11, fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,183,77,0.3)', borderRadius: 999, padding: '8px 11px', background: 'rgba(255,183,77,0.08)' }}>{selectedDataset.outputLabel}</span>
            )}
          </div>
        </div>
      </Card>

      <div className="stat-analysis-workspace" style={{ display: 'grid', gridTemplateColumns: '330px minmax(0, 1fr)', gap: 16 }}>
        <DatasetPicker
          datasets={allDatasets}
          selectedId={selectedDataset.id}
          draftLink={draftLink}
          onSelect={setSelectedDatasetId}
          onDraftChange={setDraftLink}
          onAddLink={handleAddLink}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ color: 'var(--text)', fontSize: 17, fontWeight: 900 }}>{selectedDataset.title}</div>
            <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 7, lineHeight: 1.6 }}>{selectedDataset.subtitle}</p>
          </Card>

          <div className="stat-analysis-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
            {selectedDataset.facts.map(fact => <SourceMetric key={fact.label} fact={fact} />)}
          </div>

          <div className="stat-analysis-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', gap: 16 }}>
            <Card style={{ padding: 12 }}>
              <DynamicScatterChart dataset={selectedDataset} activeFilter={activeFilter} onSelectFilter={handleSelectFilter} />
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 900 }}>{t('statFiltersTitle')}</div>
                <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 4 }}>{t('statFiltersHint')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 13 }}>
                  {selectedDataset.filters.map(filter => (
                    <FilterButton key={filter.id} filter={filter} active={activeFilter === filter.id} count={selectedDataset.points.filter(point => point.category === filter.id).length} onClick={() => handleSelectFilter(filter.id)} />
                  ))}
                </div>
              </Card>

              <Card style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(255,183,77,0.08))' }}>
                <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 900 }}>{t('statOutcomeTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                  <div><div style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900 }}>{filteredStats.count}</div><div style={{ color: 'var(--text3)', fontSize: 9 }}>điểm</div></div>
                  <div><div style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900 }}>{filteredStats.avgX}</div><div style={{ color: 'var(--text3)', fontSize: 9 }}>X trung bình</div></div>
                  <div><div style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900 }}>{filteredStats.avgY}</div><div style={{ color: 'var(--text3)', fontSize: 9 }}>Y trung bình</div></div>
                </div>
                <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 12, lineHeight: 1.55 }}>{selectedDataset.outcome}</p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <NavButtons onNext={onNext} nextLabel={t('continueAiCouncil')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
