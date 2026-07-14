import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Forzar una única copia de React (evita "Invalid hook call" cuando el
  // optimizador de dependencias duplica React entre app y librerías).
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    host: true, // accesible desde el celular en la misma red (pruebas móviles)
  },
})
