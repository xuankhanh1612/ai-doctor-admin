/**
 * VarCheckPanel.jsx
 * ─────────────────────────────────────────────────────────────────
 * "VAR Y TẾ" — Medi-VAR Consensus Lab
 * Mô phỏng quy trình "Check VAR" (hội chẩn AI theo mô hình bóng đá):
 *   1) Nguồn dữ liệu (camera / ảnh chụp X-quang / xét nghiệm / hồ sơ / gen)
 *   2) Tổ VAR — các Agent chuyên gia phân tích song song (Vision / NLP / Biomarker / Predictive)
 *   3) Quy trình đồng thuận đàn (Swarm Consensus) — điểm đồng thuận + thảo luận + radar
 *   4) Phán quyết cuối cùng — chẩn đoán đề xuất, mức rủi ro, phác đồ, xác nhận / yêu cầu bác sĩ
 *
 * Dựa trên bản mock HTML gốc (var-simulation.html) + thiết kế dashboard 4 cột
 * (Medi-VAR Consensus Lab), viết lại bằng React theo theme tối của app
 * (biến CSS --cyan/--violet/--pink/--green/--surface/--border...).
 */

import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import NavButtons from './NavButtons.jsx'

const DATA_SOURCES = [
  { id: 'vitals',   icon: '📷', label: 'Dấu hiệu sinh tồn bệnh nhân', progress: 100, ok: true  },
  { id: 'imaging',  icon: '🩻', label: 'Hình ảnh quang tuyến',        progress: 100, ok: false },
  { id: 'labs',     icon: '🧪', label: 'Kết quả xét nghiệm',           progress: 100, ok: true  },
  { id: 'history',  icon: '📄', label: 'Hồ sơ lịch sử',                progress: 100, ok: false },
  { id: 'genomic',  icon: '🧬', label: 'Dữ liệu di truyền',            progress: 100, ok: true  },
]

const AGENTS = [
  {
    id: 'vision', abbr: 'V1.4', color: 'cyan', name: 'Tác nhân Thị giác V1.4',
    observation: 'Phổi: phát hiện vệt mờ nhẹ khu trú thùy dưới.', confidence: 88,
  },
  {
    id: 'nlp', abbr: 'D3', color: 'violet', name: 'Tác nhân Tài liệu NLP D3',
    observation: 'Tiền sử viêm phế quản (2022); đơn thuốc cũ có nguy cơ kháng thuốc.', confidence: 70,
  },
  {
    id: 'biomarker', abbr: 'B1', color: 'amber', name: 'Tác nhân Dấu ấn sinh học B1',
    observation: 'Chỉ số viêm CRP tăng nhẹ so với ngưỡng an toàn.', confidence: 60,
  },
  {
    id: 'predictive', abbr: 'R2', color: 'pink', name: 'Tác nhân Rủi ro Dự đoán R2',
    observation: 'Mô hình dự đoán: nguy cơ tiến triển viêm phổi trong 48h.', confidence: 81,
  },
]

const COLOR_MAP = {
  cyan:   { bg: 'rgba(0,229,255,0.12)',   color: 'var(--cyan)'   },
  violet: { bg: 'rgba(156,111,255,0.12)', color: 'var(--violet)' },
  amber:  { bg: 'rgba(255,183,77,0.12)',  color: 'var(--amber)'  },
  pink:   { bg: 'rgba(244,143,177,0.12)', color: 'var(--pink)'   },
}

const DISCUSSION_LINES = [
  { agent: 'V1.4', text: 'Tác nhân Thị giác phát hiện điểm bất thường tại vùng phổi (độ tin cậy 88%).' },
  { agent: 'D3',   text: 'Tác nhân Tài liệu đối chiếu chéo hồ sơ lịch sử, xác nhận tiền sử hô hấp liên quan.' },
  { agent: 'B1',   text: 'Tác nhân Dấu ấn sinh học và Tác nhân Thị giác đã đạt đồng thuận về xu hướng viêm.' },
  { agent: 'R2',   text: 'Tác nhân Dự đoán cảnh báo nguy cơ tiến triển nếu không can thiệp sớm.' },
]

function useCountUp(target, active, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) { setValue(0); return }
    let raf, start
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return value
}

