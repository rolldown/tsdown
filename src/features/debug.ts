import { createDebug, enable, namespaces } from 'obug'
import { resolveComma, toArray } from '../utils/general.ts'

const debug = createDebug('tsdown:debug')

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
