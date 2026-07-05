// api/lhm-generate.js
// Vercel Serverless Function — bridge tới LHM (Large Animatable Human
// Model, github.com/aigc3d/LHM).
//
// CẬP NHẬT: bản đầu của file này nhắm tới mirror ModelScope Studio
// (modelscope.cn/studios/Damo_XR_Lab/LHM), nhưng đã XÁC NHẬN bằng ảnh chụp
// màn hình thực tế rằng Studio đó chặn cứng theo khu vực:
// "Sorry, this service is currently only available to users who register
// with a mainland China mobile phone number." — không phải lỗi cấu hình
// hay cookie, mà là rào chắn không vượt qua được bằng kỹ thuật nếu không
// có tài khoản ModelScope đăng ký bằng SĐT Trung Quốc đại lục. Vì vậy
// endpoint này quay lại dùng Space Hugging Face `3DAIGC/LHM` làm mặc định
// (cùng nhóm tác giả với LAM, đang "Running on Zero" ổn định hơn LAM),
// dùng lại đúng cơ chế wake-retry đã chứng minh hoạt động ở
// api/lam-generate.js (ping <space>.hf.space rồi retry connect).
//
// Nếu về sau bạn tự có một mirror Gradio khác (self-host, RunPod...) không
// bị chặn khu vực, chỉ cần set LHM_GRADIO_URL trỏ tới URL Gradio raw đó —
// code sẽ ưu tiên dùng URL đó thay vì Space HF.
//
// Env vars (đều tuỳ chọn):
//   LHM_HF_SPACE     - đổi Space HF khác, default "3DAIGC/LHM"
//   HF_TOKEN         - HF access token, tăng rate limit / dùng bản duplicate riêng
//   LHM_GRADIO_URL   - nếu set, ưu tiên connect thẳng URL Gradio này thay vì Space HF
//                      (dùng cho mirror tự host của riêng bạn, KHÔNG dùng cho
//                      modelscope.cn/studios/... vì Studio đó chặn khu vực)

import { Client } from '@gradio/client'
import {
  parseBody, dataUrlOrB64ToBlob, pickEndpoint, buildPayload,
  connectWithWakeRetry, connectHfSpaceWithWakeRetry,
} from './_lib/gradioBridge.js'

const DEFAULT_SPACE = process.env.LHM_HF_SPACE || '3DAIGC/LHM'

export async function lhmGenerateHandler(req, res) {
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
      return res.status(413).json({ error: 'Ảnh/video gửi lên quá lớn cho một request server (>4MB). Client cần tự resize/nén trước khi gửi.' })
    }
    return res.status(400).json({ error: 'Failed to parse request body: ' + e.message })
  }

  const { imageBase64, imageMimeType, videoBase64, videoMimeType } = body
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required (a single front/half-body portrait photo).' })
  }

  const rawUrl = process.env.LHM_GRADIO_URL
  const target = rawUrl || DEFAULT_SPACE
  const isHfSpace = !rawUrl

  let client
  try {
    client = isHfSpace
      ? await connectHfSpaceWithWakeRetry(Client, target, process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : undefined)
      : await connectWithWakeRetry(Client, target, undefined, 2)
  } catch (err) {
    console.error('[lhm-generate] connect failed:', err?.message)
    return res.status(502).json({
      error: `Không kết nối được tới ${isHfSpace ? `Hugging Face Space "${target}"` : `Gradio URL "${target}"`} sau nhiều lần thử: ${err?.message || err}`,
      hint: isHfSpace
        ? `Space công khai dùng ZeroGPU nên hay "ngủ" hoặc hết hàng đợi GPU — đã tự thử lại vài lần nhưng vẫn không được. Đợi 30-60s rồi thử lại, hoặc xem trực tiếp https://huggingface.co/spaces/${target}.`
        : 'Kiểm tra lại LHM_GRADIO_URL có đúng là URL Gradio đang chạy công khai không.',
    })
  }

  let apiInfo
  try {
    apiInfo = await client.view_api()
  } catch (err) {
    return res.status(502).json({ error: `Không đọc được API: ${err?.message || err}` })
  }

  const endpoint = pickEndpoint(apiInfo, { image: /image|photo|portrait/, optional: /.*/ })
  if (!endpoint) {
    return res.status(502).json({
      error: 'Không tìm thấy endpoint nhận ảnh qua view_api() (API có thể đã đổi hoặc Space đang lỗi build).',
      apiInfo,
    })
  }

  const imageBlob = dataUrlOrB64ToBlob(imageBase64, imageMimeType || 'image/jpeg')
  const videoBlob = videoBase64 ? dataUrlOrB64ToBlob(videoBase64, videoMimeType || 'video/mp4') : null
  const payload = buildPayload(endpoint.params, { image: imageBlob, video: videoBlob })

  console.log('[lhm-generate] target:', target, '| endpoint:', endpoint.path, '| params:', Object.keys(payload))

  try {
    const result = await client.predict(endpoint.path, payload)
    return res.status(200).json({
      ok: true,
      source: isHfSpace ? 'huggingface' : 'custom',
      target,
      endpoint: endpoint.path,
      data: result.data,
    })
  } catch (err) {
    console.error('[lhm-generate] predict failed:', err?.message)
    return res.status(502).json({
      error: err?.message || 'LHM inference call failed.',
      target,
      endpoint: endpoint.path,
      hint: isHfSpace
        ? `Space công khai có thể đang ngủ / hết quota ZeroGPU / crash. Xem trực tiếp tại https://huggingface.co/spaces/${target}.`
        : undefined,
    })
  }
}

export default async function handler(req, res) {
  return lhmGenerateHandler(req, res)
}
