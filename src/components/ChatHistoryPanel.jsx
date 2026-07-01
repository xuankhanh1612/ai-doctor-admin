// src/components/ChatHistoryPanel.jsx
// "Lịch sử Chat với AI" — trang xem lại TOÀN BỘ lịch sử chat đã lưu của
// GlobalAIChatbot (src/components/GlobalAIChatbot.jsx), nhóm theo ngày/tháng/năm
// bằng lưới calendar — cùng pattern UI/UX với calendar 31 ngày của trang
// "Bé Mèo Nước" (src/waterdrink-khanh/beMeoWidget.js + src/lib/beMeoChatStorage.js).
//
// Dữ liệu được đọc trực tiếp từ src/lib/globalChatbotStorage.js (cùng IndexedDB mà
// GlobalAIChatbot dùng để tự động lưu mỗi tin nhắn) — không tạo store riêng, nên
// lịch sử hiển thị ở đây luôn khớp 100% với chatbot góc màn hình.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext.jsx'
import { dateKey, daysInMonth, groupMessagesByDate } from '../lib/globalChatbotStorage.js'
import { useGlobalAIChatbotEngine, quickPrompts, MAX_FILES, getModeLabel } from '../lib/useGlobalAIChatbotEngine.js'

const WEEKDAY_LABELS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const MONTH_LABELS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function ChatHistoryPanel({ onNext, onPrev, prevLabel, nextLabel, activePanelLabel }) {
  const { theme, lang } = useApp()
  const { user } = useAuth()
  const isDark = theme === 'dark'
  const isVi = lang !== 'en'
  const userKey = user?.uuid || null

  const today = useMemo(() => new Date(), [])
  const todayKey = dateKey(today)
  const [byDate, setByDate] = useState({}) // { 'YYYY-MM-DD': [messages...] }
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-based
  const [selectedDate, setSelectedDate] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null) // null = chưa tìm kiếm, [] = không có kết quả
  const scrollRef = useRef(null)
  const docInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const audioElementRef = useRef(null)

  // ── Bộ khung chat (gửi tin/đính kèm file/giọng nói) dùng CHUNG 1 hook với
  // GlobalAIChatbot.jsx (widget góc màn hình) — cùng đọc/ghi vào src/lib/globalChatbotStorage.js,
  // nên gửi tin ở đây hay ở widget đều đồng bộ song song, không trùng/lệch dữ liệu.
  // Mỗi khi `messages` đổi (đã nạp xong lịch sử, kể cả tin mới gửi), nhóm lại theo ngày
  // để vẽ calendar + tự động hiện hội thoại "hôm nay" lên khi vừa gửi tin xong.
  // Hook cũng tự động đọc to (TTS) câu trả lời mới nhất ngay sau khi AI trả lời xong.
  const {
    messages,
    input, setInput,
    status,
    mode,
    busy,
    attachedFiles,
    handleFilesSelect, removeAttachedFile,
    submitQuestion,
    speaking, speak,
    recording, transcribing, toggleMic,
    historyLoaded,
  } = useGlobalAIChatbotEngine({
    userKey,
    activePanelLabel: activePanelLabel || 'Lịch sử Chat với AI',
    isVi,
    audioElementRef,
    onMessagesChange: (msgs) => {
      setByDate(groupMessagesByDate(msgs))
      setSelectedDate(dateKey())
    },
  })

  const loading = !historyLoaded

  useEffect(() => {
    window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 30)
  }, [messages, busy, selectedDate])

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

  // ── Tìm kiếm: nếu text box khớp định dạng ngày (dd/mm/yyyy, dd-mm-yyyy hoặc
  // yyyy-mm-dd) thì nhảy thẳng tới ngày đó trên calendar; ngược lại tìm kiếm
  // toàn bộ nội dung tin nhắn (mọi ngày) chứa từ khoá, rồi liệt kê kết quả để
  // bấm vào nhảy tới đúng ngày + cuộn tới tin nhắn đó.
  const parseSearchAsDateKey = (raw) => {
    const s = raw.trim()
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) // yyyy-mm-dd
    if (m) {
      const [, y, mo, d] = m
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/) // dd/mm/yyyy hoặc dd-mm-yyyy
    if (m) {
      const [, d, mo, y] = m
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return null
  }

  const handleSearch = () => {
    const q = searchQuery.trim()
    if (!q) { setSearchResults(null); return }

    const dateKeyFound = parseSearchAsDateKey(q)
    if (dateKeyFound) {
      const [y, mo] = dateKeyFound.split('-').map(Number)
      setViewYear(y)
      setViewMonth(mo - 1)
      setSelectedDate(dateKeyFound)
      setSearchResults(null)
      return
    }

    // Tìm kiếm toàn bộ theo text box: quét tất cả ngày có chat, lọc tin nhắn
    // chứa từ khoá (không phân biệt hoa/thường), sắp xếp theo ngày gần nhất trước.
    const needle = q.toLowerCase()
    const results = []
    Object.keys(byDate)
      .filter(k => k !== 'unknown')
      .sort((a, b) => b.localeCompare(a))
      .forEach(k => {
        (byDate[k] || []).forEach(msg => {
          const text = String(msg?.content || msg?.text || '').toLowerCase()
          if (text.includes(needle)) {
            results.push({ dateKey: k, message: msg })
          }
        })
      })
    setSearchResults(results)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch() }
  }

  const jumpToSearchResult = (k) => {
    const [y, mo] = k.split('-').map(Number)
    setViewYear(y)
    setViewMonth(mo - 1)
    setSelectedDate(k)
    setSearchResults(null)
    setSearchQuery('')
  }

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
      <audio ref={audioElementRef} preload="none" style={{ display: 'none' }} />
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

          {/* ===== SEARCH BOX (tìm theo ngày hoặc toàn bộ theo từ khoá) ===== */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={isVi ? 'Tìm theo ngày (dd/mm/yyyy) hoặc từ khoá...' : 'Search by date (dd/mm/yyyy) or keyword...'}
              style={{ ...calSelect(isDark, border), flex: '1 1 200px', cursor: 'text' }}
            />
            <button type="button" onClick={handleSearch} style={calNavBtn(isDark, border)}>
              🔍 {isVi ? 'Tìm kiếm' : 'Search'}
            </button>
            {searchResults !== null && (
              <button
                type="button"
                onClick={() => { setSearchResults(null); setSearchQuery('') }}
                style={{ ...calNavBtn(isDark, border), fontSize: 11, padding: '7px 10px' }}
              >
                {isVi ? 'Xoá tìm kiếm' : 'Clear'}
              </button>
            )}
          </div>

          {searchResults !== null && (
            <div style={{
              marginBottom: 12, maxHeight: 220, overflowY: 'auto',
              border: `1px solid ${border}`, borderRadius: 14, padding: 8,
              background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(240,249,255,0.6)',
            }}>
              {searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 10, color: muted, fontSize: 12, fontWeight: 800 }}>
                  {isVi ? 'Không tìm thấy kết quả phù hợp.' : 'No matching results.'}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 900, color: muted, marginBottom: 6 }}>
                    {searchResults.length} {isVi ? 'kết quả' : 'results'}
                  </div>
                  {searchResults.map((r, idx) => (
                    <button
                      key={`${r.dateKey}-${idx}`}
                      type="button"
                      onClick={() => jumpToSearchResult(r.dateKey)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', marginBottom: 6,
                        border: `1px solid ${border}`, borderRadius: 10, padding: '7px 9px',
                        background: isDark ? 'rgba(30,41,59,0.7)' : '#fff', cursor: 'pointer',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 900, color: isDark ? '#7dd3fc' : '#0284c7' }}>
                        {formatDayHeading(r.dateKey, isVi)}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: isDarkText, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(r.message?.content || r.message?.text || '')}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

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
            <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto', padding: '2px 2px 4px' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: message.role === 'user' ? 'row-reverse' : 'row' }}>
                    {message.createdAt && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: muted }}>
                        {formatTime(message.createdAt)}
                      </span>
                    )}
                    {message.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => speak(message.text)}
                        title={isVi ? (speaking ? 'Dừng đọc' : 'Đọc to') : (speaking ? 'Stop' : 'Read aloud')}
                        style={historySpeakBtn(isDark, border)}
                      >
                        {speaking ? '⏸' : '🔊'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {busy && mode === 'thinking' && (
            <div style={historyMsg(isDark, false)}>
              <span style={{ display: 'inline-flex', gap: 4 }}>
                <span style={typingDotStyle} /><span style={typingDotStyle} /><span style={typingDotStyle} />
              </span>
            </div>
          )}

          {/* ===== COMPOSER — cùng bộ nút/tính năng với widget GlobalAIChatbot, đồng bộ song song ===== */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={composerBadge(isDark)}>{getModeLabel(mode, isVi)}</span>
              <span style={{ fontSize: 11, color: muted }}>{status}</span>
            </div>

            {attachedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'thin' }}>
                {attachedFiles.map(f => (
                  <div key={f.id} style={{ position: 'relative', flexShrink: 0 }}>
                    {f.kind === 'image' ? (
                      <img src={f.dataUrl} alt={f.name} title={f.name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div title={f.name} style={{ width: 52, height: 52, borderRadius: 12, background: isDark ? 'rgba(15,23,42,0.74)' : '#fff', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {f.kind === 'pdf' ? '📄' : '📃'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(f.id)}
                      title={isVi ? 'Bỏ file' : 'Remove file'}
                      style={{ position: 'absolute', top: -6, right: -6, border: 'none', background: '#fff', color: '#1a2035', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: 11, lineHeight: '18px', padding: 0, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.4)', fontWeight: 800 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'thin' }}>
              {quickPrompts.map(prompt => (
                <button key={prompt} type="button" disabled={busy} onClick={() => submitQuestion(prompt)} style={composerQuickBtn(isDark, border, isDarkText)}>
                  {prompt}
                </button>
              ))}
            </div>

            <form
              style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}
              onSubmit={(event) => { event.preventDefault(); submitQuestion() }}
            >
              <input
                ref={docInputRef}
                type="file"
                accept="image/*,application/pdf,text/plain,text/csv,.csv,.txt,.md"
                multiple
                onChange={handleFilesSelect}
                style={{ display: 'none' }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                disabled={busy || attachedFiles.length >= MAX_FILES}
                title={isVi ? `Tải file (PDF, văn bản, CSV, hình ảnh) — tối đa ${MAX_FILES} file` : `Upload files (PDF, text, CSV, images) — up to ${MAX_FILES}`}
                style={{ ...composerIconBtn(isDark, border), fontWeight: 900, fontSize: 18, opacity: (busy || attachedFiles.length >= MAX_FILES) ? 0.5 : 1, cursor: (busy || attachedFiles.length >= MAX_FILES) ? 'not-allowed' : 'pointer' }}
              >
                +
              </button>
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder={isVi ? 'Hỏi chatbot chung hoặc nói bằng giọng nói...' : 'Ask the chatbot or use your voice...'}
                rows={2}
                style={composerInput(isDark, border, isDarkText)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submitQuestion()
                  }
                }}
              />
              <button
                type="button"
                onClick={toggleMic}
                disabled={busy && !recording}
                title={recording ? (isVi ? 'Dừng ghi âm' : 'Stop recording') : (isVi ? 'Nói để hỏi' : 'Speak to ask')}
                style={{
                  ...composerIconBtn(isDark, border),
                  ...(recording ? { background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: '1px solid rgba(239,68,68,0.6)' } : {}),
                  opacity: transcribing ? 0.7 : 1,
                  cursor: transcribing ? 'wait' : 'pointer',
                }}
              >
                {transcribing ? '⏳' : recording ? '⏹️' : '🎙️'}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || attachedFiles.length >= MAX_FILES}
                title={isVi ? `Tải hình ảnh để AI phân tích sâu (tối đa ${MAX_FILES})` : `Upload images for deep AI analysis (up to ${MAX_FILES})`}
                style={{
                  ...composerIconBtn(isDark, border),
                  ...(attachedFiles.length > 0 ? { background: 'linear-gradient(135deg,#14b8a6,#0f766e)', color: '#fff', border: '1px solid rgba(20,184,166,0.6)' } : {}),
                  opacity: (busy || attachedFiles.length >= MAX_FILES) ? 0.5 : 1,
                  cursor: (busy || attachedFiles.length >= MAX_FILES) ? 'not-allowed' : 'pointer',
                }}
              >
                🖼️
              </button>
              <button
                type="submit"
                disabled={busy || (!input.trim() && attachedFiles.length === 0)}
                style={{ ...composerSendBtn, opacity: busy || (!input.trim() && attachedFiles.length === 0) ? 0.55 : 1 }}
              >
                {busy ? '...' : (isVi ? 'Gửi' : 'Send')}
              </button>
            </form>
            <div style={{ marginTop: 8, fontSize: 10.5, color: muted, lineHeight: 1.4 }}>
              {isVi
                ? 'Tin nhắn gửi tại đây sẽ được lưu vào đúng ngày hôm nay và đồng bộ song song với chatbot AI chung ở góc màn hình.'
                : 'Messages sent here are saved under today and stay in sync with the general AI chatbot widget in the corner.'}
            </div>
          </div>
        </section>

        {/* ===== NAV BUTTONS BOTTOM ===== */}
        <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} />
        <style>{`
          @keyframes globalChatbotDotBounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        `}</style>
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

function historySpeakBtn(isDark, border) {
  return {
    border: `1px solid ${border}`, borderRadius: 8, padding: '3px 7px', fontSize: 12, cursor: 'pointer',
    background: isDark ? 'rgba(15,23,42,0.6)' : '#fff', color: isDark ? 'rgba(226, 232, 240, 0.64)' : '#64748b', lineHeight: 1,
  }
}

// ─── Composer (toolbar +, textarea, mic, ảnh, Gửi) — cùng kiểu dáng với GlobalAIChatbot.jsx ──

const typingDotStyle = {
  width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block',
  animation: 'globalChatbotDotBounce 1.1s ease-in-out infinite',
}

function composerBadge(isDark) {
  return {
    color: '#0f766e', background: isDark ? 'rgba(45, 212, 191, 0.16)' : '#ccfbf1',
    borderRadius: 999, padding: '4px 8px', fontWeight: 900, fontSize: 11,
  }
}

function composerQuickBtn(isDark, border, text) {
  return {
    flexShrink: 0, border: `1px solid ${border}`, borderRadius: 999, padding: '7px 10px',
    background: isDark ? 'rgba(15,23,42,0.74)' : '#fff', color: text, fontSize: 11, fontWeight: 800, cursor: 'pointer',
  }
}

function composerIconBtn(isDark, border) {
  return {
    border: `1px solid ${border}`, borderRadius: 14, padding: '0 14px', fontSize: 16,
    background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)', color: isDark ? '#a5b4fc' : '#6366f1',
    cursor: 'pointer', transition: 'all 0.18s', lineHeight: 1,
  }
}

function composerInput(isDark, border, text) {
  return {
    flex: 1, resize: 'none', border: `1px solid ${border}`, borderRadius: 14, padding: '10px 12px',
    outline: 'none', font: 'inherit', fontSize: 13, color: text,
    background: isDark ? 'rgba(15, 23, 42, 0.82)' : '#fff',
  }
}

const composerSendBtn = {
  border: 'none', borderRadius: 14, padding: '0 16px', color: '#fff',
  background: 'linear-gradient(135deg, #14b8a6, #0f4c81)', fontWeight: 900, cursor: 'pointer',
}
