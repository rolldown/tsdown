import pkg from '../package.json' with { type: 'json' }
export { build, buildWithConfigs } from './build.ts'
export { defineConfig, mergeConfig } from './config.ts'
export { resolveUserConfig } from './config/options.ts'
export * from './config/types.ts'
export { enableDebug } from './features/debug.ts'
export { globalLogger, type Logger } from './utils/logger.ts'
export const version: string = pkg.version
/**
 * @ignore
 */
export * as Rolldown from 'rolldown'
