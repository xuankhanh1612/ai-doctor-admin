/**
 * SwarmConsensusPanel.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Giả lập họp hội đồng y khoa với:
 *   • MiroFish-style boid swarm canvas (flocking / attraction / debate)
 *   • 5 AI specialist agents tư vấn song song
 *   • 4 fusion methods: Bayesian / Weighted / Majority / Graph
 *   • Real-time debate bubbles + agent log
 *   • Phase machine: idle → broadcast → deliberate → vote → synthesize → done
 *   • Kết nối useConsensus hook để đẩy kết quả thật vào UI
 */

import React, {
  useRef, useEffect, useState, useCallback, useMemo
} from 'react'
import { useApp } from '../context/AppContext'
import { useConsensus } from '../hooks/useConsensus.js'

// ─── Agent definitions ────────────────────────────────────────────────────────
const SWARM_AGENTS = [
  { id: 'radiology',  name: 'Radiology AI',   role: 'Lesion · Imaging',       icon: '🏥', abbr: 'RAD', color: '#00e5ff', hue: 190 },
  { id: 'oncology',   name: 'Oncology AI',    role: 'Staging · Protocol',     icon: '🎯', abbr: 'ONC', color: '#9c6fff', hue: 265 },
  { id: 'pathology',  name: 'Pathology AI',   role: 'Tissue · Markers',       icon: '🧫', abbr: 'PAT', color: '#f48fb1', hue: 335 },
  { id: 'genomics',   name: 'Genomics AI',    role: 'Mutation · EGFR',        icon: '🧬', abbr: 'GEN', color: '#e8c97a', hue: 45  },
  { id: 'gp',         name: 'GenPractice AI', role: 'Holistic · QoL',         icon: '🩺', abbr: 'GP',  color: '#00e676', hue: 145 },
]

const METHODS = {
  bayesian: { label: 'Bayesian',  short: 'BAY', desc: 'Log-odds by specialty prior'      },
  weighted: { label: 'Weighted',  short: 'WGT', desc: 'Confidence × reliability'         },
  majority: { label: 'Majority',  short: 'VOT', desc: 'Quorum vote + tie-breaking'       },
  graph:    { label: 'Graph GNN', short: 'GNN', desc: 'Evidence propagation across graph' },
}

const PHASES = ['idle','broadcast','deliberate','vote','synthesize','done']

// Debate script per agent
const DEBATE_LINES = {
  radiology: [
    'CT scan: L1 lesion giảm 18% — đáp ứng tốt với Erlotinib',
    'L2 lesion tăng 8% — cần sinh thiết xác nhận tại tuần 8',
    'Khuyến nghị: tiếp tục Scenario B + theo dõi L2 sát sao',
  ],
  oncology: [
    'EGFR Exon 19 del — phù hợp TKI generation 1',
    'T790M hiện diện nguy cơ kháng thuốc — cần Osimertinib dự phòng',
    'Staging IIA giữ nguyên — Erlotinib 150mg/day tối ưu',
  ],
  pathology: [
    '⚠ T790M resistance variant phát hiện — VAF 8%',
    'L2 growth pattern khác biệt — nghi clonal divergence',
    'Phản đối: không nên commit maintenance dose trước biopsy L2',
  ],
  genomics: [
    'ctDNA 0.8% — tín hiệu minimal residual disease',
    'TERT C228T promoter: tăng aggressiveness HCC',
    'TP53 R248W co-mutation — worst prognosis indicator',
  ],
  gp: [
    'Stress index cao — cần can thiệp tâm lý hỗ trợ',
    'QoL score 62/100 — Erlotinib side-effects chấp nhận được',
    'Gia đình đã được tư vấn — đồng ý Scenario B',
  ],
}

const VOTE_OUTCOMES = {
  radiology: { vote: 'agree',  conf: 92 },
  oncology:  { vote: 'agree',  conf: 87 },
  pathology: { vote: 'flag',   conf: 78 },
  genomics:  { vote: 'agree',  conf: 84 },
  gp:        { vote: 'agree',  conf: 95 },
}

