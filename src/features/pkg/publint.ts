import { createDebug } from 'obug'
import { importWithError } from '../../utils/general.ts'
import { dim } from '../../utils/style.ts'
import type { ResolvedConfig } from '../../config/index.ts'
import type { Buffer } from 'node:buffer'
import type { Options } from 'publint'

const debug = createDebug('tsdown:publint')
const label = dim`[publint]`

export interface PublintOptions extends Omit<Options, 'pack' | 'pkgDir'> {
  module?: [typeof import('publint'), typeof import('publint/utils')]
}

export async function publint(
  options: ResolvedConfig,
  tarball: Buffer<ArrayBuffer>,
): Promise<void> {
  if (!options.publint) return
  if (!options.pkg) {
    options.logger.warn(
      options.nameLabel,
      'publint is enabled but package.json is not found',
    )
    return
  }

  const t = performance.now()
  debug('Running publint')

  const { publint } =
    options.publint.module?.[0] ||
    (await importWithError<typeof import('publint')>('publint'))
  const { formatMessage } =
    options.publint.module?.[1] ||
    (await importWithError<typeof import('publint/utils')>('publint/utils'))

  const { messages } = await publint({
    ...options.publint,
    pack: { tarball: tarball.buffer },
  })
  debug('Found %d issues', messages.length)

  if (!messages.length) {
    options.logger.success(
      options.nameLabel,
      label,
      'No issues found',
      dim`(${Math.round(performance.now() - t)}ms)`,
    )
    return
  }

  for (const message of messages) {
    const formattedMessage = formatMessage(message, options.pkg)
    const logType = (
      { error: 'error', warning: 'warn', suggestion: 'info' } as const
    )[message.type]
    options.logger[logType](options.nameLabel, label, formattedMessage)
  }
}
