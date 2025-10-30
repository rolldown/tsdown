import { shimFile } from '../index.ts'
import type { NormalizedFormat, ResolvedOptions } from '../options/index.ts'

export function getShimsInject(
  format: NormalizedFormat,
  platform: ResolvedOptions['platform'],
): Record<string, [string, string]> | undefined {
  if (format === 'es' && platform === 'node') {
    return {
      __dirname: [shimFile, '__dirname'],
      __filename: [shimFile, '__filename'],
    }
  }
}
