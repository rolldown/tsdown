import Debug from 'debug'
import { resolveComma, toArray } from '../utils/general.ts'
import type { InputOptions } from 'rolldown'

const debug = Debug('tsdown:debug')

export interface DebugOptions extends NonNullable<InputOptions['debug']> {
  /**
   * Enable devtools integration. `@vitejs/devtools` must be installed as a dependency.
   *
   * Defaults to true, if `@vitejs/devtools` is installed.
   */
  devtools?: boolean
}

export function enableDebugLog(cliOptions: Record<string, any>): void {
  const { debugLog } = cliOptions
  if (!debugLog) return

  let namespace: string
  if (debugLog === true) {
    namespace = 'tsdown:*'
  } else {
    // support debugging multiple flags with comma-separated list
    namespace = resolveComma(toArray(debugLog))
      .map((v) => `tsdown:${v}`)
      .join(',')
  }

  const enabled = Debug.disable()
  if (enabled) namespace += `,${enabled}`

  Debug.enable(namespace)
  debug('Debugging enabled', namespace)
}
