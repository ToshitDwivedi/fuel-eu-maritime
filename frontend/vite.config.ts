import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@adapters': path.resolve(__dirname, 'src/adapters'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
})