// ─── Boid physics ─────────────────────────────────────────────────────────────
function createBoid(id, agentId, W, H) {
  const angle = Math.random() * Math.PI * 2
  return {
    id,
    agentId,
    x: W * 0.2 + Math.random() * W * 0.6,
    y: H * 0.2 + Math.random() * H * 0.6,
    vx: Math.cos(angle) * 1.2,
    vy: Math.sin(angle) * 1.2,
    ax: 0, ay: 0,
    phase: 'idle', // idle | thinking | voting | done
    trail: [],
  }
}

const PARAMS = {
  maxSpeed:     2.2,
  maxForce:     0.08,
  separation:   28,
  cohesion:     200,
  alignment:    60,
  centerWeight: 0.0006,
  sepW:         1.8,
  cohW:         0.8,
  aliW:         0.9,
  attractW:     0.3,
  trailLen:     12,
}

function limit(vx, vy, max) {
  const spd = Math.sqrt(vx * vx + vy * vy)
  if (spd > max) { const s = max / spd; return [vx * s, vy * s] }
  return [vx, vy]
}

function steer(boid, tx, ty) {
  const dx = tx - boid.x, dy = ty - boid.y
  const d = Math.sqrt(dx * dx + dy * dy) || 1
  const s = PARAMS.maxSpeed
  return [(dx / d * s - boid.vx), (dy / d * s - boid.vy)]
}

