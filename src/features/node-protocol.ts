import { builtinModules } from 'node:module'
import type { ResolvedOptions } from '..'
import type { Plugin } from 'rolldown'

/**
 * The `node:` protocol was added in Node.js v14.18.0.
 * @see https://nodejs.org/api/esm.html#node-imports
 */
export function NodeProtocolPlugin(
  options: Pick<ResolvedOptions, 'nodeProtocol' | 'removeNodeProtocol'>,
): Plugin {
  const nodeProtocolOption =
    options.nodeProtocol ??
    // `removeNodeProtocol: true` means stripping the `node:` protocol which equales to `nodeProtocol: 'strip'`
    // `removeNodeProtocol: false` means keeping the `node:` protocol which equales to `nodeProtocol: false` (ignore it)
    (options.removeNodeProtocol ? 'strip' : false)

  const name = 'tsdown:node-protocol'

  // if `nodePrrotocol` is not set or set to `false`, we don't need this plugin
  if (!nodeProtocolOption) {
    return { name } satisfies Plugin
  }

  if (nodeProtocolOption === 'strip') {
    return {
      name,
      resolveId: {
        order: 'pre',
        filter: { id: /^node:/ },
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

  nodeProtocolOption satisfies true

  // create regex from builtin modules
  // filter without `node:` prefix
  const builtinModulesRegex = new RegExp(`^(${builtinModules.join('|')})$`)

  return {
    name,
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
