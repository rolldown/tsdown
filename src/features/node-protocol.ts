import { builtinModules } from 'node:module'
import type { Plugin } from 'rolldown'

// Modules that require the node: prefix and cannot be imported without it
// These are modules that only exist with the node: prefix in newer Node.js versions
const NODE_ONLY_MODULES = new Set([
  'node:sea',
  'node:sqlite',
  'node:test',
  'node:test/reporters',
])

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
        filter: { id: /^node:/ },
        handler(id) {
          // Don't strip node: prefix from modules that require it
          if (NODE_ONLY_MODULES.has(id)) {
            return {
              id,
              external: true,
              moduleSideEffects: false,
            }
          }

          return {
            id: id.slice(5), // strip the `node:` prefix
            external: true,
            moduleSideEffects: false,
          }
        },
      },
    }
  }

  // For adding node: prefix, we need to handle both modules without prefix
  // and modules that already have the prefix
  const builtinModulesWithoutPrefix = builtinModules.filter(
    (m) => !m.startsWith('node:'),
  )
  const builtinModulesRegex = new RegExp(
    `^(${builtinModulesWithoutPrefix.join('|')})$`,
  )

  return {
    name: 'tsdown:node-protocol:add',
    resolveId: {
      order: 'pre',
      filter: { id: [builtinModulesRegex, /^node:/] },
      handler(id) {
        // If it already has node: prefix, keep it as-is
        if (id.startsWith('node:')) {
          return {
            id,
            external: true,
            moduleSideEffects: false,
          }
        }

        // Add node: prefix to builtin modules
        return {
          id: `node:${id}`,
          external: true,
          moduleSideEffects: false,
        }
      },
    },
  }
}
