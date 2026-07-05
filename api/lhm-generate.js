// api/lhm-generate.js
// Vercel Serverless Function — bridge tới LHM (Large Animatable Human
// Model, github.com/aigc3d/LHM) chạy trên mirror ModelScope Studio
// (https://modelscope.cn/studios/Damo_XR_Lab/LHM), thay vì bản Hugging
// Face Space ZeroGPU hay hết quota/ngủ. Nhóm tác giả xác nhận mirror này
// chạy ổn định trên GPU L20 cố định, không giới hạn thời gian
// (xem: huggingface.co/spaces/3DAIGC/LHM/discussions/5).
//
// ĐIỂM KHÁC BIỆT QUAN TRỌNG SO VỚI api/lam-generate.js:
// ModelScope Studio KHÔNG có tài liệu API công khai chuẩn hoá như Hugging
// Face (không có "Use via API" + endpoint <name>.hf.space rõ ràng cho mọi
// Space). Bên dưới nó vẫn là Gradio, nên @gradio/client CÓ THỂ kết nối tới
// nếu biết đúng URL runtime — nhưng URL đó không phải là URL trang
// "modelscope.cn/studios/..." mà bạn thấy trên trình duyệt, mà là host
// thật mà trang đó gọi ngầm (thường qua iframe/websocket riêng).
//
// => Bạn cần tự lấy URL đó MỘT LẦN:
//   1. Mở https://modelscope.cn/studios/Damo_XR_Lab/LHM/summary
//   2. Mở DevTools (F12) -> tab Network -> lọc "config" hoặc "queue"
//   3. Tìm request gọi tới một host dạng https://*.modelscope.cn (khác
//      domain trang chủ) hoặc một địa chỉ study-xxxx dạng số — copy
//      phần gốc (origin) của URL đó.
//   4. Dán vào biến môi trường MODELSCOPE_LHM_URL trên Vercel.
// Nếu ModelScope yêu cầu cookie phiên đăng nhập cho hàng đợi (một số
// Studio làm vậy để chống bot), bước connect bên dưới sẽ thất bại — khi đó
// endpoint này trả lỗi thật (không giả lập thành công), và bạn nên quay lại
// hướng tự host LHM (xem README github aigc3d/LHM) hoặc dùng lại
// api/lam-generate.js trỏ sang 3DAIGC/LHM trên Hugging Face.
//
// Env vars:
//   MODELSCOPE_LHM_URL  - BẮT BUỘC. URL runtime thật lấy theo hướng dẫn trên.
//                         (Không có giá trị mặc định đoán sẵn — một URL đoán
//                         sai sẽ âm thầm gọi nhầm chỗ, tệ hơn là báo thiếu env.)

import { Client } from '@gradio/client'
import {
  parseBody, dataUrlOrB64ToBlob, pickEndpoint, buildPayload, connectWithWakeRetry,
} from './_lib/gradioBridge.js'

export async function lhmGenerateHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const target = process.env.MODELSCOPE_LHM_URL
  if (!target) {
    return res.status(500).json({
      error: 'Thiếu biến môi trường MODELSCOPE_LHM_URL.',
      hint: 'Mở https://modelscope.cn/studios/Damo_XR_Lab/LHM/summary, dùng DevTools > Network để tìm URL runtime thật (không phải URL trang), rồi khai báo MODELSCOPE_LHM_URL trên Vercel. Xem comment đầu file api/lhm-generate.js để biết chi tiết từng bước.',
    })
  }

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

  let client
  try {
    client = await connectWithWakeRetry(Client, target, undefined, 2)
  } catch (err) {
    console.error('[lhm-generate] connect failed:', err?.message)
    return res.status(502).json({
      error: `Không kết nối được tới ModelScope Studio tại "${target}": ${err?.message || err}`,
      hint: 'Nếu lỗi là 401/403 hoặc CORS, rất có thể Studio này yêu cầu cookie phiên đăng nhập ModelScope cho hàng đợi Gradio và không thể gọi ẩn danh từ server ngoài — trong trường hợp đó, dùng lại api/lam-generate.js trỏ tới "3DAIGC/LHM" trên Hugging Face (đổi biến LAM_HF_SPACE) hoặc tự host LHM theo README của github.com/aigc3d/LHM.',
    })
  }

  let apiInfo
  try {
    apiInfo = await client.view_api()
  } catch (err) {
    return res.status(502).json({ error: `Không đọc được API của Studio: ${err?.message || err}` })
  }

  // Bắt buộc có tham số ảnh; video là tuỳ chọn (một số phiên bản LHM tự
  // sinh chuyển động mặc định nếu không truyền video).
  const endpoint = pickEndpoint(apiInfo, { image: /image|photo|portrait/, optional: /.*/ })
  if (!endpoint) {
    return res.status(502).json({
      error: 'Studio này hiện không lộ endpoint nhận ảnh qua view_api() (API có thể đã đổi, hoặc Studio dùng cơ chế khác Gradio chuẩn).',
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
      source: 'modelscope',
      target,
      endpoint: endpoint.path,
      data: result.data,
    })
  } catch (err) {
    console.error('[lhm-generate] predict failed:', err?.message)
    return res.status(502).json({
      error: err?.message || 'LHM inference call failed on the ModelScope Studio.',
      target,
      endpoint: endpoint.path,
      hint: 'Studio công khai vẫn có thể có hàng đợi hoặc giới hạn theo IP. Xem trực tiếp tại https://modelscope.cn/studios/Damo_XR_Lab/LHM/summary để kiểm tra trạng thái.',
    })
  }
}

export default async function handler(req, res) {
  return lhmGenerateHandler(req, res)
}
