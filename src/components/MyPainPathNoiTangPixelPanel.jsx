import React, { useMemo, useState } from 'react'

const PARTS = [
  { id: 'head', label: 'Head', sections: ['Eyes & Brows', 'Nose', 'Mouth', 'Jaw & Chin'] },
  { id: 'chest', label: 'Chest', sections: ['Right Chest', 'Left Chest', 'Left Lower Chest', 'Right Lower Chest'] },
  { id: 'stomach', label: 'Stomach', sections: ['Upper Right Abdomen', 'Upper Left Abdomen', 'Navel (Center)', 'Lower Right Abdomen', 'Lower Left Abdomen'] },
  { id: 'leftHand', label: 'Left Hand', sections: ['Thumb', 'Index Finger', 'Middle Finger', 'Ring Finger', 'Pinky Finger', 'Palm'] },
  { id: 'rightHand', label: 'Right Hand', sections: ['Pinky Finger', 'Ring Finger', 'Middle Finger', 'Thumb', 'Index Finger', 'Palm'] },
  { id: 'leftLeg', label: 'Left Leg', sections: ['Thigh', 'Knee', 'Shin', 'Ankle', 'Foot'] },
  { id: 'rightLeg', label: 'Right Leg', sections: ['Thigh', 'Knee', 'Foot', 'Ankle', 'Shin'] },
  { id: 'back', label: 'Back', sections: ['Right Shoulder Blade', 'Lower Right Back', 'Mid Left Back', 'Left Shoulder Blade'] },
]

const isEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1
const between = (v, min, max) => v >= min && v <= max

function buildDots(partId) {
  const dots = []

  for (let y = 0; y < 38; y += 1) {
    for (let x = 0; x < 42; x += 1) {
      let section = null

      if (partId === 'head') {
        const visible = isEllipse(x, y, 21, 18, 11.5, 12.5) || isEllipse(x, y, 13, 22, 3.4, 3.2) || isEllipse(x, y, 29, 22, 3.4, 3.2) || isEllipse(x, y, 21, 30, 6.7, 4.8)
        if (visible) section = y < 18 ? 'Eyes & Brows' : between(y, 18, 23) ? 'Nose' : y < 29 ? 'Mouth' : 'Jaw & Chin'
      } else if (partId === 'chest') {
        const visible = isEllipse(x, y, 21, 20, 14.5, 13)
        if (visible) section = x < 21 ? (y > 24 ? 'Left Lower Chest' : 'Left Chest') : (y > 24 ? 'Right Lower Chest' : 'Right Chest')
      } else if (partId === 'stomach') {
        const visible = isEllipse(x, y, 21, 19, 13.5, 12.5)
        if (visible) section = isEllipse(x, y, 21, 20, 4.4, 4.4) ? 'Navel (Center)' : y < 19 ? (x < 21 ? 'Upper Left Abdomen' : 'Upper Right Abdomen') : (x < 21 ? 'Lower Left Abdomen' : 'Lower Right Abdomen')
      } else if (partId === 'back') {
        const visible = isEllipse(x, y, 21, 20, 14, 14)
        if (visible) section = y < 20 ? (x < 21 ? 'Right Shoulder Blade' : 'Left Shoulder Blade') : (x < 21 ? 'Lower Right Back' : 'Mid Left Back')
      } else if (partId === 'leftLeg' || partId === 'rightLeg') {
        const visible = (between(x, 15, 27) && between(y, 8, 28)) || isEllipse(x, y, 21, 6, 5.2, 3.8) || isEllipse(x, y, 21, 31, 4.5, 3.5) || (between(x, 15, 27) && between(y, 34, 35))
        if (visible) section = y < 12 ? 'Thigh' : y < 16 ? 'Knee' : y < 27 ? 'Shin' : y < 33 ? 'Ankle' : 'Foot'
      } else {
        const fingers = [
          { section: partId === 'leftHand' ? 'Thumb' : 'Pinky Finger', cx: 6, cy: 13, rx: 2.4, ry: 6.5 },
          { section: partId === 'leftHand' ? 'Index Finger' : 'Ring Finger', cx: 13, cy: 11, rx: 3, ry: 7.4 },
          { section: 'Middle Finger', cx: 21, cy: 10, rx: 3, ry: 8.2 },
          { section: partId === 'leftHand' ? 'Ring Finger' : 'Thumb', cx: 29, cy: 11, rx: 3, ry: 7.4 },
          { section: partId === 'leftHand' ? 'Pinky Finger' : 'Index Finger', cx: 36, cy: 13, rx: 2.5, ry: 6.5 },
        ]
        const finger = fingers.find(item => isEllipse(x, y, item.cx, item.cy, item.rx, item.ry))
        const palm = isEllipse(x, y, 21, 29, 14.5, 7.2)
        if (finger) section = finger.section
        else if (palm) section = 'Palm'
      }

      if (section) dots.push({ id: `${x}-${y}`, x, y, section })
    }
  }

  return dots
}

