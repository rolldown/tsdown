import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NormalizedFormat, ResolvedConfig } from '../config/index.ts'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const shimFile: string = path.resolve(
  dirname,
  import.meta.TSDOWN_PRODUCTION ? '..' : '../..',
  'esm-shims.js',
)

export function getShimsInject(
  format: NormalizedFormat,
  platform: ResolvedConfig['platform'],
): Record<string, [string, string]> | undefined {
  if (format === 'es' && platform === 'node') {
    return {
      __dirname: [shimFile, '__dirname'],
      __filename: [shimFile, '__filename'],
    }
  }
}
