import path from 'node:path'
import process from 'node:process'
import { dim } from 'ansis'
import Debug from 'debug'
import type { ResolvedOptions } from '../options'

const debug = Debug('tsdown:publint')

export async function publint(options: ResolvedOptions): Promise<void> {
  if (!options.publint) return
  if (!options.pkg) {
    options.logger.warn('publint is enabled but package.json is not found')
    return
  }

  const t = performance.now()
  debug('Running publint')
  const { publint } = await import('publint')
  const { formatMessage } = await import('publint/utils')
  const { messages } = await publint({
    ...(options.publint === true ? {} : options.publint),
    pkgDir: path.dirname(options.pkg.packageJsonPath),
  })
  debug('Found %d issues', messages.length)

  if (!messages.length) {
    options.logger.success(
      `No publint issues found`,
      dim`(${Math.round(performance.now() - t)}ms)`,
    )
  }
  let hasError = false
  for (const message of messages) {
    hasError ||= message.type === 'error'
    const formattedMessage = formatMessage(message, options.pkg)
    const logType = (
      { error: 'error', warning: 'warn', suggestion: 'info' } as const
    )[message.type]
    options.logger[logType](formattedMessage)
  }
  if (hasError) {
    debug('Found errors, setting exit code to 1')
    process.exitCode = 1
  }
}
