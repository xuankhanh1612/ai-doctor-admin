// api/wan-image-to-video.js
// Server-side proxy for Alibaba Cloud Model Studio / Wan image-to-video.
// Required env: DASHSCOPE_API_KEY. For Singapore workspace domain, also set
// WAN_WORKSPACE_ID or WAN_API_BASE=https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body)
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

function getApiBase() {
  if (process.env.WAN_API_BASE) return process.env.WAN_API_BASE.replace(/\/$/, '')
  if (process.env.WAN_WORKSPACE_ID) return `https://${process.env.WAN_WORKSPACE_ID}.ap-southeast-1.maas.aliyuncs.com/api/v1`
  return 'https://dashscope.aliyuncs.com/api/v1'
}

function clampInteger(value, min, max, fallback) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function normalizeMediaUrl(value) {
  const url = String(value || '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (/^data:image\/(png|jpe?g|webp|bmp);base64,/i.test(url)) return url
  throw new Error('Ảnh phải là URL http(s) công khai hoặc data URL base64 hợp lệ.')
}

function buildCreatePayload(body) {
  const firstFrameUrl = normalizeMediaUrl(body.firstFrameUrl || body.imageUrl || body.image)
  if (!firstFrameUrl) throw new Error('Vui lòng cung cấp ảnh đầu vào (first frame).')

  const media = [{ type: 'first_frame', url: firstFrameUrl }]
  const lastFrameUrl = normalizeMediaUrl(body.lastFrameUrl)
  if (lastFrameUrl) media.push({ type: 'last_frame', url: lastFrameUrl })

  const prompt = String(body.prompt || '').trim()
  const negativePrompt = String(body.negativePrompt || body.negative_prompt || '').trim()
  const resolution = String(body.resolution || '720P').toUpperCase() === '1080P' ? '1080P' : '720P'
  const duration = clampInteger(body.duration, 2, 15, 5)

  return {
    model: body.model || process.env.WAN_I2V_MODEL || 'wan2.7-i2v-2026-04-25',
    input: {
      ...(prompt ? { prompt } : {}),
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      media,
    },
    parameters: {
      resolution,
      duration,
      prompt_extend: body.promptExtend !== false,
      watermark: body.watermark === true,
      ...(body.seed !== undefined && body.seed !== '' ? { seed: clampInteger(body.seed, 0, 2147483647, 0) } : {}),
    },
  }
}

async function readUpstreamJson(response) {
  const text = await response.text()
  try { return JSON.parse(text) }
  catch { return { raw: text } }
}

export async function wanImageToVideoHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.WAN_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'Missing DASHSCOPE_API_KEY/WAN_API_KEY on the server. Add your Alibaba Cloud Model Studio API key to environment variables.',
    })
  }

  let body
  try { body = await parseBody(req) }
  catch (error) { return res.status(400).json({ error: error.message }) }

  const action = body.action || 'create'
  const apiBase = getApiBase()

  try {
    if (action === 'status') {
      const taskId = String(body.taskId || body.task_id || '').trim()
      if (!taskId) return res.status(400).json({ error: 'Missing taskId.' })
      const upstream = await fetch(`${apiBase}/tasks/${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const data = await readUpstreamJson(upstream)
      return res.status(upstream.status).json(data)
    }

    const payload = buildCreatePayload(body)
    const upstream = await fetch(`${apiBase}/services/aigc/video-generation/video-synthesis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(payload),
    })
    const data = await readUpstreamJson(upstream)
    return res.status(upstream.status).json(data)
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Wan image-to-video request failed.' })
  }
}

export default wanImageToVideoHandler
