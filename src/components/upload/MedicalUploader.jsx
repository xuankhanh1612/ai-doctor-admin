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
import { buildImageConvertedInBodyRecord, parseInBodyCsv, recordsToInBodyCsv, summarizeInBodyRecords } from '../../lib/inbodyCsv.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  xray: '#00e5ff', ct: '#9c6fff', mri: '#f48fb1', pdf: '#ffb74d', photo: '#00e676', video: '#83f7ff', csv: '#b3ff5f',
}
const ACCEPT  = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf,text/csv,.csv,.heic,.heif'
const MAX_MB  = 20


const UPLOADER_TEXT = {
  vi: {
    delete: 'Xóa', deleteWithIcon: '🗑 Xóa', confirmDelete: 'Xóa hồ sơ này?',
    fileTooLarge: 'File "{name}" quá lớn (tối đa {max}MB)', unsupportedType: 'Định dạng không hỗ trợ: {type}', readError: 'Lỗi khi đọc file. Vui lòng thử lại.', unknownError: 'Không xác định', errorPrefix: 'Lỗi',
    title: 'Hồ Sơ Y Tế', subtitle: 'Upload X-Ray · CT · MRI · PDF · CSV InBody · Ảnh hồ sơ · Lưu local vĩnh viễn', upload: 'Tải lên', camera: 'Camera', cameraStarting: 'Đang mở camera…', capturePhoto: 'Chụp ảnh', closeCamera: 'Đóng camera', cameraHelp: 'Camera thật đang mở. Canh khung hồ sơ rồi nhấn Chụp ảnh.', switchCamera: 'Đổi camera', overlay: 'Lớp phủ', aiDocumentScan: 'AI Document Scan', library: 'Thư viện',
    apiKeyPrompt: 'Nhập Anthropic API key để phân tích AI (lưu local, không gửi server):', save: 'Lưu', processing: 'Đang xử lý file…', dragDrop: 'Kéo thả file vào đây', clickSelect: 'hoặc nhấn để chọn file', pdfRecord: 'PDF hồ sơ', photoRecord: 'Ảnh chụp', maxHint: 'Tối đa 20MB · JPG, PNG, WebP, HEIC, PDF, CSV InBody', recentRecords: 'Hồ sơ gần đây', viewAll: 'Xem tất cả {count} hồ sơ →', noRecords: 'Chưa có hồ sơ nào. Upload file đầu tiên!', backToLibrary: 'Quay lại thư viện', useForCompare: 'So sánh bên Compare →', type: 'Loại', size: 'Kích thước', uploaded: 'Upload', notes: 'GHI CHÚ', notesPlaceholder: 'Thêm ghi chú về hồ sơ này…', saveNotes: 'Lưu ghi chú', aiAnalysis: 'PHÂN TÍCH AI', aiAnalyzeHelp: 'Để AI phân tích hồ sơ này', analyzeWithClaude: 'Phân tích với Claude AI', requiresKey: 'Cần Anthropic API key', enterKey: 'Nhập key', claudeAnalyzing: 'Claude đang phân tích…', aiConfidence: 'Độ tin cậy AI', aiDisclaimer: 'Phân tích AI chỉ mang tính hỗ trợ, không thay thế chẩn đoán của bác sĩ.', reAnalyze: 'Phân tích lại',
  },
  en: {
    delete: 'Delete', deleteWithIcon: '🗑 Delete', confirmDelete: 'Delete this record?',
    fileTooLarge: 'File "{name}" is too large (max {max}MB)', unsupportedType: 'Unsupported file type: {type}', readError: 'Could not read the file. Please try again.', unknownError: 'Unknown', errorPrefix: 'Error',
    title: 'Medical Records', subtitle: 'Upload X-Ray · CT · MRI · PDF · InBody CSV · Images · Stored locally', upload: 'Upload', camera: 'Camera', cameraStarting: 'Opening camera…', capturePhoto: 'Capture photo', closeCamera: 'Close camera', cameraHelp: 'Live camera is open. Frame the record, then capture.', switchCamera: 'Switch camera', overlay: 'Overlay', aiDocumentScan: 'AI Document Scan', library: 'Library',
    apiKeyPrompt: 'Enter Anthropic API key for AI analysis (stored locally):', save: 'Save', processing: 'Processing file…', dragDrop: 'Drag & drop files here', clickSelect: 'or click to select', pdfRecord: 'PDF record', photoRecord: 'Photo', maxHint: 'Max 20MB · JPG, PNG, WebP, HEIC, PDF, InBody CSV', recentRecords: 'Recent records', viewAll: 'View all {count} records →', noRecords: 'No records yet. Upload your first file!', backToLibrary: 'Back to library', useForCompare: 'Use for Compare →', type: 'Type', size: 'Size', uploaded: 'Uploaded', notes: 'NOTES', notesPlaceholder: 'Add notes about this record…', saveNotes: 'Save notes', aiAnalysis: 'AI ANALYSIS', aiAnalyzeHelp: 'Let AI analyze this medical file', analyzeWithClaude: 'Analyze with Claude AI', requiresKey: 'Requires Anthropic API key', enterKey: 'Enter key', claudeAnalyzing: 'Claude analyzing…', aiConfidence: 'AI Confidence', aiDisclaimer: "AI analysis is for support only and does not replace a doctor\'s diagnosis.", reAnalyze: 'Re-analyze',
  },
}

