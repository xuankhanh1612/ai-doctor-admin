// PedigreeTemplate.jsx — Cây gia phả bệnh (Medical Pedigree)
import React from 'react';
import { clinicInfo } from '../mockData';

const styles = `
  .ped-print { font-family: 'Be Vietnam Pro', sans-serif; color: #1a1a2e; background: white; max-width: 794px; margin: 0 auto; padding: 24px 32px; font-size: 13px; line-height: 1.55; }
  .ped-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #6b3fa0; padding-bottom: 14px; margin-bottom: 18px; }
  .clinic-name { font-size: 17px; font-weight: 700; color: #6b3fa0; margin-bottom: 3px; }
  .clinic-sub { font-size: 11.5px; color: #555; }
  .doc-title h1 { font-size: 17px; font-weight: 700; color: #6b3fa0; text-align: right; }
  .doc-title .sub { font-size: 11px; color: #888; text-align: right; margin-top: 4px; }
  .section-title { font-size: 12px; font-weight: 600; color: #6b3fa0; text-transform: uppercase; letter-spacing: 0.6px; border-left: 3px solid #6b3fa0; padding-left: 8px; margin-bottom: 10px; }
  .section { margin-bottom: 18px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 24px; }
  .field { display: flex; gap: 4px; font-size: 12.5px; }
  .field-label { color: #666; min-width: 120px; }
  .field-value { font-weight: 500; }
  /* Pedigree chart */
  .gen-row { margin-bottom: 24px; }
  .gen-label { font-size: 11px; color: #888; font-weight: 600; margin-bottom: 10px; letter-spacing: 0.4px; }
  .members { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start; }
  .member-card { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 90px; }
  .member-symbol { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; border: 2.5px solid #333; position: relative; }
  .symbol-square { border-radius: 2px; }
  .symbol-circle { border-radius: 50%; }
  .status-healthy { background: white; color: white; border-color: #555; }
  .status-affected { background: #555; color: white; border-color: #333; }
  .status-carrier { background: linear-gradient(135deg, white 50%, #888 50%); border-color: #555; }
  .status-proband { background: white; border-color: #6b3fa0; border-width: 3px; }
  .proband-arrow { position: absolute; left: -18px; bottom: 0; font-size: 16px; color: #6b3fa0; }
  .deceased-line { position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px; }
  .member-name { font-size: 11px; font-weight: 600; text-align: center; color: #222; }
  .member-cond { font-size: 10px; text-align: center; color: #e05a00; font-weight: 500; }
  /* Legend */
  .legend { display: flex; flex-wrap: wrap; gap: 6px 20px; background: #f9f6ff; border: 1px solid #d8c8f0; border-radius: 8px; padding: 10px 16px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11.5px; }
  .legend-sym { font-size: 16px; font-weight: 700; }
  /* Risk */
  .risk-high { background: #fff3e0; border: 1px solid #f0a500; border-radius: 8px; padding: 12px 16px; }
  .risk-badge { display: inline-block; background: #f0a500; color: white; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
  .risk-list { list-style: none; padding: 0; }
  .risk-list li::before { content: '⚠ '; }
  .risk-list li { font-size: 12.5px; margin-bottom: 3px; color: #5a3500; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 14px; border-top: 1px solid #dde3ed; }
  .sign-block { text-align: center; }
  .sign-line { border-top: 1px dashed #aaa; width: 150px; margin: 40px auto 4px; }
  @media print { .ped-print { padding: 0; } }
`;

function MemberSymbol({ member }) {
  const isCircle = member.gender === 'F';
  const shapeClass = isCircle ? 'symbol-circle' : 'symbol-square';
  let statusClass = 'status-healthy';
  let inner = '';
  if (member.status === 'affected') { statusClass = 'status-affected'; }
  if (member.status === 'carrier') { statusClass = 'status-carrier'; }
  if (member.status === 'proband') { statusClass = 'status-proband'; inner = '★'; }

  const style = {};
  if (member.status === 'carrier') {
    style.background = isCircle
      ? 'radial-gradient(circle at 70% 50%, #888 50%, white 50%)'
      : 'linear-gradient(135deg, white 50%, #888 50%)';
  }

  return (
    <div className={`member-symbol ${shapeClass} ${statusClass}`} style={style}>
      {member.status === 'proband' && <span className="proband-arrow">→</span>}
      {member.deceased && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="#c00" strokeWidth="2" />
        </svg>
      )}
      <span style={{ color: member.status === 'affected' ? 'white' : '#333', fontSize: 14 }}>{inner}</span>
    </div>
  );
}

