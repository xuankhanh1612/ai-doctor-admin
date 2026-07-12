import React, { useMemo, useState } from 'react'

const FRONT_BODY_AREAS = [
  { id: 'head', label: 'Head', dots: [[10, 5], [11, 5], [12, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7], [10, 8], [11, 8], [12, 8]] },
  { id: 'neck', label: 'Neck', dots: [[10, 9], [11, 9], [12, 9], [10, 10], [11, 10], [12, 10]] },
  { id: 'chest', label: 'Chest', dots: [[8, 11], [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [8, 12], [9, 12], [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13]] },
  { id: 'stomach', label: 'Stomach', dots: [[9, 14], [10, 14], [11, 14], [12, 14], [13, 14], [9, 15], [10, 15], [11, 15], [12, 15], [13, 15], [10, 16], [11, 16], [12, 16]] },
  { id: 'leftArm', label: 'Left Arm', dots: [[6, 12], [6, 13], [6, 14], [6, 15], [6, 16], [6, 17], [6, 18], [7, 12], [7, 13], [7, 14], [7, 15], [7, 16], [7, 17], [7, 18]] },
  { id: 'rightArm', label: 'Right Arm', dots: [[16, 12], [16, 13], [16, 14], [16, 15], [16, 16], [16, 17], [16, 18], [15, 12], [15, 13], [15, 14], [15, 15], [15, 16], [15, 17], [15, 18]] },
  { id: 'leftLeg', label: 'Left Leg', dots: [[9, 17], [10, 17], [9, 18], [10, 18], [9, 19], [10, 19], [9, 20], [10, 20], [9, 21], [10, 21], [9, 22], [10, 22], [9, 23], [10, 23]] },
  { id: 'rightLeg', label: 'Right Leg', dots: [[12, 17], [13, 17], [12, 18], [13, 18], [12, 19], [13, 19], [12, 20], [13, 20], [12, 21], [13, 21], [12, 22], [13, 22], [12, 23], [13, 23]] },
]

const BACK_BODY_AREAS = [
  { id: 'headBack', label: 'Head — back', dots: [[10, 5], [11, 5], [12, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7], [10, 8], [11, 8], [12, 8]] },
  { id: 'neckBack', label: 'Neck — back', dots: [[10, 9], [11, 9], [12, 9], [10, 10], [11, 10], [12, 10]] },
  { id: 'upperBack', label: 'Upper Back', dots: [[8, 11], [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [8, 12], [9, 12], [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13]] },
  { id: 'lowerBack', label: 'Lower Back', dots: [[9, 14], [10, 14], [11, 14], [12, 14], [13, 14], [9, 15], [10, 15], [11, 15], [12, 15], [13, 15], [10, 16], [11, 16], [12, 16]] },
  { id: 'leftArmBack', label: 'Left Arm — back', dots: [[6, 12], [6, 13], [6, 14], [6, 15], [6, 16], [6, 17], [6, 18], [7, 12], [7, 13], [7, 14], [7, 15], [7, 16], [7, 17], [7, 18]] },
  { id: 'rightArmBack', label: 'Right Arm — back', dots: [[16, 12], [16, 13], [16, 14], [16, 15], [16, 16], [16, 17], [16, 18], [15, 12], [15, 13], [15, 14], [15, 15], [15, 16], [15, 17], [15, 18]] },
  { id: 'leftLegBack', label: 'Left Leg — back', dots: [[9, 17], [10, 17], [9, 18], [10, 18], [9, 19], [10, 19], [9, 20], [10, 20], [9, 21], [10, 21], [9, 22], [10, 22], [9, 23], [10, 23]] },
  { id: 'rightLegBack', label: 'Right Leg — back', dots: [[12, 17], [13, 17], [12, 18], [13, 18], [12, 19], [13, 19], [12, 20], [13, 20], [12, 21], [13, 21], [12, 22], [13, 22], [12, 23], [13, 23]] },
]

const BODY_AREAS_BY_VIEW = {
  front: FRONT_BODY_AREAS,
  back: BACK_BODY_AREAS,
}

const PAIN_COLORS = ['#f1d36d', '#e6aa58', '#d77a42', '#c65a39', '#b5362e']

const MODE_COPY = {
  standard: 'Standard — select a body area',
  detailed: 'Detailed — select a specific point',
  painMap: 'Pain Map — select a point and rate intensity',
}

function allDots(view) {
  const map = new Map()
  BODY_AREAS_BY_VIEW[view].forEach(area => area.dots.forEach(([x, y], index) => map.set(`${view}-${area.id}-${index}`, { x, y, view, areaId: `${view}-${area.id}`, areaLabel: area.label })))
  return Array.from(map, ([id, dot]) => ({ id, ...dot }))
}

function getPainColor(level) {
  return PAIN_COLORS[Math.max(1, Math.min(5, Number(level) || 1)) - 1]
}

export default function MyPainPathBodyPanel() {
  const [mode, setMode] = useState('standard')
  const [view, setView] = useState('front')
  const [selectedAreas, setSelectedAreas] = useState([])
  const [selectedPoints, setSelectedPoints] = useState([])
  const [painLevel, setPainLevel] = useState(1)
  const dots = useMemo(() => allDots(view), [view])
  const selectedCount = mode === 'standard' ? selectedAreas.length : selectedPoints.length

  const handleDotClick = (dot) => {
    if (mode === 'standard') {
      setSelectedAreas(prev => prev.includes(dot.areaId) ? prev.filter(id => id !== dot.areaId) : [...prev, dot.areaId])
      return
    }
    setSelectedPoints(prev => prev.some(point => point.id === dot.id) ? prev.filter(point => point.id !== dot.id) : [...prev, { ...dot, painLevel: mode === 'painMap' ? painLevel : null }])
  }

  const removeChip = (id) => {
    if (mode === 'standard') setSelectedAreas(prev => prev.filter(areaId => areaId !== id))
    else setSelectedPoints(prev => prev.filter(point => point.id !== id))
  }

  const chips = mode === 'standard'
    ? selectedAreas.map(id => ({ id, label: [...FRONT_BODY_AREAS, ...BACK_BODY_AREAS].find(area => `${id}`.endsWith(area.id))?.label || id }))
    : selectedPoints.map(point => ({ id: point.id, label: `${point.view.toUpperCase()} · ${point.areaLabel} — ${mode === 'painMap' && point.painLevel ? `pain level ${point.painLevel}/5` : 'point'}` }))

  return (
    <section style={styles.page}>
      <div style={styles.navbar}>
        <strong style={styles.brand}>Patient Helper Z01</strong>
        <nav style={styles.navlinks}>
          {['Home', 'Mission', 'Doctors Can Join', 'Medication Log', 'Detailed Body Check'].map((item, index) => <span key={item} style={index === 0 ? styles.activeLink : styles.link}>{item}</span>)}
          <button style={styles.runButton}>Start a Run</button>
        </nav>
      </div>
      <div style={styles.hero}>
        <h1 style={styles.title}>Tell us where it hurts.</h1>
        <p style={styles.subtitle}>Tap on the body below, and we’ll help you understand what’s going on and who to see.</p>
      </div>
      <div style={styles.card}>
        <div style={styles.bodyPane}>
          <div style={styles.tabs}><button onClick={() => setView('front')} style={view === 'front' ? styles.tabActive : styles.tab}>FRONT</button><button onClick={() => setView('back')} style={view === 'back' ? styles.tabActive : styles.tab}>BACK</button></div>
          <div style={styles.dotGrid} aria-label="Interactive pain body map">
            {dots.map(dot => {
              const selected = mode === 'standard' ? selectedAreas.includes(dot.areaId) : selectedPoints.some(point => point.id === dot.id)
              return <button key={dot.id} onClick={() => handleDotClick(dot)} title={dot.areaLabel} style={{ ...styles.dot, left: `${dot.x * 4}%`, top: `${dot.y * 3.6}%`, background: selected ? (mode === 'painMap' ? getPainColor(selectedPoints.find(point => point.id === dot.id)?.painLevel || painLevel) : '#cc5d38') : '#747166' }} />
            })}
          </div>
          <div style={styles.chipsTitle}>BODY MAP · {mode === 'standard' ? 'SELECT AFFECTED AREAS' : mode === 'detailed' ? 'TAP A SPECIFIC POINT' : 'TAP A POINT, THEN RATE PAIN'}</div>
          <div style={styles.chips}>{chips.map(chip => <button key={chip.id} onClick={() => removeChip(chip.id)} style={styles.chip}>{chip.label} <span style={styles.chipX}>×</span></button>)}</div>
          {mode === 'painMap' && <div style={styles.painScale} aria-label="Pain intensity scale from yellow level 1 to red level 5">{[1, 2, 3, 4, 5].map(level => <button key={level} onClick={() => setPainLevel(level)} style={{ ...styles.painButton, background: getPainColor(level), outline: painLevel === level ? '2px solid #fff' : 'none' }}>{level}</button>)}</div>}
        </div>
        <div style={styles.controlPane}>
          <div style={styles.meta}><span>STAGE</span><b>&gt; BODY SELECTION</b><span>VIEW</span><b>&gt; {view.toUpperCase()}</b><span>SELECTED</span><b>&gt; {selectedCount} {selectedCount === 1 ? 'POINT' : 'POINTS'}</b></div>
          <hr style={styles.rule} />
          <h2 style={styles.question}>Where does it hurt?</h2>
          <p style={styles.helper}>Choose how you'd like to select, then tap on the body to the left.</p>
          <label style={styles.label}>SELECTION MODE</label>
          <select value={mode} onChange={(event) => setMode(event.target.value)} style={styles.select}>
            {Object.entries(MODE_COPY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button disabled={!selectedCount} style={{ ...styles.continueButton, opacity: selectedCount ? 1 : 0.35 }}>Continue</button>
        </div>
      </div>
    </section>
  )
}

const styles = {
  page: { minHeight: '100%', background: '#f5f3ee', color: '#2b2a28', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 72 },
  navbar: { height: 92, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px', borderBottom: '1px solid #e4dfd6', background: '#f8f6f1', position: 'sticky', top: 0, zIndex: 2 },
  brand: { fontSize: 22 }, navlinks: { display: 'flex', alignItems: 'center', gap: 34, fontSize: 18 }, link: { color: '#5e5a54' }, activeLink: { color: '#c55d3a' }, runButton: { border: 0, background: '#c85d3a', color: '#fff', borderRadius: 14, padding: '14px 22px', fontSize: 17, fontWeight: 700 },
  hero: { textAlign: 'center', padding: '0 24px 34px' }, title: { fontSize: 'clamp(44px, 6vw, 76px)', margin: '0 0 20px', fontWeight: 900, letterSpacing: '-0.05em' }, subtitle: { fontSize: 22, color: '#746f68', margin: 0 },
  card: { width: 'min(1180px, calc(100% - 48px))', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 24, overflow: 'hidden', boxShadow: '0 22px 60px rgba(33,28,20,.12)', background: '#fff' },
  bodyPane: { minHeight: 680, background: '#282724', padding: 30, position: 'relative', color: '#c4bcb0' }, tabs: { display: 'flex', gap: 20 }, tab: { border: 0, background: 'transparent', color: '#8c857b', letterSpacing: '.12em', fontFamily: 'monospace', cursor: 'pointer' }, tabActive: { border: 0, borderBottom: '1px solid #c85d3a', background: 'transparent', color: '#c85d3a', letterSpacing: '.12em', fontFamily: 'monospace', cursor: 'pointer' },
  dotGrid: { position: 'relative', height: 520, marginTop: 20, backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }, dot: { position: 'absolute', width: 9, height: 9, borderRadius: 99, border: 0, transform: 'translate(-50%, -50%)', cursor: 'pointer' }, chipsTitle: { fontFamily: 'monospace', letterSpacing: '.16em', fontSize: 12, marginBottom: 12 }, chips: { display: 'flex', flexWrap: 'wrap', gap: 9 }, chip: { border: 0, borderRadius: 18, background: '#56524b', color: '#f0ece5', padding: '8px 12px', fontSize: 14 }, chipX: { color: '#d86b45', fontWeight: 900 }, painScale: { marginTop: 18, padding: 14, borderRadius: 12, background: '#4b4740', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }, painButton: { border: 0, borderRadius: 8, padding: '10px 0', fontWeight: 800 },
  controlPane: { padding: '50px 52px', position: 'relative' }, meta: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '7px 18px', fontFamily: 'monospace', color: '#948e85', letterSpacing: '.08em' }, rule: { border: 0, borderTop: '1px solid #e4dfd6', margin: '28px 0' }, question: { fontSize: 30, margin: 0 }, helper: { color: '#69645e', fontSize: 17, lineHeight: 1.5 }, label: { display: 'block', fontFamily: 'monospace', letterSpacing: '.12em', color: '#a49d94', fontSize: 12, marginTop: 26 }, select: { width: '100%', border: '1px solid #e8e1d7', borderRadius: 12, padding: '14px 18px', fontSize: 17, color: '#4b4742', background: '#fff' }, continueButton: { position: 'absolute', left: 52, right: 52, bottom: 46, border: 0, borderRadius: 14, background: '#c85d3a', color: '#fff', padding: 18, fontSize: 17, fontWeight: 800 },
}
