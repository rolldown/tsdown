import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWithConfigs } from './build.ts'
import { resolveConfig, type InlineConfig } from './config/index.ts'
import { globalLogger } from './utils/logger.ts'
import type { TsdownBundle } from './utils/chunks.ts'

/**
 * Build with tsdown.
 */
export async function build(
  userOptions: InlineConfig = {},
): Promise<TsdownBundle[]> {
  globalLogger.level = userOptions.logLevel || 'info'
  const { configs, files: configFiles } = await resolveConfig(userOptions)

  return buildWithConfigs(configs, configFiles)
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot: string = path.resolve(dirname, '..')

/** @internal */
export const shimFile: string = path.resolve(pkgRoot, 'esm-shims.js')

export { buildSingle, buildWithConfigs } from './build.ts'
export { defineConfig, mergeConfig } from './config.ts'
export * from './config/types.ts'
export { globalLogger, type Logger } from './utils/logger.ts'
export * as Rolldown from 'rolldown'
