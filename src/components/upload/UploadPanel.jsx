import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import NavButtons from '../NavButtons.jsx'
import MedicalUploader from './MedicalUploader.jsx'

// ─── AI Test Suggestions (giữ nguyên từ bản gốc) ─────────────────────────────
const AI_SUGGESTIONS = {
  vi: [
    { id: 's1', icon: '🔬', title: 'Sinh thiết mô L2', reason: 'Pathology AI phát hiện tăng trưởng bất thường ở tổn thương thứ phát L2. Cần sinh thiết để xác nhận phân kỳ clone trước khi chốt phác đồ duy trì.', urgency: 'high', test: 'Core needle biopsy · L2 · Week 8' },
    { id: 's2', icon: '🩸', title: 'ctDNA Liquid Biopsy', reason: 'Tần số alen T790M đang tăng (0.8%). Cần xét nghiệm ctDNA hàng tháng để theo dõi xu hướng kháng thuốc sớm.', urgency: 'medium', test: 'Guardant360 · Monthly' },
    { id: 's3', icon: '🫁', title: 'PET-CT Toàn thân', reason: 'Cô Hồng có ung thư gan di căn nhưng chưa xác định ổ gốc. PET-CT toàn thân có thể phát hiện khối u nguyên phát.', urgency: 'high', test: 'Whole-body PET-CT · After biopsy results' },
    { id: 's4', icon: '🧬', title: 'Panel gen mở rộng', reason: 'EGFR Exon 19 del đã xác nhận nhưng cần kiểm tra thêm MET amplification, RET fusion do pattern kháng thuốc.', urgency: 'medium', test: 'FoundationOne CDx · 324-gene panel' },
    { id: 's5', icon: '🩻', title: 'MRI não', reason: 'NSCLC giai đoạn IIA có nguy cơ di căn não 15-25%. Chụp MRI não baseline để loại trừ.', urgency: 'low', test: 'Brain MRI with contrast · Baseline' },
  ],
  en: [
    { id: 's1', icon: '🔬', title: 'L2 Tissue Biopsy', reason: 'Pathology AI detected abnormal growth in secondary lesion L2. Biopsy needed to confirm clonal divergence before finalizing maintenance protocol.', urgency: 'high', test: 'Core needle biopsy · L2 · Week 8' },
    { id: 's2', icon: '🩸', title: 'ctDNA Liquid Biopsy', reason: 'T790M allele frequency rising (0.8%). Monthly ctDNA monitoring needed to track early resistance trends.', urgency: 'medium', test: 'Guardant360 · Monthly' },
    { id: 's3', icon: '🫁', title: 'Whole-body PET-CT', reason: 'Patient has liver metastasis but primary tumor origin unknown. Whole-body PET-CT can identify primary lesion.', urgency: 'high', test: 'Whole-body PET-CT · After biopsy results' },
    { id: 's4', icon: '🧬', title: 'Extended Gene Panel', reason: 'EGFR Exon 19 del confirmed but need to check MET amplification, RET fusion due to resistance pattern.', urgency: 'medium', test: 'FoundationOne CDx · 324-gene panel' },
    { id: 's5', icon: '🩻', title: 'Brain MRI', reason: 'NSCLC Stage IIA has 15-25% brain metastasis risk. Baseline brain MRI to rule out.', urgency: 'low', test: 'Brain MRI with contrast · Baseline' },
  ],
}

export default function UploadPanel({ patientId, onNext, onPrev, prevLabel }) {
  const { t, lang, theme } = useApp()
  const isDark = theme === 'dark'

  const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'suggestions'

  const suggestions = AI_SUGGESTIONS[lang] || AI_SUGGESTIONS['vi']
  const urgencyColor = { high: '#ff5252', medium: '#ffb74d', low: '#00e676' }
  const urgencyLabel = {
    high:   { vi: 'Khẩn',      en: 'Urgent' },
    medium: { vi: 'Trung bình', en: 'Medium' },
    low:    { vi: 'Thấp',       en: 'Low' },
  }

  const c = isDark ? {
    bg: 'rgba(8,12,26,0.6)', border: 'rgba(255,255,255,0.08)',
    text: '#e8f0f8', text2: 'rgba(232,240,248,0.55)', text3: 'rgba(232,240,248,0.28)',
    surface: 'rgba(255,255,255,0.03)', surface2: 'rgba(255,255,255,0.06)',
  } : {
    bg: 'rgba(255,255,255,0.8)', border: 'rgba(0,0,0,0.1)',
    text: '#1a2035', text2: '#555', text3: '#999',
    surface: 'rgba(0,0,0,0.02)', surface2: 'rgba(0,0,0,0.05)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Panel Tab Switcher */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `1px solid ${c.border}`,
        background: c.surface,
      }}>
        {[
          { key: 'upload',      label: lang === 'en' ? '📁 Medical Records'   : '📁 Hồ Sơ Y Tế' },
          { key: 'suggestions', label: lang === 'en' ? '🤖 AI Suggestions'    : '🤖 Gợi ý AI' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '13px 22px', cursor: 'pointer', border: 'none',
            background: activeTab === tab.key ? 'rgba(0,180,200,0.1)' : 'transparent',
            borderBottom: `2px solid ${activeTab === tab.key ? '#00b8cc' : 'transparent'}`,
            color: activeTab === tab.key ? '#00b8cc' : c.text2,
            fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400,
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── MedicalUploader (từ ai-clinic-khanh-main) ─────────────────────── */}
      {activeTab === 'upload' && (
        <MedicalUploader
          patientId={patientId}
          onSelectImage={null}  // truyền callback nếu muốn kết nối với imaging panel
        />
      )}

      {/* ── AI Suggestions (giữ nguyên của admin) ─────────────────────────── */}
      {activeTab === 'suggestions' && (
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: c.text, margin: '0 0 4px' }}>
              🤖 {t('aiSuggestion')} · {t('testSuggestion')}
            </h2>
            <p style={{ color: c.text2, fontSize: 12, margin: 0 }}>
              {lang === 'vi'
                ? 'Gợi ý xét nghiệm dựa trên phân tích AI đa tác nhân'
                : 'Test suggestions based on multi-agent AI analysis'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestions.map(s => (
              <div key={s.id} style={{
                background: c.surface, border: `1px solid ${c.border}`,
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{s.title}</span>
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 10px', borderRadius: 4, fontWeight: 600,
                    background: `${urgencyColor[s.urgency]}18`,
                    color: urgencyColor[s.urgency],
                    border: `1px solid ${urgencyColor[s.urgency]}30`,
                  }}>
                    {urgencyLabel[s.urgency][lang]}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.65, margin: '0 0 8px' }}>
                  {s.reason}
                </p>
                <div style={{
                  fontSize: 11, fontFamily: 'monospace', color: '#9c6fff',
                  background: 'rgba(156,111,255,0.08)', padding: '5px 10px', borderRadius: 6,
                }}>
                  → {s.test}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div style={{ padding: '16px 28px', borderTop: `1px solid ${c.border}` }}>
        <NavButtons
          onNext={onNext}
          nextLabel={`${t('next')} →`}
          onPrev={onPrev}
          prevLabel={prevLabel}
        />
      </div>
    </div>
  )
}
