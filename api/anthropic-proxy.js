// api/anthropic-proxy.js
// Vercel Serverless Function — proxy Anthropic API calls from the browser.

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[anthropic-proxy] ANTHROPIC_API_KEY is not set')
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  let body
  try {
    body = await parseBody(req)
  } catch (e) {
    return res.status(400).json({ error: 'Failed to parse request body: ' + e.message })
  }

  // Log what we're sending (mask key)
  console.log('[anthropic-proxy] model:', body.model, '| messages:', body.messages?.length, '| first role:', body.messages?.[0]?.role)

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    // Read body as text first so we can log it on error
    const text = await upstream.text()
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!upstream.ok) {
      console.error('[anthropic-proxy] Anthropic', upstream.status, ':', text.slice(0, 500))
    }

    return res.status(upstream.status).json(data)
  } catch (err) {
    console.error('[anthropic-proxy] fetch error:', err?.message)
    return res.status(500).json({ error: err?.message || 'Proxy fetch error' })
  }
}
