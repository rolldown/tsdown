import type { UserConfig } from './options'

const tsup: UserConfig = {
  format: 'cjs',
  clean: false,
  dts: false,
}

export type Presets = Record<'tsup', UserConfig>
export const presets: Presets = { tsup }