export default function PedigreeTemplate({ data, clinic = clinicInfo }) {
  const { patient, generations, riskAssessment } = data;
  return (
    <>
      <style>{styles}</style>
      <div className="ped-print">
        {/* Header */}
        <div className="ped-header">
          <div>
            <div className="clinic-name">{clinic.name}</div>
            <div className="clinic-sub">{clinic.address}</div>
            <div className="clinic-sub">☏ {clinic.phone}</div>
          </div>
          <div className="doc-title">
            <h1>CÂY GIA PHẢ BỆNH (PEDIGREE)</h1>
            <div className="sub">Ngày lập: {patient.date} · BS: {patient.doctor}</div>
          </div>
        </div>

        {/* Thông tin bệnh nhân */}
        <div className="section">
          <div className="section-title">Thông tin bệnh nhân</div>
          <div className="grid-2">
            <div className="field"><span className="field-label">Họ tên:</span><span className="field-value">{patient.name}</span></div>
            <div className="field"><span className="field-label">Mã BN:</span><span className="field-value">{patient.id}</span></div>
            <div className="field"><span className="field-label">Ngày sinh:</span><span className="field-value">{patient.dob}</span></div>
            <div className="field"><span className="field-label">Giới tính:</span><span className="field-value">{patient.gender}</span></div>
            <div className="field" style={{ gridColumn: '1/-1' }}><span className="field-label">Mục đích đánh giá:</span><span className="field-value">{patient.condition}</span></div>
          </div>
        </div>

        {/* Chú giải */}
        <div className="section">
          <div className="section-title">Chú giải ký hiệu</div>
          <div className="legend">
            {[
              { sym: '■', label: 'Nam mắc bệnh', color: '#333' },
              { sym: '□', label: 'Nam khỏe mạnh', color: '#333' },
              { sym: '●', label: 'Nữ mắc bệnh', color: '#333' },
              { sym: '○', label: 'Nữ khỏe mạnh', color: '#333' },
              { sym: '◑', label: 'Mang gen (chưa phát)', color: '#666' },
              { sym: '★', label: 'Bệnh nhân (proband)', color: '#6b3fa0' },
              { sym: '↗', label: 'Đường gạch chéo = đã mất', color: '#c00' },
            ].map((l, i) => (
              <div key={i} className="legend-item">
                <span className="legend-sym" style={{ color: l.color }}>{l.sym}</span>
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sơ đồ gia phả */}
        <div className="section">
          <div className="section-title">Sơ đồ gia phả</div>
          {generations.map((gen) => (
            <div key={gen.gen} className="gen-row">
              <div className="gen-label">THẾ HỆ {gen.gen} — {gen.label}</div>
              <div className="members">
                {gen.members.map((m) => (
                  <div key={m.id} className="member-card">
                    <MemberSymbol member={m} />
                    <div className="member-name">{m.label}</div>
                    {m.condition && <div className="member-cond">{m.condition}</div>}
                  </div>
                ))}
              </div>
              {gen.gen !== generations[generations.length - 1].gen && (
                <div style={{ borderBottom: '1px dashed #ddd', marginTop: 16 }} />
              )}
            </div>
          ))}
        </div>

        {/* Đánh giá nguy cơ */}
        <div className="section">
          <div className="section-title">Đánh giá nguy cơ di truyền</div>
          <div className="risk-high">
            <span className="risk-badge">Mức độ: {riskAssessment.level}</span>
            <p style={{ fontSize: 12.5, marginBottom: 8, color: '#5a3500' }}>Bệnh có nguy cơ di truyền cao trong gia đình:</p>
            <ul className="risk-list">
              {riskAssessment.conditions.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            <p style={{ marginTop: 10, fontSize: 12.5, color: '#5a3500' }}>
              <strong>Khuyến nghị: </strong>{riskAssessment.recommendation}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <div style={{ fontSize: 10, color: '#bbb' }}>In lúc {new Date().toLocaleString('vi-VN')} · {clinic.website}</div>
          <div className="sign-block">
            <div className="sign-line"></div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{patient.doctor}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Bác sĩ lập phả đồ</div>
          </div>
        </div>
      </div>
    </>
  );
}
