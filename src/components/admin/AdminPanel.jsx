import React, { useState, useEffect } from 'react'
import { useAuth } from '/src/context/AuthContext'
import { useApp } from '/src/context/AppContext'

export default function AdminPanel() {
  const { getAllUsers, getMedicalRecords } = useAuth()
  const { t, lang, theme } = useApp()
  const isDark = theme === 'dark'
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [records, setRecords] = useState([])

  useEffect(() => {
    setUsers(getAllUsers())
    setRecords(getMedicalRecords())
  }, [])

  const c = isDark ? {
    border: 'rgba(255,255,255,0.08)', text: '#e8f0f8',
    text2: 'rgba(232,240,248,0.55)', text3: 'rgba(232,240,248,0.28)',
    surface: 'rgba(255,255,255,0.03)', bg: 'rgba(255,255,255,0.04)',
  } : {
    border: 'rgba(0,0,0,0.1)', text: '#1a2035',
    text2: '#555', text3: '#999',
    surface: 'rgba(0,0,0,0.02)', bg: '#fff',
  }

  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Mock activity log
  const activities = [
    { time: '2 phút trước', user: 'demo.google@gmail.com', action: lang === 'vi' ? 'Tải lên X-ray ngực' : 'Uploaded chest X-ray', type: 'upload' },
    { time: '15 phút trước', user: 'khanhlegood1@gmail.com', action: lang === 'vi' ? 'Xem consensus AI bệnh nhân P-003' : 'Viewed AI consensus for patient P-003', type: 'view' },
    { time: '1 giờ trước', user: 'demo.apple@icloud.com', action: lang === 'vi' ? 'Thêm thành viên gia đình' : 'Added family member', type: 'edit' },
    { time: '3 giờ trước', user: 'khanhlegood1@gmail.com', action: lang === 'vi' ? 'Cập nhật hồ sơ bệnh nhân' : 'Updated patient record', type: 'edit' },
    { time: 'Hôm qua', user: 'demo.google@gmail.com', action: lang === 'vi' ? 'Đăng ký tài khoản mới' : 'Registered new account', type: 'auth' },
  ]
  const typeColor = { upload: '#00b8cc', view: '#9c6fff', edit: '#ffb74d', auth: '#00e676' }
  const typeIcon = { upload: '📤', view: '👁️', edit: '✏️', auth: '🔐' }

  // Stats
  const stats = [
    { label: lang === 'vi' ? 'Tổng người dùng' : 'Total Users', value: users.length, icon: '👥', color: '#00b8cc' },
    { label: lang === 'vi' ? 'Hồ sơ y tế' : 'Medical Records', value: records.length, icon: '📋', color: '#9c6fff' },
    { label: lang === 'vi' ? 'Phân tích hôm nay' : 'Analyses Today', value: 7, icon: '🤖', color: '#00e676' },
    { label: lang === 'vi' ? 'Bệnh nhân đang theo dõi' : 'Active Patients', value: 3, icon: '🏥', color: '#ffb74d' },
  ]

  const TABS = [
    { id: 'users', label: lang === 'vi' ? '👥 Người dùng' : '👥 Users' },
    { id: 'records', label: lang === 'vi' ? '📋 Hồ sơ' : '📋 Records' },
    { id: 'activity', label: lang === 'vi' ? '📊 Nhật ký' : '📊 Activity' },
  ]

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ background: 'rgba(255,82,82,0.12)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 6, padding: '2px 10px', fontSize: 10, color: '#ff5252', fontWeight: 700, letterSpacing: '0.1em' }}>
              ADMIN
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{t('adminPanel')}</h2>
          </div>
          <p style={{ color: c.text2, fontSize: 12 }}>Lê Xuân Khánh · khanhlegood1@gmail.com</p>
        </div>
        <div style={{ fontSize: 10, color: c.text3, fontFamily: 'monospace', textAlign: 'right' }}>
          {lang === 'vi' ? 'Phiên làm việc' : 'Session'}<br />
          {new Date().toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'monospace', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: c.text3, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {TABS.map(tab_ => (
          <button key={tab_.id} onClick={() => setTab(tab_.id)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: `1px solid ${tab === tab_.id ? 'rgba(0,180,200,0.4)' : c.border}`,
            background: tab === tab_.id ? 'rgba(0,180,200,0.1)' : 'none',
            color: tab === tab_.id ? '#00b8cc' : c.text2,
          }}>{tab_.label}</button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, fontSize: 10, letterSpacing: '0.12em', color: c.text3, textTransform: 'uppercase' }}>
            {t('allUsers')} · {users.length} {lang === 'vi' ? 'tài khoản' : 'accounts'}
          </div>
          {users.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: c.text3 }}>
              {lang === 'vi' ? 'Chưa có người dùng nào ngoài admin' : 'No users yet except admin'}
            </div>
          ) : users.map((u, i) => (
            <div key={u.email} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderBottom: i < users.length - 1 ? `1px solid ${c.border}` : 'none',
            }}>
              <img src={u.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', background: '#080c1a' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{u.name}</span>
                  {u.isAdmin && <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(255,82,82,0.12)', color: '#ff5252', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 4, fontWeight: 700 }}>ADMIN</span>}
                </div>
                <div style={{ fontSize: 11, color: c.text3 }}>{u.email} · {u.provider}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: c.text2 }}>{formatDate(u.createdAt)}</div>
                <div style={{ fontSize: 10, color: c.text3 }}>{(u.patients || []).length} {lang === 'vi' ? 'bệnh nhân' : 'patients'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Records tab */}
      {tab === 'records' && (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, fontSize: 10, letterSpacing: '0.12em', color: c.text3, textTransform: 'uppercase' }}>
            {t('allRecords')} · {records.length} {lang === 'vi' ? 'hồ sơ' : 'records'}
          </div>
          {records.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: c.text3 }}>
              {lang === 'vi' ? 'Chưa có hồ sơ nào được tải lên' : 'No records uploaded yet'}
            </div>
          ) : records.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderBottom: i < records.length - 1 ? `1px solid ${c.border}` : 'none',
            }}>
              <span style={{ fontSize: 20 }}>
                {r.fileType?.startsWith('image/') ? '🖼️' : r.fileType === 'application/pdf' ? '📄' : '📎'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{r.fileName}</div>
                <div style={{ fontSize: 10, color: c.text3 }}>
                  {lang === 'vi' ? 'Bệnh nhân' : 'Patient'}: {r.patientId || '-'} · {r.uploadedBy} · {formatDate(r.createdAt)}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(0,180,200,0.1)', color: '#00b8cc', border: '1px solid rgba(0,180,200,0.2)' }}>
                {r.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, fontSize: 10, letterSpacing: '0.12em', color: c.text3, textTransform: 'uppercase' }}>
            {t('activityLog')}
          </div>
          {activities.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderBottom: i < activities.length - 1 ? `1px solid ${c.border}` : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${typeColor[a.type]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>{typeIcon[a.type]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: c.text }}>{a.action}</div>
                <div style={{ fontSize: 10, color: c.text3 }}>{a.user}</div>
              </div>
              <div style={{ fontSize: 10, color: c.text3, whiteSpace: 'nowrap' }}>{a.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
