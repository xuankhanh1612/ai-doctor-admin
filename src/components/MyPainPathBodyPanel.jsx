import React, { useMemo, useState } from 'react'

const CATEGORY_COLORS = {
  head: '#35b65a',
  upper: '#2f8dd2',
  arm: '#8e57d0',
  lower: '#e28a2e',
  foot: '#df4a43',
}

const FRONT_BODY_POINTS = [
  [1, 'Đỉnh đầu', 11.5, 4.6, 'head'], [2, 'Trán', 11.5, 5.8, 'head'], [3, 'Thái dương trái', 9.7, 6.8, 'head'], [4, 'Thái dương phải', 13.3, 6.8, 'head'], [5, 'Mũi', 11.5, 7.5, 'head'], [6, 'Cổ trước', 11.5, 9.0, 'upper'],
  [7, 'Vai trái', 7.3, 10.7, 'upper'], [8, 'Vai phải', 15.7, 10.7, 'upper'], [9, 'Ngực trên', 11.5, 10.9, 'upper'], [10, 'Ngực giữa', 11.5, 12.0, 'upper'], [11, 'Ngực dưới trái', 9.6, 13.1, 'upper'], [12, 'Ngực dưới phải', 13.4, 13.1, 'upper'], [13, 'Sườn trái trên', 8.7, 12.0, 'upper'], [14, 'Sườn phải trên', 14.3, 12.0, 'upper'], [15, 'Xương ức', 11.5, 13.2, 'upper'], [16, 'Bụng trên', 11.5, 14.4, 'upper'], [17, 'Bụng giữa', 11.5, 15.5, 'upper'], [18, 'Bụng dưới', 11.5, 16.7, 'upper'], [19, 'Hông trái', 9.0, 16.7, 'upper'], [20, 'Hông phải', 14.0, 16.7, 'upper'],
  [21, 'Cánh tay trái trên', 5.8, 12.5, 'arm'], [22, 'Cẳng tay trái', 5.3, 15.0, 'arm'], [23, 'Khuỷu tay trái', 5.0, 13.8, 'arm'], [24, 'Cánh tay phải trên', 17.2, 12.5, 'arm'], [25, 'Cẳng tay phải', 17.7, 15.0, 'arm'], [26, 'Khuỷu tay phải', 18.0, 13.8, 'arm'], [27, 'Cổ tay trái', 4.7, 18.0, 'arm'], [28, 'Bàn tay trái', 4.2, 19.0, 'arm'], [29, 'Cổ tay phải', 18.3, 18.0, 'arm'], [30, 'Bàn tay phải', 18.8, 19.0, 'arm'],
  [31, 'Hông trái', 9.2, 17.6, 'lower'], [32, 'Hông phải', 13.8, 17.6, 'lower'], [33, 'Vùng chậu', 11.5, 17.7, 'lower'], [34, 'Đùi trái trên', 9.4, 19.2, 'lower'], [35, 'Đùi phải trên', 13.6, 19.2, 'lower'], [36, 'Đùi trái giữa', 9.4, 21.0, 'lower'], [37, 'Đùi phải giữa', 13.6, 21.0, 'lower'], [38, 'Đầu gối trái', 9.5, 23.0, 'lower'], [39, 'Đầu gối phải', 13.5, 23.0, 'lower'], [40, 'Bắp chân trước', 11.5, 24.2, 'lower'],
  [41, 'Ống chân trái trước', 9.5, 24.8, 'foot'], [42, 'Ống chân phải trước', 13.5, 24.8, 'foot'], [43, 'Mắt cá ngoài trái', 8.8, 27.0, 'foot'], [44, 'Mắt cá ngoài phải', 14.2, 27.0, 'foot'], [45, 'Mắt cá trong trái', 10.0, 27.0, 'foot'], [46, 'Mắt cá trong phải', 13.0, 27.0, 'foot'], [47, 'Mu bàn chân trái', 9.0, 28.1, 'foot'], [48, 'Mu bàn chân phải', 14.0, 28.1, 'foot'], [49, 'Ngón chân trái', 8.3, 29.0, 'foot'], [50, 'Ngón chân phải', 14.7, 29.0, 'foot'],
  [51, 'Mắt trái', 10.6, 6.7, 'head'], [52, 'Mắt phải', 12.4, 6.7, 'head'], [53, 'Má trái', 10.3, 7.4, 'head'], [54, 'Má phải', 12.7, 7.4, 'head'], [55, 'Miệng', 11.5, 8.1, 'head'], [56, 'Cằm', 11.5, 8.6, 'head'], [57, 'Cổ họng', 11.5, 9.6, 'upper'], [58, 'Xương đòn trái', 9.8, 10.1, 'upper'], [59, 'Xương đòn phải', 13.2, 10.1, 'upper'], [60, 'Rốn', 11.5, 15.0, 'upper'],
  [61, 'Lòng bàn tay trái', 3.9, 19.7, 'arm'], [62, 'Lòng bàn tay phải', 19.1, 19.7, 'arm'], [63, 'Ngón tay trái', 3.6, 20.4, 'arm'], [64, 'Ngón tay phải', 19.4, 20.4, 'arm'], [65, 'Bẹn trái', 10.2, 18.3, 'lower'], [66, 'Bẹn phải', 12.8, 18.3, 'lower'], [67, 'Cổ chân trái trước', 9.4, 26.6, 'foot'], [68, 'Cổ chân phải trước', 13.6, 26.6, 'foot'], [69, 'Gan bàn chân trái trước', 8.6, 29.4, 'foot'], [70, 'Gan bàn chân phải trước', 14.4, 29.4, 'foot'],
]

