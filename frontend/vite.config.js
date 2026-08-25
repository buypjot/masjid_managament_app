import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9017,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8011',
        changeOrigin: true,
      }
    }
  },
  preview: {
    port: 9017,
    host: true
  }
})
