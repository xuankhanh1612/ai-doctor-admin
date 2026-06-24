import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext'

// ─── PixelRAG API ────────────────────────────────────────────────────────────
const PIXELRAG_BASE  = 'https://api.pixelrag.ai'  // search endpoint
const PIXELRAG_TILES = 'https://pixelrag.ai/api'   // tile image endpoint

// ─── Groq config ─────────────────────────────────────────────────────────────
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ─── Language config ──────────────────────────────────────────────────────────
// Wikipedia language prefix and query language based on UI language
const WIKI_LANG_CONFIG = {
  vi: {
    wikiBase: 'https://vi.wikipedia.org',
    searchPlaceholder: 'Tìm Wikipedia theo hình ảnh… vd: giải phẫu tim, nhân đôi ADN',
    quickQueries: ['giải phẫu tim', 'nhân đôi ADN', 'não người', 'phân bào nguyên phân', 'tuần hoàn máu', 'thiếu vitamin'],
    quickPrompts: ['Tim hoạt động như thế nào?', 'Giải thích nguyên phân', 'Nguyên nhân thiếu máu?', 'ADN và ARN', 'Giải thích nhóm máu'],
    agentGreeting: 'Xin chào! Tôi là **Wiki Med Vision Agent** — kết hợp PixelRAG + AI.\n\nTôi có thể tìm kiếm hơn 8.28 triệu bài viết Wikipedia bằng hình ảnh và trả lời câu hỏi y tế với bằng chứng trực quan.\n\nHãy thử hỏi: *"Tim bơm máu như thế nào?"* hoặc *"ADN nhân đôi là gì?"*',
    agentInputPlaceholder: 'Hỏi Wiki Med Vision Agent… (Enter để gửi)',
    searchingText: '🔍 Đang tìm kiếm Wikipedia bằng hình ảnh…',
    translatingText: '🌐 Đang dịch sang tiếng Anh để tìm kiếm…',
    generatingText: '🧠 Đang tạo câu trả lời…',
    resultsLabel: (n) => `✨ ${n} kết quả trực quan từ 8.28 triệu bài Wikipedia`,
    clickTip: 'Nhấn vào tile → mở Wikipedia',
    noResults: { title: 'Không tìm thấy kết quả.', sub: 'Hãy thử từ khóa khác hoặc thêm hình ảnh.' },
    imageActive: (name, hasText) => `🖼️ ${name} · đang tìm theo ảnh${hasText ? ' + văn bản' : ''}`,
    searchBtn: (loading) => loading ? '⏳ Đang tìm…' : '🚀 Tìm kiếm',
    tileUnavailable: 'Tile không khả dụng',
    openDirectly: 'mở trực tiếp ↗',
    openWiki: '↗ Wikipedia',
    systemPrompt: `Bạn là Wiki Med Vision Agent, trợ lý kiến thức y tế AI tích hợp PixelRAG — hệ thống truy xuất hình ảnh từ 8.28 triệu bài Wikipedia.

Nhiệm vụ: trả lời câu hỏi y tế và khoa học rõ ràng, chính xác, thân thiện BẰNG TIẾNG VIỆT. Khi nhận kết quả tile Wikipedia từ PixelRAG, hãy tham chiếu chúng tự nhiên như bằng chứng trực quan. Hãy súc tích nhưng đầy đủ. Dùng markdown để định dạng. Luôn khuyến khích người dùng tham khảo chuyên gia y tế cho quyết định sức khỏe cá nhân.`,
  },
  en: {
    wikiBase: 'https://en.wikipedia.org',
    searchPlaceholder: 'Search Wikipedia visually… e.g. cardiac anatomy, DNA replication',
    quickQueries: ['cardiac anatomy', 'DNA replication', 'human brain', 'cell mitosis', 'blood circulation', 'vitamin deficiency'],
    quickPrompts: ['How does the heart work?', 'Explain mitosis', 'What causes anemia?', 'DNA vs RNA', 'Blood types explained'],
    agentGreeting: "Hello! I'm **Wiki Med Vision Agent** — powered by PixelRAG + Claude.\n\nI can search 8.28 million Wikipedia articles visually and answer your medical questions with retrieved image evidence.\n\nTry asking: *\"Explain how the heart pumps blood\"* or *\"What is DNA replication?\"*",
    agentInputPlaceholder: 'Ask Wiki Med Vision Agent… (Enter to send)',
    searchingText: '🔍 Searching Wikipedia visually…',
    translatingText: '🔍 Searching Wikipedia visually…',
    generatingText: '🧠 Generating response…',
    resultsLabel: (n) => `✨ ${n} visual hits from 8.28M Wikipedia articles`,
    clickTip: 'Click any tile → open Wikipedia',
    noResults: { title: 'No visual results found.', sub: 'Try a different query or add an image.' },
    imageActive: (name, hasText) => `🖼️ ${name} · image query active${hasText ? ' + text query' : ''}`,
    searchBtn: (loading) => loading ? '⏳ Searching…' : '🚀 Search',
    tileUnavailable: 'Tile unavailable',
    openDirectly: 'open tile directly ↗',
    openWiki: '↗ Wikipedia',
    systemPrompt: `You are Wiki Med Vision Agent, an AI medical knowledge assistant integrated with PixelRAG — a visual retrieval system over 8.28 million Wikipedia articles.

Your job: answer medical and scientific questions clearly, accurately, and in a friendly tone. When you receive retrieved Wikipedia tile results, reference them naturally in your answer as visual evidence. Be concise but thorough. Use markdown for formatting. Always encourage the user to verify with a medical professional for personal health decisions.`,
  },
}

