import type { UserConfig } from '../../src/config.ts'

export default {
  name: 'migrate',
  entry: ['./src/{index,run}.ts'],
  dts: true,
} satisfies UserConfig
