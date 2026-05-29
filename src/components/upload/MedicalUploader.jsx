import { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import {
  getAllRecords,
  saveRecord,
  deleteRecord,
  updateAnalysis,
  detectFileType,
  formatBytes,
  fileToBase64,
  fileToDataUrl,
  fileTypeLabel,
  fileTypeIcon,
} from '../../lib/medicalStorage.js'
import { notifyUpload } from '../../hooks/useMedicalData.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  xray: '#00e5ff', ct: '#9c6fff', mri: '#f48fb1', pdf: '#ffb74d', photo: '#00e676',
}
const ACCEPT  = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'
const MAX_MB  = 20

// ─── Sub-components ───────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
      background: active ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
      color: active ? '#00e5ff' : 'rgba(255,255,255,0.5)',
      fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
    }}>{children}</button>
  )
}

function RecordThumb({ record, onClick, onDelete }) {
  const color = TYPE_COLORS[record.fileType] || '#aaa'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div onClick={onClick} style={{ cursor: 'pointer', flex: 1 }}>
        {record.mimeType === 'application/pdf' ? (
          <div style={{ height: 90, background: 'rgba(255,171,64,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📄</div>
        ) : (
          <img src={record.dataUrl} alt={record.filename}
            style={{ width: '100%', height: 90, objectFit: 'cover' }} />
        )}
        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color, fontFamily: 'monospace' }}>{fileTypeLabel(record.fileType)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.filename}
          </div>
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete() }} style={{
        margin: '0 8px 8px', padding: '5px 0', borderRadius: 6, cursor: 'pointer',
        background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)',
        color: 'rgba(255,82,82,0.8)', fontSize: 11, width: 'calc(100% - 16px)',
      }}>🗑 Xoá</button>
    </div>
  )
}

function RecordCard({ record, onClick, onDelete }) {
  const color = TYPE_COLORS[record.fileType] || '#aaa'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
    }}>
      <div onClick={onClick}>
        {record.mimeType === 'application/pdf' ? (
          <div style={{ height: 130, background: 'rgba(255,171,64,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📄</div>
        ) : (
          <img src={record.dataUrl} alt={record.filename}
            style={{ width: '100%', height: 130, objectFit: 'cover' }} />
        )}
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace',
              background: `${color}18`, color, border: `1px solid ${color}40`,
            }}>{fileTypeLabel(record.fileType)}</span>
            {record.aiAnalysis && <span style={{ fontSize: 9, color: '#00e676' }}>✓ AI</span>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.filename}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
            {new Date(record.uploadedAt).toLocaleDateString('vi-VN')} · {formatBytes(record.size)}
          </div>
        </div>
      </div>
      <div style={{ padding: '0 12px 12px' }}>
        <button onClick={e => { e.stopPropagation(); onDelete() }} style={{
          background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)',
          borderRadius: 6, padding: '5px 12px', color: 'rgba(255,82,82,0.7)',
          fontSize: 11, cursor: 'pointer', width: '100%',
        }}>Xóa</button>
      </div>
    </div>
  )
}

