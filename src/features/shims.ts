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
  unbundle?: boolean,
): Record<string, [string, string]> | undefined {
  if (unbundle) return
  if (format === 'es' && platform === 'node') {
    return {
      __dirname: [shimFile, '__dirname'],
      __filename: [shimFile, '__filename'],
    }
  }
}

export function getShimsBanner(
  format: NormalizedFormat,
  platform: ResolvedConfig['platform'],
  unbundle?: boolean,
): string | undefined {
  if (!unbundle) return
  if (format === 'es' && platform === 'node') {
    return 'const __dirname = import.meta.dirname;\nconst __filename = import.meta.filename;'
  }
}
