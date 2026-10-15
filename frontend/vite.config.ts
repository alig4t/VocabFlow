import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { conditionalCompat } from './scripts/conditional-compat'

export default defineConfig({
  plugins: [react(), conditionalCompat()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
