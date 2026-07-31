import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Mengizinkan akses dari network (IP 0.0.0.0)
    allowedHosts: [
      'network.up2bntb.site' // Mendaftarkan domain publik Anda agar tidak diblokir Vite
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', // Proxy ke backend Node.js
        changeOrigin: true,
        secure: false,
      }
    }
  }
})