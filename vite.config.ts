import { defineConfig } from 'vite';

// base './' so the build works from any static host sub-path (e.g. GitHub Pages /repo/).
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  test: { environment: 'node' },
} as any);
