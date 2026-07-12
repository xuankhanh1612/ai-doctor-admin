import React, { useMemo, useState } from 'react'

const PARTS = [
  { id: 'head', label: 'Head', chips: ['Jaw & Chin'], generator: 'head' },
  { id: 'chest', label: 'Chest', chips: ['Right Lower Chest'], generator: 'chest' },
  { id: 'stomach', label: 'Stomach', chips: ['Lower Left Abdomen'], generator: 'stomach' },
  { id: 'leftHand', label: 'Left Hand', chips: ['Ring Finger', 'Middle Finger', 'Pinky Finger', 'Palm'], generator: 'leftHand' },
  { id: 'rightHand', label: 'Right Hand', chips: ['Ring Finger', 'Pinky Finger', 'Palm', 'Thumb', 'Index Finger'], generator: 'rightHand' },
  { id: 'leftLeg', label: 'Left Leg', chips: ['Thigh', 'Foot', 'Shin'], generator: 'leftLeg' },
  { id: 'rightLeg', label: 'Right Leg', chips: ['Shin', 'Knee', 'Foot', 'Thigh'], generator: 'rightLeg' },
  { id: 'back', label: 'Back', chips: ['Mid Right Back', 'Lower Left Back', 'Left Shoulder Blade'], generator: 'back' },
]

const isEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1
const between = (v, min, max) => v >= min && v <= max

function buildDots(partId) {
  const dots = []
  for (let y = 0; y < 38; y += 1) {
    for (let x = 0; x < 42; x += 1) {
      let visible = false
      let selected = false

      if (partId === 'head') {
        visible = isEllipse(x, y, 21, 20, 11.5, 13.5) || isEllipse(x, y, 21, 31, 5.5, 3.8)
        selected = visible && y >= 29
      } else if (partId === 'chest') {
        visible = isEllipse(x, y, 21, 20, 13.5, 12)
        selected = visible && x >= 22 && y >= 14 && y <= 29
      } else if (partId === 'stomach') {
        visible = isEllipse(x, y, 22, 20, 14, 13)
        selected = visible && x <= 20 && y >= 20 && y <= 31
      } else if (partId === 'back') {
        visible = isEllipse(x, y, 21, 20, 14, 14)
        selected = visible && ((x <= 20 && y >= 22) || (x >= 22 && y <= 22) || (between(x, 17, 21) && y <= 12))
      } else if (partId === 'leftLeg' || partId === 'rightLeg') {
        visible = (between(x, 17, 25) && between(y, 7, 29)) || isEllipse(x, y, 21, 6, 5, 3.5) || isEllipse(x, y, 21, 31, 4.5, 3.5) || (between(x, 16, 26) && between(y, 34, 35))
        selected = visible && (partId === 'leftLeg' ? between(y, 17, 24) || between(y, 30, 32) || y <= 5 : between(y, 10, 24) || between(y, 30, 32) || y <= 5)
      } else {
        const palm = isEllipse(x, y, 21, 28, 14, 6.5)
        const fingers = [9, 15, 23, 31, 36].some((cx, i) => isEllipse(x, y, cx, 12 + (i % 2), i === 0 || i === 4 ? 2.5 : 3, i === 2 ? 7.5 : 6.5))
        visible = palm || fingers
        selected = partId === 'leftHand'
          ? (palm || (fingers && x >= 20))
          : (palm || (fingers && (x <= 15 || x >= 25)))
      }

      if (visible) dots.push({ id: `${x}-${y}`, x, y, selected })
    }
  }
  return dots
}

