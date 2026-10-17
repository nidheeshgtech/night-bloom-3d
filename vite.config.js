import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base so the build runs from any folder or static host.
  base: './',
  plugins: [react()],
  server: { port: 5173 },
})
