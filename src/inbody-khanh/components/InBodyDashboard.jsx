import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAllRecords, saveRecord, detectFileType, fileToBase64, fileToDataUrl } from '../../lib/medicalStorage.js';
import { notifyUpload } from '../../hooks/useMedicalData.js';
import { buildImageConvertedInBodyRecord, recordsToInBodyCsv } from '../../lib/inbodyCsv.js';
import standardInBodyCsv from '../DataInBody/InBody-20260508 3.csv?raw';
import aiClinicInBodyRef from '../DataInBody/AIClinicInBody.PNG';
import inBodyChartRef from '../DataInBody/IMG_2635.PNG';
import khanhInBodyRef from '../DataInBody/KhanhInBody.JPG';
import inBodyMuscleScreenRef from '../DataInBody/IMG_2637.PNG';
import inBodyFatScreenRef from '../DataInBody/IMG_2638.PNG';
import rankingFriendsRef from '../DataInBody/IMG_2651.PNG';
import rankingConnectRef from '../DataInBody/IMG_2652.PNG';
import rankingMyWeightRef from '../DataInBody/IMG_2653.PNG';
import rankingTotalRef from '../DataInBody/IMG_2654.PNG';
import rankingDeviceRef from '../DataInBody/IMG_2655.PNG';
import rankingDailyScoreRef from '../DataInBody/IMG_2656.PNG';
import rankingBodyFatRef from '../DataInBody/IMG_2657.PNG';
import challengeRoadMapRef from '../DataInBody/RoadMap.png';
import challengeJourneyRef from '../DataInBody/HanhTrinh3.png';

// ─── Gamification engine ────────────────────────────────────────────────────
function calcXP(records) {
  let xp = 0;
  records.forEach((r, i) => {
    xp += 50; // base scan XP
    if (i > 0) {
      const prev = records[i - 1];
      if (r.muscle > prev.muscle) xp += Math.round((r.muscle - prev.muscle) * 100);
      if (r.fat < prev.fat) xp += Math.round((prev.fat - r.fat) * 80);
    }
  });
  return xp;
}

function calcLevel(xp) {
  // Level thresholds: 0,100,250,500,900,1400,2000,2800,3800,5000...
  const thresholds = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 7000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  const current = thresholds[Math.min(level - 1, thresholds.length - 1)];
  const next = thresholds[Math.min(level, thresholds.length - 1)];
  const progress = next > current ? Math.round(((xp - current) / (next - current)) * 100) : 100;
  return { level, xp, current, next, progress };
}

function getAchievements(records) {
  const latest = records[records.length - 1];
  const first = records[0];
  const muscleGain = latest ? latest.muscle - first.muscle : 0;
  const fatLoss = first ? first.fat - latest.fat : 0;

  return [
    { id: 'first_scan', icon: '🏅', name: 'Scan đầu tiên', unlocked: records.length >= 1 },
    { id: 'muscle_05', icon: '💪', name: '+0.5kg cơ', unlocked: muscleGain >= 0.5 },
    { id: 'fat_1', icon: '🔥', name: 'Giảm 1% mỡ', unlocked: fatLoss >= 1 },
    { id: 'fat_5', icon: '🏆', name: 'Giảm 5% mỡ', unlocked: fatLoss >= 5 },
    { id: 'muscle_5', icon: '⚡', name: 'Cơ 35kg+', unlocked: latest?.muscle >= 35 },
    { id: 'water_60', icon: '🌊', name: 'Nước > 60%', unlocked: latest?.water >= 60 },
    { id: 'level10', icon: '👑', name: 'Level 10', unlocked: calcLevel(calcXP(records)).level >= 10 },
    { id: 'scan10', icon: '🎯', name: '10 lần scan', unlocked: records.length >= 10 },
  ];
}

function getActiveQuests(records) {
  const latest = records[records.length - 1];
  if (!latest) return [];
  const prev = records[records.length - 2];
  return [
    {
      id: 'muscle_quest',
      icon: '🏋️',
      name: 'Tăng 1kg cơ bắp',
      desc: 'Đo InBody lần tiếp theo sau 30 ngày tập',
      progress: prev ? Math.min(100, Math.round(((latest.muscle - prev.muscle) / 1) * 100)) : 0,
      reward: 150,
      color: '#378ADD',
    },
    {
      id: 'fat_quest',
      icon: '🔥',
      name: 'Giảm mỡ xuống 20%',
      desc: `Mỡ hiện tại ${latest.fat}% → mục tiêu 20%`,
      progress: Math.min(100, Math.round(((latest.fat - 20) / (latest.fat - 20 + 5)) * 100)),
      reward: 200,
      color: '#D85A30',
    },
    {
      id: 'water_quest',
      icon: '💧',
      name: 'Duy trì nước > 53%',
      desc: 'Uống đủ nước trong 14 ngày liên tiếp',
      progress: latest.water >= 53 ? 85 : 30,
      reward: 80,
      color: '#1D9E75',
    },
  ];
}

// ─── AI Analysis via Anthropic API ─────────────────────────────────────────
async function analyzeInBodyWithAI(base64Image, mediaType) {
  const response = await fetch('/api/inbody-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, mediaType }),
  });
  if (!response.ok) throw new Error('API error');
  const data = await response.json();
  return data.analysis;
}


const STANDARD_INBODY_FILE = 'InBody-20260508 3.csv';
const INBODY_REFERENCE_IMAGES = [
  { src: aiClinicInBodyRef, label: 'AIClinicInBody.PNG' },
  { src: inBodyChartRef, label: 'IMG_2635.PNG' },
  { src: khanhInBodyRef, label: 'KhanhInBody.JPG' },
];

const INBODY_APP_SCREEN_TABS = [
  { id: 'muscle', label: 'Khối lượng cơ', image: inBodyMuscleScreenRef, accent: '#1D9E75', summary: 'Màn hình Chi tiết · phân tích cơ từng bộ phận theo mẫu IMG_2637.PNG.' },
  { id: 'fat', label: 'Mỡ trong cơ thể', image: inBodyFatScreenRef, accent: '#f05f78', summary: 'Màn hình Chi tiết · phân tích mỡ từng bộ phận theo mẫu IMG_2638.PNG.' },
];

const RANKING_FILTERS = [
  { id: 'total', label: 'Tổng', image: rankingTotalRef, helper: 'Dựa trên tất cả báo cáo sức khỏe InBody trong cùng quốc gia.', score: 'Top 94%', activeMetric: 'Điểm InBody' },
  { id: 'device', label: 'Cùng thiết bị', image: rankingDeviceRef, helper: 'So sánh với người dùng cùng loại thiết bị chuyên nghiệp.', score: '64 điểm', activeMetric: 'Thiết bị chuyên dụng' },
  { id: 'weight', label: 'Cân nặng của tôi', image: rankingMyWeightRef, helper: 'Ghép nhóm người dùng có cân nặng tương tự để bảng xếp hạng công bằng hơn.', score: 'Top 94%', activeMetric: 'Cùng cân nặng' },
  { id: 'friends', label: 'Bạn bè', image: rankingFriendsRef, helper: 'Bảng xếp hạng riêng tư/công khai giữa bạn bè trên InBody.', score: '1 bạn', activeMetric: 'Bạn bè' },
];

const RANKING_REFERENCE_IMAGES = [
  { src: rankingFriendsRef, label: 'IMG_2651.PNG · Bạn bè' },
  { src: rankingConnectRef, label: 'IMG_2652.PNG · Kết bạn' },
  { src: rankingMyWeightRef, label: 'IMG_2653.PNG · Cân nặng của tôi' },
  { src: rankingTotalRef, label: 'IMG_2654.PNG · Tổng' },
  { src: rankingDeviceRef, label: 'IMG_2655.PNG · Cùng thiết bị' },
  { src: rankingDailyScoreRef, label: 'IMG_2656.PNG · Điểm hằng ngày' },
  { src: rankingBodyFatRef, label: 'IMG_2657.PNG · Tỷ lệ mỡ' },
];

