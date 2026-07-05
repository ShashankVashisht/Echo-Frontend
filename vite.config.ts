import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://echo-585564066532.asia-south2.run.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})

