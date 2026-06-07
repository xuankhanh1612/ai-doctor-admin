// ExamResultTemplate.jsx — Phiếu kết quả khám bệnh
import React from 'react';
import { clinicInfo } from '../mockData';

const styles = `
  .exam-print { font-family: 'Be Vietnam Pro', sans-serif; color: #1a1a2e; background: white; max-width: 794px; margin: 0 auto; padding: 24px 32px; font-size: 13px; line-height: 1.55; }
  .exam-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f4c81; padding-bottom: 14px; margin-bottom: 18px; }
  .clinic-name { font-size: 17px; font-weight: 700; color: #0f4c81; margin-bottom: 3px; }
  .clinic-sub { font-size: 11.5px; color: #555; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 18px; font-weight: 700; color: #0f4c81; margin-bottom: 2px; }
  .doc-title .visit-code { font-size: 11px; color: #888; background: #f0f4f8; padding: 2px 8px; border-radius: 4px; display: inline-block; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: 600; color: #0f4c81; text-transform: uppercase; letter-spacing: 0.6px; border-left: 3px solid #0f4c81; padding-left: 8px; margin-bottom: 10px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; }
  .field { display: flex; gap: 4px; }
  .field-label { color: #666; min-width: 110px; }
  .field-value { font-weight: 500; color: #1a1a2e; }
  .vitals-box { background: #f7fbff; border: 1px solid #cde3f5; border-radius: 8px; padding: 12px 16px; }
  .vital-item { text-align: center; }
  .vital-val { font-size: 18px; font-weight: 700; color: #0f4c81; }
  .vital-unit { font-size: 10px; color: #888; }
  .vital-name { font-size: 11px; color: #555; margin-top: 2px; }
  .diag-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .diag-table th { background: #e8f0fe; color: #0f4c81; padding: 7px 10px; text-align: left; font-weight: 600; }
  .diag-table td { padding: 7px 10px; border-bottom: 0.5px solid #e8edf3; vertical-align: top; }
  .badge-main { background: #fff3cd; color: #7d5a00; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge-sub { background: #e8f0fe; color: #3c4fa8; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
  .rx-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .rx-table th { background: #f0f9f4; color: #1b6b3a; padding: 7px 10px; text-align: left; font-weight: 600; }
  .rx-table td { padding: 7px 10px; border-bottom: 0.5px solid #e5f0ea; vertical-align: top; }
  .rx-table tr:nth-child(even) td { background: #fafcfa; }
  .advice-box { background: #fffbf0; border: 1px solid #f0d070; border-radius: 8px; padding: 12px 16px; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 14px; border-top: 1px solid #dde3ed; }
  .sign-block { text-align: center; }
  .sign-line { border-top: 1px dashed #aaa; width: 150px; margin: 40px auto 4px; }
  .sign-name { font-size: 12px; font-weight: 600; color: #1a1a2e; }
  .watermark { font-size: 10px; color: #bbb; }
  @media print { .exam-print { padding: 0; } }
`;

export default function ExamResultTemplate({ data, clinic = clinicInfo }) {
  const { patient, visit, vitals, chiefComplaint, diagnosis, prescriptions, advice, nextVisit } = data;
  return (
    <>
      <style>{styles}</style>
      <div className="exam-print">
        {/* Header */}
        <div className="exam-header">
          <div>
            <div className="clinic-name">{clinic.name}</div>
            <div className="clinic-sub">{clinic.address}</div>
            <div className="clinic-sub">☏ {clinic.phone} · {clinic.email}</div>
          </div>
          <div className="doc-title">
            <h1>PHIẾU KẾT QUẢ KHÁM BỆNH</h1>
            <div style={{ marginTop: 6 }}>
              <span className="visit-code">Mã khám: {visit.visitCode}</span>
            </div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              Ngày: {visit.date} · {visit.time}
            </div>
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
            <div className="field"><span className="field-label">Điện thoại:</span><span className="field-value">{patient.phone}</span></div>
            <div className="field"><span className="field-label">BHYT:</span><span className="field-value">{patient.bhyt}</span></div>
            <div className="field" style={{ gridColumn: '1/-1' }}><span className="field-label">Địa chỉ:</span><span className="field-value">{patient.address}</span></div>
          </div>
        </div>

        {/* Thông tin khám */}
        <div className="section">
          <div className="section-title">Thông tin khám</div>
          <div className="grid-2">
            <div className="field"><span className="field-label">Bác sĩ khám:</span><span className="field-value">{visit.doctor}</span></div>
            <div className="field"><span className="field-label">Chuyên khoa:</span><span className="field-value">{visit.specialty}</span></div>
            <div className="field" style={{ gridColumn: '1/-1' }}><span className="field-label">Lý do khám:</span><span className="field-value">{chiefComplaint}</span></div>
          </div>
        </div>

        {/* Sinh hiệu */}
        <div className="section">
          <div className="section-title">Sinh hiệu</div>
          <div className="vitals-box">
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 8 }}>
              {[
                { val: vitals.bloodPressure, unit: 'mmHg', name: 'Huyết áp' },
                { val: vitals.heartRate, unit: 'lần/phút', name: 'Nhịp tim' },
                { val: vitals.temperature, unit: '°C', name: 'Nhiệt độ' },
                { val: vitals.spO2, unit: '%', name: 'SpO₂' },
                { val: vitals.weight, unit: 'kg', name: 'Cân nặng' },
                { val: vitals.height, unit: 'cm', name: 'Chiều cao' },
                { val: vitals.bmi, unit: 'BMI', name: 'Chỉ số BMI' },
              ].map((v, i) => (
                <div key={i} className="vital-item">
                  <div className="vital-val">{v.val}</div>
                  <div className="vital-unit">{v.unit}</div>
                  <div className="vital-name">{v.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chẩn đoán */}
        <div className="section">
          <div className="section-title">Chẩn đoán</div>
          <table className="diag-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Mã ICD-10</th>
                <th>Tên bệnh</th>
                <th style={{ width: 110 }}>Loại</th>
              </tr>
            </thead>
            <tbody>
              {diagnosis.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: '#0f4c81' }}>{d.icd}</td>
                  <td>{d.name}</td>
                  <td>
                    <span className={d.type === 'Chính' ? 'badge-main' : 'badge-sub'}>{d.type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Đơn thuốc */}
        <div className="section">
          <div className="section-title">Đơn thuốc</div>
          <table className="rx-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>STT</th>
                <th>Tên thuốc</th>
                <th style={{ width: 80 }}>Số lượng</th>
                <th>Cách dùng</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.stt}>
                  <td style={{ textAlign: 'center' }}>{rx.stt}</td>
                  <td style={{ fontWeight: 500 }}>{rx.drug}</td>
                  <td>{rx.qty}</td>
                  <td style={{ color: '#444' }}>{rx.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lời dặn */}
        <div className="section">
          <div className="section-title">Lời dặn & Tái khám</div>
          <div className="advice-box">
            <p style={{ marginBottom: 8 }}>{advice}</p>
            <p style={{ fontWeight: 600, color: '#7d5a00' }}>
              📅 Ngày tái khám dự kiến: {nextVisit}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <div className="watermark">
            In lúc {new Date().toLocaleString('vi-VN')} · {clinic.website}
          </div>
          <div className="sign-block">
            <div className="sign-line"></div>
            <div className="sign-name">{visit.doctor}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{visit.specialty}</div>
          </div>
        </div>
      </div>
    </>
  );
}
