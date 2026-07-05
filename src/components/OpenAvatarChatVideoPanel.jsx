import React, { useState } from 'react'
import { Video, ExternalLink, PlayCircle, RotateCcw, Maximize2, AlertTriangle } from 'lucide-react'

// This panel does NOT reimplement avatar rendering. OpenAvatarChat itself ships a
// complete web frontend (served by the same process as the WebSocket API) that already
// speaks WebRTC (RtcClient) and draws the animated face — LiteAvatar's 2D video frames,
// or LAM's 3D Gaussian-splat canvas depending on which avatar handler the backend config
// uses. The custom WsClient-based panel elsewhere in this file deliberately does not
// decode that video/motion stream (see src/services/openAvatarChatClient.js), so the
// only faithful way to show the real moving face without vendoring OpenAvatarChat's own
// WebGL/canvas renderer is to load that frontend directly, here, in an iframe.
export default function OpenAvatarChatVideoPanel({ isDark, vi, border, surface, text, text2, text3 }) {
  const [url, setUrl] = useState('')
  const [openedUrl, setOpenedUrl] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const isValidHttpsUrl = (value) => {
    try {
      const u = new URL(value)
      return u.protocol === 'https:'
    } catch {
      return false
    }
  }

  const canOpen = isValidHttpsUrl(url.trim())

  const handleOpen = () => {
    if (!canOpen) return
    setLoaded(false)
    setOpenedUrl(url.trim())
  }

  const handleReload = () => {
    setLoaded(false)
    setReloadKey((k) => k + 1)
  }

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: text }}>
          <Video size={15} /> {vi ? 'Video avatar thật (khuôn mặt chuyển động)' : 'Real avatar video (moving face)'}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: isDark ? 'rgba(0,230,118,0.15)' : 'rgba(0,230,118,0.1)', color: '#00c46a',
        }}>WebRTC</span>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: text2, lineHeight: 1.55 }}>
        {vi
          ? 'Đây là giao diện web GỐC của OpenAvatarChat — cùng tiến trình phục vụ WebSocket API bên dưới cũng phục vụ luôn trang này qua WebRTC, và trang này mới thật sự vẽ khuôn mặt avatar (LiteAvatar/LAM) từ dữ liệu biểu cảm. Dán URL HTTPS công khai của server (ví dụ URL Cloudflare Tunnel từ notebook Colab, chạy ở chế độ "native_video") vào ô bên dưới.'
          : 'This is OpenAvatarChat\'s own web frontend — the same process serving the WebSocket API below also serves this page over WebRTC, and this page is what actually draws the avatar\'s face (LiteAvatar/LAM) from the expression data. Paste your server\'s public HTTPS URL (e.g. the Cloudflare Tunnel URL from the Colab notebook running in "native_video" mode) below.'}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://xxxx.trycloudflare.com"
          style={{
            flex: '1 1 220px', minWidth: 180, padding: '8px 10px', borderRadius: 8, fontSize: 12.5,
            border: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', color: text,
            fontFamily: 'ui-monospace, monospace',
          }}
        />
        <button
          onClick={handleOpen}
          disabled={!canOpen}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8,
            fontSize: 12.5, fontWeight: 600, cursor: canOpen ? 'pointer' : 'default',
            border: '1px solid transparent', background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)',
            color: '#fff', opacity: canOpen ? 1 : 0.5,
          }}
        >
          <PlayCircle size={14} /> {vi ? 'Mở avatar' : 'Open avatar'}
        </button>
        {openedUrl && (
          <>
            <button onClick={handleReload} title={vi ? 'Tải lại' : 'Reload'} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderRadius: 8,
              fontSize: 12.5, cursor: 'pointer', border: `1px solid ${border}`, background: 'transparent', color: text2,
            }}>
              <RotateCcw size={14} />
            </button>
            <a href={openedUrl} target="_blank" rel="noopener noreferrer" title={vi ? 'Mở toàn màn hình trong tab mới' : 'Open fullscreen in a new tab'} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderRadius: 8,
              fontSize: 12.5, cursor: 'pointer', border: `1px solid ${border}`, background: 'transparent', color: text2, textDecoration: 'none',
            }}>
              <Maximize2 size={14} />
            </a>
          </>
        )}
      </div>

      {url.trim() && !canOpen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#f4b942', marginBottom: 10 }}>
          <AlertTriangle size={13} />
          {vi ? 'Cần URL https:// hợp lệ (WebRTC yêu cầu HTTPS để xin quyền camera/micro).' : 'Needs a valid https:// URL (WebRTC requires HTTPS for camera/mic permission).'}
        </div>
      )}

      <div style={{
        position: 'relative', width: '100%', height: 640, borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${border}`, background: isDark ? '#05070f' : '#f4f6fa',
      }}>
        {!openedUrl && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8, color: text3, fontSize: 12.5, padding: 20, textAlign: 'center',
          }}>
            <Video size={22} />
            {vi
              ? 'Dán URL server (https://) rồi bấm "Mở avatar" để bắt đầu.'
              : 'Paste your server URL (https://) then click "Open avatar" to start.'}
          </div>
        )}
        {openedUrl && !loaded && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8, color: text3, fontSize: 12.5,
          }}>
            <Video size={20} className="spin" />
            {vi ? 'Đang tải giao diện avatar...' : 'Loading avatar frontend...'}
          </div>
        )}
        {openedUrl && (
          <iframe
            key={reloadKey}
            title="OpenAvatarChat native UI"
            src={openedUrl}
            onLoad={() => setLoaded(true)}
            style={{ width: '100%', height: '100%', border: 'none', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
            allow="camera; microphone; autoplay; fullscreen; display-capture"
          />
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11.5, color: text3, lineHeight: 1.6 }}>
        {vi
          ? <>Nếu trình duyệt chặn quyền camera/micro trong khung nhúng (một số trình duyệt hạn chế quyền này với iframe khác domain), dùng nút <Maximize2 size={11} style={{ display: 'inline', verticalAlign: -1 }} /> để mở thẳng trang gốc trong tab mới. Muốn xuyên NAT ổn định (khi bạn và server không cùng mạng), server cần cấu hình TURN — notebook Colab đính kèm đã có sẵn ô để điền TURN/Twilio.</>
          : <>If the browser blocks camera/mic permission inside the embedded frame (some browsers restrict this for cross-domain iframes), use the <Maximize2 size={11} style={{ display: 'inline', verticalAlign: -1 }} /> button to open the original page in a new tab instead. For reliable NAT traversal (when you and the server aren't on the same network), the server needs a TURN server — the bundled Colab notebook has fields for TURN/Twilio.</>}
      </div>
    </div>
  )
}
