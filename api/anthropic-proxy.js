// api/anthropic-proxy.js
// Vercel Serverless Function — proxy Anthropic API calls from the browser.
// The Anthropic API does not allow direct browser requests (CORS), so all
// calls to /v1/messages must go through this server-side route which injects
// the API key from env and forwards the response back to the client.

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  try {
    const body = await parseBody(req);

    // Validate: messages must exist and start with role:'user'
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required and must not be empty' });
    }
    if (body.messages[0].role !== 'user') {
      console.error('[anthropic-proxy] First message role is not user:', body.messages[0].role);
      return res.status(400).json({
        error: `First message must have role 'user', got '${body.messages[0].role}'`,
        messages_received: body.messages.map(m => m.role),
      });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('[anthropic-proxy] Anthropic error:', upstream.status, JSON.stringify(data));
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[anthropic-proxy]', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Proxy error' });
  }
}
