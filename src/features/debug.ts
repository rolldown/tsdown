import { createDebug, enable, namespaces } from 'obug'
import { resolveComma, toArray } from '../utils/general.ts'
import type { StartOptions } from '@vitejs/devtools/cli-commands'
import type { InputOptions } from 'rolldown'

const debug = createDebug('tsdown:debug')

export interface DebugOptions extends NonNullable<InputOptions['debug']> {
  /**
   * **[experimental]** Enable devtools integration. `@vitejs/devtools` must be installed as a dependency.
   *
   * Defaults to true, if `@vitejs/devtools` is installed.
   */
  devtools?: boolean | Partial<StartOptions>

  /**
   * Clean devtools stale sessions.
   *
   * @default true
   */
  clean?: boolean
}

export function enableDebugLog(cliOptions: Record<string, any>): void {
  const { debugLogs } = cliOptions
  if (!debugLogs) return

  let namespace: string
  if (debugLogs === true) {
    namespace = 'tsdown:*'
  } else {
    // support debugging multiple flags with comma-separated list
    namespace = resolveComma(toArray(debugLogs))
      .map((v) => `tsdown:${v}`)
      .join(',')
  }

  const ns = namespaces()
  if (ns) namespace += `,${ns}`

  enable(namespace)
  debug('Debugging enabled', namespace)
}
