// src/components/ChatHistoryPanel.jsx
// "Lịch sử Chat với AI" — trang xem lại TOÀN BỘ lịch sử chat đã lưu của
// GlobalAIChatbot (src/components/GlobalAIChatbot.jsx), nhóm theo ngày/tháng/năm
// bằng lưới calendar — cùng pattern UI/UX với calendar 31 ngày của trang
// "Bé Mèo Nước" (src/waterdrink-khanh/beMeoWidget.js + src/lib/beMeoChatStorage.js).
//
// Dữ liệu được đọc trực tiếp từ src/lib/globalChatbotStorage.js (cùng IndexedDB mà
// GlobalAIChatbot dùng để tự động lưu mỗi tin nhắn) — không tạo store riêng, nên
// lịch sử hiển thị ở đây luôn khớp 100% với chatbot góc màn hình.

import React, { useEffect, useMemo, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { getGlobalChatHistory, dateKey, daysInMonth, groupMessagesByDate } from '../lib/globalChatbotStorage.js'

const WEEKDAY_LABELS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const MONTH_LABELS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function ChatHistoryPanel({ onNext, onPrev, prevLabel, nextLabel }) {
  const { theme, lang } = useApp()
  const { user, loading: authLoading } = useAuth()
  const isDark = theme === 'dark'
  const isVi = lang !== 'en'
  const userKey = user?.uuid || null

  const today = useMemo(() => new Date(), [])
  const [loading, setLoading] = useState(true)
  const [byDate, setByDate] = useState({}) // { 'YYYY-MM-DD': [messages...] }
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-based
  const [selectedDate, setSelectedDate] = useState(null)

  // Nạp toàn bộ lịch sử chat đã lưu của user khi vào trang (hoặc khi đổi user).
  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const all = await getGlobalChatHistory(userKey)
      if (cancelled) return
      setByDate(groupMessagesByDate(all))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [userKey, authLoading])

  const todayKey = dateKey(today)
  const datesWithChat = Object.keys(byDate).filter(k => k !== 'unknown')
  const totalDaysWithChat = datesWithChat.length
  const totalMessages = useMemo(
    () => Object.values(byDate).reduce((sum, msgs) => sum + msgs.length, 0),
    [byDate],
  )

  const monthLabels = isVi ? MONTH_LABELS_VI : MONTH_LABELS_EN
  const weekdayLabels = isVi ? WEEKDAY_LABELS_VI : WEEKDAY_LABELS_EN

  // Năm có sẵn cho dropdown — gồm các năm có dữ liệu + năm hiện tại, không trùng.
  const availableYears = useMemo(() => {
    const years = new Set([today.getFullYear()])
    datesWithChat.forEach(k => years.add(Number(k.slice(0, 4))))
    return Array.from(years).sort((a, b) => b - a)
  }, [datesWithChat, today])

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else { setViewMonth(m => m - 1) }
  }
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else { setViewMonth(m => m + 1) }
  }
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(todayKey) }

  // Ô lưới calendar: padding đầu tháng (thứ 2 đầu tuần) + đúng số ngày thật của tháng.
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7 // 0=Mon ... 6=Sun
  const totalDays = daysInMonth(viewYear, viewMonth)
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  const monthMessageCount = useMemo(() => {
    let count = 0
    for (let d = 1; d <= totalDays; d++) {
      const k = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      count += byDate[k]?.length || 0
    }
    return count
  }, [byDate, viewYear, viewMonth, totalDays])

  const selectedMessages = selectedDate ? (byDate[selectedDate] || []) : []
  const isDarkText = isDark ? '#e8f0f8' : '#102033'
  const muted = isDark ? 'rgba(226, 232, 240, 0.64)' : '#64748b'
  const border = isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(15, 76, 129, 0.16)'
  const shell = isDark ? 'rgba(7, 12, 27, 0.96)' : '#fff'

  return (
    <div style={{ minHeight: '100%', background: isDark ? '#050b18' : '#eef8ff', padding: '22px clamp(14px, 3vw, 28px) 36px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ===== HEADER ===== */}
        <section style={{
          borderRadius: 28,
          border: `1px solid ${isDark ? 'rgba(125,211,252,0.28)' : 'rgba(14,165,233,0.24)'}`,
          background: isDark
            ? 'linear-gradient(135deg, rgba(8,47,73,0.94), rgba(15,23,42,0.96))'
            : 'linear-gradient(135deg, #fff, #e0f7ff)',
          padding: 20,
          boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.35)' : '0 24px 70px rgba(14,165,233,0.16)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: isDark ? '#67e8f9' : '#0284c7', marginBottom: 4 }}>
            GLOBAL AI CHATBOT · LỊCH SỬ CHAT THEO NGÀY
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 26, color: isDark ? '#f0f9ff' : '#075985' }}>
            🤗🗓️ {isVi ? 'Lịch sử Chat với AI' : 'AI Chat History'}
          </h2>
          <p style={{ margin: 0, color: isDark ? '#bae6fd' : '#0369a1', lineHeight: 1.6, fontSize: 13 }}>
            {isVi
              ? 'Toàn bộ tin nhắn bạn đã trao đổi với chatbot AI chung (góc dưới màn hình) được tự động lưu lại tại đây, theo từng ngày — giống cách Bé Mèo Nước lưu lịch sử uống nước theo lịch.'
              : "Every message you've exchanged with the general AI chatbot (bottom-right widget) is automatically saved here by date — the same way Bé Mèo Nước keeps its hydration calendar."}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            <span style={statPill(isDark)}>{isVi ? 'Số ngày có chat' : 'Days with chats'}: {totalDaysWithChat}</span>
            <span style={statPill(isDark)}>{isVi ? 'Tổng tin nhắn' : 'Total messages'}: {totalMessages}</span>
            <span style={statPill(isDark)}>{isVi ? 'Tin nhắn tháng này' : 'Messages this month'}: {monthMessageCount}</span>
          </div>
        </section>

        {/* ===== CALENDAR ===== */}
        <section style={{
          borderRadius: 28, padding: 18,
          border: `1px solid ${border}`,
          background: shell,
          boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.3)' : '0 24px 70px rgba(14,165,233,0.10)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div>
              <strong style={{ display: 'block', color: isDark ? '#67e8f9' : '#0369a1', fontSize: 14 }}>
                {monthLabels[viewMonth]} {viewYear}
              </strong>
              <span style={{ display: 'block', marginTop: 3, color: muted, fontSize: 11, fontWeight: 800 }}>
                {isVi ? 'Chọn 1 ngày để xem lại toàn bộ hội thoại' : 'Pick a day to view its full conversation'}
              </span>
            </div>
            <div style={{ borderRadius: 999, padding: '7px 10px', background: 'linear-gradient(135deg,#0ea5e9,#14b8a6)', color: '#fff', fontSize: 12, fontWeight: 950, whiteSpace: 'nowrap' }}>
              {monthMessageCount} {isVi ? 'tin nhắn' : 'msgs'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={goPrevMonth} style={calNavBtn(isDark, border)}>‹</button>
            <select
              value={viewMonth}
              onChange={e => setViewMonth(Number(e.target.value))}
              style={calSelect(isDark, border)}
              aria-label={isVi ? 'Chọn tháng' : 'Select month'}
            >
              {monthLabels.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select
              value={viewYear}
              onChange={e => setViewYear(Number(e.target.value))}
              style={calSelect(isDark, border)}
              aria-label={isVi ? 'Chọn năm' : 'Select year'}
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={goNextMonth} style={calNavBtn(isDark, border)}>›</button>
            <button type="button" onClick={goToday} style={{ ...calNavBtn(isDark, border), fontSize: 11, padding: '7px 10px' }}>
              {isVi ? 'Hôm nay' : 'Today'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 18, color: muted, fontSize: 12, fontWeight: 800 }}>
              {isVi ? 'Đang tải lịch sử chat...' : 'Loading chat history...'}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                {weekdayLabels.map(w => (
                  <div key={w} style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: muted }}>{w}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {cells.map((day, idx) => {
                  if (!day) return <div key={`pad-${idx}`} />
                  const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const count = byDate[key]?.length || 0
                  const hasChat = count > 0
                  const isFuture = key > todayKey
                  const isSelected = selectedDate === key
                  const isToday = key === todayKey
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isFuture}
                      onClick={() => setSelectedDate(key)}
                      title={hasChat ? `${count} ${isVi ? 'tin nhắn' : 'messages'}` : undefined}
                      style={calDayCell(isDark, border, { hasChat, isFuture, isSelected, isToday })}
                    >
                      {day}
                      <small style={{ display: 'block', marginTop: 2, fontSize: 9, fontWeight: 800, opacity: hasChat ? 0.92 : 0.55 }}>
                        {hasChat ? `💬${count > 9 ? '9+' : count}` : ''}
                      </small>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* ===== SELECTED DAY CONVERSATION ===== */}
        <section style={{
          borderRadius: 28, padding: 18,
          border: `1px solid ${border}`,
          background: shell,
          boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.3)' : '0 24px 70px rgba(14,165,233,0.10)',
        }}>
          <div style={{ marginBottom: 14 }}>
            <strong style={{ display: 'block', color: isDark ? '#67e8f9' : '#0369a1', fontSize: 14 }}>
              {selectedDate
                ? formatDayHeading(selectedDate, isVi)
                : (isVi ? 'Chưa chọn ngày' : 'No day selected')}
            </strong>
            <span style={{ display: 'block', marginTop: 3, color: muted, fontSize: 11, fontWeight: 800 }}>
              {selectedDate
                ? `${selectedMessages.length} ${isVi ? 'tin nhắn trong ngày này' : 'messages on this day'}`
                : (isVi ? 'Bấm vào 1 ô ngày phía trên để xem hội thoại' : 'Tap a day above to view that conversation')}
            </span>
          </div>

          {selectedDate && selectedMessages.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: muted, fontSize: 13 }}>
              {isVi ? 'Không có tin nhắn nào trong ngày này.' : 'No messages on this day.'}
            </div>
          )}

          {selectedMessages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 620, overflowY: 'auto', padding: '2px 2px 4px' }}>
              {selectedMessages.map(message => (
                <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={message.role === 'user' ? historyMsg(isDark, true) : historyMsg(isDark, false)}>
                    {message.imageDataUrls && message.imageDataUrls.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: message.text ? 8 : 0 }}>
                        {message.imageDataUrls.map((img, i) => (
                          img.kind === 'pdf' ? (
                            <div key={i} style={{ width: 64, height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                              📄
                              <span style={{ fontSize: 8, marginTop: 2, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</span>
                            </div>
                          ) : (
                            <img key={i} src={img.dataUrl} alt={img.name || 'attached'} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', display: 'block' }} />
                          )
                        ))}
                      </div>
                    )}
                    {message.fileNames && message.fileNames.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: message.text ? 8 : 0 }}>
                        {message.fileNames.map((name, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.14)' }}>📃 {name}</span>
                        ))}
                      </div>
                    )}
                    {message.text}
                  </div>
                  {message.createdAt && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: muted }}>
                      {formatTime(message.createdAt)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== NAV BUTTONS BOTTOM ===== */}
        <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} />
      </div>
    </div>
  )
}

