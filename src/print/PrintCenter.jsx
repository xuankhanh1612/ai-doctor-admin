// PrintCenter.jsx — Trang quản lý in tài liệu y tế
// Đặt vào src/pages/PrintCenter.jsx hoặc src/components/PrintCenter.jsx
import React, { useState, useRef, useCallback } from 'react';
import ExamResultTemplate from './templates/ExamResultTemplate';
import PedigreeTemplate from './templates/PedigreeTemplate';
import InBodyTemplate from './templates/InBodyTemplate';
import NavButtons from '../components/NavButtons.jsx';
import { mockExamResult, mockPedigree, mockInBody, clinicInfo } from './mockData';

// ─── usePrint hook ────────────────────────────────────────────────────────────
function usePrint(templateId) {
  const printRef = useRef(null);

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`<!DOCTYPE html><html lang="vi"><head>
      <meta charset="UTF-8">
      <title>In tài liệu y tế</title>
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Be Vietnam Pro',sans-serif;background:white}
        @page{size:A4;margin:15mm 20mm}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
  }, []);

  return { printRef, handlePrint };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap');
  .pc-root { font-family: 'Be Vietnam Pro', sans-serif; min-height: 100vh; background: #f4f6f9; color: #1a1a2e; }
  .pc-topbar { background: #0f4c81; color: white; padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; }
  .pc-topbar-title { font-size: 16px; font-weight: 600; letter-spacing: 0.2px; }
  .pc-topbar-sub { font-size: 12px; opacity: 0.75; margin-top: 2px; }
  .pc-body { display: flex; height: calc(100vh - 56px); }
  .pc-sidebar { width: 260px; background: white; border-right: 1px solid #e0e7ef; padding: 20px 16px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; overflow-y: auto; }
  .pc-sidebar-label { font-size: 10.5px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; padding: 0 8px; margin-top: 4px; margin-bottom: 4px; }
  .pc-tab { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; border: none; background: transparent; width: 100%; text-align: left; transition: background 0.15s; }
  .pc-tab:hover { background: #f0f4f9; }
  .pc-tab.active { background: #e8f0fe; }
  .pc-tab-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .pc-tab-icon.blue { background: #dbeafe; }
  .pc-tab-icon.purple { background: #ede9fe; }
  .pc-tab-icon.green { background: #dcfce7; }
  .pc-tab-text { font-size: 13px; font-weight: 500; color: #1a1a2e; line-height: 1.3; }
  .pc-tab-sub { font-size: 11px; color: #888; margin-top: 1px; }
  .pc-tab.active .pc-tab-text { color: #1e40af; }
  .pc-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .pc-toolbar { background: white; border-bottom: 1px solid #e0e7ef; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .pc-toolbar-left { display: flex; align-items: center; gap: 12px; }
  .pc-doc-badge { background: #f0f4f9; border-radius: 6px; padding: 4px 12px; font-size: 12px; color: #1e40af; font-weight: 500; }
  .pc-toolbar-right { display: flex; gap: 8px; }
  .btn { padding: 8px 18px; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; font-family: 'Be Vietnam Pro', sans-serif; display: flex; align-items: center; gap: 6px; transition: all 0.15s; }
  .btn-outline { background: white; border: 1px solid #cbd5e1; color: #374151; }
  .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
  .btn-primary { background: #0f4c81; color: white; }
  .btn-primary:hover { background: #0d3d6a; }
  .btn-print { background: #1d9e75; color: white; }
  .btn-print:hover { background: #187d5e; }
  .pc-preview { flex: 1; overflow-y: auto; padding: 24px; background: #e8ecf0; }
  .pc-preview-inner { background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.12); border-radius: 4px; max-width: 794px; margin: 0 auto; min-height: 1123px; }
  .pc-notice { font-size: 12px; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 14px; }
`;

const TABS = [
  {
    id: 'exam',
    icon: '📋',
    iconClass: 'blue',
    label: 'Kết quả khám bệnh',
    sub: 'Chẩn đoán · Đơn thuốc',
    Component: ExamResultTemplate,
    data: mockExamResult,
  },
  {
    id: 'pedigree',
    icon: '🧬',
    iconClass: 'purple',
    label: 'Cây gia phả bệnh',
    sub: 'Pedigree · Di truyền',
    Component: PedigreeTemplate,
    data: mockPedigree,
  },
  {
    id: 'inbody',
    icon: '⚖️',
    iconClass: 'green',
    label: 'Kết quả InBody',
    sub: 'Thành phần cơ thể',
    Component: InBodyTemplate,
    data: mockInBody,
  },
];

export default function PrintCenter({ onPrev, prevLabel }) {
  const [activeTab, setActiveTab] = useState('exam');
  const printRef = useRef(null);

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html><html lang="vi"><head>
      <meta charset="UTF-8"><title>In tài liệu y tế</title>
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Be Vietnam Pro',sans-serif;background:white}@page{size:A4;margin:15mm 20mm}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  }, []);

  const current = TABS.find(t => t.id === activeTab);
  const { Component, data, label } = current;

  return (
    <>
      <style>{css}</style>
      <div className="pc-root">
        {/* Topbar */}
        <div className="pc-topbar">
          <div>
            <div className="pc-topbar-title">🏥 Trung tâm In tài liệu y tế</div>
            <div className="pc-topbar-sub">{clinicInfo.name} · {clinicInfo.address}</div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Consensus Doctor v2.0</div>
        </div>

        <div className="pc-body">
          {/* Sidebar */}
          <div className="pc-sidebar">
            <div className="pc-sidebar-label">Loại tài liệu</div>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`pc-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className={`pc-tab-icon ${tab.iconClass}`}>{tab.icon}</div>
                <div>
                  <div className="pc-tab-text">{tab.label}</div>
                  <div className="pc-tab-sub">{tab.sub}</div>
                </div>
              </button>
            ))}

            <div style={{ flex: 1 }} />
            <div className="pc-notice">
              💡 Dữ liệu hiện là <strong>mock data</strong>. Kết nối API backend để hiển thị dữ liệu thật.
            </div>
          </div>

          {/* Main */}
          <div className="pc-main">
            {/* Toolbar */}
            <div className="pc-toolbar">
              <div className="pc-toolbar-left">
                <span className="pc-doc-badge">📄 {label}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  BN: {data.patient?.name} · {data.patient?.id || data.patient?.id}
                </span>
              </div>
              <div className="pc-toolbar-right">
                <button className="btn btn-outline" onClick={() => window.open(`/print-preview/${activeTab}`, '_blank')}>
                  🔍 Xem toàn màn hình
                </button>
                <button className="btn btn-print" onClick={handlePrint}>
                  🖨️ In ngay
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="pc-preview">
              <div className="pc-preview-inner" ref={printRef}>
                <Component data={data} clinic={clinicInfo} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 28px' }}>
          <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
        </div>
      </div>
    </>
  );
}
