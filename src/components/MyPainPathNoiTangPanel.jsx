import React, { useMemo, useState } from 'react'

const ORGAN_AREAS = [
  { id: 'brain', label: 'Brain', dots: [[10, 5], [11, 5], [12, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7], [10, 8], [11, 8], [12, 8]] },
  { id: 'throat', label: 'Throat / Thyroid', dots: [[10, 9], [11, 9], [12, 9], [10, 10], [11, 10], [12, 10]] },
  { id: 'heart', label: 'Heart', dots: [[10, 12], [11, 12], [10, 13], [11, 13], [12, 13], [10, 14], [11, 14]] },
  { id: 'lungs', label: 'Lungs', dots: [[8, 11], [9, 11], [13, 11], [14, 11], [8, 12], [9, 12], [13, 12], [14, 12], [8, 13], [9, 13], [13, 13], [14, 13], [8, 14], [9, 14], [13, 14], [14, 14]] },
  { id: 'liver', label: 'Liver', dots: [[12, 15], [13, 15], [14, 15], [12, 16], [13, 16], [14, 16], [13, 17], [14, 17]] },
  { id: 'stomachOrgan', label: 'Stomach', dots: [[9, 15], [10, 15], [9, 16], [10, 16], [9, 17], [10, 17]] },
  { id: 'kidneys', label: 'Kidneys', dots: [[8, 17], [14, 17], [8, 18], [14, 18], [8, 19], [14, 19]] },
  { id: 'intestines', label: 'Intestines', dots: [[9, 18], [10, 18], [11, 18], [12, 18], [13, 18], [9, 19], [10, 19], [11, 19], [12, 19], [13, 19], [9, 20], [10, 20], [11, 20], [12, 20], [13, 20]] },
  { id: 'pelvis', label: 'Bladder / Pelvis', dots: [[10, 21], [11, 21], [12, 21], [10, 22], [11, 22], [12, 22]] },
]
const MODE_COPY = {
  standard: 'Standard — select an organ area',
  detailed: 'Detailed — select a specific organ point',
  painMap: 'Pain Map — select organ point and rate intensity',
}

function allDots() {
  const map = new Map()
  ORGAN_AREAS.forEach(area => area.dots.forEach(([x, y], index) => map.set(`${area.id}-${index}`, { x, y, areaId: area.id, areaLabel: area.label })))
  return Array.from(map, ([id, dot]) => ({ id, ...dot }))
}

export default function MyPainPathNoiTangPanel() {
  const [mode, setMode] = useState('standard')
  const [view, setView] = useState('front')
  const [selectedAreas, setSelectedAreas] = useState([])
  const [selectedPoints, setSelectedPoints] = useState([])
  const [painLevel, setPainLevel] = useState(1)
  const dots = useMemo(allDots, [])
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
    ? selectedAreas.map(id => ({ id, label: ORGAN_AREAS.find(area => area.id === id)?.label || id }))
    : selectedPoints.map(point => ({ id: point.id, label: `${point.areaLabel} — ${mode === 'painMap' && point.painLevel ? `pain ${point.painLevel}` : 'point'}` }))

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
        <h1 style={styles.title}>My Pain Path Nội Tạng</h1>
        <p style={styles.subtitle}>Chọn vùng nội tạng đang khó chịu để ghi nhận vị trí, mức độ và chuẩn bị bước tư vấn tiếp theo.</p>
      </div>
      <div style={styles.card}>
        <div style={styles.bodyPane}>
          <div style={styles.tabs}><button onClick={() => setView('front')} style={view === 'front' ? styles.tabActive : styles.tab}>FRONT</button><button onClick={() => setView('back')} style={view === 'back' ? styles.tabActive : styles.tab}>BACK</button></div>
          <div style={styles.dotGrid} aria-label="Interactive internal-organ pain map">
            {dots.map(dot => {
              const selected = mode === 'standard' ? selectedAreas.includes(dot.areaId) : selectedPoints.some(point => point.id === dot.id)
              return <button key={dot.id} onClick={() => handleDotClick(dot)} title={dot.areaLabel} style={{ ...styles.dot, left: `${dot.x * 4}%`, top: `${dot.y * 3.6}%`, background: selected ? '#cc5d38' : '#747166' }} />
            })}
          </div>
          <div style={styles.chipsTitle}>ORGAN MAP · {mode === 'standard' ? 'SELECT AFFECTED AREAS' : mode === 'detailed' ? 'TAP A SPECIFIC POINT' : 'TAP A POINT, THEN RATE PAIN'}</div>
          <div style={styles.chips}>{chips.map(chip => <button key={chip.id} onClick={() => removeChip(chip.id)} style={styles.chip}>{chip.label} <span style={styles.chipX}>×</span></button>)}</div>
          {mode === 'painMap' && <div style={styles.painScale}>{[1, 2, 3, 4, 5].map(level => <button key={level} onClick={() => setPainLevel(level)} style={{ ...styles.painButton, background: ['#e7c95d', '#dda758', '#d37b43', '#bd5939', '#a9342d'][level - 1], outline: painLevel === level ? '2px solid #fff' : 'none' }}>{level}</button>)}</div>}
        </div>
        <div style={styles.controlPane}>
          <div style={styles.meta}><span>PART</span><b>&gt; ORGAN SELECTION</b><span>VIEW</span><b>&gt; {view.toUpperCase()}</b><span>SELECTED</span><b>&gt; {selectedCount} {selectedCount === 1 ? 'POINT' : 'POINTS'}</b></div>
          <hr style={styles.rule} />
          <h2 style={styles.question}>Show me exactly which organ area</h2>
          <p style={styles.helper}>Pick an organ area or point from the pixel map on the left.</p>
          <label style={styles.label}>ORGAN SELECTION MODE</label>
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
