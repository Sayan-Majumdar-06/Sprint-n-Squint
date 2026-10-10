 import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // lets phones on your wifi open the dev server
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
})
