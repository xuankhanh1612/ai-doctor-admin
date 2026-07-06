import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

const CULTS_API_URL = 'https://cults3d.com/en/api'
const CULTS_GRAPHQL_URL = 'https://cults3d.com/graphql'
const CULTS_GRAPHIQL_URL = 'https://cults3d.com/en/graphql'
const SAMPLE_MODEL_URL = 'https://cults3d.com/en/3d-printing/commando-witch'
const CULTS_NEW_CREATION_URL = 'https://cults3d.com/en/creations/new'

const DEFAULT_QUERY = `query SearchDesigns($query: String!) {
  designs(q: $query, first: 6) {
    nodes {
      name
      url
      description
      illustrationImageUrl
      tags
    }
  }
}`

function makePublishUrl(fileUrl, origin = 'ai-doctor-admin') {
  const params = new URLSearchParams()
  if (fileUrl.trim()) params.set('file_url', fileUrl.trim())
  params.set('origin', origin.trim() || 'ai-doctor-admin')
  return `${CULTS_NEW_CREATION_URL}?${params.toString()}`
}

export default function Make3DModelPanel() {
  const { theme } = useApp()
  const isDark = theme === 'dark'
  const [fileUrl, setFileUrl] = useState('')
  const [origin, setOrigin] = useState('ai-doctor-admin')
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [queryText, setQueryText] = useState(DEFAULT_QUERY)
  const [variablesText, setVariablesText] = useState(JSON.stringify({ query: 'commando witch' }, null, 2))
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('Sẵn sàng: nhập Cults username + API key nếu muốn thử GraphQL API trực tiếp.')
  const [busy, setBusy] = useState(false)

  const palette = useMemo(() => ({
    bg: isDark ? '#050711' : '#f5f7fb',
    card: isDark ? 'rgba(13,20,38,0.94)' : '#ffffff',
    card2: isDark ? 'rgba(20,31,55,0.88)' : '#eef5ff',
    border: isDark ? 'rgba(96,165,250,0.22)' : 'rgba(37,99,235,0.14)',
    text: isDark ? '#e8f1ff' : '#172033',
    text2: isDark ? '#9fb0c8' : '#5e6a7d',
    cyan: '#22d3ee',
    violet: '#a78bfa',
    green: '#34d399',
    amber: '#fbbf24',
    red: '#fb7185',
  }), [isDark])

  const publishUrl = makePublishUrl(fileUrl, origin)

  const runQuery = async () => {
    if (!username.trim() || !apiKey.trim()) {
      setStatus('Vui lòng nhập Cults username và API key trước khi gọi API.')
      return
    }

    let variables
    try {
      variables = variablesText.trim() ? JSON.parse(variablesText) : {}
    } catch (error) {
      setStatus(`Variables JSON không hợp lệ: ${error?.message || error}`)
      return
    }

    setBusy(true)
    setStatus('Đang gọi Cults GraphQL API...')
    setResult(null)
    try {
      const response = await fetch(CULTS_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${username}:${apiKey}`)}`,
        },
        body: JSON.stringify({ query: queryText, variables }),
      })
      const data = await response.json().catch(() => ({}))
      setResult({ ok: response.ok, status: response.status, data })
      setStatus(response.ok ? 'Đã nhận phản hồi từ Cults API.' : `Cults API trả HTTP ${response.status}. Kiểm tra credential, schema hoặc CORS.`)
    } catch (error) {
      setStatus(`Không gọi được Cults API từ trình duyệt: ${error?.message || error}. Hãy dùng GraphiQL chính thức nếu bị CORS.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100%', background: palette.bg, color: palette.text, padding: '28px clamp(16px, 4vw, 42px)' }}>
      <div style={{ maxWidth: 1220, margin: '0 auto' }}>
        <section style={{ border: `1px solid ${palette.border}`, background: `radial-gradient(circle at 15% 10%, rgba(34,211,238,.24), transparent 32%), radial-gradient(circle at 88% 18%, rgba(167,139,250,.22), transparent 30%), ${palette.card}`, borderRadius: 30, padding: '28px clamp(18px, 4vw, 38px)', boxShadow: isDark ? '0 28px 90px rgba(0,0,0,.42)' : '0 24px 70px rgba(37,99,235,.10)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ color: palette.cyan, fontSize: 12, fontWeight: 950, letterSpacing: '.16em', textTransform: 'uppercase' }}>Make 3D Model · Cults API</div>
              <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(30px, 4vw, 52px)', lineHeight: 1.02 }}>Make 3D Model</h1>
              <p style={{ margin: 0, color: palette.text2, fontSize: 15, lineHeight: 1.7 }}>
                Trang này nằm ngay dưới <strong>Tạo Avatar</strong>, giúp mở mẫu <strong>Commando Witch</strong>, tạo link “publish to Cults” cho file STL/OBJ/GLB của bạn và thử truy vấn GraphQL API bằng API key riêng.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 10, minWidth: 230 }}>
              <a href={SAMPLE_MODEL_URL} target="_blank" rel="noreferrer" style={linkButton(palette.violet, '#12071f')}>Mở Commando Witch ↗</a>
              <a href={CULTS_API_URL} target="_blank" rel="noreferrer" style={linkButton(palette.cyan, '#031018')}>Cults API docs ↗</a>
              <a href={CULTS_GRAPHIQL_URL} target="_blank" rel="noreferrer" style={linkButton(palette.green, '#03140b')}>GraphiQL Explorer ↗</a>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 390px), 1fr))', gap: 18, marginTop: 18 }}>
          <section style={cardStyle(palette)}>
            <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>🚀 Publish to Cults</h2>
            <p style={{ color: palette.text2, lineHeight: 1.7, marginTop: 0 }}>Cults hỗ trợ tạo link upload sẵn <code>file_url</code> để người dùng bấm một lần rồi hoàn tất thông tin model trên Cults.</p>
            <label style={labelStyle(palette)}>URL file 3D công khai (.stl/.obj/.glb/.zip)</label>
            <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://example.com/model.stl" style={inputStyle(palette)} />
            <label style={labelStyle(palette)}>Origin / tên website</label>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} style={inputStyle(palette)} />
            <label style={labelStyle(palette)}>Link publish tạo sẵn</label>
            <textarea readOnly value={publishUrl} rows={3} style={{ ...inputStyle(palette), resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
            <a href={publishUrl} target="_blank" rel="noreferrer" style={{ ...linkButton(palette.amber, '#211300'), marginTop: 12 }}>➕ Add a 3D model on Cults ↗</a>
          </section>

          <section style={cardStyle(palette)}>
            <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>🔐 Cults GraphQL API</h2>
            <p style={{ color: palette.text2, lineHeight: 1.7, marginTop: 0 }}>API không trả file 3D của người khác; nó trả metadata như ảnh, title, mô tả, tags và URL redirect sang Cults.</p>
            <label style={labelStyle(palette)}>Cults username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" style={inputStyle(palette)} />
            <label style={labelStyle(palette)}>API key / password từ Cults settings</label>
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" autoComplete="current-password" placeholder="Không lưu trong app" style={inputStyle(palette)} />
            <label style={labelStyle(palette)}>GraphQL query</label>
            <textarea value={queryText} onChange={(e) => setQueryText(e.target.value)} rows={9} style={{ ...inputStyle(palette), resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
            <label style={labelStyle(palette)}>Variables JSON</label>
            <textarea value={variablesText} onChange={(e) => setVariablesText(e.target.value)} rows={4} style={{ ...inputStyle(palette), resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
            <button type="button" onClick={runQuery} disabled={busy} style={actionButton(palette, busy, palette.cyan, '#031018')}>{busy ? 'Đang gọi...' : '▶ Run Cults API'}</button>
            <p style={{ color: status.startsWith('Không') || status.includes('không') || status.includes('Vui lòng') ? palette.red : palette.text2, fontSize: 12, lineHeight: 1.6 }}>{status}</p>
          </section>
        </div>

        <section style={{ ...cardStyle(palette), marginTop: 18 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>📦 API response</h2>
          <pre style={{ margin: 0, maxHeight: 420, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: palette.text, background: palette.card2, border: `1px solid ${palette.border}`, borderRadius: 16, padding: 14, fontSize: 12 }}>{result ? JSON.stringify(result, null, 2) : 'Chưa có dữ liệu. Có thể dùng GraphiQL Explorer chính thức nếu browser chặn CORS.'}</pre>
        </section>
      </div>
    </div>
  )
}

function cardStyle(palette) {
  return { border: `1px solid ${palette.border}`, background: palette.card, borderRadius: 24, padding: 20, boxShadow: '0 18px 50px rgba(2,6,23,.08)' }
}

function labelStyle(palette) {
  return { display: 'block', margin: '14px 0 6px', color: palette.text2, fontSize: 12, fontWeight: 850 }
}

function inputStyle(palette) {
  return { width: '100%', boxSizing: 'border-box', border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.card2, color: palette.text, padding: '11px 12px', outline: 'none' }
}

function linkButton(color, textColor) {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', borderRadius: 14, padding: '11px 14px', background: color, color: textColor, fontWeight: 950, textDecoration: 'none', cursor: 'pointer' }
}

function actionButton(palette, disabled, color, textColor) {
  return { width: '100%', border: 'none', borderRadius: 14, padding: '12px 14px', background: disabled ? palette.border : color, color: disabled ? palette.text2 : textColor, fontWeight: 950, cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 14 }
}
