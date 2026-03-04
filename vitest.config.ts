import { defineConfig } from 'vitest/config'

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ['dev'],
    },
  },
  server: {
    watch: {
      ignored: ['**/temp/**'],
    },
  },
  test: {
    testTimeout: 20_000,
    setupFiles: './tests/setup.ts',
    coverage: {
      include: ['src/**'],
    },
    server: {
      deps: {
        inline: ['tinyglobby', 'fdir'], // mock fs
      },
    },
  },
})