function MetaRow({ k, v, vColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{k}</span>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: vColor || 'rgba(255,255,255,0.7)', maxWidth: '55%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MedicalUploader({ patientId, onSelectImage }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const recordScope = { ownerEmail: user?.email, includeUnowned: !!user?.isAdmin }

  const [view, setView]                   = useState('upload')  // 'upload' | 'library' | 'detail'
  const [records, setRecords]             = useState([])
  const [selected, setSelected]           = useState(null)
  const [dragging, setDragging]           = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyzing, setAnalyzing]         = useState(false)
  const [analysisStream, setAnalysisStream] = useState('')
  const [error, setError]                 = useState('')
  const [apiKey, setApiKey]               = useState('')
  const [showApiInput, setShowApiInput]   = useState(false)
  const [notes, setNotes]                 = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadRecords()
    const saved = localStorage.getItem('ai-clinic-api-key')
    if (saved) setApiKey(saved)
  }, [user?.email, user?.isAdmin])

  async function loadRecords() {
    const recs = await getAllRecords(recordScope)
    setRecords(recs)
  }

  // ─── File processing ────────────────────────────────────────────────────
  const processFiles = useCallback(async (files) => {
    setError('')
    const arr = Array.from(files)

    for (const file of arr) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`File "${file.name}" quá lớn (tối đa ${MAX_MB}MB)`)
        continue
      }
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError(`Định dạng không hỗ trợ: ${file.type}`)
        continue
      }

      setUploading(true)
      setUploadProgress(10)

      try {
        const progressInterval = setInterval(() => {
          setUploadProgress(p => Math.min(p + 15, 85))
        }, 150)

        const [dataUrl, base64Data] = await Promise.all([
          fileToDataUrl(file),
          fileToBase64(file),
        ])

        clearInterval(progressInterval)
        setUploadProgress(100)

        const record = {
          id:         `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          filename:   file.name,
          name:       file.name,
          fileType:   detectFileType(file.type, file.name),
          type:       detectFileType(file.type, file.name),
          mimeType:   file.type,
          size:       file.size,
          uploadedAt: new Date().toISOString(),
          dataUrl,
          base64Data,
          notes:      '',
          ownerEmail:  user?.email || null,
        }

        await saveRecord(record, { ownerEmail: user?.email })
        notifyUpload()
        await loadRecords()

        setTimeout(() => {
          setUploading(false)
          setUploadProgress(0)
          setSelected(record)
          setNotes('')
          setView('detail')
        }, 400)

      } catch {
        setError('Lỗi khi đọc file. Vui lòng thử lại.')
        setUploading(false)
        setUploadProgress(0)
      }
    }
  }, [user?.email])

  const onDragOver  = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop      = e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }
  const onFileChange = e => { if (e.target.files?.length) processFiles(e.target.files) }

  async function handleDelete(id) {
    if (!confirm('Xóa hồ sơ này?')) return
    await deleteRecord(id, recordScope)
    await loadRecords()
    if (selected?.id === id) { setSelected(null); setView('upload') }
  }

  async function saveNotes() {
    if (!selected) return
    const updated = { ...selected, notes }
    await saveRecord(updated, { ownerEmail: user?.email })
    setSelected(updated)
    await loadRecords()
  }

  // ─── AI Analysis (gọi thẳng Anthropic API, stream) ─────────────────────
  async function analyzeWithAI(record) {
    if (!apiKey) { setShowApiInput(true); return }

    setAnalyzing(true)
    setAnalysisStream('')

    const typeLabel = fileTypeLabel(record.fileType)
    const prompt = `Bạn là bác sĩ AI chuyên khoa chẩn đoán hình ảnh. Phân tích ${typeLabel} này và cung cấp:

1. **Nhận xét tổng quát** về chất lượng và loại hình ảnh
2. **Phát hiện bất thường** (nếu có): vị trí, kích thước ước tính, đặc điểm
3. **Mức độ ưu tiên**: Bình thường / Cần theo dõi / Cần khám sớm / Cần khám ngay
4. **Gợi ý** xét nghiệm hoặc khám bổ sung
5. **Lưu ý quan trọng**

Trả lời bằng ${lang === 'en' ? 'English' : 'tiếng Việt'}, ngắn gọn và rõ ràng. Nhắc nhở đây là hỗ trợ AI, không thay thế bác sĩ.`

    try {
      const isPdf = record.mimeType === 'application/pdf'
      const body = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        stream: true,
        messages: [{
          role: 'user',
          content: isPdf
            ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: record.base64Data } }, { type: 'text', text: prompt }]
            : [{ type: 'image',    source: { type: 'base64', media_type: record.mimeType,   data: record.base64Data } }, { type: 'text', text: prompt }],
        }],
      }

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error?.message || 'API error')
      }

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullText += data.delta.text
              setAnalysisStream(fullText)
            }
          } catch {}
        }
      }

      const analysis = {
        summary: fullText, findings: [], recommendation: '',
        confidence: 0.85, analyzedAt: new Date().toISOString(),
      }
      await updateAnalysis(record.id, analysis, recordScope)
      setSelected(prev => prev ? { ...prev, aiAnalysis: analysis } : prev)
      await loadRecords()

    } catch (err) {
      setAnalysisStream(`❌ Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: '#04060f', fontFamily: "'DM Sans', sans-serif", color: '#e8f0f8', padding: 24 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
        .uploader-fade { animation: fade-in 0.3s ease both; }
        .uploader-hover:hover { transform: scale(1.02); transition: transform 0.15s; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
            📁 {lang === 'en' ? 'Medical Records' : 'Hồ Sơ Y Tế'}
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: 'monospace' }}>
            {lang === 'en'
              ? 'Upload X-Ray · CT · MRI · PDF · Images · Stored locally'
              : 'Upload X-Ray · CT · MRI · PDF · Ảnh hồ sơ · Lưu local vĩnh viễn'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <TabBtn active={view === 'upload'}  onClick={() => setView('upload')}>
            + {lang === 'en' ? 'Upload' : 'Tải lên'}
          </TabBtn>
          <TabBtn active={view === 'library'} onClick={() => setView('library')}>
            {lang === 'en' ? 'Library' : 'Thư viện'}
            {records.length > 0 && (
              <span style={{ background: 'rgba(0,229,255,0.2)', color: '#00e5ff', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>
                {records.length}
              </span>
            )}
          </TabBtn>
        </div>
      </div>

      {/* API Key input */}
      {showApiInput && (
        <div className="uploader-fade" style={{
          background: 'rgba(255,171,64,0.08)', border: '1px solid rgba(255,171,64,0.25)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: '#ffb74d', flex: 1 }}>
            {lang === 'en'
              ? 'Enter Anthropic API key for AI analysis (stored locally):'
              : 'Nhập Anthropic API key để phân tích AI (lưu local, không gửi server):'}
          </span>
          <input
            type="password" placeholder="sk-ant-..."
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); localStorage.setItem('ai-clinic-api-key', e.target.value) }}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,171,64,0.3)',
              borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 12,
              fontFamily: 'monospace', width: 260, outline: 'none',
            }}
          />
          <button onClick={() => setShowApiInput(false)} style={{
            background: 'rgba(255,171,64,0.15)', border: '1px solid rgba(255,171,64,0.3)',
            borderRadius: 8, padding: '8px 16px', color: '#ffb74d', cursor: 'pointer', fontSize: 12,
          }}>{lang === 'en' ? 'Save' : 'Lưu'}</button>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#ff5252' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── UPLOAD VIEW ─────────────────────────────────────────────────── */}
      {view === 'upload' && (
        <div className="uploader-fade">
          {/* Drop zone */}
          <div
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#00e5ff' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 16, padding: '52px 24px', textAlign: 'center',
              cursor: uploading ? 'wait' : 'pointer',
              background: dragging ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s', marginBottom: 20,
            }}
          >
            {uploading ? (
              <div>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 14, color: '#00e5ff', marginBottom: 16 }}>
                  {lang === 'en' ? 'Processing file…' : 'Đang xử lý file…'}
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, maxWidth: 300, margin: '0 auto', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#00b8cc,#7c4dff)',
                    width: `${uploadProgress}%`, transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🩻</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                  {lang === 'en' ? 'Drag & drop files here' : 'Kéo thả file vào đây'}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                  {lang === 'en' ? 'or click to select' : 'hoặc nhấn để chọn file'}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['X-Ray JPG/PNG', 'CT Scan', 'MRI', 'PDF hồ sơ', 'Ảnh chụp'].map(label => (
                    <span key={label} style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                    }}>{label}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 14 }}>
                  {lang === 'en' ? 'Max 20MB · JPG, PNG, WebP, PDF' : 'Tối đa 20MB · JPG, PNG, WebP, PDF'}
                </div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" multiple accept={ACCEPT} onChange={onFileChange} style={{ display: 'none' }} />

          {/* Recent records */}
          {records.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: 12 }}>
                {lang === 'en' ? 'Recent records' : 'Hồ sơ gần đây'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {records.slice(0, 6).map(r => (
                  <RecordThumb key={r.id} record={r}
                    onClick={() => { setSelected(r); setNotes(r.notes || ''); setView('detail') }}
                    onDelete={() => handleDelete(r.id)}
                  />
                ))}
              </div>
              {records.length > 6 && (
                <button onClick={() => setView('library')} style={{
                  marginTop: 12, width: '100%', padding: '10px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer',
                }}>
                  {lang === 'en' ? `View all ${records.length} records →` : `Xem tất cả ${records.length} hồ sơ →`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIBRARY VIEW ─────────────────────────────────────────────────── */}
      {view === 'library' && (
        <div className="uploader-fade">
          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div>{lang === 'en' ? 'No records yet. Upload your first file!' : 'Chưa có hồ sơ nào. Upload file đầu tiên!'}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
              {records.map(r => (
                <RecordCard key={r.id} record={r}
                  onClick={() => { setSelected(r); setNotes(r.notes || ''); setView('detail') }}
                  onDelete={() => handleDelete(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL VIEW ──────────────────────────────────────────────────── */}
      {view === 'detail' && selected && (
        <div className="uploader-fade">
          <button onClick={() => setView('library')} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '7px 14px', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: 12, marginBottom: 20,
          }}>← {lang === 'en' ? 'Back to library' : 'Quay lại thư viện'}</button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: Preview */}
            <div>
              <div style={{
                background: '#000', borderRadius: 14, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14,
                minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected.mimeType === 'application/pdf' ? (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>{selected.filename}</div>
                    <button
                      onClick={() => onSelectImage?.(selected.dataUrl, records, { selectedRecord: selected })}
                      style={{
                        padding: '10px 22px', background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)',
                        border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >🔬 {lang === 'en' ? 'Use for Compare →' : 'So sánh bên Compare →'}</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                    <img
                      src={selected.dataUrl} alt={selected.filename}
                      style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8, cursor: 'pointer' }}
                      onClick={() => onSelectImage?.(selected.dataUrl, records, { selectedRecord: selected })}
                    />
                    <button
                      onClick={() => onSelectImage?.(selected.dataUrl, records, { selectedRecord: selected })}
                      style={{
                        padding: '10px 22px', background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)',
                        border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >🔬 {lang === 'en' ? 'Use for Compare →' : 'So sánh bên Compare →'}</button>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
                <MetaRow k={lang === 'en' ? 'Type' : 'Loại'}      v={fileTypeLabel(selected.fileType)} vColor={TYPE_COLORS[selected.fileType]} />
                <MetaRow k="File"                                   v={selected.filename} />
                <MetaRow k={lang === 'en' ? 'Size' : 'Kích thước'} v={formatBytes(selected.size)} />
                <MetaRow k={lang === 'en' ? 'Uploaded' : 'Upload'} v={new Date(selected.uploadedAt).toLocaleString('vi-VN')} />
              </div>

              {/* Notes */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                  {lang === 'en' ? 'NOTES' : 'GHI CHÚ'}
                </div>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder={lang === 'en' ? 'Add notes about this record…' : 'Thêm ghi chú về hồ sơ này…'}
                  rows={3}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    padding: '10px 14px', color: '#e8f0f8', fontSize: 12,
                    resize: 'vertical', outline: 'none', fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box',
                  }}
                />
                <button onClick={saveNotes} style={{
                  marginTop: 8, padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)',
                  color: '#00e5ff', fontSize: 12,
                }}>{lang === 'en' ? 'Save notes' : 'Lưu ghi chú'}</button>
              </div>
            </div>

            {/* Right: AI Analysis */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: 12 }}>
                {lang === 'en' ? 'AI ANALYSIS' : 'PHÂN TÍCH AI'}
              </div>

              {!selected.aiAnalysis && !analyzing && !analysisStream && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '40px 24px', textAlign: 'center', marginBottom: 14,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                    {lang === 'en' ? 'Let AI analyze this medical file' : 'Để AI phân tích hồ sơ này'}
                  </div>
                  <button onClick={() => analyzeWithAI(selected)} style={{
                    padding: '12px 28px', borderRadius: 10, cursor: 'pointer',
                    background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)',
                    color: '#fff', fontSize: 14, fontWeight: 600, border: 'none',
                  }}>▶ {lang === 'en' ? 'Analyze with Claude AI' : 'Phân tích với Claude AI'}</button>
                  {!apiKey && (
                    <div style={{ fontSize: 11, color: 'rgba(255,171,64,0.7)', marginTop: 10 }}>
                      {lang === 'en' ? 'Requires Anthropic API key' : 'Cần Anthropic API key'}
                      <button onClick={() => setShowApiInput(true)} style={{
                        background: 'none', border: 'none', color: '#ffb74d',
                        cursor: 'pointer', textDecoration: 'underline', fontSize: 11, marginLeft: 4,
                      }}>{lang === 'en' ? 'Enter key' : 'Nhập key'}</button>
                    </div>
                  )}
                </div>
              )}

              {(analyzing || analysisStream) && (
                <div style={{
                  background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)',
                  borderRadius: 14, padding: 18, marginBottom: 14,
                }}>
                  {analyzing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5ff', animation: 'pulse-dot 1s infinite' }} />
                      <span style={{ fontSize: 11, color: '#00e5ff', fontFamily: 'monospace' }}>
                        {lang === 'en' ? 'Claude analyzing…' : 'Claude đang phân tích…'}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>
                    {analysisStream}
                  </div>
                </div>
              )}

              {selected.aiAnalysis && !analyzing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 14, padding: 18 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.85, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', maxHeight: 420, overflowY: 'auto' }}>
                      {selected.aiAnalysis.summary}
                    </div>
                  </div>
                  {/* Confidence bar */}
                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                      <span>{lang === 'en' ? 'AI Confidence' : 'Độ tin cậy AI'}</span>
                      <span style={{ color: '#00e676', fontFamily: 'monospace' }}>{Math.round((selected.aiAnalysis.confidence || 0.85) * 100)}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(selected.aiAnalysis.confidence || 0.85) * 100}%`, height: '100%', background: '#00e676', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(255,183,77,0.08)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 8, fontSize: 11, color: 'rgba(255,183,77,0.8)' }}>
                    ⚠️ {lang === 'en' ? 'AI analysis is for support only and does not replace a doctor\'s diagnosis.' : 'Phân tích AI chỉ mang tính hỗ trợ, không thay thế chẩn đoán của bác sĩ.'}
                  </div>
                  <button onClick={() => { setAnalysisStream(''); analyzeWithAI(selected) }} style={{
                    padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 12, alignSelf: 'flex-start',
                  }}>↺ {lang === 'en' ? 'Re-analyze' : 'Phân tích lại'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
