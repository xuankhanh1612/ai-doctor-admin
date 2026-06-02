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


const UPLOADER_TEXT = {
  vi: {
    delete: 'Xóa', deleteWithIcon: '🗑 Xóa', confirmDelete: 'Xóa hồ sơ này?',
    fileTooLarge: 'File "{name}" quá lớn (tối đa {max}MB)', unsupportedType: 'Định dạng không hỗ trợ: {type}', readError: 'Lỗi khi đọc file. Vui lòng thử lại.', unknownError: 'Không xác định', errorPrefix: 'Lỗi',
    title: 'Hồ Sơ Y Tế', subtitle: 'Upload X-Ray · CT · MRI · PDF · Ảnh hồ sơ · Lưu local vĩnh viễn', upload: 'Tải lên', camera: 'Camera', cameraStarting: 'Đang mở camera…', capturePhoto: 'Chụp ảnh', closeCamera: 'Đóng camera', cameraHelp: 'Camera thật đang mở. Canh khung hồ sơ rồi nhấn Chụp ảnh.', library: 'Thư viện',
    apiKeyPrompt: 'Nhập Anthropic API key để phân tích AI (lưu local, không gửi server):', save: 'Lưu', processing: 'Đang xử lý file…', dragDrop: 'Kéo thả file vào đây', clickSelect: 'hoặc nhấn để chọn file', pdfRecord: 'PDF hồ sơ', photoRecord: 'Ảnh chụp', maxHint: 'Tối đa 20MB · JPG, PNG, WebP, PDF', recentRecords: 'Hồ sơ gần đây', viewAll: 'Xem tất cả {count} hồ sơ →', noRecords: 'Chưa có hồ sơ nào. Upload file đầu tiên!', backToLibrary: 'Quay lại thư viện', useForCompare: 'So sánh bên Compare →', type: 'Loại', size: 'Kích thước', uploaded: 'Upload', notes: 'GHI CHÚ', notesPlaceholder: 'Thêm ghi chú về hồ sơ này…', saveNotes: 'Lưu ghi chú', aiAnalysis: 'PHÂN TÍCH AI', aiAnalyzeHelp: 'Để AI phân tích hồ sơ này', analyzeWithClaude: 'Phân tích với Claude AI', requiresKey: 'Cần Anthropic API key', enterKey: 'Nhập key', claudeAnalyzing: 'Claude đang phân tích…', aiConfidence: 'Độ tin cậy AI', aiDisclaimer: 'Phân tích AI chỉ mang tính hỗ trợ, không thay thế chẩn đoán của bác sĩ.', reAnalyze: 'Phân tích lại',
  },
  en: {
    delete: 'Delete', deleteWithIcon: '🗑 Delete', confirmDelete: 'Delete this record?',
    fileTooLarge: 'File "{name}" is too large (max {max}MB)', unsupportedType: 'Unsupported file type: {type}', readError: 'Could not read the file. Please try again.', unknownError: 'Unknown', errorPrefix: 'Error',
    title: 'Medical Records', subtitle: 'Upload X-Ray · CT · MRI · PDF · Images · Stored locally', upload: 'Upload', camera: 'Camera', cameraStarting: 'Opening camera…', capturePhoto: 'Capture photo', closeCamera: 'Close camera', cameraHelp: 'Live camera is open. Frame the record, then capture.', library: 'Library',
    apiKeyPrompt: 'Enter Anthropic API key for AI analysis (stored locally):', save: 'Save', processing: 'Processing file…', dragDrop: 'Drag & drop files here', clickSelect: 'or click to select', pdfRecord: 'PDF record', photoRecord: 'Photo', maxHint: 'Max 20MB · JPG, PNG, WebP, PDF', recentRecords: 'Recent records', viewAll: 'View all {count} records →', noRecords: 'No records yet. Upload your first file!', backToLibrary: 'Back to library', useForCompare: 'Use for Compare →', type: 'Type', size: 'Size', uploaded: 'Uploaded', notes: 'NOTES', notesPlaceholder: 'Add notes about this record…', saveNotes: 'Save notes', aiAnalysis: 'AI ANALYSIS', aiAnalyzeHelp: 'Let AI analyze this medical file', analyzeWithClaude: 'Analyze with Claude AI', requiresKey: 'Requires Anthropic API key', enterKey: 'Enter key', claudeAnalyzing: 'Claude analyzing…', aiConfidence: 'AI Confidence', aiDisclaimer: "AI analysis is for support only and does not replace a doctor\'s diagnosis.", reAnalyze: 'Re-analyze',
  },
}

