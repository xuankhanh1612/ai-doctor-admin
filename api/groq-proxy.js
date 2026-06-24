// api/groq-proxy.js
// Vercel Serverless Function — proxy Groq API calls from the browser.
//
// Groq is FREE — no credit card needed. Get your key at: https://console.groq.com
// Add to Vercel env as: GROQ_API_KEY
//
// Model used: llama-3.3-70b-versatile
// Free limits: 14,400 requests/day, 500,000 tokens/minute — very generous.

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

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[groq-proxy] GROQ_API_KEY is not set')
    return res.status(500).json({
      error: 'GROQ_API_KEY not configured. Get a free key at https://console.groq.com and add it in Vercel → Settings → Environment Variables.',
    })
  }

  let body
  try {
    body = await parseBody(req)
  } catch (e) {
    return res.status(400).json({ error: 'Failed to parse request body: ' + e.message })
  }

  console.log('[groq-proxy] model:', body.model, '| messages:', body.messages?.length)

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const text = await upstream.text()
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!upstream.ok) {
      console.error('[groq-proxy] Groq', upstream.status, ':', text.slice(0, 500))
    }

    return res.status(upstream.status).json(data)
  } catch (err) {
    console.error('[groq-proxy] fetch error:', err?.message)
    return res.status(500).json({ error: err?.message || 'Proxy fetch error' })
  }
}
