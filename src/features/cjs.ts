import coerce from 'semver/functions/coerce.js'
import satisfies from 'semver/functions/satisfies.js'
import type { ResolvedConfig } from '../config/index.ts'

export function warnLegacyCJS(config: ResolvedConfig): void {
  if (
    !config.target ||
    !(config.checks?.legacyCjs ?? true) ||
    !config.format.includes('cjs')
  ) {
    return
  }

  const supportRequireESM = config.target.some((t) => {
    const version = coerce(t.split('node')[1])
    return version && satisfies(version, '^20.19.0 || >=22.12.0')
  })

  if (supportRequireESM) {
    config.logger.warnOnce(
      'We recommend using the ESM format instead of CommonJS.\n' +
        'The ESM format is compatible with modern platforms and runtimes, ' +
        'and most new libraries are now distributed only in ESM format.\n' +
        'Learn more at https://nodejs.org/en/learn/modules/publishing-a-package#how-did-we-get-here',
    )
  }
}
