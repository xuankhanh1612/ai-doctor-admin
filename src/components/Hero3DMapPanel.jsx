import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'

const HERO_ZONES = [
  { id: 'gate', icon: '🛡️', title: 'Cổng Bảo Vệ', subtitle: 'Kích hoạt lá chắn miễn dịch', x: 15, y: 55, z: 18, color: '#38bdf8' },
  { id: 'heart', icon: '❤️', title: 'Trạm Tim Mạch', subtitle: 'Theo dõi nhịp tim & tuần hoàn', x: 34, y: 30, z: 58, color: '#fb7185' },
  { id: 'brain', icon: '🧠', title: 'Tháp Não Bộ', subtitle: 'Sức khỏe tinh thần & giấc ngủ', x: 52, y: 18, z: 82, color: '#a78bfa' },
  { id: 'lung', icon: '🫁', title: 'Vịnh Hô Hấp', subtitle: 'Hơi thở, vận động, phục hồi', x: 70, y: 42, z: 48, color: '#22d3ee' },
  { id: 'nutrition', icon: '🥗', title: 'Rừng Dinh Dưỡng', subtitle: 'Nhiệm vụ ăn uống lành mạnh', x: 60, y: 70, z: 34, color: '#34d399' },
  { id: 'reward', icon: '🏆', title: 'Đỉnh Anh Hùng', subtitle: 'Nhận thưởng khi hoàn thành hành trình', x: 82, y: 22, z: 96, color: '#facc15' },
]

export default function Hero3DMapPanel({ onNext, nextLabel }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const [selected, setSelected] = useState(HERO_ZONES[0])
  const [tilt, setTilt] = useState({ x: 58, y: -18 })

  const paths = useMemo(() => HERO_ZONES.slice(0, -1).map((zone, index) => ({ from: zone, to: HERO_ZONES[index + 1] })), [])

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: 58 - py * 10, y: -18 + px * 14 })
  }

  return (
    <section style={{ minHeight: '100%', padding: '28px clamp(16px, 4vw, 44px)', color: isDark ? '#e8f0f8' : '#122033', background: isDark ? 'radial-gradient(circle at 20% 10%, rgba(14,165,233,0.22), transparent 34%), #050816' : 'linear-gradient(135deg, #eff6ff, #ecfdf5)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)', gap: 24, alignItems: 'stretch' }}>
          <div>
            <p style={{ margin: 0, color: '#06b6d4', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: 12 }}>3D Map for Hero</p>
            <h1 style={{ margin: '10px 0 12px', fontSize: 'clamp(30px, 5vw, 58px)', lineHeight: 1, fontWeight: 900 }}>Bản đồ 3D hành trình anh hùng sức khỏe</h1>
            <p style={{ margin: 0, maxWidth: 760, color: isDark ? 'rgba(232,240,248,0.72)' : '#475569', fontSize: 16, lineHeight: 1.7 }}>
              Khám phá các trạm nhiệm vụ theo phong cách game 3D: bảo vệ cơ thể, tim mạch, não bộ, hô hấp, dinh dưỡng và phần thưởng anh hùng.
            </p>
          </div>
          <div style={{ border: '1px solid rgba(6,182,212,0.25)', borderRadius: 24, padding: 18, background: isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.78)', boxShadow: '0 24px 70px rgba(15,23,42,0.18)' }}>
            <div style={{ fontSize: 42 }}>{selected.icon}</div>
            <h2 style={{ margin: '8px 0 6px', fontSize: 24 }}>{selected.title}</h2>
            <p style={{ margin: 0, color: isDark ? 'rgba(232,240,248,0.68)' : '#64748b', lineHeight: 1.6 }}>{selected.subtitle}</p>
            <button type="button" onClick={onNext} style={{ marginTop: 18, width: '100%', border: 0, borderRadius: 14, padding: '12px 16px', cursor: 'pointer', color: '#042f2e', fontWeight: 800, background: 'linear-gradient(135deg, #67e8f9, #86efac)' }}>
              Tiếp tục: {nextLabel || 'Hành trình kế tiếp'} →
            </button>
          </div>
        </div>

        <div onPointerMove={handlePointerMove} onPointerLeave={() => setTilt({ x: 58, y: -18 })} style={{ marginTop: 28, minHeight: 560, perspective: 1100, borderRadius: 34, overflow: 'hidden', position: 'relative', background: isDark ? 'linear-gradient(180deg, rgba(15,23,42,0.9), rgba(2,6,23,0.96))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(219,234,254,0.82))', border: '1px solid rgba(6,182,212,0.22)', boxShadow: 'inset 0 0 90px rgba(14,165,233,0.16)' }}>
          <div style={{ position: 'absolute', inset: '12% 8%', transformStyle: 'preserve-3d', transform: `rotateX(${tilt.x}deg) rotateZ(${tilt.y}deg)`, transition: 'transform 180ms ease-out' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.2), rgba(16,185,129,0.1) 44%, rgba(14,165,233,0.03) 70%)', border: '2px solid rgba(34,211,238,0.25)', transform: 'translateZ(-18px)' }} />
            {paths.map(path => <MapPath key={`${path.from.id}-${path.to.id}`} {...path} />)}
            {HERO_ZONES.map(zone => (
              <button key={zone.id} type="button" onClick={() => setSelected(zone)} aria-label={zone.title} style={{ position: 'absolute', left: `${zone.x}%`, top: `${zone.y}%`, transform: `translate(-50%, -50%) translateZ(${zone.z}px)`, width: 94, height: 94, borderRadius: 24, border: selected.id === zone.id ? `3px solid ${zone.color}` : '1px solid rgba(255,255,255,0.35)', background: `linear-gradient(145deg, ${zone.color}33, rgba(15,23,42,0.84))`, color: '#fff', boxShadow: `0 18px 45px ${zone.color}55`, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 34 }}>
                <span style={{ transform: `rotateZ(${-tilt.y}deg) rotateX(${-tilt.x}deg)` }}>{zone.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MapPath({ from, to }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  return (
    <div style={{ position: 'absolute', left: `${from.x}%`, top: `${from.y}%`, width: `${length}%`, height: 4, transformOrigin: '0 50%', transform: `rotate(${angle}deg) translateZ(8px)`, background: 'linear-gradient(90deg, rgba(34,211,238,0.85), rgba(250,204,21,0.7))', borderRadius: 999, boxShadow: '0 0 18px rgba(34,211,238,0.65)' }} />
  )
}
