import { shimFile } from '../index'
import type { NormalizedFormat, ResolvedConfig } from '../config/index'

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
