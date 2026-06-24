// api/gemini-proxy.js
// Vercel Serverless Function — proxy Google Gemini API calls from the browser.
// Gemini 2.0 Flash is FREE with a Google AI Studio key (no credit card needed).
// Get your key at: https://aistudio.google.com/apikey
// Add to Vercel env as: GEMINI_API_KEY

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body)
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[gemini-proxy] GEMINI_API_KEY is not set')
    return res.status(500).json({
      error: 'GEMINI_API_KEY not configured. Add it in Vercel → Settings → Environment Variables.',
    })
  }

  let body
  try {
    body = await parseBody(req)
  } catch (e) {
    return res.status(400).json({ error: 'Failed to parse request body: ' + e.message })
  }

  const { model = 'gemini-2.0-flash', systemPrompt, messages = [] } = body

  // Build Gemini generateContent request
  // Docs: https://ai.google.dev/api/generate-content
  const geminiBody = {
    ...(systemPrompt && {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
    }),
    contents: messages,  // already in Gemini {role, parts} format from client
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  console.log('[gemini-proxy] model:', model, '| messages:', messages.length)

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    })

    const text = await upstream.text()
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!upstream.ok) {
      console.error('[gemini-proxy] Gemini', upstream.status, ':', text.slice(0, 500))
    }

    return res.status(upstream.status).json(data)
  } catch (err) {
    console.error('[gemini-proxy] fetch error:', err?.message)
    return res.status(500).json({ error: err?.message || 'Proxy fetch error' })
  }
}
