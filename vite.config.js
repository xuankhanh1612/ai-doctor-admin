import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { runInbodyOcr } from './api/_lib/inbodyOcr.js'
import { lamGenerateHandler } from './api/lam-generate.js'
import { wanImageToVideoHandler } from './api/wan-image-to-video.js'

// Plugin dev-server: chạy /api/lam-generate THẬT ngay trong `npm run dev`.
// Cần middleware riêng vì proxy '/api' chung ở dưới forward sang backend
// FastAPI khác (ai-doctor-engine.vercel.app) — backend đó không có route
// này, nên nếu để lọt xuống proxy chung sẽ không bao giờ chạy đúng code
// mới ở api/lam-generate.js lúc dev local (chỉ hoạt động đúng khi đã
// deploy lên Vercel, nơi file này tự thành serverless function).
function lamGenerateDevMiddleware() {
  return {
    name: 'lam-generate-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/lam-generate', (req, res) => {
        // Adapt Vite's plain (req,res) to the minimal req.body / res.status().json() shape lamGenerateHandler expects
        const wrappedRes = res
        wrappedRes.status = (code) => { res.statusCode = code; return wrappedRes }
        wrappedRes.json = (obj) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
          return wrappedRes
        }
        wrappedRes.end = wrappedRes.end || (() => res.end())
        lamGenerateHandler(req, wrappedRes).catch((err) => {
          console.error('[lam-generate-dev-middleware]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }))
        })
      })
    },
  }
}


function wanImageToVideoDevMiddleware() {
  return {
    name: 'wan-image-to-video-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/wan-image-to-video', (req, res) => {
        const wrappedRes = res
        wrappedRes.status = (code) => { res.statusCode = code; return wrappedRes }
        wrappedRes.json = (obj) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
          return wrappedRes
        }
        wanImageToVideoHandler(req, wrappedRes).catch((err) => {
          console.error('[wan-image-to-video-dev-middleware]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }))
        })
      })
    },
  }
}

// Plugin dev-server: chạy OCR THẬT (Claude Vision) ngay trong `npm run dev`,
// không cần deploy lên Vercel mới test được nút "Convert InBody Image
// thành .CSV". Middleware này bắt riêng path /api/inbody-analyze và xử lý
// tại đây (không cho rơi xuống proxy /api chung ở dưới, vì proxy đó forward
// sang backend FastAPI khác — không có route này).
function inbodyOcrDevMiddleware(env) {
  return {
    name: 'inbody-ocr-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/inbody-analyze', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }
        if (req.method !== 'POST') {
          next()
          return
        }
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const { image, mediaType, previousRecord } = body ? JSON.parse(body) : {}
            const analysis = await runInbodyOcr({
              apiKey: env.ANTHROPIC_API_KEY,
              image,
              mediaType,
              previousRecord,
            })
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ analysis }))
          } catch (error) {
            console.error('[inbody-ocr-dev-middleware]', error?.message || error)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = error?.code === 'NO_IMAGE' ? 400 : 500
            res.end(JSON.stringify({ error: error?.message || 'Lỗi OCR.' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv với prefix rỗng để đọc được ANTHROPIC_API_KEY (không có tiền tố
  // VITE_) từ file .env — biến này KHÔNG được đưa vào import.meta.env / bundle
  // client, chỉ dùng nội bộ trong middleware Node ở trên.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), inbodyOcrDevMiddleware(env), lamGenerateDevMiddleware(), wanImageToVideoDevMiddleware()],
    // Include .wasm so Vite processes `?url` imports from node_modules/@mediapipe
    assetsInclude: ['**/*.wasm', '**/*.PNG', '**/*.JPG', '**/*.JPEG', '**/*.HEIC'],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          mediapipeKhanh: resolve(__dirname, 'src/mediapipe-khanh/index.html'),
        },
      },
    },
    worker: {
      format: 'es',
    },
    server: {
      proxy: {
        // Proxy /api/* (trừ /api/inbody-analyze đã được middleware ở trên xử
        // lý riêng) và /health sang FastAPI backend.
        '/api/anthropic-proxy': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: () => '/v1/messages',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = process.env.ANTHROPIC_API_KEY || ''
              proxyReq.setHeader('x-api-key', key)
              proxyReq.setHeader('anthropic-version', '2023-06-01')
            })
          },
        },
        '/api': {
          target: 'https://ai-doctor-engine.vercel.app',
          changeOrigin: true,
        },
        '/health': {
          target: 'https://ai-doctor-engine.vercel.app',
          changeOrigin: true,
        },
      },
    },
  }
})