const RANKING_SCORE_ROWS = [
  { rank: 1, name: 'Kathy', value: '137Điểm', avatar: 'K', highlight: false },
  { rank: 2, name: 'JIA', value: '95Điểm', avatar: 'J', highlight: false },
  { rank: 4, name: '5254', value: '94Điểm', avatar: '5', highlight: false },
  { rank: 6, name: 'Tim', value: '93Điểm', avatar: 'T', highlight: false },
  { rank: 12, name: 'Tôi', value: '64Điểm', avatar: 'LXK', highlight: true },
];

const RANKING_FAT_ROWS = [
  { rank: 1, name: 'Giri', value: '5.1%' },
  { rank: 2, name: '6100', value: '6.5%' },
  { rank: 3, name: '8418', value: '6.7%' },
  { rank: 7, name: 'harsh@saa', value: '9.4%' },
  { rank: 10, name: '3132', value: '11.9%' },
];

const CHALLENGE_QUESTS = [
  { icon: '🧬', title: 'IL-6 Protein Optimization', prize: '5,000 HLT', status: 'Đang mở', progress: 62, tag: 'Epic' },
  { icon: '💪', title: 'Body Recomposition 30 ngày', prize: '+850 XP', status: 'Ngày 7', progress: 38, tag: 'Warrior' },
  { icon: '💧', title: 'Hydration + ECW Balance', prize: '+300 XP', status: '5/7 ngày', progress: 71, tag: 'Daily' },
];

