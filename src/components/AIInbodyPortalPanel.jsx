import React, { useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import InBodyDashboard from '../inbody-khanh/components/InBodyDashboard.jsx'
import { getAllRecords, saveRecord } from '../lib/medicalStorage.js'
import { notifyUpload } from '../hooks/useMedicalData.js'
import { buildInBodyCsv, extractInBodyMetricsFromText, parseInBodyCsv } from '../lib/inbodyCsv.js'

function safeFileSegment(value) {
  return (value || 'User').toString().trim().replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'User'
}

function textToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)))
}

function textToDataUrl(text) {
  return `data:text/csv;base64,${textToBase64(text)}`
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

function imageRecordToInBodyRow(record) {
  const metrics = extractInBodyMetricsFromText(`${record.filename || ''}\n${record.notes || ''}`)
  const rawDate = new Date(record.uploadedAt || Date.now()).toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  return {
    ...metrics,
    rawDate,
    date: rawDate,
    device: 'AIClinicImageConvert',
    sourceImageId: record.id,
    sourceImageName: record.filename,
  }
}

export default function AIInbodyPortalPanel({ onPrev, prevLabel }) {
  const { lang } = useApp()
  const { user } = useAuth()
  const [summaryStatus, setSummaryStatus] = useState('')
  const [summaryBusy, setSummaryBusy] = useState(false)

  async function createSummaryCsv() {
    setSummaryBusy(true)
    setSummaryStatus('')
    try {
      const allRecords = await getAllRecords({ ownerEmail: user?.email, includeUnowned: !!user?.isAdmin })
      const rows = []
      allRecords.forEach((record) => {
        if (record.sourceModule === 'ai-inbody-portal-summary') return
        if (record.fileType === 'csv' || record.mimeType === 'text/csv' || record.filename?.toLowerCase().endsWith('.csv')) {
          rows.push(...parseInBodyCsv(recordText(record)))
        } else if (record.mimeType?.startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|webp)$/i.test(record.filename || '')) {
          rows.push(imageRecordToInBodyRow(record))
        }
      })

      if (!rows.length) {
        setSummaryStatus(lang === 'vi' ? 'Chưa có record InBody để tổng hợp.' : 'No InBody records to summarize yet.')
        return
      }

      const csvText = buildInBodyCsv(rows)
      const loginName = safeFileSegment(user?.name || user?.email || 'UserLoginName')
      const filename = `FullTrackInBody_${loginName}.CSV`
      const summaryRecord = {
        id: `full_track_inbody_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
        notes: `Summary All InBody Records · ${rows.length} dòng dữ liệu · user ${loginName}`,
        ownerEmail: user?.email || null,
        ownerName: user?.name || '',
        ownerAvatar: user?.avatar || '',
        ownerProvider: user?.provider || '',
        sourceModule: 'ai-inbody-portal-summary',
      }
      await saveRecord(summaryRecord, { ownerEmail: user?.email })
      notifyUpload()
      setSummaryStatus(lang === 'vi'
        ? `Đã lưu ${filename} vào Upload Records (${rows.length} dòng).`
        : `Saved ${filename} into Upload Records (${rows.length} rows).`)
    } catch (error) {
      console.error('Unable to summarize InBody records:', error)
      setSummaryStatus(lang === 'vi' ? 'Không thể tạo file tổng hợp InBody.' : 'Could not create the InBody summary file.')
    } finally {
      setSummaryBusy(false)
    }
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
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={createSummaryCsv}
            disabled={summaryBusy}
            className="ai-healthcare-vision-open-link"
            style={{ border: 'none', cursor: summaryBusy ? 'wait' : 'pointer' }}
          >
            {summaryBusy ? 'Đang tổng hợp...' : 'Summary All InBody Records'}
          </button>
          {summaryStatus && <div className="ai-vision-upload-path" style={{ maxWidth: 360 }}>{summaryStatus}</div>}
        </div>
      </section>

      <section className="ai-inbody-portal-card" aria-label="AI inbody Portal dashboard">
        <InBodyDashboard userId="LXK-2024" />
      </section>

      <NavButtons onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
