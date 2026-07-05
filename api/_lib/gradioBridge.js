// api/_lib/gradioBridge.js
// Logic dùng chung cho các endpoint gọi một Gradio app từ xa (Hugging Face
// Space hoặc ModelScope Studio) làm "bridge" tới model thật, thay vì mô
// phỏng kết quả. Tách ra đây để api/lam-generate.js và api/lhm-generate.js
// không lệch nhau về cách: parse body, convert base64 -> Blob, tự dò
// endpoint qua view_api(), và luôn trả NGUYÊN VĂN lỗi thật từ upstream.

export const MAX_BODY_BYTES = 4 * 1024 * 1024 // an toàn dưới hard cap 4.5MB của Vercel

export function parseBody(req) {
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

export function dataUrlOrB64ToBlob(input, fallbackMime) {
  if (!input) return null
  let mime = fallbackMime || 'application/octet-stream'
  let b64 = input
  const m = /^data:([^;]+);base64,(.*)$/s.exec(input)
  if (m) { mime = m[1]; b64 = m[2] }
  const buf = Buffer.from(b64, 'base64')
  return new Blob([buf], { type: mime })
}

export function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

// Gradio's view_api() mô tả mọi hàm mà app expose (tên tham số/kiểu dữ
// liệu). matchers là { image: RegExp, video: RegExp } — endpoint được chọn
// phải khớp TẤT CẢ matcher có cấp (vd bắt buộc có ảnh, có video là tuỳ
// chọn). Cách này giúp code không "chết" nếu team gốc đổi tên nội bộ.
export function pickEndpoint(apiInfo, matchers = {}) {
  const named = apiInfo?.named_endpoints || {}
  const entries = Object.entries(named).map(([path, def]) => {
    const params = def.parameters || []
    const describe = (p) => `${p.label || ''} ${p.parameter_name || ''} ${p.component || ''}`.toLowerCase()
    const matched = {}
    let ok = true
    for (const [key, re] of Object.entries(matchers)) {
      const found = params.find(p => re.test(describe(p)))
      if (!found && key !== 'optional') { ok = false }
      matched[key] = found || null
    }
    return { path, params, matched, ok }
  }).filter(e => e.ok)

  if (!entries.length) return null
  const preferred = entries.find(e => /generat|submit|run|infer|reconstruct|predict/i.test(e.path))
  return preferred || entries[0]
}

export function buildPayload(params, fileMap) {
  // fileMap: { image: Blob|null, video: Blob|null, ... } theo pattern trong label
  const payload = {}
  for (const p of params) {
    const key = p.parameter_name || p.label
    if (!key) continue
    const desc = `${p.label || ''} ${key} ${p.component || ''}`.toLowerCase()
    let filled = false
    for (const [fileKey, blob] of Object.entries(fileMap)) {
      if (!blob) continue
      const re = fileKey === 'image'
        ? /image|photo|portrait/
        : fileKey === 'video'
          ? /video|motion|driving/
          : new RegExp(fileKey)
      if (re.test(desc)) { payload[key] = blob; filled = true; break }
    }
    if (!filled && p.parameter_has_default) {
      payload[key] = p.parameter_default
    }
  }
  return payload
}

// Dùng cho ModelScope hoặc bất kỳ URL Gradio raw nào — connect thẳng,
// retry có backoff, không ping trước (không biết host phụ để ping).
export async function connectWithWakeRetry(Client, target, opts, attempts = 3) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await Client.connect(target, opts)
    } catch (err) {
      lastErr = err
      const waitMs = 3000 * (i + 1)
      console.warn(`[gradioBridge] connect attempt ${i + 1}/${attempts} to "${target}" failed (${err?.message}), retrying in ${waitMs}ms`)
      await sleep(waitMs)
    }
  }
  throw lastErr
}

// ZeroGPU Spaces trên Hugging Face (như 3DAIGC/LAM, 3DAIGC/LHM) hay "ngủ"
// khi rảnh — request đầu tiên sau khi ngủ thường 503 trong lúc HF khởi
// động container/cấp GPU. Ping thẳng host <space>.hf.space một lần cho
// "tỉnh", rồi mới retry Client.connect(spaceId) vài lần có backoff.
export async function connectHfSpaceWithWakeRetry(Client, spaceId, opts, attempts = 4) {
  const host = `https://${spaceId.toLowerCase().replace(/[/_]/g, '-')}.hf.space`
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(host, { method: 'GET' }).catch(() => {})
      return await Client.connect(spaceId, opts)
    } catch (err) {
      lastErr = err
      const waitMs = 3000 * (i + 1)
      console.warn(`[gradioBridge] connect attempt ${i + 1}/${attempts} to HF space "${spaceId}" failed (${err?.message}), retrying in ${waitMs}ms`)
      await sleep(waitMs)
    }
  }
  throw lastErr
}
