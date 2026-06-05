import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const mediapipeExternal = [
  '@mediapipe/tasks-vision',
  '@mediapipe/tasks-audio',
  '@mediapipe/tasks-text',
]

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: mediapipeExternal,
    },
  },
  worker: {
    rollupOptions: {
      external: mediapipeExternal,
    },
  },
  server: {
    proxy: {
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
