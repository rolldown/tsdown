import type {
  UserConfig,
  UserConfigExport,
  UserConfigFn,
} from './config/index.ts'
/**
 * Defines the configuration for tsdown.
 */
export function defineConfig(options: UserConfig): UserConfig
export function defineConfig(options: UserConfig[]): UserConfig[]
export function defineConfig(options: UserConfigFn): UserConfigFn
export function defineConfig(options: UserConfigExport): UserConfigExport
export function defineConfig(options: UserConfigExport): UserConfigExport {
  return options
}

export type { UserConfig, UserConfigExport, UserConfigFn }
export { mergeConfig } from './config/options.ts'