function getLangConfig(lang) {
  return WIKI_LANG_CONFIG[lang] || WIKI_LANG_CONFIG['en']
}

// ─── Translate non-English query to English via Groq proxy ──────────────────
// PixelRAG only indexes English Wikipedia, so non-English queries need translation.
// Uses the same /api/groq-proxy already used by AgentTab — no extra setup needed.
async function translateToEnglish(text) {
  try {
    const res = await fetch('/api/groq-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 60,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You are a Vietnamese medical translator. The user will give you a Vietnamese medical or scientific search query. Translate it from Vietnamese to English. Reply with ONLY the English translation — no explanation, no extra text. Example: "não người" → "human brain", "tim mạch" → "cardiovascular", "ung thư" → "cancer".',
          },
          { role: 'user', content: text },
        ],
      }),
    })
    if (!res.ok) return text
    const data = await res.json()
    const translated = data?.choices?.[0]?.message?.content?.trim()
    console.log(`[translate] "${text}" → "${translated}"`)
    return translated || text
  } catch {
    return text
  }
}

// Detect if a string contains non-ASCII (non-Latin) characters → likely non-English
function isNonEnglish(text) {
  return /[^\x00-\x7F]/.test(text)
}

async function pixelSearch(query, imageBase64 = null, nDocs = 6, lang = 'en') {
  // PixelRAG only has English Wikipedia — translate non-English queries
  let searchQuery = query
  if (query?.trim() && lang !== 'en' && isNonEnglish(query)) {
    searchQuery = await translateToEnglish(query.trim())
  }

  const queries = []
  if (searchQuery?.trim()) queries.push({ text: searchQuery.trim() })
  if (imageBase64) queries.push({ image: imageBase64 })
  if (!queries.length) throw new Error('Need text or image query')

  const res = await fetch(`${PIXELRAG_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries, n_docs: nDocs }),
  })
  if (!res.ok) throw new Error(`PixelRAG search failed: ${res.status}`)
  const raw = await res.json()

  console.log('[PixelRAG] raw response:', JSON.stringify(raw, null, 2))

  let hits = []
  if (Array.isArray(raw)) {
    hits = raw
  } else if (Array.isArray(raw?.hits)) {
    hits = raw.hits
  } else if (Array.isArray(raw?.hits?.hits)) {
    hits = raw.hits.hits.map(h => h._source || h)
  } else if (Array.isArray(raw?.results)) {
    hits = raw.results.flatMap(r =>
      Array.isArray(r?.hits) ? r.hits : Array.isArray(r) ? r : []
    )
  } else if (Array.isArray(raw?.data?.hits)) {
    hits = raw.data.hits
  } else if (Array.isArray(raw?.data)) {
    hits = raw.data
  }

  hits = hits.map(h => ({
    article_id:  h.article_id  ?? h.articleId  ?? h.article  ?? h.id  ?? '',
    tile_index:  h.tile_index  ?? h.tileIndex  ?? h.tile      ?? 0,
    chunk_index: h.chunk_index ?? h.chunkIndex ?? h.chunk     ?? 0,
    score:       h.score       ?? h._score     ?? null,
    title:       h.title       ?? h.article_title ?? (h.url ? h.url.replace(/_/g, ' ') : ''),
    ...h,
  }))

  console.log('[PixelRAG] normalized hits:', hits.length, hits[0] ?? '(none)')

  return { hits, _raw: raw }
}

function tileUrl(articleId, tileIndex, chunkIndex) {
  return `${PIXELRAG_TILES}/tile/${articleId}/${tileIndex}/${chunkIndex}`
}

async function callAI(messages, systemPrompt) {
  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: String(m.content) })),
  ]

  const payload = {
    model: GROQ_MODEL,
    messages: groqMessages,
    max_tokens: 1024,
    temperature: 0.7,
  }

  const res = await fetch('/api/groq-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || JSON.stringify(data)
    throw new Error(`Groq API error: ${res.status} — ${msg}`)
  }

  return data.choices?.[0]?.message?.content || ''
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TileCard({ hit, idx, tileUnavailable, openDirectly, openWiki }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  const url = tileUrl(hit.article_id, hit.tile_index, hit.chunk_index)
  // Use language-specific Wikipedia URL
  // Tile images always come from English Wikipedia — always link to EN article by curid.
  // hit.url is the English Wikipedia article slug e.g. "Human_brain"
  // Use /wiki/<slug> for a direct, correct link. Fall back to curid only if slug missing.
  const wikiUrl = hit.url
    ? `https://en.wikipedia.org/wiki/${hit.url}`
    : `https://en.wikipedia.org/?curid=${hit.article_id}`

  React.useEffect(() => {
    console.log(`[TileCard #${idx + 1}] fetching:`, url, 'hit:', hit)
  }, [url])

  return (
    <div style={{
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(99,102,241,0.2)',
      background: 'rgba(15,10,40,0.6)',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      cursor: 'pointer',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(99,102,241,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
      onClick={() => window.open(wikiUrl, '_blank')}
    >
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 2,
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        color: '#fff', borderRadius: 999, padding: '3px 10px',
        fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
      }}>#{idx + 1}</div>

      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 2,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        color: 'rgba(255,255,255,0.7)', borderRadius: 8,
        padding: '3px 8px', fontSize: 10, fontWeight: 700,
      }}>ID {hit.article_id}</div>

      <div style={{ width: '100%', height: 220, background: 'rgba(10,5,30,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!err ? (
          <img
            src={url}
            alt={`Wikipedia tile ${hit.article_id}`}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
            onLoad={() => { console.log(`[TileCard #${idx + 1}] loaded ✓`, url); setLoaded(true) }}
            onError={(e) => { console.warn(`[TileCard #${idx + 1}] img error ✗`, url, e.type); setErr(true) }}
          />
        ) : null}
        {!loaded && !err && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Loading tile…</span>
          </div>
        )}
        {err && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, padding: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
            <div style={{ marginBottom: 4 }}>{tileUnavailable}</div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 10, color: '#6366f1', textDecoration: 'underline' }}
            >{openDirectly}</a>
          </div>
        )}
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: 'rgba(165,180,252,0.8)', fontWeight: 700 }}>
            Tile {hit.tile_index} · Chunk {hit.chunk_index}
          </span>
          {hit.title && (
            <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hit.title}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'rgba(99,102,241,0.8)', fontWeight: 700 }}>{openWiki}</span>
      </div>
    </div>
  )
}


