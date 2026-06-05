'use client';

import { useState, useRef } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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

function UploadTab({ onAnalysis }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        const mediaType = file.type;
        const analysis = await analyzeInBodyWithAI(base64, mediaType);
        setResult(analysis);
        if (onAnalysis) onAnalysis(analysis);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Lỗi phân tích. Vui lòng thử lại.');
      setLoading(false);
    }
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
        accept=".pdf,.jpg,.jpeg,.png,.csv"
        onChange={handleFile}
      />
      {file && (
        <div className="file-preview">
          ✅ {file.name} ({(file.size / 1024).toFixed(0)} KB)
        </div>
      )}
      <button className="analyze-btn" onClick={handleAnalyze} disabled={!file || loading}>
        {loading ? '⏳ Đang phân tích...' : '🧠 Phân tích AI với Claude'}
      </button>
      {error && <div className="error-msg">{error}</div>}
      {result && (
        <div className="ai-result">
          <div className="ai-header">
            <span className="ai-badge">Claude Vision</span>
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
    label: record.date.slice(5),
    muscle: record.muscle,
    fat: record.fat,
  }));

  return (
    <div>
      <div className="section-title">Xu hướng 3 tháng</div>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 14, bottom: 6, left: -14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" name="Cơ bắp (kg)" dataKey="muscle" stroke="#378ADD" strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" name="Mỡ (%)" dataKey="fat" stroke="#D85A30" strokeWidth={3} dot={{ r: 3 }} />
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
export default function InBodyDashboard({ userId, initialRecords }) {
  const [records, setRecords] = useState(initialRecords || SAMPLE_RECORDS);
  const [tab, setTab] = useState('upload');
  const latest = records[records.length - 1];
  const prev = records[records.length - 2];
  const levelInfo = calcLevel(calcXP(records));

  const handleNewAnalysis = (analysis) => {
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
    { id: 'badges', label: 'Huy hiệu', icon: '🏅' },
  ];

  return (
    <div className="inbody-dashboard">
      <HeroCard levelInfo={levelInfo} latest={latest} />

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
        <MetricCard icon="💧" label="Nước" value={latest?.water} unit="%"
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
        {tab === 'upload' && <UploadTab onAnalysis={handleNewAnalysis} />}
        {tab === 'quests' && <QuestsTab records={records} />}
        {tab === 'history' && <HistoryTab records={records} />}
        {tab === 'badges' && <BadgesTab records={records} />}
      </div>

      <style jsx>{`
        .inbody-dashboard { font-family: var(--font-sans, system-ui); max-width: 680px; }
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
        .history-chart { height: 250px; width: 100%; margin-bottom: 0.5rem; }
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
      `}</style>
    </div>
  );
}
