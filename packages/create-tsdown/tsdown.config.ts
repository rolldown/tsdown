import type { UserConfig } from '../../src/config.ts'

export default {
  entry: ['./src/{index,run}.ts'],
  exports: {
    bin: true,
  },
} satisfies UserConfig
