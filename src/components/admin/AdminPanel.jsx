import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { useMedicalData } from '../../hooks/useMedicalData.js'
import { fileTypeLabel, fileTypeIcon, formatBytes, getMetaKey } from '../../lib/medicalStorage.js'
import { useNotifications } from '../../lib/notifications.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso, lang) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
function formatDateTime(iso, lang) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TYPE_COLOR = { upload: '#00b8cc', view: '#9c6fff', edit: '#ffb74d', auth: '#00e676', 'system-error': '#ffb74d' }
const TYPE_ICON  = { upload: '📤', view: '👁️', edit: '✏️', auth: '🔐', 'system-error': '🚨' }
const FILE_COLOR = { xray: '#00e5ff', ct: '#9c6fff', mri: '#f48fb1', pdf: '#ffb74d', photo: '#00e676' }

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: `${color}10`, border: `1px solid ${color}30`,
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}20`, border: `1px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'monospace', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

function RecordRow({ record, onDelete, lang }) {
  const [expanded, setExpanded] = useState(false)
  const color = FILE_COLOR[record.fileType] || '#aaa'
  const hasAI = !!record.aiAnalysis

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Row header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Thumb */}
        <div style={{
          width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
          background: '#0a0e1a', border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {record.mimeType?.startsWith('image/')
            ? <img src={record.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 20 }}>{fileTypeIcon(record.fileType)}</span>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.filename || record.name}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: `${color}18`, color, border: `1px solid ${color}35`, fontFamily: 'monospace' }}>
              {fileTypeLabel(record.fileType)}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{formatBytes(record.size || 0)}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{formatDateTime(record.uploadedAt, lang)}</span>
            <span style={{ fontSize: 10, color: '#00b8cc', fontFamily: 'monospace' }}>👤 {record.ownerName || record.ownerEmail || 'Unknown user'}</span>
            {hasAI && <span style={{ fontSize: 10, color: '#00e676' }}>✓ AI</span>}
          </div>
        </div>

        {/* Uploader */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minWidth: 180 }}>
          {record.ownerAvatar ? (
            <img src={record.ownerAvatar} alt={record.ownerName || record.ownerEmail || ''} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,184,204,0.35)' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,184,204,0.12)', border: '1px solid rgba(0,184,204,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>👤</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#e8f0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.ownerName || 'Unknown user'}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.ownerEmail || 'no email'}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{expanded ? '▲' : '▼'}</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(record.id) }}
            style={{
              padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
              background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.25)',
              color: 'rgba(255,82,82,0.8)',
            }}
          >🗑</button>
        </div>
      </div>

      {/* Expanded AI analysis */}
      {expanded && (
        <div style={{ padding: '0 16px 16px 72px' }}>
          {hasAI ? (
            <div style={{
              background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)',
              borderRadius: 10, padding: 14,
            }}>
              <div style={{ fontSize: 10, color: '#00e5ff', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 8 }}>
                AI ANALYSIS · {Math.round((record.aiAnalysis.confidence || 0.85) * 100)}% confidence
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                {record.aiAnalysis.summary?.slice(0, 400)}{record.aiAnalysis.summary?.length > 400 ? '…' : ''}
              </p>
              {record.aiAnalysis.recommendation && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,183,77,0.08)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 8, fontSize: 11, color: 'rgba(255,183,77,0.8)' }}>
                  💡 {record.aiAnalysis.recommendation}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '8px 0', fontStyle: 'italic' }}>
              {lang === 'vi' ? 'Chưa có phân tích AI. Mở Hồ Sơ Y Tế để phân tích.' : 'No AI analysis yet. Open Medical Records to analyze.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, getAllUsers } = useAuth()
  const { t, lang, theme } = useApp()
  const isDark = theme === 'dark'

  const {
    records, loading, lastUpdated,
    activities, totalFiles, aiAnalyzed, byType, totalSizeMB,
    remove, refresh,
  } = useMedicalData({ lang, includeAll: !!user?.isAdmin })

  const users = getAllUsers()
  const { notifications, unreadCount, markAllRead } = useNotifications(user)

  const [tab, setTab] = useState('records')

  const c = {
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    text:   isDark ? '#e8f0f8' : '#1a2035',
    text2:  isDark ? 'rgba(232,240,248,0.55)' : '#555',
    text3:  isDark ? 'rgba(232,240,248,0.28)' : '#aaa',
    surface:isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    bg:     isDark ? 'rgba(8,12,26,0.9)' : '#fff',
  }

  const TABS = [
    { id: 'records',  label: lang === 'vi' ? '📋 Hồ Sơ Upload'  : '📋 Records'  },
    { id: 'patients', label: lang === 'vi' ? '👥 Bệnh Nhân'     : '👥 Patients' },
    { id: 'activity', label: lang === 'vi' ? '📊 Nhật Ký'       : '📊 Activity' },
    { id: 'notifications', label: `${lang === 'vi' ? '🔔 Thông Báo' : '🔔 Notifications'}${unreadCount ? ` (${unreadCount})` : ''}` },
    { id: 'users',    label: lang === 'vi' ? '🔐 Tài Khoản'     : '🔐 Accounts' },
  ]

  // Stats row
  const stats = [
    { label: lang === 'vi' ? 'Hồ sơ đã upload'  : 'Total Records',  value: totalFiles,              icon: '📁', color: '#00b8cc' },
    { label: lang === 'vi' ? 'Đã phân tích AI'  : 'AI Analyzed',    value: aiAnalyzed,              icon: '🤖', color: '#9c6fff', sub: `${totalFiles ? Math.round(aiAnalyzed/totalFiles*100) : 0}%` },
    { label: lang === 'vi' ? 'Dung lượng'        : 'Storage Used',   value: `${totalSizeMB}MB`,      icon: '💾', color: '#00e676' },
    { label: lang === 'vi' ? 'Tài khoản'         : 'User Accounts',  value: users.length,            icon: '👥', color: '#ffb74d' },
    { label: lang === 'vi' ? 'Thông báo mới'      : 'New Alerts',     value: unreadCount,              icon: '🔔', color: '#ff5252' },
  ]

  // Patient synthesized from upload records
  const patientFromUpload = records.length > 0 ? {
    id:     readMetaId(records[0]?.ownerUuid || (records[0] ? null : user?.uuid)),
    name:   t('uploadPatientName'),
    files:  totalFiles,
    aiDone: aiAnalyzed,
    last:   records[0]?.uploadedAt,
    types:  byType,
  } : null

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, color: c.text }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: 'rgba(255,82,82,0.12)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 6, padding: '2px 10px', fontSize: 10, color: '#ff5252', fontWeight: 700, letterSpacing: '0.1em' }}>ADMIN</span>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t('adminPanel')}</h2>
          </div>
          <p style={{ color: c.text2, fontSize: 12, margin: 0 }}>
            {lang === 'vi' ? 'Dữ liệu đồng bộ từ Hồ Sơ Y Tế (IndexedDB)' : 'Data synced from Medical Records (IndexedDB)'}
            {lastUpdated && (
              <span style={{ marginLeft: 8, color: c.text3 }}>
                · {lang === 'vi' ? 'Cập nhật' : 'Updated'}: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button onClick={refresh} style={{
          padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
          background: 'rgba(0,184,204,0.1)', border: '1px solid rgba(0,184,204,0.3)',
          color: '#00b8cc', fontWeight: 600,
        }}>
          {loading ? '⟳ …' : '↺ ' + (lang === 'vi' ? 'Làm mới' : 'Refresh')}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* File type breakdown */}
      {Object.keys(byType).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(byType).map(([type, count]) => {
            const color = FILE_COLOR[type] || '#aaa'
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: `${color}12`, border: `1px solid ${color}30`, color }}>
                <span style={{ fontSize: 14 }}>{fileTypeIcon(type)}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{fileTypeLabel(type)}</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace' }}>× {count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: c.surface, borderRadius: 12, padding: 4, border: `1px solid ${c.border}` }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 9, cursor: 'pointer',
            border: 'none', fontSize: 12, fontWeight: tab === tb.id ? 700 : 400,
            background: tab === tb.id ? 'rgba(0,184,204,0.12)' : 'transparent',
            color: tab === tb.id ? '#00b8cc' : c.text2,
            transition: 'all 0.15s',
          }}>{tb.label}</button>
        ))}
      </div>

      {/* ── TAB: Hồ Sơ Upload ─────────────────────────────────────────────── */}
      {tab === 'records' && (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.text3 }}>
              ⟳ {lang === 'vi' ? 'Đang tải từ IndexedDB…' : 'Loading from IndexedDB…'}
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ color: c.text3, fontSize: 13 }}>
                {lang === 'vi' ? 'Chưa có hồ sơ nào. Hãy upload file trong tab Hồ Sơ Y Tế.' : 'No records yet. Upload files in the Medical Records tab.'}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: c.text2, fontFamily: 'monospace' }}>
                  {totalFiles} {lang === 'vi' ? 'hồ sơ' : 'records'} · {totalSizeMB} MB
                </span>
                <span style={{ fontSize: 11, color: c.text3 }}>
                  {lang === 'vi' ? `Realtime tracking · cập nhật ${lastUpdated ? formatDateTime(lastUpdated.toISOString(), lang) : '—'}` : `Realtime tracking · updated ${lastUpdated ? formatDateTime(lastUpdated.toISOString(), lang) : '—'}`}
                </span>
              </div>
              {records.map(r => (
                <RecordRow key={r.id} record={r} onDelete={remove} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Bệnh Nhân ────────────────────────────────────────────────── */}
      {tab === 'patients' && (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {records.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: c.text3, fontSize: 13 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              {lang === 'vi' ? 'Upload hồ sơ để tự động tạo bệnh nhân.' : 'Upload records to auto-create patients.'}
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              {/* Auto-generated patient from uploads */}
              {patientFromUpload && (
                <div style={{
                  background: 'rgba(0,184,204,0.06)', border: '1px solid rgba(0,184,204,0.2)',
                  borderRadius: 14, padding: '18px 20px', marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(0,184,204,0.15)', border: '2px solid #00b8cc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                    }}>📁</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#e8f0f8', marginBottom: 3 }}>
                        {patientFromUpload.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                        ID: {patientFromUpload.id}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)', color: '#00e676' }}>
                        AUTO-GENERATED
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      [lang === 'vi' ? 'Hồ sơ' : 'Records', patientFromUpload.files, '#00b8cc'],
                      [lang === 'vi' ? 'AI phân tích' : 'AI Analyzed', patientFromUpload.aiDone, '#9c6fff'],
                      [lang === 'vi' ? 'Cập nhật' : 'Updated', formatDate(patientFromUpload.last, lang), '#ffb74d'],
                    ].map(([label, val, color]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'monospace' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* File type chips */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    {Object.entries(patientFromUpload.types).map(([type, count]) => {
                      const color = FILE_COLOR[type] || '#aaa'
                      return (
                        <span key={type} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${color}15`, border: `1px solid ${color}30`, color }}>
                          {fileTypeIcon(type)} {fileTypeLabel(type)} ×{count}
                        </span>
                      )
                    })}
                  </div>

                  <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                    ℹ️ {lang === 'vi'
                      ? 'Bệnh nhân này được tự động tạo từ các hồ sơ upload. Xem chi tiết tại tab Hồ Sơ.'
                      : 'This patient is auto-generated from uploaded records. View details in Records tab.'}
                  </div>
                </div>
              )}

              {/* System users as patients */}
              <div style={{ fontSize: 11, color: c.text3, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 10 }}>
                {lang === 'vi' ? 'NGƯỜI DÙNG HỆ THỐNG' : 'SYSTEM USERS'}
              </div>
              {users.map(u => (
                <div key={u.email} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                  borderBottom: `1px solid ${c.border}`,
                }}>
                  <img src={u.avatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${u.isAdmin ? '#ff5252' : '#00b8cc'}` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: c.text3 }}>{u.email}</div>
                  </div>
                  {u.isAdmin && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', color: '#ff5252' }}>ADMIN</span>
                  )}
                  <span style={{ fontSize: 11, color: c.text3 }}>{formatDate(u.createdAt, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Nhật Ký ─────────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {activities.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: c.text3, fontSize: 13 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              {lang === 'vi' ? 'Chưa có hoạt động nào. Upload hồ sơ để bắt đầu.' : 'No activity yet. Upload records to get started.'}
            </div>
          ) : (
            <div>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, fontSize: 12, color: c.text2, fontFamily: 'monospace' }}>
                {activities.length} {lang === 'vi' ? 'hoạt động upload' : 'upload events'}
              </div>
              {activities.map((a, i) => (
                <div key={a.id || i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px',
                  borderBottom: `1px solid ${c.border}`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${TYPE_COLOR[a.type] || '#555'}15`, border: `1px solid ${TYPE_COLOR[a.type] || '#555'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    {TYPE_ICON[a.type] || '📌'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: c.text, lineHeight: 1.5 }}>{a.action}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: c.text3, fontFamily: 'monospace' }}>{a.time}</span>
                      {a.hasAI && <span style={{ fontSize: 10, color: '#00e676' }}>✓ AI</span>}
                      {a.fileType && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${FILE_COLOR[a.fileType] || '#aaa'}15`, color: FILE_COLOR[a.fileType] || '#aaa', border: `1px solid ${FILE_COLOR[a.fileType] || '#aaa'}30` }}>
                          {fileTypeLabel(a.fileType)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}



      {/* ── TAB: Thông Báo ───────────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.text }}>{lang === 'vi' ? 'Inbox lỗi hệ thống & thông báo user' : 'System error and user notification inbox'}</div>
              <div style={{ fontSize: 11, color: c.text3 }}>{notifications.length} {lang === 'vi' ? 'thông báo được tracking từ local dashboard' : 'notifications tracked in the local dashboard'}</div>
            </div>
            <button type="button" onClick={markAllRead} style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, border: '1px solid rgba(0,184,204,0.3)', background: 'rgba(0,184,204,0.1)', color: '#00b8cc', fontWeight: 800 }}>
              {lang === 'vi' ? 'Đánh dấu đã đọc' : 'Mark all read'}
            </button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: c.text3, fontSize: 13 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              {lang === 'vi' ? 'Chưa có thông báo lỗi nào được gửi tới admin.' : 'No error notifications have been sent to admin yet.'}
            </div>
          ) : (
            <div>
              {notifications.map((n, i) => (
                <div key={n.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${c.border}`, background: n.type === 'system-error' ? 'rgba(255,183,77,0.06)' : 'transparent' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `${TYPE_COLOR[n.type] || '#00b8cc'}15`, border: `1px solid ${TYPE_COLOR[n.type] || '#00b8cc'}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                    {TYPE_ICON[n.type] || '🔔'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: c.text }}>{n.title || (lang === 'vi' ? 'Thông báo hệ thống' : 'System notification')}</div>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, color: n.status === 'new' ? '#ffb74d' : '#00e676', border: `1px solid ${n.status === 'new' ? 'rgba(255,183,77,0.3)' : 'rgba(0,230,118,0.3)'}`, background: n.status === 'new' ? 'rgba(255,183,77,0.08)' : 'rgba(0,230,118,0.08)' }}>{n.status || 'new'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.55, marginTop: 5 }}>{n.message}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: c.text3 }}><b style={{ color: c.text2 }}>Email:</b> {n.userEmail || '—'}</div>
                      <div style={{ fontSize: 11, color: c.text3 }}><b style={{ color: c.text2 }}>{lang === 'vi' ? 'Màn hình:' : 'Screen:'}</b> {n.screenMessage || n.panelLabel || '—'}</div>
                      <div style={{ fontSize: 11, color: c.text3 }}><b style={{ color: c.text2 }}>{lang === 'vi' ? 'Thời gian:' : 'Time:'}</b> {formatDateTime(n.createdAt, lang)}</div>
                    </div>
                    {n.errorMessage && (
                      <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', maxHeight: 130, overflow: 'auto', padding: 10, borderRadius: 9, border: `1px solid ${c.border}`, background: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.03)', color: '#ff8a65', fontSize: 11 }}>
                        {n.errorMessage}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Tài Khoản ────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, fontSize: 12, color: c.text2, fontFamily: 'monospace' }}>
            {users.length} {lang === 'vi' ? 'tài khoản' : 'accounts'}
          </div>
          {users.map((u, i) => (
            <div key={u.email} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderBottom: i < users.length - 1 ? `1px solid ${c.border}` : 'none',
            }}>
              <img src={u.avatar} alt="" style={{ width: 42, height: 42, borderRadius: '50%', border: `2px solid ${u.isAdmin ? '#ff5252' : '#6b3fd4'}`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{u.name}</div>
                <div style={{ fontSize: 11, color: c.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                <div style={{ fontSize: 10, color: c.text3, marginTop: 2 }}>
                  {lang === 'vi' ? 'Đăng ký:' : 'Joined:'} {formatDate(u.createdAt, lang)} · {u.provider}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {u.isAdmin && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.25)', color: '#ff5252', fontWeight: 700 }}>ADMIN</span>
                )}
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(107,63,212,0.1)', border: '1px solid rgba(107,63,212,0.25)', color: '#9c6fff' }}>
                  {u.provider}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// helper
function readMetaId(ownerUuid) {
  try { return JSON.parse(localStorage.getItem(getMetaKey(ownerUuid)) || '{}').patientId || 'P-unknown' } catch { return 'P-unknown' }
}
