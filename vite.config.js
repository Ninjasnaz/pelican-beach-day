import { defineConfig } from 'vite';

export default defineConfig({
  build: { chunkSizeWarningLimit: 1200 },
  test: { include: ['tests/**/*.test.js'] },
});
