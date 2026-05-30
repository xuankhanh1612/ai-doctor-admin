import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import NavButtons from './NavButtons.jsx'

const SOURCE_URL = 'https://suckhoedoisong.vn/long-chau-tam-soat-hpv-mien-phi-cho-hang-tram-khach-hang-ra-mat-giai-phap-nhan-dien-som-nguy-co-ung-thu-co-tu-cung-169260313102804621.htm?utm_source=chatgpt.com'
const FDA_GARDASIL_URL = 'https://www.fda.gov/files/vaccines,%20blood%20&%20biologics/published/Clinical-Review-(STN-125508-0)---GARDASIL-9.pdf'
const CLINICAL_TRIALS_URL = 'https://cdn.clinicaltrials.gov/large-docs/30/NCT03036930/Prot_SAP_ICF_001.pdf'

const LONG_CHAU_OUTPUT = 'https://drive.google.com/file/d/1KhVVe3SVnSVXP1bBfEm5ePQB-z9bo3zG/view?usp=drive_link'
const FDA_OUTPUT = 'https://drive.google.com/file/d/1VgU7QboNHPcLAS6E9U2_vjeGt5pBB9ja/view?usp=drive_link'
const CLINICAL_OUTPUT = 'https://drive.google.com/file/d/1EUWk9GJFpX8yOaLyBBDnTClZShx0r9__/view?usp=drive_link'

const CUSTOM_DATASET_STORAGE_KEY = 'cdoc_stat_analysis_pairs'

