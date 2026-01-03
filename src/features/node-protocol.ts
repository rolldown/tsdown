import { builtinModules } from 'node:module'
import type { Plugin } from 'rolldown'

/**
 * The `node:` protocol was added in Node.js v14.18.0.
 * @see https://nodejs.org/api/esm.html#node-imports
 */
export function NodeProtocolPlugin(nodeProtocolOption: 'strip' | true): Plugin {
  const modulesWithoutProtocol = builtinModules.filter(
    (mod) => !mod.startsWith('node:'),
  )

  return {
    name: `tsdown:node-protocol`,
    resolveId: {
      order: 'pre',
      filter: {
        id:
          nodeProtocolOption === 'strip'
            ? new RegExp(`^node:(${modulesWithoutProtocol.join('|')})$`)
            : new RegExp(`^(${modulesWithoutProtocol.join('|')})$`),
      },
      handler:
        nodeProtocolOption === 'strip'
          ? (id) => {
              return {
                // strip the `node:` prefix
                id: id.slice(5),
                external: true,
                moduleSideEffects: false,
              }
            }
          : (id) => {
              return {
                id: `node:${id}`,
                external: true,
                moduleSideEffects: false,
              }
            },
    },
  }
}
