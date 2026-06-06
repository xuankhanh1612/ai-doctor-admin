import React, { useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import InBodyDashboard from '../inbody-khanh/components/InBodyDashboard.jsx'
import { detectFileType, fileToBase64, fileToDataUrl, getAllRecords, saveRecord } from '../lib/medicalStorage.js'
import { notifyUpload } from '../hooks/useMedicalData.js'
import { makeImageInBodyRecord, parseInBodyCsv, recordsToInBodyCsv } from '../lib/inbodyCsv.js'

function safeName(value) {
  return (value || 'User').toString().trim().replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'User'
}

function isCsvFile(file) {
  return file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.name?.toLowerCase().endsWith('.csv')
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsText(file, 'utf-8')
  })
}

function recordText(record) {
  if (record.textContent) return record.textContent
  if (!record.base64Data) return ''
  try { return decodeURIComponent(escape(atob(record.base64Data))) } catch {
    try { return atob(record.base64Data) } catch { return '' }
  }
}

export default function AIInbodyPortalPanel({ onPrev, prevLabel }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const inputRef = useRef(null)
  const [status, setStatus] = useState('')
  const owner = {
    ownerEmail: user?.email,
    ownerName: user?.name,
    ownerAvatar: user?.avatar,
    ownerProvider: user?.provider,
  }

  async function uploadInBodyFiles(files) {
    const arr = Array.from(files || [])
    if (!arr.length) return
    setStatus(lang === 'vi' ? 'Đang upload InBody vào Upload Records...' : 'Uploading InBody files to Upload Records...')
    let count = 0
    for (const file of arr) {
      const isCsv = isCsvFile(file)
      if (!isCsv && !file.type.startsWith('image/')) continue
      const [dataUrl, base64Data, textContent] = await Promise.all([
        fileToDataUrl(file),
        fileToBase64(file),
        isCsv ? readFileText(file) : Promise.resolve(''),
      ])
      const fileType = isCsv ? 'csv' : detectFileType(file.type, file.name)
      const record = {
        id: `ai_inbody_portal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        filename: file.name,
        name: file.name,
        fileType,
        type: fileType,
        mimeType: file.type || (isCsv ? 'text/csv' : 'image/jpeg'),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl,
        base64Data,
        textContent,
        notes: isCsv ? `AI inbody Portal CSV · ${parseInBodyCsv(textContent).length} dòng dữ liệu` : 'AI inbody Portal image upload',
        sourceModule: 'ai-inbody-portal',
        ownerEmail: user?.email || null,
        ownerName: user?.name || '',
        ownerAvatar: user?.avatar || '',
        ownerProvider: user?.provider || '',
      }
      await saveRecord(record, owner)
      count += 1
    }
    notifyUpload()
    setStatus(lang === 'vi' ? `Đã upload ${count} file vào Upload Records.` : `Uploaded ${count} files into Upload Records.`)
  }

  async function summarizeAllInBodyRecords() {
    setStatus(lang === 'vi' ? 'Đang tổng hợp tất cả InBody records...' : 'Summarizing all InBody records...')
    const scope = { ownerEmail: user?.email, includeUnowned: !!user?.isAdmin }
    const records = await getAllRecords(scope)
    const inBodyRows = []

    records.forEach((record) => {
      if (record.fileType === 'csv') {
        inBodyRows.push(...parseInBodyCsv(recordText(record)))
      } else if (record.mimeType?.startsWith('image/')) {
        inBodyRows.push(makeImageInBodyRecord(record))
      }
    })

    const sortedRows = inBodyRows.filter(Boolean).sort((a, b) => String(a.rawDate || '').localeCompare(String(b.rawDate || '')))
    if (!sortedRows.length) {
      setStatus(lang === 'vi' ? 'Chưa có CSV/hình InBody nào để tổng hợp.' : 'No InBody CSV/image records found to summarize.')
      return
    }

    const csvText = recordsToInBodyCsv(sortedRows)
    const loginName = safeName(user?.name || user?.email || 'UserLoginName')
    const filename = `FullTrackInBody_${loginName}.CSV`
    const base64Data = btoa(unescape(encodeURIComponent(csvText)))
    const summaryRecord = {
      id: `fulltrack_inbody_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename,
      name: filename,
      fileType: 'csv',
      type: 'csv',
      mimeType: 'text/csv',
      size: new Blob([csvText], { type: 'text/csv' }).size,
      uploadedAt: new Date().toISOString(),
      dataUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(csvText)}`,
      base64Data,
      textContent: csvText,
      notes: `Summary All InBody Records · ${sortedRows.length} dòng dữ liệu riêng cho ${loginName}`,
      sourceModule: 'ai-inbody-portal-summary',
      ownerEmail: user?.email || null,
      ownerName: user?.name || '',
      ownerAvatar: user?.avatar || '',
      ownerProvider: user?.provider || '',
    }
    await saveRecord(summaryRecord, owner)
    notifyUpload()

    const link = document.createElement('a')
    link.href = summaryRecord.dataUrl
    link.download = filename
    link.click()
    setStatus(lang === 'vi' ? `Đã tạo ${filename} với ${sortedRows.length} dòng và lưu vào Upload Records.` : `Created ${filename} with ${sortedRows.length} rows and saved it to Upload Records.`)
  }

  return (
    <div className="animate-fade ai-inbody-portal-page">
      <section className="ai-healthcare-vision-header ai-inbody-portal-header">
        <div>
          <div className="ai-healthcare-vision-kicker">AI INBODY PORTAL</div>
          <h2>⚖️ AI inbody Portal</h2>
          <p>
            {lang === 'vi'
              ? 'Upload hình/CSV InBody vào Upload Records, xem dashboard theo thời gian và tổng hợp toàn bộ lịch sử thành FullTrackInBody riêng theo user đăng nhập.'
              : 'Upload InBody images/CSVs into Upload Records, view time-series dashboards, and summarize the signed-in user history into a FullTrackInBody CSV.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input ref={inputRef} type="file" multiple accept="text/csv,.csv,image/*,image/heic,image/heif" hidden onChange={(event) => { uploadInBodyFiles(event.target.files); event.target.value = '' }} />
          <button type="button" onClick={() => inputRef.current?.click()} className="ai-healthcare-vision-open-link">📤 upload InBody CSV/hình</button>
          <button type="button" onClick={summarizeAllInBodyRecords} className="ai-healthcare-vision-open-link">📈 Summary All InBody Records</button>
        </div>
      </section>

      {status && (
        <div style={{ margin: '0 0 14px', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(131,247,255,0.24)', background: 'rgba(0,229,255,0.07)', color: '#83f7ff', fontSize: 13 }}>
          {status}
        </div>
      )}

      <section className="ai-inbody-portal-card" aria-label="AI inbody Portal dashboard">
        <InBodyDashboard userId={user?.email || 'LXK-2024'} />
      </section>

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
