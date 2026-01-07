import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot: string = path.resolve(dirname, '..')

/** @internal */
export const shimFile: string = path.resolve(pkgRoot, 'esm-shims.js')

export { build, buildSingle, buildWithConfigs } from './build.ts'
export { defineConfig, mergeConfig } from './config.ts'
export * from './config/types.ts'
export { globalLogger, type Logger } from './utils/logger.ts'
export * as Rolldown from 'rolldown'
