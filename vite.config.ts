import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Use /KnowledgeManager/ for GitHub Pages, / for Vercel (or local dev)
const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
  },
  // Vitest config (merged when running via vitest)
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    css: true,
    // The default threads pool fails to spin up its runner on Windows with
    // this toolchain; forks is reliable across platforms.
    pool: 'forks',
  },
})
