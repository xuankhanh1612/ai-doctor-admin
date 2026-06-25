// api/google-tts.js
// Vercel Serverless Function — proxy Google Translate TTS.
//
// Google Translate TTS chặn request trực tiếp từ browser (CORS + Referer check).
// Server-side fetch không bị chặn vì không có Referer từ domain lạ.
//
// Usage: GET /api/google-tts?q=xin+chào&tl=vi
// Returns: audio/mpeg stream

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { q, tl = 'vi' } = req.query
  if (!q) return res.status(400).json({ error: 'Missing query param: q' })

  // Giới hạn độ dài để tránh abuse
  if (q.length > 300) return res.status(400).json({ error: 'Text too long (max 300 chars)' })

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(q)}`

  try {
    const upstream = await fetch(url, {
      headers: {
        // Google kiểm tra User-Agent, dùng UA của Chrome
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
        'Accept': 'audio/mpeg, audio/*',
      },
    })

    if (!upstream.ok) {
      console.error('[google-tts] upstream error:', upstream.status)
      return res.status(upstream.status).json({ error: `Google TTS error: ${upstream.status}` })
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400') // cache 24h

    const buffer = await upstream.arrayBuffer()
    return res.status(200).send(Buffer.from(buffer))
  } catch (err) {
    console.error('[google-tts] fetch error:', err?.message)
    return res.status(500).json({ error: err?.message || 'Proxy fetch error' })
  }
}