const CHALLENGE_REFERENCES = [
  { src: aiClinicInBodyRef, label: 'AIClinicInBody.PNG · AI Clinic InBody flow' },
  { src: challengeRoadMapRef, label: 'RoadMap.png · Health Universe roadmap' },
  { src: challengeJourneyRef, label: 'HanhTrinh3.png · Neuro Quest journey' },
];

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replace(/\ufeff/g, '').replace(',', '.').trim();
  if (!normalized || normalized === '-') return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function formatInBodyDate(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 8) return String(raw || '');
  const date = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (digits.length < 12) return date;
  return `${date} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
}

function decodeBase64Text(base64Data) {
  if (!base64Data) return '';
  try {
    const binary = atob(base64Data);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try { return atob(base64Data); } catch { return ''; }
  }
}

function isSummaryAllInBodyRecord(record) {
  return record?.fileType === 'csv' && (
    record.sourceModule === 'ai-inbody-portal-summary' ||
    String(record.notes || '').includes('Summary All InBody Records') ||
    String(record.filename || '').startsWith('FullTrackInBody_')
  );
}

async function loadLatestSummaryAllInBodyRecords(ownerEmail) {
  const allRecords = await getAllRecords({ ownerEmail, includeUnowned: false });
  const summaryRecord = allRecords
    .filter(isSummaryAllInBodyRecord)
    .sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')))[0];
  if (!summaryRecord) return null;
  const csvText = summaryRecord.textContent || decodeBase64Text(summaryRecord.base64Data);
  const parsedRecords = parseInBodyCsv(csvText);
  return parsedRecords.length ? { record: summaryRecord, parsedRecords } : null;
}

function parseInBodyCsv(csvText) {
  const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(header => header.replace(/\ufeff/g, '').trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => ({ ...row, [header]: values[index] }), {});
  });

  return rows.map((row) => ({
    date: formatInBodyDate(row['ngày']),
    rawDate: String(row['ngày'] || ''),
    device: row['Thiết bị đo'] || '',
    weight: parseNumber(row['Cân nặng(kg)']),
    skeletalMuscle: parseNumber(row['Khối lượng cơ xương(kg)']),
    muscle: parseNumber(row['Khối lượng cơ xương(kg)']) ?? parseNumber(row['Khối lượng cơ(kg)']),
    bodyFatMass: parseNumber(row['Khối lượng mỡ trong cơ thể(kg)']),
    fat: parseNumber(row['Tỷ lệ mỡ cơ thể(%)']),
    bmi: parseNumber(row['BMI(kg/m²)']),
    bmr: parseNumber(row['Tỷ lệ trao đổi chất cơ bản(kcal)']),
    score: parseNumber(row['Điểm InBody']),
    water: parseNumber(row['Lượng nước trong cơ thể(L)']),
    intracellularWater: parseNumber(row['Nước nội bào(L)']),
    extracellularWater: parseNumber(row['Nước ngoại bào(L)']),
    ecwRatio: parseNumber(row['Tỷ lệ ECW']),
    visceralFatLevel: parseNumber(row['Mức độ chất béo nội tạng(Level)']),
    waistHipRatio: parseNumber(row['Tỷ lệ mỡ bụng']),
    protein: parseNumber(row['Protein(kg)']),
    minerals: parseNumber(row['Khoáng chất(kg)']),
    boneMineral: parseNumber(row['Hàm lượng khoáng trong xương(kg)']),
    bodyCellMass: parseNumber(row['Khối lượng tế bào cơ thể(kg)']),
    smi: parseNumber(row['Chỉ số khối cơ xương(kg/m²)']),
    phaseAngle: parseNumber(row['Góc pha toàn bộ cơ thể(°)']),
    rightArmMuscle: parseNumber(row['Khối lượng cơ ở cánh tay phải(kg)']),
    leftArmMuscle: parseNumber(row['Khối lượng cơ ở cánh tay trái(kg)']),
    trunkMuscle: parseNumber(row['Khối lượng cơ ở thân mình(kg)']),
    rightLegMuscle: parseNumber(row['Khối lượng cơ ở chân phải(kg)']),
    leftLegMuscle: parseNumber(row['Khối lượng cơ ở chân trái(kg)']),
  })).filter(record => record.rawDate && record.weight !== null).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
}

function buildSimulatedClaudeAnalysis(records, fileName = STANDARD_INBODY_FILE) {
  const first = records[0];
  const latest = records[records.length - 1];
  const prev = records[records.length - 2] || first;
  const diff = (key) => latest?.[key] != null && first?.[key] != null ? latest[key] - first[key] : 0;
  const trend = diff('fat') <= 0 ? 'ok' : 'warn';

  return {
    summary: `Giả lập Claude đã đọc file chuẩn ${fileName}: phát hiện ${records.length} lần đo trong cùng ngày, cân nặng quanh ${latest?.weight ?? '-'}kg, cơ xương ${latest?.muscle ?? '-'}kg, mỡ cơ thể ${latest?.fat ?? '-'}%, BMI ${latest?.bmi ?? '-'} và điểm InBody ${latest?.score ?? '-'}. Dashboard đã dựng đồ thị theo thời gian từ CSV LookinBody để theo dõi cân nặng, cơ, mỡ, nước, ECW và điểm InBody.`,
    tags: [
      { label: 'CSV chuẩn LookinBody', type: 'ok' },
      { label: trend === 'ok' ? 'Mỡ ổn định/giảm' : 'Mỡ tăng nhẹ', type: trend },
      { label: 'Đồ thị thời gian đã tạo', type: 'info' },
    ],
    metrics: {
      'Số lần đo': records.length,
      'Cân nặng mới nhất': `${latest?.weight ?? '-'} kg`,
      'Thay đổi cân nặng': `${diff('weight').toFixed(1)} kg`,
      'Cơ xương mới nhất': `${latest?.muscle ?? '-'} kg`,
      'Thay đổi cơ': `${diff('muscle').toFixed(1)} kg`,
      'Mỡ cơ thể mới nhất': `${latest?.fat ?? '-'}%`,
      'ECW Ratio': latest?.ecwRatio ?? '-',
      'Điểm InBody': latest?.score ?? '-',
      'So với lần trước': prev && latest ? `Cân ${latest.weight - prev.weight >= 0 ? '+' : ''}${(latest.weight - prev.weight).toFixed(1)}kg · Mỡ ${latest.fat - prev.fat >= 0 ? '+' : ''}${(latest.fat - prev.fat).toFixed(1)}%` : '-',
    },
  };
}

// ─── Sample data (replace with real DB) ───────────────────────────────────
const SAMPLE_RECORDS = [
  { date: '2025-04-01', weight: 70.2, muscle: 29.2, fat: 23.5, water: 53.1, bmi: 24.2 },
  { date: '2025-05-01', weight: 69.6, muscle: 29.4, fat: 22.9, water: 53.8, bmi: 23.8 },
  { date: '2025-06-01', weight: 68.4, muscle: 29.8, fat: 22.1, water: 54.3, bmi: 23.1 },
];

// ─── Sub-components ─────────────────────────────────────────────────────────
function HeroCard({ levelInfo, latest }) {
  const classNames = ['Người mới', 'Học viên', 'Chiến binh', 'Võ sĩ', 'Cao thủ', 'Đại sư'];
  const className = classNames[Math.min(Math.floor(levelInfo.level / 2), classNames.length - 1)];

  return (
    <div className="hero-card">
      <div className="avatar">
        <span className="avatar-emoji">💪</span>
        <span className="level-badge">Lv.{levelInfo.level}</span>
      </div>
      <div className="hero-info">
        <div className="hero-name">{className} · {levelInfo.xp} XP</div>
        <div className="hero-class">
          Cân nặng: <b>{latest?.weight} kg</b> · BMI: <b>{latest?.bmi}</b>
        </div>
        <div className="bar-row">
          <span className="bar-label">XP</span>
          <div className="bar-track">
            <div className="bar-fill xp" style={{ width: `${levelInfo.progress}%` }} />
          </div>
          <span className="bar-val">{levelInfo.progress}%</span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, unit, delta, deltaUp }) {
  return (
    <div className="metric-card">
      <span className="metric-icon">{icon}</span>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value} <span className="metric-unit">{unit}</span></div>
      {delta && (
        <div className={`metric-delta ${deltaUp ? 'up' : 'down'}`}>
          {deltaUp ? '▲' : '▼'} {delta}
        </div>
      )}
    </div>
  );
}

function InBodyTrendPreview({ records }) {
  if (!records?.length) return null;
  const chartData = records.map((record) => ({
    ...record,
    dateLabel: record.date.includes(' ') ? record.date.slice(11) : record.date.slice(5),
  }));
  const latest = records[records.length - 1];

  return (
    <div className="inbody-simulated-charts">
      <div className="section-title">Đồ thị sức khoẻ theo thời gian · InBody-20260508 3.csv</div>
      <div className="inbody-chart-grid">
        <div className="inbody-chart-card">
          <div className="chart-title">Cân nặng · BMI · Điểm InBody</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="weight" name="Cân nặng kg" stroke="#378ADD" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bmi" name="BMI" stroke="#BA7517" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="score" name="Điểm" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="inbody-chart-card">
          <div className="chart-title">Cơ · Mỡ · Nước</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="muscle" name="Cơ xương kg" stroke="#0058bc" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bodyFatMass" name="Mỡ kg" stroke="#D85A30" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="water" name="Nước L" stroke="#00a6d6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="inbody-chart-card wide">
          <div className="chart-title">Cân bằng nước · ECW · Phase angle</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="intracellularWater" name="ICW L" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="extracellularWater" name="ECW L" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ecwRatio" name="ECW ratio" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="phaseAngle" name="Góc pha" stroke="#111827" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="inbody-reference-strip">
        <div><b>Latest</b><span>{latest.date}</span></div>
        <div><b>Protein</b><span>{latest.protein ?? '-'} kg</span></div>
        <div><b>Khoáng</b><span>{latest.minerals ?? '-'} kg</span></div>
        <div><b>SMI</b><span>{latest.smi ?? '-'} kg/m²</span></div>
        <div><b>Mỡ nội tạng</b><span>Level {latest.visceralFatLevel ?? '-'}</span></div>
      </div>
      <div className="inbody-reference-gallery">
        {INBODY_REFERENCE_IMAGES.map((image) => (
          <figure key={image.label}>
            <img src={image.src} alt={image.label} />
            <figcaption>Tham khảo: {image.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function UploadTab({ onAnalysis, onViewMedicalRecord }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [simulatedRecords, setSimulatedRecords] = useState([]);
  const [uploadRecordStatus, setUploadRecordStatus] = useState('');
  const [savedUploadRecord, setSavedUploadRecord] = useState(null);
  const inputRef = useRef();


  const saveUploadRecord = async (selectedFile, extra = {}) => {
    const [dataUrl, base64Data] = await Promise.all([fileToDataUrl(selectedFile), fileToBase64(selectedFile)]);
    const isCsv = selectedFile.name.toLowerCase().endsWith('.csv') || selectedFile.type === 'text/csv';
    const textContent = isCsv ? await selectedFile.text() : '';
    const record = {
      id: `inbody_portal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename: selectedFile.name,
      name: selectedFile.name,
      fileType: detectFileType(selectedFile.type, selectedFile.name),
      type: detectFileType(selectedFile.type, selectedFile.name),
      mimeType: selectedFile.type || (isCsv ? 'text/csv' : 'image/jpeg'),
      size: selectedFile.size,
      uploadedAt: new Date().toISOString(),
      dataUrl,
      base64Data,
      textContent,
      notes: isCsv ? `AI inbody Portal · ${parseInBodyCsv(textContent).length} dòng dữ liệu` : 'AI inbody Portal image upload',
      ownerEmail: user?.email || null,
      ownerName: user?.name || '',
      ownerAvatar: user?.avatar || '',
      ownerProvider: user?.provider || '',
      sourceModule: 'ai-inbody-portal',
      ...extra,
    };
    await saveRecord(record, { ownerEmail: user?.email, ownerName: user?.name, ownerAvatar: user?.avatar, ownerProvider: user?.provider });
    notifyUpload();
    setSavedUploadRecord(record);
    setUploadRecordStatus(`Đã lưu vào Upload Records: ${record.filename}`);
    return record;
  };

  const saveCsvTextToUploadRecords = async (csvText, filename, extra = {}) => {
    const csvFile = new File([csvText], filename, { type: 'text/csv' });
    return saveUploadRecord(csvFile, { sourceModule: 'ai-inbody-portal-summary', ...extra });
  };

  const runSimulatedCsvAnalysis = (csvText, fileName = STANDARD_INBODY_FILE) => {
    const parsedRecords = parseInBodyCsv(csvText);
    if (!parsedRecords.length) throw new Error('CSV không có dòng dữ liệu InBody hợp lệ.');
    const analysis = buildSimulatedClaudeAnalysis(parsedRecords, fileName);
    setResult(analysis);
    setSimulatedRecords(parsedRecords);
    if (onAnalysis) onAnalysis(analysis, parsedRecords);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
      setSimulatedRecords([]);
      setUploadRecordStatus('');
      setSavedUploadRecord(null);
      saveUploadRecord(f).catch((error) => setUploadRecordStatus(`Không lưu được Upload Records: ${error.message || error}`));
    }
  };

  const saveCurrentFileToUploadRecords = async () => {
    if (!file) {
      setUploadRecordStatus('Vui lòng chọn file/hình trước khi lưu Upload Records.');
      return;
    }
    try {
      await saveUploadRecord(file);
    } catch (error) {
      setUploadRecordStatus(`Không lưu được Upload Records: ${error.message || error}`);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      if (file.name === STANDARD_INBODY_FILE || file.name.toLowerCase().endsWith('.csv')) {
        const csvText = await file.text();
        runSimulatedCsvAnalysis(csvText, file.name);
        setLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];
          const mediaType = file.type;
          const analysis = await analyzeInBodyWithAI(base64, mediaType);
          setResult(analysis);
          if (onAnalysis) onAnalysis(analysis);
        } catch (err) {
          setError('Lỗi phân tích. Vui lòng thử lại.');
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Không đọc được file. Vui lòng thử lại.');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message || 'Lỗi phân tích. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  const loadBundledStandardCsv = () => {
    const demoFile = new File([standardInBodyCsv], STANDARD_INBODY_FILE, { type: 'text/csv' });
    setFile(demoFile);
    setError(null);
    setResult(null);
    setSimulatedRecords([]);
  };

  const convertCurrentImageToCsv = async () => {
    if (!file || file.name.toLowerCase().endsWith('.csv')) return;
    const fallback = parseInBodyCsv(standardInBodyCsv).at(-1);
    const record = buildImageConvertedInBodyRecord({ analysis: result, fallback, sourceName: file.name });
    const csvText = recordsToInBodyCsv([record]);
    const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]+/gi, '_') || 'InBody_Image';
    await saveCsvTextToUploadRecords(csvText, `${safeName}_converted.csv`, { notes: `Convert InBody Image thành .CSV từ ${file.name}` });
    runSimulatedCsvAnalysis(csvText, `${safeName}_converted.csv`);
  };

  const summarizeAllInBodyRecords = async () => {
    const ownerEmail = user?.email;
    const allRecords = await getAllRecords({ ownerEmail, includeUnowned: false });
    const parsed = [];
    allRecords.forEach((record) => {
      if (record.fileType !== 'csv') return;
      const csvText = record.textContent || (record.base64Data ? atob(record.base64Data) : '');
      parsed.push(...parseInBodyCsv(csvText));
    });
    if (simulatedRecords.length) parsed.push(...simulatedRecords);
    const unique = Array.from(new Map(parsed.map(record => [record.rawDate, record])).values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    if (!unique.length) {
      setUploadRecordStatus('Chưa có dữ liệu InBody CSV để Summary.');
      return;
    }
    const loginName = (user?.name || user?.email || 'Guest').replace(/[^a-z0-9._-]+/gi, '_');
    const filename = `FullTrackInBody_${loginName}.CSV`;
    const csvText = recordsToInBodyCsv(unique);
    await saveCsvTextToUploadRecords(csvText, filename, { notes: `Summary All InBody Records · ${unique.length} dòng · ${user?.email || 'guest'}` });
    runSimulatedCsvAnalysis(csvText, filename);
  };

  return (
    <div>
      <div className="upload-zone" onClick={() => inputRef.current?.click()}>
        <div className="upload-icon">📁</div>
        <div className="upload-title">Upload kết quả InBody</div>
        <div className="upload-sub">Ảnh chụp phiếu hoặc file CSV từ LookinBody</div>
        <div className="upload-formats">
          <span className="fmt pdf">PDF</span>
          <span className="fmt img">JPG/PNG</span>
          <span className="fmt csv">CSV</span>
        </div>
      </div>
      <input
        ref={inputRef} type="file" hidden
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.csv,image/*"
        onChange={handleFile}
      />
      <div className="inbody-upload-actions">
        <button type="button" className="sample-csv-btn" onClick={loadBundledStandardCsv}>
          🧪 Nạp file mẫu chuẩn: {STANDARD_INBODY_FILE}
        </button>
        <button type="button" className="sample-csv-btn" onClick={() => inputRef.current?.click()}>
          📤 upload file .csv / hình vào Upload Records
        </button>
        <button type="button" className="sample-csv-btn" onClick={saveCurrentFileToUploadRecords} disabled={!file}>
          💾 Lưu Upload Records
        </button>
        <button type="button" className="sample-csv-btn" onClick={summarizeAllInBodyRecords}>
          📚 Summary All InBody Records
        </button>
      </div>
      {uploadRecordStatus && <div className="file-preview">{uploadRecordStatus}</div>}
      {savedUploadRecord && (
        <button type="button" className="inbody-medical-record-btn" onClick={onViewMedicalRecord}>
          Xem hình tại Medical Records
        </button>
      )}
      {file && (
        <div className="file-preview">
          ✅ {file.name} ({(file.size / 1024).toFixed(0)} KB)
          {file.name === STANDARD_INBODY_FILE && <span className="standard-file-pill">CSV chuẩn · giả lập Claude</span>}
        </div>
      )}
      <button className="analyze-btn" onClick={handleAnalyze} disabled={!file || loading}>
        {loading ? '⏳ Đang phân tích...' : '🧠 Phân tích AI với Claude'}
      </button>
      {file && !file.name.toLowerCase().endsWith('.csv') && (
        <button className="analyze-btn" onClick={convertCurrentImageToCsv} type="button">
          📈 Convert InBody Image thành .CSV
        </button>
      )}
      {error && <div className="error-msg">{error}</div>}
      {result && (
        <div className="ai-result">
          <div className="ai-header">
            <span className="ai-badge">{simulatedRecords.length ? 'Claude Simulation' : 'Claude Vision'}</span>
            <span className="ai-title">Phân tích InBody</span>
          </div>
          <p className="ai-text">{result.summary}</p>
          <div className="ai-tags">
            {result.tags?.map((tag) => (
              <span key={tag.label} className={`ai-tag ${tag.type}`}>{tag.label}</span>
            ))}
          </div>
          {result.metrics && (
            <div className="ai-metrics">
              {Object.entries(result.metrics).map(([k, v]) => (
                <div key={k} className="ai-metric-row">
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <InBodyTrendPreview records={simulatedRecords} />
    </div>
  );
}

function QuestsTab({ records }) {
  const quests = getActiveQuests(records);
  return (
    <div>
      <div className="section-title">Nhiệm vụ đang thực hiện</div>
      {quests.map((q) => (
        <div key={q.id} className="quest-item">
          <div className="quest-icon">{q.icon}</div>
          <div className="quest-body">
            <div className="quest-name">{q.name}</div>
            <div className="quest-desc">{q.desc}</div>
            <div className="quest-bar">
              <div className="quest-fill" style={{ width: `${q.progress}%`, background: q.color }} />
            </div>
          </div>
          <div className="quest-reward">+{q.reward} XP</div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ records }) {
  const chartData = records.map((record) => ({
    date: record.date.slice(5),
    muscle: record.muscle,
    fat: record.fat,
  }));

  return (
    <div>
      <div className="section-title">Xu hướng 3 tháng</div>
      <div className="inbody-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -18, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="muscle" name="Cơ bắp (kg)" stroke="#378ADD" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="fat" name="Mỡ (%)" stroke="#D85A30" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="section-title" style={{ marginTop: '1rem' }}>Lịch sử đo</div>
      {records.map((r, i) => {
        const prev = records[i - 1];
        const muscleChange = prev ? (r.muscle - prev.muscle).toFixed(1) : null;
        const fatChange = prev ? (r.fat - prev.fat).toFixed(1) : null;
        return (
          <div key={r.date} className="hist-row">
            <span className="hist-date">{r.date}</span>
            <span className="hist-weight">{r.weight} kg</span>
            {muscleChange && (
              <span className={`hist-delta ${+muscleChange >= 0 ? 'up' : 'down'}`}>
                Cơ {muscleChange >= 0 ? '+' : ''}{muscleChange}
              </span>
            )}
            {fatChange && (
              <span className={`hist-delta ${+fatChange <= 0 ? 'up' : 'down'}`}>
                Mỡ {fatChange > 0 ? '+' : ''}{fatChange}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InBodyAppScreensTab() {
  const [screen, setScreen] = useState(INBODY_APP_SCREEN_TABS[0]);

  return (
    <div className="inbody-app-screen-panel">
      <div className="inbody-app-header">
        <div className="inbody-logo-text">InBody</div>
        <div className="inbody-app-chip">KhanhLX</div>
        <div className="inbody-app-chip">TOUCH</div>
        <div className="inbody-app-icon">▦</div>
        <div className="inbody-app-icon">🔔</div>
      </div>
      <div className="inbody-app-nav">
        <span>Trang tổng</span><b>Chi tiết</b><span>Thay đổi</span><span>Xếp hạng</span>
      </div>
      <div className="inbody-app-date">‹ <span>08.05.2026 (Th 6) 10:58</span> › <button type="button">🗑</button></div>
      <div className="inbody-app-score"><b>Điểm InBody</b><strong>64 <small>Điểm</small></strong></div>
      <div className="section-title">Phân tích từng bộ phận</div>
      <div className="inbody-screen-tabs">
        {INBODY_APP_SCREEN_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={screen.id === item.id ? 'active' : ''}
            onClick={() => setScreen(item)}
            style={{ '--screen-accent': item.accent }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="inbody-screen-summary" style={{ borderColor: screen.accent }}>
        <b>{screen.label}</b><span>{screen.summary}</span>
      </div>
      <figure className="inbody-screen-figure">
        <img src={screen.image} alt={screen.summary} />
      </figure>
    </div>
  );
}


function RankingTab({ latest }) {
  const [filter, setFilter] = useState(RANKING_FILTERS[0]);

  return (
    <div className="ranking-tab">
      <section className="ranking-hero">
        <div className="ranking-logo">InBody</div>
        <div className="ranking-top-nav">
          <span>Trang tổng</span><span>Chi tiết</span><span>Thay đổi</span><b>Xếp hạng</b>
        </div>
        <div className="ranking-score-line">
          <span>Điểm InBody của tôi</span>
          <strong>{latest?.score || 64}<small>Điểm</small></strong>
        </div>
        <div className="ranking-segment-line">
          <button type="button">Nam giới / Cùng độ tuổi(40~50Tuổi) ▾</button>
          <strong>{filter.score}</strong>
        </div>
        <p>Thiết bị chăm sóc sức khỏe tại nhà, dữ liệu nhập thủ công chỉ phản ánh trong bảng xếp hạng bạn bè.</p>
      </section>

      <div className="ranking-filter-tabs">
        {RANKING_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter.id === item.id ? 'active' : ''}
            onClick={() => setFilter(item)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="ranking-card ranking-active-card">
        <div className="ranking-info-box"><b>ℹ</b><span>{filter.helper}<br />Bảng xếp hạng hằng tuần cài đặt lúc 00:00 thứ hai, hằng ngày cài đặt lúc 00:00 mỗi ngày.</span></div>
        <div className="ranking-card-head">
          <div><h3>Xếp hạng điểm InBody hằng tuần</h3><small>{filter.activeMetric}</small></div>
          <div className="ranking-gender"><b>Tổng</b><span>Nam giới</span><span>Nữ giới</span></div>
        </div>
        {filter.id === 'device' ? (
          <div className="ranking-empty">Không có kết quả từ cuộc kiểm tra InBody được tiến hành tuần này. Hãy làm một cuộc kiểm tra InBody tại một cơ sở chuyên nghiệp ngay bây giờ và kiểm tra xếp hạng của bạn!</div>
        ) : (
          <div className="ranking-list">
            {RANKING_SCORE_ROWS.map((row) => <RankingRow key={`${row.rank}-${row.name}`} row={row} />)}
          </div>
        )}
      </section>

      <section className="ranking-card">
        <div className="ranking-card-head">
          <div><h3>Xếp hạng tỷ lệ mỡ trong cơ thể hằng ngày</h3><small>Chỉ số càng thấp càng tốt</small></div>
          <div className="ranking-gender"><b>Nam giới</b><span>Nữ giới</span></div>
        </div>
        <div className="ranking-list compact">
          {RANKING_FAT_ROWS.map((row) => <RankingRow key={`${row.rank}-${row.name}`} row={row} />)}
        </div>
        <button type="button" className="ranking-opt-out">Không tham gia vào việc xếp hạng.</button>
      </section>

      <section className="ranking-connect-card">
        <div>
          <h3>Kết bạn</h3>
          <p>Yêu cầu kết bạn bằng số điện thoại và tên, sau đó bật riêng tư/công khai như mẫu IMG_2651-2652.</p>
        </div>
        <button type="button">Gửi yêu cầu</button>
      </section>

      <details className="reference-details">
        <summary>Ảnh tham chiếu IMG_2651.PNG → IMG_2657.PNG</summary>
        <div className="reference-shot-grid ranking-shots">
          {RANKING_REFERENCE_IMAGES.map((item) => (
            <figure key={item.label}><img src={item.src} alt={item.label} /><figcaption>{item.label}</figcaption></figure>
          ))}
        </div>
      </details>
    </div>
  );
}

function RankingRow({ row }) {
  return (
    <div className={`ranking-row ${row.highlight ? 'me' : ''}`}>
      <b>{row.rank}</b>
      <span className="ranking-new">NEW</span>
      <span className="ranking-avatar">{row.avatar || row.name.slice(0, 1)}</span>
      <span className="ranking-name">{row.name}</span>
      <strong>{row.value}</strong>
    </div>
  );
}

function ChallengeTab({ levelInfo, latest }) {
  return (
    <div className="challenge-tab">
      <section className="challenge-hero">
        <div>
          <span className="challenge-kicker">AI INBODY CHALLENGE</span>
          <h3>Health Universe · Thử Thách</h3>
          <p>Biến chỉ số InBody thành nhiệm vụ, bounty, guild leaderboard và hành trình chiến binh như AIClinicInBody, RoadMap và HanhTrinh3.</p>
        </div>
        <div className="challenge-level-orb"><small>LV</small>{levelInfo.level}</div>
      </section>

      <div className="challenge-stats">
        <div><span>InBody Score</span><b>{latest?.score || 64}</b><small>Điểm hiện tại</small></div>
        <div><span>XP</span><b>{levelInfo.xp}</b><small>{levelInfo.progress}% tới cấp kế</small></div>
        <div><span>HLT Token</span><b>4,250</b><small>Ví thưởng thử thách</small></div>
        <div><span>Streak</span><b>7 ngày</b><small>Tuyệt vời!</small></div>
      </div>

      <section className="challenge-map-card">
        <div className="challenge-map-copy">
          <span>Chapter 1</span>
          <h3>The Awakening</h3>
          <p>Roadmap cá nhân hóa: Upload InBody → AI phân tích → nhận quest → hoàn thành thói quen → mở khóa thành tựu.</p>
          <div className="challenge-progress"><i style={{ width: `${levelInfo.progress}%` }} /></div>
          <button type="button">Tham gia Challenge</button>
        </div>
        <div className="challenge-path" aria-label="Journey path">
          <span className="done">1</span><i /><span className="done">2</span><i /><span>3</span><i /><span>4</span>
        </div>
      </section>

      <div className="challenge-grid">
        {CHALLENGE_QUESTS.map((quest) => (
          <article key={quest.title} className="challenge-card">
            <div className="challenge-card-head"><span>{quest.icon}</span><b>{quest.tag}</b></div>
            <h4>{quest.title}</h4>
            <p>{quest.status} · Phần thưởng {quest.prize}</p>
            <div className="challenge-progress"><i style={{ width: `${quest.progress}%` }} /></div>
          </article>
        ))}
      </div>

      <section className="challenge-leaderboard">
        <div>
          <span>Guild</span>
          <h3>Iron Disciples</h3>
          <p>Thành viên: 24/50 · Bảng xếp hạng tuần</p>
        </div>
        <ol>
          <li><b>1</b> Titan <strong>XP 18,450</strong></li>
          <li><b>2</b> Shadow <strong>XP 16,230</strong></li>
          <li className="me"><b>12</b> You <strong>XP 7,540</strong></li>
        </ol>
      </section>

      <details className="reference-details challenge-reference" open>
        <summary>Ảnh tham chiếu cho tab Thử Thách</summary>
        <div className="reference-shot-grid challenge-shots">
          {CHALLENGE_REFERENCES.map((item) => (
            <figure key={item.label}><img src={item.src} alt={item.label} /><figcaption>{item.label}</figcaption></figure>
          ))}
        </div>
      </details>
    </div>
  );
}

function BadgesTab({ records }) {
  const achievements = getAchievements(records);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return (
    <div>
      <div className="section-title">Huy hiệu thành tích ({unlocked}/{achievements.length})</div>
      <div className="badges-grid">
        {achievements.map((a) => (
          <div key={a.id} className={`badge-item ${a.unlocked ? '' : 'locked'}`}>
            <div className="badge-icon">{a.icon}</div>
            <div className="badge-name">{a.name}</div>
          </div>
        ))}
      </div>
      <div className="badge-progress-wrap">
        <div className="badge-progress-label">
          Tiến độ: {unlocked}/{achievements.length}
        </div>
        <div className="bar-track">
          <div className="bar-fill xp" style={{ width: `${Math.round((unlocked / achievements.length) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function InBodyDashboard({ userId, initialRecords, onViewMedicalRecord }) {
  const { user } = useAuth();
  const [records, setRecords] = useState(initialRecords || SAMPLE_RECORDS);
  const [tab, setTab] = useState('upload');
  const [initialSummaryStatus, setInitialSummaryStatus] = useState('');
  const latest = records[records.length - 1];
  const prev = records[records.length - 2];
  const levelInfo = calcLevel(calcXP(records));

  useEffect(() => {
    let cancelled = false;
    loadLatestSummaryAllInBodyRecords(user?.email)
      .then((summary) => {
        if (cancelled || !summary) return;
        setRecords(summary.parsedRecords);
        setTab('history');
        setInitialSummaryStatus(`Đã nạp Lịch sử từ Summary All InBody Records gần nhất: ${summary.record.filename}`);
      })
      .catch((error) => {
        if (!cancelled) setInitialSummaryStatus(`Không nạp được Summary All InBody Records: ${error.message || error}`);
      });
    return () => { cancelled = true; };
  }, [user?.email]);

  const handleNewAnalysis = (analysis, parsedRecords) => {
    if (parsedRecords?.length) {
      setRecords(parsedRecords);
      return;
    }

    // If AI extracts metrics, add to records
    if (analysis?.metrics) {
      const newRecord = {
        date: new Date().toISOString().slice(0, 10),
        weight: parseFloat(analysis.metrics['Cân nặng']) || latest.weight,
        muscle: parseFloat(analysis.metrics['Cơ bắp']) || latest.muscle,
        fat: parseFloat(analysis.metrics['Mỡ (%)']) || latest.fat,
        water: parseFloat(analysis.metrics['Nước (%)']) || latest.water,
        bmi: parseFloat(analysis.metrics['BMI']) || latest.bmi,
      };
      setRecords((prev) => [...prev, newRecord]);
    }
  };

  const tabs = [
    { id: 'upload', label: 'Scan', icon: '📤' },
    { id: 'quests', label: 'Nhiệm vụ', icon: '⚔️' },
    { id: 'challenge', label: 'Thử Thách', icon: '🧬' },
    { id: 'history', label: 'Lịch sử', icon: '📈' },
    { id: 'screens', label: 'Màn hình', icon: '📱' },
    { id: 'ranking', label: 'Xếp Hạng', icon: '🏆' },
    { id: 'badges', label: 'Huy hiệu', icon: '🏅' },
  ];

  return (
    <div className="inbody-dashboard">
      <HeroCard levelInfo={levelInfo} latest={latest} />
      {initialSummaryStatus && <div className="inbody-initial-summary-status">{initialSummaryStatus}</div>}

      <div className="metrics-grid">
        <MetricCard icon="⚖️" label="Cân nặng" value={latest?.weight} unit="kg"
          delta={prev ? `${Math.abs((latest.weight - prev.weight).toFixed(1))} kg` : null}
          deltaUp={latest?.weight < prev?.weight} />
        <MetricCard icon="💪" label="Cơ bắp" value={latest?.muscle} unit="kg"
          delta={prev ? `${Math.abs((latest.muscle - prev.muscle).toFixed(1))} kg` : null}
          deltaUp={latest?.muscle > prev?.muscle} />
        <MetricCard icon="🔥" label="Mỡ cơ thể" value={latest?.fat} unit="%"
          delta={prev ? `${Math.abs((latest.fat - prev.fat).toFixed(1))}%` : null}
          deltaUp={latest?.fat < prev?.fat} />
        <MetricCard icon="💧" label="Nước" value={latest?.water} unit="L"
          delta="Ổn định" deltaUp />
      </div>

      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'upload' && <UploadTab onAnalysis={handleNewAnalysis} onViewMedicalRecord={onViewMedicalRecord} />}
        {tab === 'quests' && <QuestsTab records={records} />}
        {tab === 'challenge' && <ChallengeTab levelInfo={levelInfo} latest={latest} />}
        {tab === 'history' && <HistoryTab records={records} />}
        {tab === 'screens' && <InBodyAppScreensTab />}
        {tab === 'ranking' && <RankingTab latest={latest} />}
        {tab === 'badges' && <BadgesTab records={records} />}
      </div>

      <style>{`
        .inbody-dashboard { font-family: var(--font-sans, system-ui); max-width: 100%; color: #111827; }
        .inbody-chart { height: 260px; width: 100%; margin-bottom: 1rem; }
        .hero-card { display: flex; align-items: center; gap: 16px; padding: 1.25rem; background: #f8f9fa; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #e9ecef; }
        .avatar { width: 64px; height: 64px; border-radius: 50%; background: #e6f1fb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid #378ADD; position: relative; }
        .avatar-emoji { font-size: 28px; }
        .level-badge { position: absolute; bottom: -4px; right: -4px; background: #BA7517; color: #fff; font-size: 10px; font-weight: 500; padding: 2px 5px; border-radius: 8px; }
        .hero-info { flex: 1; }
        .hero-name { font-size: 16px; font-weight: 500; margin-bottom: 2px; }
        .hero-class { font-size: 12px; color: #666; margin-bottom: 8px; }
        .bar-row { display: flex; align-items: center; gap: 8px; }
        .bar-label { font-size: 11px; color: #888; width: 20px; }
        .bar-track { flex: 1; height: 7px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
        .bar-fill.xp { height: 100%; background: #1D9E75; border-radius: 4px; }
        .bar-val { font-size: 11px; color: #888; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 1rem; }
        .metric-card { background: #f8f9fa; border-radius: 8px; padding: 12px; border: 1px solid #e9ecef; }
        .metric-icon { font-size: 18px; margin-bottom: 4px; display: block; }
        .metric-label { font-size: 11px; color: #888; margin-bottom: 2px; }
        .metric-value { font-size: 20px; font-weight: 500; }
        .metric-unit { font-size: 11px; color: #888; }
        .metric-delta { font-size: 11px; margin-top: 3px; }
        .metric-delta.up { color: #1D9E75; }
        .metric-delta.down { color: #D85A30; }
        .tab-bar { display: flex; gap: 4px; background: #f1f3f4; padding: 4px; border-radius: 8px; margin-bottom: 1rem; }
        .tab-btn { flex: 1; padding: 7px 4px; font-size: 12px; border: none; background: transparent; border-radius: 6px; cursor: pointer; color: #666; }
        .tab-btn.active { background: #fff; color: #111; font-weight: 500; border: 1px solid #e9ecef; }
        .tab-content { min-height: 300px; }
        .section-title { font-size: 11px; font-weight: 500; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
        .upload-zone { border: 1.5px dashed #ccc; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: background 0.15s; margin-bottom: 1rem; }
        .upload-zone:hover { background: #f8f9fa; }
        .upload-icon { font-size: 32px; margin-bottom: 8px; }
        .upload-title { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
        .upload-sub { font-size: 12px; color: #888; }
        .upload-formats { display: flex; gap: 6px; justify-content: center; margin-top: 10px; }
        .fmt { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
        .fmt.pdf { background: #FAECE7; color: #4A1B0C; }
        .fmt.img { background: #E6F1FB; color: #042C53; }
        .fmt.csv { background: #E1F5EE; color: #085041; }
        .file-preview { padding: 8px 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; font-size: 13px; margin-bottom: 10px; }
        .analyze-btn { width: 100%; padding: 11px; background: #378ADD; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; margin-bottom: 1rem; }
        .analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .error-msg { color: #D85A30; font-size: 13px; margin-bottom: 8px; }
        .ai-result { background: #f0f9ff; border-radius: 12px; padding: 1.25rem; border: 1px solid #bae6fd; }
        .ai-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .ai-badge { font-size: 11px; background: #E6F1FB; color: #042C53; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
        .ai-title { font-size: 14px; font-weight: 500; }
        .ai-text { font-size: 13px; line-height: 1.6; margin-bottom: 10px; }
        .ai-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .ai-tag { font-size: 11px; padding: 3px 8px; border-radius: 4px; }
        .ai-tag.ok { background: #E1F5EE; color: #085041; }
        .ai-tag.warn { background: #FAEEDA; color: #633806; }
        .ai-tag.info { background: #E6F1FB; color: #042C53; }
        .ai-metrics { margin-top: 10px; border-top: 1px solid #e0f2fe; padding-top: 10px; }
        .ai-metric-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .quest-item { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 8px; background: #fff; }
        .quest-icon { font-size: 24px; flex-shrink: 0; }
        .quest-body { flex: 1; }
        .quest-name { font-size: 13px; font-weight: 500; }
        .quest-desc { font-size: 11px; color: #888; margin-top: 2px; }
        .quest-bar { height: 4px; background: #e9ecef; border-radius: 2px; margin-top: 6px; overflow: hidden; }
        .quest-fill { height: 100%; border-radius: 2px; }
        .quest-reward { font-size: 11px; color: #BA7517; font-weight: 500; white-space: nowrap; }
        .hist-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-size: 12px; }
        .hist-date { color: #888; width: 85px; flex-shrink: 0; }
        .hist-weight { font-weight: 500; min-width: 55px; }
        .hist-delta.up { color: #1D9E75; }
        .hist-delta.down { color: #D85A30; }
        .badges-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; margin-bottom: 1rem; }
        .badge-item { text-align: center; padding: 10px 6px; border-radius: 8px; border: 1px solid #e9ecef; background: #fff; }
        .badge-item.locked { opacity: 0.3; filter: grayscale(1); }
        .badge-icon { font-size: 24px; margin-bottom: 4px; }
        .badge-name { font-size: 10px; color: #666; line-height: 1.2; }
        .badge-progress-wrap { padding: 10px 14px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; }
        .badge-progress-label { font-size: 12px; color: #666; margin-bottom: 6px; }
        .inbody-upload-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: -4px 0 10px; }
        .sample-csv-btn { width: 100%; padding: 10px 12px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #085041; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; margin: 0; }
        .standard-file-pill { display: inline-flex; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: #E1F5EE; color: #085041; font-size: 11px; font-weight: 700; }
        .inbody-medical-record-btn { width: 100%; padding: 11px 12px; margin: 0 0 10px; border: 0; border-radius: 10px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 12px 28px rgba(34,197,94,.24); }
        .inbody-initial-summary-status { margin: -4px 0 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; }
        .inbody-simulated-charts { margin-top: 1rem; }
        .inbody-chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .inbody-chart-card { min-width: 0; padding: 12px; border: 1px solid #e9ecef; border-radius: 12px; background: #fff; }
        .inbody-chart-card.wide { grid-column: 1 / -1; }
        .chart-title { font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .inbody-reference-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
        .inbody-reference-strip > div { padding: 10px; border-radius: 10px; background: #f8f9fa; border: 1px solid #e9ecef; }
        .inbody-reference-strip b { display: block; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .04em; }
        .inbody-reference-strip span { display: block; margin-top: 3px; font-size: 12px; font-weight: 700; color: #111827; }
        .inbody-reference-gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
        .inbody-reference-gallery figure { margin: 0; overflow: hidden; border: 1px solid #e9ecef; border-radius: 12px; background: #fff; }
        .inbody-reference-gallery img { display: block; width: 100%; height: clamp(360px, 68vh, 980px); object-fit: contain; object-position: top; background: #fff; }
        .inbody-reference-gallery figcaption { padding: 7px 9px; color: #666; font-size: 10px; font-weight: 700; }
        .inbody-app-screen-panel { padding: 14px; border: 1px solid #e5e7eb; border-radius: 18px; background: linear-gradient(180deg, #fff, #f8fafc); }
        .inbody-app-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .inbody-logo-text { margin-right: auto; font-size: 24px; font-weight: 900; color: #1f2937; letter-spacing: -.04em; }
        .inbody-app-chip, .inbody-app-icon { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 999px; background: #fff; color: #374151; font-size: 12px; font-weight: 800; }
        .inbody-app-icon { width: 36px; height: 36px; padding: 0; display: grid; place-items: center; }
        .inbody-app-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; color: #c0c6cf; font-size: clamp(15px, 2.2vw, 24px); text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        .inbody-app-nav b { color: #111827; border-bottom: 4px solid #111827; padding-bottom: 8px; }
        .inbody-app-date { display: grid; grid-template-columns: 28px 1fr 28px 42px; align-items: center; gap: 8px; margin: 14px 0; color: #6b7280; font-weight: 700; }
        .inbody-app-date span { padding: 11px 14px; border-radius: 999px; background: #fff; text-align: center; box-shadow: 0 8px 22px rgba(15,23,42,.06); }
        .inbody-app-date button { border: 0; border-radius: 16px; background: #fff; min-height: 42px; cursor: pointer; box-shadow: 0 8px 22px rgba(15,23,42,.06); }
        .inbody-app-score { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; margin-bottom: 18px; border-radius: 20px; background: #fff; box-shadow: 0 10px 24px rgba(15,23,42,.06); color: #5b6678; }
        .inbody-app-score strong { font-size: 36px; color: #526078; }
        .inbody-app-score small { font-size: 16px; font-weight: 600; }
        .inbody-screen-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 6px; border-radius: 14px; background: #e9edf2; margin-bottom: 10px; }
        .inbody-screen-tabs button { min-height: 48px; border: 0; border-radius: 10px; background: transparent; color: #6b7280; font-weight: 900; cursor: pointer; font-size: 14px; }
        .inbody-screen-tabs button.active { background: #fff; color: #334155; box-shadow: 0 8px 20px rgba(15,23,42,.08), inset 0 -3px 0 var(--screen-accent); }
        .inbody-screen-summary { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; border-left: 4px solid; border-radius: 12px; background: #fff; color: #475569; font-size: 12px; margin-bottom: 10px; }
        .inbody-screen-figure { margin: 0; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; background: #fff; }
        .inbody-screen-figure img { display: block; width: 100%; max-height: 760px; object-fit: contain; object-position: top; background: #fff; }
        .ranking-tab { display: grid; gap: 12px; }
        .ranking-hero { margin: -2px -2px 0; padding: 18px 18px 22px; border-radius: 22px 22px 0 0; color: #fff; background: linear-gradient(135deg, #e33d6c 0%, #7e3b98 100%); overflow: hidden; }
        .ranking-logo { font-size: 34px; font-weight: 950; letter-spacing: -.06em; margin-bottom: 18px; }
        .ranking-top-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; align-items: center; color: rgba(255,255,255,.46); font-size: clamp(13px, 2.6vw, 24px); text-align: center; }
        .ranking-top-nav b { padding: 12px 8px; border-radius: 999px; background: #fff; color: #6f277f; }
        .ranking-score-line { display: flex; justify-content: flex-end; align-items: baseline; gap: 12px; margin: 18px 0 10px; }
        .ranking-score-line span { font-size: clamp(16px, 2.6vw, 28px); }
        .ranking-score-line strong { font-size: clamp(54px, 10vw, 88px); line-height: .9; }
        .ranking-score-line small { margin-left: 5px; font-size: 20px; }
        .ranking-segment-line { display: flex; justify-content: flex-end; align-items: center; gap: 14px; }
        .ranking-segment-line button { border: 0; border-radius: 999px; background: rgba(81,27,91,.58); color: #fff; padding: 12px 18px; font-size: 16px; font-weight: 800; }
        .ranking-segment-line strong { font-size: 22px; }
        .ranking-hero p { max-width: 760px; margin: 18px 0 0 auto; text-align: right; color: rgba(255,255,255,.86); font-size: 14px; }
        .ranking-filter-tabs { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: -12px; border-radius: 20px 20px 0 0; overflow: hidden; }
        .ranking-filter-tabs button { min-height: 64px; border: 0; background: rgba(151,63,145,.78); color: rgba(255,255,255,.45); font-size: 16px; font-weight: 950; cursor: pointer; }
        .ranking-filter-tabs button.active { background: #fff; color: #111; }
        .ranking-card, .ranking-connect-card { padding: 18px; border-radius: 18px; background: #fff; border: 1px solid #eef0f4; box-shadow: 0 12px 28px rgba(15,23,42,.06); }
        .ranking-active-card { border-radius: 0 0 18px 18px; }
        .ranking-info-box { display: grid; grid-template-columns: 26px 1fr; gap: 10px; padding: 14px; border-radius: 14px; background: #f0f2f6; color: #111827; font-size: 14px; line-height: 1.35; }
        .ranking-info-box b { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #3262d2; color: #fff; }
        .ranking-card-head { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin: 18px 0 10px; }
        .ranking-card-head h3 { margin: 0; color: #4b5563; font-size: clamp(22px, 3vw, 34px); line-height: 1.05; }
        .ranking-card-head small { color: #94a3b8; font-weight: 800; }
        .ranking-gender { display: flex; gap: 7px; color: #6b7280; font-size: 16px; white-space: nowrap; }
        .ranking-gender b { color: #cc334d; }
        .ranking-list { display: grid; gap: 7px; }
        .ranking-row { display: grid; grid-template-columns: 38px 58px 48px 1fr auto; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 999px; color: #4b5563; }
        .ranking-row.me { background: #f3f4f6; }
        .ranking-row > b { font-size: 22px; color: #5b616d; }
        .ranking-new { color: #cc334d; font-size: 12px; font-weight: 900; }
        .ranking-avatar { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #e5e7eb, #f8fafc); color: #64748b; font-size: 11px; font-weight: 900; }
        .ranking-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; }
        .ranking-row strong { font-size: 22px; color: #cc334d; }
        .ranking-list.compact .ranking-row strong { color: #4b5563; }
        .ranking-empty { margin-top: 10px; padding: 22px; border-radius: 14px; background: #f8fafc; color: #94a3b8; font-size: 20px; line-height: 1.25; }
        .ranking-opt-out { border: 0; background: transparent; color: #94a3b8; text-decoration: underline; font-size: 15px; font-weight: 800; cursor: pointer; }
        .ranking-connect-card { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
        .ranking-connect-card h3 { margin: 0 0 4px; font-size: 22px; }
        .ranking-connect-card p { margin: 0; color: #64748b; }
        .ranking-connect-card button { border: 0; border-radius: 999px; background: #202434; color: #fff; padding: 12px 24px; font-weight: 900; cursor: pointer; }
        .reference-details { padding: 12px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; }
        .reference-details summary { cursor: pointer; font-weight: 900; color: #334155; }
        .reference-shot-grid { display: grid; gap: 10px; margin-top: 12px; }
        .ranking-shots { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        .challenge-shots { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
        .reference-shot-grid figure { margin: 0; overflow: hidden; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; }
        .reference-shot-grid img { display: block; width: 100%; height: 320px; object-fit: contain; object-position: top; background: #fff; }
        .challenge-shots img { height: 260px; background: #030713; }
        .reference-shot-grid figcaption { padding: 8px 10px; color: #64748b; font-size: 11px; font-weight: 800; }
        .challenge-tab { display: grid; gap: 14px; padding: 16px; border-radius: 24px; color: #e5f4ff; background: radial-gradient(circle at 20% 0%, rgba(124,58,237,.42), transparent 35%), linear-gradient(135deg, #07111f, #0b1020 62%, #130a2a); }
        .challenge-hero { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 18px; border: 1px solid rgba(148,163,184,.22); border-radius: 20px; background: rgba(15,23,42,.72); box-shadow: inset 0 0 38px rgba(56,189,248,.07); }
        .challenge-kicker { color: #38d3ff; font-size: 12px; font-weight: 950; letter-spacing: .12em; }
        .challenge-hero h3 { margin: 6px 0; font-size: clamp(24px, 4vw, 38px); }
        .challenge-hero p { margin: 0; max-width: 760px; color: #93a4b8; }
        .challenge-level-orb { display: grid; place-items: center; width: 98px; height: 98px; border-radius: 50%; background: radial-gradient(circle, #22d3ee 0 8%, #512bd4 45%, #111827 72%); box-shadow: 0 0 44px rgba(34,211,238,.35); font-size: 42px; font-weight: 950; }
        .challenge-level-orb small { font-size: 11px; color: #a7f3d0; }
        .challenge-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .challenge-stats div, .challenge-card, .challenge-map-card, .challenge-leaderboard { border: 1px solid rgba(148,163,184,.18); border-radius: 18px; background: rgba(15,23,42,.76); box-shadow: 0 15px 38px rgba(0,0,0,.18); }
        .challenge-stats div { padding: 14px; }
        .challenge-stats span, .challenge-leaderboard span, .challenge-map-copy span { color: #93a4b8; font-size: 12px; font-weight: 800; }
        .challenge-stats b { display: block; margin: 4px 0; font-size: 26px; }
        .challenge-stats small { color: #22c55e; font-weight: 800; }
        .challenge-map-card { display: grid; grid-template-columns: 1.2fr .8fr; gap: 12px; padding: 18px; }
        .challenge-map-copy h3 { margin: 4px 0; font-size: 26px; text-transform: uppercase; }
        .challenge-map-copy p { color: #a8b3c3; }
        .challenge-map-copy button { margin-top: 12px; border: 0; border-radius: 12px; padding: 12px 18px; color: #fff; font-weight: 950; background: linear-gradient(90deg, #38bdf8, #9333ea); cursor: pointer; }
        .challenge-progress { height: 8px; border-radius: 999px; overflow: hidden; background: rgba(148,163,184,.18); }
        .challenge-progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22d3ee, #a855f7); }
        .challenge-path { display: flex; align-items: center; justify-content: center; }
        .challenge-path span { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(148,163,184,.3); border-radius: 50%; color: #94a3b8; font-weight: 900; }
        .challenge-path span.done { color: #fff; background: linear-gradient(135deg, #22c55e, #2563eb); }
        .challenge-path i { width: 42px; height: 2px; background: rgba(148,163,184,.28); }
        .challenge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .challenge-card { padding: 14px; }
        .challenge-card-head { display: flex; justify-content: space-between; align-items: center; }
        .challenge-card-head span { font-size: 28px; }
        .challenge-card-head b { padding: 4px 9px; border-radius: 999px; background: rgba(168,85,247,.22); color: #d8b4fe; font-size: 11px; }
        .challenge-card h4 { margin: 10px 0 6px; color: #fff; }
        .challenge-card p { color: #9ca3af; font-size: 13px; }
        .challenge-leaderboard { display: grid; grid-template-columns: .85fr 1.15fr; gap: 12px; padding: 16px; }
        .challenge-leaderboard h3 { margin: 4px 0; }
        .challenge-leaderboard p { color: #94a3b8; }
        .challenge-leaderboard ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 7px; }
        .challenge-leaderboard li { display: grid; grid-template-columns: 32px 1fr auto; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(2,6,23,.52); }
        .challenge-leaderboard li.me { border: 1px solid rgba(168,85,247,.6); }
        .challenge-leaderboard strong { color: #67e8f9; }
        .challenge-reference { background: rgba(15,23,42,.8); border-color: rgba(148,163,184,.2); }
        .challenge-reference summary { color: #e5f4ff; }
        @media (max-width: 760px) {
          .hero-card { align-items: flex-start; }
          .tab-bar { overflow-x: auto; }
          .tab-btn { min-width: 92px; }
          .inbody-chart-grid { grid-template-columns: 1fr; }
          .inbody-upload-actions { grid-template-columns: 1fr; }
          .inbody-app-header { flex-wrap: wrap; }
          .inbody-app-nav { font-size: 14px; }
          .inbody-app-date { grid-template-columns: 22px 1fr 22px; }
          .inbody-app-date button { grid-column: 1 / -1; }
          .inbody-screen-summary { flex-direction: column; }
          .ranking-top-nav, .ranking-filter-tabs, .challenge-stats, .challenge-grid, .challenge-map-card, .challenge-leaderboard { grid-template-columns: 1fr; }
          .ranking-score-line, .ranking-segment-line, .ranking-hero p, .ranking-card-head, .ranking-connect-card, .challenge-hero { flex-direction: column; align-items: flex-start; text-align: left; }
          .ranking-row { grid-template-columns: 30px 44px 38px 1fr; }
          .ranking-row strong { grid-column: 4; font-size: 18px; }
          .challenge-stats { grid-template-columns: repeat(2, 1fr); }
          .challenge-path { justify-content: flex-start; overflow-x: auto; }
          .inbody-reference-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .inbody-reference-gallery { grid-template-columns: 1fr; }
          .inbody-reference-gallery img { height: clamp(420px, 74vh, 980px); }
          .hist-row { flex-wrap: wrap; }
        }

      `}</style>
    </div>
  );
}
