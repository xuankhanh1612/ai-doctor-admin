import React, { useState, useRef } from 'react'
import { useAuth } from '/src/context/AuthContext'
import { useApp } from '/src/context/AppContext'

const FILE_TYPES = {
  'image/jpeg': { icon: '🖼️', label: 'JPEG Image' },
  'image/png': { icon: '🖼️', label: 'PNG Image' },
  'application/pdf': { icon: '📄', label: 'PDF Document' },
  'application/dicom': { icon: '🩻', label: 'DICOM Scan' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', label: 'Word Document' },
}

const AI_SUGGESTIONS = {
  vi: [
    { id: 's1', icon: '🔬', title: 'Sinh thiết mô L2', reason: 'Pathology AI phát hiện tăng trưởng bất thường ở tổn thương thứ phát L2. Cần sinh thiết để xác nhận phân kỳ clone trước khi chốt phác đồ duy trì.', urgency: 'high', test: 'Core needle biopsy · L2 · Week 8' },
    { id: 's2', icon: '🩸', title: 'ctDNA Liquid Biopsy', reason: 'Tần số alen T790M đang tăng (0.8%). Cần xét nghiệm ctDNA hàng tháng để theo dõi xu hướng kháng thuốc sớm.', urgency: 'medium', test: 'Guardant360 · Monthly' },
    { id: 's3', icon: '🫁', title: 'PET-CT Toàn thân', reason: 'Cô Hồng có ung thư gan di căn nhưng chưa xác định ổ gốc. PET-CT toàn thân có thể phát hiện khối u nguyên phát. Khuyến nghị sau khi có kết quả sinh thiết và CT ngực.', urgency: 'high', test: 'Whole-body PET-CT · After biopsy results' },
    { id: 's4', icon: '🧬', title: 'Panel gen mở rộng', reason: 'EGFR Exon 19 del đã xác nhận nhưng cần kiểm tra thêm MET amplification, RET fusion do pattern kháng thuốc.', urgency: 'medium', test: 'FoundationOne CDx · 324-gene panel' },
    { id: 's5', icon: '🩻', title: 'MRI não', reason: 'NSCLC giai đoạn IIA có nguy cơ di căn não 15-25%. Chụp MRI não baseline để loại trừ.', urgency: 'low', test: 'Brain MRI with contrast · Baseline' },
  ],
  en: [
    { id: 's1', icon: '🔬', title: 'L2 Tissue Biopsy', reason: 'Pathology AI detected abnormal growth in secondary lesion L2. Biopsy needed to confirm clonal divergence before finalizing maintenance protocol.', urgency: 'high', test: 'Core needle biopsy · L2 · Week 8' },
    { id: 's2', icon: '🩸', title: 'ctDNA Liquid Biopsy', reason: 'T790M allele frequency rising (0.8%). Monthly ctDNA monitoring needed to track early resistance trends.', urgency: 'medium', test: 'Guardant360 · Monthly' },
    { id: 's3', icon: '🫁', title: 'Whole-body PET-CT', reason: 'Patient has liver metastasis but primary tumor origin unknown. Whole-body PET-CT can identify primary lesion. Recommended after biopsy and chest CT results.', urgency: 'high', test: 'Whole-body PET-CT · After biopsy results' },
    { id: 's4', icon: '🧬', title: 'Extended Gene Panel', reason: 'EGFR Exon 19 del confirmed but need to check MET amplification, RET fusion due to resistance pattern.', urgency: 'medium', test: 'FoundationOne CDx · 324-gene panel' },
    { id: 's5', icon: '🩻', title: 'Brain MRI', reason: 'NSCLC Stage IIA has 15-25% brain metastasis risk. Baseline brain MRI to rule out.', urgency: 'low', test: 'Brain MRI with contrast · Baseline' },
  ]
}

export default function UploadPanel({ patientId, onNext }) {
  const { saveMedicalRecord, getMedicalRecords } = useAuth()
  const { t, lang, theme } = useApp()
  const isDark = theme === 'dark'
  const fileRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState(() => getMedicalRecords(patientId))
  const [uploading, setUploading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [recordType, setRecordType] = useState('imaging')
  const [notes, setNotes] = useState('')

  const suggestions = AI_SUGGESTIONS[lang] || AI_SUGGESTIONS['vi']

  const urgencyColor = { high: '#ff5252', medium: '#ffb74d', low: '#00e676' }
  const urgencyLabel = { high: { vi: 'Khẩn', en: 'Urgent' }, medium: { vi: 'Trung bình', en: 'Medium' }, low: { vi: 'Thấp', en: 'Low' } }

  const c = isDark ? {
    bg: 'rgba(8,12,26,0.6)', border: 'rgba(255,255,255,0.08)',
    text: '#e8f0f8', text2: 'rgba(232,240,248,0.55)', text3: 'rgba(232,240,248,0.28)',
    surface: 'rgba(255,255,255,0.03)', surface2: 'rgba(255,255,255,0.06)',
  } : {
    bg: 'rgba(255,255,255,0.8)', border: 'rgba(0,0,0,0.1)',
    text: '#1a2035', text2: '#555', text3: '#999',
    surface: 'rgba(0,0,0,0.02)', surface2: 'rgba(0,0,0,0.05)',
  }

  const handleFiles = async (files) => {
    for (const file of files) {
      setUploading(true)
      // Simulate upload delay
      await new Promise(r => setTimeout(r, 800))
      const reader = new FileReader()
      reader.onload = (e) => {
        const record = saveMedicalRecord({
          patientId, fileName: file.name, fileType: file.type,
          size: file.size, type: recordType, notes,
          // Store small preview for images
          preview: file.type.startsWith('image/') ? e.target.result : null,
        })
        setUploads(prev => [...prev, record])
        setSuccessMsg(t('uploadSuccess') + ': ' + file.name)
        setTimeout(() => setSuccessMsg(''), 3000)
      }
      reader.readAsDataURL(file)
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFiles([...e.dataTransfer.files])
  }

  const formatSize = (bytes) => bytes > 1e6 ? `${(bytes/1e6).toFixed(1)}MB` : `${(bytes/1e3).toFixed(0)}KB`
  const formatDate = (iso) => new Date(iso).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{t('uploadRecords')}</h2>
        <p style={{ color: c.text2, fontSize: 12, marginTop: 4 }}>
          {lang === 'vi' ? 'Tải lên hồ sơ y tế · Hỗ trợ DICOM, PDF, ảnh, tài liệu' : 'Upload medical records · DICOM, PDF, images, documents'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Upload zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['imaging', 'lab', 'report', 'prescription', 'other'].map(type => (
              <button key={type} onClick={() => setRecordType(type)} style={{
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
                border: `1px solid ${recordType === type ? '#00b8cc' : c.border}`,
                background: recordType === type ? 'rgba(0,180,200,0.12)' : c.surface,
                color: recordType === type ? '#00b8cc' : c.text2,
                fontWeight: recordType === type ? 700 : 400,
              }}>
                {{ imaging: '🩻 Hình ảnh', lab: '🔬 Xét nghiệm', report: '📋 Báo cáo', prescription: '💊 Đơn thuốc', other: '📎 Khác' }[type]}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragEnter={() => setDragging(true)}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#00b8cc' : c.border}`,
              borderRadius: 14, padding: '32px 20px', textAlign: 'center',
              cursor: 'pointer', background: dragging ? 'rgba(0,180,200,0.06)' : c.surface,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>{uploading ? '⏳' : '📂'}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 6 }}>
              {uploading ? (t('uploading')) : t('uploadFile')}
            </div>
            <div style={{ fontSize: 11, color: c.text3 }}>{t('uploadTypes')}</div>
            <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.dcm,.docx" style={{ display: 'none' }}
              onChange={e => handleFiles([...e.target.files])} />
          </div>

          {/* Notes */}
          <textarea
            placeholder={t('notesPlaceholder')}
            value={notes} onChange={e => setNotes(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, resize: 'vertical', minHeight: 72,
              border: `1px solid ${c.border}`, background: c.surface, color: c.text,
              fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />

          {successMsg && (
            <div style={{ background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#00e676' }}>
              ✓ {successMsg}
            </div>
          )}

          {/* Uploaded files */}
          {uploads.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', color: c.text3, marginBottom: 8, textTransform: 'uppercase' }}>
                {`${uploads.length} ${t('recordsUploaded')}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {uploads.slice(-5).reverse().map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8 }}>
                    <span style={{ fontSize: 18 }}>{FILE_TYPES[u.fileType]?.icon || '📎'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.fileName}</div>
                      <div style={{ fontSize: 10, color: c.text3 }}>{formatDate(u.createdAt)} · {u.type}</div>
                    </div>
                    {u.size && <span style={{ fontSize: 10, color: c.text3 }}>{formatSize(u.size)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: c.text3, marginBottom: 12, textTransform: 'uppercase' }}>
            🤖 {t('aiSuggestion')} · {t('testSuggestion')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestions.map(s => (
              <div key={s.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{s.title}</span>
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                    background: `${urgencyColor[s.urgency]}18`, color: urgencyColor[s.urgency],
                    border: `1px solid ${urgencyColor[s.urgency]}30`,
                  }}>
                    {urgencyLabel[s.urgency][lang]}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.6, marginBottom: 8 }}>{s.reason}</p>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#9c6fff', background: 'rgba(156,111,255,0.08)', padding: '4px 8px', borderRadius: 6 }}>
                  → {s.test}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {onNext && (
        <button onClick={onNext} style={{
          padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
          background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)',
          color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', alignSelf: 'flex-start',
        }}>
          {t('next')} →
        </button>
      )}
    </div>
  )
}