const BACK_BODY_POINTS = [
  [71, 'Đỉnh đầu sau', 11.5, 4.6, 'head'], [72, 'Sau đầu', 11.5, 5.8, 'head'], [73, 'Sau tai trái', 9.7, 6.8, 'head'], [74, 'Sau tai phải', 13.3, 6.8, 'head'], [75, 'Cổ sau', 11.5, 8.0, 'head'], [76, 'Gáy dưới', 11.5, 9.0, 'head'],
  [77, 'Vai trái sau', 7.3, 10.7, 'upper'], [78, 'Vai phải sau', 15.7, 10.7, 'upper'], [79, 'Xương bả trái', 9.3, 11.6, 'upper'], [80, 'Xương bả phải', 13.7, 11.6, 'upper'], [81, 'Giữa 2 bả', 11.5, 12.0, 'upper'], [82, 'Lưng trên', 11.5, 13.2, 'upper'], [83, 'Lưng giữa', 11.5, 14.6, 'upper'], [84, 'Lưng dưới', 11.5, 16.0, 'upper'], [85, 'Thắt lưng trái', 9.6, 16.2, 'upper'], [86, 'Thắt lưng phải', 13.4, 16.2, 'upper'], [87, 'Hông trái sau', 9.2, 17.5, 'upper'], [88, 'Hông phải sau', 13.8, 17.5, 'upper'], [89, 'Xương cùng', 11.5, 17.4, 'upper'], [90, 'Cột sống lưng trên', 11.5, 11.0, 'upper'],
  [91, 'Cánh tay trái sau', 5.8, 12.5, 'arm'], [92, 'Cẳng tay trái sau', 5.3, 15.0, 'arm'], [93, 'Khuỷu tay trái sau', 5.0, 13.8, 'arm'], [94, 'Cánh tay phải sau', 17.2, 12.5, 'arm'], [95, 'Cẳng tay phải sau', 17.7, 15.0, 'arm'], [96, 'Khuỷu tay phải sau', 18.0, 13.8, 'arm'], [97, 'Cổ tay trái sau', 4.7, 18.0, 'arm'], [98, 'Mu bàn tay trái', 4.2, 19.0, 'arm'], [99, 'Cổ tay phải sau', 18.3, 18.0, 'arm'], [100, 'Mu bàn tay phải', 18.8, 19.0, 'arm'],
  [101, 'Mông trái', 9.3, 18.1, 'lower'], [102, 'Mông phải', 13.7, 18.1, 'lower'], [103, 'Đùi trái sau', 9.4, 20.0, 'lower'], [104, 'Đùi phải sau', 13.6, 20.0, 'lower'], [105, 'Khoeo trái', 9.5, 22.6, 'lower'], [106, 'Khoeo phải', 13.5, 22.6, 'lower'], [107, 'Bắp chân trái sau', 9.5, 24.5, 'lower'], [108, 'Bắp chân phải sau', 13.5, 24.5, 'lower'], [109, 'Gót chân trái sau', 9.1, 27.8, 'foot'], [110, 'Gót chân phải sau', 13.9, 27.8, 'foot'],
  [111, 'Cột sống cổ', 11.5, 9.8, 'head'], [112, 'Cột sống ngực trên', 11.5, 12.5, 'upper'], [113, 'Cột sống ngực dưới', 11.5, 14.0, 'upper'], [114, 'Cột sống thắt lưng', 11.5, 15.6, 'upper'], [115, 'Sườn trái sau', 8.6, 13.6, 'upper'], [116, 'Sườn phải sau', 14.4, 13.6, 'upper'], [117, 'Eo trái sau', 9.0, 15.4, 'upper'], [118, 'Eo phải sau', 14.0, 15.4, 'upper'], [119, 'Bàn tay trái sau', 3.8, 19.7, 'arm'], [120, 'Bàn tay phải sau', 19.2, 19.7, 'arm'],
  [121, 'Ngón tay trái sau', 3.5, 20.4, 'arm'], [122, 'Ngón tay phải sau', 19.5, 20.4, 'arm'], [123, 'Đùi ngoài trái sau', 8.6, 20.2, 'lower'], [124, 'Đùi ngoài phải sau', 14.4, 20.2, 'lower'], [125, 'Đùi trong trái sau', 10.4, 20.2, 'lower'], [126, 'Đùi trong phải sau', 12.6, 20.2, 'lower'], [127, 'Cẳng chân trái sau', 9.5, 25.6, 'lower'], [128, 'Cẳng chân phải sau', 13.5, 25.6, 'lower'], [129, 'Cổ chân trái sau', 9.5, 26.8, 'foot'], [130, 'Cổ chân phải sau', 13.5, 26.8, 'foot'],
  [131, 'Lòng bàn chân trái', 8.7, 29.0, 'foot'], [132, 'Lòng bàn chân phải', 14.3, 29.0, 'foot'], [133, 'Ngón chân trái sau', 8.0, 29.4, 'foot'], [134, 'Ngón chân phải sau', 15.0, 29.4, 'foot'], [135, 'Gân Achilles trái', 9.4, 27.2, 'foot'], [136, 'Gân Achilles phải', 13.6, 27.2, 'foot'], [137, 'Bả vai trái ngoài', 8.1, 11.7, 'upper'], [138, 'Bả vai phải ngoài', 14.9, 11.7, 'upper'], [139, 'Mạn sườn trái sau', 8.2, 14.8, 'upper'], [140, 'Mạn sườn phải sau', 14.8, 14.8, 'upper'],
]

