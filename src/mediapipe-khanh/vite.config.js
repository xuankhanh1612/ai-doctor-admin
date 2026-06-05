import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: (id) => id.startsWith('@mediapipe/'),
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision', '@mediapipe/tasks-audio', '@mediapipe/tasks-text'],
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
