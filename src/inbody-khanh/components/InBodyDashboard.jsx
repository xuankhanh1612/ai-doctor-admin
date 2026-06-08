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
import inBodyRankFriendRef from '../DataInBody/IMG_2651.PNG';
import inBodyRankAddFriendRef from '../DataInBody/IMG_2652.PNG';
import inBodyRankWeightRef from '../DataInBody/IMG_2653.PNG';
import inBodyRankTotalRef from '../DataInBody/IMG_2654.PNG';
import inBodyRankDeviceRef from '../DataInBody/IMG_2655.PNG';
import inBodyRankDailyRef from '../DataInBody/IMG_2656.PNG';
import inBodyRankFatRef from '../DataInBody/IMG_2657.PNG';
import inBodyRoadMapRef from '../DataInBody/RoadMap.png';
import inBodyJourneyRef from '../DataInBody/HanhTrinh3.png';

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

const INBODY_RANK_REFERENCE_IMAGES = [
  { src: inBodyRankFriendRef, label: 'IMG_2651.PNG · Bạn bè' },
  { src: inBodyRankAddFriendRef, label: 'IMG_2652.PNG · Kết bạn' },
  { src: inBodyRankWeightRef, label: 'IMG_2653.PNG · Cân nặng của tôi' },
  { src: inBodyRankTotalRef, label: 'IMG_2654.PNG · Tổng' },
  { src: inBodyRankDeviceRef, label: 'IMG_2655.PNG · Cùng thiết bị' },
  { src: inBodyRankDailyRef, label: 'IMG_2656.PNG · Hằng ngày' },
  { src: inBodyRankFatRef, label: 'IMG_2657.PNG · Tỷ lệ mỡ' },
];

const RANK_WEEKLY_ROWS = [
  { rank: 1, status: 'NEW', name: 'Kathy', score: 137 },
  { rank: 2, status: 'NEW', name: '4444', score: 119 },
  { rank: 3, status: 'NEW', name: '3118', score: 114 },
  { rank: 4, status: 'NEW', name: 'jonah5663', score: 111 },
  { rank: 4, status: 'NEW', name: '6899', score: 111 },
  { rank: 6, status: 'NEW', name: 'FattyBoyz', score: 110 },
  { rank: 7, status: 'NEW', name: '0962', score: 109 },
];

const RANK_DAILY_ROWS = [
  { rank: 1, status: 'NEW', name: '8418', score: 95 },
  { rank: 2, status: 'NEW', name: '6315', score: 91 },
  { rank: 2, status: 'NEW', name: '0671', score: 91 },
  { rank: 2, status: 'NEW', name: '9844', score: 91 },
  { rank: 6, status: 'NEW', name: 'Carmen', score: 90, photo: true },
];

const RANK_FAT_ROWS = [
  { rank: 1, status: 'NEW', name: 'Giri', value: '5.1%' },
  { rank: 2, status: 'NEW', name: '6100', value: '6.5%' },
  { rank: 3, status: 'NEW', name: '8418', value: '6.7%' },
  { rank: 4, status: 'NEW', name: '6588', value: '6.9%' },
  { rank: 5, status: 'NEW', name: '0591', value: '7.3%' },
];

const CHALLENGE_CARDS = [
  { id: 'inflammation', icon: '🧬', title: 'Inflammation Control', state: 'Đang thực hiện', progress: 63, reward: '5,000 HLT', tone: 'cyan' },
  { id: 'protein', icon: '🥩', title: 'IL-6 Protein Optimization', state: 'Epic', progress: 42, reward: '+850 XP', tone: 'purple' },
  { id: 'warrior', icon: '⚔️', title: '7 Day Shadow Mode', state: 'Ngày 7', progress: 100, reward: 'Rương huyền thoại', tone: 'gold' },
];

