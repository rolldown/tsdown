import { createDebug, enable, namespaces } from 'obug'
import { resolveComma, toArray } from '../utils/general.ts'
import type { Arrayable } from '../utils/types.ts'

const debugLog = createDebug('tsdown:debug')

export function enableDebug(debug?: boolean | Arrayable<string>): void {
  if (!debug) return

  let namespace: string
  if (debug === true) {
    namespace = 'tsdown:*'
  } else {
    // support debugging multiple flags with comma-separated list
    namespace = resolveComma(toArray(debug))
      .map((v) => `tsdown:${v}`)
      .join(',')
  }

  const ns = namespaces()
  if (ns) namespace += `,${ns}`

  enable(namespace)
  debugLog('Debugging enabled', namespace)
}
