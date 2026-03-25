import type { UserConfig } from '../../src/config.ts'

export default {
  entry: ['./src/{index,run}.ts'],
  exports: {
    devExports: 'dev',
    bin: true,
  },
} satisfies UserConfig
