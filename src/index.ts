export { build, buildWithConfigs } from './build.ts'
export { defineConfig, mergeConfig } from './config.ts'
export { resolveUserConfig } from './config/options.ts'
export * from './config/types.ts'
export { enableDebug } from './features/debug.ts'
export { globalLogger, type Logger } from './utils/logger.ts'
export const version: string = import.meta.TSDOWN_VERSION ?? '0.0.0'
/**
 * @ignore
 */
export * as Rolldown from 'rolldown'
