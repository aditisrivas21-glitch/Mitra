import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server forwards /api/... to the FastAPI backend, so the browser never hits CORS problems.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