const PAIN_COLORS = ['#f1d36d', '#e6aa58', '#d77a42', '#c65a39', '#b5362e']

function toBodyPoint([number, label, x, y, category], view) {
  return { id: `${view}-${number}`, number, label, dots: [[x, y]], category }
}

const FRONT_BODY_AREAS = FRONT_BODY_POINTS.map(point => toBodyPoint(point, 'front'))
const BACK_BODY_AREAS = BACK_BODY_POINTS.map(point => toBodyPoint(point, 'back'))

const MODE_COPY = {
  standard: 'Standard — select a body area',
  detailed: 'Detailed — select a specific point',
  painMap: 'Pain Map — select a point and rate intensity',
}

function allDots(view) {
  const map = new Map()
  const areas = view === 'front' ? FRONT_BODY_AREAS : BACK_BODY_AREAS
  areas.forEach(area => area.dots.forEach(([x, y], index) => map.set(`${area.id}-${index}`, { x, y, view, number: area.number, category: area.category, areaId: area.id, areaLabel: area.label })))
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
  const [activePainPointId, setActivePainPointId] = useState(null)
  const dots = useMemo(() => allDots(view), [view])
  const selectedCount = mode === 'standard' ? selectedAreas.length : selectedPoints.length

  const handleDotClick = (dot) => {
    if (mode === 'standard') {
      setSelectedAreas(prev => prev.includes(dot.areaId) ? prev.filter(id => id !== dot.areaId) : [...prev, dot.areaId])
      return
    }
    setSelectedPoints(prev => {
      const existingPoint = prev.find(point => point.id === dot.id)
      if (existingPoint) {
        if (mode === 'painMap') setActivePainPointId(dot.id)
        return prev
      }
      if (mode === 'painMap') setActivePainPointId(dot.id)
      return [...prev, { ...dot, painLevel: mode === 'painMap' ? 1 : null }]
    })
  }

  const removeChip = (id) => {
    if (mode === 'standard') {
      setSelectedAreas(prev => prev.filter(areaId => areaId !== id))
      return
    }
    setSelectedPoints(prev => prev.filter(point => point.id !== id))
    if (activePainPointId === id) setActivePainPointId(null)
  }

  const updateActivePainLevel = (level) => {
    if (!activePainPointId) return
    setSelectedPoints(prev => prev.map(point => point.id === activePainPointId ? { ...point, painLevel: level } : point))
  }

  const activePainPoint = selectedPoints.find(point => point.id === activePainPointId)
  const chips = mode === 'standard'
    ? selectedAreas.map(id => ({ id, label: [...FRONT_BODY_AREAS, ...BACK_BODY_AREAS].find(area => `${id}`.endsWith(area.id))?.label || id }))
    : selectedPoints.map(point => ({ id: point.id, label: `${point.view.toUpperCase()} · #${point.number} ${point.areaLabel} — ${mode === 'painMap' && point.painLevel ? `pain level ${point.painLevel}/5` : 'point'}`, active: point.id === activePainPointId }))

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
              return <button key={dot.id} onClick={() => handleDotClick(dot)} title={`${dot.number}. ${dot.areaLabel}`} style={{ ...styles.dot, left: `${dot.x * 4}%`, top: `${dot.y * 3.25}%`, background: selected ? (mode === 'painMap' ? getPainColor(selectedPoints.find(point => point.id === dot.id)?.painLevel) : '#cc5d38') : CATEGORY_COLORS[dot.category], outline: activePainPointId === dot.id ? '2px solid #fff' : 'none' }}>{dot.number}</button>
            })}
          </div>
          <div style={styles.chipsTitle}>BODY MAP · {mode === 'standard' ? 'SELECT AFFECTED AREAS' : mode === 'detailed' ? 'TAP A SPECIFIC POINT' : 'TAP A POINT, THEN RATE PAIN'}</div>
          <div style={styles.chips}>{chips.map(chip => <button key={chip.id} onClick={() => mode === 'painMap' ? setActivePainPointId(chip.id) : removeChip(chip.id)} style={{ ...styles.chip, ...(chip.active ? styles.chipActive : {}) }}>{chip.label} <span onClick={(event) => { event.stopPropagation(); removeChip(chip.id) }} style={styles.chipX}>×</span></button>)}</div>
          {mode === 'painMap' && <div style={styles.painScaleWrap}>
            <div style={styles.painScaleLabel}>{activePainPoint ? `Rate pain for ${activePainPoint.view.toUpperCase()} · ${activePainPoint.areaLabel}` : 'Tap a point, then set its own pain level'}</div>
            <div style={styles.painScale} aria-label="Pain intensity scale from yellow level 1 to red level 5 for the active point">{[1, 2, 3, 4, 5].map(level => <button key={level} disabled={!activePainPoint} onClick={() => updateActivePainLevel(level)} style={{ ...styles.painButton, background: getPainColor(level), outline: activePainPoint?.painLevel === level ? '2px solid #fff' : 'none', opacity: activePainPoint ? 1 : 0.45 }}>{level}</button>)}</div>
          </div>}
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
  dotGrid: { position: 'relative', height: 520, marginTop: 20, backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }, dot: { position: 'absolute', width: 22, height: 22, borderRadius: 99, border: '1px solid rgba(0,0,0,.35)', transform: 'translate(-50%, -50%)', cursor: 'pointer', color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: '20px', padding: 0, boxShadow: '0 1px 4px rgba(0,0,0,.35)' }, chipsTitle: { fontFamily: 'monospace', letterSpacing: '.16em', fontSize: 12, marginBottom: 12 }, chips: { display: 'flex', flexWrap: 'wrap', gap: 9 }, chip: { border: 0, borderRadius: 18, background: '#56524b', color: '#f0ece5', padding: '8px 12px', fontSize: 14 }, chipX: { color: '#d86b45', fontWeight: 900 }, chipActive: { boxShadow: '0 0 0 2px #f0ece5 inset', background: '#6a655d' }, painScaleWrap: { marginTop: 18, padding: 14, borderRadius: 12, background: '#4b4740' }, painScaleLabel: { color: '#d6cec2', fontSize: 13, marginBottom: 10 }, painScale: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }, painButton: { border: 0, borderRadius: 8, padding: '10px 0', fontWeight: 800 },
  controlPane: { padding: '50px 52px', position: 'relative' }, meta: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '7px 18px', fontFamily: 'monospace', color: '#948e85', letterSpacing: '.08em' }, rule: { border: 0, borderTop: '1px solid #e4dfd6', margin: '28px 0' }, question: { fontSize: 30, margin: 0 }, helper: { color: '#69645e', fontSize: 17, lineHeight: 1.5 }, label: { display: 'block', fontFamily: 'monospace', letterSpacing: '.12em', color: '#a49d94', fontSize: 12, marginTop: 26 }, select: { width: '100%', border: '1px solid #e8e1d7', borderRadius: 12, padding: '14px 18px', fontSize: 17, color: '#4b4742', background: '#fff' }, continueButton: { position: 'absolute', left: 52, right: 52, bottom: 46, border: 0, borderRadius: 14, background: '#c85d3a', color: '#fff', padding: 18, fontSize: 17, fontWeight: 800 },
}