function buildInitialSelection() {
  return PARTS.reduce((map, part) => ({ ...map, [part.id]: [] }), {})
}

export default function MyPainPathNoiTangPixelPanel() {
  const [partId, setPartId] = useState('head')
  const [selectedByPart, setSelectedByPart] = useState(buildInitialSelection)
  const part = PARTS.find(item => item.id === partId) || PARTS[0]
  const dots = useMemo(() => buildDots(partId), [partId])
  const selectedSections = selectedByPart[partId] || []
  const selectedCount = selectedSections.length

  const toggleSection = (section) => {
    setSelectedByPart(prev => {
      const current = prev[partId] || []
      const next = current.includes(section)
        ? current.filter(item => item !== section)
        : [...current, section]
      return { ...prev, [partId]: next }
    })
  }

  const handlePartChange = (event) => setPartId(event.target.value)

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
            <select value={partId} onChange={handlePartChange} style={styles.select}>
              {PARTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <div style={styles.dotMap} aria-label="Interactive internal pixel pain map">
              {dots.map(dot => {
                const selected = selectedSections.includes(dot.section)
                return (
                  <button
                    key={dot.id}
                    type="button"
                    onClick={() => toggleSection(dot.section)}
                    title={dot.section}
                    aria-label={`${selected ? 'Bỏ chọn' : 'Chọn'} ${dot.section}`}
                    style={{ ...styles.dot, left: `${dot.x * 2.38}%`, top: `${dot.y * 2.45}%`, background: selected ? '#cc623d' : '#77736a' }}
                  />
                )
              })}
            </div>
            <div style={styles.chipsTitle}>{part.label.toUpperCase()} · TAP A SECTION</div>
            <div style={styles.chips}>
              {selectedSections.length === 0 && <span style={styles.emptyHint}>No sections selected</span>}
              {selectedSections.map(section => <button key={section} type="button" onClick={() => toggleSection(section)} style={styles.chip}>{section} <span style={styles.chipX}>×</span></button>)}
            </div>
          </div>
          <div style={styles.infoPane}>
            <div style={styles.meta}><span>PART</span><b>&gt; {part.label.toUpperCase()}</b><span>SELECTED</span><b>&gt; {selectedCount} {selectedCount === 1 ? 'SECTION' : 'SECTIONS'}</b></div>
            <hr style={styles.rule} />
            <h2 style={styles.question}>Show me exactly where</h2>
            <p style={styles.helper}>Pick a body part from the dropdown, then tap the section that's bothering you. Tap an orange section again to remove it.</p>
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
  dotMap: { position: 'relative', height: 520, marginTop: 18 }, dot: { position: 'absolute', width: 9, height: 9, borderRadius: 99, border: 0, transform: 'translate(-50%, -50%)', cursor: 'pointer' },
  chipsTitle: { fontFamily: 'monospace', letterSpacing: '.16em', color: '#9c968d', fontSize: 12, marginBottom: 12 }, chips: { display: 'flex', flexWrap: 'wrap', gap: 9, minHeight: 36 }, chip: { border: 0, borderRadius: 18, background: '#56524b', color: '#f0ece5', padding: '8px 12px', fontSize: 14, cursor: 'pointer' }, chipX: { color: '#d86b45', fontWeight: 900 }, emptyHint: { color: '#837d73', fontSize: 14, fontStyle: 'italic' },
  infoPane: { minHeight: 690, padding: '50px 52px', position: 'relative', background: '#fffdfa' }, meta: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '7px 18px', fontFamily: 'monospace', color: '#948e85', letterSpacing: '.08em' }, rule: { border: 0, borderTop: '1px solid #e4dfd6', margin: '28px 0' },
  question: { fontSize: 30, margin: 0, letterSpacing: '-0.04em' }, helper: { color: '#69645e', fontSize: 17, lineHeight: 1.5 }, continueButton: { position: 'absolute', left: 52, right: 52, bottom: 46, border: 0, borderRadius: 12, background: '#c85d3a', color: '#fff', padding: 18, fontSize: 17, fontWeight: 800 },
}
