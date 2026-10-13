import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { port: 5173, host: true },
  // Pre-bundle up front so the dev server never reloads the page mid-session to re-optimize.
  optimizeDeps: { include: ['three', '@dimforge/rapier3d-compat', 'simplex-noise', 'idb'] },
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
