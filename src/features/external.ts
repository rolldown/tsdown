import { isBuiltin } from 'node:module'
import path from 'node:path'
import { blue, underline } from 'ansis'
import { createDebug } from 'obug'
import { RE_DTS, RE_NODE_MODULES } from 'rolldown-plugin-dts/filename'
import { matchPattern } from '../utils/general.ts'
import { shimFile } from './shims.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { PackageJson } from 'pkg-types'
import type { Plugin, PluginContext, ResolveIdExtraOptions } from 'rolldown'

const debug = createDebug('tsdown:external')

export function ExternalPlugin({
  pkg,
  noExternal,
  inlineOnly,
  skipNodeModulesBundle,
}: ResolvedConfig): Plugin {
  const deps = pkg && Array.from(getProductionDeps(pkg))

  return {
    name: 'tsdown:external',
    async resolveId(id, importer, extraOptions) {
      if (extraOptions.isEntry || !importer) return

      const shouldExternal = await externalStrategy(
        this,
        id,
        importer,
        extraOptions,
      )
      const nodeBuiltinModule = isBuiltin(id)

      debug('shouldExternal: %s = %s', id, shouldExternal)

      if (shouldExternal === true || shouldExternal === 'absolute') {
        return {
          id,
          external: shouldExternal,
          moduleSideEffects: nodeBuiltinModule ? false : undefined,
        }
      }

      if (
        inlineOnly &&
        !RE_DTS.test(importer) && // skip dts files
        !nodeBuiltinModule && // skip node built-in modules
        id[0] !== '.' && // skip relative imports
        !path.isAbsolute(id) // skip absolute imports
      ) {
        const shouldInline =
          shouldExternal === 'no-external' || // force inline
          matchPattern(id, inlineOnly)
        debug('shouldInline: %s = %s', id, shouldInline)
        if (shouldInline) return

        const resolved = await this.resolve(id, importer, extraOptions)
        if (!resolved) return

        if (RE_NODE_MODULES.test(resolved.id)) {
          throw new Error(
            `${underline(id)} is located in node_modules but is not included in ${blue`inlineOnly`} option.
To fix this, either add it to ${blue`inlineOnly`}, declare it as a production or peer dependency in your package.json, or externalize it manually.
Imported by ${underline(importer)}`,
          )
        }
      }
    },
  }

  /**
   * - `true`: always external
   * - `false`: skip, let other plugins handle it
   * - `'absolute'`: external as absolute path
   * - `'no-external'`: skip, but mark as non-external for inlineOnly check
   */
  async function externalStrategy(
    context: PluginContext,
    id: string,
    importer: string | undefined,
    extraOptions: ResolveIdExtraOptions,
  ): Promise<boolean | 'absolute' | 'no-external'> {
    if (id === shimFile) return false

    if (noExternal?.(id, importer)) {
      return 'no-external'
    }

    if (skipNodeModulesBundle) {
      const resolved = await context.resolve(id, importer, extraOptions)
      if (
        resolved &&
        (resolved.external || RE_NODE_MODULES.test(resolved.id))
      ) {
        return true
      }
    }

    if (
      deps &&
      (deps.includes(id) || deps.some((dep) => id.startsWith(`${dep}/`)))
    ) {
      return true
    }

    return false
  }
}

/*
 * Production deps should be excluded from the bundle
 */
function getProductionDeps(pkg: PackageJson): Set<string> {
  return new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ])
}
