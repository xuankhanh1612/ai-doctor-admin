// api/lam-generate.js
// Vercel Serverless Function — REAL bridge to the LAM (Large Avatar Model) source code.
//
// This does NOT run the model on this server (LAM needs a compiled CUDA
// `diff-gaussian-rasterization` extension + an NVIDIA GPU + ~10-20GB of
// checkpoints — that cannot run on a Vercel/Node lambda). Instead it drives
// the *actual* LAM inference code (github.com/aigc3d/LAM) that the 3DAIGC
// team hosts as a Gradio Space, using the official @gradio/client SDK.
//
// IMPORTANT: this call is made from the SERVER, not the browser. The
// Space's CORS setup rejects credentialed cross-origin requests from a
// browser origin (Access-Control-Allow-Credentials comes back empty
// instead of "true"), so calling it with @gradio/client directly from
// client-side code fails with a CORS error no matter what. CORS is a
// browser-only restriction — a Node server calling the same Space has no
// such restriction — so the real fix is to keep this call server-side and
// just make sure the request body from the browser to *this* endpoint
// stays small (Vercel hard-caps Serverless Function request bodies at
// 4.5MB). The client resizes the photo before sending it here.
//
// Because it's someone else's shared community Space, it can be asleep,
// out of ZeroGPU quota, or crashed (we've seen it crash with
// "Found no NVIDIA driver" when HF fails to schedule it a GPU) — when that
// happens this endpoint forwards the *real* upstream error instead of
// pretending to succeed. For guaranteed uptime, self-host LAM/OpenAvatarChat
// on your own GPU using the setup command in the "My AI Avatar" tab.
//
// Env vars (optional):
//   LAM_HF_SPACE  - override the space id, default "3DAIGC/LAM"
//   HF_TOKEN      - HF access token, raises rate limits / lets you use a
//                   private duplicate of the space (https://huggingface.co/spaces/3DAIGC/LAM?duplicate=true)

import { Client } from '@gradio/client'

const DEFAULT_SPACE = process.env.LAM_HF_SPACE || '3DAIGC/LAM'
const MAX_BODY_BYTES = 4 * 1024 * 1024 // stay safely under Vercel's 4.5MB hard cap

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body)
    let data = ''
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      data += chunk
    })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

function dataUrlOrB64ToBlob(input, fallbackMime) {
  if (!input) return null
  let mime = fallbackMime || 'application/octet-stream'
  let b64 = input
  const m = /^data:([^;]+);base64,(.*)$/s.exec(input)
  if (m) { mime = m[1]; b64 = m[2] }
  const buf = Buffer.from(b64, 'base64')
  return new Blob([buf], { type: mime })
}

// Gradio's view_api() describes every function exposed by the Space
// (parameter names/types). We pick the endpoint that (a) accepts an image
// and (b) looks like the "run inference" button rather than a helper
// (e.g. example-loading) endpoint, so this keeps working even if the
// 3DAIGC team renames internals.
function pickEndpoint(apiInfo) {
  const named = apiInfo?.named_endpoints || {}
  const candidates = Object.entries(named).map(([path, def]) => {
    const params = def.parameters || []
    const hasImage = params.some(p => /image|photo|portrait/i.test(`${p.label || ''} ${p.parameter_name || ''} ${p.component || ''}`))
    return { path, params, hasImage }
  }).filter(c => c.hasImage)

  if (!candidates.length) return null
  const preferred = candidates.find(c => /generat|submit|run|infer|reconstruct/i.test(c.path))
  return preferred || candidates[0]
}

function buildPayload(params, imageBlob) {
  const payload = {}
  for (const p of params) {
    const key = p.parameter_name || p.label
    if (!key) continue
    const desc = `${p.label || ''} ${key} ${p.component || ''}`
    if (/image|photo|portrait/i.test(desc) && imageBlob) {
      payload[key] = imageBlob
    } else if (p.parameter_has_default) {
      payload[key] = p.parameter_default
    }
  }
  return payload
}

export async function lamGenerateHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body
  try {
    body = await parseBody(req)
  } catch (e) {
    if (e.statusCode === 413) {
      return res.status(413).json({
        error: 'Ảnh gửi lên quá lớn cho một request server (>4MB). Hãy để client tự resize ảnh trước khi gửi (đã bật mặc định trong panel).',
      })
    }
    return res.status(400).json({ error: 'Failed to parse request body: ' + e.message })
  }

  const { imageBase64, imageMimeType, space } = body
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required (a single front-facing portrait photo).' })
  }

  const spaceId = (space && String(space).trim()) || DEFAULT_SPACE

  let client
  try {
    client = await Client.connect(spaceId, process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : undefined)
  } catch (err) {
    console.error('[lam-generate] connect failed:', err?.message)
    return res.status(502).json({
      error: `Không kết nối được tới Hugging Face Space "${spaceId}": ${err?.message || err}`,
      hint: `Kiểm tra trạng thái tại https://huggingface.co/spaces/${spaceId}`,
    })
  }

  let apiInfo
  try {
    apiInfo = await client.view_api()
  } catch (err) {
    return res.status(502).json({ error: `Không đọc được API của Space: ${err?.message || err}` })
  }

  const endpoint = pickEndpoint(apiInfo)
  if (!endpoint) {
    return res.status(502).json({
      error: 'Space này hiện không lộ endpoint nhận ảnh (có thể API đã đổi hoặc Space đang lỗi build).',
      apiInfo,
    })
  }

  const imageBlob = dataUrlOrB64ToBlob(imageBase64, imageMimeType || 'image/jpeg')
  const payload = buildPayload(endpoint.params, imageBlob)

  console.log('[lam-generate] space:', spaceId, '| endpoint:', endpoint.path, '| params:', Object.keys(payload))

  try {
    const result = await client.predict(endpoint.path, payload)
    return res.status(200).json({
      ok: true,
      space: spaceId,
      endpoint: endpoint.path,
      data: result.data,
    })
  } catch (err) {
    // Forward the REAL upstream error (e.g. the Space crashing with
    // "Found no NVIDIA driver", queue timeout, ZeroGPU quota, etc.)
    // instead of masking it — this endpoint never fabricates a result.
    console.error('[lam-generate] predict failed:', err?.message)
    return res.status(502).json({
      error: err?.message || 'LAM inference call failed on the Hugging Face Space.',
      space: spaceId,
      endpoint: endpoint.path,
      hint: `Space công khai có thể đang ngủ / hết quota ZeroGPU / crash. Xem trực tiếp tại https://huggingface.co/spaces/${spaceId}, hoặc tự host LAM/OpenAvatarChat trên GPU riêng (xem hướng dẫn trong tab "My AI Avatar").`,
    })
  }
}

export default async function handler(req, res) {
  return lamGenerateHandler(req, res)
}
