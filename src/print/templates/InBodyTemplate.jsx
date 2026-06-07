// InBodyTemplate.jsx — Kết quả đo InBody
import React from 'react';
import { clinicInfo } from '../mockData';

const styles = `
  .ib-print { font-family: 'Be Vietnam Pro', sans-serif; color: #1a1a2e; background: white; max-width: 794px; margin: 0 auto; padding: 24px 32px; font-size: 13px; line-height: 1.5; }
  .ib-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0d7a5f; padding-bottom: 14px; margin-bottom: 18px; }
  .clinic-name { font-size: 17px; font-weight: 700; color: #0d7a5f; margin-bottom: 3px; }
  .clinic-sub { font-size: 11.5px; color: #555; }
  .doc-title h1 { font-size: 17px; font-weight: 700; color: #0d7a5f; text-align: right; }
  .doc-title .sub { font-size: 11px; color: #888; text-align: right; margin-top: 4px; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: 600; color: #0d7a5f; text-transform: uppercase; letter-spacing: 0.6px; border-left: 3px solid #0d7a5f; padding-left: 8px; margin-bottom: 10px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 24px; }
  .field { display: flex; gap: 4px; font-size: 12.5px; }
  .field-label { color: #666; min-width: 110px; }
  .field-value { font-weight: 500; }
  /* Score badge */
  .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .score-card { background: #f0faf6; border: 1px solid #b8e6d4; border-radius: 8px; padding: 12px; text-align: center; }
  .score-card.highlight { background: #0d7a5f; border-color: #0d7a5f; }
  .score-val { font-size: 22px; font-weight: 700; color: #0d7a5f; }
  .score-card.highlight .score-val { color: white; }
  .score-unit { font-size: 10px; color: #888; }
  .score-card.highlight .score-unit { color: rgba(255,255,255,0.7); }
  .score-name { font-size: 11px; color: #555; margin-top: 2px; }
  .score-card.highlight .score-name { color: rgba(255,255,255,0.85); }
  /* Composition bars */
  .comp-table { width: 100%; border-collapse: collapse; }
  .comp-table th { font-size: 11px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; padding: 4px 8px; text-align: left; }
  .comp-table td { padding: 6px 8px; border-bottom: 0.5px solid #e8f0ee; vertical-align: middle; }
  .bar-bg { background: #e8f0ee; border-radius: 4px; height: 10px; position: relative; width: 100%; }
  .bar-fill { height: 10px; border-radius: 4px; transition: width 0.3s; }
  .bar-normal { background: #1d9e75; }
  .bar-high { background: #e05a00; }
  .bar-low { background: #3c6ab5; }
  .status-badge { font-size: 10.5px; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: inline-block; }
  .badge-normal { background: #e0f5ee; color: #0d7a5f; }
  .badge-high { background: #fff0e6; color: #c04800; }
  .badge-low { background: #e6edff; color: #1a3fa0; }
  /* Segmental */
  .seg-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .seg-card { background: #f7fdf9; border: 1px solid #c8ead8; border-radius: 8px; padding: 10px 8px; text-align: center; }
  .seg-label { font-size: 10.5px; color: #555; margin-bottom: 6px; font-weight: 600; }
  .seg-muscle { font-size: 14px; font-weight: 700; color: #0d7a5f; }
  .seg-fat { font-size: 12px; color: #e07030; margin-top: 2px; }
  .seg-unit { font-size: 10px; color: #aaa; }
  /* History mini chart */
  .history-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .history-table th { background: #f0faf6; color: #0d7a5f; padding: 6px 10px; text-align: center; font-weight: 600; }
  .history-table td { padding: 5px 10px; text-align: center; border-bottom: 0.5px solid #e8f0ee; }
  .trend-up { color: #c04800; }
  .trend-down { color: #0d7a5f; }
  .trend-same { color: #888; }
  .advice-box { background: #f0faf6; border: 1px solid #9ad8c0; border-radius: 8px; padding: 12px 16px; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 14px; border-top: 1px solid #dde3ed; }
  .sign-block { text-align: center; }
  .sign-line { border-top: 1px dashed #aaa; width: 150px; margin: 40px auto 4px; }
  @media print { .ib-print { padding: 0; } }
`;

function getBarWidth(value, min, max) {
  const range = max - min;
  const padded = range * 0.5;
  const total = range + padded * 2;
  const pos = (value - (min - padded)) / total;
  return Math.max(5, Math.min(95, pos * 100));
}