function SearchTab({ isDark, lc, lang }) {
  const [query, setQuery] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState(null)
  const [nDocs, setNDocs] = useState(6)
  const fileRef = useRef(null)

  const handleImageSelect = async (file) => {
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleSearch = async () => {
    if (!query.trim() && !imageFile) return
    setLoading(true)
    setTranslating(lang !== 'en' && isNonEnglish(query))
    setError(null)
    setResults(null)
    try {
      const b64 = imageFile ? await fileToBase64(imageFile) : null
      const data = await pixelSearch(query, b64, nDocs, lang)
      setTranslating(false)
      setResults(data)
    } catch (e) {
      setTranslating(false)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const clearImage = () => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Search bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: 0.5 }}>🔍</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={lc.searchPlaceholder}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '14px 16px 14px 42px', borderRadius: 14,
                border: '1px solid rgba(99,102,241,0.35)',
                background: 'rgba(99,102,241,0.08)',
                color: isDark ? '#e2e8f0' : '#1e1b4b',
                fontSize: 15, outline: 'none',
                transition: 'border-color 0.18s',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.35)'}
            />
          </div>

          <select
            value={nDocs}
            onChange={e => setNDocs(Number(e.target.value))}
            style={{
              padding: '14px 12px', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.08)', color: isDark ? '#c7d2fe' : '#4338ca',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', outline: 'none',
            }}
          >
            {[3, 6, 9, 12].map(n => <option key={n} value={n}>{n} results</option>)}
          </select>

          <button
            onClick={() => fileRef.current?.click()}
            title="Search by image"
            style={{
              padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(139,92,246,0.35)',
              background: imageFile ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : 'rgba(139,92,246,0.1)',
              color: imageFile ? '#fff' : '#7c3aed',
              fontSize: 18, cursor: 'pointer', transition: 'all 0.18s',
            }}
          >🖼️</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageSelect(e.target.files[0])} />

          <button
            onClick={handleSearch}
            disabled={loading || (!query.trim() && !imageFile)}
            style={{
              padding: '14px 24px', borderRadius: 12,
              background: loading || (!query.trim() && !imageFile) ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s', whiteSpace: 'nowrap',
            }}
          >
            {lc.searchBtn(loading)}
          </button>
        </div>

        {imagePreview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <img src={imagePreview} alt="Query" style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 8 }} />
            <span style={{ flex: 1, fontSize: 13, color: isDark ? '#c4b5fd' : '#5b21b6', fontWeight: 700 }}>
              {lc.imageActive(imageFile?.name, query.trim())}
            </span>
            <button onClick={clearImage} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Quick queries */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {lc.quickQueries.map(q => (
            <button
              key={q}
              onClick={() => { setQuery(q); }}
              style={{
                padding: '6px 14px', borderRadius: 999,
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                color: isDark ? '#a5b4fc' : '#4338ca',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(99,102,241,0.22)' }}
              onMouseLeave={e => { e.target.style.background = 'rgba(99,102,241,0.1)' }}
            >{q}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {translating && (
        <div style={{ padding: '10px 16px', marginBottom: 12, borderRadius: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 13, color: '#a5b4fc', fontWeight: 700 }}>
          {lc.translatingText}
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: nDocs }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', height: 260, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {results?.hits?.length > 0 && !loading && (
        <>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#a5b4fc' : '#4338ca' }}>
              {lc.resultsLabel(results.hits.length)}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.7)', marginLeft: 'auto' }}>{lc.clickTip}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {results.hits.map((hit, i) => (
              <TileCard
                key={`${hit.article_id}-${hit.tile_index}-${i}`}
                hit={hit} idx={i}
                tileUnavailable={lc.tileUnavailable}
                openDirectly={lc.openDirectly}
                openWiki={lc.openWiki}
              />
            ))}
          </div>
        </>
      )}

      {results?.hits?.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(148,163,184,0.6)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔬</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{lc.noResults.title}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>{lc.noResults.sub}</div>
        </div>
      )}

      {results && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 11, fontWeight: 800, color: 'rgba(99,102,241,0.6)', cursor: 'pointer', userSelect: 'none', padding: '6px 0' }}>
            🛠 Debug: raw API response ({results.hits?.length ?? 0} hits normalized)
          </summary>
          <pre style={{
            marginTop: 8, padding: 14, borderRadius: 10,
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(99,102,241,0.2)',
            color: 'rgba(165,180,252,0.8)', fontSize: 10, lineHeight: 1.5,
            overflowX: 'auto', maxHeight: 320, overflowY: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {JSON.stringify(results._raw ?? results, null, 2)}
          </pre>
        </details>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
    </div>
  )
}