function formatDayHeading(key, isVi) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function statPill(isDark) {
  return {
    border: `1px solid ${isDark ? 'rgba(125,211,252,0.30)' : 'rgba(14,165,233,0.22)'}`,
    color: isDark ? '#e0f2fe' : '#075985',
    background: isDark ? 'rgba(15,23,42,0.74)' : 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    padding: '8px 11px',
    fontSize: 12,
    fontWeight: 900,
  }
}

function calNavBtn(isDark, border) {
  return {
    border: `1px solid ${border}`, borderRadius: 12, padding: '7px 11px', fontSize: 13,
    background: isDark ? 'rgba(14,165,233,0.14)' : 'rgba(14,165,233,0.12)',
    color: isDark ? '#7dd3fc' : '#0284c7', cursor: 'pointer', fontWeight: 850,
  }
}

function calSelect(isDark, border) {
  return {
    border: `1px solid ${border}`, borderRadius: 12, padding: '7px 10px', fontSize: 12.5, fontWeight: 850,
    color: isDark ? '#7dd3fc' : '#0284c7',
    background: isDark ? 'rgba(15,23,42,0.74)' : 'rgba(255,255,255,0.86)', cursor: 'pointer',
  }
}

function calDayCell(isDark, border, { hasChat, isFuture, isSelected, isToday }) {
  const base = {
    minHeight: 50, borderRadius: 14, padding: '6px 4px', textAlign: 'center', fontWeight: 950,
    border: `1px solid ${isDark ? 'rgba(125,211,252,0.20)' : 'rgba(14,165,233,0.16)'}`,
    background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.78)',
    color: isDark ? '#e2e8f0' : '#0f172a',
    cursor: isFuture ? 'default' : 'pointer',
    opacity: isFuture ? 0.45 : 1,
    transition: 'transform 0.12s ease, box-shadow 0.12s ease, outline 0.12s ease',
  }
  if (hasChat) {
    base.background = 'linear-gradient(135deg, rgba(14,165,233,0.92), rgba(20,184,166,0.92))'
    base.color = '#fff'
  }
  if (isToday) {
    base.outline = `3px solid ${isDark ? 'rgba(125,211,252,0.5)' : 'rgba(14,165,233,0.32)'}`
  }
  if (isSelected) {
    base.outline = '3px solid #0ea5e9'
    base.boxShadow = '0 0 0 6px rgba(14,165,233,0.14), 0 6px 20px rgba(14,165,233,0.30)'
    base.transform = 'translateY(-2px) scale(1.05)'
  }
  return base
}

function historyMsg(isDark, isUser) {
  const text = isDark ? '#e8f0f8' : '#102033'
  return isUser
    ? { alignSelf: 'flex-end', maxWidth: '84%', padding: '11px 13px', borderRadius: '16px 16px 5px 16px', background: 'linear-gradient(135deg, #0f4c81, #2563eb)', color: '#fff', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }
    : { alignSelf: 'flex-start', maxWidth: '88%', padding: '11px 13px', borderRadius: '16px 16px 16px 5px', background: isDark ? 'rgba(30, 41, 59, 0.82)' : '#f1f5f9', color: text, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }
}
