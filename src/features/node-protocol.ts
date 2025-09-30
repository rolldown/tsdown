import { builtinModules } from 'node:module'
import type { Plugin } from 'rolldown'

const modulesWithoutProtocol = builtinModules.filter(
  (mod) => !mod.startsWith('node:'),
)

/**
 * The `node:` protocol was added in Node.js v14.18.0.
 * @see https://nodejs.org/api/esm.html#node-imports
 */
export function NodeProtocolPlugin(nodeProtocolOption: 'strip' | true): Plugin {
  if (nodeProtocolOption === 'strip') {
    const regex = new RegExp(`^node:(${modulesWithoutProtocol.join('|')})$`)

    return {
      name: 'tsdown:node-protocol:strip',
      resolveId: {
        order: 'pre',
        filter: { id: regex },
        handler(id) {
          return {
            id: id.slice(5), // strip the `node:` prefix
            external: true,
            moduleSideEffects: false,
          }
        },
      },
    }
  }

  // create regex from builtin modules
  // filter without `node:` prefix
  const builtinModulesRegex = new RegExp(
    `^(${modulesWithoutProtocol.join('|')})$`,
  )

  return {
    name: 'tsdown:node-protocol:add',
    resolveId: {
      order: 'pre',
      filter: { id: builtinModulesRegex },
      handler(id) {
        return {
          id: `node:${id}`,
          external: true,
          moduleSideEffects: false,
        }
      },
    },
  }
}
