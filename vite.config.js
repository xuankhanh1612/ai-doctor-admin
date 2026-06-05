import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.PNG', '**/*.JPG', '**/*.JPEG', '**/*.HEIC'],
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
      // Proxy /api/* and /health to the FastAPI backend
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
})