export default function MyPainPathNoiTangPixelPanel() {
  const [partId, setPartId] = useState('head')
  const part = PARTS.find(item => item.id === partId) || PARTS[0]
  const dots = useMemo(() => buildDots(partId), [partId])
  const selectedCount = part.chips.length

  return (
    <section style={styles.page}>
      <div style={styles.navbar}>
        <strong style={styles.brand}>Patient Helper Z01</strong>
        <nav style={styles.navlinks}>
          {['Home', 'Mission', 'Doctors Can Join', 'Medication Log', 'Detailed Body Check'].map((item, index) => <span key={item} style={index === 0 ? styles.activeLink : styles.link}>{item}</span>)}
          <button style={styles.runButton}>Start a Run</button>
        </nav>
      </div>
      <div style={styles.stage}>
        <h1 style={styles.title}>Need Detailed Analysis on Specific</h1>
        <p style={styles.subtitle}>This tool helps you understand your options. It never replaces professional medical advice.</p>
        <div style={styles.card}>
          <div style={styles.pixelPane}>
            <label style={styles.kicker}>GO DEEPER ON</label>
            <select value={partId} onChange={(event) => setPartId(event.target.value)} style={styles.select}>
              {PARTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <div style={styles.dotMap} aria-label="Interactive internal pixel pain map">
              {dots.map(dot => <button key={dot.id} title={part.label} style={{ ...styles.dot, left: `${dot.x * 2.38}%`, top: `${dot.y * 2.45}%`, background: dot.selected ? '#cc623d' : '#77736a' }} />)}
            </div>
            <div style={styles.chipsTitle}>{part.label.toUpperCase()} · TAP A SECTION</div>
            <div style={styles.chips}>{part.chips.map(chip => <button key={chip} style={styles.chip}>{chip} <span style={styles.chipX}>×</span></button>)}</div>
          </div>
          <div style={styles.infoPane}>
            <div style={styles.meta}><span>PART</span><b>&gt; {part.label.toUpperCase()}</b><span>SELECTED</span><b>&gt; {selectedCount} {selectedCount === 1 ? 'SECTION' : 'SECTIONS'}</b></div>
            <hr style={styles.rule} />
            <h2 style={styles.question}>Show me exactly where</h2>
            <p style={styles.helper}>Pick a body part from the dropdown, then tap the section that's bothering you.</p>
            <button style={styles.continueButton}>Continue</button>
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  page: { minHeight: '100%', background: '#f5f3ee', color: '#282725', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 26 },
  navbar: { height: 92, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px', borderBottom: '1px solid #e4dfd6', background: '#f8f6f1' },
  brand: { fontSize: 22 }, navlinks: { display: 'flex', alignItems: 'center', gap: 34, fontSize: 18 }, link: { color: '#5e5a54' }, activeLink: { color: '#c55d3a' }, runButton: { border: 0, background: '#c85d3a', color: '#fff', borderRadius: 14, padding: '14px 22px', fontSize: 17, fontWeight: 700 },
  stage: { width: 'calc(100% - 48px)', margin: '10px auto 0', borderRadius: 18, background: '#c75d3b', padding: '50px 24px 12px', minHeight: 820, textAlign: 'center' },
  title: { color: '#fff', margin: '0 0 10px', fontSize: 30, fontWeight: 850, letterSpacing: '-0.02em' }, subtitle: { color: '#fff6ef', margin: 0, fontSize: 20 },
  card: { width: 'min(1260px, calc(100% - 120px))', margin: '18px auto 0', display: 'grid', gridTemplateColumns: '45% 55%', borderRadius: 22, overflow: 'hidden', background: '#fff', textAlign: 'left' },
  pixelPane: { minHeight: 690, background: '#272622', padding: '30px 30px 26px', color: '#c4bcb0' }, kicker: { display: 'block', color: '#8d887f', fontFamily: 'monospace', letterSpacing: '.18em', fontSize: 12, marginBottom: 10 },
  select: { width: '100%', border: '1px solid rgba(255,255,255,.13)', borderRadius: 12, padding: '13px 18px', fontSize: 17, color: '#f5f0e8', background: '#2b2925' },
  dotMap: { position: 'relative', height: 520, marginTop: 18 }, dot: { position: 'absolute', width: 9, height: 9, borderRadius: 99, border: 0, transform: 'translate(-50%, -50%)' },
  chipsTitle: { fontFamily: 'monospace', letterSpacing: '.16em', color: '#9c968d', fontSize: 12, marginBottom: 12 }, chips: { display: 'flex', flexWrap: 'wrap', gap: 9 }, chip: { border: 0, borderRadius: 18, background: '#56524b', color: '#f0ece5', padding: '8px 12px', fontSize: 14 }, chipX: { color: '#d86b45', fontWeight: 900 },
  infoPane: { minHeight: 690, padding: '50px 52px', position: 'relative', background: '#fffdfa' }, meta: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '7px 18px', fontFamily: 'monospace', color: '#948e85', letterSpacing: '.08em' }, rule: { border: 0, borderTop: '1px solid #e4dfd6', margin: '28px 0' },
  question: { fontSize: 30, margin: 0, letterSpacing: '-0.04em' }, helper: { color: '#69645e', fontSize: 17, lineHeight: 1.5 }, continueButton: { position: 'absolute', left: 52, right: 52, bottom: 46, border: 0, borderRadius: 12, background: '#c85d3a', color: '#fff', padding: 18, fontSize: 17, fontWeight: 800 },
}
