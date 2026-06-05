import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const mediapipeExternal = [
  '@mediapipe/tasks-vision',
  '@mediapipe/tasks-audio',
  '@mediapipe/tasks-text',
]

const externalizeMediapipe = {
  name: 'externalize-mediapipe',
  resolveId(id) {
    if (mediapipeExternal.includes(id)) {
      return { id, external: true }
    }
  },
}

export default defineConfig({
  plugins: [react(), externalizeMediapipe],
  build: {
    rollupOptions: {
      external: mediapipeExternal,
    },
  },
  worker: {
    plugins: () => [externalizeMediapipe],
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
