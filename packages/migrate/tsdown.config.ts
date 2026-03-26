import type { UserConfig } from '../../src/config.ts'

export default {
  name: 'migrate',
  entry: ['./src/{index,run}.ts'],
  exports: {
    bin: true,
  },
} satisfies UserConfig
