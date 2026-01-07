import path from 'node:path'
import type { NormalizedFormat, ResolvedConfig } from '../config/index.ts'

export const shimFile: string = path.resolve(
  import.meta.dirname,
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