function uploadText(lang, key, vars = {}) {
  const template = UPLOADER_TEXT[lang]?.[key] || UPLOADER_TEXT.vi[key] || key
  return Object.entries(vars).reduce((text, [name, value]) => text.replace(`{${name}}`, value), template)
}

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

function RecordThumb({ record, onClick, onDelete, lang }) {
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
      }}>{uploadText(lang, 'deleteWithIcon')}</button>
    </div>
  )
}

function RecordCard({ record, onClick, onDelete, lang }) {
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
        }}>{uploadText(lang, 'delete')}</button>
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
  const [cameraOpen, setCameraOpen]       = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError]     = useState('')
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks?.().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
    setCameraStarting(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

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
        setError(uploadText(lang, 'fileTooLarge', { name: file.name, max: MAX_MB }))
        continue
      }
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError(uploadText(lang, 'unsupportedType', { type: file.type }))
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
          ownerName:   user?.name || '',
          ownerAvatar: user?.avatar || '',
          ownerProvider: user?.provider || '',
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
        setError(uploadText(lang, 'readError'))
        setUploading(false)
        setUploadProgress(0)
      }
    }
  }, [user?.email, user?.name, user?.avatar, user?.provider, lang])

  const openCamera = useCallback(async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(lang === 'vi' ? 'Trình duyệt không hỗ trợ mở camera thật.' : 'This browser does not support live camera capture.')
      return
    }
    setCameraStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
    } catch (e) {
      setCameraError(lang === 'vi' ? 'Không thể mở camera. Vui lòng cấp quyền camera cho trình duyệt.' : 'Cannot open camera. Please allow camera access in the browser.')
      stopCamera()
    } finally {
      setCameraStarting(false)
    }
  }, [lang, stopCamera])

  const captureCameraPhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) {
        setCameraError(lang === 'vi' ? 'Không chụp được ảnh từ camera.' : 'Could not capture a camera photo.')
        return
      }
      const file = new File([blob], `camera_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: 'image/jpeg' })
      stopCamera()
      processFiles([file])
    }, 'image/jpeg', 0.92)
  }, [lang, processFiles, stopCamera])

  const onDragOver  = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop      = e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }
  const onFileChange = e => { if (e.target.files?.length) processFiles(e.target.files); e.target.value = '' }

  async function handleDelete(id) {
    if (!confirm(uploadText(lang, 'confirmDelete'))) return
    await deleteRecord(id, recordScope)
    notifyUpload()
    await loadRecords()
    if (selected?.id === id) { setSelected(null); setView('upload') }
  }

  async function saveNotes() {
    if (!selected) return
    const updated = { ...selected, notes }
    await saveRecord(updated, { ownerEmail: user?.email })
    notifyUpload()
    setSelected(updated)
    await loadRecords()
  }

  // ─── AI Analysis (gọi thẳng Anthropic API, stream) ─────────────────────
  async function analyzeWithAI(record) {
    if (!apiKey) { setShowApiInput(true); return }

    setAnalyzing(true)
    setAnalysisStream('')

    const typeLabel = fileTypeLabel(record.fileType)
    const prompt = lang === 'en'
      ? `You are an AI physician specializing in diagnostic imaging. Analyze this ${typeLabel} and provide:

1. **General assessment** of image quality and modality
2. **Abnormal findings** if any: location, estimated size, features
3. **Priority level**: Normal / Monitor / See a doctor soon / Urgent care
4. **Suggested** follow-up tests or consultations
5. **Important notes**

Answer in English, concisely and clearly. Remind the user this is AI support and does not replace a physician.`
      : `Bạn là bác sĩ AI chuyên khoa chẩn đoán hình ảnh. Phân tích ${typeLabel} này và cung cấp:

1. **Nhận xét tổng quát** về chất lượng và loại hình ảnh
2. **Phát hiện bất thường** (nếu có): vị trí, kích thước ước tính, đặc điểm
3. **Mức độ ưu tiên**: Bình thường / Cần theo dõi / Cần khám sớm / Cần khám ngay
4. **Gợi ý** xét nghiệm hoặc khám bổ sung
5. **Lưu ý quan trọng**

Trả lời bằng tiếng Việt, ngắn gọn và rõ ràng. Nhắc nhở đây là hỗ trợ AI, không thay thế bác sĩ.`

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
      notifyUpload()
      setSelected(prev => prev ? { ...prev, aiAnalysis: analysis } : prev)
      await loadRecords()

    } catch (err) {
      setAnalysisStream(`❌ ${uploadText(lang, 'errorPrefix')}: ${err instanceof Error ? err.message : uploadText(lang, 'unknownError')}`)
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
            📁 {uploadText(lang, 'title')}
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: 'monospace' }}>
            {uploadText(lang, 'subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <TabBtn active={view === 'upload'}  onClick={() => setView('upload')}>
            + {uploadText(lang, 'upload')}
          </TabBtn>
          <TabBtn active={cameraOpen} onClick={() => !uploading && openCamera()}>
            📷 {cameraStarting ? uploadText(lang, 'cameraStarting') : uploadText(lang, 'camera')}
          </TabBtn>
          <TabBtn active={view === 'library'} onClick={() => setView('library')}>
            {uploadText(lang, 'library')}
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
            {uploadText(lang, 'apiKeyPrompt')}
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
          }}>{uploadText(lang, 'save')}</button>
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
                  {uploadText(lang, 'processing')}
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
                  {uploadText(lang, 'dragDrop')}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                  {uploadText(lang, 'clickSelect')}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['X-Ray JPG/PNG', 'CT Scan', 'MRI', uploadText(lang, 'pdfRecord'), uploadText(lang, 'photoRecord')].map(label => (
                    <span key={label} style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                    }}>{label}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 14 }}>
                  {uploadText(lang, 'maxHint')}
                </div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" multiple accept={ACCEPT} onChange={onFileChange} style={{ display: 'none' }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onCameraChange} style={{ display: 'none' }} />

          {cameraError && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,82,82,0.25)', background: 'rgba(255,82,82,0.08)', color: '#ff5252', fontSize: 12 }}>
              ⚠️ {cameraError}
            </div>
          )}

          {cameraOpen && (
            <div className="uploader-fade" style={{ marginBottom: 20, border: '1px solid rgba(0,229,255,0.22)', borderRadius: 16, padding: 14, background: 'rgba(0,229,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div style={{ color: '#00e5ff', fontSize: 12, fontWeight: 700 }}>📷 {uploadText(lang, 'camera')}</div>
                <button type="button" onClick={stopCamera} style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                  {uploadText(lang, 'closeCamera')}
                </button>
              </div>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 12, background: '#000', border: '1px solid rgba(255,255,255,0.08)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{uploadText(lang, 'cameraHelp')}</div>
                <button type="button" onClick={captureCameraPhoto} style={{ border: 'none', background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', color: '#fff', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
                  📸 {uploadText(lang, 'capturePhoto')}
                </button>
              </div>
            </div>
          )}

          {/* Recent records */}
          {records.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: 12 }}>
                {uploadText(lang, 'recentRecords')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {records.slice(0, 6).map(r => (
                  <RecordThumb key={r.id} record={r}
                    onClick={() => { setSelected(r); setNotes(r.notes || ''); setView('detail') }}
                    onDelete={() => handleDelete(r.id)}
                    lang={lang}
                  />
                ))}
              </div>
              {records.length > 6 && (
                <button onClick={() => setView('library')} style={{
                  marginTop: 12, width: '100%', padding: '10px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer',
                }}>
                  {uploadText(lang, 'viewAll', { count: records.length })}
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
              <div>{uploadText(lang, 'noRecords')}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
              {records.map(r => (
                <RecordCard key={r.id} record={r}
                  onClick={() => { setSelected(r); setNotes(r.notes || ''); setView('detail') }}
                  onDelete={() => handleDelete(r.id)}
                  lang={lang}
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
          }}>← {uploadText(lang, 'backToLibrary')}</button>

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
                    >🔬 {uploadText(lang, 'useForCompare')}</button>
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
                    >🔬 {uploadText(lang, 'useForCompare')}</button>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
                <MetaRow k={uploadText(lang, 'type')}      v={fileTypeLabel(selected.fileType)} vColor={TYPE_COLORS[selected.fileType]} />
                <MetaRow k="File"                                   v={selected.filename} />
                <MetaRow k={uploadText(lang, 'size')} v={formatBytes(selected.size)} />
                <MetaRow k={uploadText(lang, 'uploaded')} v={new Date(selected.uploadedAt).toLocaleString('vi-VN')} />
              </div>

              {/* Notes */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                  {uploadText(lang, 'notes')}
                </div>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder={uploadText(lang, 'notesPlaceholder')}
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
                }}>{uploadText(lang, 'saveNotes')}</button>
              </div>
            </div>

            {/* Right: AI Analysis */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: 12 }}>
                {uploadText(lang, 'aiAnalysis')}
              </div>

              {!selected.aiAnalysis && !analyzing && !analysisStream && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '40px 24px', textAlign: 'center', marginBottom: 14,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                    {uploadText(lang, 'aiAnalyzeHelp')}
                  </div>
                  <button onClick={() => analyzeWithAI(selected)} style={{
                    padding: '12px 28px', borderRadius: 10, cursor: 'pointer',
                    background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)',
                    color: '#fff', fontSize: 14, fontWeight: 600, border: 'none',
                  }}>▶ {uploadText(lang, 'analyzeWithClaude')}</button>
                  {!apiKey && (
                    <div style={{ fontSize: 11, color: 'rgba(255,171,64,0.7)', marginTop: 10 }}>
                      {uploadText(lang, 'requiresKey')}
                      <button onClick={() => setShowApiInput(true)} style={{
                        background: 'none', border: 'none', color: '#ffb74d',
                        cursor: 'pointer', textDecoration: 'underline', fontSize: 11, marginLeft: 4,
                      }}>{uploadText(lang, 'enterKey')}</button>
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
                        {uploadText(lang, 'claudeAnalyzing')}
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
                      <span>{uploadText(lang, 'aiConfidence')}</span>
                      <span style={{ color: '#00e676', fontFamily: 'monospace' }}>{Math.round((selected.aiAnalysis.confidence || 0.85) * 100)}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(selected.aiAnalysis.confidence || 0.85) * 100}%`, height: '100%', background: '#00e676', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(255,183,77,0.08)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 8, fontSize: 11, color: 'rgba(255,183,77,0.8)' }}>
                    ⚠️ {uploadText(lang, 'aiDisclaimer')}
                  </div>
                  <button onClick={() => { setAnalysisStream(''); analyzeWithAI(selected) }} style={{
                    padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 12, alignSelf: 'flex-start',
                  }}>↺ {uploadText(lang, 'reAnalyze')}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
