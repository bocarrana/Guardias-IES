import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/',
  server: {
    // @ts-expect-error - Vite 6 feature that might not be in the current ServerOptions type cache
    allowedHosts: true
  }
})
