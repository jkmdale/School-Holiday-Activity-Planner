import { defineConfig } from 'vitest/config'

// Standalone Vitest config (separate from vite.config.ts so the PWA plugin
// isn't pulled into the test run). Pure-logic unit tests run in Node.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts']
  }
})
