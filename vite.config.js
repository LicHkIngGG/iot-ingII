import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].js',   // Para los archivos JS principales
        chunkFileNames: '[name].[hash].js',   // Para los archivos de chunks
        assetFileNames: '[name].[hash].[ext]', // Para los archivos estáticos (CSS, imágenes, etc.)
      }
    }
  }
})
