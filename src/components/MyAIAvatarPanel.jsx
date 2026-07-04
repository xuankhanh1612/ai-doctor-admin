import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

const OPEN_AVATAR_CHAT_REPO = 'https://github.com/HumanAIGC-Engineering/OpenAvatarChat'
const OPEN_AVATAR_CHAT_WEBUI_REPO = 'https://github.com/HumanAIGC-Engineering/OpenAvatarChat-WebUI'
const DEFAULT_SERVER_URL = 'https://localhost:8282'
const SERVER_STORAGE_KEY = 'ai_doctor_open_avatar_chat_server_url'

function normalizeServerUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '')
  return trimmed || DEFAULT_SERVER_URL
}

function toWebSocketUrl(serverUrl, route = '') {
  const url = new URL(route || '/', `${normalizeServerUrl(serverUrl)}/`)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

function toAbsoluteUrl(serverUrl, path = '') {
  return new URL(path || '/', `${normalizeServerUrl(serverUrl)}/`).toString()
}

function readSavedServerUrl() {
  if (typeof window === 'undefined') return DEFAULT_SERVER_URL
  return normalizeServerUrl(window.localStorage.getItem(SERVER_STORAGE_KEY) || DEFAULT_SERVER_URL)
}

export default function MyAIAvatarPanel() {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const vi = lang === 'vi'
  const socketRef = useRef(null)

  const [serverUrl, setServerUrl] = useState(readSavedServerUrl)
  const [inputServerUrl, setInputServerUrl] = useState(readSavedServerUrl)
  const [initConfig, setInitConfig] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(vi ? 'Chưa kết nối' : 'Not connected')
  const [connectionError, setConnectionError] = useState('')
  const [activeTab, setActiveTab] = useState('webui')
  const [message, setMessage] = useState(vi ? 'Xin chào, hãy giới thiệu avatar AI của tôi.' : 'Hello, please introduce my AI avatar.')
  const [events, setEvents] = useState([])
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileName, setFileName] = useState('')

  const palette = useMemo(() => ({
    text: isDark ? '#e8f0f8' : '#172033',
    text2: isDark ? 'rgba(232,240,248,0.68)' : '#526071',
    text3: isDark ? 'rgba(232,240,248,0.45)' : '#7b8794',
    card: isDark ? 'rgba(255,255,255,0.055)' : '#fff',
    card2: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)',
    accent: '#00e5ff',
    violet: '#9c6fff',
    green: '#00e676',
    danger: '#ff6b6b',
  }), [isDark])

  const webUiUrl = useMemo(() => toAbsoluteUrl(serverUrl, '/ui/index.html'), [serverUrl])
  const managerUrl = useMemo(() => toAbsoluteUrl(serverUrl, '/ui/manager.html'), [serverUrl])
  const initConfigUrl = useMemo(() => toAbsoluteUrl(serverUrl, '/openavatarchat/initconfig'), [serverUrl])
  const avatarRoute = initConfig?.avatar_config?.avatar_ws_route || initConfig?.avatar_config?.ws_session_route || initConfig?.ws_session_route || '/ws/webrtc/avatar'
  const avatarSocketUrl = useMemo(() => toWebSocketUrl(serverUrl, avatarRoute), [serverUrl, avatarRoute])
  const avatarAssetUrl = initConfig?.avatar_config?.avatar_assets_path
    ? toAbsoluteUrl(serverUrl, initConfig.avatar_config.avatar_assets_path)
    : ''

  useEffect(() => () => {
    if (socketRef.current) socketRef.current.close()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const appendEvent = (type, detail) => {
    const time = new Date().toLocaleTimeString()
    setEvents((current) => [{ time, type, detail }, ...current].slice(0, 40))
  }

  const saveServerUrl = () => {
    const next = normalizeServerUrl(inputServerUrl)
    setServerUrl(next)
    window.localStorage.setItem(SERVER_STORAGE_KEY, next)
    setInitConfig(null)
    setConnectionError('')
    appendEvent('server', next)
  }

  const loadInitConfig = async () => {
    setConnectionStatus(vi ? 'Đang đọc initconfig...' : 'Loading initconfig...')
    setConnectionError('')
    try {
      const response = await fetch(initConfigUrl, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setInitConfig(data)
      setConnectionStatus(vi ? 'Đã đọc cấu hình OpenAvatarChat' : 'OpenAvatarChat config loaded')
      appendEvent('initconfig', JSON.stringify(data, null, 2))
      if (data?.detail) setConnectionError(data.detail)
      return data
    } catch (error) {
      const messageText = error?.message || String(error)
      setConnectionStatus(vi ? 'Không đọc được initconfig' : 'Could not load initconfig')
      setConnectionError(messageText)
      appendEvent('error', messageText)
      return null
    }
  }

  const connectAvatarSocket = async () => {
    const data = initConfig || await loadInitConfig()
    const route = data?.avatar_config?.avatar_ws_route || data?.avatar_config?.ws_session_route || data?.ws_session_route || avatarRoute
    const socketUrl = toWebSocketUrl(serverUrl, route)

    if (socketRef.current) socketRef.current.close()
    setConnectionError('')
    setConnectionStatus(vi ? 'Đang mở WebSocket avatar...' : 'Opening avatar WebSocket...')

    try {
      const socket = new WebSocket(socketUrl)
      socketRef.current = socket
      socket.onopen = () => {
        setConnectionStatus(vi ? 'Đã kết nối WebSocket avatar' : 'Avatar WebSocket connected')
        appendEvent('ws:open', socketUrl)
      }
      socket.onmessage = (event) => appendEvent('ws:message', typeof event.data === 'string' ? event.data : '[binary message]')
      socket.onerror = () => {
        setConnectionError(vi ? 'WebSocket lỗi. Kiểm tra SSL/CORS/backend OpenAvatarChat.' : 'WebSocket error. Check SSL/CORS/OpenAvatarChat backend.')
        appendEvent('ws:error', socketUrl)
      }
      socket.onclose = (event) => {
        setConnectionStatus(vi ? `WebSocket đã đóng (${event.code})` : `WebSocket closed (${event.code})`)
        appendEvent('ws:close', `${event.code} ${event.reason || ''}`)
      }
    } catch (error) {
      const messageText = error?.message || String(error)
      setConnectionError(messageText)
      setConnectionStatus(vi ? 'Không mở được WebSocket' : 'Could not open WebSocket')
      appendEvent('error', messageText)
    }
  }

  const sendTextMessage = () => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setConnectionError(vi ? 'WebSocket chưa mở. Bấm “Kết nối Avatar WS” trước.' : 'WebSocket is not open. Click “Connect Avatar WS” first.')
      return
    }

    const payload = {
      type: 'text',
      text: message,
      timestamp: Date.now(),
      source: 'ai-doctor-admin-my-ai-avatar',
    }
    socket.send(JSON.stringify(payload))
    appendEvent('ws:send', JSON.stringify(payload, null, 2))
  }

  const interruptAvatar = () => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    const payload = { type: 'interrupt', timestamp: Date.now(), source: 'ai-doctor-admin-my-ai-avatar' }
    socket.send(JSON.stringify(payload))
    appendEvent('ws:send', JSON.stringify(payload, null, 2))
  }

  const handlePickImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const nextUrl = URL.createObjectURL(file)
    setFileName(file.name)
    setPreviewUrl(nextUrl)
    appendEvent('portrait', `${file.name} · ${Math.round(file.size / 1024)}KB`)
  }

  const installCommands = [
    'git clone https://github.com/HumanAIGC-Engineering/OpenAvatarChat.git',
    'cd OpenAvatarChat',
    'git submodule update --init --recursive --depth 1',
    'uv run install.py --config config/chat_with_lam.yaml',
    'uv run scripts/download_models.py --handler lam',
    'uv run src/demo.py --config config/chat_with_lam.yaml',
  ]

  return (
    <div style={{ padding: 24, color: palette.text, maxWidth: 1440, margin: '0 auto' }}>
      <style>{`
        .oac-card { border:1px solid ${palette.border}; border-radius:22px; background:${palette.card}; box-shadow:${isDark ? '0 20px 70px rgba(0,0,0,.26)' : '0 18px 55px rgba(15,23,42,.08)'}; }
        .oac-btn { border:1px solid ${palette.border}; border-radius:14px; padding:11px 14px; font-weight:900; font-family:inherit; cursor:pointer; }
        .oac-input { border:1px solid ${palette.border}; border-radius:14px; padding:11px 12px; background:${palette.card2}; color:${palette.text}; font-family:inherit; }
        .oac-grid { display:grid; grid-template-columns:minmax(310px, .82fr) minmax(420px, 1.18fr); gap:18px; align-items:start; }
        @media (max-width: 980px) { .oac-grid { grid-template-columns:1fr; } }
      `}</style>

      <section className="oac-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '26px 28px', background: 'radial-gradient(circle at top left, rgba(0,229,255,.24), transparent 34%), linear-gradient(135deg, rgba(156,111,255,.20), rgba(0,229,255,.10))', borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: palette.accent, fontWeight: 900 }}>OpenAvatarChat · LAM · WebRTC/WebSocket</div>
              <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05 }}>My AI Avatar</h1>
              <p style={{ margin: 0, maxWidth: 820, color: palette.text2, lineHeight: 1.65 }}>
                {vi
                  ? 'Tính năng thật kết nối tới backend OpenAvatarChat: đọc /openavatarchat/initconfig, nhúng WebUI chính thức, mở kênh WebSocket avatar và dùng cấu hình LAM để chạy digital human hội thoại.'
                  : 'A real OpenAvatarChat connector: reads /openavatarchat/initconfig, embeds the official WebUI, opens the avatar WebSocket channel, and uses the LAM configuration for conversational digital humans.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a className="oac-btn" href={OPEN_AVATAR_CHAT_REPO} target="_blank" rel="noreferrer" style={{ color: '#001018', background: palette.accent, textDecoration: 'none' }}>OpenAvatarChat ↗</a>
              <a className="oac-btn" href={OPEN_AVATAR_CHAT_WEBUI_REPO} target="_blank" rel="noreferrer" style={{ color: palette.text, background: palette.card, textDecoration: 'none' }}>WebUI source ↗</a>
            </div>
          </div>
        </div>

        <div className="oac-grid" style={{ padding: 18 }}>
          <aside style={{ display: 'grid', gap: 14 }}>
            <div className="oac-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: palette.text3, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>{vi ? 'Backend OpenAvatarChat' : 'OpenAvatarChat backend'}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <input className="oac-input" value={inputServerUrl} onChange={(event) => setInputServerUrl(event.target.value)} placeholder="https://localhost:8282" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button type="button" className="oac-btn" onClick={saveServerUrl} style={{ background: palette.card2, color: palette.text }}>{vi ? 'Lưu URL' : 'Save URL'}</button>
                  <button type="button" className="oac-btn" onClick={loadInitConfig} style={{ background: 'rgba(0,229,255,.14)', color: palette.accent }}>{vi ? 'Kiểm tra API' : 'Check API'}</button>
                </div>
                <button type="button" className="oac-btn" onClick={connectAvatarSocket} style={{ background: 'linear-gradient(135deg, rgba(0,229,255,.22), rgba(156,111,255,.20))', color: palette.text }}>{vi ? 'Kết nối Avatar WS' : 'Connect Avatar WS'}</button>
                <div style={{ color: connectionError ? palette.danger : palette.green, fontSize: 12, fontWeight: 800 }}>{connectionStatus}</div>
                {connectionError && <div style={{ color: palette.danger, fontSize: 12, lineHeight: 1.5 }}>{connectionError}</div>}
              </div>
            </div>

            <div className="oac-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: palette.text3, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>{vi ? 'Avatar cá nhân' : 'Personal avatar'}</div>
              <label style={{ display: 'grid', placeItems: 'center', minHeight: 260, border: `2px dashed ${palette.border}`, borderRadius: 20, background: palette.card2, cursor: 'pointer', overflow: 'hidden' }}>
                {previewUrl ? <img src={previewUrl} alt="Selected portrait preview" style={{ width: '100%', height: 260, objectFit: 'cover' }} /> : (
                  <div style={{ textAlign: 'center', padding: 22 }}>
                    <div style={{ fontSize: 46, marginBottom: 10 }}>🧑‍🚀</div>
                    <div style={{ fontWeight: 900 }}>{vi ? 'Chọn ảnh chân dung' : 'Choose a portrait'}</div>
                    <div style={{ color: palette.text3, fontSize: 12, marginTop: 8 }}>{vi ? 'Dùng để chuẩn bị asset riêng cho OpenAvatarChat/LAM' : 'Use this to prepare a custom OpenAvatarChat/LAM asset'}</div>
                  </div>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePickImage} style={{ display: 'none' }} />
              </label>
              {fileName && <div style={{ marginTop: 10, color: palette.green, fontSize: 12, fontWeight: 800 }}>✓ {fileName}</div>}
            </div>

            <div className="oac-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: palette.text3, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>{vi ? 'Chat điều khiển nhanh' : 'Quick control chat'}</div>
              <textarea className="oac-input" value={message} onChange={(event) => setMessage(event.target.value)} rows={4} style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <button type="button" className="oac-btn" onClick={sendTextMessage} style={{ background: 'rgba(0,230,118,.14)', color: palette.green }}>{vi ? 'Gửi text' : 'Send text'}</button>
                <button type="button" className="oac-btn" onClick={interruptAvatar} style={{ background: 'rgba(255,107,107,.12)', color: palette.danger }}>{vi ? 'Ngắt lời' : 'Interrupt'}</button>
              </div>
            </div>
          </aside>

          <main className="oac-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 6, padding: 12, borderBottom: `1px solid ${palette.border}`, background: palette.card2, flexWrap: 'wrap' }}>
              {[['webui', 'OpenAvatarChat WebUI'], ['manager', 'Manager'], ['config', 'InitConfig'], ['install', vi ? 'Cài đặt' : 'Install'], ['events', 'Events']].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setActiveTab(id)} className="oac-btn" style={{ background: activeTab === id ? 'rgba(0,229,255,.16)' : 'transparent', color: activeTab === id ? palette.accent : palette.text2, padding: '8px 12px' }}>{label}</button>
              ))}
            </div>

            {activeTab === 'webui' && (
              <div>
                <div style={{ padding: '10px 14px', color: palette.text3, fontSize: 12, borderBottom: `1px solid ${palette.border}` }}>{webUiUrl}</div>
                <iframe title="OpenAvatarChat WebUI" src={webUiUrl} style={{ width: '100%', height: 720, border: 0, background: '#fff' }} />
              </div>
            )}

            {activeTab === 'manager' && (
              <div>
                <div style={{ padding: '10px 14px', color: palette.text3, fontSize: 12, borderBottom: `1px solid ${palette.border}` }}>{managerUrl}</div>
                <iframe title="OpenAvatarChat Manager" src={managerUrl} style={{ width: '100%', height: 720, border: 0, background: '#fff' }} />
              </div>
            )}

            {activeTab === 'config' && (
              <div style={{ padding: 18, display: 'grid', gap: 12 }}>
                <InfoRow label="InitConfig API" value={initConfigUrl} palette={palette} />
                <InfoRow label="Chat mode" value={initConfig?.chat_mode || '—'} palette={palette} />
                <InfoRow label="Avatar type" value={initConfig?.avatar_config?.avatar_type || '—'} palette={palette} />
                <InfoRow label="Avatar WS" value={avatarSocketUrl} palette={palette} />
                <InfoRow label="Avatar assets" value={avatarAssetUrl || '—'} palette={palette} />
                <pre style={{ margin: 0, maxHeight: 420, overflow: 'auto', padding: 14, borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card2, color: palette.text, fontSize: 12 }}>{JSON.stringify(initConfig || { hint: vi ? 'Bấm “Kiểm tra API” để tải cấu hình từ OpenAvatarChat.' : 'Click “Check API” to load config from OpenAvatarChat.' }, null, 2)}</pre>
              </div>
            )}

            {activeTab === 'install' && (
              <div style={{ padding: 18, color: palette.text2, lineHeight: 1.7 }}>
                <h2 style={{ color: palette.text, marginTop: 0 }}>{vi ? 'Chạy OpenAvatarChat bằng cấu hình LAM' : 'Run OpenAvatarChat with LAM config'}</h2>
                <p>{vi ? 'Panel này là frontend connector. Để tính năng hoạt động đầy đủ, chạy backend OpenAvatarChat ở URL đã cấu hình rồi mở tab WebUI.' : 'This panel is a frontend connector. To make it fully functional, run the OpenAvatarChat backend at the configured URL and open the WebUI tab.'}</p>
                <pre style={{ margin: 0, padding: 14, borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card2, color: palette.text, whiteSpace: 'pre-wrap' }}>{installCommands.join('\n')}</pre>
              </div>
            )}

            {activeTab === 'events' && (
              <div style={{ padding: 18, display: 'grid', gap: 10, maxHeight: 720, overflow: 'auto' }}>
                {events.length === 0 && <div style={{ color: palette.text3 }}>{vi ? 'Chưa có event.' : 'No events yet.'}</div>}
                {events.map((event, index) => (
                  <div key={`${event.time}-${index}`} style={{ border: `1px solid ${palette.border}`, borderRadius: 14, padding: 12, background: palette.card2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: palette.text3, fontSize: 11, marginBottom: 6 }}><b>{event.type}</b><span>{event.time}</span></div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: palette.text2, fontSize: 12 }}>{event.detail}</pre>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  )
}

function InfoRow({ label, value, palette }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'center', border: `1px solid ${palette.border}`, borderRadius: 14, padding: '10px 12px', background: palette.card2 }}>
      <div style={{ color: palette.text3, fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: palette.text, fontSize: 12, wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}
