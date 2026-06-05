import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This plugin intercepts all files inside mediapipe-khanh and returns
// empty stubs, preventing vite:worker-import-meta-url from ever parsing them.
const stubMediapipeKhanh = {
  name: 'stub-mediapipe-khanh',
  enforce: 'pre',
  load(id) {
    if (id.includes('mediapipe-khanh')) {
      return 'export default {}'
    }
  },
  resolveId(id, importer) {
    if (
      (importer && importer.includes('mediapipe-khanh')) ||
      id.includes('mediapipe-khanh') ||
      id.startsWith('@mediapipe/')
    ) {
      return '\0mediapipe-stub'
    }
  },
}

export default defineConfig({
  plugins: [stubMediapipeKhanh, react()],
  build: {
    rollupOptions: {
      external: (id) => id.startsWith('@mediapipe/'),
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
