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
          ? async function (id, ...args) {
              // strip the `node:` prefix
              const strippedId = id.slice(5 /* "node:".length */)

              // check if another resolver (e.g., tsconfig paths, alias) handles the stripped id
              const resolved = await this.resolve(strippedId, ...args)
              if (resolved && !resolved.external) {
                return resolved
              }

              return {
                id: strippedId,
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
