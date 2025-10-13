import type { UserConfig } from '../../src/config'

export default {
  entry: ['./src/{index,run}.ts'],
  platform: 'node',
} satisfies UserConfig
