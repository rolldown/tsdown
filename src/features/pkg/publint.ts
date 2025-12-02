import path from 'node:path'
import { dim } from 'ansis'
import { createDebug } from 'obug'
import { importWithError } from '../../utils/general.ts'
import { prettyName } from '../../utils/logger.ts'
import type { ResolvedConfig } from '../../config/index.ts'

const debug = createDebug('tsdown:publint')
const label = dim`[publint]`

export async function publint(options: ResolvedConfig): Promise<void> {
  if (!options.publint) return
  if (!options.pkg) {
    options.logger.warn(
      prettyName(options.name),
      'publint is enabled but package.json is not found',
    )
    return
  }

  const t = performance.now()
  debug('Running publint')
  const { publint } = await importWithError<typeof import('publint')>('publint')
  const { formatMessage } = await import('publint/utils')
  const { messages } = await publint({
    ...options.publint,
    pkgDir: path.dirname(options.pkg.packageJsonPath),
  })
  debug('Found %d issues', messages.length)

  if (!messages.length) {
    options.logger.success(
      prettyName(options.name),
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
    options.logger[logType](prettyName(options.name), label, formattedMessage)
  }
}
