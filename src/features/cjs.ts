import { coerce, parseRange, satisfies } from 'verkit'
import type { ResolvedConfig } from '../config/index.ts'
import type { InputOptions } from 'rolldown'

const RANGE_REQUIRING_ESM = parseRange('^20.19.0 || >=22.12.0')

export function warnLegacyCJS(config: ResolvedConfig): void {
  if (
    config.exe ||
    !config.target ||
    !(config.checks?.legacyCjs ?? true) ||
    !config.format.includes('cjs')
  ) {
    return
  }

  const supportRequireESM = config.target.some((t) => {
    const version = coerce(t.split('node', 2)[1])
    return version && satisfies(version, RANGE_REQUIRING_ESM)
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

export function warnCjsPlatform(
  config: ResolvedConfig,
  inputOptions: InputOptions,
): void {
  if (
    config.format !== 'cjs' ||
    // `neutral` makes no runtime assumptions, so building CJS for Node.js is expected
    config.platform !== 'browser' ||
    // the user forced another platform via `inputOptions`
    inputOptions.platform !== 'node'
  ) {
    return
  }

  config.logger.warnOnce(
    config.nameLabel,
    "The `cjs` format always targets Node.js, so `platform: 'browser'` is ignored for it.\n" +
      "Use `platform: 'neutral'` if the code isn't browser-only, " +
      "or set `inputOptions: { platform: 'browser' }` to build CJS for the browser anyway.",
  )
}