function Card({ title, subtitle, children, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: accent || '#fff', letterSpacing: '0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function DataSourceRow({ src, checking }) {
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>{src.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{src.label}</span>
          <span style={{ fontSize: 12 }}>{src.ok ? '✅' : '⚠️'}</span>
        </div>
        <div style={{ marginTop: 6, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, background: 'var(--cyan)',
            width: checking ? `${src.progress}%` : '0%',
            transition: 'width 1.1s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

function AgentCard({ agent, status }) {
  const c = COLOR_MAP[agent.color]
  const done = status === 'done'
  const running = status === 'running'
  return (
    <div style={{
      background: done ? c.bg : 'var(--surface2)',
      border: `1px solid ${done ? c.color + '55' : 'var(--border)'}`,
      borderRadius: 10, padding: 12, transition: 'all 0.35s',
      opacity: status === 'waiting' ? 0.5 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6, background: c.bg, color: c.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0,
        }}>{agent.abbr}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: running ? c.color : 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            {running ? '⟳ Đang phân tích…' : done ? 'Hoàn tất' : 'Chờ lệnh'}
          </div>
        </div>
      </div>
      {done && (
        <>
          <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 8 }}>{agent.observation}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${agent.confidence}%`, background: c.color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: c.color, flexShrink: 0 }}>{agent.confidence}%</span>
          </div>
        </>
      )}
    </div>
  )
}

function ConsensusGauge({ value }) {
  const r = 46, c = 2 * Math.PI * r
  const offset = c * (1 - value / 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="120" height="72" viewBox="0 0 120 72">
        <path d="M 10 66 A 50 50 0 0 1 110 66" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 10 66 A 50 50 0 0 1 110 66"
          fill="none" stroke="var(--green)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c / 2} strokeDashoffset={(c / 2) * (1 - value / 100)}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff', marginTop: -18 }}>{value}%</div>
      <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, letterSpacing: '0.05em' }}>
        {value >= 70 ? 'ĐỒNG THUẬN CAO' : 'ĐANG THẢO LUẬN'}
      </div>
    </div>
  )
}

export default function VarCheckPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const { t } = useApp()
  const [phase, setPhase] = useState('idle') // idle | checking | done
  const [visibleLines, setVisibleLines] = useState(0)
  const [decision, setDecision] = useState(null) // 'confirmed' | 'review' | null
  const timers = useRef([])

  const consensusScore = useCountUp(88, phase === 'done')

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => () => clearTimers(), [])

  const startCheck = () => {
    clearTimers()
    setDecision(null)
    setVisibleLines(0)
    setPhase('checking')
    timers.current.push(setTimeout(() => setPhase('done'), 3000))
  }

  useEffect(() => {
    if (phase !== 'done') return
    DISCUSSION_LINES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setVisibleLines(i + 1), 300 + i * 450))
    })
  }, [phase])

  const agentStatus = (idx) => {
    if (phase === 'idle') return 'waiting'
    if (phase === 'checking') return 'running'
    return 'done'
  }

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>📺 VAR Y TẾ — Swarm Consensus</h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>
            Hội chẩn AI theo mô hình "Check VAR": các tác nhân chuyên gia cùng phân tích, tranh luận và đưa ra phán quyết đồng thuận.
          </p>
        </div>
        {phase === 'done' && (
          <span style={{
            padding: '4px 12px', borderRadius: 5, fontSize: 10, fontFamily: 'var(--font-mono)',
            background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.25)',
          }}>✓ CHECK VAR HOÀN TẤT</span>
        )}
      </div>

      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={startCheck}
          disabled={phase === 'checking'}
          style={{
            padding: '14px 32px', borderRadius: 999, cursor: phase === 'checking' ? 'default' : 'pointer',
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 800,
            fontFamily: 'var(--font-display)', letterSpacing: '0.02em',
            background: phase === 'checking'
              ? 'linear-gradient(135deg, #b58900, #8a6500)'
              : phase === 'done'
                ? 'linear-gradient(135deg, #00c853, #009624)'
                : 'linear-gradient(135deg, #ff5252, #c62828)',
            boxShadow: phase === 'idle' ? '0 0 24px rgba(255,82,82,0.35)' : 'none',
            transition: 'all 0.3s',
          }}
        >
          {phase === 'idle' && '📺 YÊU CẦU CHECK VAR (HỘI CHẨN AI)'}
          {phase === 'checking' && '⏳ ĐANG CHECK VAR…'}
          {phase === 'done' && '📺 CHECK VAR LẠI'}
        </button>
      </div>

      {/* ── Data sources ───────────────────────────────────────────────── */}
      <Card title="Nguồn dữ liệu" subtitle="Data sources — the cameras" accent="var(--text)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
          {DATA_SOURCES.map(src => (
            <DataSourceRow key={src.id} src={src} checking={phase !== 'idle'} />
          ))}
        </div>
      </Card>

      {/* ── Main grid: agents / consensus / ruling ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>

        {/* Tổ VAR — Agent panel */}
        <Card title="Tổ VAR" subtitle="Specialist agents">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AGENTS.map((a, i) => <AgentCard key={a.id} agent={a} status={agentStatus(i)} />)}
          </div>
        </Card>

        {/* Swarm consensus process */}
        <Card title="Hội chẩn" subtitle="Swarm consensus process" accent="var(--cyan)">
          {phase === 'idle' && (
            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
              Nhấn "Yêu cầu Check VAR" để bắt đầu hội chẩn.
            </p>
          )}
          {phase !== 'idle' && (
            <>
              <ConsensusGauge value={phase === 'done' ? consensusScore : 0} />
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
                padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 90,
              }}>
                {phase === 'checking' && (
                  <span style={{ fontSize: 11, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }} className="animate-pulse">
                    ⟳ Đang tổng hợp dữ liệu từ các tác nhân…
                  </span>
                )}
                {DISCUSSION_LINES.slice(0, visibleLines).map((l, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontWeight: 700, flexShrink: 0 }}>{l.agent}</span>
                    <span>{l.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Final ruling */}
        <Card title="Phán quyết cuối cùng" subtitle="Final ruling" accent="var(--pink)">
          {phase !== 'done' && (
            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
              Phán quyết sẽ hiển thị sau khi hội chẩn hoàn tất.
            </p>
          )}
          {phase === 'done' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Chẩn đoán được khuyến nghị</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#ff5252' }}>Nghi ngờ Viêm phổi giai đoạn 2 (91%)</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Mức độ rủi ro</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>Cao</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Phác đồ đề xuất</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Phác đồ kháng sinh alpha</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>⚠ Tránh nhóm kháng sinh X theo tiền sử bệnh án.</div>
                </div>
              </div>

              {/* Votes grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {AGENTS.map(a => {
                  const c = COLOR_MAP[a.color]
                  return (
                    <div key={a.id} title={a.name} style={{
                      textAlign: 'center', padding: '6px 4px', borderRadius: 6,
                      background: c.bg, border: `1px solid ${c.color}44`, fontSize: 11,
                    }}>
                      <div style={{ fontSize: 13 }}>✓</div>
                      <div style={{ fontSize: 8, color: c.color, fontFamily: 'var(--font-mono)' }}>{a.abbr}</div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => setDecision('confirmed')}
                  style={{
                    padding: '11px 16px', borderRadius: 10, cursor: 'pointer', border: 'none',
                    background: decision === 'confirmed' ? 'var(--green)' : 'linear-gradient(135deg, #00c853, #009624)',
                    color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)',
                  }}
                >{decision === 'confirmed' ? '✓ ĐÃ XÁC NHẬN CHẨN ĐOÁN' : 'XÁC NHẬN CHẨN ĐOÁN'}</button>
                <button
                  onClick={() => setDecision('review')}
                  style={{
                    padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                    background: decision === 'review' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 12, fontWeight: 600,
                    fontFamily: 'var(--font-display)',
                  }}
                >{decision === 'review' ? '✓ ĐÃ YÊU CẦU BÁC SĨ ĐÁNH GIÁ' : 'YÊU CẦU ĐÁNH GIÁ CỦA BÁC SĨ'}</button>
                <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>Quyết định cuối cùng luôn thuộc về bác sĩ chuyên khoa.</p>
              </div>
            </>
          )}
        </Card>
      </div>

      <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