function uploadText(lang, key, vars = {}) {
  const template = UPLOADER_TEXT[lang]?.[key] || UPLOADER_TEXT.vi[key] || key
  return Object.entries(vars).reduce((text, [name, value]) => text.replace(`{${name}}`, value), template)
}

function scanTimestamp(lang, date = new Date()) {
  return date.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function drawScanOverlay(ctx, width, height, { label, timestamp }) {
  const pad = Math.max(18, Math.round(width * 0.035))
  const line = Math.max(3, Math.round(width * 0.006))
  const corner = Math.min(width, height) * 0.16
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.96)'
  ctx.lineWidth = line + 2
  ctx.shadowColor = 'rgba(0,229,255,0.95)'
  ctx.shadowBlur = 16
  ;[
    [pad, pad, pad + corner, pad, pad, pad + corner],
    [width - pad, pad, width - pad - corner, pad, width - pad, pad + corner],
    [pad, height - pad, pad + corner, height - pad, pad, height - pad - corner],
    [width - pad, height - pad, width - pad - corner, height - pad, width - pad, height - pad - corner],
  ].forEach(([ax, ay, bx, by, cx, cy]) => {
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.moveTo(ax, ay)
    ctx.lineTo(cx, cy)
    ctx.stroke()
  })

  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,12,24,0.70)'
  const boxW = Math.min(width - pad * 2, Math.max(360, width * 0.48))
  const boxH = Math.max(74, height * 0.095)
  const boxX = width - pad - boxW
  const boxY = height - pad - boxH
  ctx.fillRect(boxX, boxY, boxW, boxH)
  ctx.strokeStyle = 'rgba(0,229,255,0.82)'
  ctx.lineWidth = Math.max(2, line - 1)
  ctx.strokeRect(boxX, boxY, boxW, boxH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${Math.max(18, width * 0.026)}px sans-serif`
  ctx.fillText(label, boxX + 16, boxY + 30)
  ctx.fillStyle = '#83f7ff'
  ctx.font = `700 ${Math.max(15, width * 0.021)}px monospace`
  ctx.fillText(timestamp, boxX + 16, boxY + 58)
  ctx.restore()
}

function ScanOverlayBadge({ label, timestamp }) {
  return (
    <div style={{ position: 'absolute', inset: 12, pointerEvents: 'none', zIndex: 3 }}>
      <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.92)', borderRadius: 12, boxShadow: '0 0 0 1px rgba(0,229,255,0.75), 0 0 26px rgba(0,229,255,0.34) inset' }} />
      {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
        <div key={`${v}-${h}`} style={{ position: 'absolute', [v]: 0, [h]: 0, width: 48, height: 48, borderColor: '#83f7ff', borderStyle: 'solid', borderWidth: `${v === 'top' ? 4 : 0}px ${h === 'right' ? 4 : 0}px ${v === 'bottom' ? 4 : 0}px ${h === 'left' ? 4 : 0}px`, borderRadius: `${v === 'top' && h === 'left' ? 12 : 0}px ${v === 'top' && h === 'right' ? 12 : 0}px ${v === 'bottom' && h === 'right' ? 12 : 0}px ${v === 'bottom' && h === 'left' ? 12 : 0}px` }} />
      ))}
      <div style={{ position: 'absolute', right: 14, bottom: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(131,247,255,0.72)', background: 'rgba(0,12,24,0.72)', boxShadow: '0 0 18px rgba(0,229,255,0.22)' }}>
        <div style={{ color: '#fff', fontSize: 12, fontWeight: 900, letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ color: '#83f7ff', fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono, monospace)', fontWeight: 800 }}>{timestamp}</div>
      </div>
    </div>
  )
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
        {record.mimeType?.startsWith('video/') ? (
          <div style={{ height: 90, background: 'rgba(131,247,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 28 }}>🎥</div>
        ) : record.mimeType === 'application/pdf' ? (
          <div style={{ height: 90, background: 'rgba(255,171,64,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📄</div>
        ) : record.fileType === 'csv' ? (
          <div style={{ height: 90, background: 'linear-gradient(135deg,rgba(179,255,95,0.12),rgba(0,229,255,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 28 }}>📈</div>
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
        ) : record.fileType === 'csv' ? (
          <div style={{ height: 130, background: 'linear-gradient(135deg,rgba(179,255,95,0.12),rgba(0,229,255,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 40 }}>📈</div>
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


function readFileText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result || ''))
    r.onerror = rej
    r.readAsText(file, 'utf-8')
  })
}

function isCsvFile(file) {
  return file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.name?.toLowerCase().endsWith('.csv')
}

function isSupportedUploadFile(file) {
  return file.type.startsWith('image/') || file.type === 'application/pdf' || isCsvFile(file)
}

function recordText(record) {
  if (record.textContent) return record.textContent
  if (!record.base64Data) return ''
  try {
    return decodeURIComponent(escape(atob(record.base64Data)))
  } catch {
    try { return atob(record.base64Data) } catch { return '' }
  }
}

function formatMetric(value, unit = '', digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return `${Number(value).toFixed(digits).replace(/\.0$/, '')}${unit ? ` ${unit}` : ''}`
}

function InBodyMetricTile({ label, value, unit, delta, color = '#b3ff5f' }) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta)
  return (
    <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 24, fontWeight: 900 }}>{formatMetric(value, unit)}</div>
      {hasDelta && (
        <div style={{ color: delta >= 0 ? '#00e676' : '#ff7676', fontSize: 11, marginTop: 6, fontFamily: 'monospace' }}>
          {delta >= 0 ? '+' : ''}{formatMetric(delta, unit)} {label === 'Tỷ lệ mỡ' ? 'so với lần đầu' : 'trend'}
        </div>
      )}
      <div style={{ height: 3, background: `${color}66`, borderRadius: 99, marginTop: 10 }} />
    </div>
  )
}

function InBodyLineChart({ records, metric, label, unit, color }) {
  const values = records.map(record => record[metric]).filter(value => value !== null && value !== undefined)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 360
  const height = 150
  const pad = 28
  const points = records.map((record, index) => {
    const value = record[metric]
    const x = records.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (records.length - 1)
    const y = value == null ? height - pad : pad + ((max - value) * (height - pad * 2)) / range
    return { x, y, value, record }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  return (
    <div style={{ background: 'rgba(7,16,28,0.92)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{label}</div>
        <div style={{ color, fontFamily: 'monospace', fontSize: 12 }}>{formatMetric(points.at(-1)?.value, unit)}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 150, overflow: 'visible' }} role="img" aria-label={label}>
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="rgba(255,255,255,0.14)" />
        <line x1={pad} x2={pad} y1={pad} y2={height - pad} stroke="rgba(255,255,255,0.10)" />
        {[0.25, 0.5, 0.75].map(tick => <line key={tick} x1={pad} x2={width - pad} y1={pad + tick * (height - pad * 2)} y2={pad + tick * (height - pad * 2)} stroke="rgba(255,255,255,0.05)" />)}
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${metric}-${point.record.rawDate}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="#07101c" stroke={color} strokeWidth="3" />
            <text x={point.x} y={height - 8} fill="rgba(255,255,255,0.45)" fontSize="10" textAnchor="middle">#{index + 1}</text>
          </g>
        ))}
        <text x={pad - 6} y={pad + 4} fill="rgba(255,255,255,0.38)" fontSize="10" textAnchor="end">{formatMetric(max, unit)}</text>
        <text x={pad - 6} y={height - pad + 4} fill="rgba(255,255,255,0.38)" fontSize="10" textAnchor="end">{formatMetric(min, unit)}</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.38)', fontSize: 10 }}>
        {records.map(record => <span key={`${metric}-date-${record.rawDate}`}>{record.date.slice(11) || record.shortDate}</span>)}
      </div>
    </div>
  )
}

function InBodyCsvDashboard({ record }) {
  const records = parseInBodyCsv(recordText(record))
  const { first, latest, diff } = summarizeInBodyRecords(records)

  if (!records.length) {
    return <div style={{ padding: 30, color: 'rgba(255,255,255,0.55)' }}>Không đọc được dữ liệu InBody CSV.</div>
  }

  const charts = [
    { metric: 'weight', label: 'Cân nặng theo thời gian', unit: 'kg', color: '#00e5ff' },
    { metric: 'muscle', label: 'Cơ xương theo thời gian', unit: 'kg', color: '#9c6fff' },
    { metric: 'fat', label: 'Tỷ lệ mỡ theo thời gian', unit: '%', color: '#ff7676' },
    { metric: 'score', label: 'Điểm InBody theo thời gian', unit: '', color: '#b3ff5f' },
  ]

  return (
    <div style={{ width: '100%', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ color: '#b3ff5f', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.08em' }}>INBODY CSV · {records.length} DÒNG DỮ LIỆU</div>
          <h3 style={{ margin: '6px 0 0', fontSize: 22 }}>Đồ thị sức khoẻ theo thời gian</h3>
          <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 12, marginTop: 4 }}>{first?.date} → {latest?.date}</div>
        </div>
        <div style={{ color: '#83f7ff', fontFamily: 'monospace', fontSize: 12, alignSelf: 'center' }}>Thiết bị {latest?.device || '-'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(120px,1fr))', gap: 10, marginBottom: 14 }}>
        <InBodyMetricTile label="Cân nặng" value={latest.weight} unit="kg" delta={diff('weight')} color="#00e5ff" />
        <InBodyMetricTile label="Cơ xương" value={latest.muscle} unit="kg" delta={diff('muscle')} color="#9c6fff" />
        <InBodyMetricTile label="Tỷ lệ mỡ" value={latest.fat} unit="%" delta={diff('fat')} color="#ff7676" />
        <InBodyMetricTile label="Điểm InBody" value={latest.score} unit="" delta={diff('score')} color="#b3ff5f" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(240px,1fr))', gap: 12 }}>
        {charts.map(chart => <InBodyLineChart key={chart.metric} records={records} {...chart} />)}
      </div>

      <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'monospace' }}>3 dòng dữ liệu gốc từ file CSV</div>
        {records.map(row => (
          <div key={row.rawDate} style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(6,1fr)', gap: 8, padding: '9px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>
            <span>{row.date}</span><span>{formatMetric(row.weight, 'kg')}</span><span>{formatMetric(row.muscle, 'kg')}</span><span>{formatMetric(row.fat, '%')}</span><span>BMI {formatMetric(row.bmi)}</span><span>Score {formatMetric(row.score, '', 0)}</span><span>ECW {formatMetric(row.ecwRatio, '', 3)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


function CsvRecordInsights({ record }) {
  const records = parseInBodyCsv(recordText(record))
  const { latest, previous, diff } = summarizeInBodyRecords(records)
  if (!records.length) return null
  const prevWeight = latest?.weight != null && previous?.weight != null ? latest.weight - previous.weight : null
  const prevFat = latest?.fat != null && previous?.fat != null ? latest.fat - previous.fat : null
  const insights = [
    `Đã lấy đúng ${records.length} dòng dữ liệu trong file CSV để dựng dashboard thời gian.`,
    `Lần đo mới nhất: ${latest.date}, cân nặng ${formatMetric(latest.weight, 'kg')}, BMI ${formatMetric(latest.bmi)} và điểm InBody ${formatMetric(latest.score, '', 0)}.`,
    `So với lần đầu: cân nặng ${diff('weight') >= 0 ? '+' : ''}${formatMetric(diff('weight'), 'kg')}, cơ xương ${diff('muscle') >= 0 ? '+' : ''}${formatMetric(diff('muscle'), 'kg')}, mỡ ${diff('fat') >= 0 ? '+' : ''}${formatMetric(diff('fat'), '%')}.`,
    `So với lần trước: cân nặng ${prevWeight >= 0 ? '+' : ''}${formatMetric(prevWeight, 'kg')} · mỡ ${prevFat >= 0 ? '+' : ''}${formatMetric(prevFat, '%')}.`,
  ]
  const rows = [
    ['BMR', formatMetric(latest.bmr, 'kcal', 0)],
    ['Nước cơ thể', formatMetric(latest.water, 'L')],
    ['Mỡ nội tạng', formatMetric(latest.visceralFatLevel, 'Level', 0)],
    ['Protein', formatMetric(latest.protein, 'kg')],
    ['Khoáng chất', formatMetric(latest.minerals, 'kg')],
    ['Góc pha', formatMetric(latest.phaseAngle, '°')],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'rgba(179,255,95,0.06)', border: '1px solid rgba(179,255,95,0.18)', borderRadius: 14, padding: 18 }}>
        <div style={{ color: '#b3ff5f', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 10 }}>CSV INBODY AUTO ANALYSIS</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 1.8 }}>
          {insights.map(item => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(130px,1fr))', gap: 10 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }}>
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11 }}>{label}</div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 17, marginTop: 5 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 12px', background: 'rgba(255,183,77,0.08)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 8, fontSize: 11, color: 'rgba(255,183,77,0.85)' }}>
        ⚠️ Dữ liệu CSV chỉ hỗ trợ theo dõi sức khoẻ và không thay thế tư vấn y khoa trực tiếp.
      </div>
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
  const [inbodyOcrResult, setInbodyOcrResult] = useState(null)   // null | { stream, done, confirmed }
  const [inbodyOcrRunning, setInbodyOcrRunning] = useState(false)
  const [cameraOpen, setCameraOpen]       = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError]     = useState('')
  const [cameraFacingMode, setCameraFacingMode] = useState('environment')
  const [scanOverlayOn, setScanOverlayOn] = useState(true)
  const [scanNow, setScanNow] = useState(new Date())
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
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
    if (!cameraOpen) return undefined
    setScanNow(new Date())
    const timer = window.setInterval(() => setScanNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [cameraOpen])

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
      if (!isSupportedUploadFile(file)) {
        setError(uploadText(lang, 'unsupportedType', { type: file.type || file.name }))
        continue
      }

      setUploading(true)
      setUploadProgress(10)

      try {
        const progressInterval = setInterval(() => {
          setUploadProgress(p => Math.min(p + 15, 85))
        }, 150)

        const isCsv = isCsvFile(file)
        const [dataUrl, base64Data, textContent] = await Promise.all([
          fileToDataUrl(file),
          fileToBase64(file),
          isCsv ? readFileText(file) : Promise.resolve(''),
        ])

        clearInterval(progressInterval)
        setUploadProgress(100)

        const record = {
          id:         `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          filename:   file.name,
          name:       file.name,
          fileType:   detectFileType(file.type, file.name),
          type:       detectFileType(file.type, file.name),
          mimeType:   file.type || (isCsv ? 'text/csv' : 'image/jpeg'),
          size:       file.size,
          uploadedAt: new Date().toISOString(),
          dataUrl,
          base64Data,
          notes:      isCsv ? `InBody CSV · ${parseInBodyCsv(textContent).length} dòng dữ liệu` : '',
          textContent,
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
          setNotes(record.notes || '')
          setView('detail')
        }, 400)

      } catch {
        setError(uploadText(lang, 'readError'))
        setUploading(false)
        setUploadProgress(0)
      }
    }
  }, [user?.email, user?.name, user?.avatar, user?.provider, lang])

  const openCamera = useCallback(async (nextFacingMode = cameraFacingMode) => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(lang === 'vi' ? 'Trình duyệt không hỗ trợ mở camera thật. Đang mở camera hệ thống của thiết bị.' : 'This browser does not support live camera capture. Opening the device camera picker instead.')
      cameraInputRef.current?.click()
      return
    }
    setCameraStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacingMode }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraFacingMode(nextFacingMode)
      setCameraOpen(true)
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 0)
    } catch (e) {
      setCameraError(lang === 'vi' ? 'Không thể mở camera live. Bạn có thể chọn/chụp ảnh bằng camera hệ thống.' : 'Cannot open live camera. You can choose or capture an image with the device camera picker.')
      stopCamera()
      cameraInputRef.current?.click()
    } finally {
      setCameraStarting(false)
    }
  }, [cameraFacingMode, lang, stopCamera])

  const switchCamera = useCallback(() => {
    const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user'
    openCamera(nextFacingMode)
  }, [cameraFacingMode, openCamera])

  const captureCameraPhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (cameraFacingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (cameraFacingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (scanOverlayOn) {
      drawScanOverlay(ctx, canvas.width, canvas.height, {
        label: uploadText(lang, 'aiDocumentScan'),
        timestamp: scanTimestamp(lang, scanNow),
      })
    }
    canvas.toBlob(blob => {
      if (!blob) {
        setCameraError(lang === 'vi' ? 'Không chụp được ảnh từ camera.' : 'Could not capture a camera photo.')
        return
      }
      const file = new File([blob], `camera_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: 'image/jpeg' })
      stopCamera()
      processFiles([file])
    }, 'image/jpeg', 0.92)
  }, [cameraFacingMode, lang, processFiles, scanNow, scanOverlayOn, stopCamera])

  const onDragOver  = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop      = e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }
  const onFileChange = e => { if (e.target.files?.length) processFiles(e.target.files); e.target.value = '' }
  const onCameraChange = e => { if (e.target.files?.length) processFiles(e.target.files); e.target.value = '' }

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

  async function saveCsvRecordFromText(csvText, filename, extra = {}) {
    const file = new File([csvText], filename, { type: 'text/csv' })
    const [dataUrl, base64Data] = await Promise.all([fileToDataUrl(file), fileToBase64(file)])
    const record = {
      id: `inbody_csv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename,
      name: filename,
      fileType: 'csv',
      type: 'csv',
      mimeType: 'text/csv',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      dataUrl,
      base64Data,
      textContent: csvText,
      notes: `InBody CSV · ${parseInBodyCsv(csvText).length} dòng dữ liệu`,
      ownerEmail: user?.email || null,
      ownerName: user?.name || '',
      ownerAvatar: user?.avatar || '',
      ownerProvider: user?.provider || '',
      sourceModule: 'inbody-image-convert',
      ...extra,
    }
    await saveRecord(record, { ownerEmail: user?.email })
    notifyUpload()
    await loadRecords()
    setSelected(record)
    setNotes(record.notes || '')
    setView('detail')
    return record
  }

  async function runInBodyImageOcr() {
    if (!selected || selected.fileType === 'csv') return
    if (!apiKey) { setShowApiInput(true); return }

    setInbodyOcrRunning(true)
    setInbodyOcrResult({ stream: '', done: false, confirmed: false, csvText: null, parsedRow: null })

    const ocrPrompt = `Bạn là chuyên gia đọc kết quả InBody. Hãy OCR toàn bộ hình ảnh InBody này và trích xuất CHÍNH XÁC các thông số sau (trả về JSON thuần, không markdown):

{
  "ngày": "YYYYMMDDHHMMSS hoặc YYYYMMDD",
  "Thiết bị đo": "tên máy InBody",
  "Cân nặng(kg)": số,
  "Khối lượng cơ xương(kg)": số,
  "Khối lượng mỡ trong cơ thể(kg)": số,
  "BMI(kg/m²)": số,
  "Tỷ lệ mỡ cơ thể(%)": số,
  "Tỷ lệ trao đổi chất cơ bản(kcal)": số,
  "Điểm InBody": số,
  "Lượng nước trong cơ thể(L)": số,
  "Nước nội bào(L)": số,
  "Nước ngoại bào(L)": số,
  "Tỷ lệ ECW": số,
  "Mức độ chất béo nội tạng(Level)": số,
  "Protein(kg)": số,
  "Khoáng chất(kg)": số,
  "Góc pha toàn bộ cơ thể(°)": số,
  "Khối lượng cơ ở cánh tay phải(kg)": số,
  "Khối lượng cơ ở cánh tay trái(kg)": số,
  "Khối lượng cơ ở thân mình(kg)": số,
  "Khối lượng cơ ở chân phải(kg)": số,
  "Khối lượng cơ ở chân trái(kg)": số
}

Nếu không đọc được một giá trị, để null. Chỉ trả về JSON, không giải thích thêm.`

    try {
      const body = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        stream: true,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: selected.mimeType || 'image/jpeg', data: selected.base64Data } },
            { type: 'text', text: ocrPrompt },
          ],
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

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullText += data.delta.text
              setInbodyOcrResult(prev => ({ ...prev, stream: fullText }))
            }
          } catch {}
        }
      }

      // Parse JSON from OCR result
      let parsedRow = null
      let csvText = null
      try {
        const clean = fullText.replace(/```json|```/g, '').trim()
        parsedRow = JSON.parse(clean)
        // Build CSV using existing helper
        const existingCsv = records.find(r => r.fileType === 'csv' && r.textContent)
        const fallback = existingCsv ? parseInBodyCsv(recordText(existingCsv)).at(-1) : null
        const converted = buildImageConvertedInBodyRecord({ analysis: { summary: fullText, parsedOcr: parsedRow }, fallback, sourceName: selected.filename, ocrRow: parsedRow })
        csvText = recordsToInBodyCsv([converted])
      } catch {
        csvText = null
      }

      setInbodyOcrResult({ stream: fullText, done: true, confirmed: false, csvText, parsedRow })

    } catch (err) {
      setInbodyOcrResult({ stream: `❌ Lỗi OCR: ${err instanceof Error ? err.message : 'Không xác định'}`, done: true, confirmed: false, csvText: null, parsedRow: null })
    } finally {
      setInbodyOcrRunning(false)
    }
  }

  async function confirmSaveInBodyCsv() {
    if (!inbodyOcrResult?.csvText || !selected) return
    const safeName = selected.filename.replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]+/gi, '_') || 'InBody_Image'
    await saveCsvRecordFromText(inbodyOcrResult.csvText, `${safeName}_converted.csv`, {
      notes: `Converted from InBody image: ${selected.filename}`,
      convertedFromRecordId: selected.id,
    })
    setInbodyOcrResult(null)
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
      <input ref={cameraInputRef} type="file" accept="image/*" capture={cameraFacingMode} onChange={onCameraChange} style={{ display: 'none' }} />
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
          <TabBtn active={cameraOpen} onClick={() => { setView('upload'); if (!uploading) openCamera() }}>
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
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.08)' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ display: 'block', width: '100%', maxHeight: 420, objectFit: 'contain', transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                {scanOverlayOn && <ScanOverlayBadge label={uploadText(lang, 'aiDocumentScan')} timestamp={scanTimestamp(lang, scanNow)} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{uploadText(lang, 'cameraHelp')}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={switchCamera} style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}>
                    🔄 {uploadText(lang, 'switchCamera')}
                  </button>
                  <button type="button" onClick={() => setScanOverlayOn(v => !v)} style={{ border: '1px solid rgba(131,247,255,0.34)', background: scanOverlayOn ? 'rgba(0,229,255,0.16)' : 'rgba(255,255,255,0.06)', color: scanOverlayOn ? '#83f7ff' : '#fff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}>
                    ▣ {uploadText(lang, 'overlay')}
                  </button>
                  <button type="button" onClick={captureCameraPhoto} style={{ border: 'none', background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)', color: '#fff', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
                    📸 {uploadText(lang, 'capturePhoto')}
                  </button>
                </div>
              </div>
            </div>
          )}


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
                  {['X-Ray JPG/PNG', 'CT Scan', 'MRI', uploadText(lang, 'pdfRecord'), 'InBody CSV', uploadText(lang, 'photoRecord')].map(label => (
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

          {/* ── TOP ROW: Image (large) + OCR Confirm panel ── */}
          <div style={{ display: 'grid', gridTemplateColumns: selected.fileType === 'csv' ? '1fr' : '1.6fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* LEFT: Large Preview */}
            <div>
              <div style={{
                background: '#000', borderRadius: 14, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14,
                minHeight: selected.fileType === 'csv' ? 280 : 560,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected.fileType === 'csv' ? (
                  <div style={{ width: '100%', padding: 14, boxSizing: 'border-box' }}>
                    <InBodyCsvDashboard record={selected} />
                  </div>
                ) : selected.mimeType?.startsWith('video/') ? (
                  <video src={selected.dataUrl} controls style={{ maxWidth: '100%', maxHeight: 560, borderRadius: 8 }} />
                ) : selected.mimeType === 'application/pdf' ? (
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 0', width: '100%' }}>
                    <img
                      src={selected.dataUrl} alt={selected.filename}
                      style={{ maxWidth: '100%', maxHeight: 560, objectFit: 'contain', borderRadius: 8, cursor: 'pointer' }}
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

              {/* Convert button */}
              {selected.fileType !== 'csv' && selected.fileType !== 'pdf' && (
                <button
                  onClick={runInBodyImageOcr}
                  disabled={inbodyOcrRunning}
                  style={{
                    marginTop: 12, width: '100%', padding: '11px 14px', borderRadius: 10,
                    cursor: inbodyOcrRunning ? 'wait' : 'pointer',
                    background: inbodyOcrRunning
                      ? 'rgba(179,255,95,0.08)'
                      : 'linear-gradient(135deg,rgba(179,255,95,0.22),rgba(0,229,255,0.12))',
                    border: '1px solid rgba(179,255,95,0.35)',
                    color: '#b3ff5f', fontSize: 12, fontWeight: 800,
                    opacity: inbodyOcrRunning ? 0.7 : 1,
                  }}>
                  {inbodyOcrRunning ? '⏳ Đang OCR hình ảnh InBody…' : '📈 Convert InBody Image thành .CSV'}
                </button>
              )}

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

            {/* RIGHT: OCR result + Confirm panel (only for image, non-csv) */}
            {selected.fileType !== 'csv' && (
              <div>
                {/* When no OCR run yet and no AI analysis */}
                {!inbodyOcrResult && !inbodyOcrRunning && (
                  <div style={{
                    background: 'rgba(179,255,95,0.03)', border: '1px dashed rgba(179,255,95,0.18)',
                    borderRadius: 14, padding: '40px 24px', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{ fontSize: 36 }}>📈</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                      Nhấn <strong style={{ color: '#b3ff5f' }}>📈 Convert InBody Image thành .CSV</strong> để OCR hình ảnh và xem kết quả trước khi lưu.
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                      Cần Anthropic API key · OCR bằng Claude Vision
                    </div>
                  </div>
                )}

                {/* OCR Running */}
                {inbodyOcrRunning && (
                  <div style={{
                    background: 'rgba(179,255,95,0.04)', border: '1px solid rgba(179,255,95,0.2)',
                    borderRadius: 14, padding: 18,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#b3ff5f', animation: 'pulse-dot 1s infinite' }} />
                      <span style={{ fontSize: 12, color: '#b3ff5f', fontFamily: 'monospace', fontWeight: 700 }}>
                        Claude đang OCR hình InBody…
                      </span>
                    </div>
                    {inbodyOcrResult?.stream && (
                      <pre style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace', margin: 0 }}>
                        {inbodyOcrResult.stream}
                      </pre>
                    )}
                  </div>
                )}

                {/* OCR Done — show result + confirm */}
                {inbodyOcrResult?.done && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* OCR raw stream */}
                    <div style={{
                      background: 'rgba(179,255,95,0.04)', border: '1px solid rgba(179,255,95,0.2)',
                      borderRadius: 14, padding: 16,
                    }}>
                      <div style={{ fontSize: 11, color: '#b3ff5f', fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 10 }}>
                        📋 KẾT QUẢ OCR INBODY
                      </div>
                      <pre style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap',
                        maxHeight: 320, overflowY: 'auto', fontFamily: 'monospace', margin: 0, lineHeight: 1.7,
                      }}>
                        {inbodyOcrResult.stream}
                      </pre>
                    </div>

                    {/* Parsed metrics preview */}
                    {inbodyOcrResult.parsedRow && (() => {
                      const r = inbodyOcrResult.parsedRow
                      const metrics = [
                        ['Ngày đo', r['ngày'] || '-'],
                        ['Thiết bị', r['Thiết bị đo'] || '-'],
                        ['Cân nặng', r['Cân nặng(kg)'] != null ? `${r['Cân nặng(kg)']} kg` : '-'],
                        ['Cơ xương', r['Khối lượng cơ xương(kg)'] != null ? `${r['Khối lượng cơ xương(kg)']} kg` : '-'],
                        ['Mỡ cơ thể', r['Tỷ lệ mỡ cơ thể(%)'] != null ? `${r['Tỷ lệ mỡ cơ thể(%)']}%` : '-'],
                        ['BMI', r['BMI(kg/m²)'] != null ? `${r['BMI(kg/m²)']}` : '-'],
                        ['Điểm InBody', r['Điểm InBody'] != null ? `${r['Điểm InBody']}` : '-'],
                        ['BMR', r['Tỷ lệ trao đổi chất cơ bản(kcal)'] != null ? `${r['Tỷ lệ trao đổi chất cơ bản(kcal)']} kcal` : '-'],
                      ]
                      return (
                        <div style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(179,255,95,0.25)',
                          borderRadius: 14, padding: 14,
                        }}>
                          <div style={{ fontSize: 11, color: '#b3ff5f', fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 10 }}>
                            ✅ THÔNG SỐ ĐÃ NHẬN DẠNG
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {metrics.map(([label, val]) => (
                              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{label}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2, fontFamily: 'monospace' }}>{String(val)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Error / no parse */}
                    {!inbodyOcrResult.parsedRow && !inbodyOcrResult.stream.startsWith('❌') && (
                      <div style={{ padding: '10px 14px', background: 'rgba(255,183,77,0.08)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 8, fontSize: 12, color: 'rgba(255,183,77,0.85)' }}>
                        ⚠️ Không parse được JSON từ kết quả OCR. Vui lòng thử lại hoặc dùng ảnh rõ hơn.
                      </div>
                    )}

                    {/* Confirm save button */}
                    {inbodyOcrResult.csvText && (
                      <button
                        onClick={confirmSaveInBodyCsv}
                        style={{
                          padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
                          background: 'linear-gradient(135deg,#00b8cc,#00e676)',
                          border: 'none', color: '#000', fontSize: 14, fontWeight: 900,
                          boxShadow: '0 4px 20px rgba(0,230,118,0.3)',
                        }}>
                        ✅ Xác nhận thông số InBody chính xác — Lưu thành file .CSV
                      </button>
                    )}

                    {/* Retry */}
                    <button
                      onClick={runInBodyImageOcr}
                      style={{
                        padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.45)', fontSize: 12,
                      }}>
                      ↺ OCR lại
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RIGHT for CSV: show insights */}
            {selected.fileType === 'csv' && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: 12 }}>
                  {uploadText(lang, 'aiAnalysis')}
                </div>
                <CsvRecordInsights record={selected} />
              </div>
            )}
          </div>

          {/* ── BOTTOM: AI Analysis section (always below) ── */}
          {selected.fileType !== 'csv' && (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              paddingTop: 20, marginTop: 4,
            }}>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: 14 }}>
                {uploadText(lang, 'aiAnalysis')}
              </div>

              {!selected.aiAnalysis && !analyzing && !analysisStream && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '32px 24px', textAlign: 'center', marginBottom: 14,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ fontSize: 32 }}>🤖</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                    {uploadText(lang, 'aiAnalyzeHelp')}
                  </div>
                  <button onClick={() => analyzeWithAI(selected)} style={{
                    padding: '12px 28px', borderRadius: 10, cursor: 'pointer',
                    background: 'linear-gradient(135deg,#00b8cc,#6b3fd4)',
                    color: '#fff', fontSize: 14, fontWeight: 600, border: 'none',
                  }}>▶ {uploadText(lang, 'analyzeWithClaude')}</button>
                  {!apiKey && (
                    <div style={{ fontSize: 11, color: 'rgba(255,171,64,0.7)' }}>
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
          )}
        </div>
      )}
    </div>
  )
}
