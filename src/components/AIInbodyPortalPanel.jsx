import React, { useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { detectFileType, fileToBase64, fileToDataUrl, getAllRecords, saveRecord } from '../lib/medicalStorage.js'
import { notifyUpload } from '../hooks/useMedicalData.js'
import { inBodyRecordsToCsv, parseInBodyCsv } from '../lib/inbodyCsv.js'
import InBodyDashboard from '../inbody-khanh/components/InBodyDashboard.jsx'

function safeName(value) {
  return (value || 'Guest').toString().trim().replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'Guest'
}

function textToDataUrl(text) {
  const encoded = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
  return `data:text/csv;base64,${btoa(encoded)}`
}

function textToBase64(text) {
  const encoded = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
  return btoa(encoded)
}


function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsText(file, 'utf-8')
  })
}

function isCsvFile(file) {
  return file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.name?.toLowerCase().endsWith('.csv')
}

function decodeBase64Text(base64Data = '') {
  if (!base64Data) return ''
  try {
    return decodeURIComponent(escape(atob(base64Data)))
  } catch {
    try { return atob(base64Data) } catch { return '' }
  }
}

export default function AIInbodyPortalPanel({ onPrev, prevLabel }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const [summaryStatus, setSummaryStatus] = useState('')
  const uploadInputRef = useRef(null)

  async function uploadInBodyFiles(files) {
    const ownerEmail = user?.email || null
    for (const file of Array.from(files || [])) {
      const csv = isCsvFile(file)
      const [dataUrl, base64Data, textContent] = await Promise.all([
        fileToDataUrl(file),
        fileToBase64(file),
        csv ? readFileText(file) : Promise.resolve(''),
      ])
      const record = {
        id: `inbody_portal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        filename: file.name,
        name: file.name,
        fileType: detectFileType(file.type, file.name),
        type: detectFileType(file.type, file.name),
        mimeType: file.type || (csv ? 'text/csv' : 'image/jpeg'),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl,
        base64Data,
        textContent,
        notes: csv ? `AI inbody Portal upload · ${parseInBodyCsv(textContent).length} dòng dữ liệu` : 'AI inbody Portal image upload',
        ownerEmail,
        ownerName: user?.name || '',
        ownerAvatar: user?.avatar || '',
        ownerProvider: user?.provider || '',
        sourceModule: 'ai-inbody-portal-upload',
      }
      await saveRecord(record, { ownerEmail, ownerName: user?.name, ownerAvatar: user?.avatar, ownerProvider: user?.provider })
    }
    notifyUpload()
    setSummaryStatus(lang === 'vi' ? 'Đã upload file vào Upload Records.' : 'Uploaded file(s) to Upload Records.')
  }

  async function createFullTrackCsv() {
    const ownerEmail = user?.email || null
    const allRecords = await getAllRecords({ ownerEmail, includeUnowned: !!user?.isAdmin })
    const inBodyRows = allRecords
      .filter(record => record.fileType === 'csv' || record.filename?.toLowerCase().endsWith('.csv'))
      .flatMap(record => parseInBodyCsv(record.textContent || decodeBase64Text(record.base64Data)))

    if (!inBodyRows.length) {
      setSummaryStatus(lang === 'vi' ? 'Chưa có dữ liệu InBody CSV để tổng hợp.' : 'No InBody CSV data is available to summarize.')
      return
    }

    const deduped = [...new Map(inBodyRows.map(row => [row.rawDate, row])).values()].sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    const csvText = inBodyRecordsToCsv(deduped)
    const filename = `FullTrackInBody_${safeName(user?.name || user?.email || 'Guest')}.CSV`
    const record = {
      id: `fulltrack_inbody_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename,
      name: filename,
      fileType: 'csv',
      type: 'csv',
      mimeType: 'text/csv',
      size: new Blob([csvText], { type: 'text/csv' }).size,
      uploadedAt: new Date().toISOString(),
      dataUrl: textToDataUrl(csvText),
      base64Data: textToBase64(csvText),
      textContent: csvText,
      notes: `Summary All InBody Records · ${deduped.length} dòng dữ liệu`,
      ownerEmail,
      ownerName: user?.name || '',
      ownerAvatar: user?.avatar || '',
      ownerProvider: user?.provider || '',
      sourceModule: 'ai-inbody-portal-summary',
    }
    await saveRecord(record, {
      ownerEmail,
      ownerName: user?.name,
      ownerAvatar: user?.avatar,
      ownerProvider: user?.provider,
    })
    notifyUpload()
    setSummaryStatus(lang === 'vi' ? `Đã lưu ${filename} vào Upload Records (${deduped.length} dòng).` : `Saved ${filename} to Upload Records (${deduped.length} rows).`)
  }

  return (
    <div className="animate-fade ai-inbody-portal-page">
      <section className="ai-healthcare-vision-header ai-inbody-portal-header">
        <div>
          <div className="ai-healthcare-vision-kicker">AI INBODY PORTAL</div>
          <h2>⚖️ AI inbody Portal</h2>
          <p>
            {lang === 'vi'
              ? 'Tích hợp source code inbody-khanh vào dự án: upload kết quả InBody, gamification XP/level, nhiệm vụ sức khỏe, lịch sử đo và huy hiệu thành tích trong một portal cuối menu.'
              : 'Integrates the inbody-khanh source into this project: InBody uploads, gamified XP/levels, health quests, measurement history, and achievement badges in the final menu portal.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <button
              type="button"
              onClick={createFullTrackCsv}
              style={{ border: '1px solid rgba(179,255,95,0.35)', background: 'rgba(179,255,95,0.12)', color: '#b3ff5f', borderRadius: 12, padding: '10px 16px', fontWeight: 900, cursor: 'pointer' }}
            >📈 Summary All InBody Records</button>
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              style={{ border: '1px solid rgba(0,229,255,0.35)', background: 'rgba(0,229,255,0.10)', color: '#83f7ff', borderRadius: 12, padding: '10px 16px', fontWeight: 900, cursor: 'pointer' }}
            >⬆️ upload .CSV / hình vào Upload Records</button>
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              accept="image/*,.heic,.heif,text/csv,.csv"
              onChange={event => { uploadInBodyFiles(event.target.files); event.target.value = '' }}
              hidden
            />
            {summaryStatus && <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12 }}>{summaryStatus}</span>}
          </div>
        </div>
      </section>

      <section className="ai-inbody-portal-card" aria-label="AI inbody Portal dashboard">
        <InBodyDashboard userId="LXK-2024" />
      </section>

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
