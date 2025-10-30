import type { UserConfig, UserConfigFn } from './options/index.ts'

/**
 * Defines the configuration for tsdown.
 */
export function defineConfig(options: UserConfig): UserConfig
export function defineConfig(options: UserConfigFn): UserConfigFn
export function defineConfig(
  options: UserConfig | UserConfigFn,
): UserConfig | UserConfigFn {
  return options
}

export type { UserConfig, UserConfigFn }
