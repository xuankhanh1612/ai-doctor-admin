import React from 'react'

function uuidHash(value = '') {
  return String(value || 'guest').split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) >>> 0, 2166136261)
}

function uuidPalette(uuid) {
  const hash = uuidHash(uuid)
  return {
    hueA: hash % 360,
    hueB: (hash >>> 8) % 360,
    hueC: (hash >>> 16) % 360,
    seed: hash.toString(16).padStart(8, '0').slice(0, 8).toUpperCase(),
  }
}

export default function UserUuid3DAvatar({ uuid, isDark, vi, accent = '#00b8cc', label, height = 154, minWidth = 138 }) {
  const { hueA, hueB, hueC, seed } = uuidPalette(uuid)
  const shortUuid = uuid ? `${String(uuid).slice(0, 8)}…${String(uuid).slice(-4)}` : 'guest-avatar'

  return (
    <div
      aria-label={vi ? `Avatar 3D tương ứng UUID ${uuid || 'guest'}` : `3D avatar for UUID ${uuid || 'guest'}`}
      style={{
        flex: `1 1 ${minWidth}px`, minWidth, height, borderRadius: 22, position: 'relative', overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)'}`,
        background: `radial-gradient(circle at 30% 20%, hsla(${hueA}, 95%, 68%, .40), transparent 36%), radial-gradient(circle at 78% 30%, hsla(${hueB}, 90%, 62%, .32), transparent 34%), linear-gradient(145deg, ${isDark ? '#07111f' : '#f8fbff'}, ${isDark ? '#111827' : '#eef6ff'})`,
        boxShadow: isDark ? '0 18px 45px rgba(0,0,0,0.34)' : '0 18px 45px rgba(31,41,55,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 700,
      }}
    >
      <style>{`@keyframes profile-uuid-avatar-float { 0%, 100% { transform: rotateY(-18deg) translateY(0); } 50% { transform: rotateY(18deg) translateY(-8px); } }`}</style>
      <div style={{ position: 'absolute', inset: 10, borderRadius: 18, border: `1px solid hsla(${hueA}, 95%, 68%, .28)`, opacity: 0.9 }} />
      <div style={{ position: 'relative', width: 74, height: 96, transformStyle: 'preserve-3d', animation: 'profile-uuid-avatar-float 4.8s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', left: 10, top: 2, width: 54, height: 54, borderRadius: '50%', background: `linear-gradient(135deg, hsl(${hueA},88%,62%), hsl(${hueB},86%,56%))`, boxShadow: `0 0 34px hsla(${hueA}, 92%, 62%, .48)`, transform: 'translateZ(32px)' }} />
        <div style={{ position: 'absolute', left: 20, top: 18, width: 10, height: 10, borderRadius: '50%', background: '#fff', boxShadow: '24px 0 0 #fff', transform: 'translateZ(38px)' }} />
        <div style={{ position: 'absolute', left: 6, top: 56, width: 62, height: 38, borderRadius: '28px 28px 18px 18px', background: `linear-gradient(135deg, hsl(${hueC},84%,54%), hsl(${hueA},82%,58%))`, boxShadow: `0 18px 32px hsla(${hueC}, 85%, 50%, .28)`, transform: 'rotateX(-10deg) translateZ(22px)' }} />
        <div style={{ position: 'absolute', left: -6, top: 62, width: 20, height: 44, borderRadius: 999, background: `hsl(${hueB},82%,58%)`, transform: 'rotateZ(16deg) translateZ(14px)' }} />
        <div style={{ position: 'absolute', right: -6, top: 62, width: 20, height: 44, borderRadius: 999, background: `hsl(${hueB},82%,58%)`, transform: 'rotateZ(-16deg) translateZ(14px)' }} />
      </div>
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: isDark ? '#dbeafe' : '#1f2937', fontSize: 10, fontWeight: 900 }}>{label || (vi ? 'Avatar 3D' : '3D Avatar')}</span>
        <code style={{ color: accent, fontSize: 9, fontFamily: 'monospace', fontWeight: 900 }}>{shortUuid}</code>
      </div>
      <div style={{ position: 'absolute', top: 10, right: 12, color: `hsl(${hueA},90%,64%)`, fontSize: 9, fontFamily: 'monospace', fontWeight: 900 }}>#{seed}</div>
    </div>
  )
}