function loadStoredDatasetPairs() {
  try {
    const raw = localStorage.getItem(CUSTOM_DATASET_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(pair => pair?.inputUrl && pair?.outputUrl) : []
  } catch {
    return []
  }
}

function saveStoredDatasetPairs(pairs) {
  localStorage.setItem(CUSTOM_DATASET_STORAGE_KEY, JSON.stringify(pairs))
}

const HTML_COLOR_MAP = {
  'var(--cyan)': '#00e5ff',
  'var(--green)': '#00e676',
  'var(--amber)': '#ffb74d',
  'var(--red)': '#ff5252',
  'var(--violet)': '#9c6fff',
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildOutputHtml(dataset) {
  const safeDataset = {
    ...dataset,
    filters: dataset.filters.map(filter => ({
      ...filter,
      color: HTML_COLOR_MAP[filter.color] || filter.color,
    })),
  }
  const serializedDataset = JSON.stringify(safeDataset).replace(/</g, '\\u003c')

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(dataset.outputLabel)}</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 12% 10%, rgba(0,229,255,.20), transparent 28%), radial-gradient(circle at 90% 10%, rgba(156,111,255,.18), transparent 30%), #070b18; color: #e8f0f8; }
    .wrap { padding: 22px; max-width: 1100px; margin: 0 auto; }
    .eyebrow { color: #00e5ff; font: 800 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 8px 0 6px; font-size: clamp(22px, 3vw, 34px); line-height: 1.1; }
    p { margin: 0; color: rgba(232,240,248,.68); font-size: 13px; line-height: 1.65; }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 14px; margin-top: 18px; }
    .card { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); border-radius: 18px; padding: 14px; box-shadow: 0 18px 50px rgba(0,0,0,.22); }
    svg { width: 100%; min-height: 430px; display: block; background: rgba(0,0,0,.18); border-radius: 16px; }
    .filters { display: flex; flex-direction: column; gap: 10px; }
    button { text-align: left; cursor: pointer; color: #e8f0f8; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 12px; background: rgba(255,255,255,.04); font: inherit; transition: transform .18s ease, border-color .18s ease, background .18s ease; }
    button:hover { transform: translateY(-2px); }
    button.active { background: color-mix(in srgb, var(--filter-color) 16%, transparent); border-color: var(--filter-color); }
    .filter-title { display: flex; justify-content: space-between; gap: 10px; align-items: center; font-weight: 900; font-size: 13px; }
    .filter-desc { color: rgba(232,240,248,.48); font-size: 10px; line-height: 1.45; margin-top: 6px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    .stat { border: 1px solid rgba(255,255,255,.10); border-radius: 12px; padding: 10px; background: rgba(255,255,255,.04); }
    .stat b { display: block; color: #00e5ff; font: 900 20px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .stat span { color: rgba(232,240,248,.45); font-size: 9px; }
    .outcome { margin-top: 12px; padding: 12px; border: 1px solid rgba(255,183,77,.24); border-radius: 14px; background: rgba(255,183,77,.08); color: rgba(232,240,248,.76); font-size: 12px; line-height: 1.55; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="eyebrow">Rendered OUTPUT HTML · interactive</div>
    <h1>${escapeHtml(dataset.title)}</h1>
    <p>${escapeHtml(dataset.subtitle)}</p>
    <section class="grid">
      <div class="card"><svg id="chart" viewBox="0 0 760 460" role="img" aria-label="interactive output chart"></svg></div>
      <aside class="card">
        <div class="eyebrow" style="margin-bottom:10px">Filters</div>
        <div id="filters" class="filters"></div>
        <div class="stats">
          <div class="stat"><b id="count">0</b><span>điểm</span></div>
          <div class="stat"><b id="avgX">0</b><span>X trung bình</span></div>
          <div class="stat"><b id="avgY">0</b><span>Y trung bình</span></div>
        </div>
        <div class="outcome">${escapeHtml(dataset.outcome)}</div>
      </aside>
    </section>
  </main>
  <script>
    const dataset = ${serializedDataset};
    let activeFilter = dataset.filters[0]?.id;
    const svg = document.getElementById('chart');
    const filterBox = document.getElementById('filters');
    const width = 760, height = 460;
    const pad = { left: 70, right: 28, top: 34, bottom: 64 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const sx = value => pad.left + ((value - dataset.xMin) / (dataset.xMax - dataset.xMin)) * chartW;
    const sy = value => pad.top + (1 - (value - dataset.yMin) / (dataset.yMax - dataset.yMin)) * chartH;
    const el = (name, attrs = {}, text = '') => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', name);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      if (text) node.textContent = text;
      return node;
    };
    function renderFilters() {
      filterBox.innerHTML = '';
      dataset.filters.forEach(filter => {
        const count = dataset.points.filter(point => point.category === filter.id).length;
        const button = document.createElement('button');
        button.className = filter.id === activeFilter ? 'active' : '';
        button.style.setProperty('--filter-color', filter.color);
        button.innerHTML = '<div class="filter-title"><span>' + filter.label + '</span><span style="color:' + filter.color + '">' + count + '</span></div><div class="filter-desc">' + filter.description + '</div>';
        button.onclick = () => { activeFilter = filter.id; render(); };
        filterBox.appendChild(button);
      });
    }
    function renderStats(activePoints) {
      const avg = (key) => activePoints.length ? (activePoints.reduce((sum, point) => sum + point[key], 0) / activePoints.length).toFixed(key === 'y' ? 2 : 1) : '0';
      document.getElementById('count').textContent = activePoints.length;
      document.getElementById('avgX').textContent = avg('x');
      document.getElementById('avgY').textContent = avg('y');
    }
    function renderChart() {
      svg.innerHTML = '';
      svg.appendChild(el('rect', { x: 0, y: 0, width, height, rx: 18, fill: 'rgba(0,0,0,.14)' }));
      dataset.yTicks.forEach(tick => {
        svg.appendChild(el('line', { x1: pad.left, x2: width - pad.right, y1: sy(tick), y2: sy(tick), stroke: 'rgba(255,255,255,.12)', 'stroke-dasharray': '4 8' }));
        svg.appendChild(el('text', { x: pad.left - 12, y: sy(tick) + 4, 'text-anchor': 'end', fill: 'rgba(232,240,248,.44)', 'font-size': 11, 'font-family': 'monospace' }, tick));
      });
      dataset.xTicks.forEach(tick => {
        svg.appendChild(el('line', { x1: sx(tick), x2: sx(tick), y1: pad.top, y2: height - pad.bottom, stroke: 'rgba(255,255,255,.10)', 'stroke-dasharray': '2 10' }));
        svg.appendChild(el('text', { x: sx(tick), y: height - 28, 'text-anchor': 'middle', fill: 'rgba(232,240,248,.44)', 'font-size': 11, 'font-family': 'monospace' }, tick));
      });
      if (dataset.highlight) {
        svg.appendChild(el('rect', { x: sx(dataset.highlight.x1), y: pad.top, width: sx(dataset.highlight.x2) - sx(dataset.highlight.x1), height: chartH, fill: 'rgba(255,183,77,.07)', stroke: 'rgba(255,183,77,.22)', 'stroke-dasharray': '6 8' }));
        svg.appendChild(el('text', { x: (sx(dataset.highlight.x1) + sx(dataset.highlight.x2)) / 2, y: pad.top + 18, 'text-anchor': 'middle', fill: '#ffb74d', 'font-size': 11, 'font-family': 'monospace' }, dataset.highlight.label));
      }
      svg.appendChild(el('line', { x1: pad.left, x2: width - pad.right, y1: height - pad.bottom, y2: height - pad.bottom, stroke: 'rgba(255,255,255,.2)' }));
      svg.appendChild(el('line', { x1: pad.left, x2: pad.left, y1: pad.top, y2: height - pad.bottom, stroke: 'rgba(255,255,255,.2)' }));
      svg.appendChild(el('text', { x: width / 2, y: height - 9, 'text-anchor': 'middle', fill: 'rgba(232,240,248,.70)', 'font-size': 12 }, dataset.xLabel));
      const yLabel = el('text', { x: 18, y: height / 2, transform: 'rotate(-90 18 ' + (height / 2) + ')', 'text-anchor': 'middle', fill: 'rgba(232,240,248,.70)', 'font-size': 12 }, dataset.yLabel);
      svg.appendChild(yLabel);
      dataset.points.forEach(point => {
        const filter = dataset.filters.find(item => item.id === point.category);
        const active = point.category === activeFilter;
        const circle = el('circle', { cx: sx(point.x), cy: sy(point.y), r: active ? 7 : 4.6, fill: filter.color, opacity: active ? .96 : .18, stroke: active ? '#fff' : 'transparent', 'stroke-width': active ? 1.5 : 0 });
        circle.style.cursor = 'pointer';
        circle.addEventListener('click', () => { activeFilter = point.category; render(); });
        svg.appendChild(circle);
      });
    }
    function render() {
      const activePoints = dataset.points.filter(point => point.category === activeFilter);
      renderFilters();
      renderStats(activePoints);
      renderChart();
    }
    render();
  </script>
</body>
</html>`
}

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

function DatasetPicker({ datasets, selectedId, draftInputUrl, draftOutputUrl, canEdit, onSelect, onDraftInputChange, onDraftOutputChange, onAddPair }) {
  return (
    <>
      <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 900 }}>INPUT list</div>
      <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 4 }}>Chọn cặp INPUT/OUTPUT để load OUTPUT SOURCE CODE và OUTPUT HTML tương ứng.</div>
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
      {canEdit ? (
        <>
          <input
            value={draftInputUrl}
            onChange={e => onDraftInputChange(e.target.value)}
            placeholder="Admin nhập INPUT URL..."
            style={{ width: '100%', marginTop: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: 11, fontFamily: 'inherit', fontSize: 11 }}
          />
          <input
            value={draftOutputUrl}
            onChange={e => onDraftOutputChange(e.target.value)}
            placeholder="Admin nhập dataset.outputUrl / OUTPUT HTML URL..."
            style={{ width: '100%', marginTop: 8, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: 11, fontFamily: 'inherit', fontSize: 11 }}
          />
          <button type="button" onClick={onAddPair} style={{ marginTop: 9, width: '100%', border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.08)', color: 'var(--cyan)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            + Save INPUT / OUTPUT pair
          </button>
        </>
      ) : (
        <div style={{ marginTop: 12, padding: 11, borderRadius: 12, border: '1px dashed var(--border2)', color: 'var(--text3)', fontSize: 10, lineHeight: 1.5 }}>
          INPUT list được chia sẻ cho tất cả mọi người xem. Chỉ admin mới có quyền nhập và lưu cặp INPUT / dataset.outputUrl mới.
        </div>
      )}
    </>
  )
}

function InputListCard({ datasets, selectedId, draftInputUrl, draftOutputUrl, canEdit, onSelect, onDraftInputChange, onDraftOutputChange, onAddPair }) {
  return (
    <Card style={{ padding: 14 }}>
      <DatasetPicker
        datasets={datasets}
        selectedId={selectedId}
        draftInputUrl={draftInputUrl}
        draftOutputUrl={draftOutputUrl}
        canEdit={canEdit}
        onSelect={onSelect}
        onDraftInputChange={onDraftInputChange}
        onDraftOutputChange={onDraftOutputChange}
        onAddPair={onAddPair}
      />
    </Card>
  )
}

function AnalysisTabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        borderRadius: 999,
        padding: '8px 12px',
        cursor: 'pointer',
        border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
        background: active ? 'rgba(0,229,255,0.1)' : 'var(--surface2)',
        color: active ? 'var(--cyan)' : 'var(--text2)',
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        fontWeight: 900,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function OutputScreenPanel({ dataset, activeTab, onTabChange }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, position: 'relative' }}>
        <AnalysisTabButton active={activeTab === 'outputHtml'} onClick={() => onTabChange('outputHtml')}>
          OUTPUT SOURCE CODE
        </AnalysisTabButton>
        <AnalysisTabButton active={activeTab === 'outputScreen'} onClick={() => onTabChange('outputScreen')}>
          OUTPUT HTML
        </AnalysisTabButton>
      </div>
      {activeTab === 'outputHtml'
        ? <OutputHtmlContent dataset={dataset} />
        : <OutputScreenContent dataset={dataset} />}
    </Card>
  )
}

function OutputHtmlContent({ dataset }) {
  const renderedHtml = buildOutputHtml(dataset)

  if (!dataset.outputUrl) {
    return (
      <div style={{ border: '1px dashed var(--border2)', borderRadius: 14, padding: 18, color: 'var(--text3)', fontSize: 12, lineHeight: 1.6 }}>
        Custom INPUT này chưa có OUTPUT SOURCE CODE tương ứng. Khi có link Drive/file HTML, hệ thống sẽ render source HTML tại đây.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 900 }}>{dataset.outputLabel}</div>
      <div style={{ color: 'var(--text3)', fontSize: 10, lineHeight: 1.5 }}>
        OUTPUT HTML hiển thị mã HTML đã sinh cho INPUT đang chọn. Chuyển sang OUTPUT SCREEN để xem bản render trực quan.
      </div>
      <pre style={{
        maxHeight: 560,
        overflow: 'auto',
        border: '1px solid var(--border2)',
        borderRadius: 14,
        background: 'rgba(0,0,0,0.36)',
        color: 'var(--text2)',
        padding: 14,
        fontSize: 11,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        fontFamily: 'var(--font-mono)',
      }}>
        {renderedHtml}
      </pre>
      <a href={dataset.outputUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--violet)', fontSize: 11, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
        Open OUTPUT HTML in new tab ↗
      </a>
    </div>
  )
}

function OutputScreenContent({ dataset }) {
  const renderedHtml = buildOutputHtml(dataset)

  if (!dataset.outputUrl) {
    return (
      <div style={{ border: '1px dashed var(--border2)', borderRadius: 14, padding: 18, color: 'var(--text3)', fontSize: 12, lineHeight: 1.6 }}>
        Custom INPUT này chưa có OUTPUT SOURCE CODE tương ứng. Khi có link Drive/file HTML, hệ thống có thể render OUTPUT HTML tại đây.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 900 }}>{dataset.title}</div>
      <div style={{ color: 'var(--text3)', fontSize: 10, lineHeight: 1.5 }}>
        OUTPUT HTML hiển thị nội dung tương ứng với INPUT đang chọn: chart HTML tương tác, filters, stats và outcome.
      </div>
      <iframe
        title={`${dataset.label} output screen`}
        srcDoc={renderedHtml}
        style={{ width: '100%', minHeight: 560, border: '1px solid var(--border2)', borderRadius: 14, background: '#fff' }}
        allow="autoplay"
      />
      <a href={dataset.outputUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--violet)', fontSize: 11, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
        Open OUTPUT HTML in new tab ↗
      </a>
    </div>
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

function createCustomDataset(pair, index) {
  const inputUrl = typeof pair === 'string' ? pair : pair.inputUrl
  const outputUrl = typeof pair === 'string' ? '' : pair.outputUrl
  const filterId = `custom-${index}-pending`
  return {
    id: `custom-${index}`,
    label: `Custom INPUT ${index + 1}`,
    inputUrl,
    outputUrl,
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
      { value: 'URL', label: inputUrl.replace(/^https?:\/\//, '').slice(0, 36) },
      { value: '0', label: 'chart thật chưa được sinh cho custom link' },
    ],
    filters: [
      { id: filterId, label: 'Pending extraction', color: 'var(--amber)', description: 'Custom link đã được lưu trong phiên UI; cần pipeline AI để tạo OUTPUT chart riêng.' },
    ],
    points: Array.from({ length: 8 }, (_, i) => ({ id: `${filterId}-${i}`, x: i + 1, y: 18 + i * 8, category: filterId })),
    outcome: outputUrl ? 'Custom INPUT đã có dataset.outputUrl tương ứng và có thể render OUTPUT SOURCE CODE / OUTPUT HTML.' : 'Custom INPUT chưa có OUTPUT Drive tương ứng. UI đã chọn được link này và hiển thị trạng thái chờ phân tích.',
  }
}

export default function StatisticalAnalysisPanel({ onNext, onPrev, prevLabel }) {
  const { t } = useApp()
  const { user } = useAuth()
  const [selectedDatasetId, setSelectedDatasetId] = useState(DATASETS[0].id)
  const [activeFilters, setActiveFilters] = useState(() => Object.fromEntries(DATASETS.map(dataset => [dataset.id, dataset.filters[0].id])))
  const [draftInputUrl, setDraftInputUrl] = useState('')
  const [draftOutputUrl, setDraftOutputUrl] = useState('')
  const [customPairs, setCustomPairs] = useState(() => loadStoredDatasetPairs())
  const [activeOutputTab, setActiveOutputTab] = useState('outputScreen')

  const allDatasets = useMemo(() => [
    ...DATASETS,
    ...customPairs.map((pair, index) => createCustomDataset(pair, index)),
  ], [customPairs])
  const selectedDataset = allDatasets.find(dataset => dataset.id === selectedDatasetId) || DATASETS[0]
  const activeFilter = activeFilters[selectedDataset.id] || selectedDataset.filters[0].id

  const canEditInputPairs = Boolean(user?.isAdmin)

  useEffect(() => {
    const syncStoredPairs = () => setCustomPairs(loadStoredDatasetPairs())
    window.addEventListener('storage', syncStoredPairs)
    window.addEventListener('stat-analysis-pairs-updated', syncStoredPairs)
    return () => {
      window.removeEventListener('storage', syncStoredPairs)
      window.removeEventListener('stat-analysis-pairs-updated', syncStoredPairs)
    }
  }, [])

  const filteredStats = useMemo(() => {
    const activePoints = selectedDataset.points.filter(point => point.category === activeFilter)
    const avgX = activePoints.length ? Number((activePoints.reduce((sum, point) => sum + point.x, 0) / activePoints.length).toFixed(1)) : 0
    const avgY = activePoints.length ? Number((activePoints.reduce((sum, point) => sum + point.y, 0) / activePoints.length).toFixed(2)) : 0
    return { count: activePoints.length, avgX, avgY }
  }, [activeFilter, selectedDataset])

  const handleAddPair = () => {
    if (!canEditInputPairs) return
    const inputUrl = draftInputUrl.trim()
    const outputUrl = draftOutputUrl.trim()
    if (!/^https?:\/\//i.test(inputUrl) || !/^https?:\/\//i.test(outputUrl)) return

    const pair = {
      inputUrl,
      outputUrl,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || 'admin',
    }
    const nextPairs = [...customPairs, pair]
    setCustomPairs(nextPairs)
    saveStoredDatasetPairs(nextPairs)
    window.dispatchEvent(new Event('stat-analysis-pairs-updated'))
    setDraftInputUrl('')
    setDraftOutputUrl('')
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
        <InputListCard
          datasets={allDatasets}
          selectedId={selectedDataset.id}
          draftInputUrl={draftInputUrl}
          draftOutputUrl={draftOutputUrl}
          canEdit={canEditInputPairs}
          onSelect={setSelectedDatasetId}
          onDraftInputChange={setDraftInputUrl}
          onDraftOutputChange={setDraftOutputUrl}
          onAddPair={handleAddPair}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <OutputScreenPanel dataset={selectedDataset} activeTab={activeOutputTab} onTabChange={setActiveOutputTab} />
          
        </div>
      </div>

      <NavButtons onNext={onNext} nextLabel={t('continueAiCouncil')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