function updateBoids(boids, W, H, attractors, cohesionVal) {
  const cW = cohesionVal * 0.001 + PARAMS.cohW
  return boids.map(b => {
    let [fx, fy] = [0, 0]
    let [sx, sy] = [0, 0], sc = 0
    let [cx, cy] = [0, 0], cc = 0
    let [ax, ay] = [0, 0], ac = 0

    boids.forEach(o => {
      if (o.id === b.id) return
      const dx = b.x - o.x, dy = b.y - o.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      if (d < PARAMS.separation) {
        sx += (dx / d) / d; sy += (dy / d) / d; sc++
      }
      if (d < PARAMS.cohesion) {
        cx += o.x; cy += o.y; cc++
        ax += o.vx; ay += o.vy; ac++
      }
    })

    if (sc > 0) {
      const [tx, ty] = limit(sx / sc, sy / sc, PARAMS.maxForce)
      fx += tx * PARAMS.sepW; fy += ty * PARAMS.sepW
    }
    if (cc > 0) {
      const [sx2, sy2] = steer(b, cx / cc, cy / cc)
      const [lx, ly] = limit(sx2, sy2, PARAMS.maxForce)
      fx += lx * cW; fy += ly * cW
      const [ax2, ay2] = limit(ax / ac - b.vx, ay / ac - b.vy, PARAMS.maxForce)
      fx += ax2 * PARAMS.aliW; fy += ay2 * PARAMS.aliW
    }

    // Center gravity
    fx += (W / 2 - b.x) * PARAMS.centerWeight
    fy += (H / 2 - b.y) * PARAMS.centerWeight

    // Attractors (one per agent group)
    attractors.forEach(att => {
      if (att.agentId === b.agentId) {
        const [sx3, sy3] = steer(b, att.x, att.y)
        const [lx, ly] = limit(sx3, sy3, PARAMS.maxForce)
        fx += lx * PARAMS.attractW; fy += ly * PARAMS.attractW
      }
    })

    let nvx = b.vx + fx, nvy = b.vy + fy
    const [lvx, lvy] = limit(nvx, nvy, PARAMS.maxSpeed)
    let nx = b.x + lvx, ny = b.y + lvy

    // Wrap
    if (nx < 0) nx += W; if (nx > W) nx -= W
    if (ny < 0) ny += H; if (ny > H) ny -= H

    const trail = [...b.trail, { x: b.x, y: b.y }].slice(-PARAMS.trailLen)

    return { ...b, x: nx, y: ny, vx: lvx, vy: lvy, trail }
  })
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
function drawBoids(ctx, boids, W, H, phase, agentVotes, isDark) {
  ctx.clearRect(0, 0, W, H)

  // Background grid
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'
  ctx.lineWidth = 0.5
  for (let x = 0; x < W; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y < H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  boids.forEach(b => {
    const agent = SWARM_AGENTS.find(a => a.id === b.agentId)
    if (!agent) return
    const vote = agentVotes[b.agentId]
    const col = agent.color

    // Trail
    if (b.trail.length > 1) {
      ctx.beginPath()
      ctx.moveTo(b.trail[0].x, b.trail[0].y)
      b.trail.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = col + '28'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Boid body
    const angle = Math.atan2(b.vy, b.vx)
    const sz = phase === 'vote' ? 7 : phase === 'done' ? 8 : 5.5
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(angle)

    // Glow
    if (phase !== 'idle') {
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 3)
      grd.addColorStop(0, col + '35')
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath(); ctx.arc(0, 0, sz * 3, 0, Math.PI * 2); ctx.fill()
    }

    // Arrow/triangle shape
    ctx.beginPath()
    ctx.moveTo(sz * 1.6, 0)
    ctx.lineTo(-sz, sz * 0.7)
    ctx.lineTo(-sz * 0.5, 0)
    ctx.lineTo(-sz, -sz * 0.7)
    ctx.closePath()

    // Fill: agree=green tint, flag=amber tint, else agent color
    let fillColor = col + 'cc'
    if (vote === 'agree') fillColor = '#00e676cc'
    if (vote === 'flag')  fillColor = '#ffb74dcc'
    ctx.fillStyle = fillColor
    ctx.fill()
    ctx.strokeStyle = col
    ctx.lineWidth = 0.8
    ctx.stroke()

    ctx.restore()

    // Done ring
    if (phase === 'done' || phase === 'synthesize') {
      ctx.beginPath()
      ctx.arc(b.x, b.y, sz * 2.5, 0, Math.PI * 2)
      ctx.strokeStyle = vote === 'flag' ? '#ffb74d66' : col + '55'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  })
}

// ─── Hook: swarm engine ───────────────────────────────────────────────────────
function useSwarm(canvasRef, phase, cohesionVal, isDark) {
  const boidsRef   = useRef([])
  const frameRef   = useRef(null)
  const [agentVotes, setAgentVotes] = useState({})

  const initBoids = useCallback((count = 15) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const boids = []
    SWARM_AGENTS.forEach(agent => {
      const n = Math.max(2, Math.floor(count / SWARM_AGENTS.length))
      for (let i = 0; i < n; i++) {
        boids.push(createBoid(boids.length, agent.id, W, H))
      }
    })
    boidsRef.current = boids
  }, [canvasRef])

  // Attract boids toward agent zones
  const attractors = useMemo(() => {
    const canvas = canvasRef.current
    if (!canvas) return []
    const W = canvas.width, H = canvas.height
    return SWARM_AGENTS.map((a, i) => {
      const angle = (i / SWARM_AGENTS.length) * Math.PI * 2 - Math.PI / 2
      const r = Math.min(W, H) * 0.30
      return { agentId: a.id, x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r }
    })
  }, [canvasRef]) // eslint-disable-line

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Update votes when phase changes
    if (phase === 'vote' || phase === 'synthesize' || phase === 'done') {
      const votes = {}
      SWARM_AGENTS.forEach(a => { votes[a.id] = VOTE_OUTCOMES[a.id].vote })
      setAgentVotes(votes)
    } else {
      setAgentVotes({})
    }

    const loop = () => {
      const W = canvas.width, H = canvas.height
      boidsRef.current = updateBoids(
        boidsRef.current, W, H,
        phase === 'idle' ? [] : attractors,
        cohesionVal
      )
      drawBoids(ctx, boidsRef.current, W, H, phase, agentVotes, isDark)
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [phase, cohesionVal, isDark, attractors, agentVotes, canvasRef])

  return { initBoids, agentVotes }
}

// ─── Debate log hook ──────────────────────────────────────────────────────────
function useDebateLog(phase, agentPhase) {
  const [log, setLog]     = useState([])
  const [bubble, setBubble] = useState(null)
  const tickRef = useRef(null)

  useEffect(() => {
    clearInterval(tickRef.current)
    if (phase === 'broadcast') {
      setLog([{ t: Date.now(), agent: 'SYSTEM', text: '📡 Broadcasting patient context to all agents…', type: 'system' }])
      setBubble(null)
    }
    if (phase === 'deliberate') {
      let step = 0
      const allLines = []
      SWARM_AGENTS.forEach(a => {
        DEBATE_LINES[a.id].forEach(line => allLines.push({ agent: a, text: line }))
      })
      allLines.sort(() => Math.random() - 0.5)

      tickRef.current = setInterval(() => {
        if (step >= allLines.length) { clearInterval(tickRef.current); return }
        const item = allLines[step]
        const entry = {
          t: Date.now(),
          agent: item.agent.abbr,
          text: item.text,
          color: item.agent.color,
          type: item.text.startsWith('⚠') ? 'dissent' : 'speak',
        }
        setLog(prev => [entry, ...prev].slice(0, 30))
        setBubble(entry)
        step++
      }, 900)
    }
    if (phase === 'vote') {
      setLog(prev => [{ t: Date.now(), agent: 'SYSTEM', text: '🗳 Agents casting votes…', type: 'system' }, ...prev])
      setBubble(null)
    }
    if (phase === 'synthesize') {
      setLog(prev => [
        { t: Date.now(), agent: 'META', text: '🧠 Meta-agent synthesizing weighted results…', type: 'system' },
        ...prev,
      ])
    }
    if (phase === 'done') {
      setLog(prev => [
        { t: Date.now(), agent: 'META', text: '✅ Consensus reached: Scenario B · Erlotinib 150mg/day · Biopsy L2 @ Week 8', type: 'result' },
        ...prev,
      ])
      setBubble(null)
    }
    return () => clearInterval(tickRef.current)
  }, [phase]) // eslint-disable-line

  return { log, bubble }
}

// ─── Phase machine ────────────────────────────────────────────────────────────
const PHASE_DURATIONS = {
  idle:       0,
  broadcast:  1400,
  deliberate: 7000,
  vote:       2200,
  synthesize: 2000,
  done:       0,
}

function usePhase() {
  const [phase,    setPhase]    = useState('idle')
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)
  const progRef  = useRef(null)

  const advance = useCallback((from) => {
    const idx = PHASES.indexOf(from)
    if (idx < 0 || idx >= PHASES.length - 1) return
    const next = PHASES[idx + 1]
    const dur  = PHASE_DURATIONS[from]

    clearInterval(progRef.current)
    setProgress(0)
    if (dur > 0) {
      const step = 50
      let elapsed = 0
      progRef.current = setInterval(() => {
        elapsed += step
        setProgress(Math.min(100, (elapsed / dur) * 100))
        if (elapsed >= dur) {
          clearInterval(progRef.current)
          setPhase(next)
          if (next !== 'done') advance(next)
        }
      }, step)
    } else {
      setPhase(next)
      if (next !== 'done') advance(next)
    }
  }, [])

  const start = useCallback(() => {
    setPhase('broadcast')
    advance('broadcast')
  }, [advance])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    clearInterval(progRef.current)
    setPhase('idle')
    setProgress(0)
  }, [])

  return { phase, progress, start, reset }
}

