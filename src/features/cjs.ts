import coerce from 'semver/functions/coerce.js'
import satisfies from 'semver/functions/satisfies.js'
import type { ResolvedConfig } from '../config/index.ts'

/**
 * If the config includes the `cjs` format and
 * one of its target >= node 23.0.0 / 22.12.0,
 * warn the user about the deprecation of CommonJS.
 */
export function warnLegacyCJS(config: ResolvedConfig): void {
  if (!config.format.includes('cjs') || !config.target) {
    return
  }

  const legacy = config.target.some((t) => {
    const version = coerce(t.split('node')[1])
    return version && satisfies(version, '>=23.0.0 || >=22.12.0')
  })

  if (legacy) {
    config.logger.warnOnce(
      'We recommend using the ESM format instead of CommonJS.\n' +
        'The ESM format is compatible with modern platforms and runtimes, ' +
        'and most new libraries are now distributed only in ESM format.\n' +
        'Learn more at https://nodejs.org/en/learn/modules/publishing-a-package#how-did-we-get-here',
    )
  }
}
