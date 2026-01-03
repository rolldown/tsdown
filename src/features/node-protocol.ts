import { builtinModules } from 'node:module'
import type { Plugin } from 'rolldown'

const modulesWithoutProtocol = builtinModules.filter(
  (mod) => !mod.startsWith('node:'),
)

// Cache regex patterns at module level to avoid recompilation
const stripProtocolRegex = new RegExp(
  `^node:(${modulesWithoutProtocol.join('|')})$`,
)
const addProtocolRegex = new RegExp(`^(${modulesWithoutProtocol.join('|')})$`)

/**
 * The `node:` protocol was added in Node.js v14.18.0.
 * @see https://nodejs.org/api/esm.html#node-imports
 */
export function NodeProtocolPlugin(nodeProtocolOption: 'strip' | true): Plugin {
  if (nodeProtocolOption === 'strip') {
    return {
      name: 'tsdown:node-protocol:strip',
      resolveId: {
        order: 'pre',
        filter: { id: stripProtocolRegex },
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

  return {
    name: 'tsdown:node-protocol:add',
    resolveId: {
      order: 'pre',
      filter: { id: addProtocolRegex },
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
