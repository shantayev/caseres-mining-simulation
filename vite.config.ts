import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: false,
    open: false,
    watch: {
      // Ignore macOS duplicate copies and node_modules (Desktop/iCloud paths can be slow).
      ignored: ['**/node_modules/**', '**/* 2.*', '**/* 2/**'],
    },
  },
  optimizeDeps: {
    // Start the dev server before the full dependency crawl finishes (faster URL on slow disks).
    holdUntilCrawlEnd: false,
  },
})
