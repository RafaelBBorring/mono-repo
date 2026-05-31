import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mono-repo/poseidon/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/thumbs':   { target: 'http://localhost:8000', changeOrigin: true },
      '/features': { target: 'http://localhost:8000', changeOrigin: true },
      '/videos':   { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
