import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/temp/**'],
    },
  },
  test: {
    testTimeout: 20_000,
    setupFiles: ['./tests/setup.ts'],
  },
})