// ─── Mini stat box ────────────────────────────────────────────────────────────
function Stat({ label, value, color = 'var(--cyan)', mono = true }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value}</div>
    </div>
  )
}

// ─── Agent row card ───────────────────────────────────────────────────────────
function AgentRow({ agent, vote, debating }) {
  const conf = VOTE_OUTCOMES[agent.id].conf
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      background: vote ? 'rgba(255,255,255,0.03)' : 'transparent',
      border: `1px solid ${vote ? (vote === 'agree' ? 'rgba(0,230,118,0.2)' : 'rgba(255,183,77,0.25)') : 'var(--border)'}`,
      borderRadius: 8, transition: 'all 0.3s',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: agent.color + '18', border: `1px solid ${agent.color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        boxShadow: debating ? `0 0 10px ${agent.color}55` : 'none',
        transition: 'box-shadow 0.3s',
      }}>{agent.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: debating ? agent.color : 'var(--text)' }}>{agent.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{agent.role}</div>
      </div>

      {vote ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
              color: vote === 'agree' ? 'var(--green)' : 'var(--amber)',
            }}>
              {vote === 'agree' ? '✓ AGREE' : '⚠ FLAG'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{conf}% conf</div>
          </div>
          <div style={{ width: 40, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${conf}%`, height: '100%', background: vote === 'agree' ? 'var(--green)' : 'var(--amber)', borderRadius: 2 }} />
          </div>
        </div>
      ) : debating ? (
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: agent.color,
          animation: 'pulse-dot 0.8s infinite', flexShrink: 0,
        }} />
      ) : (
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>waiting…</div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SwarmConsensusPanel({ onReset, onPrev, prevLabel }) {
  const { t, theme } = useApp()
  const isDark = theme === 'dark'
  const canvasRef  = useRef(null)
  const wrapRef    = useRef(null)

  const [boidCount,   setBoidCount]   = useState(15)
  const [cohesionVal, setCohesionVal] = useState(5)
  const [method,      setMethod]      = useState('bayesian')
  const [debatingId,  setDebatingId]  = useState(null)

  const { phase, progress, start, reset: resetPhase } = usePhase()
  const { initBoids, agentVotes } = useSwarm(canvasRef, phase, cohesionVal, isDark)
  const { log, bubble } = useDebateLog(phase, debatingId)
  const consensus = useConsensus()

  // Resize canvas to wrapper
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const wrap   = wrapRef.current
      if (!canvas || !wrap) return
      canvas.width  = wrap.clientWidth
      canvas.height = 220
      initBoids(boidCount)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [boidCount, initBoids])

  // Track which agent is currently speaking (for highlighting)
  useEffect(() => {
    if (bubble) {
      const ag = SWARM_AGENTS.find(a => a.abbr === bubble.agent)
      setDebatingId(ag?.id || null)
    } else {
      setDebatingId(null)
    }
  }, [bubble])

  // Fire real consensus API when phase reaches vote
  useEffect(() => {
    if (phase === 'vote') consensus.run()
  }, [phase]) // eslint-disable-line

  const handleStart = () => {
    if (phase !== 'idle') return
    resetPhase()
    setTimeout(start, 50)
  }

  const handleReset = () => {
    resetPhase()
    consensus.reset()
    initBoids(boidCount)
  }

  const agreeCount  = Object.values(agentVotes).filter(v => v === 'agree').length
  const flagCount   = Object.values(agentVotes).filter(v => v === 'flag').length
  const isActive    = phase !== 'idle' && phase !== 'done'
  const isDone      = phase === 'done'

  // Average confidence
  const avgConf = Math.round(
    SWARM_AGENTS.reduce((s, a) => s + VOTE_OUTCOMES[a.id].conf, 0) / SWARM_AGENTS.length
  )

  return (
    <div className="animate-fade" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            🏛 Hội đồng Y khoa AI · Swarm Simulation
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>
            MiroFish boid engine · {SWARM_AGENTS.length} specialist agents · Multi-agent consensus
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* API status */}
          {consensus.apiStatus === 'success' && (
            <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 9, fontFamily: 'var(--font-mono)', background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.25)' }}>
              ✓ API LIVE
            </span>
          )}
          {consensus.apiStatus === 'error' && (
            <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 9, fontFamily: 'var(--font-mono)', background: 'rgba(255,82,82,0.08)', color: '#ff5252', border: '1px solid rgba(255,82,82,0.25)' }}>
              ⚠ API OFFLINE · MOCK
            </span>
          )}
          {/* Phase badge */}
          <span style={{
            padding: '4px 12px', borderRadius: 5, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
            background: isDone ? 'rgba(0,230,118,0.1)' : isActive ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)',
            color: isDone ? 'var(--green)' : isActive ? 'var(--cyan)' : 'var(--text3)',
            border: `1px solid ${isDone ? 'rgba(0,230,118,0.3)' : isActive ? 'rgba(0,229,255,0.25)' : 'var(--border)'}`,
            textTransform: 'uppercase',
          }}>
            {phase === 'idle' ? 'READY' : phase.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Controls row ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '10px 14px',
      }}>
        {/* Fusion method */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Object.entries(METHODS).map(([k, m]) => (
            <button key={k} onClick={() => setMethod(k)}
              disabled={isActive}
              style={{
                padding: '4px 10px', borderRadius: 6, cursor: isActive ? 'default' : 'pointer',
                fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
                background: method === k ? 'rgba(0,229,255,0.12)' : 'transparent',
                color: method === k ? 'var(--cyan)' : 'var(--text3)',
                border: `1px solid ${method === k ? 'rgba(0,229,255,0.4)' : 'var(--border)'}`,
                opacity: isActive ? 0.5 : 1,
              }}
              title={m.desc}
            >{m.short}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text3)' }}>
          <span>Cohesion</span>
          <input type="range" min={1} max={10} value={cohesionVal}
            onChange={e => setCohesionVal(+e.target.value)}
            style={{ width: 70, accentColor: 'var(--cyan)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', minWidth: 14 }}>{cohesionVal}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text3)' }}>
          <span>Boids</span>
          <input type="range" min={5} max={40} step={5} value={boidCount}
            onChange={e => { setBoidCount(+e.target.value); initBoids(+e.target.value) }}
            style={{ width: 70, accentColor: 'var(--violet)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--violet)', minWidth: 20 }}>{boidCount}</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {phase === 'idle' ? (
            <button onClick={handleStart} style={{
              padding: '9px 20px', borderRadius: 10, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg, var(--cyan2), var(--violet2))',
              color: '#fff', fontSize: 13, fontWeight: 700,
            }}>▶ Triệu tập hội đồng · {METHODS[method].short}</button>
          ) : (
            <button onClick={handleReset} style={{
              padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border2)',
              color: 'var(--text2)', fontSize: 12, fontWeight: 600,
            }}>↺ Reset</button>
          )}
        </div>
      </div>

      {/* ── Progress bar (phase) ─────────────────────────────────────────── */}
      {isActive && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            {PHASES.filter(p => p !== 'idle').map(p => {
              const idx     = PHASES.indexOf(phase)
              const pIdx    = PHASES.indexOf(p)
              const isCurr  = p === phase
              const isPast  = pIdx < idx
              return (
                <div key={p} style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: isCurr ? 'var(--cyan)' : isPast ? 'var(--green)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {isPast ? '✓' : isCurr ? '▸' : '○'} {p}
                </div>
              )
            })}
          </div>
          <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${((PHASES.indexOf(phase) - 1) / (PHASES.length - 2)) * 100 + (progress / (PHASES.length - 2))}%`,
              background: 'linear-gradient(90deg, var(--cyan2), var(--violet2))',
              transition: 'width 0.1s linear',
            }} />
          </div>
        </div>
      )}

      {/* ── Main grid: canvas + agents ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>

        {/* Swarm canvas */}
        <div ref={wrapRef} style={{
          background: isDark ? '#04060f' : '#f0f4f8',
          border: `1px solid ${isActive ? 'rgba(0,229,255,0.2)' : 'var(--border)'}`,
          borderRadius: 12, overflow: 'hidden', position: 'relative',
          boxShadow: isActive ? '0 0 24px rgba(0,229,255,0.08)' : 'none',
          transition: 'all 0.4s',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />

          {/* Overlay agent labels at attractor positions */}
          {phase !== 'idle' && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {SWARM_AGENTS.map((a, i) => {
                const canvas = canvasRef.current
                if (!canvas) return null
                const W = canvas.width, H = canvas.height
                const angle = (i / SWARM_AGENTS.length) * Math.PI * 2 - Math.PI / 2
                const r = Math.min(W, H) * 0.30
                const x = W / 2 + Math.cos(angle) * r
                const y = H / 2 + Math.sin(angle) * r
                const vote = agentVotes[a.id]
                return (
                  <div key={a.id} style={{
                    position: 'absolute',
                    left: `${(x / W) * 100}%`,
                    top:  `${(y / H) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}>
                    <div style={{
                      fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: vote === 'agree' ? '#00e676' : vote === 'flag' ? '#ffb74d' : a.color,
                      background: isDark ? 'rgba(4,6,15,0.75)' : 'rgba(240,244,248,0.85)',
                      padding: '2px 6px', borderRadius: 4,
                      border: `1px solid ${a.color}33`,
                      whiteSpace: 'nowrap',
                    }}>
                      {a.abbr}{vote === 'agree' ? ' ✓' : vote === 'flag' ? ' ⚠' : ''}
                    </div>
                  </div>
                )
              })}
              {/* Center meta-agent label */}
              {(phase === 'synthesize' || phase === 'done') && (
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center', pointerEvents: 'none',
                }}>
                  <div style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 800,
                    color: 'var(--cyan)',
                    background: isDark ? 'rgba(4,6,15,0.85)' : 'rgba(240,244,248,0.92)',
                    padding: '4px 10px', borderRadius: 6,
                    border: '1px solid rgba(0,229,255,0.35)',
                    boxShadow: '0 0 16px rgba(0,229,255,0.25)',
                  }}>
                    🧠 META-AGENT
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Idle overlay */}
          {phase === 'idle' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
              background: 'rgba(4,6,15,0.5)',
            }}>
              <div style={{ fontSize: 28 }}>🏛</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                Nhấn "Triệu tập hội đồng" để bắt đầu
              </div>
            </div>
          )}
        </div>

        {/* Agents panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>
            Specialist Agents · {SWARM_AGENTS.length}
          </div>
          {SWARM_AGENTS.map(a => (
            <AgentRow
              key={a.id}
              agent={a}
              vote={agentVotes[a.id]}
              debating={debatingId === a.id}
            />
          ))}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      {(isActive || isDone) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Stat label="Agents"      value={SWARM_AGENTS.length} color="var(--cyan)" />
          <Stat label="Agree"       value={isDone ? agreeCount : '—'} color="var(--green)" />
          <Stat label="Flag"        value={isDone ? flagCount  : '—'} color="var(--amber)" />
          <Stat label="Avg Conf"    value={isDone ? `${avgConf}%` : '…'} color="var(--violet)" />
        </div>
      )}

      {/* ── Debate log + bubble ──────────────────────────────────────────── */}
      {(isActive || isDone) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Live debate transcript */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Debate Transcript
            </div>
            <div style={{ height: 140, overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {log.map((entry, i) => (
                <div key={i} style={{
                  fontSize: 11, lineHeight: 1.5,
                  color: entry.type === 'result' ? 'var(--green)' : entry.type === 'system' ? 'var(--cyan)' : entry.color || 'var(--text2)',
                  borderLeft: `2px solid ${entry.type === 'dissent' ? 'var(--amber)' : entry.color || 'var(--border)'}`,
                  paddingLeft: 7,
                  fontStyle: entry.type === 'dissent' ? 'italic' : 'normal',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.6, marginRight: 5 }}>
                    [{entry.agent}]
                  </span>
                  {entry.text}
                </div>
              ))}
            </div>
          </div>

          {/* Current speaking bubble + consensus result */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bubble && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: bubble.type === 'dissent' ? 'rgba(255,183,77,0.08)' : 'rgba(0,229,255,0.06)',
                border: `1px solid ${bubble.type === 'dissent' ? 'rgba(255,183,77,0.3)' : bubble.color + '40' || 'var(--border)'}`,
                fontSize: 12, color: bubble.color || 'var(--text)',
                lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', opacity: 0.6, marginBottom: 4 }}>
                  {bubble.agent} SPEAKING
                </div>
                {bubble.text}
              </div>
            )}

            {/* Consensus result card */}
            {isDone && (
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.25)',
                flex: 1,
              }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--green)', marginBottom: 8 }}>
                  ✅ CONSENSUS REACHED · {METHODS[method].label.toUpperCase()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    ['Plan', 'Scenario B · Targeted'],
                    ['Drug', 'Erlotinib 150mg/day'],
                    ['Checkpoint', 'PET-CT Week 6'],
                    ['Gate', 'Biopsy L2 Week 8'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '6px 9px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Agreement meter */}
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(agreeCount / SWARM_AGENTS.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--green), var(--cyan))', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                    {Math.round((agreeCount / SWARM_AGENTS.length) * 100)}%
                  </span>
                </div>
                {/* Dissent note */}
                <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,183,77,0.06)', borderRadius: 6, border: '1px solid rgba(255,183,77,0.18)', fontSize: 10, color: 'var(--amber)' }}>
                  ⚠ Pathology AI: T790M dissent preserved → biopsy L2 required before dose escalation
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {isDone && (
          <button onClick={() => { handleReset(); if (onReset) onReset() }} style={{
            padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border2)',
            color: 'var(--cyan)', fontSize: 12, fontWeight: 600,
          }}>🔄 Phiên họp mới</button>
        )}
        {isDone && (
          <button onClick={handleStart} style={{
            padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 12, fontWeight: 600,
          }}>↺ Chạy lại</button>
        )}
        {onPrev && prevLabel && (
          <button onClick={onPrev} style={{
            padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border2)',
            color: 'var(--text2)', fontSize: 12, fontWeight: 500, marginLeft: 'auto',
          }}>← {prevLabel}</button>
        )}
      </div>
    </div>
  )
}