const DAILY_CHALLENGES = [
  { label: 'Đi bộ 8,000 bước', xp: 300, done: true },
  { label: 'Thiền 15 phút', xp: 300, done: true },
  { label: 'Uống đủ nước', xp: 200, done: false },
  { label: 'Hoàn thành 3 bài tập', xp: 700, done: false },
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


function RankRow({ row, unit = 'Điểm' }) {
  return (
    <div className="rank-row">
      <b>{row.rank}</b>
      <span className="rank-new">{row.status}</span>
      <span className={`rank-avatar ${row.photo ? 'photo' : ''}`}>{row.photo ? '🏋️' : ''}</span>
      <span className="rank-name">{row.name}</span>
      <strong>{row.score ?? row.value}<small>{row.score ? unit : ''}</small></strong>
    </div>
  );
}

function RankList({ title, rows, unit = 'Điểm', gender = 'Tổng', emptyText }) {
  return (
    <section className="rank-list-section">
      <div className="rank-list-heading">
        <h4>{title}</h4>
        <div><b>{gender}</b><span> Nam giới</span><span> Nữ giới</span></div>
      </div>
      {emptyText ? (
        <div className="rank-empty-card">{emptyText}</div>
      ) : rows.map((row) => <RankRow key={`${title}-${row.rank}-${row.name}`} row={row} unit={unit} />)}
    </section>
  );
}

function RankingTab({ records }) {
  const [segment, setSegment] = useState('Tổng');
  const latest = records[records.length - 1] || {};
  const score = latest.score ?? 64;
  const segments = ['Tổng', 'Cùng thiết bị', 'Cân nặng của tôi', 'Bạn bè'];
  const infoCopy = segment === 'Cùng thiết bị'
    ? 'Dựa trên tất cả báo cáo sức khỏe của người dùng cùng loại thiết bị chuyên nghiệp. Bảng xếp hạng tuần được cài đặt 00:00 thứ hai hằng tuần, bảng ngày được cài đặt 00:00 hằng ngày.'
    : segment === 'Cân nặng của tôi'
      ? 'Dựa trên các thiết bị chuyên dụng, báo cáo sức khỏe của người dùng có cân nặng giống bạn. Kết quả có thể mất khoảng 10 phút để phản ánh vào bảng xếp hạng.'
      : segment === 'Bạn bè'
        ? 'Bảng xếp hạng bạn bè trên InBody. Bật công khai để bạn bè thấy điểm và gửi lời mời kết bạn để cùng theo dõi tiến bộ.'
        : 'Dựa trên tất cả báo cáo sức khỏe của người dùng InBody trên cùng một quốc gia. Bảng xếp hạng hằng tuần và hằng ngày được làm mới vào 00:00.';

  return (
    <div className="ranking-tab">
      <div className="rank-hero">
        <div className="rank-statusbar"><span>11:31</span><span>▮▮▮  Wi‑Fi  🔋</span></div>
        <div className="rank-logo">InBody</div>
        <div className="rank-main-nav"><span>Trang tổng</span><span>Chi tiết</span><span>Thay đổi</span><b>Xếp hạng</b></div>
        <div className="rank-score-line"><span>Điểm InBody của tôi</span><strong>{score}</strong><small>Điểm</small></div>
        <div className="rank-filter"><button type="button">Nam giới / Cùng độ tuổi(40~50Tuổi) ▾</button><span>Top 94%</span></div>
        <p>Thiết bị chăm sóc sức khỏe tại nhà, dữ liệu nhập thủ công chỉ phản ánh trong bảng xếp hạng bạn bè.</p>
        <div className="rank-segments">
          {segments.map((item) => (
            <button key={item} type="button" className={segment === item ? 'active' : ''} onClick={() => setSegment(item)}>{item}</button>
          ))}
        </div>
      </div>

      {segment === 'Bạn bè' ? (
        <div className="rank-friends-panel">
          <div className="rank-friends-title"><h3>Xếp hạng bạn bè<br />trên InBody</h3><span>Riêng tư</span><button type="button" aria-label="Bật công khai" /><b>Công khai</b></div>
          <div className="rank-friend-row"><b>1</b><span className="rank-avatar photo">💪</span><span>Tôi</span><strong>{score}Điểm</strong></div>
          <button type="button" className="rank-add-friend">Kết bạn</button>
        </div>
      ) : (
        <div className="rank-content-panel">
          <div className="rank-info"><b>i</b><span>{infoCopy}</span></div>
          <RankList title="Xếp hạng điểm InBody hằng tuần" rows={segment === 'Cùng thiết bị' ? [] : RANK_WEEKLY_ROWS} emptyText={segment === 'Cùng thiết bị' ? 'Không có kết quả từ cuộc kiểm tra InBody được tiến hành tuần này. Hãy làm một cuộc kiểm tra InBody tại một cơ sở chuyên nghiệp ngay bây giờ và kiểm tra xếp hạng của bạn!' : ''} />
          <RankList title="Xếp hạng điểm InBody hằng ngày" rows={RANK_DAILY_ROWS} />
          <RankList title="Xếp hạng tỷ lệ mỡ trong cơ thể hằng ngày" rows={RANK_FAT_ROWS} unit="" gender="Nam giới" />
          <button type="button" className="rank-opt-out">Không tham gia vào việc xếp hạng.</button>
        </div>
      )}

      <div className="section-title rank-reference-title">Ảnh tham khảo IMG_2651.PNG → IMG_2657.PNG</div>
      <div className="rank-reference-gallery">
        {INBODY_RANK_REFERENCE_IMAGES.map((image) => (
          <figure key={image.label}><img src={image.src} alt={image.label} /><figcaption>{image.label}</figcaption></figure>
        ))}
      </div>
    </div>
  );
}

function ChallengeTab({ records }) {
  const levelInfo = calcLevel(calcXP(records));
  return (
    <div className="challenge-tab">
      <div className="challenge-shell">
        <aside className="challenge-sidebar">
          <div className="challenge-brand">AI CLINIC<br /><span>HEALTH UNIVERSE</span></div>
          <div className="challenge-user"><span>🧑‍⚕️</span><div><b>Nguyễn An</b><small>Level {levelInfo.level}</small></div></div>
          {['Tổng quan', 'Check-in', 'InBody', 'AI Coach', 'Nhiệm vụ', 'XP & Quests'].map((item) => <button key={item} type="button" className={item === 'InBody' ? 'active' : ''}>{item}</button>)}
        </aside>
        <main className="challenge-main">
          <div className="challenge-topline"><div><h3>Chào buổi tối, An! 👋</h3><p>AI hiểu bạn — sức khỏe tốt hơn mỗi ngày.</p></div><button type="button">Check-in hôm nay</button></div>
          <div className="challenge-stat-grid">
            <div><span>Recovery Score</span><b>72</b><small>/100 · Khá tốt</small></div>
            <div><span>Tâm trạng</span><b>4.2</b><small>/5 · +0.6</small></div>
            <div><span>Giấc ngủ</span><b>6.5</b><small>giờ · -0.5</small></div>
            <div><span>Streak</span><b>7</b><small>ngày · Tuyệt vời!</small></div>
          </div>
          <div className="challenge-card-grid">
            {CHALLENGE_CARDS.map((card) => (
              <article key={card.id} className={`challenge-card ${card.tone}`}>
                <span>{card.icon}</span><b>{card.title}</b><em>{card.state}</em>
                <div className="challenge-progress"><i style={{ width: `${card.progress}%` }} /></div>
                <small>{card.progress}% · {card.reward}</small>
              </article>
            ))}
          </div>
          <div className="challenge-lower-grid">
            <section className="daily-panel">
              <h4>Nhiệm vụ hằng ngày</h4>
              {DAILY_CHALLENGES.map((item) => (
                <div key={item.label}><span>{item.done ? '✅' : '⬜'} {item.label}</span><b>+{item.xp} XP</b></div>
              ))}
            </section>
            <section className="ai-coach-panel">
              <h4>AI Coach gợi ý cho bạn</h4>
              <p>Dựa trên dữ liệu 7 ngày qua, AI gợi ý cải thiện giấc ngủ, quản lý căng thẳng và tăng protein sau vận động.</p>
              <button type="button">Chat với AI Coach</button>
            </section>
          </div>
        </main>
      </div>

      <div className="quest-mobile-grid">
        <article className="quest-phone onboarding"><span>01 ONBOARDING</span><h3>Bắt đầu hành trình chiến binh</h3><button type="button">Bắt đầu</button></article>
        <article className="quest-phone archetype"><span>02 CHỌN ARCHETYPE</span><h3>Chọn con đường của bạn</h3>{['Warrior', 'Monk', 'Scholar', 'Creator', 'Healer'].map((item) => <b key={item}>{item}</b>)}</article>
        <article className="quest-phone dashboard"><span>04 DASHBOARD</span><h3>Shadow Warrior</h3><div className="challenge-progress"><i style={{ width: '72%' }} /></div><p>XP 4,250 / 6,000</p></article>
        <article className="quest-phone leaderboard"><span>15 LEADERBOARD</span><h3>Bảng xếp hạng</h3>{['Titan', 'Shadow', 'Phoenix', 'Samurai', 'You'].map((item, index) => <p key={item}>{index + 1}. {item} <b>XP {18450 - index * 1250}</b></p>)}</article>
      </div>

      <div className="section-title challenge-reference-title">Ảnh tham khảo AIClinicInBody.PNG · RoadMap.png · HanhTrinh3.png</div>
      <div className="challenge-reference-gallery">
        <figure><img src={aiClinicInBodyRef} alt="AIClinicInBody.PNG" /><figcaption>AIClinicInBody.PNG</figcaption></figure>
        <figure><img src={inBodyRoadMapRef} alt="RoadMap.png" /><figcaption>RoadMap.png</figcaption></figure>
        <figure><img src={inBodyJourneyRef} alt="HanhTrinh3.png" /><figcaption>HanhTrinh3.png</figcaption></figure>
      </div>
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
    { id: 'history', label: 'Lịch sử', icon: '📈' },
    { id: 'ranking', label: 'Xếp Hạng', icon: '🏆' },
    { id: 'challenges', label: 'Thử Thách', icon: '🧬' },
    { id: 'screens', label: 'Màn hình', icon: '📱' },
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
        {tab === 'history' && <HistoryTab records={records} />}
        {tab === 'ranking' && <RankingTab records={records} />}
        {tab === 'challenges' && <ChallengeTab records={records} />}
        {tab === 'screens' && <InBodyAppScreensTab />}
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
        .ranking-tab { border-radius: 22px; overflow: hidden; border: 1px solid #e5e7eb; background: #fff; }
        .rank-hero { padding: 18px 18px 0; color: #fff; background: linear-gradient(135deg, #ee3f73 0%, #7b2a8d 100%); }
        .rank-statusbar { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 24px; opacity: .98; }
        .rank-logo { font-size: 28px; font-weight: 950; letter-spacing: -.06em; margin-bottom: 18px; }
        .rank-main-nav { display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; gap: 10px; color: rgba(255,255,255,.38); font-size: clamp(14px, 2.5vw, 22px); font-weight: 800; }
        .rank-main-nav b { justify-self: stretch; padding: 12px 8px; border-radius: 24px; background: #fff; color: #67256e; text-align: center; }
        .rank-score-line { display: flex; align-items: baseline; justify-content: flex-end; gap: 8px; margin: 26px 22px 12px; }
        .rank-score-line span { font-size: clamp(16px, 2.5vw, 26px); }
        .rank-score-line strong { font-size: clamp(54px, 10vw, 78px); line-height: .8; }
        .rank-score-line small { font-size: clamp(16px, 2.4vw, 25px); font-weight: 800; }
        .rank-filter { display: flex; justify-content: flex-end; align-items: center; gap: 16px; margin-bottom: 18px; }
        .rank-filter button { border: 0; border-radius: 999px; padding: 12px 22px; color: #fff; background: rgba(72,16,82,.42); font-size: clamp(13px, 2.2vw, 22px); cursor: pointer; }
        .rank-filter span { font-size: clamp(18px, 3vw, 30px); }
        .rank-hero p { max-width: 860px; margin: 0 auto 28px; text-align: center; font-size: clamp(12px, 1.8vw, 19px); line-height: 1.35; }
        .rank-segments { display: grid; grid-template-columns: repeat(4, 1fr); align-items: end; margin: 0 -18px; }
        .rank-segments button { min-height: 66px; border: 0; border-radius: 24px 24px 0 0; background: rgba(255,255,255,.2); color: rgba(255,255,255,.34); font-size: clamp(12px, 2.4vw, 22px); font-weight: 950; cursor: pointer; }
        .rank-segments button.active { background: #fff; color: #111; }
        .rank-content-panel, .rank-friends-panel { padding: 22px; }
        .rank-info { display: flex; gap: 12px; align-items: flex-start; padding: 18px; border-radius: 18px; background: #f0f2f6; font-size: clamp(13px, 2vw, 19px); line-height: 1.35; }
        .rank-info b { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; background: #315bd8; flex-shrink: 0; }
        .rank-list-section { margin-top: 26px; }
        .rank-list-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .rank-list-heading h4 { margin: 0; max-width: 430px; color: #4b5563; font-size: clamp(20px, 3.2vw, 34px); line-height: 1.05; }
        .rank-list-heading div { white-space: nowrap; color: #4b5563; font-size: clamp(14px, 2.1vw, 22px); }
        .rank-list-heading b { color: #c72d45; }
        .rank-row { display: grid; grid-template-columns: 42px 70px 56px 1fr auto; align-items: center; gap: 10px; padding: 11px 8px; color: #4b5563; font-size: clamp(16px, 2.4vw, 27px); }
        .rank-row > b { font-size: 28px; color: #5b6470; }
        .rank-new { color: #c72d45; font-size: 16px; }
        .rank-avatar { width: 52px; height: 52px; border-radius: 50%; background: #e5e7eb; position: relative; overflow: hidden; display: grid; place-items: center; }
        .rank-avatar::before { content: ''; width: 17px; height: 17px; border-radius: 50%; background: #d1d5db; position: absolute; top: 13px; }
        .rank-avatar::after { content: ''; width: 31px; height: 20px; border-radius: 18px 18px 8px 8px; background: #d1d5db; position: absolute; bottom: 8px; }
        .rank-avatar.photo { background: linear-gradient(135deg, #bbf7d0, #60a5fa); font-size: 24px; }
        .rank-avatar.photo::before, .rank-avatar.photo::after { display: none; }
        .rank-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .rank-row strong { color: #4b5563; font-size: clamp(22px, 3.4vw, 36px); }
        .rank-row small { font-size: .68em; font-weight: 500; }
        .rank-empty-card { padding: 28px 24px; border-radius: 12px; background: #f7f7f8; color: #94a3b8; font-size: clamp(16px, 2.3vw, 24px); line-height: 1.35; }
        .rank-opt-out { margin: 28px 0 6px 28px; border: 0; background: transparent; color: #94a3b8; text-decoration: underline; font-size: 18px; cursor: pointer; }
        .rank-friends-title { display: grid; grid-template-columns: 1fr auto 72px auto; align-items: center; gap: 14px; margin-bottom: 20px; }
        .rank-friends-title h3 { margin: 0; font-size: clamp(21px, 3.2vw, 34px); line-height: 1.05; color: #374151; }
        .rank-friends-title span, .rank-friends-title b { font-size: clamp(14px, 2vw, 22px); color: #374151; }
        .rank-friends-title button { width: 72px; height: 40px; border: 0; border-radius: 999px; background: #c72d45; position: relative; }
        .rank-friends-title button::after { content: ''; position: absolute; right: 4px; top: 4px; width: 32px; height: 32px; background: #fff; border-radius: 50%; }
        .rank-friend-row { display: grid; grid-template-columns: 56px 58px 1fr auto; gap: 14px; align-items: center; padding: 16px 28px; border-radius: 999px; background: #f2f2f3; color: #4b5563; font-size: 22px; }
        .rank-friend-row strong { color: #c72d45; }
        .rank-add-friend { display: block; width: min(92%, 760px); margin: clamp(120px, 26vh, 360px) auto 24px; padding: 20px; border: 0; border-radius: 999px; background: #202432; color: #fff; font-size: 28px; font-weight: 950; }
        .rank-reference-title, .challenge-reference-title { margin: 22px; }
        .rank-reference-gallery { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 0 22px 22px; }
        .rank-reference-gallery figure, .challenge-reference-gallery figure { margin: 0; overflow: hidden; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; }
        .rank-reference-gallery img { display: block; width: 100%; height: 360px; object-fit: cover; object-position: top; }
        .rank-reference-gallery figcaption, .challenge-reference-gallery figcaption { padding: 8px 10px; color: #64748b; font-size: 11px; font-weight: 800; }
        .challenge-tab { border-radius: 22px; background: #07111f; color: #e5f0ff; padding: 12px; overflow: hidden; }
        .challenge-shell { display: grid; grid-template-columns: 180px 1fr; min-height: 520px; border: 1px solid rgba(148,163,184,.18); border-radius: 18px; background: radial-gradient(circle at 72% -10%, rgba(124,58,237,.28), transparent 42%), #07111f; overflow: hidden; }
        .challenge-sidebar { padding: 18px 14px; border-right: 1px solid rgba(148,163,184,.14); background: rgba(2,6,23,.56); }
        .challenge-brand { font-weight: 950; letter-spacing: .06em; margin-bottom: 22px; }
        .challenge-brand span { color: #38bdf8; }
        .challenge-user { display: flex; gap: 10px; padding: 10px; border-radius: 14px; background: rgba(148,163,184,.08); margin-bottom: 14px; }
        .challenge-user small { display: block; color: #22c55e; }
        .challenge-sidebar button { display: block; width: 100%; text-align: left; border: 0; border-radius: 10px; background: transparent; color: #cbd5e1; padding: 9px 10px; cursor: pointer; }
        .challenge-sidebar button.active { background: rgba(124,58,237,.38); color: #fff; }
        .challenge-main { padding: 18px; }
        .challenge-topline { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
        .challenge-topline h3 { margin: 0; font-size: 24px; }
        .challenge-topline p { margin: 4px 0 0; color: #94a3b8; }
        .challenge-topline button, .ai-coach-panel button { border: 0; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; padding: 10px 14px; font-weight: 800; }
        .challenge-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
        .challenge-stat-grid > div, .challenge-card, .daily-panel, .ai-coach-panel, .quest-phone { border: 1px solid rgba(148,163,184,.16); border-radius: 14px; background: rgba(15,23,42,.72); box-shadow: inset 0 1px 0 rgba(255,255,255,.03); }
        .challenge-stat-grid > div { padding: 14px; }
        .challenge-stat-grid span, .challenge-card em, .challenge-card small { color: #94a3b8; font-style: normal; }
        .challenge-stat-grid b { display: block; font-size: 30px; margin-top: 8px; }
        .challenge-stat-grid small { color: #22c55e; }
        .challenge-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
        .challenge-card { padding: 16px; }
        .challenge-card > span { font-size: 30px; }
        .challenge-card b, .challenge-card em { display: block; margin-top: 8px; }
        .challenge-progress { height: 8px; border-radius: 999px; background: rgba(148,163,184,.18); overflow: hidden; margin: 14px 0 8px; }
        .challenge-progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #38bdf8, #8b5cf6, #22c55e); }
        .challenge-lower-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .daily-panel, .ai-coach-panel { padding: 16px; }
        .daily-panel h4, .ai-coach-panel h4 { margin: 0 0 12px; }
        .daily-panel div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(148,163,184,.1); }
        .daily-panel b { color: #22c55e; }
        .ai-coach-panel p { color: #cbd5e1; line-height: 1.55; }
        .quest-mobile-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
        .quest-phone { min-height: 250px; padding: 18px; background: radial-gradient(circle at 50% 0%, rgba(59,130,246,.28), transparent 45%), rgba(15,23,42,.78); }
        .quest-phone span { color: #e5e7eb; font-size: 12px; letter-spacing: .08em; }
        .quest-phone h3 { text-transform: uppercase; }
        .quest-phone button { width: 100%; border: 0; border-radius: 10px; padding: 11px; color: #fff; background: linear-gradient(90deg, #38bdf8, #9333ea); font-weight: 900; }
        .quest-phone b, .quest-phone p { display: block; padding: 8px 10px; border: 1px solid rgba(148,163,184,.18); border-radius: 10px; color: #dbeafe; }
        .quest-phone.leaderboard p { display: flex; justify-content: space-between; margin: 8px 0; }
        .challenge-reference-gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .challenge-reference-gallery img { display: block; width: 100%; height: 360px; object-fit: contain; object-position: top; background: #07111f; }
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
          .inbody-reference-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .inbody-reference-gallery { grid-template-columns: 1fr; }
          .inbody-reference-gallery img { height: clamp(420px, 74vh, 980px); }
          .hist-row { flex-wrap: wrap; }
          .rank-main-nav, .rank-segments { grid-template-columns: repeat(2, 1fr); }
          .rank-filter, .rank-list-heading { flex-direction: column; align-items: flex-start; }
          .rank-row { grid-template-columns: 30px 46px 44px 1fr auto; gap: 7px; }
          .rank-row > b { font-size: 22px; }
          .rank-avatar { width: 42px; height: 42px; }
          .rank-new { font-size: 12px; }
          .rank-friends-title { grid-template-columns: 1fr; }
          .rank-reference-gallery { grid-template-columns: 1fr; }
          .rank-reference-gallery img { height: clamp(420px, 74vh, 980px); object-fit: contain; }
          .challenge-shell { grid-template-columns: 1fr; }
          .challenge-sidebar { border-right: 0; border-bottom: 1px solid rgba(148,163,184,.14); }
          .challenge-stat-grid, .challenge-card-grid, .challenge-lower-grid, .quest-mobile-grid, .challenge-reference-gallery { grid-template-columns: 1fr; }
          .challenge-reference-gallery img { height: auto; max-height: 680px; }
        }

      `}</style>
    </div>
  );
}