function StatusBadge({ status }) {
  const map = { normal: ['Bình thường', 'badge-normal'], high: ['Cao', 'badge-high'], low: ['Thấp', 'badge-low'] };
  const [label, cls] = map[status] || ['--', 'badge-normal'];
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

export default function InBodyTemplate({ data, clinic = clinicInfo }) {
  const { patient, measurement, composition, segmental, scores, history, recommendation } = data;
  const compRows = [
    { key: 'weight', label: 'Cân nặng', unit: 'kg' },
    { key: 'skeletalMuscle', label: 'Khối cơ xương', unit: 'kg' },
    { key: 'bodyFat', label: 'Mỡ cơ thể', unit: 'kg' },
    { key: 'bmi', label: 'Chỉ số BMI', unit: 'kg/m²' },
    { key: 'pbf', label: 'Tỷ lệ mỡ (PBF)', unit: '%' },
  ];
  const segParts = [
    { key: 'rightArm', label: 'Tay phải' },
    { key: 'leftArm', label: 'Tay trái' },
    { key: 'trunk', label: 'Thân' },
    { key: 'rightLeg', label: 'Chân phải' },
    { key: 'leftLeg', label: 'Chân trái' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="ib-print">
        {/* Header */}
        <div className="ib-header">
          <div>
            <div className="clinic-name">{clinic.name}</div>
            <div className="clinic-sub">{clinic.address} · ☏ {clinic.phone}</div>
          </div>
          <div className="doc-title">
            <h1>KẾT QUẢ ĐO THÀNH PHẦN CƠ THỂ INBODY</h1>
            <div className="sub">Thiết bị: {measurement.device} · Ngày: {measurement.date} {measurement.time}</div>
          </div>
        </div>

        {/* Thông tin */}
        <div className="section">
          <div className="section-title">Thông tin bệnh nhân</div>
          <div className="grid-2">
            <div className="field"><span className="field-label">Họ tên:</span><span className="field-value">{patient.name}</span></div>
            <div className="field"><span className="field-label">Mã BN:</span><span className="field-value">{patient.id}</span></div>
            <div className="field"><span className="field-label">Ngày sinh:</span><span className="field-value">{patient.dob} ({patient.age} tuổi)</span></div>
            <div className="field"><span className="field-label">Giới tính:</span><span className="field-value">{patient.gender}</span></div>
            <div className="field"><span className="field-label">Chiều cao:</span><span className="field-value">{patient.height} cm</span></div>
          </div>
        </div>

        {/* Điểm tổng hợp */}
        <div className="section">
          <div className="section-title">Chỉ số tổng hợp</div>
          <div className="score-grid">
            <div className="score-card highlight">
              <div className="score-val">{scores.inBodyScore}</div>
              <div className="score-unit">/ 100</div>
              <div className="score-name">InBody Score</div>
            </div>
            <div className="score-card">
              <div className="score-val">{scores.visceralFatLevel}</div>
              <div className="score-unit">mức (1–10)</div>
              <div className="score-name">Mỡ nội tạng</div>
            </div>
            <div className="score-card">
              <div className="score-val">{scores.basalMetabolicRate}</div>
              <div className="score-unit">kcal/ngày</div>
              <div className="score-name">Trao đổi chất cơ bản</div>
            </div>
            <div className="score-card">
              <div className="score-val">{scores.totalBodyWater}</div>
              <div className="score-unit">lít</div>
              <div className="score-name">Tổng nước cơ thể</div>
            </div>
          </div>
        </div>

        {/* Thành phần cơ thể */}
        <div className="section">
          <div className="section-title">Thành phần cơ thể</div>
          <table className="comp-table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Chỉ số</th>
                <th style={{ width: 80 }}>Giá trị</th>
                <th>Dải bình thường / Biểu đồ</th>
                <th style={{ width: 90 }}>Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {compRows.map((row) => {
                const c = composition[row.key];
                const pct = getBarWidth(c.value, c.min, c.max);
                const barColor = c.status === 'normal' ? 'bar-normal' : c.status === 'high' ? 'bar-high' : 'bar-low';
                return (
                  <tr key={row.key}>
                    <td style={{ fontWeight: 500 }}>{row.label}</td>
                    <td style={{ fontWeight: 700, fontSize: 14 }}>{c.value} <span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>{row.unit}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#aaa', width: 36, textAlign: 'right' }}>{c.min}</span>
                        <div className="bar-bg" style={{ flex: 1 }}>
                          <div className={`bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: 10, color: '#aaa', width: 36 }}>{c.max}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Phân tích theo đoạn */}
        <div className="section">
          <div className="section-title">Phân tích theo từng đoạn cơ thể</div>
          <div className="seg-grid">
            {segParts.map((part) => {
              const s = segmental[part.key];
              return (
                <div key={part.key} className="seg-card">
                  <div className="seg-label">{part.label}</div>
                  <div className="seg-muscle">{s.muscle}</div>
                  <div className="seg-unit">kg cơ</div>
                  <div className="seg-fat">{s.fat} kg mỡ</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lịch sử đo */}
        <div className="section">
          <div className="section-title">Lịch sử đo (4 lần gần nhất)</div>
          <table className="history-table">
            <thead>
              <tr>
                <th>Ngày đo</th>
                <th>Cân nặng (kg)</th>
                <th>Khối cơ (kg)</th>
                <th>Mỡ cơ thể (kg)</th>
                <th>Tỷ lệ mỡ (%)</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const prev = history[i - 1];
                const trend = (cur, prv) => {
                  if (!prv) return <span className="trend-same">—</span>;
                  if (cur < prv) return <span className="trend-down">▼ {(prv - cur).toFixed(1)}</span>;
                  if (cur > prv) return <span className="trend-up">▲ {(cur - prv).toFixed(1)}</span>;
                  return <span className="trend-same">=</span>;
                };
                return (
                  <tr key={i} style={{ background: i === history.length - 1 ? '#f0faf6' : 'white' }}>
                    <td style={{ fontWeight: i === history.length - 1 ? 600 : 400 }}>{h.date}</td>
                    <td>{h.weight} {trend(h.weight, prev?.weight)}</td>
                    <td>{h.muscle} {trend(h.muscle, prev?.muscle)}</td>
                    <td>{h.fat} {trend(h.fat, prev?.fat)}</td>
                    <td>{h.pbf} {trend(h.pbf, prev?.pbf)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Khuyến nghị */}
        <div className="section">
          <div className="section-title">Nhận xét & Khuyến nghị</div>
          <div className="advice-box">
            <p style={{ fontSize: 12.5, color: '#1a4a3a' }}>{recommendation}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <div style={{ fontSize: 10, color: '#bbb' }}>In lúc {new Date().toLocaleString('vi-VN')} · {clinic.website}</div>
          <div className="sign-block">
            <div className="sign-line"></div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Kỹ thuật viên đo lường</div>
            <div style={{ fontSize: 11, color: '#888' }}>ID: {measurement.technicianId}</div>
          </div>
        </div>
      </div>
    </>
  );
}
