import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/apibay': {
        target: 'https://apibay.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/apibay/, '')
      },
      '/api/torbox': {
        target: 'https://api.torbox.app/v1/api/torrents',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/torbox/, '')
      },
      '/api/tmdb': {
        target: 'https://api.themoviedb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tmdb/, '/3')
      },
      '/api/yts': {
        target: 'https://yts.mx/api/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yts/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('video.js')) return 'video';
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor';
            return 'ui';
          }
        }
      }
    }
  }
})
