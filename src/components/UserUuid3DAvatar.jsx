import React, { useState } from 'react'

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

// Avatar UUID này KHÔNG phải file model 3D thật (glb/obj/fbx) — nó là hình
// dựng bằng CSS transform (perspective/translateZ) ngay trong DOM. Vì vậy
// "download" ở đây nghĩa là rasterize lại đúng hình dạng/màu sắc (đầu tròn,
// 2 mắt, thân, 2 tai) thành ảnh PNG thật — dựng bằng SVG (cùng công thức
// hueA/hueB/hueC/seed từ uuidPalette ở trên) rồi vẽ lên <canvas> để xuất
// file, không cần thêm thư viện chụp DOM nào.
function buildUuidAvatarSVG({ uuid, isDark, accent = '#00b8cc', label, size = 512 }) {
  const { hueA, hueB, hueC, seed } = uuidPalette(uuid)
  const shortUuid = uuid ? `${String(uuid).slice(0, 8)}…${String(uuid).slice(-4)}` : 'guest-avatar'
  const bg1 = isDark ? '#07111f' : '#f8fbff'
  const bg2 = isDark ? '#111827' : '#eef6ff'
  const textColor = isDark ? '#dbeafe' : '#1f2937'
  const safeLabel = String(label || '3D Avatar').replace(/[<>&]/g, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400">
    <defs>
      <radialGradient id="g1" cx="30%" cy="20%" r="45%"><stop offset="0%" stop-color="hsla(${hueA},95%,68%,0.5)"/><stop offset="100%" stop-color="hsla(${hueA},95%,68%,0)"/></radialGradient>
      <radialGradient id="g2" cx="78%" cy="30%" r="45%"><stop offset="0%" stop-color="hsla(${hueB},90%,62%,0.42)"/><stop offset="100%" stop-color="hsla(${hueB},90%,62%,0)"/></radialGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient>
      <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="hsl(${hueA},88%,62%)"/><stop offset="100%" stop-color="hsl(${hueB},86%,56%)"/></linearGradient>
      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="hsl(${hueC},84%,54%)"/><stop offset="100%" stop-color="hsl(${hueA},82%,58%)"/></linearGradient>
    </defs>
    <rect width="400" height="400" rx="56" fill="url(#bgGrad)"/>
    <rect width="400" height="400" rx="56" fill="url(#g1)"/>
    <rect width="400" height="400" rx="56" fill="url(#g2)"/>
    <rect x="26" y="26" width="348" height="348" rx="44" fill="none" stroke="hsla(${hueA},95%,68%,0.35)" stroke-width="2"/>
    <rect x="118" y="230" width="60" height="120" rx="30" fill="hsl(${hueB},82%,58%)" transform="rotate(16 148 290)"/>
    <rect x="222" y="230" width="60" height="120" rx="30" fill="hsl(${hueB},82%,58%)" transform="rotate(-16 252 290)"/>
    <rect x="90" y="210" width="220" height="130" rx="60" fill="url(#bodyGrad)"/>
    <circle cx="200" cy="150" r="92" fill="url(#headGrad)"/>
    <circle cx="176" cy="150" r="14" fill="#fff"/>
    <circle cx="224" cy="150" r="14" fill="#fff"/>
    <text x="34" y="378" font-family="monospace" font-size="18" font-weight="900" fill="${textColor}">${safeLabel}</text>
    <text x="366" y="378" font-family="monospace" font-size="16" font-weight="900" fill="${accent}" text-anchor="end">${shortUuid}</text>
    <text x="366" y="46" font-family="monospace" font-size="14" font-weight="900" fill="hsl(${hueA},90%,64%)" text-anchor="end">#${seed}</text>
  </svg>`
}

// SVG -> <canvas> -> PNG thật (không phải chỉ export SVG text), để file tải
// về mở được trực tiếp bằng bất kỳ trình xem ảnh nào.
async function downloadUuidAvatarPNG({ uuid, isDark, accent, label }) {
  const svg = buildUuidAvatarSVG({ uuid, isDark, accent, label, size: 512 })
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = svgUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, 512, 512)
    const pngUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = `uuid-3d-avatar-${String(uuid || 'guest').slice(0, 8)}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    return true
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

// Nút Download đặt ngay dưới UserUuid3DAvatar (avatar 3D thứ 2 ở màn Profile).
export function UuidAvatar3DDownloadButton({ uuid, isDark, vi, accent = '#00b8cc', label }) {
  const [state, setState] = useState('idle') // 'idle' | 'downloading' | 'done' | 'error'

  const handleDownload = async () => {
    setState('downloading')
    try {
      await downloadUuidAvatarPNG({ uuid, isDark, accent, label })
      setState('done')
    } catch (err) {
      console.warn('Download UUID 3D avatar failed', err)
      setState('error')
    }
    setTimeout(() => setState('idle'), 2200)
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={state === 'downloading'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800,
        border: `1px solid ${accent}66`, background: `${accent}1f`, color: accent,
        cursor: state === 'downloading' ? 'wait' : 'pointer', opacity: state === 'downloading' ? 0.7 : 1, width: '100%',
      }}
    >
      {state === 'downloading' && (vi ? '⏳ Đang tải...' : '⏳ Downloading...')}
      {state === 'done' && (vi ? '✅ Đã tải xong (.png)' : '✅ Downloaded (.png)')}
      {state === 'error' && (vi ? '⚠️ Lỗi, thử lại' : '⚠️ Failed, try again')}
      {state === 'idle' && (<>⬇️ {vi ? 'Tải avatar 3D (.png)' : 'Download 3D avatar (.png)'}</>)}
    </button>
  )
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