function AgentTab({ isDark, lc, lang }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: lc.agentGreeting,
      tiles: null,
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const logRef = useRef(null)

  // Reset messages when language config changes (language switch)
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: lc.agentGreeting,
      tiles: null,
    }])
  }, [lc])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages, loading])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    setInput('')
    const userMsg = { role: 'user', content: trimmed, tiles: null }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setSearching(true)

    let tiles = null
    let contextText = ''

    try {
      const searchData = await pixelSearch(trimmed, null, 4, lang)
      tiles = searchData?.hits || []
      setSearching(false)
      if (tiles.length > 0) {
        contextText = `\n\n[PixelRAG retrieved ${tiles.length} Wikipedia visual hits: article IDs ${tiles.map(h => h.article_id).join(', ')}. Use these as visual evidence in your response.]`
      }
    } catch {
      setSearching(false)
      contextText = '\n\n[PixelRAG search unavailable for this query.]'
    }

    try {
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(messages[0]?.role === 'assistant' ? 1 : 0)
        .map(m => ({ role: m.role, content: String(m.content) }))

      history.push({ role: 'user', content: trimmed + contextText })

      while (history.length > 0 && history[0].role !== 'user') history.shift()

      console.log('[Claude] messages:', history.length, '| first:', history[0]?.role)

      const reply = await callAI(history, lc.systemPrompt)
      setMessages(prev => [...prev, { role: 'assistant', content: reply, tiles }])
    } catch (e) {
      console.error('[Claude] error:', e)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${e.message}`,
        tiles,
      }])
    }
    setLoading(false)
  }

  const renderMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;font-size:0.9em">$1</code>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '72vh', minHeight: 520 }}>
      {/* Chat log */}
      <div ref={logRef} style={{
        flex: 1, overflowY: 'auto', padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 18,
        scrollbarWidth: 'thin',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: msg.role === 'user' ? '#a5b4fc' : '#7c3aed', paddingLeft: 4 }}>
              {msg.role === 'user' ? '👤 YOU' : '🤖 WIKI MED VISION AGENT'}
            </div>

            <div style={{
              padding: '13px 17px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg,#6366f1,#7c3aed)'
                : 'rgba(15,10,40,0.7)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(99,102,241,0.2)',
              color: msg.role === 'user' ? '#fff' : (isDark ? '#e2e8f0' : '#1e1b4b'),
              fontSize: 14, lineHeight: 1.65,
              backdropFilter: 'blur(8px)',
            }} dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />

            {msg.tiles?.length > 0 && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(139,92,246,0.7)', marginBottom: 8, paddingLeft: 4 }}>
                  📸 Visual evidence from PixelRAG ({msg.tiles.length} Wikipedia tiles)
                </div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {msg.tiles.map((hit, ti) => (
                    <div
                      key={ti}
                      onClick={() => {
                        const url = hit.url
                          ? `https://en.wikipedia.org/wiki/${hit.url}`
                          : `https://en.wikipedia.org/?curid=${hit.article_id}`
                        window.open(url, '_blank')
                      }}
                      style={{
                        minWidth: 160, borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                        border: '1px solid rgba(99,102,241,0.25)',
                        background: 'rgba(10,5,30,0.6)',
                        transition: 'transform 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                      onMouseLeave={e => e.currentTarget.style.transform = ''}
                    >
                      <img
                        src={tileUrl(hit.article_id, hit.tile_index, hit.chunk_index)}
                        alt="Wikipedia tile"
                        style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                      <div style={{ display: 'none', height: 110, alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        {lc.tileUnavailable}
                      </div>
                      <div style={{ padding: '6px 10px', fontSize: 10, color: 'rgba(165,180,252,0.7)', fontWeight: 700 }}>
                        ID {hit.article_id} · T{hit.tile_index}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-start', maxWidth: '80%' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', paddingLeft: 4 }}>🤖 WIKI MED VISION AGENT</div>
            <div style={{
              padding: '13px 17px', borderRadius: '18px 18px 18px 4px',
              background: 'rgba(15,10,40,0.7)', border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#6366f1',
                    animation: `dotBounce 1.2s ease-in-out ${d * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(165,180,252,0.7)' }}>
                {searching ? (lang !== 'en' && lc.translatingText ? lc.translatingText : lc.searchingText) : lc.generatingText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(99,102,241,0.15)', background: 'rgba(5,3,15,0.4)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto' }}>
          {lc.quickPrompts.map(p => (
            <button key={p} onClick={() => setInput(p)} style={{
              padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              color: isDark ? '#a5b4fc' : '#4338ca', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>{p}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={lc.agentInputPlaceholder}
            style={{
              flex: 1, padding: '13px 16px', borderRadius: 14,
              border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.08)',
              color: isDark ? '#e2e8f0' : '#1e1b4b',
              fontSize: 14, outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.3)'}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: '13px 22px', borderRadius: 14,
              background: loading || !input.trim() ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >↑</button>
        </div>
      </div>

      <style>{`@keyframes dotBounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  )
}


// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function WikiMedVisionPanel({ onNext, onPrev, prevLabel, nextLabel }) {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const [tab, setTab] = useState('search')

  // Get language-specific config — defaults to English for unknown langs
  const lc = getLangConfig(lang)

  const bg = isDark
    ? 'linear-gradient(135deg, #050314 0%, #0c0a1e 50%, #080520 100%)'
    : 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ede9fe 100%)'

  const cardBg = isDark ? 'rgba(10,6,30,0.75)' : 'rgba(255,255,255,0.82)'
  const cardBorder = isDark ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.18)'

  return (
    <div style={{ minHeight: '100%', background: bg, padding: '22px clamp(14px, 3vw, 28px) 36px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Header ── */}
        <div style={{
          borderRadius: 24, padding: '24px 28px',
          background: cardBg, border: `1px solid ${cardBorder}`,
          boxShadow: isDark ? '0 24px 60px rgba(99,102,241,0.15)' : '0 24px 60px rgba(99,102,241,0.12)',
          backdropFilter: 'blur(18px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '5px 14px', marginBottom: 10, background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.25)' }}>
                <span style={{ fontSize: 12 }}>🔮</span>
                <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, color: isDark ? '#a5b4fc' : '#4338ca', textTransform: 'uppercase' }}>Visual RAG · 8.28M Wikipedia Articles</span>
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, letterSpacing: '-0.04em', color: isDark ? '#e0e7ff' : '#1e1b4b' }}>
                Wiki Med{' '}
                <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vision</span>
              </h1>
              <p style={{ margin: 0, color: isDark ? '#94a3b8' : '#64748b', fontSize: 14, maxWidth: 560, lineHeight: 1.65 }}>
                {lang === 'vi'
                  ? 'Tìm kiếm Wikipedia bằng văn bản hoặc hình ảnh — PixelRAG truy xuất ảnh chụp màn hình tile trực quan. Hỏi Agent để tổng hợp câu trả lời với bằng chứng trực quan từ Wikipedia.'
                  : 'Search Wikipedia by text or image — PixelRAG retrieves visual tile screenshots. Ask the Agent to synthesize answers with visual evidence from real Wikipedia pages.'}
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[['8.28M', lang === 'vi' ? 'Bài Wikipedia' : 'Wikipedia articles'], ['Visual', lang === 'vi' ? 'Tìm theo ảnh' : 'tile search'], ['No key', lang === 'vi' ? 'Không cần key' : 'required']].map(([val, lbl]) => (
                <div key={lbl} style={{ borderRadius: 16, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, color: isDark ? '#a5b4fc' : '#4338ca' }}>{val}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab bar + Panel ── */}
        <div style={{
          borderRadius: 24, overflow: 'hidden',
          background: cardBg, border: `1px solid ${cardBorder}`,
          boxShadow: isDark ? '0 24px 60px rgba(99,102,241,0.12)' : '0 24px 60px rgba(99,102,241,0.08)',
          backdropFilter: 'blur(18px)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: `1px solid ${cardBorder}` }}>
            {[
              { id: 'search', icon: '🔍', label: lang === 'vi' ? 'Tìm kiếm' : 'Search', sub: lang === 'vi' ? 'Truy xuất Wikipedia trực quan' : 'Visual Wikipedia retrieval' },
              { id: 'agent', icon: '🤖', label: 'Agent', sub: lang === 'vi' ? 'PixelRAG + AI tổng hợp' : 'PixelRAG + Claude synthesis' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '18px 20px', border: 'none', cursor: 'pointer',
                  background: tab === t.id
                    ? (isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)')
                    : 'transparent',
                  borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.18s',
                }}
              >
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: tab === t.id ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#64748b' : '#94a3b8') }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: isDark ? '#475569' : '#cbd5e1', fontWeight: 700 }}>{t.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Panel content */}
          {tab === 'search' && <SearchTab isDark={isDark} lc={lc} lang={lang} />}
          {tab === 'agent' && <AgentTab isDark={isDark} lc={lc} lang={lang} />}
        </div>

        {/* ── Nav buttons ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 4 }}>
          {onPrev && (
            <button onClick={onPrev} style={{
              padding: '11px 22px', borderRadius: 12, border: `1px solid ${cardBorder}`,
              background: cardBg, color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>← {prevLabel || (lang === 'vi' ? 'Quay lại' : 'Back')}</button>
          )}
          {onNext && (
            <button onClick={onNext} style={{
              padding: '11px 22px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
              marginLeft: 'auto',
            }}>{nextLabel || (lang === 'vi' ? 'Tiếp theo' : 'Next')} →</button>
          )}
        </div>

      </div>
    </div>
  )
}
